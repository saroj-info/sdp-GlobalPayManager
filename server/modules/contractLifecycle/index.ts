/**
 * Public surface of the contract lifecycle module: renewal, extension and
 * host client confirmation of a contract.
 */
export { registerContractLifecycleRoutes } from "./controller";
export { contractLifecycleService, createContractLifecycleService } from "./service";
export type { ContractLifecycleDeps } from "./service";
export type { AuthUser, Result, RenewResult, ExtendResult, ConfirmationResult } from "./types";
