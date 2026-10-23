/**
 * Timesheet-approval orchestrator. The single public entry point for the module.
 *
 * Flow:
 *   1. Load timesheet + contract
 *   2. Authorize — by role for a signed-in user, or by consuming the single-use email token
 *   3. Persist new status (+ how it was decided)
 *   4. If status === 'approved' → build a billing snapshot and route invoices
 *
 * Anything that's NOT this orchestrator (math, auth, DB writes) lives in its own
 * file so it can be tested / reused / replaced in isolation.
 */

import { storage } from "../../storage";
import { authorizeStatusUpdate } from "./authorize";
import {
  appendHostClientBillingLines,
  computeCustomerBilling,
  computeSdpServicesContent,
  computeTierDiscount,
  computeWorkerCost,
  partitionBillingLines,
} from "./calculations";
import {
  createBusinessToClientInvoice,
  createCustomerBillingInvoice,
  createSdpServicesInvoice,
  type InvoiceContext,
} from "./invoices";
import { consumeApprovalToken, releaseApprovalToken } from "./tokens";
import type { ApprovalActor, AuthUser, BillingSnapshot, StatusUpdateResult } from "./types";

export async function processStatusUpdate(args: {
  timesheetId: string;
  status: string;
  rejectionReason?: string;
  /** Signed-in caller (the in-app route). Shorthand for `actor: { kind: 'user', user }`. */
  user?: AuthUser;
  /** Who decides; see `ApprovalActor`. */
  actor?: ApprovalActor;
}): Promise<StatusUpdateResult> {
  const { timesheetId, status, rejectionReason } = args;
  const actor: ApprovalActor | null = args.actor ?? (args.user ? { kind: "user", user: args.user } : null);
  if (!actor) return { ok: false, status: 401, message: "Unauthorized" };

  // 1. Load
  const timesheet = await storage.getTimesheetById(timesheetId);
  if (!timesheet) return { ok: false, status: 404, message: "Timesheet not found" };

  const contract = await storage.getContractById(timesheet.contractId);
  if (!contract) return { ok: false, status: 404, message: "Contract not found" };

  // 2. Authorize, and work out who is recorded as the approver
  let approvedBy: string | undefined;
  let invoiceUserId: string | null;
  let decision: { approvedVia: string; approvedByEmail: string | null };

  if (actor.kind === "user") {
    const authz = await authorizeStatusUpdate({ contract, user: actor.user });
    if (!authz.allowed) return { ok: false, status: authz.status, message: authz.message };
    approvedBy = actor.user.id;
    invoiceUserId = actor.user.id;
    decision = { approvedVia: "app", approvedByEmail: null };
  } else {
    const token = actor.token;
    if (status !== "approved" && status !== "rejected") {
      return { ok: false, status: 400, code: "INVALID_ACTION", message: "An email link can only approve or reject." };
    }
    if (token.timesheetId !== timesheetId) {
      return { ok: false, status: 403, code: "APPROVAL_LINK_INVALID", message: "This link belongs to a different timesheet." };
    }
    if (timesheet.status !== "submitted") {
      return { ok: false, status: 409, code: "TIMESHEET_NOT_PENDING", message: `This timesheet is no longer awaiting approval (it is ${timesheet.status}).` };
    }
    // Consume first: the conditional UPDATE is the lock against a second click.
    const consumed = await consumeApprovalToken(token.id, status);
    if (!consumed) {
      return { ok: false, status: 409, code: "APPROVAL_LINK_USED", message: "This link has already been used." };
    }
    approvedBy = token.approverUserId ?? undefined;
    // `sdp_invoices.createdBy` is NOT NULL: fall back to whoever set the contract up.
    invoiceUserId = token.approverUserId ?? contract.createdByUserId ?? timesheet.createdBy ?? null;
    decision = { approvedVia: "email_link", approvedByEmail: token.approverEmail };
  }

  // 3. Persist
  try {
    await storage.updateTimesheetStatus(timesheetId, status, approvedBy, rejectionReason, decision);
  } catch (err) {
    if (actor.kind === "email_link") await releaseApprovalToken(actor.token.id).catch(() => undefined);
    throw err;
  }
  console.log(`[invoice] timesheet ${timesheetId} → status='${status}' via=${decision.approvedVia} contractId=${timesheet.contractId}`);

  // 4. Side effects (only on approval). Best-effort — invoicing failures must not roll back the
  //    status change. We log and move on.
  if (status === "approved") {
    try {
      if (!invoiceUserId) throw new Error("no user id available for invoice createdBy");
      await runAutoInvoiceForApproval({ contract, timesheet, userId: invoiceUserId });
    } catch (err: any) {
      console.error("[invoice] FAILED to auto-generate invoice on timesheet approval:", err?.message);
      console.error("[invoice] stack:", err?.stack);
    }
  }

  return { ok: true };
}

