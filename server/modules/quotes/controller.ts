/**
 * HTTP layer for quotes (SDP users only; the fee schedule needs an SDP admin).
 *   GET    /api/quotes/defaults?countryId&category&billingAgent&jurisdiction   (registered BEFORE /:id)
 *   GET    /api/quotes?page&pageSize&search&status&countryId&sortBy
 *   POST   /api/quotes
 *   GET    /api/quotes/:id
 *   PUT    /api/quotes/:id            full replace, totals recomputed
 *   DELETE /api/quotes/:id
 *   POST   /api/quotes/:id/duplicate
 *   GET    /api/admin/quote-fee-defaults
 *   PUT    /api/admin/quote-fee-defaults
 */
import type { Express, RequestHandler } from "express";
import { QUOTE_STATUSES, type QuoteStatus } from "@shared/quotes";
import { quotesService as defaultService, type QuotesService } from "./service";
import type { QuoteListQuery, QuoteSortBy, Result } from "./types";

function sendError(res: any, r: Extract<Result<unknown>, { ok: false }>) {
  return res.status(r.status).json({ message: r.message, ...(r.code ? { code: r.code } : {}), ...(r.extra ?? {}) });
}

function str(v: unknown, max = 120): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

export function parseListQuery(q: Record<string, unknown>): QuoteListQuery {
  const page = Math.max(1, parseInt(String(q.page ?? "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(q.pageSize ?? "20"), 10) || 20));
  const status = str(q.status);
  const sortBy = str(q.sortBy);
  return {
    page,
    pageSize,
    search: str(q.search, 100),
    status: status && (QUOTE_STATUSES as readonly string[]).includes(status) ? (status as QuoteStatus) : undefined,
    countryId: str(q.countryId, 10),
    sortBy: sortBy && ["updated", "number", "country"].includes(sortBy) ? (sortBy as QuoteSortBy) : "updated",
  };
}

function authUser(req: any) {
  return { id: String(req.user?.id), userType: String(req.user?.userType ?? ""), sdpRole: req.user?.sdpRole ?? null };
}

export function registerQuotesRoutes(
  app: Express,
  authMiddleware: RequestHandler,
  requireSdp: RequestHandler,
  requireAdmin: RequestHandler,
  service: QuotesService = defaultService,
): void {
  // Defaults first: Express would otherwise read "defaults" as a quote id.
  app.get("/api/quotes/defaults", authMiddleware, requireSdp, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const countryId = str(req.query.countryId, 10);
      const category = str(req.query.category, 40);
      if (!countryId || !category) return res.status(400).json({ message: "countryId and category are required", code: "QUOTE_INVALID" });
      const result = await service.getDefaults({
        countryId,
        category,
        billingAgent: String(req.query.billingAgent ?? "") === "true",
        jurisdiction: str(req.query.jurisdiction) ?? null,
      });
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[quotes] defaults failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load quote defaults" });
    }
  });

  app.get("/api/quotes", authMiddleware, requireSdp, async (req: any, res) => {
    try {
      const result = await service.list(parseListQuery(req.query ?? {}));
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[quotes] list failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load quotes" });
    }
  });

  app.post("/api/quotes", authMiddleware, requireSdp, async (req: any, res) => {
    try {
      const result = await service.create(authUser(req), req.body);
      if (!result.ok) return sendError(res, result);
      return res.status(201).json({ quote: result.data });
    } catch (error: any) {
      console.error("[quotes] create failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save the quote" });
    }
  });

  app.get("/api/quotes/:id", authMiddleware, requireSdp, async (req: any, res) => {
    try {
      const result = await service.get(String(req.params.id));
      if (!result.ok) return sendError(res, result);
      return res.json({ quote: result.data });
    } catch (error: any) {
      console.error("[quotes] get failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load the quote" });
    }
  });

  app.put("/api/quotes/:id", authMiddleware, requireSdp, async (req: any, res) => {
    try {
      const result = await service.update(authUser(req), String(req.params.id), req.body);
      if (!result.ok) return sendError(res, result);
      return res.json({ quote: result.data });
    } catch (error: any) {
      console.error("[quotes] update failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save the quote" });
    }
  });

  app.delete("/api/quotes/:id", authMiddleware, requireSdp, async (req: any, res) => {
    try {
      const result = await service.remove(String(req.params.id));
      if (!result.ok) return sendError(res, result);
      return res.status(204).end();
    } catch (error: any) {
      console.error("[quotes] delete failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to delete the quote" });
    }
  });

  app.post("/api/quotes/:id/duplicate", authMiddleware, requireSdp, async (req: any, res) => {
    try {
      const result = await service.duplicate(authUser(req), String(req.params.id));
      if (!result.ok) return sendError(res, result);
      return res.status(201).json({ quote: result.data });
    } catch (error: any) {
      console.error("[quotes] duplicate failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to duplicate the quote" });
    }
  });

  app.get("/api/admin/quote-fee-defaults", authMiddleware, requireAdmin, async (_req: any, res) => {
    try {
      const result = await service.getFeeDefaults();
      if (!result.ok) return sendError(res, result);
      return res.json({ items: result.data });
    } catch (error: any) {
      console.error("[quotes] fee defaults read failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load SDP fee defaults" });
    }
  });

  app.put("/api/admin/quote-fee-defaults", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await service.saveFeeDefaults(authUser(req), req.body);
      if (!result.ok) return sendError(res, result);
      return res.json({ items: result.data });
    } catch (error: any) {
      console.error("[quotes] fee defaults save failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save SDP fee defaults" });
    }
  });
}
