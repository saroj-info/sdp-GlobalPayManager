/**
 * Public surface of the contract lifecycle module: renewal, extension,
 * host client confirmation and deletion of a contract.
 */
export { registerContractLifecycleRoutes } from "./controller";
export { contractLifecycleService, createContractLifecycleService } from "./service";
export type { ContractLifecycleDeps } from "./service";
export { countContractActivity, deleteContractWithLinks, countContractsForWorkerAndBusiness } from "./repository";
export type { AuthUser, Result, RenewResult, ExtendResult, ConfirmationResult, DeletionCheck, ContractActivityCounts, DeleteOutcome, DeleteContractResult } from "./types";
