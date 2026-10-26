/**
 * Quotes orchestration: defaults for a country / category (cost data +
 * jurisdictions + fee schedule + FX), validated saves with the totals snapshot
 * recomputed by the shared engine, duplicate, delete, and the admin fee
 * schedule. `createQuotesService(deps)` keeps it testable without a DB.
 */
import { storage } from "../../storage";
import { fxService, type FxResult } from "../fx";
import { repository as defaultRepository, type QuotesRepository, type NewQuoteRow, type QuoteUpdateRow } from "./repository";
import type { AuthUser, QuoteListQuery, Result } from "./types";
import type { Country, Quote, QuoteFeeDefault, SelectJurisdictionType } from "@shared/schema";
import { canonicaliseCountry, type OnCostItem } from "@shared/countryEmploymentData";
import {
  QUOTE_ENGAGEMENT_CATEGORIES,
  buildDefaultCostLines,
  canonicalCountryForRow,
  computeQuote,
  contractorComplianceForCategory,
  feeDefaultsToLines,
  resolveQuoteBillingMode,
  saveQuoteFeeDefaultsSchema,
  saveQuoteSchema,
  staticJurisdictionLines,
  staticJurisdictionNames,
  type QuoteDefaultsResponse,
  type QuoteEngagementCategory,
  type QuoteInput,
  type SaveQuoteInput,
} from "@shared/quotes";

export interface QuotesDeps {
  repo: QuotesRepository;
  getCountries: () => Promise<Country[]>;
  getJurisdictions: () => Promise<SelectJurisdictionType[]>;
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

function jurisdictionRowToItem(row: SelectJurisdictionType): OnCostItem {
  return {
    id: row.id,
    name: row.name,
    type: row.calculationType as OnCostItem["type"],
    value: Number(row.value) || 0,
    capAmount: row.capAmount != null ? Number(row.capAmount) : undefined,
    thresholdAmount: row.thresholdAmount != null ? Number(row.thresholdAmount) : undefined,
    note: row.note ?? undefined,
  };
}

export function createQuotesService(deps: QuotesDeps) {
  async function findCountry(countryId: string): Promise<Country | undefined> {
    const all = await deps.getCountries();
    return all.find((c) => c.id === countryId);
  }

  /** Jurisdiction names + the selected one's lines: DB rows when the country has any, else the static overlay. */
  async function jurisdictionsFor(canonical: string, jurisdiction: string | null): Promise<{ names: string[]; lines: OnCostItem[] }> {
    const rows = (await deps.getJurisdictions()).filter(
      (r) => r.isActive !== false && canonicaliseCountry(r.countryId) === canonical,
    );
    if (rows.length === 0) {
      return { names: staticJurisdictionNames(canonical), lines: staticJurisdictionLines(canonical, jurisdiction) };
    }
    const names = Array.from(new Set(rows.map((r) => r.stateProvince).filter((s): s is string => !!s))).sort();
    const lines = jurisdiction ? rows.filter((r) => r.stateProvince === jurisdiction).map(jurisdictionRowToItem) : [];
    return { names, lines };
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
      aboveThreshold: input.aboveThreshold,
      costLines: input.costLines,
      feeLines: input.feeLines,
    };
  }

  function buildRow(input: SaveQuoteInput, country: Country, userId: string): NewQuoteRow {
    const quoteInput = toQuoteInput(input, country.currency);
    const result = computeQuote(quoteInput, input.fxLocalPerUsd);
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
      aboveThreshold: quoteInput.aboveThreshold,
      fxLocalPerUsd: String(input.fxLocalPerUsd),
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
      const canonical = canonicalCountryForRow(country);
      if (!canonical) return fail(400, "COUNTRY_UNSUPPORTED", `No employment cost data for ${country.name}`);

      const { names, lines } = await jurisdictionsFor(canonical, args.jurisdiction);
      const costLines = buildDefaultCostLines({ canonicalCountry: canonical, category, jurisdictionLines: lines });
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
        country: { id: country.id, name: country.name, code: country.code, currency: country.currency, canonicalName: canonical },
        jurisdictions: names,
        costLines,
        feeLines,
        fx: fx.ok ? fx.data : null,
      });
    },

    async list(query: QuoteListQuery): Promise<Result<{ items: Quote[]; total: number; page: number; pageSize: number }>> {
      const { items, total } = await deps.repo.list(query);
      return ok({ items, total, page: query.page, pageSize: query.pageSize });
    },

    async get(id: string): Promise<Result<Quote>> {
      const quote = await deps.repo.getById(id);
      if (!quote) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(quote);
    },

    async create(user: AuthUser, body: unknown): Promise<Result<Quote>> {
      const valid = validate(body);
      if (!valid.ok) return valid;
      const country = await findCountry(valid.data.countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const row = buildRow(valid.data, country, user.id);
      const created = await deps.repo.insert(row, deps.now().getFullYear());
      return ok(created);
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
      return ok(updated);
    },

    async remove(id: string): Promise<Result<null>> {
      const deleted = await deps.repo.delete(id);
      if (!deleted) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(null);
    },

    async duplicate(user: AuthUser, id: string): Promise<Result<Quote>> {
      const source = await deps.repo.getById(id);
      if (!source) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      const {
        id: _id, quoteNumber: _n, quoteYear: _y, quoteSeq: _s, createdAt: _c, updatedAt: _u, createdByUserId: _by, ...rest
      } = source;
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
      return ok(created);
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
  getJurisdictions: () => storage.getJurisdictions(),
  getUsdRates: () => fxService.getUsdRates(),
  now: () => new Date(),
});
