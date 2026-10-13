/**
 * SDP Billing Terms service: current rendered terms, the create/update checks
 * called from the contract routes, recording an acceptance, and the admin
 * draft/publish flow. Built through a factory so the logic can be exercised
 * without a database (stand-in repository and lookups).
 */
import { createHash } from "node:crypto";
import {
  billingTermsAcceptanceSchema,
  renderBillingTerms,
  requiresBillingTerms,
  SAMPLE_BILLING_TERMS_PLACEHOLDERS,
  type BillingTermsAcceptanceInput,
  type BillingTermsAcceptanceView,
  type BillingTermsPlaceholders,
} from "@shared/billingTerms";
import type { BillingTermsVersion, Business, Country, ContractBillingTermsAcceptance } from "@shared/schema";
import { storage } from "../../storage";
import { repository, type BillingTermsRepository } from "./repository";
import type { AcceptanceContext, AcceptanceRow, RenderedTerms, Result, ValidatedAcceptance } from "./types";

export interface BillingTermsDeps {
  repo: BillingTermsRepository;
  getBusinessById(id: string): Promise<Business | undefined>;
  getCountryById(id: string): Promise<Country | undefined>;
  now?: () => Date;
}

export const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

const fail = (status: number, message: string, code?: string, extra?: Record<string, unknown>): Result<never> =>
  ({ ok: false, status, message, code, extra });

