/**
 * Internal types for the timesheets module.
 * Public surface: `GET /api/timesheets/list`.
 */

export interface AuthUser {
  id: string;
  userType: string;
  activeRole?: string;        // Dual-role: the role this session is acting as (defaults to userType)
  availableRoles?: string[];
}

export type SortKey = "recent" | "period_end" | "period_start" | "status" | "submitted" | "worker";

export interface TimesheetListQuery {
  page: number;
  pageSize: number;
  status?: string;          // 'draft' | 'submitted' | 'approved' | 'rejected'
  search?: string;          // worker name
  countryId?: string;
  businessId?: string;
  hostClientName?: string;  // matches `customerBusinessName` on enriched rows
  sortBy: SortKey;
}

export interface TimesheetListResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: { all: number; draft: number; submitted: number; approved: number; rejected: number };
}

export type TimesheetListScope =
  | { kind: "all" }                                  // SDP
  | { kind: "business"; businessId: string }         // business — both own + provided
  | { kind: "by_worker"; workerId: string }          // worker
  | { kind: "denied"; status: number; message: string };

export type ListTimesheetsResult =
  | { ok: true; data: TimesheetListResult }
  | { ok: false; status: number; message: string };
