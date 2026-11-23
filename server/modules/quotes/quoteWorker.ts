/**
 * The employee named on a quote, turned into a worker + login when the quote
 * is converted to a contract.
 *
 * 1. `ensureQuoteWorker` (`POST /api/quotes/:id/worker`, called by the contract
 *    wizard right before `POST /api/contracts`): reuses the worker already
 *    linked to the quote, or a worker with the same email on the target
 *    business / the SDP-owned business, else creates one (no invitation).
 *    `quotes.workerId` remembers it, so a failed contract POST retried later
 *    never makes a duplicate. `updatedAt` is not bumped (a bump would mark
 *    the client's response link superseded).
 * 2. `provisionQuoteWorkerLogin` (called from `POST /api/contracts` after
 *    `markConverted`): when the contract's worker is the quote's worker and it
 *    has no login yet, creates a `users` row with a temporary password, links
 *    it, and emails the credentials. Best effort: logged, never fails the
 *    contract.
 */
import crypto from "crypto";
import bcrypt from "bcrypt";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { emailService } from "../../emailService";
import { workers, type Worker } from "@shared/schema";
import { deriveContractFields, normaliseStoredQuote, type QuoteInput } from "@shared/quotes";
import { findEmailConflict, describeEmailConflict, normalizeEmail } from "../workforce";
import { repository } from "./repository";
import type { Result } from "./types";

export interface QuoteWorkerCaller {
  id: string;
  userType: string;
  sdpRole?: string | null;
  accessibleBusinessIds?: string[] | null;
}

const fail = (status: number, code: string, message: string): Result<never> => ({ ok: false, status, message, code });

function canUseBusiness(user: QuoteWorkerCaller, businessId: string): boolean {
  if (user.sdpRole === "sdp_super_admin" || user.sdpRole === "sdp_admin") return true;
  const ids = Array.isArray(user.accessibleBusinessIds) ? user.accessibleBusinessIds : [];
  return ids.includes(businessId);
}

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

export async function ensureQuoteWorker(
  user: QuoteWorkerCaller,
  quoteId: string,
  body: { businessId?: string | null } | undefined,
): Promise<Result<{ worker: Worker; created: boolean }>> {
  if (user.userType !== "sdp_internal") return fail(403, "NOT_AUTHORIZED", "Only SDP users can convert quotes.");
  const quote = await repository.getById(quoteId);
  if (!quote) return fail(404, "QUOTE_NOT_FOUND", "Quote not found");
  if (quote.convertedContractId) {
    return fail(409, "QUOTE_ALREADY_CONVERTED", `Quote ${quote.quoteNumber} has already been converted to a contract.`);
  }
  const email = normalizeEmail(quote.workerEmail);
  if (!email || !quote.workerFirstName?.trim() || !quote.workerLastName?.trim()) {
    return fail(400, "QUOTE_NO_WORKER", "This quote has no employee name and email.");
  }

  // Target business: the on-behalf business picked in the wizard, else SDP direct.
  const sdpOwned = await storage.ensureSdpOwnedBusiness();
  const requested = typeof body?.businessId === "string" && body.businessId.trim() ? body.businessId.trim() : null;
  let targetBusinessId = sdpOwned.id;
  let onBehalfBusinessId: string | null = null;
  if (requested && requested !== sdpOwned.id) {
    if (!canUseBusiness(user, requested)) {
      return fail(403, "BUSINESS_NOT_ACCESSIBLE", "You don't have permission to create workers for this business.");
    }
    const business = await storage.getBusinessById(requested);
    if (!business) return fail(404, "BUSINESS_NOT_FOUND", "Selected business not found");
    targetBusinessId = business.id;
    onBehalfBusinessId = business.id;
  }
  const allowed = [targetBusinessId, sdpOwned.id];

  // 1. The worker this quote already created or matched (a retry).
  if (quote.workerId) {
    const linked = await storage.getWorkerById(quote.workerId);
    if (linked) {
      if (linked.businessId && allowed.includes(linked.businessId)) return { ok: true, data: { worker: linked, created: false } };
      if (!linked.userId) {
        // Created for this quote but the business was changed in the wizard since: move it.
        const moved = await storage.updateWorkerProfile(linked.id, { businessId: targetBusinessId, createdOnBehalfOfBusinessId: onBehalfBusinessId });
        return { ok: true, data: { worker: moved, created: false } };
      }
      return fail(409, "QUOTE_WORKER_OTHER_BUSINESS", `${linked.firstName} ${linked.lastName} already works for another business; pick the worker from the list instead.`);
    }
  }

  // 2. A worker with this email already on the target or SDP-owned business.
  const [existing] = await db
    .select()
    .from(workers)
    .where(and(sql`lower(${workers.email}) = ${email}`, inArray(workers.businessId, allowed)))
    .limit(1);
  if (existing) {
    await repository.update(quote.id, { workerId: existing.id });
    return { ok: true, data: { worker: existing, created: false } };
  }

  // 3. The email must not belong to anyone else.
  const conflict = await findEmailConflict(email);
  if (conflict) return fail(409, "EMAIL_IN_USE", describeEmailConflict(conflict, email));

  // 4. Create the worker (no invitation: the login is emailed when the contract is saved).
  const fields = deriveContractFields(normaliseStoredQuote(quote) as unknown as QuoteInput);
  const worker = await storage.createWorker({
    firstName: quote.workerFirstName.trim(),
    lastName: quote.workerLastName.trim(),
    email,
    workerType: fields.workerType,
    countryId: quote.countryId,
    businessId: targetBusinessId,
    createdByUserId: user.id,
    createdOnBehalfOfBusinessId: onBehalfBusinessId,
  });
  await repository.update(quote.id, { workerId: worker.id });
  console.log(`[quotes] worker ${worker.id} created from quote ${quote.quoteNumber}`);
  return { ok: true, data: { worker, created: true } };
}

