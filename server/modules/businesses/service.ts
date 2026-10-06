/**
 * Business profile details (address, country, registration number, tax number).
 *
 *   updateOwnBusinessProfile        — PATCH /api/businesses/me
 *   checkBusinessProfileForContract — the block in POST /api/contracts
 *
 * What counts as "missing" lives in shared/businessProfile.ts so the client's
 * login prompt and reminder bar use the same rules.
 */

import { storage } from "../../storage";
import {
  describeMissingBusinessDetails,
  getMissingBusinessDetails,
  requiresBusinessProfile,
  updateBusinessProfileSchema,
  type BusinessProfileFields,
} from "@shared/businessProfile";
import type { AuthUser, ContractProfileBlock, UpdateProfileResult } from "./types";

export async function updateOwnBusinessProfile(user: AuthUser, body: unknown): Promise<UpdateProfileResult> {
  if (user.userType !== "business_user") {
    return { ok: false, status: 403, message: "Only business users can edit a business profile", code: "BUSINESS_PROFILE_NOT_EDITABLE" };
  }

  // Always the caller's own business, resolved from the database (owner or
  // team member). Never an id from the request, and never the token's
  // `accessibleBusinessIds`, which goes stale when a member is removed.
  const business = await storage.getPrimaryBusinessForUser(user.id);
  if (!business) {
    return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
  }
  // Host clients and the SDP-owned row have no profile to complete.
  if (!requiresBusinessProfile(business)) {
    return { ok: false, status: 403, message: "This business profile cannot be edited here", code: "BUSINESS_PROFILE_NOT_EDITABLE" };
  }

  const parsed = updateBusinessProfileSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, message: parsed.error.errors[0]?.message || "Invalid business details" };
  }

  const country = await storage.getCountryById(parsed.data.registrationCountryId);
  if (!country || country.isActive === false) {
    return { ok: false, status: 400, message: "Select a country from the list", code: "INVALID_COUNTRY" };
  }

  const updated = await storage.updateBusiness(business.id, {
    address: parsed.data.address,
    registrationCountryId: country.id,
    registrationNumber: parsed.data.registrationNumber,
    taxNumber: parsed.data.taxNumber || null,
  });
  if (!updated) {
    return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
  }

  console.log(`[businesses] profile details saved: business=${business.id} user=${user.id}`);
  return { ok: true, data: updated };
}

/**
 * No new contract for a customer business whose profile is incomplete,
 * whoever is creating it (the business itself, or SDP on its behalf).
 * Returns null when creation may go ahead. Host clients and the SDP-owned
 * employer row are never blocked.
 */
export function checkBusinessProfileForContract(
  business: (BusinessProfileFields & { name?: string | null }) | null | undefined,
  callerUserType: string | undefined,
): ContractProfileBlock | null {
  const missing = getMissingBusinessDetails(business);
  if (missing.length === 0) return null;

  const details = describeMissingBusinessDetails(missing, business?.registrationCountryId);
  const message = callerUserType === "business_user"
    ? `Complete your business profile before creating a contract. Missing: ${details}.`
    : `${business?.name || "This business"} has not completed its business profile (missing: ${details}). A contract cannot be created until the business saves these details.`;

  return { status: 409, body: { message, code: "BUSINESS_PROFILE_INCOMPLETE", missing } };
}
