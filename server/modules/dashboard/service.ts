/**
 * Dashboard service — orchestrator. Resolves the caller's scope, runs the
 * per-role aggregates in parallel, and assembles the role-tagged summary.
 * KPI values are derived from the GROUP BY results — no extra queries.
 */

import { resolveDashboardScope } from "./authorize";
import * as repo from "./repository";
import type {
  AuthUser,
  SummaryResult,
  MonthCount,
  MonthlyMoney,
  CountryWorkforce,
  StatusCount,
  TimesheetPipeline,
} from "./types";

/** First day (UTC) of the month 11 months ago — a 12-month window incl. now. */
function computeWindowStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
}

/** The 12 'YYYY-MM' keys covered by the window, oldest first. */
function monthKeys(windowStart: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth() + i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function fillMonths(rows: Array<{ month: string; count: number }>, keys: string[]): MonthCount[] {
  const byMonth = new Map(rows.map(r => [r.month, r.count]));
  return keys.map(month => ({ month, count: byMonth.get(month) ?? 0 }));
}

/** Pivot (month, currency, total) rows into 12 zero-filled MonthlyMoney rows. */
function pivotMonthlyMoney(
  rows: Array<{ month: string; currency: string; total: number }>,
  keys: string[],
): MonthlyMoney {
  const currencies = Array.from(new Set(rows.map(r => r.currency))).sort();
  const byMonth = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const totals = byMonth.get(r.month) ?? {};
    totals[r.currency] = (totals[r.currency] ?? 0) + r.total;
    byMonth.set(r.month, totals);
  }
  return {
    currencies,
    rows: keys.map(month => {
      const totals: Record<string, number> = {};
      for (const c of currencies) totals[c] = byMonth.get(month)?.[c] ?? 0;
      return { month, totals };
    }),
  };
}

/** Pivot per-(country, workerType) counts into one row per country. */
function pivotWorkforce(rows: repo.WorkforceCountryRow[]): CountryWorkforce[] {
  const byCountry = new Map<string, CountryWorkforce>();
  for (const r of rows) {
    const key = r.countryId ?? "__none__";
    const entry = byCountry.get(key) ?? {
      countryId: r.countryId,
      countryName: r.countryName ?? "Unassigned",
      employees: 0,
      contractors: 0,
      total: 0,
    };
    // Anything not an employee (contractor, third_party_worker) counts as a
    // contractor for dashboard purposes.
    if (r.workerType === "employee") entry.employees += r.count;
    else entry.contractors += r.count;
    entry.total += r.count;
    byCountry.set(key, entry);
  }
  return Array.from(byCountry.values()).sort((a, b) => b.total - a.total);
}

