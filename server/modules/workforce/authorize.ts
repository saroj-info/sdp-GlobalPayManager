/**
 * Decide which workers the caller is allowed to enumerate.
 *
 * The result is a tagged `WorkerListScope` — the repository turns this into a
 * `WHERE` clause. Keeping the decision here (and not inline in the controller)
 * means the same scoping rule can be reused by any future caller (CLI, worker
 * job, another service).
 */

import { storage } from "../../storage";
import type { AuthUser, WorkerListScope } from "./types";

export async function resolveWorkerListScope(user: AuthUser): Promise<WorkerListScope> {
  if (user.userType === "sdp_internal") {
    return { kind: "all" };
  }

  if (user.userType === "worker") {
    const worker = await storage.getWorkerByUserId(user.id);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return { kind: "self", workerId: worker.id };
  }

  if (user.userType === "business_user") {
    const business = await storage.getBusinessByOwnerId(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "own_business", businessId: business.id };
  }

  return { kind: "denied", status: 403, message: "Not authorized" };
}
