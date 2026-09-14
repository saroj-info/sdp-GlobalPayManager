/**
 * Internal types for the dashboard module.
 *
 * `GET /api/dashboard/summary` returns a role-tagged DashboardSummary (shapes
 * live in shared/dashboard.ts so client and server can't drift).
 */

export type {
  DashboardSummary,
  SdpDashboardSummary,
  BusinessDashboardSummary,
  WorkerDashboardSummary,
  MonthCount,
  MonthlyMoney,
  CurrencyAmount,
  CountryWorkforce,
  StatusCount,
  TimesheetPipeline,
} from "@shared/dashboard";

export interface AuthUser {
  id: string;
  userType: string;
  activeRole?: string;        // Dual-role: the role this session is acting as (defaults to userType)
  availableRoles?: string[];
}

/**
 * Authorization-derived scope. Decides which slice of the platform the
 * caller's dashboard aggregates over.
 */
export type DashboardScope =
  | { kind: "sdp" }                                                          // all sdpRoles (v1: global, matches list modules)
  | { kind: "business"; businessId: string; businessName: string }
  | { kind: "worker"; workerId: string; workerType: "employee" | "contractor"; firstName: string }
  | { kind: "denied"; status: number; message: string };

export type SummaryResult =
  | { ok: true; data: import("@shared/dashboard").DashboardSummary }
  | { ok: false; status: number; message: string };
