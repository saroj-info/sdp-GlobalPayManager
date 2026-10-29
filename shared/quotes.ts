/**
 * Quotes — the cost-quote engine and vocabulary shared by the Quotes editor
 * (live preview), the server (totals snapshot recomputed on every save) and the
 * PDF. Pure: no DB, no Date, no React.
 *
 * A quote prices ONE worker in ONE country: gross pay + statutory / employer
 * on-costs (seeded from the `country_cost_items` table — Cost Settings — see
 * shared/countryCosts.ts) + SDP fees (from the admin schedule in
 * `quote_fee_defaults`), every figure in the local currency and, when the quote
 * has a comparison currency, in that currency too at the quote's exchange rate.
 *
 * Two pay modes: the rate is the worker's gross pay (default), or the rate is
 * the ALL-INCLUSIVE amount agreed with the client (`rateIncludesOnCosts`) and
 * the gross pay is solved from it so that pay + on-costs = the amount. SDP fees
 * are always on top.
 *
 * The stored fields use the contract vocabulary (`employmentType`,
 * `contractorCompliance`, `isForClient`, `billingMode`, `rateType`, `rate`,
 * `currency`, `countryId`) so a quote can later be turned into a contract
 * (`deriveContractFields`).
 */
import { z } from "zod";
import {
  COST_CALC_TYPES,
  COST_CALC_TYPE_LABELS,
  calcCostAmount,
  costItemsFor,
  type CostCalcInput,
  type CostCalcType,
  type CountryCostItem,
} from "./countryCosts";
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
export const QUOTE_RATE_UNIT_LABELS: Record<QuoteRateType, string> = {
  hourly: "per hour",
  daily: "per day",
  annual: "per year",
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

/** Cost line calculation types = the Cost Settings types (shared/countryCosts.ts). */
export const QUOTE_CALC_TYPES = COST_CALC_TYPES;
export type QuoteCalcType = CostCalcType;
export const QUOTE_CALC_TYPE_LABELS: Record<QuoteCalcType, string> = COST_CALC_TYPE_LABELS;

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

/** Always offered as a comparison currency, on top of the DB countries' currencies. */
export const COMPARISON_CURRENCY_EXTRAS = ["USD", "EUR", "GBP"] as const;

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
  /** Short label: the row title in the editor, the preview and the PDF. */
  name: string;
  /** Full text shown under the name (from Cost Settings, editable per quote). */
  description?: string | null;
  calcType: QuoteCalcType;
  /** Percent for the percent types; the annual local amount for `flat`. */
  value: number;
  capAmount?: number | null;
  source: QuoteCostLineSource;
  sourceId?: string | null;
  applies: boolean;
  sortOrder: number;
}

export interface QuoteFeeLine {
  id: string;
  description: string;
  lineType: QuoteFeeLineType;
  /** Percent of annual gross pay (of the all-inclusive pay when `rateIncludesOnCosts`). */
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
  /** The worker's gross rate, or the all-inclusive rate when `rateIncludesOnCosts`. */
  rate: number;
  hoursPerWeek: number;
  daysPerWeek: number;
  weeksPerYear: number;
  jurisdiction: string | null;
  /** The rate covers statutory and employer costs; gross pay is derived. */
  rateIncludesOnCosts: boolean;
  costLines: QuoteCostLine[];
  feeLines: QuoteFeeLine[];
}

/** Exchange rates a computation uses. `localPerUsd` only converts the fixed USD fee lines. */
export interface QuoteFx {
  comparisonCurrency: string | null;
  /** Local units per 1 unit of the comparison currency. */
  localPerComparison: number | null;
  /** Local units per 1 USD. */
  localPerUsd: number | null;
}

export interface QuoteMoney {
  local: number;
  /** In the comparison currency; null when the quote has none (or no rate). */
  comparison: number | null;
}

export interface QuoteComputedCostLine extends QuoteCostLine {
  /** The base the percentage was applied to (after the cap). */
  effectiveBase: number;
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
  comparison: { annual: QuoteTotalsBlock; monthly: QuoteTotalsBlock } | null;
  /** Statutory and employer costs as a percentage of gross pay. */
  onCostPct: number;
}

export interface QuotePerUnit {
  unit: "hour" | "day";
  unitsPerYear: number;
  /** Gross pay per unit (derived in all-inclusive mode). */
  pay: QuoteMoney;
  loadedCost: QuoteMoney;
}

