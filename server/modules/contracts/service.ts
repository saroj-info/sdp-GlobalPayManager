/**
 * Contracts orchestrator.
 *
 * Flow:
 *   1. Resolve scope (who-can-see-what)
 *   2. Fetch filtered + sorted + paginated raw rows
 *   3. Enrich the page slice (remuneration / rate lines / derived status / billing)
 *
 * Enrichment runs AFTER pagination so we only pay the per-row cost for the
 * ~20 rows we're returning, not the whole result set.
 */

import { storage } from "../../storage";
import { resolveContractListScope } from "./authorize";
import { fetchContractList } from "./repository";
import {
  addBillingLinesToContracts,
  addDerivedStatusToContracts,
  addRateLinesToContracts,
  addRemunerationLinesToContracts,
} from "./enrichment";
import type { AuthUser, ContractListQuery, ListContractsResult } from "./types";

export async function listContracts(user: AuthUser, query: ContractListQuery): Promise<ListContractsResult> {
  const scope = await resolveContractListScope(user);
  if (scope.kind === "denied") {
    return { ok: false, status: scope.status, message: scope.message };
  }

  const raw = await fetchContractList(scope, query);

  // Tag host-client-viewed contracts as read-only (existing UI convention).
  // Only applies when the caller is a business user and the contract belongs to a different
  // business but lists them as the host client.
  let items = raw.items;
  if (scope.kind === "own_or_host") {
    items = items.map(c =>
      c.customerBusinessId === scope.businessId && c.businessId !== scope.businessId
        ? { ...c, viewerRole: "host_client", readOnly: true }
        : { ...c, viewerRole: "employing_business", readOnly: false },
    );
  }

  // Enrich the page slice.
  items = await addDerivedStatusToContracts(items);
  items = await addRemunerationLinesToContracts(items, user.userType);
  items = await addRateLinesToContracts(items);
  if (user.userType === "sdp_internal") {
    items = await addBillingLinesToContracts(items);
  }

  // Attach customer business object on host-client contracts (matches old endpoint enrichment).
  items = await Promise.all(
    items.map(async (c: any) => {
      if (c.customerBusinessId) {
        const customerBusiness = await storage.getBusinessById(c.customerBusinessId);
        return { ...c, customerBusiness: customerBusiness || null };
      }
      return c;
    }),
  );

  return { ok: true, data: { ...raw, items } };
}
