/**
 * Contract lifecycle rules shared by the client and the server:
 *   - host client confirmation (status, date, reference, note, optional file),
 *   - renewal (a brand-new contract cloned from an existing one),
 *   - extension (same contract, later end date).
 * Pure functions and Zod schemas only, like shared/billingTerms.ts.
 */
import { z } from "zod";

// ---- Host client confirmation -----------------------------------------------

export const HOST_CLIENT_CONFIRMATION_STATUSES = ["pending", "confirmed", "declined"] as const;
export type HostClientConfirmationStatus = (typeof HOST_CLIENT_CONFIRMATION_STATUSES)[number];

export const HOST_CLIENT_CONFIRMATION_LABELS: Record<HostClientConfirmationStatus, string> = {
  pending: "Confirmation pending",
  confirmed: "Client confirmed",
  declined: "Client declined",
};

/** Calendar day as sent by `<input type="date">`. */
export const isoDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0, "Enter a valid amount (0 or more)");

const optionalAmountSchema = amountSchema.nullable().optional();

export const hostClientConfirmationSchema = z
  .object({
    status: z.enum(HOST_CLIENT_CONFIRMATION_STATUSES),
    confirmedAt: isoDaySchema.nullable().optional(),
    reference: z.string().trim().max(120, "The reference is too long (120 characters max)").nullable().optional(),
    note: z.string().trim().max(2000, "The note is too long (2000 characters max)").nullable().optional(),
    // undefined = keep the stored file; null or "" = remove it; "/objects/…" = replace it.
    documentPath: z
      .string()
      .max(1000)
      .refine((v) => v === "" || v.startsWith("/"), "Invalid document path")
      .nullable()
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.status === "confirmed" && !v.confirmedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmedAt"], message: "Enter the date the host client confirmed." });
    }
  });
export type HostClientConfirmationInput = z.input<typeof hostClientConfirmationSchema>;

// ---- Extension ----------------------------------------------------------------

export const extendContractSchema = z.object({
  endDate: isoDaySchema,
});
export type ExtendContractInput = z.input<typeof extendContractSchema>;

// ---- Renewal ------------------------------------------------------------------

export const renewContractSchema = z.object({
  contractName: z.string().trim().max(200, "The contract name is too long (200 characters max)").nullable().optional(),
  startDate: isoDaySchema,
  /** Omitted or null = open-ended renewal. */
  endDate: isoDaySchema.nullable().optional(),
  /** Single-rate contracts: the new worker rate (required by the server). */
  rate: amountSchema.optional(),
  /** Multi-rate contracts: per-project overrides keyed by the source line id. */
  rateLines: z
    .array(
      z.object({
        id: z.string().min(1),
        rate: amountSchema,
        clientRate: optionalAmountSchema,
      }),
    )
    .optional(),
  /** Customer Work, rate based: the host client billing rate. */
  customerBillingRate: optionalAmountSchema,
  /** Customer Work, fixed price: the fixed billing amount. */
  fixedBillingAmount: optionalAmountSchema,
});
export type RenewContractInput = z.input<typeof renewContractSchema>;

// ---- Date helpers -------------------------------------------------------------

/** "YYYY-MM-DD" → Date at UTC midnight (what insertContractSchema's `new Date(day)` produces too). */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Date | ISO string → "YYYY-MM-DD" (UTC), or null when empty / invalid. */
export function dateToDay(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  const date = dayToDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((dayToDate(toDay).getTime() - dayToDate(fromDay).getTime()) / 86_400_000);
}

export function todayDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// ---- Renewal rules ------------------------------------------------------------

export interface RenewalDateSource {
  startDate: Date | string;
  endDate?: Date | string | null;
}

/**
 * Default dates for a renewal: starts the day after the old end date (or today
 * when that day has passed) and keeps the old duration. An open-ended source
 * renews from today with no end date.
 */
