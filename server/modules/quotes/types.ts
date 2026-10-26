/**
 * Internal types for the quotes module. Wire shapes live in shared/quotes.ts.
 */
import type { QuoteStatus } from "@shared/quotes";

export interface AuthUser {
  id: string;
  userType: string;
  sdpRole?: string | null;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string; extra?: Record<string, unknown> };

export type QuoteSortBy = "updated" | "number" | "country";

export interface QuoteListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: QuoteStatus;
  countryId?: string;
  sortBy: QuoteSortBy;
}
