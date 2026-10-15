/**
 * Business profile details (address, country, registration number, tax
 * number) and the business logo.
 *
 *   updateBusinessProfile           — PATCH /api/businesses/me, PATCH /api/businesses/:id/profile
 *   setBusinessLogo / removeBusinessLogo — PUT / DELETE /api/businesses/:id/logo
 *   getBusinessLogo                 — GET /api/businesses/:id/logo (public)
 *   resolveAuthBusinessContext      — the `business` / `employerBusiness` on GET /api/auth/user
 *   checkBusinessProfileForContract — the block in POST /api/contracts
 *
 * `createBusinessesService(deps)` takes the storage calls as a dependency so
 * the logic runs without a database; `businessesService` is the wired
 * singleton. What counts as "missing" lives in shared/businessProfile.ts so
 * the client's login prompt and reminder bar use the same rules.
 */

import { createHash } from "node:crypto";
import { storage } from "../../storage";
import {
  describeMissingBusinessDetails,
  getMissingBusinessDetails,
  updateBusinessProfileSchema,
  type BusinessProfileFields,
} from "@shared/businessProfile";
import { BUSINESS_LOGO_MAX_BYTES, buildBusinessLogoUrl, detectImageType } from "@shared/businessLogo";
import type { Business, BusinessLogo } from "@shared/schema";
import { resolveEditableBusiness } from "./authorize";
import { repository } from "./repository";
import type { AuthBusinessContext, AuthUser, BusinessesDeps, BusinessTarget, ContractProfileBlock, Result, UpdateProfileResult } from "./types";

export function createBusinessesService(deps: BusinessesDeps) {
  async function updateBusinessProfile(user: AuthUser, target: BusinessTarget, body: unknown): Promise<UpdateProfileResult> {
    const auth = await resolveEditableBusiness(user, target, deps);
    if (!auth.ok) return auth;
    const business = auth.business;

    const parsed = updateBusinessProfileSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, status: 400, message: parsed.error.errors[0]?.message || "Invalid business details" };
    }

    const country = await deps.getCountryById(parsed.data.registrationCountryId);
    if (!country || country.isActive === false) {
      return { ok: false, status: 400, message: "Select a country from the list", code: "INVALID_COUNTRY" };
    }

    const updated = await deps.updateBusiness(business.id, {
      address: parsed.data.address,
      registrationCountryId: country.id,
      registrationNumber: parsed.data.registrationNumber,
      taxNumber: parsed.data.taxNumber || null,
    });
    if (!updated) {
      return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
    }

    console.log(`[businesses] profile details saved: business=${business.id} user=${user.id} role=${user.userType}`);
    return { ok: true, data: updated };
  }

  /**
   * Store the uploaded image. The type comes from the bytes, never from the
   * request, because the stored content type is what the public route sends.
   */
  async function setBusinessLogo(user: AuthUser, target: BusinessTarget, bytes: Buffer): Promise<Result<Business>> {
    const auth = await resolveEditableBusiness(user, target, deps);
    if (!auth.ok) return auth;
    const business = auth.business;

    if (!bytes || bytes.length === 0) {
      return { ok: false, status: 400, message: "Choose an image file", code: "LOGO_EMPTY" };
    }
    if (bytes.length > BUSINESS_LOGO_MAX_BYTES) {
      return { ok: false, status: 413, message: "The logo must be 1 MB or smaller", code: "LOGO_TOO_LARGE" };
    }
    const contentType = detectImageType(bytes);
    if (!contentType) {
      return { ok: false, status: 415, message: "The logo must be a PNG, JPEG or WebP image", code: "LOGO_INVALID_TYPE" };
    }

    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await deps.upsertBusinessLogo({
      businessId: business.id,
      contentType,
      byteSize: bytes.length,
      sha256,
      data: bytes.toString("base64"),
      uploadedByUserId: user.id,
    });
    const updated = await deps.updateBusiness(business.id, { logoUrl: buildBusinessLogoUrl(business.id, sha256) });
    if (!updated) {
      return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
    }

    console.log(`[businesses] logo saved: business=${business.id} user=${user.id} bytes=${bytes.length} type=${contentType}`);
    return { ok: true, data: updated };
  }

  /** Idempotent: removing a logo that is not there still succeeds. */
  async function removeBusinessLogo(user: AuthUser, target: BusinessTarget): Promise<Result<Business>> {
    const auth = await resolveEditableBusiness(user, target, deps);
    if (!auth.ok) return auth;
    const business = auth.business;

    await deps.deleteBusinessLogo(business.id);
    const updated = await deps.updateBusiness(business.id, { logoUrl: null });
    if (!updated) {
      return { ok: false, status: 404, message: "Business not found", code: "BUSINESS_NOT_FOUND" };
    }

    console.log(`[businesses] logo removed: business=${business.id} user=${user.id}`);
    return { ok: true, data: updated };
  }

  /** The stored image, for the public route. No authorization: logos are public. */
  async function getBusinessLogo(businessId: string): Promise<BusinessLogo | undefined> {
    return deps.getBusinessLogo(businessId);
  }

  /**
   * What `GET /api/auth/user` adds beside the token fields. `business` keeps
   * its meaning (the business user's own row); a worker gets a slim
   * `employerBusiness` so the sidebar can show the employer's logo without
   * shipping another whole business row to workers.
   */
  async function resolveAuthBusinessContext(user: Pick<AuthUser, "id" | "userType">): Promise<AuthBusinessContext> {
    const ctx: AuthBusinessContext = { business: null, employerBusiness: null };
    if (!user.id) return ctx;
    try {
      if (user.userType === "business_user") {
        ctx.business = (await deps.getPrimaryBusinessForUser(user.id)) ?? null;
      } else if (user.userType === "worker") {
        const worker = await deps.getWorkerByUserId(user.id);
        const employer = worker?.businessId ? await deps.getBusinessById(worker.businessId) : undefined;
        if (employer) {
          ctx.employerBusiness = { id: employer.id, name: employer.name, logoUrl: employer.logoUrl ?? null };
        }
      }
    } catch (error: any) {
      console.error(`[businesses] auth context lookup failed: user=${user.id} ${error?.message ?? String(error)}`);
    }
    return ctx;
  }

  return { updateBusinessProfile, setBusinessLogo, removeBusinessLogo, getBusinessLogo, resolveAuthBusinessContext };
}

export const businessesService = createBusinessesService({
  getBusinessById: (id) => storage.getBusinessById(id),
  getPrimaryBusinessForUser: (userId) => storage.getPrimaryBusinessForUser(userId),
  getCountryById: (id) => storage.getCountryById(id),
  updateBusiness: (id, updates) => storage.updateBusiness(id, updates),
  getWorkerByUserId: (userId) => storage.getWorkerByUserId(userId),
  getBusinessLogo: (businessId) => repository.getBusinessLogo(businessId),
  upsertBusinessLogo: (row) => repository.upsertBusinessLogo(row),
  deleteBusinessLogo: (businessId) => repository.deleteBusinessLogo(businessId),
});

/** Kept for callers of the original name: the business user's own business. */
export function updateOwnBusinessProfile(user: AuthUser, body: unknown): Promise<UpdateProfileResult> {
  return businessesService.updateBusinessProfile(user, "me", body);
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
    : `${business?.name || "This business"} has not completed its business profile (missing: ${details}). A contract cannot be created until these details are saved. Enter them on the Businesses page (Edit details) or ask the business to complete its profile.`;

  return { status: 409, body: { message, code: "BUSINESS_PROFILE_INCOMPLETE", missing } };
}
