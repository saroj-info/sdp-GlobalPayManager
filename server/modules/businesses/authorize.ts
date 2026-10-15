/**
 * Who may edit a business's details and logo, and which business that is.
 *
 *   business_user   → their own primary business ("me" or its id)
 *   sdp_super_admin / sdp_admin → any customer business they can access
 *   everyone else   → 403
 *
 * Host clients (`isRegistered = false`) and the SDP-owned employer row have
 * no profile and no logo, so they are refused for every caller.
 */

import type { Business } from "@shared/schema";
import { requiresBusinessProfile } from "@shared/businessProfile";
import { canAccessBusiness } from "../../jwtAuth";
import type { AuthUser, BusinessesDeps, BusinessTarget } from "./types";

export const BUSINESS_EDIT_SDP_ROLES = ["sdp_super_admin", "sdp_admin"];

export type EditableBusinessResult =
  | { ok: true; business: Business }
  | { ok: false; status: number; message: string; code: string };

export function canEditBusinesses(user: Pick<AuthUser, "userType" | "sdpRole">): boolean {
  return user.userType === "sdp_internal" && !!user.sdpRole && BUSINESS_EDIT_SDP_ROLES.includes(user.sdpRole);
}

export async function resolveEditableBusiness(
  user: AuthUser,
  target: BusinessTarget,
  deps: Pick<BusinessesDeps, "getBusinessById" | "getPrimaryBusinessForUser">,
): Promise<EditableBusinessResult> {
  let business: Business | undefined;

  if (user.userType === "business_user") {
    // Always the caller's own business, resolved from the database (owner or
    // team member). Never an id from the request, and never the token's
    // `accessibleBusinessIds`, which goes stale when a member is removed.
    business = await deps.getPrimaryBusinessForUser(user.id);
    if (!business) {
      return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
    }
    if (target !== "me" && target !== business.id) {
      return { ok: false, status: 403, message: "You can only edit your own business", code: "BUSINESS_NOT_ACCESSIBLE" };
    }
  } else if (canEditBusinesses(user)) {
    if (target === "me") {
      return { ok: false, status: 400, message: "Choose a business to edit", code: "BUSINESS_ID_REQUIRED" };
    }
    business = await deps.getBusinessById(target);
    if (!business) {
      return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
    }
    if (!canAccessBusiness(user, business.id)) {
      return { ok: false, status: 403, message: "You do not have access to this business", code: "BUSINESS_NOT_ACCESSIBLE" };
    }
  } else {
    return { ok: false, status: 403, message: "Not authorized to edit business details", code: "NOT_AUTHORIZED" };
  }

  // Host clients and the SDP-owned row have no profile to complete.
  if (!requiresBusinessProfile(business)) {
    return { ok: false, status: 403, message: "This business profile cannot be edited here", code: "BUSINESS_PROFILE_NOT_EDITABLE" };
  }

  return { ok: true, business };
}
