/**
 * Direct Drizzle access for deleting a contract: activity counts and the
 * transactional delete. Nothing here goes through `storage`, and nothing
 * inside the transaction uses the pooled `db` (it would not see the
 * uncommitted delete).
 */
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  contracts,
  invoices,
  marginPayments,
  purchaseOrders,
  quotes,
  sdpInvoices,
  timesheets,
  workerBusinessAssociations,
} from "@shared/schema";
import type { ContractActivityCounts, DeleteOutcome } from "./types";

const countOf = sql<number>`count(*)::int`;

/** Rows that block or accompany a delete. The blockers are also non-cascading FKs. */
export async function countContractActivity(contractId: string): Promise<ContractActivityCounts> {
  const contractPoIds = db
    .select({ id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.contractId, contractId));
  const [[ts], [inv], [sdp], [mp], [ren], [po]] = await Promise.all([
    db.select({ n: countOf }).from(timesheets).where(eq(timesheets.contractId, contractId)),
    db.select({ n: countOf }).from(invoices).where(eq(invoices.contractId, contractId)),
    db.select({ n: countOf }).from(sdpInvoices).where(
      or(eq(sdpInvoices.contractId, contractId), inArray(sdpInvoices.purchaseOrderId, contractPoIds)),
    ),
    db.select({ n: countOf }).from(marginPayments).where(eq(marginPayments.contractId, contractId)),
    db.select({ n: countOf }).from(contracts).where(eq(contracts.renewedFromContractId, contractId)),
    db.select({ n: countOf }).from(purchaseOrders).where(eq(purchaseOrders.contractId, contractId)),
  ]);
  return {
    timesheets: ts?.n ?? 0,
    invoices: inv?.n ?? 0,
    sdpInvoices: sdp?.n ?? 0,
    marginPayments: mp?.n ?? 0,
    renewals: ren?.n ?? 0,
    purchaseOrders: po?.n ?? 0,
  };
}

class ContractMissing extends Error {}

/**
 * One transaction: detach the reserved quote link and the worker-business
 * association rows, then delete the contract (lines, POs, change log and the
 * billing-terms acceptance cascade). A non-cascading row that appeared after the
 * activity check makes Postgres refuse (23503) → `in_use`.
 */
export async function deleteContractWithLinks(contractId: string): Promise<DeleteOutcome> {
  try {
    return await db.transaction(async (tx) => {
      await tx
        .update(quotes)
        .set({ convertedContractId: null })
        .where(eq(quotes.convertedContractId, contractId));
      const clearedAssociations = await tx
        .update(workerBusinessAssociations)
        .set({ sourceContractId: null, updatedAt: new Date() })
        .where(eq(workerBusinessAssociations.sourceContractId, contractId))
        .returning({
          workerId: workerBusinessAssociations.workerId,
          businessId: workerBusinessAssociations.businessId,
          status: workerBusinessAssociations.status,
        });
      const deleted = await tx.delete(contracts).where(eq(contracts.id, contractId)).returning({ id: contracts.id });
      if (deleted.length === 0) throw new ContractMissing();
      return { outcome: "deleted" as const, clearedAssociations };
    });
  } catch (error: any) {
    if (error instanceof ContractMissing) return { outcome: "missing" };
    if (error?.code === "23503") return { outcome: "in_use" };
    throw error;
  }
}

/** Contracts of any status between the pair (used after a delete to decide whether the association still has a reason to exist). */
export async function countContractsForWorkerAndBusiness(workerId: string, businessId: string): Promise<number> {
  const [row] = await db
    .select({ n: countOf })
    .from(contracts)
    .where(and(eq(contracts.workerId, workerId), eq(contracts.businessId, businessId)));
  return row?.n ?? 0;
}
