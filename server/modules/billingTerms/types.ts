import type { BillingTermsTriggerMode, BillingTermsAcceptanceInput, BillingTermsPlaceholders } from "@shared/billingTerms";
import type { BillingTermsVersion, ContractBillingTermsAcceptance } from "@shared/schema";

export interface AuthUser {
  id: string;
  userType: string;
  sdpRole?: string | null;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string; extra?: Record<string, unknown> };

export interface RenderedTerms {
  versionId: string;
  versionNumber: number;
  title: string;
  text: string;
  hash: string;
  publishedAt: string | null;
  placeholders: BillingTermsPlaceholders;
}

/** A validated acceptance payload plus the published version it refers to. */
export interface ValidatedAcceptance {
  input: BillingTermsAcceptanceInput;
  version: BillingTermsVersion;
}

export interface AcceptanceContext {
  contractId: string;
  businessId: string;
  countryId: string | null;
  billingMode: BillingTermsTriggerMode;
  recordedByUserId: string;
  acceptedByUserId: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export type AcceptanceRow = ContractBillingTermsAcceptance & {
  acceptedByName: string | null;
  recordedByName: string | null;
};
