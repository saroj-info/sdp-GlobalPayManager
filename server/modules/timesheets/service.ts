/** Orchestrator: authorize → fetch (paginated + counts) → enrich → tag. */

import { storage } from "../../storage";
import { resolveTimesheetListScope } from "./authorize";
import { fetchTimesheetList } from "./repository";
import type { AuthUser, ListTimesheetsResult, TimesheetListQuery } from "./types";

/**
 * For business users we mark each row as `isProvided` (worker provided to this business
 * by another business — host-client view) so the UI can render them in a separate section.
 */
function tagProvidedFlag(scope: any, items: any[]): any[] {
  if (scope.kind !== "business") return items;
  return items.map(item => {
    const isProvided = item.contract?.customerBusinessId === scope.businessId
      && item.contract?.businessId !== scope.businessId;
    return { ...item, isProvided, providedByBusinessName: isProvided ? item.business?.name : null };
  });
}

/** Attach the contract's approver role + identifying info on each timesheet so the UI
 *  can gate action buttons and label timesheets without follow-up requests. */
async function attachContractMeta(item: any): Promise<any> {
  if (!item.contract) return item;
  const c = item.contract;
  let roleTitleText: string | null = null;
  if (c.roleTitleId) {
    try {
      const rt: any = await storage.getRoleTitle(c.roleTitleId);
      roleTitleText = rt?.title || null;
    } catch {}
  }
  return {
    ...item,
    timesheetApproverRole: c.timesheetApproverRole || null,
    contractEmployingBusinessId: c.businessId || null,
    contractCustomerBusinessId: c.customerBusinessId || null,
    contractName: c.contractName || null,
    contractCustomRoleTitle: c.customRoleTitle || null,
    contractRoleTitleId: c.roleTitleId || null,
    contractRoleTitle: roleTitleText,
    contractStartDate: c.startDate || null,
    contractEndDate: c.endDate || null,
    contractRateType: c.rateType || null,
  };
}

export async function listTimesheets(user: AuthUser, query: TimesheetListQuery): Promise<ListTimesheetsResult> {
  const scope = await resolveTimesheetListScope(user);
  if (scope.kind === "denied") {
    return { ok: false, status: scope.status, message: scope.message };
  }

  const raw = await fetchTimesheetList(scope, query);

  let items = tagProvidedFlag(scope, raw.items);
  items = await Promise.all(items.map(attachContractMeta));

  return {
    ok: true,
    data: {
      items,
      total: raw.total,
      page: query.page,
      pageSize: query.pageSize,
      statusCounts: raw.statusCounts,
    },
  };
}