export function createBillingTermsService(deps: BillingTermsDeps) {
  const now = deps.now ?? (() => new Date());

  async function buildPlaceholders(businessId: string, countryId: string | null | undefined): Promise<BillingTermsPlaceholders> {
    const [business, country] = await Promise.all([
      deps.getBusinessById(businessId),
      countryId ? deps.getCountryById(countryId) : Promise.resolve(undefined),
    ]);
    const addressParts = country
      ? [country.streetAddress, country.city, country.stateProvince, country.postalCode, country.country || country.name].filter(Boolean)
      : [];
    return {
      businessName: business?.name ?? 'the Business',
      sdpEntityName: country?.companyName ?? 'SDP Global Pay',
      sdpEntityAddress: addressParts.join(', '),
      countryName: country?.name ?? '',
      countryCode: (country?.code ?? '').toUpperCase(),
      currency: country?.currency ?? '',
      today: now().toISOString().slice(0, 10),
    };
  }

  function render(version: BillingTermsVersion, placeholders: BillingTermsPlaceholders): RenderedTerms {
    const text = renderBillingTerms(version.bodyTemplate, placeholders);
    return {
      versionId: version.id,
      versionNumber: version.versionNumber,
      title: version.title,
      text,
      hash: sha256(text),
      publishedAt: version.publishedAt ? new Date(version.publishedAt).toISOString() : null,
      placeholders,
    };
  }

  async function getCurrentRenderedTerms(businessId: string, countryId: string | null | undefined): Promise<Result<RenderedTerms>> {
    const published = await deps.repo.getPublishedVersion();
    if (!published) return fail(404, "SDP has not published its billing terms yet.", 'BILLING_TERMS_NOT_PUBLISHED');
    return { ok: true, data: render(published, await buildPlaceholders(businessId, countryId)) };
  }

  const notPublishedMessage = (callerUserType: string) =>
    callerUserType === 'sdp_internal'
      ? "SDP's billing terms have not been published. Publish them under Templates → System Settings before using this billing option."
      : "SDP has not published its billing terms yet, so this billing option cannot be used. Contact SDP, or choose Invoice Separately.";

  /**
   * Validates an acceptance payload against the published version and the
   * caller's role. A missing payload is a *skip*: allowed, returns `data: null`
   * (the contract saves and shows a pending reminder until accepted later).
   */
  async function validateAcceptance(acceptanceRaw: unknown, callerUserType: string): Promise<Result<ValidatedAcceptance | null>> {
    if (acceptanceRaw === undefined || acceptanceRaw === null) return { ok: true, data: null };

    const published = await deps.repo.getPublishedVersion();
    if (!published) return fail(409, notPublishedMessage(callerUserType), 'BILLING_TERMS_NOT_PUBLISHED');
    const extra = { currentVersionId: published.id, currentVersionNumber: published.versionNumber };

    const parsed = billingTermsAcceptanceSchema.safeParse(acceptanceRaw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(400, issue?.message || "Invalid billing terms acceptance.", 'BILLING_TERMS_INVALID');
    }
    const input = parsed.data;
    const expectedMethod = callerUserType === 'sdp_internal' ? 'sdp_offline' : callerUserType === 'business_user' ? 'in_app' : null;
    if (!expectedMethod || input.method !== expectedMethod) {
      return fail(400, expectedMethod
        ? `Billing terms must be accepted ${expectedMethod === 'in_app' ? 'in the app by the business user' : 'as an offline acceptance recorded by SDP'}.`
        : "Your account cannot accept billing terms.", 'BILLING_TERMS_INVALID');
    }
    if (input.termsVersionId !== published.id) {
      return fail(409, "SDP's billing terms were updated. Please review and accept the current version.", 'BILLING_TERMS_OUTDATED', extra);
    }
    return { ok: true, data: { input, version: published } };
  }

  async function checkBillingTermsForCreate(args: {
    billingMode: string | null | undefined;
    isForClient: boolean | null | undefined;
    acceptanceRaw: unknown;
    callerUserType: string;
  }): Promise<Result<ValidatedAcceptance | null>> {
    if (!requiresBillingTerms(args.billingMode, args.isForClient)) return { ok: true, data: null };
    return validateAcceptance(args.acceptanceRaw, args.callerUserType);
  }

  /**
   * Edit path. An acceptance may be sent whenever the resulting contract needs
   * the terms (moving into a triggering mode, or accepting later on a contract
   * that was skipped). Sending one for a contract that does not need the terms
   * is refused. Not sending one is always allowed.
   */
  async function checkBillingTermsForUpdate(args: {
    before: { billingMode: string | null | undefined; isForClient: boolean | null | undefined };
    after: { billingMode?: string | null; isForClient?: boolean | null };
    acceptanceRaw: unknown;
    callerUserType: string;
  }): Promise<Result<ValidatedAcceptance | null>> {
    if (args.acceptanceRaw === undefined || args.acceptanceRaw === null) return { ok: true, data: null };
    const afterMode = args.after.billingMode === undefined ? args.before.billingMode : args.after.billingMode;
    const afterIsForClient = args.after.isForClient === undefined ? args.before.isForClient : args.after.isForClient;
    if (!requiresBillingTerms(afterMode, afterIsForClient)) {
      return fail(400, "This contract's billing option does not use SDP's billing terms.", 'BILLING_TERMS_INVALID');
    }
    return validateAcceptance(args.acceptanceRaw, args.callerUserType);
  }

  /**
   * Accept later: records an acceptance for an existing contract (from contract
   * details). Refused when the contract does not need the terms or already has
   * an acceptance on file.
   */
  async function acceptForExistingContract(args: {
    contract: { id: string; businessId: string; countryId: string | null; billingMode: string | null; isForClient: boolean | null };
    acceptanceRaw: unknown;
    callerUserType: string;
    callerUserId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<Result<BillingTermsAcceptanceView>> {
    const { contract } = args;
    if (!requiresBillingTerms(contract.billingMode, contract.isForClient)) {
      return fail(400, "This contract's billing option does not use SDP's billing terms.", 'BILLING_TERMS_INVALID');
    }
    const existing = await deps.repo.getLatestAcceptanceForContract(contract.id);
    if (existing) return fail(409, "The billing terms have already been accepted for this contract.", 'BILLING_TERMS_ALREADY_ACCEPTED');
    if (args.acceptanceRaw === undefined || args.acceptanceRaw === null) {
      return fail(400, "An acceptance is required.", 'BILLING_TERMS_INVALID');
    }
    const validated = await validateAcceptance(args.acceptanceRaw, args.callerUserType);
    if (!validated.ok) return validated;
    await recordBillingTermsAcceptance(validated.data!, {
      contractId: contract.id,
      businessId: contract.businessId,
      countryId: contract.countryId,
      billingMode: contract.billingMode as any,
      recordedByUserId: args.callerUserId,
      acceptedByUserId: args.callerUserId,
      ip: args.ip,
      userAgent: args.userAgent,
    });
    const { view } = await getAcceptanceForContract(contract.id);
    return { ok: true, data: view! };
  }

  async function recordBillingTermsAcceptance(validated: ValidatedAcceptance, ctx: AcceptanceContext): Promise<ContractBillingTermsAcceptance> {
    const rendered = render(validated.version, await buildPlaceholders(ctx.businessId, ctx.countryId));
    const input: BillingTermsAcceptanceInput = validated.input;
    const offline = input.method === 'sdp_offline' ? input : null;
    const acceptedAt = offline ? new Date(`${offline.acceptedDate}T00:00:00Z`) : now();
    const row = await deps.repo.insertAcceptance({
      contractId: ctx.contractId,
      businessId: ctx.businessId,
      termsVersionId: validated.version.id,
      termsVersionNumber: validated.version.versionNumber,
      termsText: rendered.text,
      termsHash: rendered.hash,
      billingMode: ctx.billingMode,
      method: input.method,
      acceptedByUserId: input.method === 'in_app' ? ctx.acceptedByUserId : null,
      recordedByUserId: ctx.recordedByUserId,
      acceptedAt,
      ipAddress: ctx.ip ? String(ctx.ip).slice(0, 255) : null,
      userAgent: ctx.userAgent ? String(ctx.userAgent) : null,
      signerName: offline?.signerName ?? null,
      signerEmail: offline?.signerEmail || null,
      signedDocumentPath: input.signedDocumentPath || null,
    });
    const label = `v${validated.version.versionNumber} (${input.method === 'in_app' ? 'in app' : `offline, ${offline?.signerName}`})`;
    try {
      await deps.repo.insertChangeLog({
        contractId: ctx.contractId,
        fieldName: 'billingTermsAccepted',
        oldValue: null,
        newValue: label,
        changedBy: ctx.recordedByUserId,
      });
    } catch (e: any) {
      console.error("[billing-terms] change-log write failed:", e?.message ?? String(e));
    }
    console.log(`[billing-terms] acceptance recorded contract=${ctx.contractId} ${label}`);
    return row;
  }

  function toView(row: AcceptanceRow): BillingTermsAcceptanceView {
    return {
      id: row.id,
      termsVersionId: row.termsVersionId,
      termsVersionNumber: row.termsVersionNumber,
      termsText: row.termsText,
      billingMode: row.billingMode,
      method: row.method,
      acceptedAt: new Date(row.acceptedAt).toISOString(),
      acceptedByName: row.acceptedByName,
      recordedByName: row.recordedByName,
      signerName: row.signerName,
      signerEmail: row.signerEmail,
      hasSignedDocument: !!row.signedDocumentPath,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  async function getAcceptanceForContract(contractId: string): Promise<{ view: BillingTermsAcceptanceView | null; row: AcceptanceRow | null }> {
    const row = await deps.repo.getLatestAcceptanceForContract(contractId);
    return { view: row ? toView(row) : null, row: row ?? null };
  }

  // ---- admin -------------------------------------------------------------

  async function adminOverview() {
    const [published, draft] = await Promise.all([deps.repo.getPublishedVersion(), deps.repo.getDraftVersion()]);
    return { published: published ?? null, draft: draft ?? null };
  }

  function parseDraftBody(body: any, partial: boolean): Result<{ title?: string; bodyTemplate?: string; changelog?: string | null }> {
    const out: { title?: string; bodyTemplate?: string; changelog?: string | null } = {};
    if (body?.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) return fail(400, "Title must be 1–200 characters.", 'BILLING_TERMS_INVALID');
      out.title = body.title.trim();
    } else if (!partial) {
      out.title = 'SDP Billing Terms & Conditions';
    }
    if (body?.bodyTemplate !== undefined) {
      if (typeof body.bodyTemplate !== 'string' || !body.bodyTemplate.trim()) return fail(400, "The terms text cannot be empty.", 'BILLING_TERMS_INVALID');
      if (body.bodyTemplate.length > 200_000) return fail(400, "The terms text is too long.", 'BILLING_TERMS_INVALID');
      out.bodyTemplate = body.bodyTemplate;
    } else if (!partial) {
      return fail(400, "The terms text cannot be empty.", 'BILLING_TERMS_INVALID');
    }
    if (body?.changelog !== undefined) {
      if (body.changelog !== null && typeof body.changelog !== 'string') return fail(400, "Changelog must be text.", 'BILLING_TERMS_INVALID');
      out.changelog = body.changelog ? String(body.changelog).slice(0, 2000) : null;
    }
    return { ok: true, data: out };
  }

  async function adminCreateDraft(userId: string, body: any): Promise<Result<BillingTermsVersion>> {
    const existing = await deps.repo.getDraftVersion();
    if (existing) return fail(409, "A draft already exists. Edit or publish it first.", 'BILLING_TERMS_DRAFT_EXISTS');
    const parsed = parseDraftBody(body, false);
    if (!parsed.ok) return parsed;
    const row = await deps.repo.createDraft({
      title: parsed.data.title!,
      bodyTemplate: parsed.data.bodyTemplate!,
      changelog: parsed.data.changelog ?? null,
      createdByUserId: userId,
    });
    return { ok: true, data: row };
  }

  async function adminUpdateDraft(userId: string, id: string, body: any): Promise<Result<BillingTermsVersion>> {
    const parsed = parseDraftBody(body, true);
    if (!parsed.ok) return parsed;
    const row = await deps.repo.updateDraft(id, { ...parsed.data, updatedByUserId: userId });
    if (!row) return fail(404, "Draft not found (only a draft can be edited).", 'BILLING_TERMS_NOT_DRAFT');
    return { ok: true, data: row };
  }

  async function adminPublish(userId: string, id: string, body: any): Promise<Result<BillingTermsVersion>> {
    const version = await deps.repo.getVersionById(id);
    if (!version) return fail(404, "Version not found.", 'BILLING_TERMS_NOT_FOUND');
    if (version.status !== 'draft') return fail(409, "Only a draft can be published.", 'BILLING_TERMS_NOT_DRAFT');
    if (!version.bodyTemplate.trim()) return fail(400, "The terms text cannot be empty.", 'BILLING_TERMS_INVALID');
    if (body?.changelog !== undefined) {
      const parsed = parseDraftBody({ changelog: body.changelog }, true);
      if (!parsed.ok) return parsed;
      await deps.repo.updateDraft(id, { changelog: parsed.data.changelog ?? null, updatedByUserId: userId });
    }
    const row = await deps.repo.publishVersion(id, userId, sha256(version.bodyTemplate));
    console.log(`[billing-terms] published v${row.versionNumber} by ${userId}`);
    return { ok: true, data: row };
  }

  function adminPreview(body: any): Result<{ text: string }> {
    if (typeof body?.bodyTemplate !== 'string') return fail(400, "bodyTemplate is required.", 'BILLING_TERMS_INVALID');
    return { ok: true, data: { text: renderBillingTerms(body.bodyTemplate, SAMPLE_BILLING_TERMS_PLACEHOLDERS) } };
  }

  return {
    getCurrentRenderedTerms,
    checkBillingTermsForCreate,
    checkBillingTermsForUpdate,
    recordBillingTermsAcceptance,
    getAcceptanceForContract,
    acceptForExistingContract,
    adminOverview,
    listVersions: () => deps.repo.listVersions(),
    adminCreateDraft,
    adminUpdateDraft,
    adminPublish,
    adminPreview,
    hardDeleteContract: (contractId: string) => deps.repo.hardDeleteContract(contractId),
  };
}

export type BillingTermsService = ReturnType<typeof createBillingTermsService>;

export const billingTermsService = createBillingTermsService({
  repo: repository,
  getBusinessById: (id) => storage.getBusinessById(id),
  getCountryById: (id) => storage.getCountryById(id),
});

export const {
  checkBillingTermsForCreate,
  checkBillingTermsForUpdate,
  recordBillingTermsAcceptance,
  hardDeleteContract,
} = billingTermsService;
