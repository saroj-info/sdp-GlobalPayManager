/**
 * Quotes orchestration: defaults for a country / category (Cost Settings items
 * + states + fee schedule + FX), validated saves with the totals snapshot
 * recomputed by the shared engine, duplicate, delete, the admin fee schedule,
 * sending a quote by email, the client's answer from the email link, and the
 * convert-to-contract bookkeeping. `createQuotesService(deps)` keeps it
 * testable without a DB.
 *
 * Send / answer, in short: `send` writes the recipient, a hashed single-use
 * token, `status = 'sent'` and `sentAt = updatedAt` BEFORE emailing, and puts
 * the previous values back when the email fails (502 EMAIL_SEND_FAILED). The
 * public page looks the token up (`getResponsePage`, never a write), answers
 * with `respond` (one conditional UPDATE: the double-click lock, and refused
 * when the quote was edited after it was sent — the editor's save stamps
 * `updatedAt`, so `updatedAt > sentAt` means the client's PDF is stale) and may
 * add feedback once after an acceptance. Every answer emails the SDP user who
 * sent the quote (fallback SDP_NOTIFY_EMAIL).
 */
import { storage } from "../../storage";
import { emailService } from "../../emailService";
import { fxService, type FxResult } from "../fx";
import { countryCostsRepository, toCostItem } from "../countryCosts";
import { repository as defaultRepository, type QuotesRepository, type NewQuoteRow, type QuoteUpdateRow } from "./repository";
import { generateResponseToken, hashResponseToken, isResponseTokenShape } from "./tokens";
import type { AuthUser, QuoteEmailArgs, QuoteListQuery, QuoteResponseEmailArgs, Result } from "./types";
import type { Country, Quote, QuoteFeeDefault } from "@shared/schema";
import { jurisdictionsOf, type CountryCostItem } from "@shared/countryCosts";
import {
  QUOTE_ENGAGEMENT_CATEGORIES,
  QUOTE_INTERNAL_KEYS,
  QUOTE_RESPONSE_TTL_DAYS,
  QUOTE_SEND_DEFAULT_MESSAGE,
  buildDefaultCostLines,
  computeQuote,
  contractorComplianceForCategory,
  feeDefaultsToLines,
  normaliseStoredQuote,
  quoteFeedbackSchema,
  quoteResponseSchema,
  resolveQuoteBillingMode,
  saveQuoteFeeDefaultsSchema,
  saveQuoteSchema,
  type PublicQuote,
  type QuoteDefaultsResponse,
  type QuoteEngagementCategory,
  type QuoteFx,
  type QuoteInput,
  type QuoteResponseAction,
  type QuoteResponsePageData,
  type QuoteResponseState,
  type SaveQuoteInput,
  type SendQuoteInput,
} from "@shared/quotes";

export interface QuotesDeps {
  repo: QuotesRepository;
  getCountries: () => Promise<Country[]>;
  /** Active Cost Settings items of a country (country-wide and every state). */
  getCostItems: (countryId: string) => Promise<CountryCostItem[]>;
  getUsdRates: () => Promise<FxResult>;
  now: () => Date;
  /** The SDP user who sent a quote, for the answer notification. */
  getUser: (id: string) => Promise<{ email?: string | null } | undefined>;
  /** Both return false (never throw) when the email did not go out, like `emailService.sendEmail`. */
  sendQuoteEmail: (args: QuoteEmailArgs) => Promise<boolean>;
  sendQuoteResponseEmail: (args: QuoteResponseEmailArgs) => Promise<boolean>;
  newToken: () => string;
  hashToken: (raw: string) => string;
  /** Where an answer goes when the sender has no email address. */
  notifyFallbackEmail: () => string;
}

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (status: number, code: string, message: string, extra?: Record<string, unknown>): Result<never> => ({ ok: false, status, message, code, extra });

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `validUntil` is stored as UTC midnight of a YYYY-MM-DD; the quote is valid through that day. */
function endOfValidity(validUntil: Date | null): Date | null {
  return validUntil ? new Date(new Date(validUntil).getTime() + DAY_MS) : null;
}

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** The row without the columns the public page must never see. */
export function toPublicQuote(row: Quote): PublicQuote {
  const out: Record<string, unknown> = { ...row };
  for (const key of QUOTE_INTERNAL_KEYS) delete out[key];
  return out as PublicQuote;
}

/** What the SDP app receives: the normalised row; the token hash stays on the server. */
function toClientQuote(row: Quote): Quote {
  return { ...normaliseStoredQuote(row), responseTokenHash: null };
}

type ResponseLookup =
  | { state: "pending"; quote: Quote }
  | { state: Exclude<QuoteResponseState, "pending" | "invalid">; quote: Quote; status: number; code: string; message: string }
  | { state: "invalid"; quote?: undefined; status: 404; code: string; message: string };

