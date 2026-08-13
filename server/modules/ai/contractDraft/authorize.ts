/**
 * Contract-draft scope resolver.
 *
 * The endpoint is authenticated (any signed-in user), so scope here is only
 * about which businessId to seed the tenant-context slice from. SDP internal
 * users see all data through their tool calls (governed by each list
 * endpoint's own scope), so we pass no businessId. Business users get their
 * primary business so the AI sees "your workers, your host clients".
 */

import { storage } from "../../../storage";
import { effectiveRole } from "../../../jwtAuth";
import type { AuthUser, DraftScope } from "./types";

export async function resolveDraftScope(user: AuthUser): Promise<DraftScope> {
  const role = effectiveRole(user);

  if (role === "sdp_internal") {
    return { kind: "allowed", role: "sdp_internal" };
  }

  if (role === "business_user") {
    const business = await storage.getPrimaryBusinessForUser(user.id);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "allowed", role: "business_user", businessId: business.id };
  }

  // Workers and third-party businesses don't create contracts today.
  return { kind: "denied", status: 403, message: "Not authorized to draft contracts" };
}
