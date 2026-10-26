/**
 * Quotes — the cost-quote engine and vocabulary shared by the Quotes editor
 * (live preview), the server (totals snapshot recomputed on every save) and the
 * PDF. Pure: no DB, no Date, no React.
 *
 * A quote prices ONE worker in ONE country: gross pay + statutory / employer
 * on-costs (from shared/countryEmploymentData.ts and the DB `jurisdictions`
 * rows) + SDP fees (from the admin schedule in `quote_fee_defaults`), every
 * figure in the local currency AND in USD at the quote's exchange rate.
 *
 * The stored fields use the contract vocabulary (`employmentType`,
 * `contractorCompliance`, `isForClient`, `billingMode`, `rateType`, `rate`,
 * `currency`, `countryId`) so a quote can later be turned into a contract
 * (`deriveContractFields`).
 */
import { z } from "zod";
import {
  DEFAULT_EMPLOYER_ONCOSTS,
  DEFAULT_CONTRACTOR_ONCOSTS,
  DEFAULT_JURISDICTIONS_OVERLAY,
  COUNTRY_CURRENCIES,
  canonicaliseCountry,
  type OnCostItem,
} from "./countryEmploymentData";
import {
  CONTRACTOR_ENGAGEMENT_TYPE_VALUES,
  EMPLOYEE_ENGAGEMENT_TYPE_VALUES,
  QUOTE_EMPLOYMENT_TYPE_VALUES,
} from "./engagementTypes";

// ─── Vocabulary ──────────────────────────────────────────────────────────────

export const QUOTE_ENGAGEMENT_CATEGORIES = ["employment", "contractor_standard", "contractor_of_record"] as const;
export type QuoteEngagementCategory = (typeof QUOTE_ENGAGEMENT_CATEGORIES)[number];

export const QUOTE_ENGAGEMENT_CATEGORY_LABELS: Record<QuoteEngagementCategory, string> = {
  employment: "Employment",
  contractor_standard: "Independent Contractor (Standard Contractor)",
  contractor_of_record: "Independent Contractor (Contractor of Record Service)",
};

export const QUOTE_ENGAGEMENT_CATEGORY_DESCRIPTIONS: Record<QuoteEngagementCategory, string> = {
  employment: "The worker is employed; full statutory employer costs apply.",
  contractor_standard: "The worker contracts through their own business and invoices for their services.",
  contractor_of_record: "SDP engages the contractor and handles compliance; employer-type costs apply.",
};

export const QUOTE_WORK_LOCATIONS = ["internal", "host_client"] as const;
export type QuoteWorkLocation = (typeof QUOTE_WORK_LOCATIONS)[number];
export const QUOTE_WORK_LOCATION_LABELS: Record<QuoteWorkLocation, string> = {
  internal: "Internal Work",
  host_client: "Host Client Work",
};
export const QUOTE_WORK_LOCATION_DESCRIPTIONS: Record<QuoteWorkLocation, string> = {
  internal: "The worker provides services directly to the business.",
  host_client: "The worker provides services to one of the business's customers (a host client).",
};

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

export const QUOTE_RATE_TYPES = ["hourly", "daily", "annual"] as const;
export type QuoteRateType = (typeof QUOTE_RATE_TYPES)[number];
export const QUOTE_RATE_TYPE_LABELS: Record<QuoteRateType, string> = {
  hourly: "Hourly rate",
  daily: "Daily rate",
  annual: "Annual salary",
};
export const QUOTE_RATE_TYPE_SHORT_LABELS: Record<QuoteRateType, string> = {
  hourly: "Hourly",
  daily: "Daily",
  annual: "Annual",
};

export type QuoteBillingMode = "direct" | "invoice_through_platform" | "invoice_separately";
export const QUOTE_BILLING_MODE_LABELS: Record<QuoteBillingMode, string> = {
  direct: "Internal work — no host client billing",
  invoice_through_platform: "SDP Global Pay as Billing Agent",
  invoice_separately: "Business invoices the host client",
};

