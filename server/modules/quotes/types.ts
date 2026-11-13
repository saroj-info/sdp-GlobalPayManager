/**
 * Internal types for the quotes module. Wire shapes live in shared/quotes.ts.
 */
import type { PublicQuote, QuoteResponseAction, QuoteStatus } from "@shared/quotes";

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

/** `emailService.sendQuoteEmail`: the quote PDF with Accept / Reject links. */
export interface QuoteEmailArgs {
  to: string;
  message: string;
  quote: PublicQuote;
  countryName: string;
  pdf: Buffer;
  acceptUrl: string;
  rejectUrl: string;
  reviewUrl: string;
  expiresAt: Date;
}

/** `emailService.sendQuoteResponseEmail`: tells the SDP sender what the client did. */
export interface QuoteResponseEmailArgs {
  to: string;
  kind: "decision" | "feedback";
  quote: PublicQuote;
  respondedBy: string;
  action: QuoteResponseAction;
  note?: string | null;
  feedback?: string | null;
  at: Date;
  quoteUrl: string;
}
