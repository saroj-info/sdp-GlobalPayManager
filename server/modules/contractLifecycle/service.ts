/**
 * Contract lifecycle service: renewal (clone a contract into a new row and
 * copy its lines), extension (end date only) and host client confirmation.
 * Built through a factory so the logic can be exercised without a database.
 *
 * Why dedicated endpoints: PUT /api/contracts/:id validates the whole row
 * (insertContractSchema, not partial) and nulls every optional field that is
 * missing, so a partial update through it would wipe columns.
 */
import type {
  Business,
  Contract,
  ContractTemplate,
  InsertContract,
  InsertContractBillingLine,
  InsertContractRateLine,
  InsertContractTierDiscount,
  InsertRemunerationLineType,
  RemunerationLine,
  SelectContractBillingLine,
  SelectContractRateLine,
  SelectContractTierDiscount,
  Worker,
} from "@shared/schema";
import {
  dateToDay,
  dayToDate,
  describeContractForLog,
  extendContractSchema,
  followRateOnRemunerationLines,
  hostClientConfirmationSchema,
  isEndDateLater,
  renewContractSchema,
  resolveRenewalStatus,
} from "@shared/contractLifecycle";
import { storage } from "../../storage";
import { checkBusinessProfileForContract, type ContractProfileBlock } from "../businesses";
import { isWorkerLinkedToBusiness, upsertContractAssociation } from "../workforce/associations";
import { logContractChanges } from "../contracts/changeLog";
import { notifySalaryContract, notifySdpOfContractRequest } from "./notifications";
import type { AuthUser, ConfirmationResult, ExtendResult, RenewResult, Result } from "./types";

export interface ContractLifecycleDeps {
  getContract(id: string): Promise<Contract | undefined>;
  getBusinessById(id: string): Promise<Business | undefined>;
  getPrimaryBusinessForUser(userId: string): Promise<Business | undefined>;
  getWorkerById(id: string): Promise<Worker | undefined>;
  isWorkerLinkedToBusiness(workerId: string, businessId: string): Promise<boolean>;
  checkBusinessProfileForContract(business: Business, callerUserType: string): ContractProfileBlock | null;
  getContractTemplateById(id: string): Promise<ContractTemplate | undefined>;
  createContract(row: InsertContract): Promise<Contract>;
  updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract>;
  getRemunerationLines(contractId: string): Promise<RemunerationLine[]>;
  createRemunerationLines(lines: InsertRemunerationLineType[]): Promise<void>;
  getRateLines(contractId: string): Promise<SelectContractRateLine[]>;
  replaceRateLines(contractId: string, lines: InsertContractRateLine[]): Promise<unknown>;
  getBillingLines(contractId: string): Promise<SelectContractBillingLine[]>;
  replaceBillingLines(contractId: string, lines: InsertContractBillingLine[]): Promise<unknown>;
  getTierDiscounts(contractId: string): Promise<SelectContractTierDiscount[]>;
  replaceTierDiscounts(contractId: string, rows: InsertContractTierDiscount[]): Promise<unknown>;
  upsertContractAssociation(workerId: string, businessId: string, sourceContractId: string, addedBy: string): Promise<void>;
  /** Renders the contract document from its template; null when there is no template. */
  generateContractDocument(contract: Contract): Promise<string | null>;
  logContractChanges(params: { contractId: string; before: Record<string, any>; after: Record<string, any>; changedBy: string | null }): Promise<unknown>;
  notifySdpOfContractRequest(contract: Contract, business: Business, worker: Worker, requesterUserId: string): Promise<void>;
  notifySalaryContract(contract: Contract, business: Business, worker: Worker): Promise<void>;
  now?: () => Date;
}

const fail = (status: number, message: string, code?: string, extra?: Record<string, unknown>): Result<never> =>
  ({ ok: false, status, message, code, extra });

const logError = (what: string, error: unknown) =>
  console.error(`[contract-lifecycle] ${what}:`, (error as any)?.message ?? String(error));

