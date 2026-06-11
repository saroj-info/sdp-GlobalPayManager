/** Express controller — registers `GET /api/timesheets/list`. */

import type { Express, RequestHandler } from "express";
import { listTimesheets } from "./service";
import type { SortKey, TimesheetListQuery } from "./types";

const ALLOWED_SORT_KEYS: SortKey[] = ["recent", "period_end", "period_start", "status", "submitted", "worker"];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(v: any, fallback: number): number {
  const n = parseInt(v as string);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseQuery(req: any): TimesheetListQuery {
  const q = req.query ?? {};
  // Default to `recent` (createdAt DESC) so freshly-submitted timesheets surface on page 1
  // regardless of which period they cover. Operators care about "what just landed".
  const sortBy: SortKey = ALLOWED_SORT_KEYS.includes(q.sortBy) ? q.sortBy : "recent";
  return {
    page: toPositiveInt(q.page, 1),
    pageSize: Math.min(MAX_PAGE_SIZE, toPositiveInt(q.pageSize, DEFAULT_PAGE_SIZE)),
    status: q.status ? String(q.status) : undefined,
    search: q.search ? String(q.search).trim() || undefined : undefined,
    countryId: q.countryId ? String(q.countryId) : undefined,
    businessId: q.businessId ? String(q.businessId) : undefined,
    hostClientName: q.hostClientName ? String(q.hostClientName) : undefined,
    sortBy,
  };
}

export function registerTimesheetsListRoutes(app: Express, authMiddleware: RequestHandler): void {
  app.get("/api/timesheets/list", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await listTimesheets(
        { id: userId, userType, activeRole: req.user?.activeRole, availableRoles: req.user?.availableRoles },
        parseQuery(req),
      );
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      return res.json(result.data);
    } catch (error: any) {
      console.error("[timesheets] Error listing timesheets:", error);
      return res.status(500).json({ message: "Failed to list timesheets" });
    }
  });
}
