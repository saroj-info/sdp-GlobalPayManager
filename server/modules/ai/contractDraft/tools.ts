/**
 * Server-side executors for the tools the model can call during contract draft.
 *
 * Every executor runs under the caller's identity (AuthUser) — the tools are
 * read-only wrappers over storage methods and existing services. There is
 * DELIBERATELY no write tool here; the model cannot mutate.
 *
 * The `TOOL_DEFINITIONS` array is what we hand to OpenAI; the `runTool`
 * function dispatches a chosen tool by name.
 */

import { createHash } from "crypto";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { storage } from "../../../storage";
import { listWorkers } from "../../workforce";
import type { AuthUser, CallerRole, ToolCallRecord } from "./types";

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "searchWorkers",
      description:
        "Search workers by name within a specific business. Business users: businessId is derived from your JWT — you MAY omit it. SDP internal callers: businessId is REQUIRED (get it from searchBusinesses first). If two or more workers share a name, the tool returns { ambiguous: true } and you MUST ask the user for the worker's email — do not pick one.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "Worker name fragment" },
          businessId: { type: "string", description: "Business id to search within. Required for SDP internal callers." },
          limit: { type: "number", description: "1-20, defaults to 5" },
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
        "Search businesses the caller can see. Set isHostClient=true to search host clients (unregistered billing-only businesses); false for real registered businesses.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "Name fragment" },
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
      name: "getCountries",
      description:
        "List countries the platform supports with their currencies. Use to resolve a country name/code to an id.",
      parameters: { type: "object", additionalProperties: false, properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getContractTemplates",
      description:
        "List contract templates available for a country + optional employment type.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          countryId: { type: "string" },
          employmentType: { type: "string" },
        },
        required: ["countryId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPayItems",
      description:
        "List reusable pay-item catalog entries (allowances, deductions, bonuses) for a country. Filter to build additional remuneration lines.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          countryId: { type: "string" },
        },
        required: ["countryId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchRoleTitles",
      description:
        "Look up an existing role title by name. Returns candidates from the caller's business plus global role titles. Use BEFORE setting roleTitleId. If no candidate matches confidently, leave roleTitleId unset and put the role name in customRoleTitle — the server upserts the row on Create Contract.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "Role name fragment, e.g. 'plumber', 'senior react'" },
          limit: { type: "number", description: "1-20, defaults to 5" },
        },
        required: ["query"],
      },
    },
  },
];

export interface ToolContext {
  user: AuthUser;
  role: CallerRole;
  businessId?: string; // set for business_user callers; unset for sdp_internal
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

export async function runTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  const args = (rawArgs && typeof rawArgs === "object") ? rawArgs as Record<string, any> : {};