/** Present only when `rateIncludesOnCosts`. */
export interface QuoteInclusive {
  /** The all-inclusive amount the client pays for the worker (pay + on-costs), per year / month. */
  annualTotal: QuoteMoney;
  monthlyTotal: QuoteMoney;
  /** Gross pay solved from it. */
  derivedAnnualPay: QuoteMoney;
  /** Gross pay in the rate's own unit (per hour / day / year). */
  derivedRate: QuoteMoney;
  /** Flat employer costs exceed the amount: gross pay clamped at 0. */
  shortfall: boolean;
}

export interface QuoteResult {
  annualPay: QuoteMoney;
  monthlyPay: QuoteMoney;
  costLines: QuoteComputedCostLine[];
  feeLines: QuoteComputedFeeLine[];
  totals: QuoteTotals;
  perUnit: QuotePerUnit | null;
  inclusive: QuoteInclusive | null;
  comparisonCurrency: string | null;
  /** An applying fixed USD fee exists but no USD rate was given: its local amount is 0. */
  feesNeedUsdRate: boolean;
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

export function unitsPerYearOf(input: Pick<QuoteInput, "rateType" | "hoursPerWeek" | "daysPerWeek" | "weeksPerYear">): number {
  if (input.rateType === "hourly") return (input.hoursPerWeek || 0) * (input.weeksPerYear || 0);
  if (input.rateType === "daily") return (input.daysPerWeek || 0) * (input.weeksPerYear || 0);
  return 1;
}

/** One cost line against a base — the Cost Settings maths (shared/countryCosts.ts). */
export function calcCostLineAmount(line: CostCalcInput, base: number): { amount: number; effectiveBase: number } {
  return calcCostAmount(line, base);
}

/**
 * Gross pay such that pay + Σ cost(pay) = target. Closed form when every line
 * is a plain percentage or flat amount; bisection (cost is monotonic in pay)
 * when a capped line is present. `shortfall` when the flat amounts alone exceed
 * the target (pay is then 0).
 */
export function solveGrossPay(target: number, lines: CostCalcInput[]): { pay: number; shortfall: boolean } {
  const t = Number.isFinite(target) && target > 0 ? target : 0;
  const flats = lines.filter((l) => l.calcType === "flat").reduce((s, l) => s + (Number.isFinite(l.value) ? l.value : 0), 0);
  const remaining = t - flats;
  if (remaining <= 0) return { pay: 0, shortfall: remaining < 0 };
  const capped = lines.filter((l) => l.calcType === "percent_with_cap" && (l.capAmount ?? 0) > 0);
  if (capped.length === 0) {
    const pctSum = lines
      .filter((l) => l.calcType !== "flat")
      .reduce((s, l) => s + (Number.isFinite(l.value) ? l.value : 0), 0);
    return { pay: round2(remaining / (1 + pctSum / 100)), shortfall: false };
  }
  const f = (pay: number) => pay + lines.reduce((s, l) => s + calcCostAmount(l, pay).amount, 0) - t;
  let lo = 0;
  let hi = t;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
    if (hi - lo < 0.0001) break;
  }
  return { pay: round2((lo + hi) / 2), shortfall: false };
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
 * out of every total.
 */
export function computeQuote(input: QuoteInput, fx: QuoteFx): QuoteResult {
  const cmpRate = fx.comparisonCurrency && Number.isFinite(fx.localPerComparison ?? NaN) && (fx.localPerComparison ?? 0) > 0 ? (fx.localPerComparison as number) : null;
  const comparisonCurrency = cmpRate ? fx.comparisonCurrency : null;
  const usdRate = Number.isFinite(fx.localPerUsd ?? NaN) && (fx.localPerUsd ?? 0) > 0 ? (fx.localPerUsd as number) : null;
  const money = (local: number): QuoteMoney => ({ local: round2(local), comparison: cmpRate ? round2(local / cmpRate) : null });

  const annualEntered = round2(annualisePay(input.rateType, input.rate, input.hoursPerWeek, input.daysPerWeek, input.weeksPerYear));
  const sortedLines = [...input.costLines].sort((a, b) => a.sortOrder - b.sortOrder);
  const applying = sortedLines.filter((l) => l.applies);

  const computeLines = (pay: number): { lines: QuoteComputedCostLine[]; statutory: number } => {
    const lines = sortedLines.map((line) => {
      const calc = line.applies ? calcCostAmount(line, pay) : { amount: 0, effectiveBase: pay };
      const annualLocal = round2(calc.amount);
      return {
        ...line,
        effectiveBase: round2(calc.effectiveBase),
        annual: money(annualLocal),
        monthly: money(annualLocal / 12),
      };
    });
    return { lines, statutory: round2(lines.reduce((s, l) => s + (l.applies ? l.annual.local : 0), 0)) };
  };

  let annualPayLocal = annualEntered;
  let shortfall = false;
  let computed = computeLines(annualPayLocal);
  if (input.rateIncludesOnCosts) {
    const solved = solveGrossPay(annualEntered, applying);
    shortfall = solved.shortfall;
    annualPayLocal = solved.pay;
    computed = computeLines(annualPayLocal);
    // Second pass: absorb the per-line rounding so pay + on-costs lands on the amount.
    const adjusted = round2(annualEntered - computed.statutory);
    if (!shortfall && adjusted >= 0 && Math.abs(adjusted - annualPayLocal) >= 0.005) {
      annualPayLocal = adjusted;
      computed = computeLines(annualPayLocal);
    }
  }
  const costLines = computed.lines;
  const statutoryLocal = computed.statutory;
  const feeBaseLocal = input.rateIncludesOnCosts ? annualEntered : annualPayLocal;

  let feesNeedUsdRate = false;
  const feeLines: QuoteComputedFeeLine[] = [...input.feeLines]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => {
      let annualLocal = 0;
      if (line.applies) {
        if (line.lineType === "fixed_amount") {
          const annualUsd = round2((line.amountUsd || 0) * 12);
          if (usdRate) annualLocal = round2(annualUsd * usdRate);
          else if (annualUsd > 0) feesNeedUsdRate = true;
        } else {
          annualLocal = round2((feeBaseLocal * (line.rate || 0)) / 100);
        }
      }
      return { ...line, annual: money(annualLocal), monthly: money(annualLocal / 12) };
    });
  const feesBusinessLocal = round2(feeLines.reduce((s, l) => s + (l.applies && l.paidBy === "business" ? l.annual.local : 0), 0));
  const feesHostClientLocal = round2(feeLines.reduce((s, l) => s + (l.applies && l.paidBy === "host_client" ? l.annual.local : 0), 0));

