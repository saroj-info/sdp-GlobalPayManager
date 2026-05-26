/**
 * Worker list repository — SQL-level filtering, sorting, and pagination for the
 * workforce listing screen. Every operation is one round-trip to Postgres; no
 * in-memory filtering, no fetching-everything-then-slicing.
 *
 * Keep query construction here (not in storage.ts) — these queries are specific
 * to this list view and bloating storage.ts with view-specific SQL was the
 * original problem we're walking away from.
 */

import { db } from "../../db";
import { workers, countries, businesses, contracts } from "@shared/schema";
import { and, or, eq, ilike, inArray, sql, asc, desc, type SQL } from "drizzle-orm";
import type { WorkerListQuery, WorkerListResult, WorkerListScope, SortKey } from "./types";

function orderClause(sortBy: SortKey) {
  switch (sortBy) {
    case "country": return [asc(countries.name), asc(workers.firstName)];
    case "type":    return [asc(workers.workerType), asc(workers.firstName)];
    case "business":return [asc(businesses.name), asc(workers.firstName)];
    case "created": return [desc(workers.createdAt)];
    case "name":
    default:        return [asc(workers.firstName), asc(workers.lastName)];
  }
}

function buildWhere(scope: WorkerListScope, query: WorkerListQuery): SQL | undefined {
  const conditions: SQL[] = [];

  // Scope clause (always applied — can't be overridden by query params)
  if (scope.kind === "own_business") conditions.push(eq(workers.businessId, scope.businessId));
  if (scope.kind === "self")         conditions.push(eq(workers.id, scope.workerId));
  if (scope.kind === "own_business_or_host_client") {
    // workers we employ OR workers placed at us via a contract's customerBusinessId
    const hostClientWorkerIds = db
      .select({ workerId: contracts.workerId })
      .from(contracts)
      .where(eq(contracts.customerBusinessId, scope.businessId));
    const scopeClause = or(
      eq(workers.businessId, scope.businessId),
      inArray(workers.id, hostClientWorkerIds),
    );
    if (scopeClause) conditions.push(scopeClause);
  }

  // Query filters
  // `businessId` is meant for SDP (scope: "all") to narrow the list down to a
  // specific business. For business_user scopes the caller is already limited
  // by their scope — applying an extra AND on businessId would defeat the OR
  // in `own_business_or_host_client` (filtering out host-client workers).
  if (query.businessId && scope.kind === "all") {
    conditions.push(eq(workers.businessId, query.businessId));
  }
  if (query.countryId)   conditions.push(eq(workers.countryId, query.countryId));
  if (query.workerType)  conditions.push(eq(workers.workerType, query.workerType as any));
  if (query.search) {
    const term = `%${query.search}%`;
    const searchClause = or(
      ilike(workers.firstName, term),
      ilike(workers.lastName, term),
      ilike(workers.email, term),
      sql`${workers.firstName} || ' ' || ${workers.lastName} ILIKE ${term}`,
    );
    if (searchClause) conditions.push(searchClause);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export async function fetchWorkerList(
  scope: WorkerListScope,
  query: WorkerListQuery,
): Promise<WorkerListResult> {
  const where = buildWhere(scope, query);

  // 1. Count (for `total`). Same WHERE clause, no LIMIT.
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workers)
    .innerJoin(countries, eq(workers.countryId, countries.id))
    .innerJoin(businesses, eq(workers.businessId, businesses.id))
    .where(where);
  const total = countRows[0]?.count ?? 0;

  // 2. Data (page slice).
  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select()
    .from(workers)
    .innerJoin(countries, eq(workers.countryId, countries.id))
    .innerJoin(businesses, eq(workers.businessId, businesses.id))
    .where(where)
    .orderBy(...orderClause(query.sortBy))
    .limit(query.pageSize)
    .offset(offset);

  const items = rows.map(r => ({
    ...r.workers,
    country: r.countries,
    business: r.businesses,
  }));

  return { items, total, page: query.page, pageSize: query.pageSize };
}
