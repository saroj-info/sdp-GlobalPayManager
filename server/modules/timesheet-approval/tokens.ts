/**
 * Single-use approve / reject links for the "timesheet awaiting approval" email.
 *
 * Why a token and not a login: the approver (often a host client) only has a contact
 * address on the business row, and the ask was to decide without signing in. The link
 * is bound to one submission (`submittedAt`), can be used once, expires, and is stored
 * hashed, so possession of a *future* email never unlocks an *earlier* decision.
 *
 * Why a GET never decides: mail security scanners open links before the reader does.
 * The public page confirms with a POST (see controller.ts).
 */

import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import { timesheetApprovalTokens, type TimesheetApprovalToken } from "@shared/schema";
import { getTrackingUnit } from "@shared/contractHelpers";
import { storage } from "../../storage";
import type { ApproverDayRow, ApproverSummary } from "./types";

export const TIMESHEET_APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Same cap as the client's period grid (`generatePeriodDates`). */
export const APPROVAL_SUMMARY_MAX_DAYS = 31;

export type ApprovalLinkState = "pending" | "used" | "expired" | "not_pending" | "invalid";

export type ApprovalLinkContext = {
  token: TimesheetApprovalToken;
  timesheet: any;   // Timesheet & { entries, worker }
  contract: any | null;
  worker: any | null;
};

export type ApprovalLinkLookup =
  | ({ ok: true; state: "pending" } & ApprovalLinkContext)
  | ({ ok: false; state: "used" | "expired" | "not_pending"; status: number; code: string; message: string } & ApprovalLinkContext)
  | { ok: false; state: "invalid"; status: 404; code: "APPROVAL_LINK_INVALID"; message: string };

export function hashApprovalToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Revokes every unused link of the timesheet, then inserts a fresh one. Returns the raw
 * token (for the email) and the expiry. Call it before sending the email: a failed send
 * leaves a harmless token behind (the approver can still act in the app).
 */
export async function issueApprovalToken(input: {
  timesheetId: string;
  approverEmail: string;
  approverUserId: string | null;
  approverRole: string;
  submittedAt: Date | null;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const now = new Date();
  await db
    .update(timesheetApprovalTokens)
    .set({ revokedAt: now })
    .where(and(
      eq(timesheetApprovalTokens.timesheetId, input.timesheetId),
      isNull(timesheetApprovalTokens.usedAt),
      isNull(timesheetApprovalTokens.revokedAt),
    ));

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + TIMESHEET_APPROVAL_TTL_MS);
  await db.insert(timesheetApprovalTokens).values({
    timesheetId: input.timesheetId,
    tokenHash: hashApprovalToken(rawToken),
    approverEmail: input.approverEmail.trim().toLowerCase(),
    approverUserId: input.approverUserId,
    approverRole: input.approverRole,
    submittedAt: input.submittedAt,
    expiresAt,
  });
  return { rawToken, expiresAt };
}

function sameInstant(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

const INVALID: ApprovalLinkLookup = {
  ok: false,
  state: "invalid",
  status: 404,
  code: "APPROVAL_LINK_INVALID",
  message: "This approval link is not valid. If you received a newer email about this timesheet, use the link in that one; otherwise sign in to SDP Global Pay to review it.",
};

/** Resolves a raw token from a link to its timesheet, or says why it cannot act. */
export async function lookupApprovalToken(rawToken: string): Promise<ApprovalLinkLookup> {
  if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken)) return INVALID;

  const [token] = await db
    .select()
    .from(timesheetApprovalTokens)
    .where(eq(timesheetApprovalTokens.tokenHash, hashApprovalToken(rawToken)))
    .limit(1);
  if (!token || token.revokedAt) return INVALID;

  const timesheet = await storage.getTimesheetById(token.timesheetId);
  if (!timesheet) return INVALID;
  const contract = timesheet.contractId ? await storage.getContractById(timesheet.contractId) : null;
  const worker = timesheet.worker ?? (timesheet.workerId ? await storage.getWorkerById(timesheet.workerId) : null);
  const ctx: ApprovalLinkContext = { token, timesheet, contract: contract ?? null, worker: worker ?? null };

  if (token.usedAt) {
    const verb = token.usedAction === "rejected" ? "rejected" : "approved";
    return {
      ok: false, state: "used", status: 409, code: "APPROVAL_LINK_USED",
      message: `This timesheet was already ${verb} on ${formatDateTime(token.usedAt)}.`,
      ...ctx,
    };
  }
  if (new Date(token.expiresAt).getTime() < Date.now()) {
    return {
      ok: false, state: "expired", status: 410, code: "APPROVAL_LINK_EXPIRED",
      message: "This approval link has expired. Sign in to SDP Global Pay to review the timesheet.",
      ...ctx,
    };
  }
  if (timesheet.status !== "submitted" || !sameInstant(timesheet.submittedAt, token.submittedAt)) {
    return {
      ok: false, state: "not_pending", status: 409, code: "TIMESHEET_NOT_PENDING",
      message: `This timesheet is no longer awaiting approval (it is ${timesheet.status}).`,
      ...ctx,
    };
  }
  return { ok: true, state: "pending", ...ctx };
}

