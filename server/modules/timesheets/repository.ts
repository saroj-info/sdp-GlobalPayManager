/**
 * Timesheets list repository — SQL filter/sort/paginate + grouped status counts.
 *
 * Two queries:
 *   1. count(*) WHERE <scope+filters except status>, grouped by status → for the
 *      summary badges. Excluding the status filter is intentional: the badges
 *      show how many rows exist in each status given the OTHER filters.
 *   2. page slice — full join, ordered, LIMIT/OFFSET.
 */

import { db } from "../../db";
import { timesheets, workers, businesses, contracts, countries } from "@shared/schema";
import { and, or, eq, ilike, sql, asc, desc, type SQL } from "drizzle-orm";
import type { SortKey, TimesheetListQuery, TimesheetListResult, TimesheetListScope } from "./types";

function orderClause(sortBy: SortKey) {
  switch (sortBy) {
    case "period_start": return [desc(timesheets.periodStart)];
    case "status":       return [asc(timesheets.status), desc(timesheets.periodEnd)];
    case "submitted":    return [desc(timesheets.submittedAt), desc(timesheets.createdAt)];
    case "worker":       return [asc(workers.firstName), asc(workers.lastName)];
    case "period_end":
    default:             return [desc(timesheets.periodEnd)];
  }
}

function buildScopeAndFilters(
  scope: TimesheetListScope,
  query: TimesheetListQuery,
  includeStatusFilter: boolean,
): SQL | undefined {
  const conditions: SQL[] = [];

  // Scope clause (auth)
  if (scope.kind === "by_worker") {
    conditions.push(eq(timesheets.workerId, scope.workerId));
  }
  if (scope.kind === "business") {
    // Business sees timesheets where they're the employing business OR the host client on the contract.
    const scopeClause = or(
      eq(timesheets.businessId, scope.businessId),
      eq(contracts.customerBusinessId, scope.businessId),
    );
    if (scopeClause) conditions.push(scopeClause);
  }

  if (includeStatusFilter && query.status) conditions.push(eq(timesheets.status, query.status as any));
  if (query.businessId)  conditions.push(eq(timesheets.businessId, query.businessId));
  if (query.countryId)   conditions.push(eq(contracts.countryId, query.countryId));
  if (query.hostClientName) {
    conditions.push(ilike(sql`COALESCE((SELECT name FROM businesses b WHERE b.id = ${contracts.customerBusinessId}), '')`, `%${query.hostClientName}%`));
  }
  if (query.search) {
    const term = `%${query.search}%`;
    const searchClause = or(
      ilike(workers.firstName, term),
      ilike(workers.lastName, term),
      sql`${workers.firstName} || ' ' || ${workers.lastName} ILIKE ${term}`,
    );
    if (searchClause) conditions.push(searchClause);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export async function fetchTimesheetList(
  scope: TimesheetListScope,
  query: TimesheetListQuery,
): Promise<Omit<TimesheetListResult, "page" | "pageSize"> & { items: any[]; total: number; statusCounts: any }> {
  const wherePaginated = buildScopeAndFilters(scope, query, true);
  const whereForCounts = buildScopeAndFilters(scope, query, false);

  // 1. Page total + slice
  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(timesheets)
    .leftJoin(workers, eq(timesheets.workerId, workers.id))
    .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
    .where(wherePaginated);
  const total = totalRow[0]?.count ?? 0;

  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select()
    .from(timesheets)
    .leftJoin(workers, eq(timesheets.workerId, workers.id))
    .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
    .leftJoin(countries, eq(contracts.countryId, countries.id))
    .leftJoin(businesses, eq(timesheets.businessId, businesses.id))
    .where(wherePaginated)
    .orderBy(...orderClause(query.sortBy))
    .limit(query.pageSize)
    .offset(offset);

  const items = rows.map(r => ({
    ...r.timesheets,
    worker: r.workers || undefined,
    business: r.businesses || undefined,
    contract: r.contracts || undefined,
    country: r.countries || undefined,
    countryId: r.contracts?.countryId || undefined,
    countryName: r.countries?.name || undefined,
  }));

  // 2. Status counts (ignoring the status filter so badges show true totals across statuses)
  const countRows = await db
    .select({ status: timesheets.status, count: sql<number>`count(*)::int` })
    .from(timesheets)
    .leftJoin(contracts, eq(timesheets.contractId, contracts.id))
    .leftJoin(workers, eq(timesheets.workerId, workers.id))
    .where(whereForCounts)
    .groupBy(timesheets.status);
  const statusCounts = { all: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 };
  for (const row of countRows) {
    const s = (row.status as any) ?? "draft";
    statusCounts.all += row.count;
    if ((statusCounts as any)[s] !== undefined) (statusCounts as any)[s] += row.count;
  }

  return { items, total, statusCounts };
}
