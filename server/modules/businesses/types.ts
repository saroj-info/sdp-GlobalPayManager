/**
 * Internal types for the businesses module (business profile details and
 * the business logo).
 */

import type { Business, BusinessLogo, Country, InsertBusinessLogo, Worker } from "@shared/schema";
import type { MissingBusinessDetail } from "@shared/businessProfile";

export interface AuthUser {
  id: string;
  userType: string; // the active (effective) role
  sdpRole?: string | null;
  accessibleBusinessIds?: string[] | null;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string };

export type UpdateProfileResult = Result<Business>;

export interface ContractProfileBlock {
  status: 409;
  body: {
    message: string;
    code: "BUSINESS_PROFILE_INCOMPLETE";
    missing: MissingBusinessDetail[];
  };
}

/** What `GET /api/auth/user` adds to the token payload. */
export interface AuthBusinessContext {
  /** The business user's own business (whole row). `null` for other roles. */
  business: Business | null;
  /** A worker's employer, slim. `null` for other roles or no employer. */
  employerBusiness: { id: string; name: string; logoUrl: string | null } | null;
}

/** The "me" target or a business id from the URL. */
export type BusinessTarget = string;

/** Logo rows, kept behind an interface so the service runs without a DB. */
export interface BusinessLogoRepository {
  getBusinessLogo(businessId: string): Promise<BusinessLogo | undefined>;
  upsertBusinessLogo(row: InsertBusinessLogo): Promise<void>;
  deleteBusinessLogo(businessId: string): Promise<void>;
}

/** Everything the service needs from `storage` and the repository. */
export interface BusinessesDeps extends BusinessLogoRepository {
  getBusinessById(id: string): Promise<Business | undefined>;
  getPrimaryBusinessForUser(userId: string): Promise<Business | undefined>;
  getCountryById(id: string): Promise<Country | undefined>;
  updateBusiness(id: string, updates: Partial<Business>): Promise<Business | undefined>;
  getWorkerByUserId(userId: string): Promise<Worker | undefined>;
}