/**
 * Marks the token used, but only if it is still unused and unrevoked (one UPDATE with those
 * conditions, so two clicks cannot both pass). Returns null when someone got there first.
 */
export async function consumeApprovalToken(
  tokenId: string,
  action: "approved" | "rejected",
): Promise<TimesheetApprovalToken | null> {
  const [row] = await db
    .update(timesheetApprovalTokens)
    .set({ usedAt: new Date(), usedAction: action })
    .where(and(
      eq(timesheetApprovalTokens.id, tokenId),
      isNull(timesheetApprovalTokens.usedAt),
      isNull(timesheetApprovalTokens.revokedAt),
    ))
    .returning();
  return row ?? null;
}

/** Undo `consumeApprovalToken` when the status write that followed it failed. */
export async function releaseApprovalToken(tokenId: string): Promise<void> {
  await db
    .update(timesheetApprovalTokens)
    .set({ usedAt: null, usedAction: null })
    .where(eq(timesheetApprovalTokens.id, tokenId));
}

// ─── Summary for the approver (email + public page) ─────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function dayLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function longDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function formatDateTime(d: Date | string): string {
  const x = new Date(d);
  const hh = String(x.getHours()).padStart(2, "0");
  const mi = String(x.getMinutes()).padStart(2, "0");
  return `${longDate(x)} ${hh}:${mi}`;
}
function num(v: any): number {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}
function timeHm(v: any): string | null {
  if (!v) return null;
  const s = String(v);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/**
 * Every day of the period (Sat / Sun included), each with its saved entries or a blank
 * row. Blank days are rendered, never stored. Periods over 31 days fall back to the
 * saved entries alone (`capped`).
 */
export function summarizeForApprover(timesheet: any, contract: any | null, worker: any | null): ApproverSummary {
  const entries: any[] = Array.isArray(timesheet?.entries) ? timesheet.entries : [];
  const unit = getTrackingUnit(contract);

  const valueLabel = (e: any): string => {
    const h = num(e.hoursWorked);
    const d = num(e.daysWorked);
    if (h > 0) return `${h.toFixed(2)}h`;
    if (d > 0) return `${d.toFixed(1)}d`;
    return "Present";
  };
  const rowFor = (date: Date, e: any | null): ApproverDayRow => ({
    date: dayKey(date),
    label: dayLabel(date),
    weekday: WEEKDAYS[date.getDay()],
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
    hasEntry: !!e,
    valueLabel: e ? valueLabel(e) : "—",
    startTime: e ? timeHm(e.startTime) : null,
    endTime: e ? timeHm(e.endTime) : null,
    breakHours: e && num(e.breakHours) > 0 ? String(e.breakHours) : null,
    description: e?.description ? String(e.description) : null,
  });

  const start = timesheet?.periodStart ? new Date(timesheet.periodStart) : null;
  const end = timesheet?.periodEnd ? new Date(timesheet.periodEnd) : null;
  const byDay = new Map<string, any[]>();
  for (const e of entries) {
    const k = dayKey(new Date(e.date));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  let rows: ApproverDayRow[] = [];
  let capped = false;
  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let count = 0;
    while (cursor <= last && count < APPROVAL_SUMMARY_MAX_DAYS) {
      const list = byDay.get(dayKey(cursor));
      if (!list || list.length === 0) rows.push(rowFor(new Date(cursor), null));
      else for (const e of list) rows.push(rowFor(new Date(cursor), e));
      cursor.setDate(cursor.getDate() + 1);
      count++;
    }
    capped = cursor <= last;
  } else {
    capped = true;
  }
  if (capped) {
    rows = [...entries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((e) => rowFor(new Date(e.date), e));
  }

  const hours = entries.reduce((s, e) => s + num(e.hoursWorked), 0);
  const days = entries.reduce((s, e) => s + num(e.daysWorked), 0);
  const present = entries.length;
  const totalHours = num(timesheet?.totalHours) || hours;
  const totalDays = days || present;
  const label = unit === "hourly"
    ? `${totalHours > 0 ? totalHours.toFixed(1) : "0"}h`
    : `${totalDays > 0 ? totalDays.toFixed(0) : "0"}d`;

  const workerName = worker
    ? `${worker.firstName || ""} ${worker.lastName || ""}`.trim() || "A worker"
    : "A worker";
  const contractLabel = contract?.contractName || contract?.customRoleTitle || "Contract";

  return {
    timesheetId: timesheet.id,
    status: timesheet.status,
    workerName,
    contractLabel,
    periodStart: start ? start.toISOString() : "",
    periodEnd: end ? end.toISOString() : "",
    periodLabel: start && end ? `${longDate(start)} – ${longDate(end)}` : "",
    unit,
    rows,
    capped,
    totals: { hours, days, present, label },
    notes: timesheet?.notes ? String(timesheet.notes) : null,
  };
}
