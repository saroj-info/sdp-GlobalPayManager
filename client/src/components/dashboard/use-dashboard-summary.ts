/**
 * Data + formatting helpers shared by the role dashboards.
 *
 * One query key, no params — the server returns the role-tagged summary for
 * the caller's ACTIVE role (shapes in shared/dashboard.ts).
 */

import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@shared/dashboard";

export function useDashboardSummary(enabled = true) {
  return useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    enabled,
  });
}

/**
 * Fixed color slot per contract status — color follows the entity, never its
 * rank, so a status keeps its hue across every chart and tenant. Slots point
 * at the validated categorical palette (--chart-1..8 in index.css).
 */
export const CONTRACT_STATUS_COLOR: Record<string, string> = {
  draft: "var(--chart-1)",
  pending_sdp_review: "var(--chart-2)",
  ready_to_issue: "var(--chart-3)",
  pending: "var(--chart-4)",
  active: "var(--chart-6)",
  completed: "var(--chart-7)",
  terminated: "var(--chart-8)",
};

/** Render order for status charts — lifecycle order, stable across tenants. */
export const CONTRACT_STATUS_ORDER = [
  "draft",
  "pending_sdp_review",
  "ready_to_issue",
  "pending",
  "active",
  "completed",
  "terminated",
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 'YYYY-MM' → 'Jan' (adds 'yy on January so year rollovers stay legible). */
export function formatMonthTick(month: string): string {
  const [year, mm] = month.split("-");
  const name = MONTH_NAMES[Number(mm) - 1] ?? month;
  return mm === "01" ? `${name} '${year.slice(2)}` : name;
}

/** 'YYYY-MM' → 'January 2026' for tooltips. */
export function formatMonthLong(month: string): string {
  const [year, mm] = month.split("-");
  const d = new Date(Number(year), Number(mm) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Currency-aware amount formatting; falls back gracefully on odd codes. */
export function formatMoney(amount: number, currency: string, compact = false): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: compact ? "compact" : "standard",
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}
