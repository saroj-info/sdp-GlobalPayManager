/**
 * Contracts list repository — SQL-level filter / sort / paginate.
 *
 * Returns the raw page slice + total count. Enrichment (remuneration lines, rate
 * lines, derived status, billing lines) happens in the service AFTER pagination
 * so we only pay the per-row cost for the ~20 rows we're returning.
 */

import { db } from "../../db";
import { contracts, workers, businesses, countries, roleTitles } from "@shared/schema";
import { and, or, eq, ilike, isNull, isNotNull, sql, asc, desc, type SQL } from "drizzle-orm";
import type { ContractListQuery, ContractListResult, ContractListScope, SortKey } from "./types";

function orderClause(sortBy: SortKey) {
  switch (sortBy) {
    case "worker":  return [asc(workers.firstName), asc(workers.lastName)];
    case "role":    return [asc(sql`COALESCE(${contracts.contractName}, ${contracts.customRoleTitle}, ${roleTitles.title})`)];
    case "country": return [asc(countries.name), desc(contracts.createdAt)];
    case "status":  return [asc(contracts.status), desc(contracts.createdAt)];
    case "date":
    default:        return [desc(contracts.createdAt)];
  }
}

function buildWhere(scope: ContractListScope, query: ContractListQuery): SQL | undefined {
  const conditions: SQL[] = [];

  // Scope: who's allowed to see what
  if (scope.kind === "by_worker") {
    conditions.push(eq(contracts.workerId, scope.workerId));
  }
  if (scope.kind === "own_or_host") {
    const scopeClause = or(
      eq(contracts.businessId, scope.businessId),
      eq(contracts.customerBusinessId, scope.businessId),
    );
    if (scopeClause) conditions.push(scopeClause);
  }

  // Filters
  if (query.businessId)  conditions.push(eq(contracts.businessId, query.businessId));
  if (query.countryId)   conditions.push(eq(contracts.countryId, query.countryId));
  if (query.status) {
    // 'signed' and 'pending_signature' are derived from signing audit columns,
    // not values of the contract_status enum. Route them accordingly so we
    // don't blow up on an invalid enum cast.
    if (query.status === "signed") {
      conditions.push(isNotNull(contracts.signedAt));
    } else if (query.status === "pending_signature") {
      const pendingClause = and(
        isNotNull(contracts.signingToken),
        isNull(contracts.signedAt),
      );
      if (pendingClause) conditions.push(pendingClause);
    } else {
      conditions.push(eq(contracts.status, query.status as any));
    }
  }
  if (query.search) {
    const term = `%${query.search}%`;
    const searchClause = or(
      ilike(workers.firstName, term),
      ilike(workers.lastName, term),
      ilike(workers.email, term),
      ilike(contracts.contractName, term),
      ilike(contracts.customRoleTitle, term),
      ilike(roleTitles.title, term),
    );
    if (searchClause) conditions.push(searchClause);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export async function fetchContractList(
  scope: ContractListScope,
  query: ContractListQuery,
): Promise<ContractListResult> {
  const where = buildWhere(scope, query);

  // Count first — same WHERE clause, no LIMIT.
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contracts)
    .leftJoin(workers, eq(contracts.workerId, workers.id))
    .leftJoin(businesses, eq(contracts.businessId, businesses.id))
    .leftJoin(countries, eq(contracts.countryId, countries.id))
    .leftJoin(roleTitles, eq(contracts.roleTitleId, roleTitles.id))
    .where(where);
  const total = countRows[0]?.count ?? 0;

  // Page slice
  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select()
    .from(contracts)
    .leftJoin(workers, eq(contracts.workerId, workers.id))
    .leftJoin(businesses, eq(contracts.businessId, businesses.id))
    .leftJoin(countries, eq(contracts.countryId, countries.id))
    .leftJoin(roleTitles, eq(contracts.roleTitleId, roleTitles.id))
    .where(where)
    .orderBy(...orderClause(query.sortBy))
    .limit(query.pageSize)
    .offset(offset);

  const items = rows.map(r => ({
    ...r.contracts,
    worker: r.workers || undefined,
    business: r.businesses || undefined,
    country: r.countries || undefined,
    roleTitle: r.role_titles || undefined,
  }));

  return { items, total, page: query.page, pageSize: query.pageSize };
}
