/**
 * Quotes are an SDP sales tool: every SDP role may create, edit, view and
 * delete them; the fee schedule is edited by super admins and admins. The
 * route guards (`requireSdpRole`) enforce this; these helpers exist for the
 * service so it never relies on the HTTP layer alone.
 */
import type { AuthUser } from "./types";

const SDP_ROLES = ["sdp_super_admin", "sdp_admin", "sdp_agent"];
const ADMIN_ROLES = ["sdp_super_admin", "sdp_admin"];

export function isSdpUser(user: AuthUser | null | undefined): boolean {
  return !!user && user.userType === "sdp_internal" && !!user.sdpRole && SDP_ROLES.includes(user.sdpRole);
}

export function canEditFeeDefaults(user: AuthUser | null | undefined): boolean {
  return !!user && user.userType === "sdp_internal" && !!user.sdpRole && ADMIN_ROLES.includes(user.sdpRole);
}