  const annualLocalBlock = block(annualPayLocal, statutoryLocal, feesBusinessLocal, feesHostClientLocal);
  const comparisonBlock = cmpRate
    ? block(annualPayLocal / cmpRate, statutoryLocal / cmpRate, feesBusinessLocal / cmpRate, feesHostClientLocal / cmpRate)
    : null;
  const totals: QuoteTotals = {
    local: { annual: annualLocalBlock, monthly: monthlyOf(annualLocalBlock) },
    comparison: comparisonBlock ? { annual: comparisonBlock, monthly: monthlyOf(comparisonBlock) } : null,
    onCostPct: annualPayLocal > 0 ? round2((statutoryLocal / annualPayLocal) * 100) : 0,
  };

  const unitsPerYear = unitsPerYearOf(input);
  let perUnit: QuotePerUnit | null = null;
  if ((input.rateType === "hourly" || input.rateType === "daily") && unitsPerYear > 0) {
    perUnit = {
      unit: input.rateType === "hourly" ? "hour" : "day",
      unitsPerYear,
      pay: money(annualPayLocal / unitsPerYear),
      loadedCost: money(annualLocalBlock.total / unitsPerYear),
    };
  }

  const inclusive: QuoteInclusive | null = input.rateIncludesOnCosts
    ? {
        annualTotal: money(annualEntered),
        monthlyTotal: money(annualEntered / 12),
        derivedAnnualPay: money(annualPayLocal),
        derivedRate: money(input.rateType === "annual" ? annualPayLocal : unitsPerYear > 0 ? annualPayLocal / unitsPerYear : 0),
        shortfall,
      }
    : null;

