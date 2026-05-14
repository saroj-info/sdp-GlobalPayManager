/**
 * Scope-resolver for the contracts list. Decides which contracts the caller can
 * enumerate; the repository turns this into a `WHERE` clause.
 */

import { storage } from "../../storage";
import type { AuthUser, ContractListScope } from "./types";

export async function resolveContractListScope(user: AuthUser): Promise<ContractListScope> {
  if (user.userType === "sdp_internal") {
    return { kind: "all" };
  }

  if (user.userType === "worker") {
    const worker = await storage.getWorkerByUserId(user.id);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return { kind: "by_worker", workerId: worker.id };
  }

  if (user.userType === "business_user") {
    const business = await storage.getBusinessByOwnerId(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    // Business sees contracts where it's the employing business OR the host client.
    return { kind: "own_or_host", businessId: business.id };
  }

  return { kind: "denied", status: 403, message: "Not authorized" };
}
