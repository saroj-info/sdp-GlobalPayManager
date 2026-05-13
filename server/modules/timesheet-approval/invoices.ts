/**
 * Invoice factory — the side-effect layer. Every function here writes to the DB.
 *
 * Each creator is named for the invoice category it produces, takes a single
 * `InvoiceContext` object, and is idempotent: it checks whether a matching
 * invoice already exists for the same timesheet+category and bails out if so.
 * Safe to call twice — re-running approval won't double-bill.
 */

import { storage } from "../../storage";
import type { BillingSnapshot } from "./types";

/** Format a Date / ISO string as `YYYY-MM-DD` for invoice descriptions. */
function fmtDate(d: any): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toISOString().slice(0, 10);
}

/**
 * Describe what the SDP→Business invoice contains based on the snapshot.
 * Matches the same condition used in `computeSdpServicesContent` so the wording
 * stays in sync with the actual line items.
 */
function describeSdpInvoiceContent(snapshot: BillingSnapshot): string {
  const hasWorkerCost = snapshot.billingMode === "auto_invoice" && snapshot.rateType !== "annual";
  if (hasWorkerCost) return "Worker cost + SDP fees.";
  return "SDP fees.";
}

export interface InvoiceContext {
  contract: any;
  timesheet: any;
  userId: string;
  snapshot: BillingSnapshot;
  /** Pre-fetched list of all SDP invoices, shared across calls to avoid 3× round trips. */
  existingInvoices: any[];
}

/** SDP → Host Client (category: customer_billing). SDP acts as the billing entity. */
export async function createCustomerBillingInvoice(ctx: InvoiceContext): Promise<void> {
  const { contract, timesheet, userId, snapshot, existingInvoices } = ctx;

  if (!contract.customerBusinessId) {
    console.warn(`[invoice] Skipping customer_billing — customerBusinessId not set on contract ${contract.id}`);
    return;
  }
  if (!contract.customerCurrency) {
    console.warn(`[invoice] Skipping customer_billing — customerCurrency not set on contract ${contract.id}`);
    return;
  }
  if (snapshot.clientBillingType !== "fixed_price" && snapshot.customerBillingAmount <= 0) {
    console.warn(`[invoice] Skipping customer_billing — billable amount is 0 on contract ${contract.id}`);
    return;
  }

  if (existingInvoices.some(inv => inv.timesheetId === timesheet.id && inv.invoiceCategory === "customer_billing")) {
    console.log(`Customer billing invoice already exists for timesheet ${timesheet.id}, skipping`);
    return;
  }

  const invNum = await storage.generateSdpInvoiceNumber(contract.countryId);
  const hostClient = await storage.getBusinessById(contract.customerBusinessId);
  const sdpCountry = await storage.getCountryById(contract.countryId);
  const hostName = hostClient?.name || "Host Client";
  const sdpName = sdpCountry?.companyName || `SDP ${sdpCountry?.name || "Entity"}`;

  const inv = await storage.createSdpInvoice({
    invoiceNumber: invNum,
    invoiceDate: snapshot.invoiceDate,
    dueDate: snapshot.dueDate,
    invoiceCategory: "customer_billing",
    fromCountryId: contract.countryId,
    toBusinessId: contract.customerBusinessId,
    fromBusinessId: contract.businessId,
    serviceType: `Customer Billing - ${contract.employmentType}`,
    description:
      `Invoice from ${sdpName} to ${hostName}. Payable by: ${hostName}. SDP acts as billing agent. ` +
      `Period: ${fmtDate(timesheet.periodStart)} to ${fmtDate(timesheet.periodEnd)}`,
    subtotal: snapshot.customerBillingAmount.toFixed(2),
    currency: snapshot.currency,
    totalAmount: snapshot.customerBillingAmount.toFixed(2),
    suggestedMargin: snapshot.suggestedMargin.toFixed(2),
    status: "draft",
    createdBy: userId,
    timesheetId: timesheet.id,
    contractId: contract.id,
    workerId: contract.workerId,
    periodStart: timesheet.periodStart,
    periodEnd: timesheet.periodEnd,
  } as any);
  await storage.createSdpInvoiceLineItems(inv.id, snapshot.clientLineItems);
  console.log(`[invoice] Created customer_billing invoice ${invNum} for timesheet ${timesheet.id}`);
}