  switch (name) {
    case "searchWorkers": {
      const q = String(args.query ?? "").trim();
      const limit = Math.min(20, Math.max(5, Number(args.limit) || 5));

      // Effective businessId — the ONLY set of workers this call may return.
      //  - business_user: derived from JWT via ctx.businessId; the model's
      //    businessId arg (if any) is ignored to prevent cross-tenant search.
      //  - sdp_internal: taken from the model's arg. Missing → tell the model
      //    to call searchBusinesses first.
      let effectiveBusinessId: string | undefined;
      if (ctx.role === "business_user") {
        effectiveBusinessId = ctx.businessId;
      } else {
        effectiveBusinessId = args.businessId ? String(args.businessId) : undefined;
      }

      if (!effectiveBusinessId) {
        const payload = {
          error: "business_required",
          hint: "Call searchBusinesses first with the business name from the prompt, then pass its id here as businessId.",
        };
        return { result: payload, record: record("searchWorkers", args, payload) };
      }

      const result = await listWorkers(
        { id: ctx.user.id, userType: ctx.user.userType, activeRole: ctx.user.activeRole, availableRoles: ctx.user.availableRoles },
        {
          page: 1,
          pageSize: limit,
          search: q,
          sortBy: "name",
        },
      );

      const raw = result.ok ? result.data.items : [];
      // Post-filter to the effective business (workforce repo only honours
      // query.businessId for scope='all', so we enforce it here for all scopes).
      const inBusiness = raw.filter((w: any) => w.businessId === effectiveBusinessId);

      // Duplicate-name detection. If two rows share a normalised full name,
      // return ambiguous and NO ids — the model must ask for the email.
      const nameOf = (w: any) => `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim().toLowerCase();
      const nameCounts = new Map<string, number>();
      for (const w of inBusiness) {
        const n = nameOf(w);
        if (!n) continue;
        nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
      }
      const duplicateName = Array.from(nameCounts.entries()).find(([, c]) => c > 1)?.[0];
      if (duplicateName) {
        const payload = {
          ambiguous: true,
          duplicateName,
          count: nameCounts.get(duplicateName),
          hint: "ask_for_email",
        };
        return { result: payload, record: record("searchWorkers", args, payload) };
      }

      const items = inBusiness.map((w: any) => ({
        id: w.id,
        name: `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim(),
        email: w.email,
        workerType: w.workerType,
        countryCode: w.country?.code,
        businessName: w.business?.name,
      }));

      const payload = { items, total: items.length };
      return { result: payload, record: record("searchWorkers", args, payload) };
    }

    case "searchBusinesses": {
      const q = String(args.query ?? "").trim().toLowerCase();
      const isHostClient = args.isHostClient === true;
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));

      let candidates: any[] = [];
      if (ctx.user.userType === "sdp_internal") {
        candidates = await storage.getBusinesses();
      } else if (ctx.businessId) {
        if (isHostClient) {
          candidates = await storage.getHostClientsForBusiness(ctx.businessId);
        } else {
          candidates = await storage.getBusinessesForUser(ctx.user.id);
        }
      }

      const filtered = candidates
        .filter(b => isHostClient ? b.isRegistered === false : b.isRegistered !== false)
        .filter(b => !q || (b.name ?? "").toLowerCase().includes(q))
        .slice(0, limit)
        .map(b => ({ id: b.id, name: b.name, isRegistered: b.isRegistered !== false }));

      const payload = { items: filtered };
      return { result: payload, record: record("searchBusinesses", args, payload) };
    }

    case "getCountries": {
      const countries = await storage.getCountries();
      const items = countries
        .filter(c => c.isActive !== false)
        .map(c => ({ id: c.id, name: c.name, code: c.code, currency: c.currency }));
      const payload = { items };
      return { result: payload, record: record("getCountries", args, payload) };
    }

    case "getContractTemplates": {
      const countryId = String(args.countryId ?? "");
      const employmentType = args.employmentType ? String(args.employmentType) : undefined;
      if (!countryId) {
        const payload = { items: [], error: "countryId required" };
        return { result: payload, record: record("getContractTemplates", args, payload) };
      }
      const rows = await storage.getContractTemplatesByCountry(countryId, employmentType);
      const items = rows.map(t => ({
        id: t.id,
        name: t.name,
        employmentType: t.employmentType,
        countryCode: t.country?.code,
      }));
      const payload = { items };
      return { result: payload, record: record("getContractTemplates", args, payload) };
    }

    case "getPayItems": {
      const countryId = args.countryId ? String(args.countryId) : null;
      const items = await storage.getPayItemsForBusiness(ctx.businessId ?? null, countryId);
      const payload = {
        items: items.filter(i => i.isActive !== false).map(i => ({
          id: i.id,
          name: i.name,
          type: i.type,
          defaultFrequency: i.defaultFrequency,
        })),
      };
      return { result: payload, record: record("getPayItems", args, payload) };
    }

    case "searchRoleTitles": {
      const q = String(args.query ?? "").trim().toLowerCase();
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));

      // Rows the caller may reference: their business + globals.
      // SDP internal has no default business; they see all rows and the model
      // must decide which fits (in practice, this is a lookup by name).
      let rows: any[] = [];
      if (ctx.role === "sdp_internal") {
        rows = await storage.getAllRoleTitles();
      } else {
        const [businessRows, globalRows] = await Promise.all([
          ctx.businessId ? storage.getRoleTitlesByBusiness(ctx.businessId) : Promise.resolve([]),
          storage.getGlobalRoleTitles(),
        ]);
        rows = [...businessRows, ...globalRows];
      }

      const matches = rows
        .filter(r => !q || (r.title ?? "").toLowerCase().includes(q))
        .slice(0, limit)
        .map(r => ({
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          businessId: r.businessId ?? null,
        }));

      const payload = { items: matches };
      return { result: payload, record: record("searchRoleTitles", args, payload) };
    }

    default: {
      const payload = { error: `Unknown tool: ${name}` };
      return { result: payload, record: record(name, args, payload) };
    }
  }
}