/**
 * After a contract was created from a quote: give the quote's worker a login
 * and email a temporary password. `loginEmailSent` is null when nothing was
 * due (no quote worker, a different worker picked, or a login already exists).
 */
export async function provisionQuoteWorkerLogin(
  quoteId: string,
  contract: { workerId: string | null; businessId: string | null },
): Promise<{ loginEmailSent: boolean | null }> {
  try {
    const quote = await repository.getById(quoteId);
    if (!quote?.workerId || !contract.workerId || quote.workerId !== contract.workerId) return { loginEmailSent: null };
    const worker = await storage.getWorkerById(quote.workerId);
    if (!worker || worker.userId) return { loginEmailSent: null };
    const email = normalizeEmail(worker.email);
    if (!email) return { loginEmailSent: null };
    if (await storage.getUserByEmail(email)) {
      console.warn(`[quotes] a login already exists for ${email}; quote ${quote.quoteNumber} worker left unlinked`);
      return { loginEmailSent: null };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const newUser = await storage.createUser({
      id: crypto.randomBytes(16).toString("hex"),
      email,
      firstName: worker.firstName,
      lastName: worker.lastName,
      userType: "worker",
      passwordHash,
      emailVerified: true,
      isActive: true,
    });
    await storage.updateWorkerProfile(worker.id, {
      userId: newUser.id,
      invitationSent: true,
      invitationToken: null,
      invitationTokenExpiresAt: null,
    });

    const businessId = contract.businessId ?? worker.businessId;
    const business = businessId ? await storage.getBusinessById(businessId) : undefined;
    const businessName = business && !business.isSdpOwned ? business.name : "SDP Global Pay";
    const sent = await emailService.sendWorkerCredentialsEmail({ to: email, firstName: worker.firstName, businessName, tempPassword });
    if (!sent) console.error(`[quotes] login email for worker ${worker.id} (quote ${quote.quoteNumber}) not sent`);
    return { loginEmailSent: sent };
  } catch (error: any) {
    console.error(`[quotes] login provisioning for quote ${quoteId} failed:`, error?.message ?? String(error));
    return { loginEmailSent: false };
  }
}
