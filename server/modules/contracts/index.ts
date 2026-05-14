/**
 * Public surface of the contracts module.
 * External callers (including legacy route handlers in routes.ts) import from here.
 */

export { registerContractsRoutes } from "./controller";
export { listContracts } from "./service";
export type { ContractListQuery, ContractListResult } from "./types";

// Enrichment helpers — also consumed by the legacy `GET /api/contracts` handler in routes.ts
// and by other routes that need to attach derived data to a list of contracts.
export {
  addDerivedStatusToContracts,
  addRemunerationLinesToContracts,
  addRateLinesToContracts,
  addBillingLinesToContracts,
  normalizeDateFields,
} from "./enrichment";
