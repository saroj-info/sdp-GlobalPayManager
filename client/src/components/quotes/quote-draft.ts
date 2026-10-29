/**
 * The editor's draft state for a quote: the saved row with the numeric fields
 * held as input strings, plus the conversions to the engine input and to the
 * save payload. Keeping one draft object means the inputs on the left and the
 * preview on the right always read the same values.
 */
import type { Quote } from "@shared/schema";
import {
  crossRate,
  normaliseStoredQuote,
  type FxRatesResponse,
  type QuoteCostLine,
  type QuoteEngagementCategory,
  type QuoteFeeLine,
  type QuoteFx,
  type QuoteFxSource,
  type QuoteInput,
  type QuoteRateType,
  type QuoteStatus,
} from "@shared/quotes";

export interface QuoteDraft {
  id: string | null;
  quoteNumber: string | null;
  title: string;
  status: QuoteStatus;
  clientName: string;
  businessId: string | null;
  notes: string;
  validUntil: string; // yyyy-MM-dd or ''
  countryId: string;
  currency: string;
  jurisdiction: string; // '' = none
  engagementCategory: QuoteEngagementCategory;
  employmentType: string;
  isForClient: boolean;
  sdpIsBillingAgent: boolean;
  rateType: QuoteRateType;
  rate: string;
  hoursPerWeek: string;
  daysPerWeek: string;
  weeksPerYear: string;
  /** The rate is the all-inclusive amount (pay + on-costs); gross pay is derived. */
  rateIncludesOnCosts: boolean;
  /** '' = no comparison currency. */
  comparisonCurrency: string;
  /** Local units per 1 comparison unit. */
  fxLocalPerComparison: string;
  /** Local units per 1 USD — only converts the fixed USD fee lines. */
  fxLocalPerUsd: string;
  fxRateSource: QuoteFxSource;
  fxRateAsOf: string | null;
  costLines: QuoteCostLine[];
  feeLines: QuoteFeeLine[];
}

export const DEFAULT_HOURS_PER_WEEK = 38;
export const DEFAULT_DAYS_PER_WEEK = 5;
export const DEFAULT_WEEKS_PER_YEAR = 52;

/** A new quote compares against USD unless the quote itself is in USD. */
export function defaultComparisonFor(currency: string): string {
  return (currency || "").toUpperCase() === "USD" ? "" : "USD";
}

export function emptyDraft(args: { countryId: string; currency: string }): QuoteDraft {
  return {
    id: null,
    quoteNumber: null,
    title: "",
    status: "draft",
    clientName: "",
    businessId: null,
    notes: "",
    validUntil: "",
    countryId: args.countryId,
    currency: args.currency,
    jurisdiction: "",
    engagementCategory: "employment",
    employmentType: "permanent",
    isForClient: false,
    sdpIsBillingAgent: false,
    rateType: "annual",
    rate: "",
    hoursPerWeek: String(DEFAULT_HOURS_PER_WEEK),
    daysPerWeek: String(DEFAULT_DAYS_PER_WEEK),
    weeksPerYear: String(DEFAULT_WEEKS_PER_YEAR),
    rateIncludesOnCosts: false,
    comparisonCurrency: defaultComparisonFor(args.currency),
    fxLocalPerComparison: "",
    fxLocalPerUsd: "",
    fxRateSource: "manual",
    fxRateAsOf: null,
    costLines: [],
    feeLines: [],
  };
}

export function num(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** True when the fixed USD fee lines need their own rate (the comparison rate does not cover USD). */
export function needsSeparateUsdRate(draft: Pick<QuoteDraft, "currency" | "comparisonCurrency">): boolean {
  const local = (draft.currency || "").toUpperCase();
  return local !== "USD" && (draft.comparisonCurrency || "").toUpperCase() !== "USD";
}

/** The rates the engine computes with. A USD comparison doubles as the USD rate; a USD quote needs none. */
export function draftFx(draft: QuoteDraft): QuoteFx {
  const local = (draft.currency || "").toUpperCase();
  const comparisonCurrency = draft.comparisonCurrency ? draft.comparisonCurrency.toUpperCase() : null;
  const localPerComparison = comparisonCurrency ? num(draft.fxLocalPerComparison) || null : null;
  let localPerUsd: number | null = num(draft.fxLocalPerUsd) || null;
  if (local === "USD") localPerUsd = 1;
  else if (comparisonCurrency === "USD" && localPerComparison) localPerUsd = localPerComparison;
  return { comparisonCurrency, localPerComparison, localPerUsd };
}

export function draftToInput(draft: QuoteDraft): QuoteInput {
  return {
    countryId: draft.countryId,
    currency: draft.currency,
    engagementCategory: draft.engagementCategory,
    employmentType: draft.employmentType,
    isForClient: draft.isForClient,
    sdpIsBillingAgent: draft.isForClient ? draft.sdpIsBillingAgent : false,
    rateType: draft.rateType,
    rate: num(draft.rate),
    hoursPerWeek: num(draft.hoursPerWeek, DEFAULT_HOURS_PER_WEEK),
    daysPerWeek: num(draft.daysPerWeek, DEFAULT_DAYS_PER_WEEK),
    weeksPerYear: num(draft.weeksPerYear, DEFAULT_WEEKS_PER_YEAR),
    jurisdiction: draft.jurisdiction || null,
    rateIncludesOnCosts: draft.rateIncludesOnCosts,
    costLines: draft.costLines,
    feeLines: draft.feeLines,
  };
}

export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function quoteRowToDraft(row: Quote): QuoteDraft {
  const q = normaliseStoredQuote(row);
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    title: q.title,
    status: q.status,
    clientName: q.clientName ?? "",
    businessId: q.businessId ?? null,
    notes: q.notes ?? "",
    validUntil: toDateInput(q.validUntil as unknown as string | Date | null),
    countryId: q.countryId,
    currency: q.currency,
    jurisdiction: q.jurisdiction ?? "",
    engagementCategory: q.engagementCategory as QuoteEngagementCategory,
    employmentType: q.employmentType,
    isForClient: q.isForClient,
    sdpIsBillingAgent: q.sdpIsBillingAgent,
    rateType: q.rateType as QuoteRateType,
    rate: String(num(q.rate)),
    hoursPerWeek: String(num(q.hoursPerWeek, DEFAULT_HOURS_PER_WEEK)),
    daysPerWeek: String(q.daysPerWeek ?? DEFAULT_DAYS_PER_WEEK),
    weeksPerYear: String(q.weeksPerYear ?? DEFAULT_WEEKS_PER_YEAR),
    rateIncludesOnCosts: q.rateIncludesOnCosts ?? false,
    comparisonCurrency: q.comparisonCurrency ?? "",
    fxLocalPerComparison: q.fxLocalPerComparison != null && num(q.fxLocalPerComparison) > 0 ? String(num(q.fxLocalPerComparison)) : "",
    fxLocalPerUsd: q.fxLocalPerUsd != null && num(q.fxLocalPerUsd) > 0 ? String(num(q.fxLocalPerUsd)) : "",
    fxRateSource: (q.fxRateSource as QuoteFxSource) === "open.er-api.com" ? "open.er-api.com" : "manual",
    fxRateAsOf: q.fxRateAsOf ? new Date(q.fxRateAsOf as unknown as string).toISOString() : null,
    costLines: Array.isArray(q.costLines) ? q.costLines : [],
    feeLines: Array.isArray(q.feeLines) ? q.feeLines : [],
  };
}