export function getDefaultRenewalDates(source: RenewalDateSource, today: string = todayDay()): { startDate: string; endDate: string | null } {
  const srcStart = dateToDay(source.startDate);
  const srcEnd = dateToDay(source.endDate);
  if (!srcStart || !srcEnd) return { startDate: today, endDate: null };
  const dayAfterEnd = addDays(srcEnd, 1);
  const startDate = dayAfterEnd > today ? dayAfterEnd : today;
  const durationDays = Math.max(0, daysBetween(srcStart, srcEnd));
  return { startDate, endDate: addDays(startDate, durationDays) };
}

export function getDefaultRenewalName(source: {
  contractName?: string | null;
  customRoleTitle?: string | null;
  roleTitle?: { title?: string | null } | null;
}): string {
  const base = (source.contractName || source.customRoleTitle || source.roleTitle?.title || "Contract").trim();
  return /\(renewal\)$/i.test(base) ? base : `${base} (Renewal)`;
}

/** True when `nextEndDay` is after the current end date (or there is none). */
export function isEndDateLater(currentEnd: Date | string | null | undefined, nextEndDay: string): boolean {
  const current = dateToDay(currentEnd);
  return !current || nextEndDay > current;
}

/** Same rule as the contract wizard's submit handler. */
export function resolveRenewalStatus(args: {
  callerUserType: string;
  employmentType?: string | null;
  contractorCompliance?: boolean | null;
}): "ready_to_issue" | "pending_sdp_review" {
  if (args.callerUserType === "sdp_internal") return "ready_to_issue";
  if (args.employmentType === "contractor" && args.contractorCompliance === true) return "ready_to_issue";
  return "pending_sdp_review";
}

export interface RemunerationLineLike {
  amount: string | number | null | undefined;
  description?: string | null;
}

export interface RateFollowChange {
  oldRate: string | number | null | undefined;
  newRate: string | number;
  /** Multi-rate contracts: per-project old → new rate, matched on the line description. */
  rateLineChanges?: Array<{ projectName: string | null | undefined; oldRate: string | number | null | undefined; newRate: string | number }>;
}

const toNumber = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Copying remuneration lines onto a renewal with a new rate: a line whose
 * amount equals the old worker rate (that is how "Auto-populate" creates the
 * base pay line) follows the new rate; a line named after a project follows
 * that project's new rate when it held the project's old rate. Everything
 * else (allowances, bonuses, hand-edited amounts) is copied unchanged.
 */
export function followRateOnRemunerationLines<T extends RemunerationLineLike>(lines: T[], change: RateFollowChange): T[] {
  const oldRate = toNumber(change.oldRate);
  return lines.map((line) => {
    const amount = toNumber(line.amount);
    if (amount === null) return line;
    const description = (line.description ?? "").trim().toLowerCase();
    const project = description
      ? change.rateLineChanges?.find((c) => (c.projectName ?? "").trim().toLowerCase() === description)
      : undefined;
    if (project) {
      const projectOld = toNumber(project.oldRate);
      return projectOld !== null && projectOld === amount ? { ...line, amount: String(project.newRate) } : line;
    }
    if (oldRate !== null && oldRate === amount) return { ...line, amount: String(change.newRate) };
    return line;
  });
}

// ---- Who may use the quick actions -------------------------------------------

/** SDP, or a business user looking at their own contract (not the host-client read-only view). */
export function canUseContractActions(
  user: { userType?: string | null } | null | undefined,
  contract: { readOnly?: boolean | null } | null | undefined,
): boolean {
  const type = user?.userType;
  if (type === "sdp_internal") return true;
  return type === "business_user" && contract?.readOnly !== true;
}

/** One-line description of a contract for the change log ("Renewal of" / "Renewed as"). */
export function describeContractForLog(c: {
  id: string;
  contractName?: string | null;
  customRoleTitle?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
}): string {
  const name = (c.contractName || c.customRoleTitle || "Contract").trim();
  const start = dateToDay(c.startDate) ?? "?";
  const end = dateToDay(c.endDate) ?? "Ongoing";
  return `${name} · ${start} – ${end} · ${c.id}`;
}