  return {
    annualPay: money(annualPayLocal),
    monthlyPay: money(annualPayLocal / 12),
    costLines,
    feeLines,
    totals,
    perUnit,
    inclusive,
    comparisonCurrency,
    feesNeedUsdRate,
  };
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export function costItemToCostLine(item: CountryCostItem, sortOrder: number): QuoteCostLine {
  const source: QuoteCostLineSource = item.stateProvince ? "jurisdiction" : "country";
  return {
    id: `${source}:${item.id}`,
    name: item.name,
    description: item.description || null,
    calcType: item.calcType,
    value: Number(item.value) || 0,
    capAmount: item.capAmount != null ? Number(item.capAmount) : null,
    source,
    sourceId: item.id,
    applies: true,
    sortOrder,
  };
}

/**
 * Default statutory / employer cost lines for a country, engagement category
 * and state, from the Cost Settings items: country-wide items first, then the
 * state's. Every line starts ticked; the user can untick it on the quote.
 */
export function buildDefaultCostLines(args: {
  items: CountryCostItem[];
  category: QuoteEngagementCategory;
  jurisdiction: string | null;
}): QuoteCostLine[] {
  return costItemsFor(args.items, { category: args.category, jurisdiction: args.jurisdiction }).map((item, idx) => costItemToCostLine(item, idx));
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

// ─── Comparison currency ─────────────────────────────────────────────────────

/** The currencies a quote in `localCurrency` can be compared against: the countries' currencies plus USD / EUR / GBP, without the local one. */
export function comparisonCurrencyOptions(countries: Array<{ currency?: string | null }>, localCurrency: string): string[] {
  const set = new Set<string>();
  for (const c of countries) {
    const code = (c.currency ?? "").toUpperCase().trim();
    if (code.length === 3) set.add(code);
  }
  for (const code of COMPARISON_CURRENCY_EXTRAS) set.add(code);
  set.delete((localCurrency || "").toUpperCase());
  return Array.from(set).sort();
}

/** Local units per 1 `target` unit from a USD-base rates map; null when either rate is missing. */
export function crossRate(rates: Record<string, number> | null | undefined, localCurrency: string, target: string): number | null {
  if (!rates) return null;
  const local = rates[(localCurrency || "").toUpperCase()];
  const tgt = rates[(target || "").toUpperCase()];
  if (typeof local !== "number" || !(local > 0) || typeof tgt !== "number" || !(tgt > 0)) return null;
  return local / tgt;
}

// ─── Stored-row normalisation ────────────────────────────────────────────────

/** A cost line as stored (today's shape or the earlier one with `description` as the name, `note`, `thresholdAmount`). */
export function normaliseCostLine(raw: any, idx: number): QuoteCostLine {
  const hasName = typeof raw?.name === "string" && raw.name.trim().length > 0;
  const name = hasName ? String(raw.name) : String(raw?.description ?? "");
  const description = hasName ? (raw?.description ?? null) : (raw?.note ?? null);
  const calcType: QuoteCalcType =
    raw?.calcType === "percent_above_threshold"
      ? "percent"
      : (QUOTE_CALC_TYPES as readonly string[]).includes(raw?.calcType)
        ? raw.calcType
        : "percent";
  const source: QuoteCostLineSource = (QUOTE_COST_LINE_SOURCES as readonly string[]).includes(raw?.source) ? raw.source : "custom";
  return {
    id: String(raw?.id ?? `line:${idx}`),
    name,
    description: typeof description === "string" && description.trim() ? description : null,
    calcType,
    value: Number(raw?.value) || 0,
    capAmount: raw?.capAmount != null && Number.isFinite(Number(raw.capAmount)) ? Number(raw.capAmount) : null,
    source,
    sourceId: raw?.sourceId ?? null,
    applies: raw?.applies !== false,
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : idx,
  };
}

export interface StoredQuoteShape {
  currency: string;
  costLines: unknown;
  feeLines: unknown;
  totals: unknown;
  comparisonCurrency?: string | null;
  fxLocalPerComparison?: string | number | null;
  fxLocalPerUsd?: string | number | null;
}

/**
 * A quote row as the app reads it: cost lines in today's shape, and a row saved
 * before the comparison-currency columns existed (totals carried `usd`) read as
 * a USD comparison at its USD rate. Returns a copy.
 */
export function normaliseStoredQuote<T extends StoredQuoteShape>(row: T): T {
  const costLines = Array.isArray(row.costLines) ? row.costLines.map(normaliseCostLine) : [];
  const feeLines = Array.isArray(row.feeLines) ? row.feeLines : [];
  const totals: any = row.totals && typeof row.totals === "object" ? { ...(row.totals as any) } : null;
  let comparisonCurrency = row.comparisonCurrency ?? null;
  let fxLocalPerComparison = row.fxLocalPerComparison ?? null;
  if (totals && "usd" in totals && !("comparison" in totals)) {
    const legacyUsd = totals.usd;
    delete totals.usd;
    if ((row.currency || "").toUpperCase() !== "USD") {
      totals.comparison = legacyUsd ?? null;
      if (!comparisonCurrency) comparisonCurrency = "USD";
      if (fxLocalPerComparison == null) fxLocalPerComparison = row.fxLocalPerUsd ?? null;
    } else {
      totals.comparison = null;
    }
  }
  return { ...row, costLines, feeLines, totals, comparisonCurrency, fxLocalPerComparison };
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
export function deriveContractFields(input: QuoteInput, comparisonCurrency?: string | null): QuoteContractFields {
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
    customerCurrency: comparisonCurrency || input.currency,
    countryId: input.countryId,
  };
}

/** Reverse map for a later contract → quote link. */
export function categoryForEngagementType(employmentType: string, contractorCompliance: boolean | null | undefined): QuoteEngagementCategory {
  if ((EMPLOYEE_ENGAGEMENT_TYPE_VALUES as readonly string[]).includes(employmentType)) return "employment";
  return contractorCompliance ? "contractor_of_record" : "contractor_standard";
}

/** Cost lines worth printing: applying, and not a 0-rate placeholder. */
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

/** "1 USD = 1.5200 AUD". */
export function fmtFxRate(localPerUnit: number, localCurrency: string, unitCurrency: string): string {
  const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(localPerUnit || 0);
  return `1 ${unitCurrency} = ${num} ${localCurrency}`;
}

/** "12% of pay", "0.6% up to USD 7,000.00", "AUD 1,200.00 per year". */
export function describeCostLineBasis(line: Pick<QuoteCostLine, "calcType" | "value" | "capAmount">, currencyCode: string): string {
  switch (line.calcType) {
    case "percent":
      return `${fmtQuoteRate(line.value)} of pay`;
    case "percent_with_cap":
      return line.capAmount ? `${fmtQuoteRate(line.value)} up to ${fmtQuoteMoney(line.capAmount, currencyCode)}` : `${fmtQuoteRate(line.value)} of pay`;
    case "flat":
      return `${fmtQuoteMoney(line.value, currencyCode)} per year`;
    default:
      return "";
  }
}

/** "2% of pay", "2% of all-inclusive pay", "USD 399.00 per month". */
export function describeFeeLineBasis(line: Pick<QuoteFeeLine, "lineType" | "rate" | "amountUsd">, inclusive = false): string {
  if (line.lineType === "fixed_amount") return `${fmtQuoteMoney(line.amountUsd || 0, "USD")} per month`;
  return `${fmtQuoteRate(line.rate || 0)} of ${inclusive ? "all-inclusive pay" : "pay"}`;
}

// ─── Zod ─────────────────────────────────────────────────────────────────────

const nullableMoney = z.number().min(0).max(1e12).nullable().optional();

export const quoteCostLineSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  calcType: z.enum(QUOTE_CALC_TYPES),
  value: z.number().min(0).max(1e12),
  capAmount: nullableMoney,
  source: z.enum(QUOTE_COST_LINE_SOURCES),
  sourceId: z.string().max(120).nullable().optional(),
  applies: z.boolean(),
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
  rateIncludesOnCosts: z.boolean().default(false),
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

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .transform((s) => s.toUpperCase());

export const saveQuoteSchema = quoteInputBaseSchema
  .extend({
    title: z.string().trim().min(1).max(160),
    clientName: z.string().trim().max(200).nullable().optional(),
    businessId: z.string().trim().min(1).max(64).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable().optional(),
    status: z.enum(QUOTE_STATUSES).default("draft"),
    comparisonCurrency: currencyCode.nullable().optional(),
    fxLocalPerComparison: z.number().positive().max(1e9).nullable().optional(),
    fxLocalPerUsd: z.number().positive().max(1e9).nullable().optional(),
    fxRateSource: z.enum(QUOTE_FX_SOURCES),
    fxRateAsOf: z.string().max(40).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    refineQuoteInput(v, ctx);
    const cmp = v.comparisonCurrency ?? null;
    if (cmp && cmp === v.currency.toUpperCase()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["comparisonCurrency"], message: "The comparison currency must differ from the quote's currency." });
    }
    if (cmp && !(v.fxLocalPerComparison && v.fxLocalPerComparison > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fxLocalPerComparison"], message: `Enter the exchange rate (${v.currency.toUpperCase()} per 1 ${cmp}).` });
    }
    const needsUsd = v.feeLines.some((l) => l.applies && l.lineType === "fixed_amount" && (l.amountUsd ?? 0) > 0);
    const usdCovered = (v.fxLocalPerUsd && v.fxLocalPerUsd > 0) || (cmp === "USD" && v.fxLocalPerComparison && v.fxLocalPerComparison > 0) || v.currency.toUpperCase() === "USD";
    if (needsUsd && !usdCovered) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fxLocalPerUsd"], message: "Enter the USD exchange rate used for the fixed SDP fees." });
    }
  });

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
}

export interface QuoteDefaultsResponse {
  country: QuoteDefaultsCountry;
  jurisdictions: string[];
  costLines: QuoteCostLine[];
  feeLines: QuoteFeeLine[];
  fx: FxRatesResponse | null;
  /** false when the country has no Cost Settings items yet. */
  costItemsConfigured: boolean;
}

export interface QuoteListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
