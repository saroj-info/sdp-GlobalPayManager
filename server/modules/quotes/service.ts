/**
 * Quotes orchestration: defaults for a country / category (Cost Settings items
 * + states + fee schedule + FX), validated saves with the totals snapshot
 * recomputed by the shared engine, duplicate, delete, and the admin fee
 * schedule. `createQuotesService(deps)` keeps it testable without a DB.
 */
import { storage } from "../../storage";
import { fxService, type FxResult } from "../fx";
import { countryCostsRepository, toCostItem } from "../countryCosts";
import { repository as defaultRepository, type QuotesRepository, type NewQuoteRow, type QuoteUpdateRow } from "./repository";
import type { AuthUser, QuoteListQuery, Result } from "./types";
import type { Country, Quote, QuoteFeeDefault } from "@shared/schema";
import { jurisdictionsOf, type CountryCostItem } from "@shared/countryCosts";
import {
  QUOTE_ENGAGEMENT_CATEGORIES,
  buildDefaultCostLines,
  computeQuote,
  contractorComplianceForCategory,
  feeDefaultsToLines,
  normaliseStoredQuote,
  resolveQuoteBillingMode,
  saveQuoteFeeDefaultsSchema,
  saveQuoteSchema,
  type QuoteDefaultsResponse,
  type QuoteEngagementCategory,
  type QuoteFx,
  type QuoteInput,
  type SaveQuoteInput,
} from "@shared/quotes";

