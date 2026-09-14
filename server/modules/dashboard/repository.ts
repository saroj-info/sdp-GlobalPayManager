/**
 * Dashboard repository — SQL GROUP BY aggregates only. Every function is one
 * round-trip to Postgres; no full-table fetches, no in-memory filtering.
 *
 * Rules (they fix the bugs the old /api/dashboard/* endpoints shipped with):
 *  - Only real enum values (contract_status, timesheet_status, leave_status,
 *    invoice_status, sdp_invoice_status). Signature state is NOT a contract
 *    status — it comes from signedAt / signingToken audit columns.
 *  - Never `inArray(col, [])` — status lists are fixed literals.
 *  - Hours/days are summed from timesheet_entries, never timesheets.totalHours
 *    (stale for daily/annual contracts).
 *  - payslips has no status column; never filter on one.
 *  - Money sums cast ::float, counts ::int (decimals come back as strings
 *    otherwise). Month buckets use date_trunc in DB TZ (UTC) — fine for trends.
 */

import { db } from "../../db";
import {
  workers,
  countries,
  businesses,
  contracts,
  timesheets,
  timesheetEntries,
  payslips,
  invoices,
  sdpInvoices,
  leaveRequests,
  workerBusinessAssociations,
} from "@shared/schema";
import { and, or, eq, ne, gte, notInArray, inArray, sql, desc, type SQL, type AnyColumn } from "drizzle-orm";

const monthOf = (col: AnyColumn) =>
  sql<string>`to_char(date_trunc('month', ${col}), 'YYYY-MM')`;

const countInt = sql<number>`count(*)::int`;

// ---------------------------------------------------------------------------
// Scope where-clauses
// ---------------------------------------------------------------------------

/**
 * Workers visible to a business — same triple-OR as the workforce list module:
 * home business, placed at us via a contract's customerBusinessId, or actively
 * shared in via worker_business_associations.
 */
function businessWorkforceWhere(businessId: string): SQL | undefined {
  const hostClientWorkerIds = db
    .select({ workerId: contracts.workerId })
    .from(contracts)
    .where(eq(contracts.customerBusinessId, businessId));
  const linkedWorkerIds = db
    .select({ workerId: workerBusinessAssociations.workerId })
    .from(workerBusinessAssociations)
    .where(and(
      eq(workerBusinessAssociations.businessId, businessId),
      eq(workerBusinessAssociations.status, "active"),
    ));
  return or(
    eq(workers.businessId, businessId),
    inArray(workers.id, hostClientWorkerIds),
    inArray(workers.id, linkedWorkerIds),
  );
}

/** Contracts visible to a business: employing business OR host client. */
function businessContractsWhere(businessId: string): SQL | undefined {
  return or(
    eq(contracts.businessId, businessId),
    eq(contracts.customerBusinessId, businessId),
  );
}

// ---------------------------------------------------------------------------
// Workforce
// ---------------------------------------------------------------------------

export interface WorkforceCountryRow {
  countryId: string | null;
  countryName: string | null;
  workerType: string;
  count: number;
}

