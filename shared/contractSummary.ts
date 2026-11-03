/**
 * The contract summary a worker is asked to acknowledge when the contract was
 * signed outside the platform (`contracts.signingMode = 'acknowledgment'`).
 *
 * One pure builder, used by the acknowledgment email (server/emailService.ts)
 * and by the public /acknowledge/:token page, so both show the same rows from
 * the same data. The types are structural so the raw `contracts` row on the
 * server and the enriched `ContractWithDerived` on the client both fit.
 *
 * Deliberately NOT included (the worker must not see what the client is
 * charged): customerBillingRate / customerBillingRateType / customerCurrency,
 * fixedBillingAmount / fixedBillingFrequency, clientBillingType, billingMode,
 * invoiceCustomer, invoicingFrequency, paymentTerms, tier discounts, billing
 * lines, rate-line `clientRate`, sdpEntityId, the signing audit columns, and
 * jobDescription (long free text; the page prints it in its own block).
 */
import { getEngagementTypeLabel } from "./engagementTypes";

export const CONTRACT_SUMMARY_SECTIONS = [
  "Parties",
  "Engagement",
  "Compensation",
  "Timesheet & Payment",
  "Workplace",
] as const;

export type ContractSummarySection = (typeof CONTRACT_SUMMARY_SECTIONS)[number];

export interface ContractSummaryRow {
  section: ContractSummarySection;
  label: string;
  value: string;
}

export interface ContractSummaryContext {
  worker?: { firstName?: string | null; lastName?: string | null } | null;
  business?: { name?: string | null } | null;
  /** The host client (customer business) for Customer Work. */
  hostClient?: { name?: string | null; address?: string | null } | null;
  roleTitle?: { title?: string | null } | null;
  country?: { name?: string | null; code?: string | null } | null;
  thirdPartyBusiness?: { name?: string | null } | null;
  /** Project rate lines; only `rate`, `rateType` and `currency` are read (never `clientRate`). */
  rateLines?: Array<{ rate?: string | number | null; rateType?: string | null; currency?: string | null }> | null;
  remunerationLines?: Array<{
    description?: string | null;
    type?: string | null;
    frequency?: string | null;
    amount?: string | number | null;
  }> | null;
}

/** The contract fields the summary reads (a subset of the `contracts` row). */
export interface ContractSummarySource {
  contractName?: string | null;
  customRoleTitle?: string | null;
  employmentType?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  noticePeriodDays?: number | string | null;
  rateType?: string | null;
  rateStructure?: string | null;
  rate?: string | number | null;
  currency?: string | null;
  totalPackageValue?: string | number | null;
  requiresTimesheet?: boolean | null;
  timesheetFrequency?: string | null;
  timesheetCalculationMethod?: string | null;
  timesheetApproverRole?: string | null;
  paymentScheduleType?: string | null;
  paymentDay?: string | null;
  paymentDaysAfterPeriod?: number | string | null;
  paymentHolidayRule?: boolean | string | null;
  firstTimesheetStartDate?: string | Date | null;
  isForClient?: boolean | null;
  clientName?: string | null;
  clientCity?: string | null;
  clientCountry?: string | null;
  clientAddress?: string | null;
}

/**
 * Dates are stored as UTC midnight of the picked calendar day (the wizard sends
 * "YYYY-MM-DD"); formatting in the local zone would shift a day west of UTC.
 */
