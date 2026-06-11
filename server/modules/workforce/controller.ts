/**
 * Express controller — registers `GET /api/workers/list`.
 *
 * Strictly HTTP concerns:
 *   - parse + validate the query string
 *   - call the service
 *   - translate the result to status + body
 *
 * No business logic. No DB calls.
 */

import type { Express, RequestHandler } from "express";
import { listWorkers } from "./service";
import type { SortKey, WorkerListQuery } from "./types";

const ALLOWED_SORT_KEYS: SortKey[] = ["name", "country", "type", "business", "created"];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(v: any, fallback: number): number {
  const n = parseInt(v as string);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseQuery(req: any): WorkerListQuery {
  const q = req.query ?? {};
  const sortBy: SortKey = ALLOWED_SORT_KEYS.includes(q.sortBy) ? q.sortBy : "name";
  return {
    page: toPositiveInt(q.page, 1),
    pageSize: Math.min(MAX_PAGE_SIZE, toPositiveInt(q.pageSize, DEFAULT_PAGE_SIZE)),
    search: q.search ? String(q.search).trim() || undefined : undefined,
    countryId: q.countryId ? String(q.countryId) : undefined,
    workerType: q.workerType ? String(q.workerType) : undefined,
    businessId: q.businessId ? String(q.businessId) : undefined,
    sortBy,
  };
}

export function registerWorkforceRoutes(
  app: Express,
  authMiddleware: RequestHandler,
): void {
  app.get("/api/workers/list", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await listWorkers(
        { id: userId, userType, activeRole: req.user?.activeRole, availableRoles: req.user?.availableRoles },
        parseQuery(req),
      );
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      return res.json(result.data);
    } catch (error: any) {
      console.error("[workforce] Error listing workers:", error);
      return res.status(500).json({ message: "Failed to list workers" });
    }
  });
}
