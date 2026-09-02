/**
 * Read-only tools for AI search.
 *
 * Every tool wraps an already-authorized data source and runs under the
 * CALLER's identity. There is deliberately no write tool; the AI cannot
 * mutate anything.
 *
 * Non-modular endpoints (invoices, leave requests, businesses) are wrapped
 * with in-memory filtering — cheap for typical tenants; a `TODO: modularise`
 * marker is left where they should later gain proper repository filters.
 */

import { createHash } from "crypto";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { storage } from "../../../storage";
import { listWorkers } from "../../workforce";
import { listContracts } from "../../contracts";
import { listTimesheets } from "../../timesheets";
import { getPrimer, listPrimersForRole } from "./primerRegistry";
import {
  COUNTRY_LIST,
  COUNTRY_CODE_BY_NAME,
  COUNTRY_EMPLOYMENT_NOTES,
  DEFAULT_EMPLOYER_ONCOSTS,
  DEFAULT_CONTRACTOR_ONCOSTS,
  DEFAULT_JURISDICTIONS_OVERLAY,
  COUNTRY_CURRENCIES,
  canonicaliseCountry,
  estimateEmploymentCost as estimateEmploymentCostShared,
} from "@shared/countryEmploymentData";
import type { AuthUser, CallerRole, ToolCallRecord } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listWorkers",
      description:
        "List workers visible to the caller with structured filters. Business users are auto-scoped to their business + host clients; SDP admins see all.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", description: "Name fragment" },
          countryId: { type: "string" },
          workerType: { type: "string", description: "e.g. 'contractor' | 'permanent'" },
          businessId: { type: "string", description: "Restrict to a specific business (admin scope only)" },
          sortBy: { type: "string", enum: ["name", "country", "type", "business", "created"] },
          limit: { type: "number", description: "1-50, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listContracts",
      description:
        "List contracts with filters. Extra derived filters: expiringBeforeDate / expiringAfterDate (ISO date) — applied in-memory to endDate.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string" },
          status: { type: "string" },
          businessId: { type: "string" },
          countryId: { type: "string" },
          sortBy: { type: "string", enum: ["worker", "role", "country", "status", "date"] },
          expiringBeforeDate: { type: "string", description: "YYYY-MM-DD; contracts whose endDate is on/before this date" },
          expiringAfterDate: { type: "string", description: "YYYY-MM-DD; contracts whose endDate is on/after this date" },
          limit: { type: "number", description: "1-50, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listTimesheets",
      description:
        "List timesheets. Returns statusCounts alongside the page slice so counts can be answered without a second call.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string" },
          status: { type: "string", enum: ["draft", "submitted", "approved", "rejected"] },
          businessId: { type: "string" },
          countryId: { type: "string" },
          hostClientName: { type: "string" },
          sortBy: { type: "string", enum: ["recent", "period_end", "period_start", "status", "submitted", "worker"] },
          limit: { type: "number", description: "1-50, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listInvoices",
      description:
        "List invoices visible to the caller. Filters applied in-memory after fetch: category, status, businessId, hostClientId, contractId, ageMinDays / ageMaxDays (days since invoice date, using today's date).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: ["sdp_services", "customer_billing", "business_to_client"] },
          status: { type: "string" },
          businessId: { type: "string" },
          hostClientId: { type: "string" },
          contractId: { type: "string" },
          ageMinDays: { type: "number" },
          ageMaxDays: { type: "number" },
          limit: { type: "number", description: "1-50, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listLeaveRequests",
      description:
        "List leave requests visible to the caller. Filters in-memory: status, businessId, workerId, dateFrom, dateTo.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
          businessId: { type: "string" },
          workerId: { type: "string" },
          dateFrom: { type: "string", description: "YYYY-MM-DD" },
          dateTo: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", description: "1-50, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listBusinesses",
      description:
        "List businesses visible to the caller. Kind: 'customer' (isRegistered=true), 'host_client' (isRegistered=false), 'sdp_owned' (SDP employer-of-record row, admins only).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string" },
          kind: { type: "string", enum: ["customer", "host_client", "sdp_owned"] },
          countryId: { type: "string" },
          limit: { type: "number", description: "1-50, default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchWorkers",
      description:
        "Fuzzy worker lookup. Use this to resolve a person's name to a workerId BEFORE calling listContracts / listTimesheets / listInvoices with a workerId filter.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          limit: { type: "number", description: "1-10, default 5" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchBusinesses",
      description:
        "Fuzzy business lookup. Use to resolve a business name to an id BEFORE any list tool that takes businessId / hostClientId. Set isHostClient=true for unregistered billing-only clients.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
          isHostClient: { type: "boolean" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listPrimers",
      description:
        "List platform how-to primers available to the caller. Call FIRST for any 'how do I…' / 'what is…' / 'difference between…' question, then getPrimer for the specific slug(s).",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          topic: { type: "string", description: "Optional keyword to narrow the index" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPrimer",
      description:
        "Read the body of a primer by slug. Slug MUST be one returned by listPrimers this session; do not invent slugs.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          slug: { type: "string" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCountryEmploymentRules",
      description:
        "MANDATORY first call for any question about pay, tax, statutory contributions, on-costs, minimum wage, working hours, notice periods, contractor rules, or hiring practices in a named country. Returns the country's employer / contractor on-cost defaults (SDP-maintained), jurisdiction overlays where applicable, currency, and a narrative summary of the local employment regime. Numbers in your answer MUST come from this call — never from memory.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          country: {
            type: "string",
            description:
              "Country name or ISO-2 code (e.g. 'Australia', 'AU', 'India', 'IN'). Common aliases accepted ('United States' → USA, 'United Kingdom' → UK).",
          },
          jurisdiction: {
            type: "string",
            description:
              "Optional state / province name to include the overlay (e.g. 'California', 'New South Wales'). Applies only where SDP has an overlay defined.",
          },
        },
        required: ["country"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimateEmploymentCost",
      description:
        "Deterministic cost estimator — runs the same math as the /resources Employment Cost Calculator. Use when the user asks 'what would it cost to hire X for $Y in <country>?' or 'employer on-cost for $Y in <country>'. Chain AFTER getCountryEmploymentRules if the country has jurisdictional overlays the user should choose from.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          country: { type: "string", description: "Country name or ISO-2 code" },
          employmentType: { type: "string", enum: ["Employee", "Contractor"], description: "Default: Employee" },
          annualSalary: { type: "number", description: "Base annual salary in the country's local currency" },
          jurisdiction: { type: "string", description: "Optional state / province — same names as getCountryEmploymentRules" },
        },
        required: ["country", "annualSalary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summariseNumbers",
      description:
        "Deterministic aggregation over rows returned by another tool this turn. Use for ANY numeric answer ('how much did I bill Acme last quarter?'). NEVER quote a number from memory.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          rows: { type: "array", description: "Array of objects to aggregate (usually the items array from listInvoices / listTimesheets)" },
          sumField: { type: "string", description: "Property name whose numeric values to sum, e.g. 'amount'" },
          groupBy: { type: "string", description: "Optional property to group by, e.g. 'currency' or 'status'" },
        },
        required: ["rows", "sumField"],
      },
    },
  },
];

