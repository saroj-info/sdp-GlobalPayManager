/**
 * Types for the contract lifecycle module (renewal, extension, host client
 * confirmation). The service returns tagged results like the other modules.
 */
import type { Contract } from "@shared/schema";

export interface AuthUser {
  id: string;
  userType: string;
  sdpRole?: string | null;
  accessibleBusinessIds?: string[] | null;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string; extra?: Record<string, unknown> };

export interface RenewResult {
  contract: Contract;
  /** True when a template was present and the document was generated. */
  documentRegenerated: boolean;
  /** Non-fatal notes for the client, e.g. `TEMPLATE_MISSING`. */
  warnings: string[];
}

export interface ExtendResult {
  contract: Contract;
  /** YYYY-MM-DD of the end date before the extension. */
  previousEndDate: string | null;
  documentRegenerated: boolean;
}

export interface ConfirmationResult {
  contract: Contract;
}