export interface QuotesDeps {
  repo: QuotesRepository;
  getCountries: () => Promise<Country[]>;
  /** Active Cost Settings items of a country (country-wide and every state). */
  getCostItems: (countryId: string) => Promise<CountryCostItem[]>;
  getUsdRates: () => Promise<FxResult>;
  now: () => Date;
}

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (status: number, code: string, message: string, extra?: Record<string, unknown>): Result<never> => ({ ok: false, status, message, code, extra });

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function createQuotesService(deps: QuotesDeps) {
  async function findCountry(countryId: string): Promise<Country | undefined> {
    const all = await deps.getCountries();
    return all.find((c) => c.id === countryId);
  }

  function toQuoteInput(input: SaveQuoteInput, currency: string): QuoteInput {
    return {
      countryId: input.countryId,
      currency,
      engagementCategory: input.engagementCategory,
      employmentType: input.employmentType,
      isForClient: input.isForClient,
      sdpIsBillingAgent: input.isForClient ? input.sdpIsBillingAgent : false,
      rateType: input.rateType,
      rate: input.rate,
      hoursPerWeek: input.hoursPerWeek,
      daysPerWeek: input.daysPerWeek,
      weeksPerYear: input.weeksPerYear,
      jurisdiction: input.jurisdiction || null,
      rateIncludesOnCosts: input.rateIncludesOnCosts,
      costLines: input.costLines,
      feeLines: input.feeLines,
    };
  }

  /** The rates a save is computed and stored with. A USD comparison doubles as the fee rate; a USD quote needs none. */
  function resolveFx(input: SaveQuoteInput, currency: string): QuoteFx {
    const local = currency.toUpperCase();
    const comparisonCurrency = input.comparisonCurrency && input.comparisonCurrency !== local ? input.comparisonCurrency : null;
    const localPerComparison = comparisonCurrency && input.fxLocalPerComparison && input.fxLocalPerComparison > 0 ? input.fxLocalPerComparison : null;
    let localPerUsd: number | null = input.fxLocalPerUsd && input.fxLocalPerUsd > 0 ? input.fxLocalPerUsd : null;
    if (local === "USD") localPerUsd = 1;
    else if (comparisonCurrency === "USD" && localPerComparison) localPerUsd = localPerComparison;
    return { comparisonCurrency, localPerComparison, localPerUsd };
  }

  function buildRow(input: SaveQuoteInput, country: Country, userId: string): NewQuoteRow {
    const quoteInput = toQuoteInput(input, country.currency);
    const fx = resolveFx(input, country.currency);
    const result = computeQuote(quoteInput, fx);
    return {
      title: input.title,
      status: input.status,
      countryId: country.id,
      currency: country.currency,
      jurisdiction: quoteInput.jurisdiction,
      engagementCategory: quoteInput.engagementCategory,
      employmentType: quoteInput.employmentType as NewQuoteRow["employmentType"],
      contractorCompliance: contractorComplianceForCategory(quoteInput.engagementCategory),
      isForClient: quoteInput.isForClient,
      billingMode: resolveQuoteBillingMode(quoteInput.isForClient, quoteInput.sdpIsBillingAgent),
      sdpIsBillingAgent: quoteInput.sdpIsBillingAgent,
      rateType: quoteInput.rateType,
      rate: String(quoteInput.rate),
      hoursPerWeek: String(quoteInput.hoursPerWeek),
      daysPerWeek: quoteInput.daysPerWeek,
      weeksPerYear: quoteInput.weeksPerYear,
      rateIncludesOnCosts: quoteInput.rateIncludesOnCosts,
      comparisonCurrency: fx.comparisonCurrency,
      fxLocalPerComparison: fx.localPerComparison != null ? String(fx.localPerComparison) : null,
      fxLocalPerUsd: fx.localPerUsd != null ? String(fx.localPerUsd) : null,
      fxRateSource: input.fxRateSource,
      fxRateAsOf: parseDate(input.fxRateAsOf),
      costLines: quoteInput.costLines,
      feeLines: quoteInput.feeLines,
      totals: result.totals,
      notes: input.notes?.trim() ? input.notes : null,
      clientName: input.clientName?.trim() ? input.clientName.trim() : null,
      businessId: input.businessId || null,
      validUntil: parseDate(input.validUntil),
      createdByUserId: userId,
      updatedByUserId: userId,
    };
  }

  function validate(body: unknown): Result<SaveQuoteInput> {
    const parsed = saveQuoteSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      return fail(400, "QUOTE_INVALID", issues[0] ? `${issues[0].path || "quote"}: ${issues[0].message}` : "Invalid quote", { issues });
    }
    return ok(parsed.data);
  }

  return {
    async getDefaults(args: {
      countryId: string;
      category: string;
      billingAgent: boolean;
      jurisdiction: string | null;
    }): Promise<Result<QuoteDefaultsResponse>> {
      if (!(QUOTE_ENGAGEMENT_CATEGORIES as readonly string[]).includes(args.category)) {
        return fail(400, "QUOTE_INVALID", "Unknown engagement category");
      }
      const category = args.category as QuoteEngagementCategory;
      const country = await findCountry(args.countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");

      const items = await deps.getCostItems(country.id);
      const jurisdictions = jurisdictionsOf(items);
      const costLines = buildDefaultCostLines({ items, category, jurisdiction: args.jurisdiction });
      const feeRows = (await deps.repo.listFeeDefaults()).filter(
        (r) => r.isActive && r.engagementCategory === category && r.sdpIsBillingAgent === args.billingAgent,
      );
      const feeLines = feeDefaultsToLines(
        feeRows.map((r) => ({
          id: r.id,
          description: r.description,
          lineType: r.lineType as "percentage_of_pay" | "fixed_amount",
          rate: r.rate != null ? Number(r.rate) : null,
          amountUsd: r.amountUsd != null ? Number(r.amountUsd) : null,
          paidBy: r.paidBy as "business" | "host_client",
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        })),
      );
      const fx = await deps.getUsdRates();
      return ok({
        country: { id: country.id, name: country.name, code: country.code, currency: country.currency },
        jurisdictions,
        costLines,
        feeLines,
        fx: fx.ok ? fx.data : null,
        costItemsConfigured: items.length > 0,
      });
    },

    async list(query: QuoteListQuery): Promise<Result<{ items: Quote[]; total: number; page: number; pageSize: number }>> {
      const { items, total } = await deps.repo.list(query);
      return ok({ items: items.map((q) => normaliseStoredQuote(q)), total, page: query.page, pageSize: query.pageSize });
    },

    async get(id: string): Promise<Result<Quote>> {
      const quote = await deps.repo.getById(id);
      if (!quote) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(normaliseStoredQuote(quote));
    },

    async create(user: AuthUser, body: unknown): Promise<Result<Quote>> {
      const valid = validate(body);
      if (!valid.ok) return valid;
      const country = await findCountry(valid.data.countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const row = buildRow(valid.data, country, user.id);
      const created = await deps.repo.insert(row, deps.now().getFullYear());
      return ok(normaliseStoredQuote(created));
    },

    async update(user: AuthUser, id: string, body: unknown): Promise<Result<Quote>> {
      const existing = await deps.repo.getById(id);
      if (!existing) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      const valid = validate(body);
      if (!valid.ok) return valid;
      const country = await findCountry(valid.data.countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const { createdByUserId, ...rest } = buildRow(valid.data, country, user.id);
      void createdByUserId;
      const patch: QuoteUpdateRow = { ...rest, updatedAt: deps.now() };
      const updated = await deps.repo.update(id, patch);
      if (!updated) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(normaliseStoredQuote(updated));
    },

    async remove(id: string): Promise<Result<null>> {
      const deleted = await deps.repo.delete(id);
      if (!deleted) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(null);
    },

    async duplicate(user: AuthUser, id: string): Promise<Result<Quote>> {
      const source = await deps.repo.getById(id);
      if (!source) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      const normalised = normaliseStoredQuote(source);
      const {
        id: _id, quoteNumber: _n, quoteYear: _y, quoteSeq: _s, createdAt: _c, updatedAt: _u, createdByUserId: _by, ...rest
      } = normalised;
      void _id; void _n; void _y; void _s; void _c; void _u; void _by;
      const row: NewQuoteRow = {
        ...rest,
        title: `${source.title} (copy)`.slice(0, 160),
        status: "draft",
        convertedContractId: null,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      };
      const created = await deps.repo.insert(row, deps.now().getFullYear());
      return ok(normaliseStoredQuote(created));
    },

    async getFeeDefaults(): Promise<Result<QuoteFeeDefault[]>> {
      return ok(await deps.repo.listFeeDefaults());
    },

    async saveFeeDefaults(user: AuthUser, body: unknown): Promise<Result<QuoteFeeDefault[]>> {
      const parsed = saveQuoteFeeDefaultsSchema.safeParse(body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return fail(400, "FEE_DEFAULTS_INVALID", issues[0] ? `${issues[0].path || "items"}: ${issues[0].message}` : "Invalid fee defaults", { issues });
      }
      const rows = parsed.data.items.map((item) => ({
        engagementCategory: item.engagementCategory,
        sdpIsBillingAgent: item.sdpIsBillingAgent,
        description: item.description,
        lineType: item.lineType,
        rate: item.rate != null ? String(item.rate) : null,
        amountUsd: item.amountUsd != null ? String(item.amountUsd) : null,
        paidBy: item.paidBy,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
        updatedByUserId: user.id,
      }));
      return ok(await deps.repo.replaceFeeDefaults(rows));
    },
  };
}

export type QuotesService = ReturnType<typeof createQuotesService>;

export const quotesService: QuotesService = createQuotesService({
  repo: defaultRepository,
  getCountries: () => storage.getAllCountries(),
  getCostItems: async (countryId) => (await countryCostsRepository.listForCountry(countryId, false)).map(toCostItem),
  getUsdRates: () => fxService.getUsdRates(),
  now: () => new Date(),
});
