/**
 * SQL for the billing-terms versions and acceptances. Direct drizzle like the
 * other modules; `storage` is only used for business/country lookups (service).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import {
  billingTermsVersions,
  contractBillingTermsAcceptances,
  contractChangeLog,
  contracts,
  users,
  type BillingTermsVersion,
  type ContractBillingTermsAcceptance,
  type InsertContractBillingTermsAcceptance,
} from "@shared/schema";
import type { AcceptanceRow } from "./types";

export interface BillingTermsRepository {
  getPublishedVersion(): Promise<BillingTermsVersion | undefined>;
  getDraftVersion(): Promise<BillingTermsVersion | undefined>;
  getVersionById(id: string): Promise<BillingTermsVersion | undefined>;
  listVersions(): Promise<BillingTermsVersion[]>;
  createDraft(input: { title: string; bodyTemplate: string; changelog?: string | null; createdByUserId: string }): Promise<BillingTermsVersion>;
  updateDraft(id: string, input: { title?: string; bodyTemplate?: string; changelog?: string | null; updatedByUserId: string }): Promise<BillingTermsVersion | undefined>;
  publishVersion(id: string, publishedByUserId: string, bodyHash: string): Promise<BillingTermsVersion>;
  insertAcceptance(row: InsertContractBillingTermsAcceptance): Promise<ContractBillingTermsAcceptance>;
  getLatestAcceptanceForContract(contractId: string): Promise<AcceptanceRow | undefined>;
  insertChangeLog(row: { contractId: string; fieldName: string; oldValue: string | null; newValue: string; changedBy: string | null }): Promise<void>;
  hardDeleteContract(contractId: string): Promise<void>;
}

export const repository: BillingTermsRepository = {
  async getPublishedVersion() {
    const [row] = await db.select().from(billingTermsVersions).where(eq(billingTermsVersions.status, 'published')).limit(1);
    return row;
  },
  async getDraftVersion() {
    const [row] = await db.select().from(billingTermsVersions).where(eq(billingTermsVersions.status, 'draft')).limit(1);
    return row;
  },
  async getVersionById(id) {
    const [row] = await db.select().from(billingTermsVersions).where(eq(billingTermsVersions.id, id)).limit(1);
    return row;
  },
  async listVersions() {
    return db.select().from(billingTermsVersions).orderBy(desc(billingTermsVersions.versionNumber));
  },
  async createDraft(input) {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${billingTermsVersions.versionNumber}), 0)` })
      .from(billingTermsVersions);
    const [row] = await db
      .insert(billingTermsVersions)
      .values({
        versionNumber: Number(max) + 1,
        title: input.title,
        bodyTemplate: input.bodyTemplate,
        changelog: input.changelog ?? null,
        status: 'draft',
        createdByUserId: input.createdByUserId,
        updatedByUserId: input.createdByUserId,
      })
      .returning();
    return row;
  },
  async updateDraft(id, input) {
    const [row] = await db
      .update(billingTermsVersions)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.bodyTemplate !== undefined ? { bodyTemplate: input.bodyTemplate } : {}),
        ...(input.changelog !== undefined ? { changelog: input.changelog } : {}),
        updatedByUserId: input.updatedByUserId,
        updatedAt: new Date(),
      })
      .where(and(eq(billingTermsVersions.id, id), eq(billingTermsVersions.status, 'draft')))
      .returning();
    return row;
  },
  async publishVersion(id, publishedByUserId, bodyHash) {
    return db.transaction(async (tx) => {
      await tx
        .update(billingTermsVersions)
        .set({ status: 'superseded', updatedAt: new Date() })
        .where(eq(billingTermsVersions.status, 'published'));
      const [row] = await tx
        .update(billingTermsVersions)
        .set({ status: 'published', bodyHash, publishedAt: new Date(), publishedByUserId, updatedAt: new Date() })
        .where(eq(billingTermsVersions.id, id))
        .returning();
      return row;
    });
  },
  async insertAcceptance(row) {
    const [inserted] = await db.insert(contractBillingTermsAcceptances).values(row).returning();
    return inserted;
  },
  async getLatestAcceptanceForContract(contractId) {
    const acceptedBy = alias(users, 'accepted_by');
    const recordedBy = alias(users, 'recorded_by');
    const [row] = await db
      .select({
        acceptance: contractBillingTermsAcceptances,
        acceptedByFirst: acceptedBy.firstName,
        acceptedByLast: acceptedBy.lastName,
        recordedByFirst: recordedBy.firstName,
        recordedByLast: recordedBy.lastName,
      })
      .from(contractBillingTermsAcceptances)
      .leftJoin(acceptedBy, eq(contractBillingTermsAcceptances.acceptedByUserId, acceptedBy.id))
      .leftJoin(recordedBy, eq(contractBillingTermsAcceptances.recordedByUserId, recordedBy.id))
      .where(eq(contractBillingTermsAcceptances.contractId, contractId))
      .orderBy(desc(contractBillingTermsAcceptances.createdAt))
      .limit(1);
    if (!row) return undefined;
    const name = (f: string | null, l: string | null) => [f, l].filter(Boolean).join(' ') || null;
    return {
      ...row.acceptance,
      acceptedByName: name(row.acceptedByFirst, row.acceptedByLast),
      recordedByName: name(row.recordedByFirst, row.recordedByLast),
    };
  },
  async insertChangeLog(row) {
    await db.insert(contractChangeLog).values(row);
  },
  async hardDeleteContract(contractId) {
    await db.delete(contracts).where(eq(contracts.id, contractId));
  },
};