/** Normalize null statuses (enum default) and merge, largest first. */
function normalizeStatusCounts(
  rows: Array<{ status: string | null; count: number }>,
  fallback: string,
): StatusCount[] {
  const merged = new Map<string, number>();
  for (const r of rows) {
    const s = r.status ?? fallback;
    merged.set(s, (merged.get(s) ?? 0) + r.count);
  }
  return Array.from(merged.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

function statusCount(counts: StatusCount[], status: string): number {
  return counts.find(c => c.status === status)?.count ?? 0;
}

function toPipeline(rows: Array<{ status: string | null; count: number }>): TimesheetPipeline {
  const pipeline: TimesheetPipeline = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
  for (const r of rows) {
    const s = (r.status ?? "draft") as keyof TimesheetPipeline;
    if (pipeline[s] !== undefined) pipeline[s] += r.count;
  }
  return pipeline;
}

/** Pivot per-(country, status) contract counts into active/pending/ended rows. */
function pivotContractsByCountry(
  rows: Array<{ countryId: string; countryName: string | null; status: string | null; count: number }>,
) {
  const PENDING = new Set(["draft", "pending_sdp_review", "ready_to_issue", "pending"]);
  const ENDED = new Set(["completed", "terminated"]);
  const byCountry = new Map<string, { countryId: string; countryName: string; active: number; pending: number; ended: number; total: number }>();
  for (const r of rows) {
    const entry = byCountry.get(r.countryId) ?? {
      countryId: r.countryId,
      countryName: r.countryName ?? "Unknown",
      active: 0, pending: 0, ended: 0, total: 0,
    };
    const s = r.status ?? "draft";
    if (s === "active") entry.active += r.count;
    else if (PENDING.has(s)) entry.pending += r.count;
    else if (ENDED.has(s)) entry.ended += r.count;
    entry.total += r.count;
    byCountry.set(r.countryId, entry);
  }
  return Array.from(byCountry.values()).sort((a, b) => b.total - a.total);
}

export async function getDashboardSummary(user: AuthUser): Promise<SummaryResult> {
  const scope = await resolveDashboardScope(user);
  if (scope.kind === "denied") {
    return { ok: false, status: scope.status, message: scope.message };
  }

  const windowStart = computeWindowStart(new Date());
  const keys = monthKeys(windowStart);

  if (scope.kind === "sdp") {
    const [workforce, byStatus, byCountryStatus, monthly, invoicesMonthly, outstanding, pipelineRows] =
      await Promise.all([
        repo.fetchWorkforceByCountry({ kind: "sdp" }),
        repo.fetchContractsByStatus({ kind: "sdp" }),
        repo.fetchContractsByCountryStatus(),
        repo.fetchContractsMonthly({ kind: "sdp" }, windowStart),
        repo.fetchSdpInvoicesMonthly(windowStart),
        repo.fetchOutstandingByCurrency(),
        repo.fetchTimesheetStatusCounts({ kind: "sdp" }),
      ]);

    const workforceByCountry = pivotWorkforce(workforce);
    const contractsByStatus = normalizeStatusCounts(byStatus, "draft");
    const timesheetPipeline = toPipeline(pipelineRows);
    return {
      ok: true,
      data: {
        role: "sdp",
        kpis: {
          totalWorkers: workforceByCountry.reduce((sum, c) => sum + c.total, 0),
          activeContracts: statusCount(contractsByStatus, "active"),
          submittedTimesheets: timesheetPipeline.submitted,
          openSdpInvoices: outstanding.reduce((sum, o) => sum + o.count, 0),
        },
        workforceByCountry,
        contractsByStatus,
        contractsByCountry: pivotContractsByCountry(byCountryStatus),
        contractsMonthly: fillMonths(monthly, keys),
        invoicesMonthly: pivotMonthlyMoney(invoicesMonthly, keys),
        timesheetPipeline,
        outstandingByCurrency: outstanding,
      },
    };
  }

  if (scope.kind === "business") {
    const businessScope = { kind: "business" as const, businessId: scope.businessId };
    const [workforce, byStatus, invoicesMonthly, outstanding, pipelineRows, leaveRows, approvedUpcoming, pendingByType] =
      await Promise.all([
        repo.fetchWorkforceByCountry(businessScope),
        repo.fetchContractsByStatus(businessScope),
        repo.fetchSdpInvoicesMonthly(windowStart, scope.businessId),
        repo.fetchOutstandingByCurrency(scope.businessId),
        repo.fetchTimesheetStatusCounts(businessScope),
        repo.fetchLeaveStatusCounts(businessScope),
        repo.fetchApprovedUpcomingLeaveCount(scope.businessId),
        repo.fetchPendingLeaveByType(scope.businessId),
      ]);

    const workforceByCountry = pivotWorkforce(workforce);
    const contractsByStatus = normalizeStatusCounts(byStatus, "draft");
    const timesheetPipeline = toPipeline(pipelineRows);
    const leaveCounts = normalizeStatusCounts(leaveRows, "pending");
    return {
      ok: true,
      data: {
        role: "business",
        businessName: scope.businessName,
        kpis: {
          totalWorkers: workforceByCountry.reduce((sum, c) => sum + c.total, 0),
          activeContracts: statusCount(contractsByStatus, "active"),
          submittedTimesheets: timesheetPipeline.submitted,
          pendingLeave: statusCount(leaveCounts, "pending"),
        },
        workforceByCountry,
        contractsByStatus,
        invoicesMonthly: pivotMonthlyMoney(invoicesMonthly, keys),
        outstandingByCurrency: outstanding,
        timesheetPipeline,
        leave: {
          pending: statusCount(leaveCounts, "pending"),
          approvedUpcoming,
          byType: pendingByType,
        },
      },
    };
  }

  // Worker
  const workerScope = { kind: "worker" as const, workerId: scope.workerId };
  const isEmployee = scope.workerType === "employee";
  const [byStatus, pipelineRows, workMonthly, payslipRows, invoiceRows, contractRows, leaveRows] =
    await Promise.all([
      repo.fetchContractsByStatus(workerScope),
      repo.fetchTimesheetStatusCounts(workerScope),
      repo.fetchWorkerWorkMonthly(scope.workerId, windowStart),
      isEmployee ? repo.fetchWorkerPayslipsMonthly(scope.workerId, windowStart) : Promise.resolve(null),
      isEmployee ? Promise.resolve(null) : repo.fetchContractorInvoiceTotals(scope.workerId),
      repo.fetchWorkerContracts(scope.workerId),
      isEmployee ? repo.fetchLeaveStatusCounts(workerScope) : Promise.resolve(null),
    ]);

  const contractsByStatus = normalizeStatusCounts(byStatus, "draft");
  const timesheetPipeline = toPipeline(pipelineRows);
  const workByMonth = new Map(workMonthly.map(r => [r.month, r]));
  const leaveCounts = leaveRows ? normalizeStatusCounts(leaveRows, "pending") : null;
  return {
    ok: true,
    data: {
      role: "worker",
      workerType: scope.workerType,
      firstName: scope.firstName,
      kpis: {
        activeContracts: statusCount(contractsByStatus, "active"),
        draftTimesheets: timesheetPipeline.draft,
        submittedTimesheets: timesheetPipeline.submitted,
        approvedTimesheets: timesheetPipeline.approved,
      },
      workMonthly: keys.map(month => ({
        month,
        hours: workByMonth.get(month)?.hours ?? 0,
        days: workByMonth.get(month)?.days ?? 0,
      })),
      payslipsMonthly: payslipRows ? pivotMonthlyMoney(payslipRows, keys) : null,
      invoiceTotals: invoiceRows
        ? invoiceRows.map(r => ({ status: r.status ?? "draft", currency: r.currency, total: r.total, count: r.count }))
        : null,
      contracts: contractRows.map(c => ({
        id: c.id,
        contractName: c.contractName,
        status: c.status ?? "draft",
        rateType: c.rateType,
        currency: c.currency,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate ? c.endDate.toISOString() : null,
        businessName: c.businessName,
        signedAt: c.signedAt ? c.signedAt.toISOString() : null,
        hasSigningToken: c.signingToken != null,
      })),
      leave: leaveCounts
        ? { pending: statusCount(leaveCounts, "pending"), approved: statusCount(leaveCounts, "approved") }
        : null,
    },
  };
}
