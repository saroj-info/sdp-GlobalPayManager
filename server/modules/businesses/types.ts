/**
 * Internal types for the businesses module (business profile details).
 */

import type { Business } from "@shared/schema";
import type { MissingBusinessDetail } from "@shared/businessProfile";

export interface AuthUser {
  id: string;
  userType: string; // the active (effective) role
}

export type UpdateProfileResult =
  | { ok: true; data: Business }
  | { ok: false; status: number; message: string; code?: string };

export interface ContractProfileBlock {
  status: 409;
  body: {
    message: string;
    code: "BUSINESS_PROFILE_INCOMPLETE";
    missing: MissingBusinessDetail[];
  };
}