/** Columns copied from the source contract onto a renewal unchanged. */
const COPIED_COLUMNS = [
  "businessId", "workerId", "countryId", "roleTitleId", "customRoleTitle", "contractorCompliance",
  "employmentType", "rateType", "currency", "jobDescription",
  "requiresTimesheet", "timesheetFrequency", "timesheetApproverRole", "timesheetCalculationMethod",
  "paymentScheduleType", "paymentDay", "paymentDaysAfterPeriod", "paymentHolidayRule", "noticePeriodDays",
  "rateStructure",
  "isForClient", "clientName", "clientAddress", "clientCity", "clientCountry", "clientContactEmail", "clientContactPhone",
  "thirdPartyBusinessId", "sdpEntityId",
  "billingMode", "invoiceCustomer", "customerBusinessId", "customerBillingRateType", "customerCurrency",
  "invoicingFrequency", "paymentTerms", "clientBillingType", "fixedBillingFrequency",
] as const satisfies readonly (keyof Contract)[];

/** Drop the row identity and timestamps before re-inserting a line under a new contract. */
function stripLine<T extends Record<string, any>>(row: T): Omit<T, "id" | "contractId" | "createdAt" | "updatedAt"> {
  const { id, contractId, createdAt, updatedAt, ...rest } = row;
  void id; void contractId; void createdAt; void updatedAt;
  return rest;
}

const firstIssue = (error: { issues: Array<{ message: string }> }, fallback: string) =>
  error.issues[0]?.message ?? fallback;

