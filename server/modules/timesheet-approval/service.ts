/**
 * Timesheet-approval orchestrator. The single public entry point for the module.
 *
 * Flow:
 *   1. Load timesheet + contract
 *   2. Authorize (pure)
 *   3. Persist new status
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
  computeWorkerCost,
  partitionBillingLines,
} from "./calculations";
import {
  createBusinessToClientInvoice,
  createCustomerBillingInvoice,
  createSdpServicesInvoice,
  type InvoiceContext,
} from "./invoices";
import type { AuthUser, BillingSnapshot, StatusUpdateResult } from "./types";

export async function processStatusUpdate(args: {
  timesheetId: string;
  status: string;
  rejectionReason?: string;
  user: AuthUser;
}): Promise<StatusUpdateResult> {
  const { timesheetId, status, rejectionReason, user } = args;

  // 1. Load
  const allTimesheets = await storage.getAllTimesheets();
  const timesheet = allTimesheets.find(t => t.id === timesheetId);
  if (!timesheet) return { ok: false, status: 404, message: "Timesheet not found" };

  const contract = await storage.getContractById(timesheet.contractId);
  if (!contract) return { ok: false, status: 404, message: "Contract not found" };

  // 2. Authorize
  const authz = await authorizeStatusUpdate({ contract, user });
  if (!authz.allowed) return { ok: false, status: authz.status, message: authz.message };

  // 3. Persist
  await storage.updateTimesheetStatus(timesheetId, status, user.id, rejectionReason);
  console.log(`[invoice] PATCH /timesheets/${timesheetId}/status → status='${status}' contractId=${timesheet.contractId}`);

  // 4. Side effects (only on approval). Best-effort — invoicing failures must not roll back the
  //    status change. We log and move on.
  if (status === "approved") {
    try {
      await runAutoInvoiceForApproval({ contract, timesheet, userId: user.id });
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

  // Append host-client-payable billing lines (pure)
  const enriched = appendHostClientBillingLines({
    workerCost,
    customerBillingAmount: customer.amount,
    clientLineItems: customer.lineItems,
    hostClientBillingLines: hostClientBillingLines as any,
  });

  // SDP services content (pure)
  const sdpServices = computeSdpServicesContent({
    billingMode,
    rateType,
    workerCost,
    workerCostLineItems,
    businessBillingLines: businessBillingLines as any,
  });

  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + parseInt(contract.paymentTerms || "30"));

  const snapshot: BillingSnapshot = {
    workerCost,
    workerCostLineItems,
    sdpInvoiceTotal: sdpServices.total,
    sdpBillingLineItems: sdpServices.lineItems,
    customerBillingAmount: enriched.amount,
    clientLineItems: enriched.lineItems,
    suggestedMargin: enriched.amount - workerCost,
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
