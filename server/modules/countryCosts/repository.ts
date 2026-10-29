/**
 * SQL for `country_cost_items` (Cost Settings). Direct drizzle like the other
 * modules; countries are read through `storage` in the service.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { countryCostItems, type CountryCostItemRow, type InsertCountryCostItem } from "@shared/schema";
import type { CountryCostItem, CostAppliesTo, CostCalcType } from "@shared/countryCosts";

export type NewCountryCostItemRow = Omit<InsertCountryCostItem, "id" | "createdAt" | "updatedAt">;

export interface CountryCostsRepository {
  listActive(): Promise<CountryCostItemRow[]>;
  listForCountry(countryId: string, includeInactive: boolean): Promise<CountryCostItemRow[]>;
  countForCountry(countryId: string): Promise<number>;
  insertMany(rows: NewCountryCostItemRow[]): Promise<CountryCostItemRow[]>;
  /** Delete the country's rows and insert the new set in one transaction. */
  replaceForCountry(countryId: string, rows: NewCountryCostItemRow[]): Promise<CountryCostItemRow[]>;
}

/** DB row → wire item (decimals to numbers, the array typed). */
export function toCostItem(row: CountryCostItemRow): CountryCostItem {
  return {
    id: row.id,
    countryId: row.countryId,
    stateProvince: row.stateProvince ?? null,
    itemKey: row.itemKey,
    name: row.name,
    description: row.description ?? "",
    appliesTo: (row.appliesTo ?? []) as CostAppliesTo[],
    calcType: row.calcType as CostCalcType,
    value: Number(row.value) || 0,
    capAmount: row.capAmount != null ? Number(row.capAmount) : null,
    sortOrder: row.sortOrder,
    isActive: row.isActive !== false,
  };
}

const order = [asc(countryCostItems.countryId), asc(countryCostItems.sortOrder), asc(countryCostItems.createdAt)];

export const repository: CountryCostsRepository = {
  async listActive() {
    return db.select().from(countryCostItems).where(eq(countryCostItems.isActive, true)).orderBy(...order);
  },

  async listForCountry(countryId, includeInactive) {
    const where = includeInactive
      ? eq(countryCostItems.countryId, countryId)
      : and(eq(countryCostItems.countryId, countryId), eq(countryCostItems.isActive, true));
    return db.select().from(countryCostItems).where(where).orderBy(...order);
  },

  async countForCountry(countryId) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(countryCostItems)
      .where(eq(countryCostItems.countryId, countryId));
    return Number(count) || 0;
  },

  async insertMany(rows) {
    if (rows.length === 0) return [];
    return db.insert(countryCostItems).values(rows).returning();
  },

  async replaceForCountry(countryId, rows) {
    return db.transaction(async (tx) => {
      await tx.delete(countryCostItems).where(eq(countryCostItems.countryId, countryId));
      if (rows.length === 0) return [];
      return tx.insert(countryCostItems).values(rows).returning();
    });
  },
};