/** Business → Host Client (category: business_to_client). The business invoices the client directly. */
export async function createBusinessToClientInvoice(ctx: InvoiceContext): Promise<void> {
  const { contract, timesheet, userId, snapshot, existingInvoices } = ctx;

  if (!contract.customerBusinessId) {
    console.warn(`[invoice] Skipping business_to_client — customerBusinessId not set on contract ${contract.id}`);
    return;
  }
  if (snapshot.clientBillingType !== "fixed_price" && snapshot.customerBillingAmount <= 0) {
    console.warn(`[invoice] Skipping business_to_client — billable amount is 0 on contract ${contract.id}`);
    return;
  }

  if (existingInvoices.some(inv => inv.timesheetId === timesheet.id && inv.invoiceCategory === "business_to_client")) {
    console.log(`B2C invoice already exists for timesheet ${timesheet.id}, skipping`);
    return;
  }

  const invNum = await storage.generateSdpInvoiceNumber(contract.countryId);
  const fromBiz = await storage.getBusinessById(contract.businessId);
  const toHostClient = await storage.getBusinessById(contract.customerBusinessId);
  const fromName = fromBiz?.name || "Business";
  const toName = toHostClient?.name || "Host Client";

  const inv = await storage.createSdpInvoice({
    invoiceNumber: invNum,
    invoiceDate: snapshot.invoiceDate,
    dueDate: snapshot.dueDate,
    invoiceCategory: "business_to_client",
    fromCountryId: contract.countryId,
    fromBusinessId: contract.businessId,
    toBusinessId: contract.customerBusinessId,
    serviceType: `Business Billing - ${contract.employmentType}`,
    description:
      `Invoice from ${fromName} to ${toName}. Payable by: ${toName}. ` +
      `Period: ${fmtDate(timesheet.periodStart)} to ${fmtDate(timesheet.periodEnd)}`,
    subtotal: snapshot.customerBillingAmount.toFixed(2),
    currency: snapshot.currency,
    totalAmount: snapshot.customerBillingAmount.toFixed(2),
    status: "draft",
    createdBy: userId,
    timesheetId: timesheet.id,
    contractId: contract.id,
    workerId: contract.workerId,
    periodStart: timesheet.periodStart,
    periodEnd: timesheet.periodEnd,
  } as any);
  await storage.createSdpInvoiceLineItems(inv.id, snapshot.clientLineItems);
  console.log(`[invoice] Created business_to_client invoice ${invNum} for timesheet ${timesheet.id}`);
}

/** SDP → Business (category: sdp_services). Worker cost + SDP fees, billed to the employing business. */
export async function createSdpServicesInvoice(ctx: InvoiceContext): Promise<void> {
  const { contract, timesheet, userId, snapshot, existingInvoices } = ctx;

  if (existingInvoices.some(inv =>
    inv.timesheetId === timesheet.id &&
    inv.invoiceCategory === "sdp_services" &&
    inv.toBusinessId === contract.businessId,
  )) {
    console.log(`SDP service invoice already exists for timesheet ${timesheet.id}, skipping`);
    return;
  }

  const invNum = await storage.generateSdpInvoiceNumber(contract.countryId);
  const contractPOs = await storage.getPurchaseOrdersByContract(contract.id);
  const openPO = contractPOs.find((p: any) => p.status === "open");
  const business = await storage.getBusinessById(contract.businessId);
  const sdpCountry = await storage.getCountryById(contract.countryId);
  const businessName = business?.name || "Business";
  const sdpName = sdpCountry?.companyName || `SDP ${sdpCountry?.name || "Entity"}`;

  const inv = await storage.createSdpInvoice({
    invoiceNumber: invNum,
    invoiceDate: snapshot.invoiceDate,
    dueDate: snapshot.dueDate,
    invoiceCategory: "sdp_services",
    fromCountryId: contract.countryId,
    toBusinessId: contract.businessId,
    serviceType: `Employment Services - ${contract.employmentType}`,
    description:
      `Invoice from ${sdpName} to ${businessName}. Payable by: ${businessName}. ` +
      `${describeSdpInvoiceContent(snapshot)} Period: ${fmtDate(timesheet.periodStart)} to ${fmtDate(timesheet.periodEnd)}`,
    subtotal: snapshot.sdpInvoiceTotal.toFixed(2),
    currency: contract.currency,
    totalAmount: snapshot.sdpInvoiceTotal.toFixed(2),
    status: "draft",
    createdBy: userId,
    timesheetId: timesheet.id,
    contractId: contract.id,
    workerId: contract.workerId,
    periodStart: timesheet.periodStart,
    periodEnd: timesheet.periodEnd,
    purchaseOrderId: openPO?.id ?? null,
  } as any);
  await storage.createSdpInvoiceLineItems(inv.id, snapshot.sdpBillingLineItems);
  if (openPO) {
    await storage.updatePurchaseOrderInvoicedAmount(openPO.id, snapshot.sdpInvoiceTotal);
  }
  console.log(`[invoice] Created sdp_services invoice ${invNum} for timesheet ${timesheet.id} (total: ${snapshot.sdpInvoiceTotal.toFixed(2)})`);
}