const LINK_INVALID: ResponseLookup = {
  state: "invalid",
  status: 404,
  code: "QUOTE_RESPONSE_LINK_INVALID",
  message: "This link is not valid. If you received a newer email about this quote, use the link in that one; otherwise contact SDP Global Pay.",
};

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

  /** Resolves a raw token from an email link to its quote, or says why it cannot act. Never writes. */
  async function lookupResponse(rawToken: string): Promise<ResponseLookup> {
    if (!rawToken || !isResponseTokenShape(rawToken)) return LINK_INVALID;
    const quote = await deps.repo.getByResponseTokenHash(deps.hashToken(rawToken));
    if (!quote || !quote.sentAt) return LINK_INVALID;
    const now = deps.now().getTime();
    if (quote.respondedAt) {
      const verb = quote.responseAction === "declined" ? "declined" : "accepted";
      return {
        state: "responded", quote, status: 409, code: "QUOTE_ALREADY_RESPONDED",
        message: `This quote was already ${verb} on ${formatDateTime(quote.respondedAt)}.`,
      };
    }
    if (quote.responseTokenExpiresAt && new Date(quote.responseTokenExpiresAt).getTime() < now) {
      return {
        state: "expired", quote, status: 410, code: "QUOTE_RESPONSE_LINK_EXPIRED",
        message: "This link has expired. Contact SDP Global Pay for an updated quote.",
      };
    }
    if (quote.convertedContractId || new Date(quote.updatedAt).getTime() > new Date(quote.sentAt).getTime()) {
      return {
        state: "superseded", quote, status: 409, code: "QUOTE_SUPERSEDED",
        message: "This quote was updated after it was sent, so this link no longer applies. Contact SDP Global Pay for a new link.",
      };
    }
    return { state: "pending", quote };
  }

  async function pageData(found: ResponseLookup): Promise<QuoteResponsePageData> {
    if (found.state === "invalid") return { state: "invalid", code: found.code, message: found.message };
    const quote = found.quote;
    const country = await findCountry(quote.countryId);
    return {
      state: found.state,
      code: found.state === "pending" ? undefined : found.code,
      message: found.state === "pending" ? undefined : found.message,
      quote: toPublicQuote(normaliseStoredQuote(quote)),
      countryName: country?.name ?? quote.countryId,
      response: quote.respondedAt && quote.responseAction
        ? { action: quote.responseAction as QuoteResponseAction, respondedAt: new Date(quote.respondedAt).toISOString(), feedbackGiven: !!quote.responseFeedbackAt }
        : undefined,
      expiresAt: quote.responseTokenExpiresAt ? new Date(quote.responseTokenExpiresAt).toISOString() : null,
    };
  }

  /** Tells the SDP user who sent the quote. Best effort: logged, never surfaced to the client. */
  async function notifySender(quote: Quote, args: Omit<QuoteResponseEmailArgs, "to" | "quote">): Promise<void> {
    try {
      const sender = quote.sentByUserId ? await deps.getUser(quote.sentByUserId) : undefined;
      const to = sender?.email?.trim() || deps.notifyFallbackEmail();
      const sent = await deps.sendQuoteResponseEmail({ ...args, to, quote: toPublicQuote(normaliseStoredQuote(quote)) });
      if (!sent) console.error(`[quotes] ${args.kind} notification for ${quote.quoteNumber} not sent to ${to}`);
    } catch (error: any) {
      console.error(`[quotes] ${args.kind} notification for ${quote.quoteNumber} failed:`, error?.message ?? String(error));
    }
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
      return ok({ items: items.map(toClientQuote), total, page: query.page, pageSize: query.pageSize });
    },

    async get(id: string): Promise<Result<Quote>> {
      const quote = await deps.repo.getById(id);
      if (!quote) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(toClientQuote(quote));
    },

    async create(user: AuthUser, body: unknown): Promise<Result<Quote>> {
      const valid = validate(body);
      if (!valid.ok) return valid;
      const country = await findCountry(valid.data.countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const row = buildRow(valid.data, country, user.id);
      const created = await deps.repo.insert(row, deps.now().getFullYear());
      return ok(toClientQuote(created));
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
      // A save never undoes what the send / answer flow recorded: an editor
      // still showing "Draft" or "Sent" must not overwrite the client's answer,
      // and "Draft" must not take a sent quote back. An explicit Accepted /
      // Declined picked by SDP still applies.
      const bodyStatus = valid.data.status;
      if (existing.respondedAt && (bodyStatus === "draft" || bodyStatus === "sent")) patch.status = existing.status;
      else if (existing.sentAt && bodyStatus === "draft") patch.status = existing.status;
      const updated = await deps.repo.update(id, patch);
      if (!updated) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      return ok(toClientQuote(updated));
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
      // The copy is a fresh draft: no number, no send round, no answer (the
      // token hash is unique, so copying it would fail the insert anyway).
      const {
        id: _id, quoteNumber: _n, quoteYear: _y, quoteSeq: _s, createdAt: _c, updatedAt: _u, createdByUserId: _by,
        sentTo: _st, sentAt: _sa, sentByUserId: _sb, responseTokenHash: _th, responseTokenExpiresAt: _te,
        respondedAt: _ra, responseAction: _rac, responseNote: _rn, responseFeedback: _rf, responseFeedbackAt: _rfa,
        ...rest
      } = normalised;
      void _id; void _n; void _y; void _s; void _c; void _u; void _by;
      void _st; void _sa; void _sb; void _th; void _te; void _ra; void _rac; void _rn; void _rf; void _rfa;
      const row: NewQuoteRow = {
        ...rest,
        title: `${source.title} (copy)`.slice(0, 160),
        status: "draft",
        convertedContractId: null,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      };
      const created = await deps.repo.insert(row, deps.now().getFullYear());
      return ok(toClientQuote(created));
    },

    // ── Send by email ──────────────────────────────────────────────────────

    /**
     * Stores the send round, then emails the PDF (built by the client) with the
     * Accept / Reject links. A failed email puts the previous values back and
     * answers 502, so the row never claims a send that did not happen.
     */
    async send(user: AuthUser, id: string, input: SendQuoteInput & { pdf: Buffer; baseUrl: string }): Promise<Result<Quote>> {
      const existing = await deps.repo.getById(id);
      if (!existing) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
      if (existing.convertedContractId) {
        return fail(409, "QUOTE_CONVERTED", "This quote has been converted to a contract and can no longer be sent for acceptance.");
      }
      const now = deps.now();
      const validUntilEnd = endOfValidity(existing.validUntil);
      if (validUntilEnd && validUntilEnd.getTime() < now.getTime()) {
        return fail(409, "QUOTE_EXPIRED", "This quote's \"Valid until\" date has passed. Update it before sending.");
      }
      const expiresAt = validUntilEnd ?? new Date(now.getTime() + QUOTE_RESPONSE_TTL_DAYS * DAY_MS);
      const to = input.to.trim().toLowerCase();
      const message = input.message?.trim() || QUOTE_SEND_DEFAULT_MESSAGE;
      const rawToken = deps.newToken();

      const previous: QuoteUpdateRow = {
        sentTo: existing.sentTo,
        sentAt: existing.sentAt,
        sentByUserId: existing.sentByUserId,
        responseTokenHash: existing.responseTokenHash,
        responseTokenExpiresAt: existing.responseTokenExpiresAt,
        respondedAt: existing.respondedAt,
        responseAction: existing.responseAction,
        responseNote: existing.responseNote,
        responseFeedback: existing.responseFeedback,
        responseFeedbackAt: existing.responseFeedbackAt,
        status: existing.status,
        updatedAt: existing.updatedAt,
      };
      const updated = await deps.repo.update(id, {
        sentTo: to,
        sentAt: now,
        sentByUserId: user.id,
        responseTokenHash: deps.hashToken(rawToken),
        responseTokenExpiresAt: expiresAt,
        respondedAt: null,
        responseAction: null,
        responseNote: null,
        responseFeedback: null,
        responseFeedbackAt: null,
        status: "sent",
        updatedAt: now, // same instant as sentAt: a later edit makes updatedAt > sentAt (see lookupResponse)
      });
      if (!updated) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");

      const country = await findCountry(existing.countryId);
      const base = input.baseUrl.replace(/\/+$/, "");
      let sent = false;
      try {
        sent = await deps.sendQuoteEmail({
          to,
          message,
          quote: toPublicQuote(normaliseStoredQuote(updated)),
          countryName: country?.name ?? existing.countryId,
          pdf: input.pdf,
          acceptUrl: `${base}/quote-response/${rawToken}?action=accept`,
          rejectUrl: `${base}/quote-response/${rawToken}?action=reject`,
          reviewUrl: `${base}/quote-response/${rawToken}`,
          expiresAt,
        });
      } catch (error: any) {
        console.error(`[quotes] send email for ${existing.quoteNumber} threw:`, error?.message ?? String(error));
        sent = false;
      }
      if (!sent) {
        await deps.repo.update(id, previous);
        console.error(`[quotes] quote ${existing.quoteNumber} email not sent to ${to}; send round rolled back`);
        return fail(502, "EMAIL_SEND_FAILED", "The quote email could not be sent, so nothing was changed. Check the email settings and try again.");
      }
      return ok(toClientQuote(updated));
    },

    // ── The client's answer (public, by token) ─────────────────────────────

    /** What the public page shows. Never changes state (mail scanners open links). */
    async getResponsePage(rawToken: string): Promise<Result<QuoteResponsePageData>> {
      const found = await lookupResponse(rawToken);
      if (found.state === "invalid") return fail(404, found.code, found.message, { state: "invalid" });
      return ok(await pageData(found));
    },

    async respond(rawToken: string, body: unknown, baseUrl: string): Promise<Result<{ action: QuoteResponseAction; respondedAt: string }>> {
      const parsed = quoteResponseSchema.safeParse(body ?? {});
      if (!parsed.success) return fail(400, "QUOTE_RESPONSE_INVALID", parsed.error.issues[0]?.message ?? "Choose Accept or Reject.");
      const found = await lookupResponse(rawToken);
      if (found.state !== "pending") return fail(found.status, found.code, found.message, { state: found.state });

      const now = deps.now();
      const action: QuoteResponseAction = parsed.data.action === "accept" ? "accepted" : "declined";
      const note = parsed.data.note?.trim() || null;
      const written = await deps.repo.respond(found.quote.id, deps.hashToken(rawToken), {
        status: action,
        respondedAt: now,
        responseAction: action,
        responseNote: note,
      });
      if (!written) {
        // A second click, or an SDP edit / conversion that landed in between.
        const again = await lookupResponse(rawToken);
        if (again.state !== "pending") return fail(again.status, again.code, again.message, { state: again.state });
        return fail(409, "QUOTE_RESPONSE_CONFLICT", "Your answer could not be recorded. Please reload the page and try again.", { state: "pending" });
      }

      await notifySender(written, {
        kind: "decision",
        respondedBy: written.sentTo ?? "",
        action,
        note,
        at: now,
        quoteUrl: `${baseUrl.replace(/\/+$/, "")}/quotes/${written.id}`,
      });
      return ok({ action, respondedAt: now.toISOString() });
    },

    async addFeedback(rawToken: string, body: unknown, baseUrl: string): Promise<Result<{ feedbackAt: string }>> {
      const parsed = quoteFeedbackSchema.safeParse(body ?? {});
      if (!parsed.success) return fail(400, "QUOTE_FEEDBACK_INVALID", parsed.error.issues[0]?.message ?? "Write a few words first.");
      const found = await lookupResponse(rawToken);
      if (found.state === "invalid" || found.state === "expired") return fail(found.status, found.code, found.message, { state: found.state });
      if (found.state !== "responded" || found.quote.responseAction !== "accepted") {
        return fail(409, "QUOTE_FEEDBACK_NOT_OPEN", "Feedback can be added after the quote has been accepted.", { state: found.state });
      }
      if (found.quote.responseFeedbackAt) {
        return fail(409, "QUOTE_FEEDBACK_GIVEN", "Thank you — your feedback was already received.", { state: found.state });
      }
      const now = deps.now();
      const written = await deps.repo.addFeedback(found.quote.id, deps.hashToken(rawToken), {
        responseFeedback: parsed.data.feedback,
        responseFeedbackAt: now,
      });
      if (!written) return fail(409, "QUOTE_FEEDBACK_GIVEN", "Thank you — your feedback was already received.", { state: "responded" });

      await notifySender(written, {
        kind: "feedback",
        respondedBy: written.sentTo ?? "",
        action: "accepted",
        feedback: parsed.data.feedback,
        at: now,
        quoteUrl: `${baseUrl.replace(/\/+$/, "")}/quotes/${written.id}`,
      });
      return ok({ feedbackAt: now.toISOString() });
    },

    // ── Convert to contract (called from POST /api/contracts) ──────────────

    /** Checked before the contract handler writes anything. */
    async assertConvertible(id: string): Promise<Result<Quote>> {
      const quote = await deps.repo.getById(id);
      if (!quote) return fail(404, "QUOTE_NOT_FOUND", "The quote this contract is based on no longer exists.");
      if (quote.convertedContractId) return fail(409, "QUOTE_ALREADY_CONVERTED", `Quote ${quote.quoteNumber} has already been converted to a contract.`);
      return ok(quote);
    },

    /** Links the quote to the contract created from it. `updatedAt` is left alone on purpose (see lookupResponse). */
    async markConverted(id: string, contractId: string): Promise<Quote | undefined> {
      return deps.repo.update(id, { convertedContractId: contractId });
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
  getUser: (id) => storage.getUser(id),
  sendQuoteEmail: (args) => emailService.sendQuoteEmail(args),
  sendQuoteResponseEmail: (args) => emailService.sendQuoteResponseEmail(args),
  newToken: generateResponseToken,
  hashToken: hashResponseToken,
  notifyFallbackEmail: () => process.env.SDP_NOTIFY_EMAIL || "onboard@sdpglobalpay.com",
});
