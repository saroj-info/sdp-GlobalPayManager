/**
 * Worker invitation tokens: issue (create, resend, email change) and look up
 * (signup prefill, signup accept).
 *
 * The raw token travels only in the email link (`/signup?token=<raw>`); the
 * worker row stores its SHA-256 (`workers.invitationToken`) and the expiry
 * (`invitationTokenExpiresAt`, 72 h). Issuing a token replaces the previous
 * one, so every earlier link stops working.
 *
 * Order of operations in `issueInvitation`: persist the new hash, then send.
 * `emailService.sendEmail` never throws; it returns `false`. When the send
 * fails the previous token and expiry are put back, so a link that was
 * already in someone's inbox keeps working and the caller can report the
 * failure instead of claiming "sent". Before this, a failed send left the
 * row pointing at a token nobody ever received.
 *
 * Built as a factory so the logic runs against Map-backed stand-ins in
 * tests; `workerInvitations` is the wired singleton.
 */

import crypto from "crypto";
import type { Worker } from "@shared/schema";
import { storage } from "../../storage";
import { emailService } from "../../emailService";

export const WORKER_INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

export interface WorkerInvitationDeps {
  getWorkerByInvitationToken(tokenHash: string): Promise<Worker | undefined>;
  updateWorkerProfile(workerId: string, updates: Partial<Worker>): Promise<Worker>;
  getBusinessById(id: string): Promise<{ name: string } | undefined>;
  getThirdPartyBusinessById(id: string): Promise<{ name: string; email: string } | undefined | null>;
  sendWorkerInvitationEmail(to: string, firstName: string, rawToken: string, businessName: string): Promise<boolean>;
  /** Test seam. */
  now?: () => Date;
}

export type IssueInvitationResult =
  | { sent: true; to: string; expiresAt: Date; worker: Worker }
  | { sent: false; to: string; worker: Worker };

export type LookupInvitationResult =
  | { ok: true; worker: Worker }
  | { ok: false; status: 404 | 410; code: "INVITATION_INVALID" | "INVITATION_EXPIRED"; message: string };

export const INVITATION_INVALID_MESSAGE =
  "This invitation link is no longer valid. If you received a newer invitation email, use the link in that one; otherwise ask to be invited again.";
export const INVITATION_EXPIRED_MESSAGE =
  "This invitation link has expired. Please ask to be re-invited.";

export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function createWorkerInvitationService(deps: WorkerInvitationDeps) {
  const now = deps.now ?? (() => new Date());

  /** Who receives the link: the third-party contact for third-party workers, else the worker. */
  async function resolveRecipient(worker: Worker): Promise<{ to: string; businessName: string }> {
    if (worker.workerType === "third_party_worker" && worker.thirdPartyBusinessId) {
      const thirdParty = await deps.getThirdPartyBusinessById(worker.thirdPartyBusinessId);
      if (thirdParty?.email) return { to: thirdParty.email, businessName: thirdParty.name };
    }
    const business = worker.businessId ? await deps.getBusinessById(worker.businessId) : undefined;
    return { to: worker.email, businessName: business?.name || "SDP Global Pay" };
  }

  async function issueInvitation(worker: Worker): Promise<IssueInvitationResult> {
    const { to, businessName } = await resolveRecipient(worker);
    const previous: Partial<Worker> = {
      invitationToken: worker.invitationToken ?? null,
      invitationTokenExpiresAt: worker.invitationTokenExpiresAt ?? null,
      invitationSent: worker.invitationSent ?? false,
    };

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(now().getTime() + WORKER_INVITATION_TTL_MS);
    const updated = await deps.updateWorkerProfile(worker.id, {
      invitationToken: hashInvitationToken(rawToken),
      invitationTokenExpiresAt: expiresAt,
      invitationSent: true,
    });

    let sent = false;
    try {
      sent = await deps.sendWorkerInvitationEmail(to, worker.firstName, rawToken, businessName);
    } catch (error: any) {
      console.error(`[workforce] invitation email to ${to} threw: ${error?.message ?? String(error)}`);
      sent = false;
    }

    if (!sent) {
      const restored = await deps.updateWorkerProfile(worker.id, previous);
      return { sent: false, to, worker: restored };
    }
    return { sent: true, to, expiresAt, worker: updated };
  }

  async function lookupInvitation(rawToken: string): Promise<LookupInvitationResult> {
    if (!rawToken) {
      return { ok: false, status: 404, code: "INVITATION_INVALID", message: INVITATION_INVALID_MESSAGE };
    }
    const worker = await deps.getWorkerByInvitationToken(hashInvitationToken(rawToken));
    if (!worker) {
      return { ok: false, status: 404, code: "INVITATION_INVALID", message: INVITATION_INVALID_MESSAGE };
    }
    if (worker.invitationTokenExpiresAt && now() > worker.invitationTokenExpiresAt) {
      return { ok: false, status: 410, code: "INVITATION_EXPIRED", message: INVITATION_EXPIRED_MESSAGE };
    }
    return { ok: true, worker };
  }

  return { issueInvitation, lookupInvitation, resolveRecipient };
}

export type WorkerInvitationService = ReturnType<typeof createWorkerInvitationService>;

export const workerInvitations: WorkerInvitationService = createWorkerInvitationService({
  getWorkerByInvitationToken: (hash) => storage.getWorkerByInvitationToken(hash),
  updateWorkerProfile: (id, updates) => storage.updateWorkerProfile(id, updates),
  getBusinessById: (id) => storage.getBusinessById(id),
  getThirdPartyBusinessById: (id) => storage.getThirdPartyBusinessById(id),
  sendWorkerInvitationEmail: (to, firstName, rawToken, businessName) =>
    emailService.sendWorkerInvitationEmail(to, firstName, rawToken, businessName),
});
