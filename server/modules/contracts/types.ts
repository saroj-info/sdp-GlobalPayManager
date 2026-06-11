/**
 * Internal types for the contracts module.
 *
 * The list-endpoint surface (`GET /api/contracts/list`) accepts `ContractListQuery`
 * as a query string and returns `ContractListResult`.
 */

export interface AuthUser {
  id: string;
  userType: string;
  activeRole?: string;        // Dual-role: the role this session is acting as (defaults to userType)
  availableRoles?: string[];
}

export type SortKey = "worker" | "role" | "country" | "status" | "date";

export interface ContractListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  businessId?: string;
  countryId?: string;
  sortBy: SortKey;
}

export interface ContractListResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Authorization-derived scope. Determines which contracts the caller is allowed
 * to enumerate before any user filter is applied.
 */
export type ContractListScope =
  | { kind: "all" }                                                // SDP internal
  | { kind: "own_or_host"; businessId: string }                    // business — sees own + host-client-of
  | { kind: "by_worker"; workerId: string }                        // worker — sees own contracts
  | { kind: "denied"; status: number; message: string };

export type ListContractsResult =
  | { ok: true; data: ContractListResult }
  | { ok: false; status: number; message: string };