// ─── Internal: auto-invoice orchestration ───────────────────────────────────

async function runAutoInvoiceForApproval(args: {
  contract: any;
  timesheet: any;
  userId: string;
}): Promise<void> {
  const { contract, timesheet, userId } = args;
  const rateType = contract.rateType || "hourly";

  // Salary + no host-client billing → payroll handles it. Nothing to do.
  if (rateType === "annual" && !contract.isForClient) {
    console.log(`Salary contract ${contract.id}: no client billing, skipping auto-invoice`);
    return;
  }
  if (!contract.isForClient) {
    console.log(`[invoice] skipping auto-invoice — contract ${contract.id} isForClient=false`);
    return;
  }

  const billingMode = contract.billingMode || (contract.invoiceCustomer ? "invoice_through_platform" : null);
  if (!billingMode) {
    console.log(`[invoice] skipping auto-invoice — contract ${contract.id} has no billingMode`);
    return;
  }

  const snapshot = await buildBillingSnapshot({ contract, timesheet, billingMode, rateType });

  // Pre-fetch invoices once; each factory checks against this list for idempotency.
  const existingInvoices = await storage.getAllSdpInvoices();
  const ctx: InvoiceContext = { contract, timesheet, userId, snapshot, existingInvoices };

  // Route by billingMode. The factories themselves bail out silently when there's nothing to bill.
  if (billingMode === "invoice_through_platform") {
    await createCustomerBillingInvoice(ctx);
    if (snapshot.sdpBillingLineItems.length > 0) {
      // Business-payable billing lines need their own SDP→Business invoice.
      await createSdpServicesInvoice(ctx);
    }
  } else if (billingMode === "invoice_separately") {
    await createBusinessToClientInvoice(ctx);
    if (snapshot.sdpBillingLineItems.length > 0) {
      await createSdpServicesInvoice(ctx);
    }
  } else if (billingMode === "auto_invoice") {
    if (snapshot.sdpBillingLineItems.length > 0) {
      await createSdpServicesInvoice(ctx);
    } else {
      console.log(`[invoice] No SDP→Business content for contract ${contract.id} (salary contract with no business billing lines)`);
    }
    await createBusinessToClientInvoice(ctx);
  }
}

// ─── Internal: snapshot builder ─────────────────────────────────────────────

