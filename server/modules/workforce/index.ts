/**
 * Public surface of the workforce module.
 *
 * Anything outside this folder must import from `./` (this file) only — never
 * from internals like `./repository` or `./authorize`.
 */

export { registerWorkforceRoutes } from "./controller";
export { listWorkers } from "./service";
export type { WorkerListQuery, WorkerListResult } from "./types";
export { findEmailConflict, describeEmailConflict, normalizeEmail } from "./emailConflicts";
export type { EmailConflict, EmailConflictKind } from "./emailConflicts";
export {
  workerInvitations,
  createWorkerInvitationService,
  hashInvitationToken,
  WORKER_INVITATION_TTL_MS,
  INVITATION_INVALID_MESSAGE,
  INVITATION_EXPIRED_MESSAGE,
} from "./invitations";
export type { WorkerInvitationDeps, WorkerInvitationService, IssueInvitationResult, LookupInvitationResult } from "./invitations";