/** Same meaning as `contracts.billingMode`: Billing Agent only exists for host client work. */
export function resolveQuoteBillingMode(isForClient: boolean, sdpIsBillingAgent: boolean): QuoteBillingMode {
  if (!isForClient) return "direct";
  return sdpIsBillingAgent ? "invoice_through_platform" : "invoice_separately";
}

export const QUOTE_CALC_TYPES = ["percent", "percent_with_cap", "percent_above_threshold", "flat"] as const;
export type QuoteCalcType = (typeof QUOTE_CALC_TYPES)[number];
export const QUOTE_CALC_TYPE_LABELS: Record<QuoteCalcType, string> = {
  percent: "% of pay",
  percent_with_cap: "% up to cap",
  percent_above_threshold: "% above threshold",
  flat: "Flat per year",
};

export const QUOTE_COST_LINE_SOURCES = ["country", "jurisdiction", "custom"] as const;
export type QuoteCostLineSource = (typeof QUOTE_COST_LINE_SOURCES)[number];

export const QUOTE_FEE_LINE_TYPES = ["percentage_of_pay", "fixed_amount"] as const;
export type QuoteFeeLineType = (typeof QUOTE_FEE_LINE_TYPES)[number];
export const QUOTE_FEE_LINE_TYPE_LABELS: Record<QuoteFeeLineType, string> = {
  percentage_of_pay: "% of pay",
  fixed_amount: "Fixed / month",
};

export const QUOTE_FEE_PAID_BY = ["business", "host_client"] as const;
export type QuoteFeePaidBy = (typeof QUOTE_FEE_PAID_BY)[number];
export const QUOTE_FEE_PAID_BY_LABELS: Record<QuoteFeePaidBy, string> = {
  business: "Business",
  host_client: "Host client",
};

export const QUOTE_FX_SOURCES = ["open.er-api.com", "manual"] as const;
export type QuoteFxSource = (typeof QUOTE_FX_SOURCES)[number];

/** Base lines that a jurisdiction overlay replaces (their ids differ, so drop them by name). */
export const JURISDICTION_SUPERSEDES_BASE_IDS = ["payroll_tax", "suta"];

/** Employer on-cost ids added to the contractor list for a Contractor of Record, per canonical country. */
export const CONTRACTOR_OF_RECORD_EMPLOYER_LINE_IDS: Record<string, string[]> = {
  Australia: ["super"],
};

export const ZERO_DECIMAL_CURRENCIES = ["JPY", "VND"];

export const QUOTE_DISCLAIMER =
  "Indicative estimate for planning only. Statutory rates, thresholds and exchange rates change; SDP fees are confirmed in the contract and billing terms.";

/** Suggested fee schedule — placeholders from the public pricing page. Loaded only by an admin button, never seeded automatically. */
export interface QuoteFeeDefaultInput {
  engagementCategory: QuoteEngagementCategory;
  sdpIsBillingAgent: boolean;
  description: string;
  lineType: QuoteFeeLineType;
  rate: number | null;
  amountUsd: number | null;
  paidBy: QuoteFeePaidBy;
  sortOrder: number;
  isActive: boolean;
}

const BILLING_AGENT_FEE: Omit<QuoteFeeDefaultInput, "engagementCategory" | "sdpIsBillingAgent"> = {
  description: "Billing agent fee (invoicing and collection)",
  lineType: "percentage_of_pay",
  rate: 2,
  amountUsd: null,
  paidBy: "host_client",
  sortOrder: 1,
  isActive: true,
};

