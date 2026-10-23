/**
 * Public surface of the timesheet-approval module.
 *
 * Anything outside this folder must import from `./` (this file), never from the
 * internals. Keep this barrel deliberately small — the more surface, the more
 * coupling other code can take on.
 */

export { registerTimesheetApprovalRoutes } from "./controller";
export { processStatusUpdate } from "./service";
export { issueApprovalToken, summarizeForApprover, TIMESHEET_APPROVAL_TTL_MS } from "./tokens";
export type { ApprovalActor, ApproverDayRow, ApproverSummary, AuthUser, StatusUpdateResult } from "./types";
