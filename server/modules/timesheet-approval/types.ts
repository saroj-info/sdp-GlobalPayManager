/**
 * Internal types for the timesheet-approval module.
 *
 * Anything that flows between layers (controller → service → calculations → invoices)
 * is shaped here so each layer can be reasoned about in isolation.
 */

/** Identity the controller passes down. Plain object — no Express coupling. */
export interface AuthUser {
  id: string;
  userType: string;
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
  | { ok: false; status: number; message: string };

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
