/**
 * Internal types for the workforce module.
 *
 * Public surface is the controller's `GET /api/workers/list` endpoint, which accepts
 * `WorkerListQuery` as a query string and returns `WorkerListResult`.
 */

export interface AuthUser {
  id: string;
  userType: string;
}

export type SortKey = "name" | "country" | "type" | "business" | "created";

/** Parsed + validated representation of the request query string. */
export interface WorkerListQuery {
  page: number;
  pageSize: number;
  search?: string;
  countryId?: string;
  workerType?: string;
  businessId?: string;
  sortBy: SortKey;
}

/** Paginated envelope returned to the client. */
export interface WorkerListResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Authorization-derived scope. Controls which workers the repository is allowed to fetch
 * before any user-supplied filter is applied. Returned by `resolveWorkerListScope`.
 */
export type WorkerListScope =
  | { kind: "all" }                              // SDP internal — sees every worker
  | { kind: "own_business"; businessId: string } // business user — sees own employees
  | { kind: "self"; workerId: string }           // worker — sees only themselves
  | { kind: "denied"; status: number; message: string };

/** Tagged result the controller translates to an HTTP response. */
export type ListWorkersResult =
  | { ok: true; data: WorkerListResult }
  | { ok: false; status: number; message: string };
