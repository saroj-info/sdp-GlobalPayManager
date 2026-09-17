/**
 * Dashboard summary payload types — shared between the server module
 * (server/modules/dashboard) and the client dashboard pages so the two sides
 * can't drift. Pure types, no runtime imports.
 *
 * `GET /api/dashboard/summary` returns one of the role-tagged shapes below
 * depending on the caller's ACTIVE role. Money values always travel with their
 * currency; the client must never sum across currencies.
 */

/** One month of a 12-month series. `month` is 'YYYY-MM' (UTC buckets). */
export interface MonthCount {
  month: string;
  count: number;
}

export interface CurrencyAmount {
  currency: string;
  total: number;
  count: number;
}

/**
 * A 12-month money series split per currency. `rows` is zero-filled to exactly
 * 12 entries; `totals` keys are the currency codes listed in `currencies`.
 */
export interface MonthlyMoney {
  currencies: string[];
  rows: Array<{ month: string; totals: Record<string, number> }>;
}

export interface CountryWorkforce {
  countryId: string | null;
  countryName: string;
  employees: number;
  contractors: number;
  total: number;
}

/** Raw contract_status enum values; the client labels via contractHelpers. */
export interface StatusCount {
  status: string;
  count: number;
}

export interface TimesheetPipeline {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface SdpDashboardSummary {
  role: "sdp";
  kpis: {
    totalWorkers: number;
    activeContracts: number;
    submittedTimesheets: number;
    openSdpInvoices: number;
  };
  workforceByCountry: CountryWorkforce[];
  contractsByStatus: StatusCount[];
  contractsByCountry: Array<{
    countryId: string;
    countryName: string;
    active: number;
    pending: number;
    ended: number;
    total: number;
  }>;
  contractsMonthly: MonthCount[];
  invoicesMonthly: MonthlyMoney;
  timesheetPipeline: TimesheetPipeline;
  outstandingByCurrency: CurrencyAmount[];
}

export interface BusinessDashboardSummary {
  role: "business";
  businessName: string;
  kpis: {
    totalWorkers: number;
    activeContracts: number;
    submittedTimesheets: number;
    pendingLeave: number;
  };
  workforceByCountry: CountryWorkforce[];
  contractsByStatus: StatusCount[];
  invoicesMonthly: MonthlyMoney;
  outstandingByCurrency: CurrencyAmount[];
  timesheetPipeline: TimesheetPipeline;
  leave: {
    pending: number;
    approvedUpcoming: number;
    byType: Array<{ leaveType: string; count: number }>;
  };
}

export interface WorkerDashboardSummary {
  role: "worker";
  workerType: "employee" | "contractor";
  firstName: string;
  kpis: {
    activeContracts: number;
    draftTimesheets: number;
    submittedTimesheets: number;
    approvedTimesheets: number;
  };
  /** Hours/days summed from timesheet_entries (timesheets.totalHours is stale). */
  workMonthly: Array<{ month: string; hours: number; days: number }>;
  /** Employees only; null for contractors. */
  payslipsMonthly: MonthlyMoney | null;
  /** Contractors only; null for employees. */
  invoiceTotals: Array<{ status: string; currency: string; total: number; count: number }> | null;
  /** Live (not completed/terminated) contracts, newest first, max 5. */
  contracts: Array<{
    id: string;
    contractName: string | null;
    status: string;
    rateType: string;
    currency: string;
    startDate: string;
    endDate: string | null;
    businessName: string | null;
    signedAt: string | null;
    hasSigningToken: boolean;
  }>;
  /** Employees only; null for contractors. */
  leave: { pending: number; approved: number } | null;
}

export type DashboardSummary =
  | SdpDashboardSummary
  | BusinessDashboardSummary
  | WorkerDashboardSummary;
