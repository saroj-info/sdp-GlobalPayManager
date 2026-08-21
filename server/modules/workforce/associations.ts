/**
 * Worker-Business associations — the many-to-many link that lets one worker
 * be shared across multiple businesses. Today's primary use case is SDP
 * employing a worker directly and then surfacing them onto a customer
 * business's workforce via an on-behalf contract.
 *
 * The link is written when an SDP admin creates an on-behalf contract for a
 * customer business with a worker whose home business is the SDP-owned row.
 * The customer then treats the shared worker like any other workforce member
 * (contracts, timesheets, leave, invoicing) with a read-only profile.
 */

import { db } from "../../db";
import { workerBusinessAssociations } from "@shared/schema";
import { and, eq } from "drizzle-orm";

export async function getActiveAssociations(
  workerId: string,
): Promise<{ businessId: string; sourceContractId: string | null }[]> {
  const rows = await db
    .select({
      businessId: workerBusinessAssociations.businessId,
      sourceContractId: workerBusinessAssociations.sourceContractId,
    })
    .from(workerBusinessAssociations)
    .where(and(
      eq(workerBusinessAssociations.workerId, workerId),
      eq(workerBusinessAssociations.status, 'active'),
    ));
  return rows;
}

export async function isWorkerLinkedToBusiness(
  workerId: string,
  businessId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: workerBusinessAssociations.id })
    .from(workerBusinessAssociations)
    .where(and(
      eq(workerBusinessAssociations.workerId, workerId),
      eq(workerBusinessAssociations.businessId, businessId),
      eq(workerBusinessAssociations.status, 'active'),
    ))
    .limit(1);
  return Boolean(row);
}

/**
 * Idempotent — if an active row for (worker, business) already exists, keep
 * the existing sourceContractId (the FIRST contract that surfaced the worker
 * to this business is the meaningful audit anchor). If no active row exists,
 * insert one. Any 'removed' row for the same pair is left in place as history.
 */
export async function upsertContractAssociation(
  workerId: string,
  businessId: string,
  sourceContractId: string,
  addedBy: string,
): Promise<void> {
  const existing = await isWorkerLinkedToBusiness(workerId, businessId);
  if (existing) {
    await db
      .update(workerBusinessAssociations)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(workerBusinessAssociations.workerId, workerId),
        eq(workerBusinessAssociations.businessId, businessId),
        eq(workerBusinessAssociations.status, 'active'),
      ));
    return;
  }
  try {
    await db.insert(workerBusinessAssociations).values({
      workerId,
      businessId,
      status: 'active',
      addedBy,
      sourceContractId,
    });
  } catch {
    // Race: the partial unique index rejected a concurrent insert. Fine —
    // an active association exists, which is the outcome we wanted.
  }
}

/**
 * Mark the (worker, business) association removed. Caller is expected to
 * verify no active contracts reference the pair before calling — this helper
 * does not check.
 */
export async function deactivateAssociation(
  workerId: string,
  businessId: string,
): Promise<void> {
  await db
    .update(workerBusinessAssociations)
    .set({ status: 'removed', updatedAt: new Date() })
    .where(and(
      eq(workerBusinessAssociations.workerId, workerId),
      eq(workerBusinessAssociations.businessId, businessId),
      eq(workerBusinessAssociations.status, 'active'),
    ));
}
