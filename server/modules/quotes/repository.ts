/**
 * SQL for quotes and the admin fee schedule. Direct drizzle like the other
 * modules; countries and jurisdictions are read through `storage` (service).
 */
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  quotes,
  quoteFeeDefaults,
  type Quote,
  type InsertQuote,
  type QuoteFeeDefault,
  type InsertQuoteFeeDefault,
} from "@shared/schema";
import { formatQuoteNumber, QUOTE_NUMBER_LOCK_KEY } from "./numbering";
import type { QuoteListQuery } from "./types";

export type NewQuoteRow = Omit<InsertQuote, "id" | "quoteNumber" | "quoteYear" | "quoteSeq" | "createdAt" | "updatedAt">;
export type QuoteUpdateRow = Partial<Omit<InsertQuote, "id" | "quoteNumber" | "quoteYear" | "quoteSeq" | "createdAt" | "createdByUserId">>;
export type NewFeeDefaultRow = Omit<InsertQuoteFeeDefault, "id" | "createdAt" | "updatedAt">;

export interface QuotesRepository {
  list(q: QuoteListQuery): Promise<{ items: Quote[]; total: number }>;
  getById(id: string): Promise<Quote | undefined>;
  insert(row: NewQuoteRow, year: number): Promise<Quote>;
  update(id: string, row: QuoteUpdateRow): Promise<Quote | undefined>;
  delete(id: string): Promise<boolean>;
  listFeeDefaults(): Promise<QuoteFeeDefault[]>;
  replaceFeeDefaults(rows: NewFeeDefaultRow[]): Promise<QuoteFeeDefault[]>;
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export const repository: QuotesRepository = {
  async list(q) {
    const conds = [];
    if (q.search) {
      const pattern = `%${escapeLike(q.search)}%`;
      conds.push(or(ilike(quotes.quoteNumber, pattern), ilike(quotes.title, pattern), ilike(quotes.clientName, pattern)));
    }
    if (q.status) conds.push(eq(quotes.status, q.status));
    if (q.countryId) conds.push(eq(quotes.countryId, q.countryId));
    const where = conds.length ? and(...conds) : undefined;

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(quotes).where(where);
    const orderBy =
      q.sortBy === "number"
        ? [desc(quotes.quoteYear), desc(quotes.quoteSeq)]
        : q.sortBy === "country"
          ? [asc(quotes.countryId), desc(quotes.updatedAt)]
          : [desc(quotes.updatedAt)];
    const items = await db
      .select()
      .from(quotes)
      .where(where)
      .orderBy(...orderBy)
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);
    return { items, total: Number(count) };
  },

  async getById(id) {
    const [row] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    return row;
  },

  // The number is allocated inside one transaction under an advisory lock so
  // two saves in the same second cannot both take max+1.
  async insert(row, year) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${QUOTE_NUMBER_LOCK_KEY}))`);
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${quotes.quoteSeq}), 0)` })
        .from(quotes)
        .where(eq(quotes.quoteYear, year));
      const seq = Number(max) + 1;
      const [created] = await tx
        .insert(quotes)
        .values({ ...row, quoteYear: year, quoteSeq: seq, quoteNumber: formatQuoteNumber(year, seq) })
        .returning();
      return created;
    });
  },

  async update(id, row) {
    const [updated] = await db.update(quotes).set(row).where(eq(quotes.id, id)).returning();
    return updated;
  },

  async delete(id) {
    const deleted = await db.delete(quotes).where(eq(quotes.id, id)).returning({ id: quotes.id });
    return deleted.length > 0;
  },

  async listFeeDefaults() {
    return db
      .select()
      .from(quoteFeeDefaults)
      .orderBy(asc(quoteFeeDefaults.engagementCategory), asc(quoteFeeDefaults.sdpIsBillingAgent), asc(quoteFeeDefaults.sortOrder));
  },

  async replaceFeeDefaults(rows) {
    return db.transaction(async (tx) => {
      await tx.delete(quoteFeeDefaults);
      if (rows.length === 0) return [];
      return tx.insert(quoteFeeDefaults).values(rows).returning();
    });
  },
};