export function formatSummaryDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function fmtMoney(value: string | number | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function unitFor(rateType: string | null | undefined): string {
  return rateType === "daily" ? "day" : rateType === "annual" ? "year" : "hour";
}

const APPROVER_LABELS: Record<string, string> = {
  sdp: "SDP Global Pay",
  business: "Employing Company",
  host_client: "Host Client",
};

function paymentScheduleText(c: ContractSummarySource): string {
  if (!c.paymentScheduleType) return "";
  let text: string;
  if (c.paymentScheduleType === "days_after") {
    const n = c.paymentDaysAfterPeriod ?? "—";
    text = `${n} day${Number(n) === 1 ? "" : "s"} after period end`;
  } else if (c.paymentDay) {
    text = `Specific day: ${titleCase(String(c.paymentDay))}`;
  } else {
    text = titleCase(c.paymentScheduleType);
  }
  if (c.paymentHolidayRule) text += " · previous working day if a holiday";
  return text;
}

/** The key terms of a contract as label / value rows, grouped by section. Blank values are omitted. */
export function buildContractSummary(c: ContractSummarySource, ctx: ContractSummaryContext = {}): ContractSummaryRow[] {
  const rows: ContractSummaryRow[] = [];
  const add = (section: ContractSummarySection, label: string, value: string | null | undefined) => {
    const v = (value ?? "").toString().trim();
    if (v) rows.push({ section, label, value: v });
  };
  const currency = c.currency ?? "";

  // Parties
  add("Parties", "Worker", [ctx.worker?.firstName, ctx.worker?.lastName].filter(Boolean).join(" "));
  add("Parties", "Employing Company", ctx.business?.name);
  add("Parties", "Country", ctx.country?.name ? `${ctx.country.name}${ctx.country.code ? ` (${ctx.country.code})` : ""}` : "");
  if (c.isForClient) add("Parties", "Host / Customer Business", ctx.hostClient?.name ?? c.clientName);
  add("Parties", "Third-party Vendor", ctx.thirdPartyBusiness?.name);

  // Engagement
  add("Engagement", "Contract Name", c.contractName);
  add("Engagement", "Position", ctx.roleTitle?.title ?? c.customRoleTitle);
  add("Engagement", "Employment Type", getEngagementTypeLabel(c.employmentType) || titleCase(c.employmentType));
  add("Engagement", "Start Date", formatSummaryDate(c.startDate));
  add("Engagement", "End Date", c.endDate ? formatSummaryDate(c.endDate) : "Ongoing");
  if (c.noticePeriodDays != null && c.noticePeriodDays !== "") {
    const n = Number(c.noticePeriodDays);
    add("Engagement", "Notice Period", `${c.noticePeriodDays} day${n === 1 ? "" : "s"}`);
  }

  // Compensation
  if (c.rateType === "annual") {
    const pkg = fmtMoney(c.totalPackageValue && Number(c.totalPackageValue) > 0 ? c.totalPackageValue : c.rate);
    add("Compensation", "Total Package (CTC)", pkg ? `${currency} ${pkg} per year`.trim() : "");
  } else if (c.rateStructure === "multiple") {
    const lines = ctx.rateLines ?? [];
    const amounts = lines.map((l) => Number(l.rate)).filter((n) => Number.isFinite(n) && n > 0);
    if (amounts.length > 0) {
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      const sample = lines[0];
      const cur = sample?.currency || currency;
      const unit = unitFor(sample?.rateType || c.rateType);
      const range = min === max ? fmtMoney(min) : `${fmtMoney(min)} – ${fmtMoney(max)}`;
      add("Compensation", "Worker Rate", `${cur} ${range} per ${unit} (varies by project)`.trim());
    } else {
      add("Compensation", "Worker Rate", "Multiple rates (see project rate lines)");
    }
    add("Compensation", "Rate Structure", "Multiple rates / penalty rates");
  } else {
    const rate = fmtMoney(c.rate);
    add("Compensation", "Worker Rate", rate ? `${currency} ${rate} per ${unitFor(c.rateType)}`.trim() : "");
  }
  for (const line of ctx.remunerationLines ?? []) {
    const amount = fmtMoney(line.amount);
    if (!amount) continue;
    const label = line.description?.trim() || titleCase(line.type) || "Pay item";
    add("Compensation", `Pay Breakdown — ${label}`, `${currency} ${amount}${line.frequency ? ` · ${titleCase(line.frequency)}` : ""}`.trim());
  }

  // Timesheet & Payment
  add("Timesheet & Payment", "Timesheets Required", c.requiresTimesheet ? "Yes" : "No");
  if (c.requiresTimesheet) {
    add("Timesheet & Payment", "Timesheet Frequency", titleCase(c.timesheetFrequency));
    add("Timesheet & Payment", "Calculation Method", titleCase(c.timesheetCalculationMethod));
    add("Timesheet & Payment", "Approved By", c.timesheetApproverRole ? APPROVER_LABELS[c.timesheetApproverRole] ?? titleCase(c.timesheetApproverRole) : "");
    add("Timesheet & Payment", "Payment Schedule", paymentScheduleText(c));
    add("Timesheet & Payment", "First Timesheet Period Starts", formatSummaryDate(c.firstTimesheetStartDate));
  }

  // Workplace (Customer Work only)
  if (c.isForClient) {
    add("Workplace", "Client", ctx.hostClient?.name ?? c.clientName);
    add("Workplace", "Location", [c.clientCity, c.clientCountry].filter(Boolean).join(", "));
    const address = ctx.hostClient?.address ?? c.clientAddress;
    add("Workplace", "Address", address ? address.replace(/\s*\n+\s*/g, ", ") : "");
  }

  return rows;
}

/** Rows grouped in section order; sections without rows are omitted. */
export function groupContractSummary(rows: ContractSummaryRow[]): Array<{ section: ContractSummarySection; rows: ContractSummaryRow[] }> {
  return CONTRACT_SUMMARY_SECTIONS
    .map((section) => ({ section, rows: rows.filter((r) => r.section === section) }))
    .filter((g) => g.rows.length > 0);
}
