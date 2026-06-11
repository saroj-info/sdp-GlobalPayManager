/**
 * Express controller — registers `GET /api/contracts/list`.
 * Strictly HTTP concerns: parse query → call service → translate result to response.
 */

import type { Express, RequestHandler } from "express";
import { listContracts } from "./service";
import type { ContractListQuery, SortKey } from "./types";

const ALLOWED_SORT_KEYS: SortKey[] = ["worker", "role", "country", "status", "date"];
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(v: any, fallback: number): number {
  const n = parseInt(v as string);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseQuery(req: any): ContractListQuery {
  const q = req.query ?? {};
  const sortBy: SortKey = ALLOWED_SORT_KEYS.includes(q.sortBy) ? q.sortBy : "date";
  return {
    page: toPositiveInt(q.page, 1),
    pageSize: Math.min(MAX_PAGE_SIZE, toPositiveInt(q.pageSize, DEFAULT_PAGE_SIZE)),
    search: q.search ? String(q.search).trim() || undefined : undefined,
    status: q.status ? String(q.status) : undefined,
    businessId: q.businessId ? String(q.businessId) : undefined,
    countryId: q.countryId ? String(q.countryId) : undefined,
    sortBy,
  };
}

export function registerContractsRoutes(
  app: Express,
  authMiddleware: RequestHandler,
): void {
  app.get("/api/contracts/list", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await listContracts(
        { id: userId, userType, activeRole: req.user?.activeRole, availableRoles: req.user?.availableRoles },
        parseQuery(req),
      );
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      return res.json(result.data);
    } catch (error: any) {
      console.error("[contracts] Error listing contracts:", error);
      return res.status(500).json({ message: "Failed to list contracts" });
    }
  });
}
