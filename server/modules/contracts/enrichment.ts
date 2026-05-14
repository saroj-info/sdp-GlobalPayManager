/**
 * Contract enrichment helpers. Attach derived/related data to contract rows so
 * the listing UI can render them without follow-up requests.
 *
 * Originally lived inline in routes.ts. Moved here so the contracts module owns
 * them and other consumers (including the legacy `GET /api/contracts`) import
 * from `server/modules/contracts`.
 *
 * Performance note: each helper does ONE round-trip for all contracts (N+1 fix
 * already applied for `addDerivedStatusToContracts` via the instances index).
 * Always invoke these AFTER pagination so we enrich the page slice only.
 */

import { storage } from "../../storage";
import { getDerivedContractStatus } from "@shared/contractHelpers";

const DATE_FIELDS = [
  "endDate",
  "signedAt",
  "emailSentAt",
  "workerSignedAt",
  "businessSignedAt",
  "sentAt",
  "expiresAt",
  "declinedAt",
  "createdAt",
];

/** Coerce stringy date columns back to Date objects so getDerivedContractStatus
 *  can do real Date comparison. */
export function normalizeDateFields(obj: Record<string, any>) {
  const normalized: Record<string, any> = { ...obj };
  for (const field of DATE_FIELDS) {
    if (normalized[field] && typeof normalized[field] === "string") {
      normalized[field] = new Date(normalized[field]);
    }
  }
  return normalized;
}

/** Attach per-contract remuneration line arrays. Suppresses lines on pending
 *  salary contracts for business users so they don't see the SDP-internal split. */
export async function addRemunerationLinesToContracts<
  T extends { id: string; rateType?: string | null; status?: string | null },
>(contracts: T[], requesterUserType?: string): Promise<(T & { remunerationLines: any[] })[]> {
  if (contracts.length === 0) return [];

  const contractIds = contracts.map(c => c.id);
  const lines = await Promise.all(contractIds.map(id => storage.getRemunerationLinesByContractId(id)));

  const byId = new Map<string, any[]>();
  contractIds.forEach((id, i) => byId.set(id, lines[i]));

  const isBusinessUser =
    requesterUserType && requesterUserType !== "sdp_internal" && requesterUserType !== "sdp_super_admin";

  return contracts.map(contract => {
    if (isBusinessUser && contract.rateType === "annual" && contract.status === "pending_sdp_review") {
      return { ...contract, remunerationLines: [] };
    }
    return { ...contract, remunerationLines: byId.get(contract.id) || [] };
  });
}

/** Attach per-project rate lines to multi-rate contracts only. */
export async function addRateLinesToContracts<
  T extends { id: string; rateStructure?: string | null },
>(contracts: T[]): Promise<(T & { rateLines: any[] })[]> {
  if (contracts.length === 0) return [];
  const multiRateIds = contracts.filter(c => c.rateStructure === "multiple").map(c => c.id);
  if (multiRateIds.length === 0) {
    return contracts.map(c => ({ ...c, rateLines: [] }));
  }
  const lineLookups = await Promise.all(multiRateIds.map(id => storage.getContractRateLines(id).catch(() => [])));
  const byId = new Map<string, any[]>();
  multiRateIds.forEach((id, i) => byId.set(id, lineLookups[i]));
  return contracts.map(c => ({ ...c, rateLines: byId.get(c.id) || [] }));
}

/** Attach SDP billing lines — SDP-internal callers only. Don't expose to business. */
export async function addBillingLinesToContracts<T extends { id: string }>(
  contracts: T[],
): Promise<(T & { billingLines: any[] })[]> {
  if (contracts.length === 0) return [];
  const contractIds = contracts.map(c => c.id);
  const lines = await Promise.all(contractIds.map(id => storage.getContractBillingLines(id)));
  const byId = new Map<string, any[]>();
  contractIds.forEach((id, i) => byId.set(id, lines[i]));
  return contracts.map(c => ({ ...c, billingLines: byId.get(c.id) || [] }));
}

/** Compute derived signature status from contract_instances for each contract. */
export async function addDerivedStatusToContracts<T extends Record<string, any>>(
  contracts: T[],
): Promise<(T & { derivedSignatureStatus: string; termExpired: boolean; sourceInstance?: any })[]> {
  if (contracts.length === 0) return [] as any;

  // PERFORMANCE: fetch all instances once and index, avoiding N+1 round-trips.
  const allInstances = await storage.getContractInstances();
  const instancesByKey = new Map<string, any[]>();
  for (const instance of allInstances) {
    const key = `${instance.businessId}|${instance.workerId}|${instance.countryId}`;
    if (!instancesByKey.has(key)) instancesByKey.set(key, []);
    instancesByKey.get(key)!.push(instance);
  }

  return contracts.map((contract): any => {
    try {
      const key = `${contract.businessId}|${contract.workerId}|${contract.countryId}`;
      const instances = instancesByKey.get(key) || [];
      const normalizedContract = normalizeDateFields(contract);
      const normalizedInstances = instances.map(normalizeDateFields);
      const derivedStatus = getDerivedContractStatus(normalizedContract as any, normalizedInstances as any);
      return {
        ...contract,
        derivedSignatureStatus: derivedStatus.signatureStatus,
        termExpired: derivedStatus.termExpired,
        sourceInstance: derivedStatus.sourceInstance,
      };
    } catch (error: any) {
      console.error(`[contracts] Error deriving status for contract ${contract.id}:`, error);
      return { ...contract, derivedSignatureStatus: "draft", termExpired: false };
    }
  });
}
