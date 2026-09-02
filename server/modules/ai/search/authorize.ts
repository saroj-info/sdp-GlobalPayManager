/**
 * Scope resolver for AI search.
 *
 * Every authenticated user may use the search bar. The scope simply
 * records which role is calling and, for business_user / worker, which
 * businessId / workerId their tool calls should be pinned to. Per-tool
 * tenant enforcement lives in the wrapped list endpoints' authorizers
 * (workforce/contracts/timesheets/…); this resolver only refuses roles
 * the feature is not exposed to.
 */

import { storage } from "../../../storage";
import { effectiveRole } from "../../../jwtAuth";
import type { AuthUser, SearchScope, CallerRole } from "./types";

export async function resolveSearchScope(user: AuthUser): Promise<SearchScope> {
  const role = effectiveRole(user);

  if (role === "sdp_internal") {
    return { kind: "allowed", role: "sdp_internal" };
  }

  if (role === "business_user") {
    const business = await storage.getPrimaryBusinessForUser(user.id).catch(() => undefined);
    if (!business) return { kind: "denied", status: 404, message: "Business not found" };
    return { kind: "allowed", role: "business_user", businessId: business.id };
  }

  if (role === "worker") {
    const worker = await storage.getWorkerByUserId(user.id).catch(() => undefined);
    if (!worker) return { kind: "denied", status: 404, message: "Worker profile not found" };
    return { kind: "allowed", role: "worker", workerId: worker.id, businessId: worker.businessId ?? undefined };
  }

  return { kind: "denied", status: 403, message: "Not authorized to use AI search" };
}

export function callerRoleFromScope(scope: SearchScope): CallerRole {
  if (scope.kind === "denied") return "worker";
  return scope.role;
}
