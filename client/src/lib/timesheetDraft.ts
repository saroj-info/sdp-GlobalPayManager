/**
 * Pure helpers for the timesheet create / edit dialog (no React, importable
 * from a scratch script): the day list of a period, blank entry rows, and the
 * mapping from saved rows (decimals as "8.00", times as "09:00:00") back to
 * the strings the entry table edits.
 */
import { addDays, format } from "date-fns";
import type { TimesheetEntryValue } from "@/components/TimesheetEntryTable";

export type TimesheetUnit = "hourly" | "daily" | "annual";

/** A period longer than this falls back to the saved entries only (same cap as the card). */
export const MAX_PERIOD_DAYS = 31;

export function generatePeriodDates(start: string, end: string): { dates: Date[]; isCapped: boolean } {
  const dates: Date[] = [];
  let cur = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  while (cur <= endDate && count < MAX_PERIOD_DAYS) {
    dates.push(new Date(cur));
    cur = addDays(cur, 1);
    count++;
  }
  return { dates, isCapped: count >= MAX_PERIOD_DAYS && cur <= endDate };
}

export function blankEntry(date: Date): TimesheetEntryValue {
  return {
    date: format(date, "yyyy-MM-dd"),
    hoursWorked: "", startTime: "", endTime: "", breakHours: "",
    daysWorked: "0", description: "", projectRateLineId: "", isPresent: false,
  };
}

export function periodKeyOf(start: string, end: string): string {
  return `${start}_${end}`;
}

export function toDayKey(d: string | Date): string {
  return format(new Date(d), "yyyy-MM-dd");
}

/** "8.00" → "8", "0.50" → "0.5" (the daily select's values), "" / null → "". */
const numStr = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
};

/** "09:00:00" (Postgres time) → "09:00" for <input type="time">. */
const timeStr = (v: unknown): string => (typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : "");

/** A saved timesheet_entries row as the entry table edits it. */
export function savedEntryToValue(entry: any, unit: TimesheetUnit): TimesheetEntryValue {
  return {
    date: toDayKey(entry.date),
    hoursWorked: numStr(entry.hoursWorked),
    daysWorked: numStr(entry.daysWorked) || "0",
    startTime: timeStr(entry.startTime),
    endTime: timeStr(entry.endTime),
    breakHours: numStr(entry.breakHours),
    description: entry.description ?? "",
    projectRateLineId: entry.projectRateLineId ?? "",
    // A saved annual entry exists only because the day was present (onSubmit filters to isPresent).
    isPresent: unit === "annual" ? true : false,
  };
}

/**
 * Every day of the period with the saved entries slotted in (several rows on
 * one day are kept) and a blank row elsewhere, in date order.
 */
export function entriesFromSaved(
  timesheet: { periodStart: string | Date; periodEnd: string | Date; entries?: any[] | null },
  unit: TimesheetUnit,
): TimesheetEntryValue[] {
  const start = toDayKey(timesheet.periodStart);
  const end = toDayKey(timesheet.periodEnd);
  const byDay = new Map<string, any[]>();
  for (const e of timesheet.entries ?? []) {
    const k = toDayKey(e.date);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  // Same-day rows in start-time order (the list query orders by date only).
  const byStart = (a: any, b: any) => String(a?.startTime ?? "").localeCompare(String(b?.startTime ?? ""));
  const out: TimesheetEntryValue[] = [];
  for (const d of generatePeriodDates(start, end).dates) {
    const list = byDay.get(format(d, "yyyy-MM-dd"));
    if (list && list.length > 0) for (const e of [...list].sort(byStart)) out.push(savedEntryToValue(e, unit));
    else out.push(blankEntry(d));
  }
  return out;
}