export const SUGGESTED_QUOTE_FEE_DEFAULTS: QuoteFeeDefaultInput[] = (
  [
    { category: "employment" as const, description: "Employer of Record service fee", amountUsd: 399 },
    { category: "contractor_standard" as const, description: "Contractor management fee", amountUsd: 49 },
    { category: "contractor_of_record" as const, description: "Contractor of Record service fee", amountUsd: 349 },
  ] as const
).flatMap(({ category, description, amountUsd }) => [
  { engagementCategory: category, sdpIsBillingAgent: false, description, lineType: "fixed_amount", rate: null, amountUsd, paidBy: "business", sortOrder: 0, isActive: true },
  { engagementCategory: category, sdpIsBillingAgent: true, description, lineType: "fixed_amount", rate: null, amountUsd, paidBy: "business", sortOrder: 0, isActive: true },
  { engagementCategory: category, sdpIsBillingAgent: true, ...BILLING_AGENT_FEE },
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuoteCostLine {
  id: string;
  description: string;
  calcType: QuoteCalcType;
  /** Percent for the percent types; the annual local amount for `flat`. */
  value: number;
  capAmount?: number | null;
  thresholdAmount?: number | null;
  source: QuoteCostLineSource;
  sourceId?: string | null;
  applies: boolean;
  note?: string | null;
  sortOrder: number;
}

export interface QuoteFeeLine {
  id: string;
  description: string;
  lineType: QuoteFeeLineType;
  /** Percent of annual gross pay (percentage_of_pay). */
  rate: number | null;
  /** USD per month (fixed_amount). */
  amountUsd: number | null;
  paidBy: QuoteFeePaidBy;
  applies: boolean;
  sortOrder: number;
  note?: string | null;
}

export interface QuoteInput {
  countryId: string;
  currency: string;
  engagementCategory: QuoteEngagementCategory;
  employmentType: string;
  isForClient: boolean;
  sdpIsBillingAgent: boolean;
  rateType: QuoteRateType;
  rate: number;
  hoursPerWeek: number;
  daysPerWeek: number;
  weeksPerYear: number;
  jurisdiction: string | null;
  aboveThreshold: boolean;
  costLines: QuoteCostLine[];
  feeLines: QuoteFeeLine[];
}

export interface QuoteMoney {
  local: number;
  usd: number;
}

export interface QuoteComputedCostLine extends QuoteCostLine {
  /** The base the percentage was applied to (after cap / threshold handling). */
  effectiveBase: number;
  thresholdIgnored: boolean;
  annual: QuoteMoney;
  monthly: QuoteMoney;
}

export interface QuoteComputedFeeLine extends QuoteFeeLine {
  annual: QuoteMoney;
  monthly: QuoteMoney;
}

export interface QuoteTotalsBlock {
  pay: number;
  statutory: number;
  employerCost: number;
  feesBusiness: number;
  feesHostClient: number;
  fees: number;
  total: number;
}

export interface QuoteTotals {
  local: { annual: QuoteTotalsBlock; monthly: QuoteTotalsBlock };
  usd: { annual: QuoteTotalsBlock; monthly: QuoteTotalsBlock };
  /** Statutory and employer costs as a percentage of gross pay. */
  onCostPct: number;
}

export interface QuotePerUnit {
  unit: "hour" | "day";
  unitsPerYear: number;
  pay: QuoteMoney;
  loadedCost: QuoteMoney;
}

export interface QuoteResult {
  annualPay: QuoteMoney;
  monthlyPay: QuoteMoney;
  costLines: QuoteComputedCostLine[];
  feeLines: QuoteComputedFeeLine[];
  totals: QuoteTotals;
  perUnit: QuotePerUnit | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function newQuoteLineId(prefix: string): string {
  return `${prefix}:${Math.random().toString(36).slice(2, 10)}`;
}

export function annualisePay(rateType: QuoteRateType, rate: number, hoursPerWeek: number, daysPerWeek: number, weeksPerYear: number): number {
  const r = Number.isFinite(rate) ? rate : 0;
  switch (rateType) {
    case "hourly":
      return r * (hoursPerWeek || 0) * (weeksPerYear || 0);
    case "daily":
      return r * (daysPerWeek || 0) * (weeksPerYear || 0);
    default:
      return r;
  }
}

/**
 * Same four cases as `calcLineAmount` in countryEmploymentData.ts, plus the
 * per-quote threshold rule: payroll-tax thresholds are per EMPLOYER (aggregate
 * wages), so when the employer is above the threshold the whole wage is taxed.
 */
export function calcCostLineAmount(
  line: Pick<QuoteCostLine, "calcType" | "value" | "capAmount" | "thresholdAmount">,
  base: number,
  aboveThreshold: boolean,
): { amount: number; effectiveBase: number; thresholdIgnored: boolean } {
  const pct = (b: number, percent: number) => (b * (percent || 0)) / 100;
  switch (line.calcType) {
    case "percent_with_cap": {
      const cap = line.capAmount ?? null;
      const effectiveBase = cap && cap > 0 ? Math.min(base, cap) : base;
      return { amount: pct(effectiveBase, line.value), effectiveBase, thresholdIgnored: false };
    }
    case "percent_above_threshold": {
      const threshold = line.thresholdAmount ?? 0;
      if (aboveThreshold) return { amount: pct(base, line.value), effectiveBase: base, thresholdIgnored: threshold > 0 };
      const effectiveBase = Math.max(0, base - threshold);
      return { amount: pct(effectiveBase, line.value), effectiveBase, thresholdIgnored: false };
    }
    case "percent":
      return { amount: pct(base, line.value), effectiveBase: base, thresholdIgnored: false };
    case "flat":
      return { amount: line.value || 0, effectiveBase: base, thresholdIgnored: false };
    default:
      return { amount: 0, effectiveBase: base, thresholdIgnored: false };
  }
}

function money(local: number, fx: number): QuoteMoney {
  return { local: round2(local), usd: fx > 0 ? round2(local / fx) : 0 };
}

function block(pay: number, statutory: number, feesBusiness: number, feesHostClient: number): QuoteTotalsBlock {
  const employerCost = round2(pay + statutory);
  const fees = round2(feesBusiness + feesHostClient);
  return {
    pay: round2(pay),
    statutory: round2(statutory),
    employerCost,
    feesBusiness: round2(feesBusiness),
    feesHostClient: round2(feesHostClient),
    fees,
    total: round2(employerCost + fees),
  };
}

function monthlyOf(b: QuoteTotalsBlock): QuoteTotalsBlock {
  const m = (n: number) => round2(n / 12);
  return {
    pay: m(b.pay),
    statutory: m(b.statutory),
    employerCost: m(b.employerCost),
    feesBusiness: m(b.feesBusiness),
    feesHostClient: m(b.feesHostClient),
    fees: m(b.fees),
    total: m(b.total),
  };
}

/**
 * The one calculation both columns of the editor, the server snapshot and the
 * PDF use. Lines with `applies: false` are returned with zero amounts and left
 * out of every total. `fxLocalPerUsd` = local currency units per 1 USD.
 */
export function computeQuote(input: QuoteInput, fxLocalPerUsd: number): QuoteResult {
  const fx = Number.isFinite(fxLocalPerUsd) && fxLocalPerUsd > 0 ? fxLocalPerUsd : 0;
  const annualPayLocal = round2(annualisePay(input.rateType, input.rate, input.hoursPerWeek, input.daysPerWeek, input.weeksPerYear));

  const costLines: QuoteComputedCostLine[] = [...input.costLines]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => {
      const calc = line.applies
        ? calcCostLineAmount(line, annualPayLocal, input.aboveThreshold)
        : { amount: 0, effectiveBase: annualPayLocal, thresholdIgnored: false };
      const annualLocal = round2(calc.amount);
      return {
        ...line,
        effectiveBase: round2(calc.effectiveBase),
        thresholdIgnored: calc.thresholdIgnored,
        annual: money(annualLocal, fx),
        monthly: money(annualLocal / 12, fx),
      };
    });
  const statutoryLocal = round2(costLines.reduce((s, l) => s + (l.applies ? l.annual.local : 0), 0));

  const feeLines: QuoteComputedFeeLine[] = [...input.feeLines]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => {
      let annualLocal = 0;
      let annualUsd = 0;
      if (line.applies) {
        if (line.lineType === "fixed_amount") {
          annualUsd = round2((line.amountUsd || 0) * 12);
          annualLocal = round2(annualUsd * fx);
        } else {
          annualLocal = round2((annualPayLocal * (line.rate || 0)) / 100);
          annualUsd = fx > 0 ? round2(annualLocal / fx) : 0;
        }
      }
      return {
        ...line,
        annual: { local: annualLocal, usd: annualUsd },
        monthly: { local: round2(annualLocal / 12), usd: round2(annualUsd / 12) },
      };
    });
  const feesBusinessLocal = round2(feeLines.reduce((s, l) => s + (l.applies && l.paidBy === "business" ? l.annual.local : 0), 0));
  const feesHostClientLocal = round2(feeLines.reduce((s, l) => s + (l.applies && l.paidBy === "host_client" ? l.annual.local : 0), 0));
  const feesBusinessUsd = round2(feeLines.reduce((s, l) => s + (l.applies && l.paidBy === "business" ? l.annual.usd : 0), 0));
  const feesHostClientUsd = round2(feeLines.reduce((s, l) => s + (l.applies && l.paidBy === "host_client" ? l.annual.usd : 0), 0));

  const annualLocalBlock = block(annualPayLocal, statutoryLocal, feesBusinessLocal, feesHostClientLocal);
  const annualUsdBlock = block(
    fx > 0 ? annualPayLocal / fx : 0,
    fx > 0 ? statutoryLocal / fx : 0,
    feesBusinessUsd,
    feesHostClientUsd,
  );
  const totals: QuoteTotals = {
    local: { annual: annualLocalBlock, monthly: monthlyOf(annualLocalBlock) },
    usd: { annual: annualUsdBlock, monthly: monthlyOf(annualUsdBlock) },
    onCostPct: annualPayLocal > 0 ? round2((statutoryLocal / annualPayLocal) * 100) : 0,
  };

  let perUnit: QuotePerUnit | null = null;
  if (input.rateType === "hourly" || input.rateType === "daily") {
    const unitsPerYear = input.rateType === "hourly"
      ? (input.hoursPerWeek || 0) * (input.weeksPerYear || 0)
      : (input.daysPerWeek || 0) * (input.weeksPerYear || 0);
    if (unitsPerYear > 0) {
      perUnit = {
        unit: input.rateType === "hourly" ? "hour" : "day",
        unitsPerYear,
        pay: money(input.rate, fx),
        loadedCost: money(annualLocalBlock.total / unitsPerYear, fx),
      };
    }
  }

  return {
    annualPay: money(annualPayLocal, fx),
    monthlyPay: money(annualPayLocal / 12, fx),
    costLines,
    feeLines,
    totals,
    perUnit,
  };
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export function onCostItemToCostLine(item: OnCostItem, source: QuoteCostLineSource, sortOrder: number): QuoteCostLine {
  return {
    id: `${source}:${item.id}`,
    description: item.name,
    calcType: item.type,
    value: Number(item.value) || 0,
    capAmount: item.capAmount != null ? Number(item.capAmount) : null,
    thresholdAmount: item.thresholdAmount != null ? Number(item.thresholdAmount) : null,
    source,
    sourceId: item.id,
    applies: true,
    note: item.note ?? null,
    sortOrder,
  };
}

/**
 * Default statutory / employer cost lines for a country and engagement
 * category. Jurisdiction lines (state payroll tax, SUTA…) are added for EVERY
 * category — the user can untick a line on the quote — and supersede the base
 * placeholder rows that carry a 0 rate.
 */
export function buildDefaultCostLines(args: {
  canonicalCountry: string;
  category: QuoteEngagementCategory;
  jurisdictionLines: OnCostItem[];
}): QuoteCostLine[] {
  const { canonicalCountry, category, jurisdictionLines } = args;
  const employer = DEFAULT_EMPLOYER_ONCOSTS[canonicalCountry] ?? [];
  const contractor = DEFAULT_CONTRACTOR_ONCOSTS[canonicalCountry] ?? [];

  let base: OnCostItem[];
  if (category === "employment") {
    base = employer;
  } else if (category === "contractor_of_record") {
    const extraIds = CONTRACTOR_OF_RECORD_EMPLOYER_LINE_IDS[canonicalCountry] ?? [];
    base = [...employer.filter((i) => extraIds.includes(i.id)), ...contractor];
  } else {
    base = contractor;
  }

  const hasJurisdiction = jurisdictionLines.length > 0;
  const kept = hasJurisdiction ? base.filter((i) => !JURISDICTION_SUPERSEDES_BASE_IDS.includes(i.id)) : base;

  const lines: QuoteCostLine[] = [];
  kept.forEach((item, idx) => lines.push(onCostItemToCostLine(item, "country", idx)));
  jurisdictionLines.forEach((item, idx) => lines.push(onCostItemToCostLine(item, "jurisdiction", kept.length + idx)));
  return lines;
}

/** Static overlay lookup (used when the DB has no jurisdiction rows for the country). */
export function staticJurisdictionLines(canonicalCountry: string, jurisdiction: string | null | undefined): OnCostItem[] {
  if (!jurisdiction) return [];
  return DEFAULT_JURISDICTIONS_OVERLAY[canonicalCountry]?.[jurisdiction] ?? [];
}

/** Static overlay names in their defined order (Australia lists New South Wales first). */
export function staticJurisdictionNames(canonicalCountry: string): string[] {
  return Object.keys(DEFAULT_JURISDICTIONS_OVERLAY[canonicalCountry] ?? {});
}

export function feeDefaultsToLines(rows: Array<Pick<QuoteFeeDefaultInput, "description" | "lineType" | "rate" | "amountUsd" | "paidBy" | "sortOrder"> & { id?: string | null; isActive?: boolean | null }>): QuoteFeeLine[] {
  return rows
    .filter((r) => r.isActive !== false)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r, idx) => ({
      id: `default:${r.id ?? idx}`,
      description: r.description,
      lineType: r.lineType,
      rate: r.rate != null ? Number(r.rate) : null,
      amountUsd: r.amountUsd != null ? Number(r.amountUsd) : null,
      paidBy: r.paidBy,
      applies: true,
      sortOrder: idx,
      note: null,
    }));
}

