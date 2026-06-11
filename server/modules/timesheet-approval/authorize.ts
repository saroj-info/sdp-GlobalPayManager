/**
 * Authorization for timesheet status updates.
 *
 * Enforces the contract's `timesheetApproverRole` (sdp | business | host_client).
 * Falls back to the legacy "any of {SDP, employing business, host client}" rule when
 * no role is set, so contracts created before the field existed keep working.
 */

import { storage } from "../../storage";
import { effectiveRole } from "../../jwtAuth";
import type { AuthUser, AuthorizeResult } from "./types";

const ROLE_LABELS: Record<string, string> = {
  sdp: "SDP",
  business: "Employing Business",
  host_client: "Host Client",
};

function deny(role: string | null): AuthorizeResult {
  return {
    allowed: false,
    status: 403,
    message: role
      ? `Only ${ROLE_LABELS[role] || role} can approve this timesheet`
      : "Unauthorized to update this timesheet status",
  };
}

export async function authorizeStatusUpdate(input: {
  contract: any;
  user: AuthUser;
}): Promise<AuthorizeResult> {
  const { contract, user } = input;

  // Dual-role: authorize strictly as the ACTIVE role.
  const role = effectiveRole(user);

  if (role === "worker") {
    return { allowed: false, status: 403, message: "Workers cannot approve timesheets" };
  }

  const approverRole: string | null = contract.timesheetApproverRole || null;

  if (role === "sdp_internal") {
    if (approverRole && approverRole !== "sdp") return deny(approverRole);
    return { allowed: true };
  }

  if (role === "business_user") {
    const business = await storage.getBusinessByOwnerId(user.id);
    if (!business) return { allowed: false, status: 404, message: "Business not found" };

    const isEmployingBusiness = contract.businessId === business.id;
    const isHostClient = contract.customerBusinessId === business.id;

    if (!approverRole) {
      // Legacy rule: either side may approve.
      return isEmployingBusiness || isHostClient ? { allowed: true } : deny(approverRole);
    }
    if (approverRole === "business" && !isEmployingBusiness) return deny(approverRole);
    if (approverRole === "host_client" && !isHostClient) return deny(approverRole);
    if (approverRole === "sdp") return deny(approverRole);
    return { allowed: true };
  }

  return { allowed: false, status: 403, message: "Not authorized" };
}
