/**
 * SDP Billing Terms — shared rules used by the server (enforcement) and the
 * client (UX). A business must accept these terms on every contract where SDP
 * acts as the billing entity. See CLAUDE.md → "SDP Billing Terms".
 */
import { z } from "zod";

export const BILLING_TERMS_TRIGGER_MODES = ['invoice_through_platform', 'auto_invoice'] as const;
export type BillingTermsTriggerMode = typeof BILLING_TERMS_TRIGGER_MODES[number];

/** True when SDP acts as billing entity: customer work plus a triggering mode. */
export function requiresBillingTerms(
  billingMode: string | null | undefined,
  isForClient: boolean | null | undefined,
): billingMode is BillingTermsTriggerMode {
  return isForClient === true && (BILLING_TERMS_TRIGGER_MODES as readonly string[]).includes(billingMode ?? '');
}

/**
 * On an edit, a new acceptance is needed only when the contract moves INTO a
 * triggering mode. Contracts already in such a mode are not re-asked.
 */
export function billingTermsChangeNeedsAcceptance(args: {
  beforeMode: string | null | undefined;
  beforeIsForClient: boolean | null | undefined;
  afterMode: string | null | undefined;
  afterIsForClient: boolean | null | undefined;
}): boolean {
  const before = requiresBillingTerms(args.beforeMode, args.beforeIsForClient);
  const after = requiresBillingTerms(args.afterMode, args.afterIsForClient);
  return after && !before;
}

export interface BillingTermsPlaceholders {
  businessName: string;
  sdpEntityName: string;
  sdpEntityAddress: string;
  countryName: string;
  countryCode: string;
  currency: string;
  today: string;
}

export const BILLING_TERMS_PLACEHOLDERS: Array<{ name: keyof BillingTermsPlaceholders; description: string }> = [
  { name: 'businessName', description: 'Legal name of the business accepting the terms' },
  { name: 'sdpEntityName', description: 'SDP entity acting as billing entity for the contract country' },
  { name: 'sdpEntityAddress', description: 'Registered address of that SDP entity' },
  { name: 'countryName', description: 'Country of the contract' },
  { name: 'countryCode', description: 'Two-letter country code' },
  { name: 'currency', description: 'Currency of the contract country' },
  { name: 'today', description: 'Date the terms are shown (YYYY-MM-DD)' },
];

export const SAMPLE_BILLING_TERMS_PLACEHOLDERS: BillingTermsPlaceholders = {
  businessName: 'Acme Pty Ltd',
  sdpEntityName: 'SDP Global Pay Australia Pty Ltd',
  sdpEntityAddress: '1 Example Street, Sydney NSW 2000, Australia',
  countryName: 'Australia',
  countryCode: 'AU',
  currency: 'AUD',
  today: '2026-01-01',
};

/** Replaces {{key}} tokens. Unknown keys are left as they are. */
export function renderBillingTerms(template: string, values: Partial<BillingTermsPlaceholders>): string {
  return template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, key: string) => {
    const v = (values as Record<string, string | undefined>)[key];
    return typeof v === 'string' ? v : match;
  });
}

/**
 * True when the contract's mode needs the terms and no acceptance is on file.
 * Acceptance is optional at create/edit time (the user may skip), so this is
 * the "pending" reminder rule shared by the wizard and contract details.
 */
export function billingTermsIsPending(
  billingMode: string | null | undefined,
  isForClient: boolean | null | undefined,
  acceptance: unknown,
): boolean {
  return requiresBillingTerms(billingMode, isForClient) && !acceptance;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const inAppAcceptanceSchema = z.object({
  method: z.literal('in_app'),
  termsVersionId: z.string().min(1),
  accepted: z.literal(true),
  /** Optional: the business user signed a printed copy and uploaded it. */
  signedDocumentPath: z.union([z.string().startsWith('/objects/'), z.literal('')]).optional(),
});

export const offlineAcceptanceSchema = z.object({
  method: z.literal('sdp_offline'),
  termsVersionId: z.string().min(1),
  confirmed: z.literal(true),
  signerName: z.string().trim().min(1, "Signer name is required").max(200),
  signerEmail: z.union([z.string().trim().email("Enter a valid email"), z.literal('')]).optional(),
  acceptedDate: z.string().regex(isoDate, "Accepted date is required").refine(
    (d) => d <= new Date().toISOString().slice(0, 10),
    "Accepted date cannot be in the future",
  ),
  signedDocumentPath: z.union([z.string().startsWith('/objects/'), z.literal('')]).optional(),
});

export const billingTermsAcceptanceSchema = z.discriminatedUnion('method', [inAppAcceptanceSchema, offlineAcceptanceSchema]);
export type BillingTermsAcceptanceInput = z.infer<typeof billingTermsAcceptanceSchema>;

/** Wire shape of GET /api/billing-terms/current. */
export interface RenderedBillingTerms {
  versionId: string;
  versionNumber: number;
  title: string;
  text: string;
  publishedAt: string | null;
}

/** Wire shape of GET /api/contracts/:id/billing-terms-acceptance. */
export interface BillingTermsAcceptanceView {
  id: string;
  termsVersionId: string;
  termsVersionNumber: number;
  termsText: string;
  billingMode: string;
  method: 'in_app' | 'sdp_offline';
  acceptedAt: string;
  acceptedByName: string | null;
  recordedByName: string | null;
  signerName: string | null;
  signerEmail: string | null;
  hasSignedDocument: boolean;
  createdAt: string;
}
