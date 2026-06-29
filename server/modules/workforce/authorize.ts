/**
 * Decide which workers the caller is allowed to enumerate.
 *
 * The result is a tagged `WorkerListScope` — the repository turns this into a
 * `WHERE` clause. Keeping the decision here (and not inline in the controller)
 * means the same scoping rule can be reused by any future caller (CLI, worker
 * job, another service).
 */

import { storage } from "../../storage";
import { effectiveRole } from "../../jwtAuth";
import type { AuthUser, WorkerListScope } from "./types";

export async function resolveWorkerListScope(user: AuthUser): Promise<WorkerListScope> {
  // Dual-role: scope strictly to the ACTIVE role, never a union of both.
  const role = effectiveRole(user);

  if (role === "sdp_internal") {
    return { kind: "all" };
  }

  if (role === "worker") {
    const worker = await storage.getWorkerByUserId(user.id);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return { kind: "self", workerId: worker.id };
  }

  if (role === "business_user") {
    const business = await storage.getPrimaryBusinessForUser(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    // A business may also be a host client — include workers placed at them
    // via contracts.customerBusinessId. The OR clause is harmless when the
    // business has no host-client contracts.
    return { kind: "own_business_or_host_client", businessId: business.id };
  }

  return { kind: "denied", status: 403, message: "Not authorized" };
}
