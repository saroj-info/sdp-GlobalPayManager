/**
 * Contract-draft scope resolver.
 *
 * The endpoint is authenticated (any signed-in user), so scope here is only
 * about which businessId to seed the tenant-context slice from.
 *
 * Business users are pinned to their primary business.
 *
 * SDP-internal users historically had no businessId (they see all data through
 * their tool calls, each governed by that endpoint's own scope). That meant
 * `loadTenantContext` returned no host clients and no recent-contracts hints
 * for admins even after the admin picked a business via the composer's `&`
 * mention. `requestedBusinessId` (from `currentDraft.selectedBusinessId`)
 * plumbs that pick through — validated against `accessibleBusinessIds` for
 * country/business-scoped agents; super-admin / admin bypass the check.
 */

import { storage } from "../../../storage";
import { effectiveRole } from "../../../jwtAuth";
import type { AuthUser, DraftScope } from "./types";

export interface ResolveDraftScopeOpts {
  requestedBusinessId?: string;
}

export async function resolveDraftScope(
  user: AuthUser,
  opts: ResolveDraftScopeOpts = {},
): Promise<DraftScope> {
  const role = effectiveRole(user);

  if (role === "sdp_internal") {
    const requested = typeof opts.requestedBusinessId === "string" && opts.requestedBusinessId.trim().length > 0
      ? opts.requestedBusinessId.trim()
      : undefined;
    if (!requested) {
      return { kind: "allowed", role: "sdp_internal" };
    }
    // super-admin / admin can operate across all businesses; other sdp_internal
    // roles must have the business in their access list.
    const bypass = user.sdpRole === "sdp_super_admin" || user.sdpRole === "sdp_admin";
    const accessible = Array.isArray(user.accessibleBusinessIds) ? user.accessibleBusinessIds : [];
    if (!bypass && accessible.length > 0 && !accessible.includes(requested)) {
      return { kind: "denied", status: 403, message: "Selected business is outside your accessible scope" };
    }
    // Cheap existence check so a stale/hallucinated id can't corrupt the
    // tenant primer downstream.
    const biz = await storage.getBusinessById(requested).catch(() => undefined);
    if (!biz) {
      return { kind: "allowed", role: "sdp_internal" };
    }
    return { kind: "allowed", role: "sdp_internal", businessId: requested };
  }

  if (role === "business_user") {
    const business = await storage.getPrimaryBusinessForUser(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "allowed", role: "business_user", businessId: business.id };
  }

  // Workers and third-party businesses don't create contracts today.
  return { kind: "denied", status: 403, message: "Not authorized to draft contracts" };
}
