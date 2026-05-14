/** Resolves which timesheets the caller may enumerate. */

import { storage } from "../../storage";
import type { AuthUser, TimesheetListScope } from "./types";

export async function resolveTimesheetListScope(user: AuthUser): Promise<TimesheetListScope> {
  if (user.userType === "sdp_internal") return { kind: "all" };

  if (user.userType === "worker") {
    const worker = await storage.getWorkerByUserId(user.id);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return { kind: "by_worker", workerId: worker.id };
  }

  if (user.userType === "business_user") {
    const business = await storage.getBusinessByOwnerId(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "business", businessId: business.id };
  }

  return { kind: "denied", status: 403, message: "Not authorized" };
}