/** The JSON body for POST / PUT /api/quotes — matches `saveQuoteSchema`. */
export function draftToPayload(draft: QuoteDraft) {
  const input = draftToInput(draft);
  const fx = draftFx(draft);
  return {
    ...input,
    title: draft.title.trim(),
    status: draft.status,
    clientName: draft.clientName.trim() || null,
    businessId: draft.businessId || null,
    notes: draft.notes.trim() || null,
    validUntil: draft.validUntil || null,
    comparisonCurrency: fx.comparisonCurrency,
    fxLocalPerComparison: fx.localPerComparison,
    fxLocalPerUsd: fx.localPerUsd,
    fxRateSource: draft.fxRateSource,
    fxRateAsOf: draft.fxRateAsOf,
  };
}

export type DraftFxFields = Pick<QuoteDraft, "fxLocalPerComparison" | "fxLocalPerUsd" | "fxRateSource" | "fxRateAsOf">;

/**
 * The FX fields for a quote's currency and comparison from a live rates
 * response; null when the provider has no rate for the pair (the USD rate for
 * the fixed fees is filled whenever the provider knows the local currency).
 */
export function fxFieldsFor(fx: FxRatesResponse | null | undefined, currency: string, comparisonCurrency: string): DraftFxFields | null {
  if (!fx) return null;
  const usd = crossRate(fx.rates, currency, "USD");
  if (!comparisonCurrency) {
    if (usd == null && (currency || "").toUpperCase() !== "USD") return null;
    return { fxLocalPerComparison: "", fxLocalPerUsd: usd != null ? String(usd) : "", fxRateSource: "open.er-api.com", fxRateAsOf: fx.asOf };
  }
  const cmp = crossRate(fx.rates, currency, comparisonCurrency);
  if (cmp == null) return null;
  return { fxLocalPerComparison: String(cmp), fxLocalPerUsd: usd != null ? String(usd) : "", fxRateSource: "open.er-api.com", fxRateAsOf: fx.asOf };
}

/** Everything that must be present before a save; returns the first problem. */
export function draftProblem(draft: QuoteDraft): string | null {
  if (!draft.countryId) return "Pick a country.";
  if (!draft.title.trim()) return "Give the quote a title.";
  if (!(num(draft.rate) > 0)) return "Enter the pay rate.";
  if (draft.comparisonCurrency && !(num(draft.fxLocalPerComparison) > 0)) {
    return `Enter the exchange rate (${draft.currency} per 1 ${draft.comparisonCurrency}).`;
  }
  const fixedFee = draft.feeLines.some((l) => l.applies && l.lineType === "fixed_amount" && (l.amountUsd ?? 0) > 0);
  if (fixedFee && needsSeparateUsdRate(draft) && !(num(draft.fxLocalPerUsd) > 0)) {
    return "Enter the USD exchange rate used for the fixed SDP fees.";
  }
  if (draft.rateType === "hourly" && !(num(draft.hoursPerWeek) > 0)) return "Enter hours per week.";
  if (draft.rateType === "daily" && !(num(draft.daysPerWeek) > 0)) return "Enter days per week.";
  if (draft.rateType !== "annual" && !(num(draft.weeksPerYear) > 0)) return "Enter weeks per year.";
  if (draft.costLines.some((l) => !l.name.trim())) return "Every cost item needs a name.";
  if (draft.feeLines.some((l) => !l.description.trim())) return "Every fee line needs a description.";
  return null;
}