export function createContractLifecycleService(deps: ContractLifecycleDeps) {
  const now = deps.now ?? (() => new Date());

  // PUT semantics: SDP may change any contract; a business user only their own.
  async function authorizeWrite(user: AuthUser, contract: Contract): Promise<Result<true>> {
    if (user.userType === 'sdp_internal') return { ok: true, data: true };
    if (user.userType === 'business_user') {
      const business = await deps.getPrimaryBusinessForUser(user.id);
      if (business && business.id === contract.businessId) return { ok: true, data: true };
    }
    return fail(403, "You cannot change this contract.", 'NOT_AUTHORIZED');
  }

  // POST semantics for a renewal (a new contract): the SDP caller must be able
  // to access the business; a business user must own the contract and the
  // worker must still be on their workforce (home or shared).
  async function authorizeCreate(user: AuthUser, source: Contract): Promise<Result<{ business: Business; worker: Worker }>> {
    if (user.userType === 'sdp_internal') {
      const isAdmin = user.sdpRole === 'sdp_super_admin' || user.sdpRole === 'sdp_admin';
      const accessible = user.accessibleBusinessIds ?? [];
      if (!isAdmin && accessible.length > 0 && !accessible.includes(source.businessId)) {
        return fail(403, "You do not have access to this contract's business.", 'BUSINESS_NOT_ACCESSIBLE');
      }
      const business = await deps.getBusinessById(source.businessId);
      if (!business) return fail(404, "Business not found", 'BUSINESS_NOT_FOUND');
      const worker = await deps.getWorkerById(source.workerId);
      if (!worker) return fail(404, "Worker not found", 'WORKER_NOT_FOUND');
      return { ok: true, data: { business, worker } };
    }
    if (user.userType === 'business_user') {
      const business = await deps.getPrimaryBusinessForUser(user.id);
      if (!business || business.id !== source.businessId) return fail(403, "You cannot renew this contract.", 'NOT_AUTHORIZED');
      const worker = await deps.getWorkerById(source.workerId);
      if (!worker) return fail(404, "Worker not found", 'WORKER_NOT_FOUND');
      const linked = worker.businessId === business.id || (await deps.isWorkerLinkedToBusiness(worker.id, business.id));
      if (!linked) {
        return fail(403, "This worker is no longer linked to your business, so the contract cannot be renewed here. Contact SDP.", 'WORKER_NOT_LINKED');
      }
      return { ok: true, data: { business, worker } };
    }
    return fail(403, "Your account cannot renew contracts.", 'NOT_AUTHORIZED');
  }

  async function regenerateDocument(contract: Contract): Promise<{ contract: Contract; regenerated: boolean }> {
    if (!contract.templateId) return { contract, regenerated: false };
    try {
      const content = await deps.generateContractDocument(contract);
      if (!content) return { contract, regenerated: false };
      const updated = await deps.updateContract(contract.id, { contractDocument: content });
      return { contract: updated, regenerated: true };
    } catch (error) {
      logError(`document generation for ${contract.id} failed (Send for Signing regenerates it)`, error);
      return { contract, regenerated: false };
    }
  }

  // ---- Renewal --------------------------------------------------------------

  async function renewContract(user: AuthUser, sourceId: string, body: unknown): Promise<Result<RenewResult>> {
    const source = await deps.getContract(sourceId);
    if (!source) return fail(404, "Contract not found", 'CONTRACT_NOT_FOUND');

    const auth = await authorizeCreate(user, source);
    if (!auth.ok) return auth;
    const { business, worker } = auth.data;

    const profileBlock = deps.checkBusinessProfileForContract(business, user.userType);
    if (profileBlock) {
      const { message, code, missing } = profileBlock.body;
      return fail(profileBlock.status, message, code, { missing });
    }

    const parsed = renewContractSchema.safeParse(body);
    if (!parsed.success) return fail(400, firstIssue(parsed.error, "Invalid renewal details"), 'RENEWAL_INVALID');
    const input = parsed.data;

    const startDate = dayToDate(input.startDate);
    if (startDate <= new Date(source.startDate)) {
      return fail(400, "The renewal must start after the current contract's start date.", 'RENEWAL_START_INVALID');
    }
    const endDate = input.endDate ? dayToDate(input.endDate) : null;
    if (endDate && endDate <= startDate) {
      return fail(400, "The renewal's end date must be after its start date.", 'RENEWAL_END_INVALID');
    }

    const isMultiRate = source.rateStructure === 'multiple';
    const [sourceRemuneration, sourceRateLines, sourceBillingLines, sourceTiers] = await Promise.all([
      deps.getRemunerationLines(source.id).catch((e) => { logError("reading remuneration lines failed", e); return [] as RemunerationLine[]; }),
      isMultiRate ? deps.getRateLines(source.id).catch((e) => { logError("reading rate lines failed", e); return [] as SelectContractRateLine[]; }) : Promise.resolve([] as SelectContractRateLine[]),
      deps.getBillingLines(source.id).catch((e) => { logError("reading billing lines failed", e); return [] as SelectContractBillingLine[]; }),
      deps.getTierDiscounts(source.id).catch((e) => { logError("reading tier discounts failed", e); return [] as SelectContractTierDiscount[]; }),
    ]);

    // Worker rate(s). Multi-rate: overrides by source line id; the contract's
    // own `rate` mirrors the default (or first) line, as the wizard does.
    let newRate: string;
    let newRateLines: Omit<InsertContractRateLine, 'contractId'>[] = [];
    const rateLineChanges: Array<{ projectName: string | null; oldRate: string; newRate: string }> = [];
    if (isMultiRate && sourceRateLines.length > 0) {
      const overrides = new Map((input.rateLines ?? []).map((l) => [l.id, l]));
      for (const id of overrides.keys()) {
        if (!sourceRateLines.some((l) => l.id === id)) return fail(400, "One of the project rates does not belong to this contract.", 'RATE_LINE_UNKNOWN');
      }
      newRateLines = sourceRateLines.map((line, index) => {
        const override = overrides.get(line.id);
        const rate = override?.rate ?? line.rate;
        if (rate !== line.rate) rateLineChanges.push({ projectName: line.projectName, oldRate: line.rate, newRate: rate });
        return {
          ...stripLine(line),
          rate,
          clientRate: override && override.clientRate !== undefined ? override.clientRate : line.clientRate,
          // Per-project windows belonged to the old term.
          startDate: null,
          endDate: null,
          sortOrder: line.sortOrder ?? index,
        };
      });
      const defaultLine = newRateLines.find((l) => l.isDefault) ?? newRateLines[0];
      newRate = String(defaultLine.rate);
    } else {
      if (input.rate === undefined) return fail(400, "Enter the worker rate for the renewal.", 'RENEWAL_RATE_REQUIRED');
      newRate = input.rate;
    }

    // Host client billing.
    let customerBillingRate = source.customerBillingRate;
    let fixedBillingAmount = source.fixedBillingAmount;
    if (source.isForClient) {
      if (source.clientBillingType === 'fixed_price') {
        if (input.fixedBillingAmount !== undefined) fixedBillingAmount = input.fixedBillingAmount;
      } else {
        const defaultLine = newRateLines.find((l) => l.isDefault) ?? newRateLines[0];
        if (isMultiRate && defaultLine?.clientRate) customerBillingRate = String(defaultLine.clientRate);
        else if (input.customerBillingRate !== undefined) customerBillingRate = input.customerBillingRate;
      }
    }

    const warnings: string[] = [];
    let templateId = source.templateId ?? null;
    if (templateId && !(await deps.getContractTemplateById(templateId))) {
      templateId = null;
      warnings.push('TEMPLATE_MISSING');
    }
    if (source.customerBusinessId && !(await deps.getBusinessById(source.customerBusinessId))) {
      return fail(409, "The host client on this contract no longer exists. Edit the contract before renewing it.", 'HOST_CLIENT_NOT_FOUND');
    }

    const copied: Partial<InsertContract> = {};
    for (const key of COPIED_COLUMNS) (copied as any)[key] = source[key];

    const row: InsertContract = {
      ...(copied as InsertContract),
      templateId,
      contractName: input.contractName ?? source.contractName,
      startDate,
      endDate,
      rate: newRate,
      totalPackageValue: source.rateType === 'annual' ? newRate : source.totalPackageValue,
      customerBillingRate,
      fixedBillingAmount,
      firstTimesheetStartDate: source.requiresTimesheet ? startDate : null,
      status: resolveRenewalStatus({
        callerUserType: user.userType,
        employmentType: source.employmentType,
        contractorCompliance: source.contractorCompliance,
      }),
      // A renewal is unsigned and undocumented until it goes through signing.
      contractDocument: null,
      emailSentAt: null,
      emailViewedAt: null,
      signedAt: null,
      signingIpAddress: null,
      signingLocation: null,
      signingUserAgent: null,
      signingToken: null,
      signatureText: null,
      createdByUserId: user.id,
      createdOnBehalfOfBusinessId: user.userType === 'sdp_internal' ? source.createdOnBehalfOfBusinessId : null,
      renewedFromContractId: source.id,
      hostClientConfirmationStatus: null,
      hostClientConfirmedAt: null,
      hostClientReference: null,
      hostClientConfirmationNote: null,
      hostClientConfirmationDocumentPath: null,
      hostClientConfirmationUpdatedAt: null,
      hostClientConfirmationUpdatedByUserId: null,
    };

    const created = await deps.createContract(row);

    // Copy the lines (each best effort, like POST /api/contracts).
    if (sourceRemuneration.length > 0) {
      try {
        const followed = followRateOnRemunerationLines(sourceRemuneration, { oldRate: source.rate, newRate, rateLineChanges });
        await deps.createRemunerationLines(
          followed.map((line) => ({
            contractId: created.id,
            payItemId: line.payItemId ?? null,
            type: line.type ?? null,
            description: line.description ?? null,
            amount: String(line.amount),
            frequency: line.frequency ?? null,
            paymentTrigger: line.paymentTrigger ?? null,
          }) as InsertRemunerationLineType),
        );
      } catch (error) { logError(`copying remuneration lines to ${created.id} failed`, error); }
    }
    if (newRateLines.length > 0) {
      try { await deps.replaceRateLines(created.id, newRateLines.map((l) => ({ ...l, contractId: created.id }))); }
      catch (error) { logError(`copying rate lines to ${created.id} failed`, error); }
    }
    if (sourceBillingLines.length > 0) {
      try {
        await deps.replaceBillingLines(created.id, sourceBillingLines.map((line, index) => ({
          ...stripLine(line),
          contractId: created.id,
          sortOrder: line.sortOrder ?? index,
        })));
      } catch (error) { logError(`copying billing lines to ${created.id} failed`, error); }
    }
    if (sourceTiers.length > 0) {
      try {
        await deps.replaceTierDiscounts(created.id, sourceTiers.map((tier, index) => ({
          contractId: created.id,
          monthsAfterStart: tier.monthsAfterStart,
          discountPercent: tier.discountPercent,
          sortOrder: tier.sortOrder ?? index,
        })));
      } catch (error) { logError(`copying tier discounts to ${created.id} failed`, error); }
    }

    if (worker.businessId && worker.businessId !== created.businessId) {
      try { await deps.upsertContractAssociation(worker.id, created.businessId, created.id, user.id); }
      catch (error) { logError("worker-business association failed", error); }
    }

    // The document reads the remuneration lines, so it comes after the copies.
    const { contract: withDocument, regenerated } = await regenerateDocument(created);

    try {
      await deps.logContractChanges({ contractId: created.id, before: {}, after: { renewedFrom: describeContractForLog(source) }, changedBy: user.id });
      await deps.logContractChanges({ contractId: source.id, before: {}, after: { renewedAs: describeContractForLog(withDocument) }, changedBy: user.id });
    } catch (error) { logError("change log failed", error); }

    if (withDocument.status === 'pending_sdp_review') {
      try { await deps.notifySdpOfContractRequest(withDocument, business, worker, user.id); }
      catch (error) { logError("contract request email failed", error); }
    }
    if (withDocument.rateType === 'annual' && user.userType !== 'sdp_internal') {
      try { await deps.notifySalaryContract(withDocument, business, worker); }
      catch (error) { logError("salary contract email failed", error); }
    }

    const fresh = (await deps.getContract(created.id)) ?? withDocument;
    return { ok: true, data: { contract: fresh, documentRegenerated: regenerated, warnings } };
  }

  // ---- Extension ------------------------------------------------------------

  async function extendContract(user: AuthUser, id: string, body: unknown): Promise<Result<ExtendResult>> {
    const contract = await deps.getContract(id);
    if (!contract) return fail(404, "Contract not found", 'CONTRACT_NOT_FOUND');
    const auth = await authorizeWrite(user, contract);
    if (!auth.ok) return auth;

    const parsed = extendContractSchema.safeParse(body);
    if (!parsed.success) return fail(400, firstIssue(parsed.error, "Invalid end date"), 'EXTENSION_INVALID');

    if (!contract.endDate) return fail(400, "This contract has no end date (ongoing), so there is nothing to extend.", 'CONTRACT_HAS_NO_END_DATE');
    if (contract.status === 'terminated') return fail(409, "A terminated contract cannot be extended. Create a renewal instead.", 'CONTRACT_TERMINATED');
    if (!isEndDateLater(contract.endDate, parsed.data.endDate)) {
      return fail(400, "The new end date must be after the current end date.", 'END_DATE_NOT_LATER');
    }

    const newEndDate = dayToDate(parsed.data.endDate);
    let updated = await deps.updateContract(id, { endDate: newEndDate });
    try {
      await deps.logContractChanges({ contractId: id, before: contract, after: { endDate: newEndDate }, changedBy: user.id });
    } catch (error) { logError("change log failed", error); }

    // Signed contracts keep the text the worker signed; unsigned ones get a
    // fresh render so the new end date shows in the document.
    let documentRegenerated = false;
    if (!contract.signedAt && contract.templateId) {
      const result = await regenerateDocument(updated);
      updated = result.contract;
      documentRegenerated = result.regenerated;
    }

    return { ok: true, data: { contract: updated, previousEndDate: dateToDay(contract.endDate), documentRegenerated } };
  }

  // ---- Host client confirmation ---------------------------------------------

  async function setHostClientConfirmation(user: AuthUser, id: string, body: unknown): Promise<Result<ConfirmationResult>> {
    const contract = await deps.getContract(id);
    if (!contract) return fail(404, "Contract not found", 'CONTRACT_NOT_FOUND');
    const auth = await authorizeWrite(user, contract);
    if (!auth.ok) return auth;
    if (!contract.isForClient) {
      return fail(400, "Only Customer Work contracts (work for a host client) have a host client confirmation.", 'CONTRACT_NOT_FOR_CLIENT');
    }

    const parsed = hostClientConfirmationSchema.safeParse(body);
    if (!parsed.success) return fail(400, firstIssue(parsed.error, "Invalid confirmation details"), 'CONFIRMATION_INVALID');
    const input = parsed.data;

    const updates: Partial<InsertContract> = {
      hostClientConfirmationStatus: input.status,
      hostClientConfirmedAt: input.confirmedAt ? dayToDate(input.confirmedAt) : null,
      hostClientReference: input.reference ? input.reference : null,
      hostClientConfirmationNote: input.note ? input.note : null,
      hostClientConfirmationUpdatedAt: now(),
      hostClientConfirmationUpdatedByUserId: user.id,
    };
    if (input.documentPath !== undefined) updates.hostClientConfirmationDocumentPath = input.documentPath ? input.documentPath : null;

    const updated = await deps.updateContract(id, updates);

    try {
      await deps.logContractChanges({
        contractId: id,
        before: { ...contract, hostClientConfirmationDocument: contract.hostClientConfirmationDocumentPath ? 'Attached' : null },
        after: {
          hostClientConfirmationStatus: updates.hostClientConfirmationStatus,
          hostClientConfirmedAt: updates.hostClientConfirmedAt,
          hostClientReference: updates.hostClientReference,
          hostClientConfirmationNote: updates.hostClientConfirmationNote,
          ...(input.documentPath !== undefined ? { hostClientConfirmationDocument: input.documentPath ? 'Attached' : null } : {}),
        },
        changedBy: user.id,
      });
    } catch (error) { logError("change log failed", error); }

    return { ok: true, data: { contract: updated } };
  }

  return { renewContract, extendContract, setHostClientConfirmation };
}

