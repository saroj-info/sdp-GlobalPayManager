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
import { workers, countries, businesses, contracts, workerBusinessAssociations } from "@shared/schema";
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
    // Workers we employ OR workers placed at us via a contract's customerBusinessId
    // OR workers shared into us via a worker_business_associations row (used
    // when SDP creates an on-behalf contract for an SDP-direct worker — the
    // customer's workforce should surface them like any other member).
    const hostClientWorkerIds = db
      .select({ workerId: contracts.workerId })
      .from(contracts)
      .where(eq(contracts.customerBusinessId, scope.businessId));
    const linkedWorkerIds = db
      .select({ workerId: workerBusinessAssociations.workerId })
      .from(workerBusinessAssociations)
      .where(and(
        eq(workerBusinessAssociations.businessId, scope.businessId),
        eq(workerBusinessAssociations.status, 'active'),
      ));
    const scopeClause = or(
      eq(workers.businessId, scope.businessId),
      inArray(workers.id, hostClientWorkerIds),
      inArray(workers.id, linkedWorkerIds),
    );
    if (scopeClause) conditions.push(scopeClause);
  }

  // Query filters
  // `businessId` is meant for SDP (scope: "all") to narrow the list down to a
  // specific business. For business_user scopes the caller is already limited
  // by their scope — applying an extra AND on businessId would defeat the OR
  // in `own_business_or_host_client` (filtering out host-client workers).
  if (query.businessId && scope.kind === "all") {
    // Widen: when SDP-internal narrows the picker to a customer business,
    // also surface SDP-direct workers so the admin can share an SDP employee
    // into that customer via an on-behalf contract.
    const sdpLinkedWorkerIds = db
      .select({ workerId: workerBusinessAssociations.workerId })
      .from(workerBusinessAssociations)
      .where(and(
        eq(workerBusinessAssociations.businessId, query.businessId),
        eq(workerBusinessAssociations.status, 'active'),
      ));
    const pickerClause = or(
      eq(workers.businessId, query.businessId),
      // Any worker whose home is an SDP-owned business, regardless of the
      // specific SDP row's id (there's only one, but this reads cleanly).
      eq(businesses.isSdpOwned, true),
      inArray(workers.id, sdpLinkedWorkerIds),
    );
    if (pickerClause) conditions.push(pickerClause);
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

  // For business_user scope, flag rows whose worker is home'd elsewhere
  // (SDP-owned) so the UI can badge them as "SDP-employed" and grey out
  // profile-edit affordances. Non-scoped views (SDP internal) always see
  // the raw home business, so the flag is false there.
  const currentBusinessId =
    scope.kind === "own_business" ? scope.businessId :
    scope.kind === "own_business_or_host_client" ? scope.businessId :
    null;

  const items = rows.map(r => {
    const homeBiz = r.businesses as any;
    const isSharedFromSdp = Boolean(
      currentBusinessId
      && homeBiz?.isSdpOwned === true
      && r.workers.businessId !== currentBusinessId,
    );
    return {
      ...r.workers,
      country: r.countries,
      business: r.businesses,
      isSharedFromSdp,
    };
  });

  return { items, total, page: query.page, pageSize: query.pageSize };
}
