/** Resolves which timesheets the caller may enumerate, and who may act on one timesheet. */

import { storage } from "../../storage";
import { effectiveRole } from "../../jwtAuth";
import type { AuthUser, TimesheetListScope } from "./types";

export async function resolveTimesheetListScope(user: AuthUser): Promise<TimesheetListScope> {
  // Dual-role: scope strictly to the ACTIVE role, never a union of both.
  const role = effectiveRole(user);

  if (role === "sdp_internal") return { kind: "all" };

  if (role === "worker") {
    const worker = await storage.getWorkerByUserId(user.id);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return { kind: "by_worker", workerId: worker.id };
  }

  if (role === "business_user") {
    const business = await storage.getPrimaryBusinessForUser(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "business", businessId: business.id };
  }

  return { kind: "denied", status: 403, message: "Not authorized" };
}

// ---- Per-timesheet access (edit, submit, delete, expenses) -------------------

/** Statuses a timesheet can still be changed in and submitted from. */
export const EDITABLE_TIMESHEET_STATUSES = ['draft', 'rejected'] as const;

export function isTimesheetEditable(status: string | null | undefined): boolean {
  return (EDITABLE_TIMESHEET_STATUSES as readonly string[]).includes(status ?? '');
}

export type TimesheetAccess = 'manage' | 'read';
export type TimesheetAccessResult = { allowed: true } | { allowed: false; status: number; message: string };

/**
 * One guard for the per-timesheet routes. `manage`: the worker it belongs to,
 * the employing business (primary business or an accessible one), or SDP.
 * `read` additionally lets the contract's host client in (the provided-workers
 * view). Never looks at the status; callers check `isTimesheetEditable`.
 */
export async function resolveTimesheetAccess(
  user: AuthUser & { accessibleBusinessIds?: string[] | null },
  timesheet: { workerId: string; businessId: string; contractId: string },
  access: TimesheetAccess,
): Promise<TimesheetAccessResult> {
  const role = effectiveRole(user);
  if (role === 'sdp_internal') return { allowed: true };

  if (role === 'worker') {
    const worker = await storage.getWorkerByUserId(user.id);
    if (worker && worker.id === timesheet.workerId) return { allowed: true };
    return { allowed: false, status: 403, message: "You can only change your own timesheets." };
  }

  if (role === 'business_user') {
    const business = await storage.getPrimaryBusinessForUser(user.id);
    const accessible = user.accessibleBusinessIds ?? [];
    if ((business && business.id === timesheet.businessId) || accessible.includes(timesheet.businessId)) {
      return { allowed: true };
    }
    if (access === 'read' && business) {
      const contract = await storage.getContractById(timesheet.contractId);
      if (contract?.customerBusinessId === business.id) return { allowed: true };
    }
    return { allowed: false, status: 403, message: "This timesheet belongs to another business." };
  }

  return { allowed: false, status: 403, message: "Your account cannot change timesheets." };
}