export const contractLifecycleService = createContractLifecycleService({
  getContract: (id) => storage.getContract(id),
  getBusinessById: (id) => storage.getBusinessById(id),
  getPrimaryBusinessForUser: (userId) => storage.getPrimaryBusinessForUser(userId),
  getWorkerById: (id) => storage.getWorkerById(id),
  isWorkerLinkedToBusiness,
  checkBusinessProfileForContract,
  getContractTemplateById: (id) => storage.getContractTemplateById(id),
  createContract: (row) => storage.createContract(row),
  updateContract: (id, updates) => storage.updateContract(id, updates),
  getRemunerationLines: (id) => storage.getRemunerationLinesByContractId(id),
  createRemunerationLines: (lines) => storage.createRemunerationLines(lines),
  getRateLines: (id) => storage.getContractRateLines(id),
  replaceRateLines: (id, lines) => storage.replaceContractRateLines(id, lines),
  getBillingLines: (id) => storage.getContractBillingLines(id),
  replaceBillingLines: (id, lines) => storage.replaceContractBillingLines(id, lines),
  getTierDiscounts: (id) => storage.getContractTierDiscounts(id),
  replaceTierDiscounts: (id, rows) => storage.replaceContractTierDiscounts(id, rows),
  upsertContractAssociation,
  // Same arguments as POST /api/contracts/:id/refresh-document in routes.ts.
  generateContractDocument: async (contract) => {
    if (!contract.templateId) return null;
    const regen = await storage.generateUniversalContract(contract.templateId, contract.businessId, contract.workerId, {
      contractId: contract.id,
      agreementDate: new Date().toLocaleDateString(),
      serviceDescription: contract.jobDescription || '',
      startDate: contract.startDate,
      endDate: contract.endDate || '',
      rateAmount: contract.rate,
      rateCurrency: contract.currency,
      rateType: contract.rateType || 'hourly',
      noticePeriodDays: contract.noticePeriodDays || 30,
    });
    return regen?.content || null;
  },
  logContractChanges,
  notifySdpOfContractRequest,
  notifySalaryContract,
});
