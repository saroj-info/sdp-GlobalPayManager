/**
 * Public surface of the workforce module.
 *
 * Anything outside this folder must import from `./` (this file) only — never
 * from internals like `./repository` or `./authorize`.
 */

export { registerWorkforceRoutes } from "./controller";
export { listWorkers } from "./service";
export type { WorkerListQuery, WorkerListResult } from "./types";
