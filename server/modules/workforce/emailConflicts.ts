/**
 * "Is this email already taken?" — one answer for every place a worker email
 * is entered (Add Worker, admin edit, worker self-edit).
 *
 * An invitation must not go out to an address that cannot complete signup:
 * `POST /api/signup` refuses an address that already has a `users` row, and a
 * second `workers` row for one person breaks the workforce views. So the
 * check covers every table where a login or a pending invitation lives:
 *
 *   users                 any login (business, SDP, worker, host client)
 *   workers               another worker row
 *   sdp_user_invites      pending (not accepted, not expired)
 *   business_user_invites pending (not accepted, not expired)
 *   third_party_businesses contact email (gets a login of its own)
 *
 * Matching is case-insensitive. Callers normalise what they store with
 * `normalizeEmail` so the stored value matches what the signup form sends.
 */

import { db } from "../../db";
import { businessUserInvites, sdpUserInvites, thirdPartyBusinesses, users, workers } from "@shared/schema";
import { and, gt, isNull, ne, sql, type SQL } from "drizzle-orm";

export type EmailConflictKind = "user" | "worker" | "sdp_invite" | "business_invite" | "third_party_business";

export interface EmailConflict {
  kind: EmailConflictKind;
  /** Row id of the conflicting record (not shown to users). */
  id: string;
}

export interface EmailConflictOptions {
  /** The worker being edited: its own row is not a conflict. */
  excludeWorkerId?: string | null;
  /** The login already linked to that worker: not a conflict either. */
  excludeUserId?: string | null;
}

const CONFLICT_MESSAGES: Record<EmailConflictKind, string> = {
  user: "is already used by an existing user account",
  worker: "already belongs to another worker",
  sdp_invite: "has a pending SDP user invitation",
  business_invite: "has a pending team member invitation",
  third_party_business: "belongs to a third-party business contact",
};

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Full sentence for a 409 body, e.g. "jane@x.com is already used by an existing user account." */
export function describeEmailConflict(conflict: EmailConflict, email: string): string {
  return `${normalizeEmail(email) || "This email"} ${CONFLICT_MESSAGES[conflict.kind]}.`;
}

export async function findEmailConflict(
  email: string,
  options: EmailConflictOptions = {},
): Promise<EmailConflict | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const lowerEq = (column: unknown): SQL => sql`lower(${column}) = ${normalized}`;
  const now = new Date();

  const userWhere = options.excludeUserId
    ? and(lowerEq(users.email), ne(users.id, options.excludeUserId))
    : lowerEq(users.email);
  const [user] = await db.select({ id: users.id }).from(users).where(userWhere).limit(1);
  if (user) return { kind: "user", id: user.id };

  const workerWhere = options.excludeWorkerId
    ? and(lowerEq(workers.email), ne(workers.id, options.excludeWorkerId))
    : lowerEq(workers.email);
  const [worker] = await db.select({ id: workers.id }).from(workers).where(workerWhere).limit(1);
  if (worker) return { kind: "worker", id: worker.id };

  const [sdpInvite] = await db
    .select({ id: sdpUserInvites.id })
    .from(sdpUserInvites)
    .where(and(lowerEq(sdpUserInvites.email), isNull(sdpUserInvites.acceptedAt), gt(sdpUserInvites.expiresAt, now)))
    .limit(1);
  if (sdpInvite) return { kind: "sdp_invite", id: sdpInvite.id };

  const [businessInvite] = await db
    .select({ id: businessUserInvites.id })
    .from(businessUserInvites)
    .where(and(lowerEq(businessUserInvites.email), isNull(businessUserInvites.acceptedAt), gt(businessUserInvites.expiresAt, now)))
    .limit(1);
  if (businessInvite) return { kind: "business_invite", id: businessInvite.id };

  const [thirdParty] = await db
    .select({ id: thirdPartyBusinesses.id })
    .from(thirdPartyBusinesses)
    .where(lowerEq(thirdPartyBusinesses.email))
    .limit(1);
  if (thirdParty) return { kind: "third_party_business", id: thirdParty.id };

  return null;
}
