/**
 * Internal types for the timesheet-approval module.
 *
 * Anything that flows between layers (controller → service → calculations → invoices)
 * is shaped here so each layer can be reasoned about in isolation.
 */

import type { TimesheetApprovalToken } from "@shared/schema";

/** Identity the controller passes down. Plain object — no Express coupling. */
export interface AuthUser {
  id: string;
  userType: string;
  activeRole?: string;        // Dual-role: the role this session is acting as (defaults to userType)
  availableRoles?: string[];
}

/**
 * Who is deciding. `user` = a signed-in session (authorized by role); `email_link` = the
 * single-use token from the approval email, already looked up and still pending. The token
 * proves identity on its own, so no role check runs for it.
 */
export type ApprovalActor =
  | { kind: "user"; user: AuthUser }
  | { kind: "email_link"; token: TimesheetApprovalToken };

/** One line of the per-day table shown to the approver (email and public page). */
export interface ApproverDayRow {
  date: string;            // yyyy-MM-dd
  label: string;           // "Mon 20 Oct"
  weekday: string;         // "Mon"
  isWeekend: boolean;
  hasEntry: boolean;       // false → a day of the period with nothing logged
  valueLabel: string;      // "8.00h" | "1.0d" | "Present" | "—"
  startTime: string | null;
  endTime: string | null;
  breakHours: string | null;
  description: string | null;
}

/** What an approver needs to decide, without a login. No rates or billing fields. */
export interface ApproverSummary {
  timesheetId: string;
  status: string;
  workerName: string;
  contractLabel: string;
  periodStart: string;     // ISO
  periodEnd: string;       // ISO
  periodLabel: string;     // "20 Oct 2026 – 26 Oct 2026"
  unit: "hourly" | "daily" | "annual";
  rows: ApproverDayRow[];
  capped: boolean;         // period longer than 31 days → rows hold saved entries only
  totals: { hours: number; days: number; present: number; label: string };
  notes: string | null;
}

/** Single invoice line item. Matches `storage.createSdpInvoiceLineItems(...)` input shape. */
export interface InvoiceLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
}

/**
 * Authorization decision. The controller maps it to an HTTP response — the service layer
 * never knows what an HTTP status is.
 */
export type AuthorizeResult =
  | { allowed: true }
  | { allowed: false; status: number; message: string };

/** Top-level service result. Same convention as `AuthorizeResult`. */
export type StatusUpdateResult =
  | { ok: true }
  | { ok: false; status: number; message: string; code?: string };

/**
 * Frozen financial snapshot built from contract + timesheet + supporting tables.
 * Pure values — no DB I/O happens during the build. Used by every invoice creator.
 */
export interface BillingSnapshot {
  /** Worker's earned amount for this timesheet (0 for salary contracts). */
  workerCost: number;
  workerCostLineItems: InvoiceLineItem[];

  /** SDP→Business invoice total + line items. May be 0/empty when nothing should be billed to the business. */
  sdpInvoiceTotal: number;
  sdpBillingLineItems: InvoiceLineItem[];

  /** Host-client invoice total + line items (either Business→HostClient or SDP→HostClient depending on billingMode). */
  customerBillingAmount: number;
  clientLineItems: InvoiceLineItem[];

  /** customerBillingAmount − workerCost. Persisted on the customer_billing invoice for SDP visibility. */
  suggestedMargin: number;

  /** Currency for the host-client invoice. Defaults to the contract's customerCurrency, else contract.currency. */
  currency: string;
  invoiceDate: Date;
  dueDate: Date;

  /** Effective billing mode used by the orchestrator to decide which invoices to create. */
  billingMode: string;
  /** Raw contract rateType. */
  rateType: string;
  /** 'rate_based' | 'fixed_price'. */
  clientBillingType: string;
}