export interface ToolContext {
  user: AuthUser;
  role: CallerRole;
  businessId?: string;
  workerId?: string;
}

interface ToolExecutionResult {
  result: unknown;
  record: ToolCallRecord;
}

function hashResult(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
}

function record(tool: string, args: Record<string, any>, result: unknown): ToolCallRecord {
  return { tool, args, resultHash: hashResult(result) };
}

function clampLimit(raw: unknown, def = 10, max = 50): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

function toWorkerRow(w: any) {
  return {
    entity: "worker" as const,
    id: w.id,
    name: `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim(),
    email: w.email,
    workerType: w.workerType,
    countryCode: w.country?.code,
    businessName: w.business?.name,
  };
}

function toContractRow(c: any) {
  return {
    entity: "contract" as const,
    id: c.id,
    contractName: c.contractName ?? null,
    status: c.status,
    derivedStatus: c.derivedStatus ?? null,
    workerName: c.worker ? `${c.worker.firstName ?? ""} ${c.worker.lastName ?? ""}`.trim() : null,
    businessName: c.business?.name ?? null,
    hostClientName: c.customerBusiness?.name ?? null,
    countryCode: c.country?.code ?? null,
    startDate: c.startDate,
    endDate: c.endDate,
    rateType: c.rateType,
    rate: c.rate,
    currency: c.currency,
  };
}

function toTimesheetRow(t: any) {
  return {
    entity: "timesheet" as const,
    id: t.id,
    status: t.status,
    periodStart: t.periodStart,
    periodEnd: t.periodEnd,
    totalHours: t.totalHours,
    totalDays: t.totalDays,
    workerName: t.worker ? `${t.worker.firstName ?? ""} ${t.worker.lastName ?? ""}`.trim() : null,
    businessName: t.business?.name ?? null,
    contractName: t.contractName ?? null,
  };
}

function toInvoiceRow(i: any) {
  return {
    entity: "invoice" as const,
    id: i.id,
    invoiceNumber: i.invoiceNumber ?? null,
    category: i.category ?? null,
    status: i.status,
    amount: i.amount ?? null,
    currency: i.currency ?? null,
    invoiceDate: i.invoiceDate ?? null,
    dueDate: i.dueDate ?? null,
    businessName: i.business?.name ?? null,
    contractorName: i.contractor
      ? `${i.contractor.firstName ?? ""} ${i.contractor.lastName ?? ""}`.trim()
      : null,
    contractId: i.contractId ?? null,
  };
}

function toLeaveRow(l: any) {
  return {
    entity: "leaveRequest" as const,
    id: l.id,
    status: l.status,
    leaveType: l.leaveType ?? null,
    startDate: l.startDate,
    endDate: l.endDate,
    workerName: l.worker ? `${l.worker.firstName ?? ""} ${l.worker.lastName ?? ""}`.trim() : null,
    businessName: l.business?.name ?? null,
  };
}

function toBusinessRow(b: any) {
  const kind = b.isSdpOwned
    ? "sdp_owned"
    : b.isRegistered === false
      ? "host_client"
      : "customer";
  return {
    entity: "business" as const,
    id: b.id,
    name: b.name,
    kind,
    countryCode: b.country?.code ?? null,
  };
}

function ageInDays(dateLike: unknown, today: Date): number | null {
  if (!dateLike) return null;
  const d = new Date(dateLike as any);
  if (!Number.isFinite(d.getTime())) return null;
  return Math.floor((today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function toIsoDate(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

export async function runTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const args = (rawArgs && typeof rawArgs === "object") ? (rawArgs as Record<string, any>) : {};

  if (!ctx.user?.id) {
    const payload = { error: "unauthenticated" };
    return { result: payload, record: record(name, args, payload) };
  }

  const authUser = {
    id: ctx.user.id,
    userType: ctx.user.userType,
    activeRole: ctx.user.activeRole,
    availableRoles: ctx.user.availableRoles,
  };

  switch (name) {
    case "listWorkers": {
      const limit = clampLimit(args.limit);
      const result = await listWorkers(authUser, {
        page: 1,
        pageSize: limit,
        search: args.search ? String(args.search) : undefined,
        countryId: args.countryId ? String(args.countryId) : undefined,
        workerType: args.workerType ? String(args.workerType) : undefined,
        businessId: args.businessId && UUID_RE.test(String(args.businessId)) ? String(args.businessId) : undefined,
        sortBy: (["name", "country", "type", "business", "created"].includes(args.sortBy) ? args.sortBy : "name") as any,
      });
      const items = result.ok ? result.data.items.map(toWorkerRow) : [];
      const payload = { items, total: result.ok ? result.data.total : 0 };
      return { result: payload, record: record(name, args, payload) };
    }

    case "listContracts": {
      const limit = clampLimit(args.limit);
      const result = await listContracts(authUser, {
        page: 1,
        pageSize: limit,
        search: args.search ? String(args.search) : undefined,
        status: args.status ? String(args.status) : undefined,
        businessId: args.businessId && UUID_RE.test(String(args.businessId)) ? String(args.businessId) : undefined,
        countryId: args.countryId ? String(args.countryId) : undefined,
        sortBy: (["worker", "role", "country", "status", "date"].includes(args.sortBy) ? args.sortBy : "date") as any,
      });
      let items = result.ok ? result.data.items : [];
      const expiringBefore = toIsoDate(args.expiringBeforeDate);
      const expiringAfter = toIsoDate(args.expiringAfterDate);
      if (expiringBefore || expiringAfter) {
        items = items.filter((c: any) => {
          const end = toIsoDate(c.endDate);
          if (!end) return false;
          if (expiringBefore && end.getTime() > expiringBefore.getTime()) return false;
          if (expiringAfter && end.getTime() < expiringAfter.getTime()) return false;
          return true;
        });
      }
      const payload = { items: items.map(toContractRow), total: items.length };
      return { result: payload, record: record(name, args, payload) };
    }

    case "listTimesheets": {
      const limit = clampLimit(args.limit);
      const result = await listTimesheets(authUser, {
        page: 1,
        pageSize: limit,
        search: args.search ? String(args.search) : undefined,
        status: args.status ? String(args.status) : undefined,
        businessId: args.businessId && UUID_RE.test(String(args.businessId)) ? String(args.businessId) : undefined,
        countryId: args.countryId ? String(args.countryId) : undefined,
        hostClientName: args.hostClientName ? String(args.hostClientName) : undefined,
        sortBy: (["recent", "period_end", "period_start", "status", "submitted", "worker"].includes(args.sortBy)
          ? args.sortBy
          : "recent") as any,
      });
      const items = result.ok ? result.data.items.map(toTimesheetRow) : [];
      const statusCounts = result.ok ? result.data.statusCounts : undefined;
      const payload = { items, total: result.ok ? result.data.total : 0, statusCounts };
      return { result: payload, record: record(name, args, payload) };
    }

    case "listInvoices": {
      // TODO: modularise /api/invoices — this wrapper filters after fetch.
      const limit = clampLimit(args.limit);
      let invoices: any[] = [];
      if (ctx.role === "sdp_internal") {
        invoices = await storage.getAllInvoices().catch(() => []);
      } else if (ctx.role === "business_user" && ctx.businessId) {
        invoices = await storage.getInvoicesByBusiness(ctx.businessId).catch(() => []);
      } else if (ctx.role === "worker" && ctx.workerId) {
        invoices = await storage.getInvoicesByContractor(ctx.workerId).catch(() => []);
      }
      const today = new Date();
      const category = args.category ? String(args.category) : undefined;
      const status = args.status ? String(args.status) : undefined;
      const businessId = args.businessId && UUID_RE.test(String(args.businessId)) ? String(args.businessId) : undefined;
      const hostClientId = args.hostClientId && UUID_RE.test(String(args.hostClientId)) ? String(args.hostClientId) : undefined;
      const contractId = args.contractId && UUID_RE.test(String(args.contractId)) ? String(args.contractId) : undefined;
      const ageMin = Number.isFinite(Number(args.ageMinDays)) ? Number(args.ageMinDays) : undefined;
      const ageMax = Number.isFinite(Number(args.ageMaxDays)) ? Number(args.ageMaxDays) : undefined;
      const filtered = invoices.filter((i: any) => {
        if (category && i.category !== category) return false;
        if (status && i.status !== status) return false;
        if (businessId && i.businessId !== businessId) return false;
        if (hostClientId && i.hostClientId !== hostClientId && i.customerBusinessId !== hostClientId) return false;
        if (contractId && i.contractId !== contractId) return false;
        if (ageMin !== undefined || ageMax !== undefined) {
          const age = ageInDays(i.invoiceDate, today);
          if (age === null) return false;
          if (ageMin !== undefined && age < ageMin) return false;
          if (ageMax !== undefined && age > ageMax) return false;
        }
        return true;
      });
      const items = filtered.slice(0, limit).map(toInvoiceRow);
      // Sum by currency for quick numeric context.
      const sumByCurrency: Record<string, number> = {};
      for (const i of filtered) {
        const cur = String(i.currency ?? "").toUpperCase() || "?";
        const amt = Number(i.amount ?? 0);
        if (!Number.isFinite(amt)) continue;
        sumByCurrency[cur] = (sumByCurrency[cur] ?? 0) + amt;
      }
      const payload = { items, total: filtered.length, sumByCurrency };
      return { result: payload, record: record(name, args, payload) };
    }

    case "listLeaveRequests": {
      // TODO: modularise /api/leave-requests — this wrapper filters after fetch.
      const limit = clampLimit(args.limit);
      let rows: any[] = [];
      if (ctx.role === "sdp_internal") {
        rows = await storage.getAllLeaveRequests().catch(() => []);
      } else if (ctx.role === "business_user" && ctx.businessId) {
        const [own, hosted] = await Promise.all([
          storage.getLeaveRequestsByBusiness(ctx.businessId).catch(() => []),
          storage.getLeaveRequestsForHostClient(ctx.businessId).catch(() => []),
        ]);
        const seen = new Set<string>();
        rows = [...own, ...hosted].filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
      } else if (ctx.role === "worker" && ctx.workerId) {
        rows = await storage.getLeaveRequestsByWorker(ctx.workerId).catch(() => []);
      }
      const status = args.status ? String(args.status) : undefined;
      const businessId = args.businessId && UUID_RE.test(String(args.businessId)) ? String(args.businessId) : undefined;
      const workerId = args.workerId && UUID_RE.test(String(args.workerId)) ? String(args.workerId) : undefined;
      const dateFrom = toIsoDate(args.dateFrom);
      const dateTo = toIsoDate(args.dateTo);
      const filtered = rows.filter((l: any) => {
        if (status && l.status !== status) return false;
        if (businessId && l.businessId !== businessId) return false;
        if (workerId && l.workerId !== workerId) return false;
        if (dateFrom) {
          const s = toIsoDate(l.startDate);
          if (!s || s.getTime() < dateFrom.getTime()) return false;
        }
        if (dateTo) {
          const e = toIsoDate(l.endDate);
          if (!e || e.getTime() > dateTo.getTime()) return false;
        }
        return true;
      });
      const items = filtered.slice(0, limit).map(toLeaveRow);
      const payload = { items, total: filtered.length };
      return { result: payload, record: record(name, args, payload) };
    }

    case "listBusinesses": {
      // TODO: modularise /api/businesses.
      const limit = clampLimit(args.limit);
      let candidates: any[] = [];
      if (ctx.role === "sdp_internal") {
        candidates = await storage.getBusinesses().catch(() => []);
      } else if (ctx.role === "business_user" && ctx.businessId) {
        const [own, hosted] = await Promise.all([
          storage.getBusinessesForUser(ctx.user.id).catch(() => []),
          storage.getHostClientsForBusiness(ctx.businessId).catch(() => []),
        ]);
        const seen = new Set<string>();
        candidates = [...own, ...hosted].filter((b: any) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
      } else {
        candidates = [];
      }
      const kind = args.kind ? String(args.kind) : undefined;
      const q = args.search ? String(args.search).toLowerCase() : undefined;
      const countryId = args.countryId && UUID_RE.test(String(args.countryId)) ? String(args.countryId) : undefined;
      const filtered = candidates.filter((b: any) => {
        // Hide SDP-owned unless explicitly asked for by an admin.
        if (b.isSdpOwned && kind !== "sdp_owned") return false;
        if (kind === "customer" && b.isRegistered === false) return false;
        if (kind === "host_client" && b.isRegistered !== false) return false;
        if (kind === "sdp_owned" && !b.isSdpOwned) return false;
        if (countryId && b.countryId !== countryId) return false;
        if (q && !(b.name ?? "").toLowerCase().includes(q)) return false;
        return true;
      });
      const items = filtered.slice(0, limit).map(toBusinessRow);
      const payload = { items, total: filtered.length };
      return { result: payload, record: record(name, args, payload) };
    }

    case "searchWorkers": {
      const q = String(args.query ?? "").trim();
      const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
      const result = await listWorkers(authUser, {
        page: 1,
        pageSize: limit,
        search: q,
        sortBy: "name",
      });
      const items = (result.ok ? result.data.items : []).map((w: any) => ({
        id: w.id,
        name: `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim(),
        email: w.email,
        workerType: w.workerType,
        businessId: w.businessId,
        businessName: w.business?.name,
        countryCode: w.country?.code,
      }));
      const nameOf = (r: any) => r.name.toLowerCase();
      const nameCounts = new Map<string, number>();
      for (const r of items) {
        if (!r.name) continue;
        nameCounts.set(nameOf(r), (nameCounts.get(nameOf(r)) ?? 0) + 1);
      }
      const duplicate = Array.from(nameCounts.entries()).find(([, c]) => c > 1)?.[0];
      const payload = duplicate
        ? { ambiguous: true, duplicateName: duplicate, hint: "ask_for_email", items }
        : { items };
      return { result: payload, record: record(name, args, payload) };
    }

    case "searchBusinesses": {
      const q = String(args.query ?? "").trim().toLowerCase();
      const isHostClient = args.isHostClient === true;
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));

      let candidates: any[] = [];
      if (ctx.role === "sdp_internal") {
        candidates = await storage.getBusinesses().catch(() => []);
      } else if (ctx.businessId) {
        if (isHostClient) {
          candidates = await storage.getHostClientsForBusiness(ctx.businessId).catch(() => []);
        } else {
          candidates = await storage.getBusinessesForUser(ctx.user.id).catch(() => []);
        }
      }
      const filtered = candidates
        .filter((b: any) => (isHostClient ? b.isRegistered === false : b.isRegistered !== false))
        .filter((b: any) => (b.isSdpOwned ? ctx.role === "sdp_internal" : true))
        .filter((b: any) => !q || (b.name ?? "").toLowerCase().includes(q))
        .slice(0, limit)
        .map((b: any) => ({ id: b.id, name: b.name, isRegistered: b.isRegistered !== false, kind: b.isSdpOwned ? "sdp_owned" : (b.isRegistered === false ? "host_client" : "customer") }));
      const payload = { items: filtered };
      return { result: payload, record: record(name, args, payload) };
    }

    case "listPrimers": {
      const primers = listPrimersForRole(ctx.role, args.topic ? String(args.topic) : undefined);
      const payload = {
        items: primers.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, updated: p.updated })),
      };
      return { result: payload, record: record(name, args, payload) };
    }

    case "getPrimer": {
      const slug = String(args.slug ?? "").trim();
      const primer = slug ? getPrimer(slug, ctx.role) : null;
      const payload = primer
        ? { slug: primer.slug, title: primer.title, updated: primer.updated, body: primer.body }
        : { error: "primer_not_found_or_forbidden", slug };
      return { result: payload, record: record(name, args, payload) };
    }

    case "getCountryEmploymentRules": {
      const canonical = canonicaliseCountry(args.country ? String(args.country) : "");
      if (!canonical) {
        const payload = {
          error: "unknown_country",
          input: args.country ?? null,
          supported: COUNTRY_LIST,
        };
        return { result: payload, record: record(name, args, payload) };
      }
      const jurisdictionInput = args.jurisdiction ? String(args.jurisdiction).trim() : "";
      const jurisdictionRows = jurisdictionInput
        ? DEFAULT_JURISDICTIONS_OVERLAY[canonical]?.[jurisdictionInput] ?? null
        : null;

      // Cross-reference the DB jurisdictions table so answers can quote the
      // exact rows admins see under /country-management too. Best-effort.
      let dbJurisdictionRows: Array<Record<string, any>> = [];
      try {
        const countries = await storage.getCountries().catch(() => []);
        const iso = COUNTRY_CODE_BY_NAME[canonical];
        const match = countries.find(
          (c: any) =>
            (iso && String(c.code ?? "").toUpperCase() === iso) ||
            String(c.name ?? "").toLowerCase() === canonical.toLowerCase(),
        );
        if (match?.id) {
          const rows = await storage.getJurisdictionsByCountry(match.id).catch(() => []);
          dbJurisdictionRows = (rows ?? []).map((r: any) => ({
            stateProvince: r.stateProvince,
            name: r.name,
            calculationType: r.calculationType,
            value: r.value,
            capAmount: r.capAmount,
            thresholdAmount: r.thresholdAmount,
            note: r.note,
          }));
        }
      } catch {
        // ignore
      }

      const payload = {
        country: {
          name: canonical,
          code: COUNTRY_CODE_BY_NAME[canonical] ?? null,
          currency: COUNTRY_CURRENCIES[canonical] ?? null,
        },
        narrative: COUNTRY_EMPLOYMENT_NOTES[canonical] ?? null,
        employerOnCosts: DEFAULT_EMPLOYER_ONCOSTS[canonical] ?? [],
        contractorOnCosts: DEFAULT_CONTRACTOR_ONCOSTS[canonical] ?? [],
        availableJurisdictions: Object.keys(DEFAULT_JURISDICTIONS_OVERLAY[canonical] ?? {}),
        jurisdictionRequested: jurisdictionInput || null,
        jurisdictionOverlayRows: jurisdictionRows,
        dbJurisdictionRows,
        sourceNote:
          "SDP-maintained defaults from /resources (Employment Cost Calculator). Illustrative — validate against current statutory rules.",
      };
      return { result: payload, record: record(name, args, payload) };
    }

    case "estimateEmploymentCost": {
      const country = args.country ? String(args.country) : "";
      const employmentType = args.employmentType === "Contractor" ? "Contractor" : "Employee";
      const salary = Number(args.annualSalary);
      const jurisdiction = args.jurisdiction ? String(args.jurisdiction).trim() : undefined;
      if (!country) {
        const payload = { error: "country_required" };
        return { result: payload, record: record(name, args, payload) };
      }
      if (!Number.isFinite(salary) || salary < 0) {
        const payload = { error: "invalid_salary", input: args.annualSalary ?? null };
        return { result: payload, record: record(name, args, payload) };
      }
      const estimate = estimateEmploymentCostShared({
        country,
        employmentType,
        annualSalary: salary,
        jurisdiction,
      });
      if (!estimate) {
        const payload = { error: "unknown_country", input: country, supported: COUNTRY_LIST };
        return { result: payload, record: record(name, args, payload) };
      }
      const payload = {
        ...estimate,
        sourceNote:
          "SDP calculator math — same numbers appear on /resources when the same inputs are entered.",
      };
      return { result: payload, record: record(name, args, payload) };
    }

    case "summariseNumbers": {
      const rows = Array.isArray(args.rows) ? args.rows : [];
      const sumField = args.sumField ? String(args.sumField) : "amount";
      const groupBy = args.groupBy ? String(args.groupBy) : null;
      const totals: Record<string, { sum: number; count: number }> = {};
      for (const r of rows) {
        if (!r || typeof r !== "object") continue;
        const key = groupBy ? String((r as any)[groupBy] ?? "(unspecified)") : "(all)";
        const raw = (r as any)[sumField];
        const n = Number(raw);
        if (!Number.isFinite(n)) continue;
        if (!totals[key]) totals[key] = { sum: 0, count: 0 };
        totals[key].sum += n;
        totals[key].count += 1;
      }
      const grouped = Object.entries(totals).map(([key, v]) => ({
        key,
        sum: Number(v.sum.toFixed(2)),
        count: v.count,
      }));
      const payload = { groupBy, sumField, groups: grouped, rowsSeen: rows.length };
      return { result: payload, record: record(name, args, payload) };
    }

    default: {
      const payload = { error: `Unknown tool: ${name}` };
      return { result: payload, record: record(name, args, payload) };
    }
  }
}
