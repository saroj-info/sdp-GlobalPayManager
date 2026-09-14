/**
 * Scope-resolver for the dashboard summary. Decides which slice of the
 * platform the caller's dashboard aggregates over; the repository turns this
 * into WHERE clauses.
 */

import { storage } from "../../storage";
import { effectiveRole } from "../../jwtAuth";
import type { AuthUser, DashboardScope } from "./types";

export async function resolveDashboardScope(user: AuthUser): Promise<DashboardScope> {
  // Dual-role: scope strictly to the ACTIVE role, never a union of both.
  const role = effectiveRole(user);

  if (role === "sdp_internal") {
    // v1: all sdpRoles see the global view, consistent with the contracts /
    // timesheets / workforce list modules. Follow-up: thread sdp_agent
    // accessibleCountries into the repository where-clauses.
    return { kind: "sdp" };
  }

  if (role === "worker") {
    const worker = await storage.getWorkerByUserId(user.id);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return {
      kind: "worker",
      workerId: worker.id,
      // third_party_worker rows have no login; anything not an employee gets
      // the contractor-flavoured dashboard (invoices instead of payslips).
      workerType: worker.workerType === "employee" ? "employee" : "contractor",
      firstName: worker.firstName,
    };
  }

  if (role === "business_user") {
    const business = await storage.getPrimaryBusinessForUser(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "business", businessId: business.id, businessName: business.name };
  }

  // third_party_business (static client dashboard, no data endpoint) and
  // anything unknown.
  return { kind: "denied", status: 403, message: "Not authorized" };
}
