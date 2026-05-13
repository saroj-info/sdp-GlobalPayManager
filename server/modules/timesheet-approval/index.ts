/**
 * Public surface of the timesheet-approval module.
 *
 * Anything outside this folder must import from `./` (this file), never from the
 * internals. Keep this barrel deliberately small — the more surface, the more
 * coupling other code can take on.
 */

export { registerTimesheetApprovalRoutes } from "./controller";
export { processStatusUpdate } from "./service";
export type { AuthUser, StatusUpdateResult } from "./types";