export async function fetchWorkforceByCountry(
  scope: { kind: "sdp" } | { kind: "business"; businessId: string },
): Promise<WorkforceCountryRow[]> {
  const where = scope.kind === "business" ? businessWorkforceWhere(scope.businessId) : undefined;
  return db
    .select({
      countryId: workers.countryId,
      countryName: countries.name,
      workerType: workers.workerType,
      count: countInt,
    })
    .from(workers)
    .leftJoin(countries, eq(workers.countryId, countries.id))
    .where(where)
    .groupBy(workers.countryId, countries.name, workers.workerType);
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export async function fetchContractsByStatus(
  scope: { kind: "sdp" } | { kind: "business"; businessId: string } | { kind: "worker"; workerId: string },
): Promise<Array<{ status: string | null; count: number }>> {
  const where =
    scope.kind === "business" ? businessContractsWhere(scope.businessId) :
    scope.kind === "worker" ? eq(contracts.workerId, scope.workerId) :
    undefined;
  return db
    .select({ status: contracts.status, count: countInt })
    .from(contracts)
    .where(where)
    .groupBy(contracts.status);
}

/** SDP only: contract counts per country per status (pivoted in the service). */
export async function fetchContractsByCountryStatus(): Promise<
  Array<{ countryId: string; countryName: string | null; status: string | null; count: number }>
> {
  return db
    .select({
      countryId: contracts.countryId,
      countryName: countries.name,
      status: contracts.status,
      count: countInt,
    })
    .from(contracts)
    .leftJoin(countries, eq(contracts.countryId, countries.id))
    .groupBy(contracts.countryId, countries.name, contracts.status);
}

export async function fetchContractsMonthly(
  scope: { kind: "sdp" } | { kind: "business"; businessId: string },
  windowStart: Date,
): Promise<Array<{ month: string; count: number }>> {
  const scopeWhere = scope.kind === "business" ? businessContractsWhere(scope.businessId) : undefined;
  const month = monthOf(contracts.createdAt);
  return db
    .select({ month, count: countInt })
    .from(contracts)
    .where(and(scopeWhere, gte(contracts.createdAt, windowStart)))
    .groupBy(month);
}

/** Worker's live contracts (not completed/terminated), newest first, max 5. */
export async function fetchWorkerContracts(workerId: string) {
  return db
    .select({
      id: contracts.id,
      contractName: contracts.contractName,
      status: contracts.status,
      rateType: contracts.rateType,
      currency: contracts.currency,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      signedAt: contracts.signedAt,
      signingToken: contracts.signingToken,
      businessName: businesses.name,
    })
    .from(contracts)
    .leftJoin(businesses, eq(contracts.businessId, businesses.id))
    .where(and(
      eq(contracts.workerId, workerId),
      notInArray(contracts.status, ["completed", "terminated"]),
    ))
    .orderBy(desc(contracts.createdAt))
    .limit(5);
}

// ---------------------------------------------------------------------------
// Timesheets
// ---------------------------------------------------------------------------

export async function fetchTimesheetStatusCounts(
  scope: { kind: "sdp" } | { kind: "business"; businessId: string } | { kind: "worker"; workerId: string },
): Promise<Array<{ status: string | null; count: number }>> {
  if (scope.kind === "business") {
    // Own timesheets OR timesheets on contracts where we're the host client —
    // same visibility as the timesheets list module.
    return db
      .select({ status: timesheets.status, count: countInt })
      .from(timesheets)
      .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
      .where(or(
        eq(timesheets.businessId, scope.businessId),
        eq(contracts.customerBusinessId, scope.businessId),
      ))
      .groupBy(timesheets.status);
  }
  const where = scope.kind === "worker" ? eq(timesheets.workerId, scope.workerId) : undefined;
  return db
    .select({ status: timesheets.status, count: countInt })
    .from(timesheets)
    .where(where)
    .groupBy(timesheets.status);
}

/** Hours/days per month summed from entries — timesheets.totalHours is stale. */
export async function fetchWorkerWorkMonthly(
  workerId: string,
  windowStart: Date,
): Promise<Array<{ month: string; hours: number; days: number }>> {
  const month = monthOf(timesheets.periodEnd);
  return db
    .select({
      month,
      hours: sql<number>`coalesce(sum(${timesheetEntries.hoursWorked}), 0)::float`,
      days: sql<number>`coalesce(sum(${timesheetEntries.daysWorked}), 0)::float`,
    })
    .from(timesheetEntries)
    .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
    .where(and(
      eq(timesheets.workerId, workerId),
      inArray(timesheets.status, ["submitted", "approved"]),
      gte(timesheets.periodEnd, windowStart),
    ))
    .groupBy(month);
}

// ---------------------------------------------------------------------------
// Money — SDP invoices, contractor invoices, payslips
// ---------------------------------------------------------------------------

export async function fetchSdpInvoicesMonthly(
  windowStart: Date,
  toBusinessId?: string,
): Promise<Array<{ month: string; currency: string; total: number }>> {
  const month = monthOf(sdpInvoices.invoiceDate);
  return db
    .select({
      month,
      currency: sdpInvoices.currency,
      total: sql<number>`sum(${sdpInvoices.totalAmount})::float`,
    })
    .from(sdpInvoices)
    .where(and(
      gte(sdpInvoices.invoiceDate, windowStart),
      ne(sdpInvoices.status, "cancelled"),
      toBusinessId ? eq(sdpInvoices.toBusinessId, toBusinessId) : undefined,
    ))
    .groupBy(month, sdpInvoices.currency);
}

export async function fetchOutstandingByCurrency(
  toBusinessId?: string,
): Promise<Array<{ currency: string; total: number; count: number }>> {
  return db
    .select({
      currency: sdpInvoices.currency,
      total: sql<number>`sum(${sdpInvoices.totalAmount} - coalesce(${sdpInvoices.paidAmount}, 0))::float`,
      count: countInt,
    })
    .from(sdpInvoices)
    .where(and(
      inArray(sdpInvoices.status, ["issued", "sent", "overdue"]),
      toBusinessId ? eq(sdpInvoices.toBusinessId, toBusinessId) : undefined,
    ))
    .groupBy(sdpInvoices.currency);
}

/** Contractor's own invoices grouped by status + currency. */
export async function fetchContractorInvoiceTotals(
  workerId: string,
): Promise<Array<{ status: string | null; currency: string; total: number; count: number }>> {
  return db
    .select({
      status: invoices.status,
      currency: invoices.currency,
      total: sql<number>`sum(${invoices.totalAmount})::float`,
      count: countInt,
    })
    .from(invoices)
    .where(eq(invoices.contractorId, workerId))
    .groupBy(invoices.status, invoices.currency);
}

/** Employee net pay per month + currency. payslips has NO status column. */
export async function fetchWorkerPayslipsMonthly(
  workerId: string,
  windowStart: Date,
): Promise<Array<{ month: string; currency: string; total: number }>> {
  const month = monthOf(payslips.payDate);
  return db
    .select({
      month,
      currency: payslips.currency,
      total: sql<number>`sum(${payslips.netPay})::float`,
    })
    .from(payslips)
    .where(and(
      eq(payslips.workerId, workerId),
      gte(payslips.payDate, windowStart),
    ))
    .groupBy(month, payslips.currency);
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export async function fetchLeaveStatusCounts(
  scope: { kind: "business"; businessId: string } | { kind: "worker"; workerId: string },
): Promise<Array<{ status: string | null; count: number }>> {
  const where = scope.kind === "business"
    ? eq(leaveRequests.businessId, scope.businessId)
    : eq(leaveRequests.workerId, scope.workerId);
  return db
    .select({ status: leaveRequests.status, count: countInt })
    .from(leaveRequests)
    .where(where)
    .groupBy(leaveRequests.status);
}

export async function fetchApprovedUpcomingLeaveCount(businessId: string): Promise<number> {
  const rows = await db
    .select({ count: countInt })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.businessId, businessId),
      eq(leaveRequests.status, "approved"),
      gte(leaveRequests.startDate, new Date()),
    ));
  return rows[0]?.count ?? 0;
}

export async function fetchPendingLeaveByType(
  businessId: string,
): Promise<Array<{ leaveType: string; count: number }>> {
  return db
    .select({ leaveType: leaveRequests.leaveType, count: countInt })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.businessId, businessId),
      eq(leaveRequests.status, "pending"),
    ))
    .groupBy(leaveRequests.leaveType);
}
