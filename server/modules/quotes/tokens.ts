/**
 * The raw token in a quote email's Accept / Reject links and its stored sha256.
 * Same construction as modules/timesheet-approval/tokens.ts: the raw value only
 * ever exists in the email; the row keeps the hash.
 */
import crypto from "crypto";

export function generateResponseToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResponseToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isResponseTokenShape(raw: string): boolean {
  return /^[a-f0-9]{64}$/i.test(raw);
}