async function buildBillingSnapshot(args: {
  contract: any;
  timesheet: any;
  billingMode: string;
  rateType: string;
}): Promise<BillingSnapshot> {
  const { contract, timesheet, billingMode, rateType } = args;
  const rateStructure = contract.rateStructure || "single";
  const clientBillingType = contract.clientBillingType || "rate_based";

  if (Number.isNaN(parseFloat(contract.rate))) {
    throw new Error(`Contract ${contract.id} has invalid/missing rate — cannot auto-generate invoice`);
  }

  // Supporting data
  const rateLines = rateStructure === "multiple" ? await storage.getContractRateLines(contract.id) : [];
  const activeBillingLines = (await storage.getContractBillingLines(contract.id)).filter((bl: any) => bl.isActive);
  const { business: businessBillingLines, hostClient: hostClientBillingLines } =
    partitionBillingLines(activeBillingLines as any);
  const tierDiscountRows = await storage.getContractTierDiscounts(contract.id);

  // Worker cost (pure)
  const { workerCost, lineItems: workerCostLineItems } =
    computeWorkerCost(contract, timesheet.entries || [], rateLines as any);

  // Salary contracts may legitimately have workerCost=0 (paid via payroll); only treat
  // zero/negative as an error when the worker is paid per-period.
  if (rateType !== "annual" && workerCost <= 0) {
    throw new Error("Cannot create invoice for timesheet with zero or negative worker cost");
  }

  // Customer billing (pure)
  const customer = computeCustomerBilling(contract, timesheet.entries || [], rateLines as any, {
    start: timesheet.periodStart,
    end: timesheet.periodEnd,
  });

  // Percentage base for % billing lines. Rule:
  //   - Contracts for a host client (isForClient=true) ALWAYS use the customer billing amount
  //     as the base — fees scale with what's billed out, consistently across hourly/daily/annual.
  //   - Direct contracts (no host client) use workerCost.
  // Falls back the other way if either is zero, so a misconfigured contract doesn't silently
  // produce zero fees when the other base is non-zero.
  const percentageBase = contract.isForClient
    ? (customer.amount > 0 ? customer.amount : workerCost)
    : (workerCost > 0 ? workerCost : customer.amount);

  // Append host-client-payable billing lines (pure)
  const enriched = appendHostClientBillingLines({
    percentageBase,
    customerBillingAmount: customer.amount,
    clientLineItems: customer.lineItems,
    hostClientBillingLines: hostClientBillingLines as any,
  });

  // Tier discount — reduces ONLY the host-client invoice. Base is the customer
  // billing amount (rate-based or fixed-price), NOT the host-client fee lines.
  // percentageBase / SDP fee lines stay on the undiscounted base.
  const tierDiscount = computeTierDiscount({
    tiers: tierDiscountRows as any,
    contractStartDate: contract.startDate,
    periodStart: timesheet.periodStart,
    baseAmount: customer.amount,
  });
  let clientAmount = enriched.amount;
  let clientLineItems = enriched.lineItems;
  if (tierDiscount) {
    clientAmount = Math.round((clientAmount - tierDiscount.amount) * 100) / 100;
    clientLineItems = [
      ...clientLineItems,
      {
        description: `Tier discount ${tierDiscount.percent}% (after ${tierDiscount.monthsAfterStart} months)`,
        quantity: "1",
        unitPrice: (-tierDiscount.amount).toFixed(2),
        amount: (-tierDiscount.amount).toFixed(2),
        // MUST be last: invoices.tsx reads lineItems[0].unitPrice as the displayed rate.
        sortOrder: clientLineItems.length,
      },
    ];
  }

  // SDP services content (pure)
  const sdpServices = computeSdpServicesContent({
    billingMode,
    rateType,
    workerCost,
    workerCostLineItems,
    businessBillingLines: businessBillingLines as any,
    percentageBase,
  });

  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + parseInt(contract.paymentTerms || "30"));

  const snapshot: BillingSnapshot = {
    workerCost,
    workerCostLineItems,
    sdpInvoiceTotal: sdpServices.total,
    sdpBillingLineItems: sdpServices.lineItems,
    customerBillingAmount: clientAmount,
    clientLineItems,
    suggestedMargin: clientAmount - workerCost,
    currency: contract.customerCurrency || contract.currency,
    invoiceDate,
    dueDate,
    billingMode,
    rateType,
    clientBillingType,
  };

  console.log(
    `[invoice] snapshot contract=${contract.id} billingMode=${billingMode} rateType=${rateType} ` +
    `workerCost=${snapshot.workerCost} customerBillingAmount=${snapshot.customerBillingAmount} ` +
    `sdpInvoiceTotal=${snapshot.sdpInvoiceTotal} margin=${snapshot.suggestedMargin}`,
  );

  return snapshot;
}