export function currencyForCanonicalCountry(canonicalCountry: string): string | null {
  return COUNTRY_CURRENCIES[canonicalCountry]?.code ?? null;
}

/** Resolve a `countries` row (id / code / name) to the canonical cost-data name. */
export function canonicalCountryForRow(row: { code?: string | null; name?: string | null; id?: string | null }): string | null {
  return canonicaliseCountry(row.code) ?? canonicaliseCountry(row.name) ?? canonicaliseCountry(row.id) ?? null;
}

// ─── Contract mapping ────────────────────────────────────────────────────────

export interface QuoteContractFields {
  workerType: "employee" | "contractor";
  employmentType: string;
  contractorCompliance: boolean | null;
  isForClient: boolean;
  billingMode: QuoteBillingMode;
  rateType: QuoteRateType;
  rate: number;
  currency: string;
  totalPackageValue: number | null;
  customerCurrency: string;
  countryId: string;
}

export function contractorComplianceForCategory(category: QuoteEngagementCategory): boolean | null {
  if (category === "employment") return null;
  return category === "contractor_of_record";
}

/** The contract columns a future "convert to contract" action would prefill. */
export function deriveContractFields(input: QuoteInput): QuoteContractFields {
  return {
    workerType: input.engagementCategory === "employment" ? "employee" : "contractor",
    employmentType: input.employmentType,
    contractorCompliance: contractorComplianceForCategory(input.engagementCategory),
    isForClient: input.isForClient,
    billingMode: resolveQuoteBillingMode(input.isForClient, input.sdpIsBillingAgent),
    rateType: input.rateType,
    rate: input.rate,
    currency: input.currency,
    totalPackageValue: input.rateType === "annual" ? input.rate : null,
    customerCurrency: "USD",
    countryId: input.countryId,
  };
}

/** Reverse map for a later contract → quote link. */
export function categoryForEngagementType(employmentType: string, contractorCompliance: boolean | null | undefined): QuoteEngagementCategory {
  if ((EMPLOYEE_ENGAGEMENT_TYPE_VALUES as readonly string[]).includes(employmentType)) return "employment";
  return contractorCompliance ? "contractor_of_record" : "contractor_standard";
}

/** Cost lines worth printing: applying, and not a 0-rate placeholder such as "Payroll tax (base)". */
export function printableCostLines<T extends QuoteCostLine>(lines: T[]): T[] {
  return lines.filter((l) => l.applies && l.value !== 0);
}

// ─── Formatting (UI + PDF) ───────────────────────────────────────────────────

export function fmtQuoteMoney(n: number, currencyCode: string): string {
  const digits = ZERO_DECIMAL_CURRENCIES.includes(currencyCode) ? 0 : 2;
  const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Number.isFinite(n) ? n : 0,
  );
  return `${currencyCode} ${num}`;
}

export function fmtQuoteRate(n: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number.isFinite(n) ? n : 0)}%`;
}

export function fmtFxRate(fxLocalPerUsd: number, currencyCode: string): string {
  const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(fxLocalPerUsd || 0);
  return `1 USD = ${num} ${currencyCode}`;
}

/** "11.5% of pay", "5.45% above threshold (ignored)", "AUD 1,200.00 per year". */
export function describeCostLineBasis(line: QuoteComputedCostLine | QuoteCostLine, currencyCode: string, aboveThreshold: boolean): string {
  switch (line.calcType) {
    case "percent":
      return `${fmtQuoteRate(line.value)} of pay`;
    case "percent_with_cap":
      return line.capAmount ? `${fmtQuoteRate(line.value)} up to ${fmtQuoteMoney(line.capAmount, currencyCode)}` : `${fmtQuoteRate(line.value)} of pay`;
    case "percent_above_threshold": {
      const t = line.thresholdAmount ? ` ${fmtQuoteMoney(line.thresholdAmount, currencyCode)}` : "";
      return aboveThreshold && line.thresholdAmount
        ? `${fmtQuoteRate(line.value)} of pay · threshold ignored`
        : `${fmtQuoteRate(line.value)} above threshold${t}`;
    }
    case "flat":
      return `${fmtQuoteMoney(line.value, currencyCode)} per year`;
    default:
      return "";
  }
}

/** "12% of pay", "USD 399.00 per month". */
export function describeFeeLineBasis(line: QuoteFeeLine): string {
  if (line.lineType === "fixed_amount") return `${fmtQuoteMoney(line.amountUsd || 0, "USD")} per month`;
  return `${fmtQuoteRate(line.rate || 0)} of pay`;
}

// ─── Zod ─────────────────────────────────────────────────────────────────────

const nullableMoney = z.number().min(0).max(1e12).nullable().optional();

export const quoteCostLineSchema = z.object({
  id: z.string().min(1).max(80),
  description: z.string().trim().min(1).max(200),
  calcType: z.enum(QUOTE_CALC_TYPES),
  value: z.number().min(0).max(1e12),
  capAmount: nullableMoney,
  thresholdAmount: nullableMoney,
  source: z.enum(QUOTE_COST_LINE_SOURCES),
  sourceId: z.string().max(120).nullable().optional(),
  applies: z.boolean(),
  note: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000),
});

export const quoteFeeLineSchema = z
  .object({
    id: z.string().min(1).max(80),
    description: z.string().trim().min(1).max(200),
    lineType: z.enum(QUOTE_FEE_LINE_TYPES),
    rate: z.number().min(0).max(1000).nullable(),
    amountUsd: z.number().min(0).max(1e9).nullable(),
    paidBy: z.enum(QUOTE_FEE_PAID_BY),
    applies: z.boolean(),
    sortOrder: z.number().int().min(0).max(1000),
    note: z.string().max(300).nullable().optional(),
  })
  .superRefine((line, ctx) => {
    if (line.lineType === "percentage_of_pay" && line.rate == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rate"], message: "A percentage fee needs a rate." });
    }
    if (line.lineType === "fixed_amount" && line.amountUsd == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amountUsd"], message: "A fixed fee needs a USD amount per month." });
    }
  });

const quoteInputBaseSchema = z.object({
  countryId: z.string().trim().min(1).max(10),
  currency: z.string().trim().length(3),
  engagementCategory: z.enum(QUOTE_ENGAGEMENT_CATEGORIES),
  employmentType: z.enum(QUOTE_EMPLOYMENT_TYPE_VALUES),
  isForClient: z.boolean(),
  sdpIsBillingAgent: z.boolean(),
  rateType: z.enum(QUOTE_RATE_TYPES),
  rate: z.number().positive().max(1e9),
  hoursPerWeek: z.number().min(1).max(100),
  daysPerWeek: z.number().int().min(1).max(7),
  weeksPerYear: z.number().int().min(1).max(53),
  jurisdiction: z.string().trim().max(120).nullable(),
  aboveThreshold: z.boolean(),
  costLines: z.array(quoteCostLineSchema).max(50),
  feeLines: z.array(quoteFeeLineSchema).max(20),
});

function refineQuoteInput(v: z.infer<typeof quoteInputBaseSchema>, ctx: z.RefinementCtx) {
  const employee = (EMPLOYEE_ENGAGEMENT_TYPE_VALUES as readonly string[]).includes(v.employmentType);
  const contractor = (CONTRACTOR_ENGAGEMENT_TYPE_VALUES as readonly string[]).includes(v.employmentType);
  if (v.engagementCategory === "employment" && !employee) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employmentType"], message: "Pick an employment engagement type for the Employment category." });
  }
  if (v.engagementCategory !== "employment" && !contractor) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["employmentType"], message: "Pick a contractor engagement type for a contractor category." });
  }
  if (!v.isForClient && v.sdpIsBillingAgent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sdpIsBillingAgent"], message: "SDP can only act as billing agent for Host Client Work." });
  }
}

export const quoteInputSchema = quoteInputBaseSchema.superRefine(refineQuoteInput);

export const saveQuoteSchema = quoteInputBaseSchema
  .extend({
    title: z.string().trim().min(1).max(160),
    clientName: z.string().trim().max(200).nullable().optional(),
    businessId: z.string().trim().min(1).max(64).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional(),
    status: z.enum(QUOTE_STATUSES).default("draft"),
    fxLocalPerUsd: z.number().positive().max(1e9),
    fxRateSource: z.enum(QUOTE_FX_SOURCES),
    fxRateAsOf: z.string().max(40).nullable().optional(),
  })
  .superRefine(refineQuoteInput);

export type SaveQuoteInput = z.infer<typeof saveQuoteSchema>;

export const quoteFeeDefaultSchema = z
  .object({
    engagementCategory: z.enum(QUOTE_ENGAGEMENT_CATEGORIES),
    sdpIsBillingAgent: z.boolean(),
    description: z.string().trim().min(1).max(200),
    lineType: z.enum(QUOTE_FEE_LINE_TYPES),
    rate: z.number().min(0).max(1000).nullable(),
    amountUsd: z.number().min(0).max(1e9).nullable(),
    paidBy: z.enum(QUOTE_FEE_PAID_BY),
    sortOrder: z.number().int().min(0).max(1000),
    isActive: z.boolean().default(true),
  })
  .superRefine((line, ctx) => {
    if (line.lineType === "percentage_of_pay" && line.rate == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rate"], message: "A percentage fee needs a rate." });
    }
    if (line.lineType === "fixed_amount" && line.amountUsd == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amountUsd"], message: "A fixed fee needs a USD amount per month." });
    }
  });

export const saveQuoteFeeDefaultsSchema = z.object({
  items: z.array(quoteFeeDefaultSchema).max(60),
});

export type SaveQuoteFeeDefaultsInput = z.infer<typeof saveQuoteFeeDefaultsSchema>;

// ─── Wire types ──────────────────────────────────────────────────────────────

export interface FxRatesResponse {
  base: "USD";
  rates: Record<string, number>;
  asOf: string | null;
  source: string;
  stale: boolean;
}

export interface QuoteDefaultsCountry {
  id: string;
  name: string;
  code: string;
  currency: string;
  canonicalName: string;
}

export interface QuoteDefaultsResponse {
  country: QuoteDefaultsCountry;
  jurisdictions: string[];
  costLines: QuoteCostLine[];
  feeLines: QuoteFeeLine[];
  fx: FxRatesResponse | null;
}

export interface QuoteListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
