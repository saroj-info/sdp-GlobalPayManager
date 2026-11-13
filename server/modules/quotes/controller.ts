/**
 * HTTP layer for quotes (SDP users only; the fee schedule needs an SDP admin).
 *   GET    /api/quotes/defaults?countryId&category&billingAgent&jurisdiction   (registered BEFORE /:id)
 *   GET    /api/quotes?page&pageSize&search&status&countryId&sortBy
 *   POST   /api/quotes
 *   GET    /api/quotes/:id
 *   PUT    /api/quotes/:id            full replace, totals recomputed
 *   DELETE /api/quotes/:id
 *   POST   /api/quotes/:id/duplicate
 *   POST   /api/quotes/:id/send?to&message   raw application/pdf body (the PDF built by the client)
 *   GET    /api/admin/quote-fee-defaults
 *   PUT    /api/admin/quote-fee-defaults
 * Public (no auth, rate limited, never cached) — the email's Accept / Reject links:
 *   GET    /api/quote-response/:token            what the link points at (never changes state)
 *   POST   /api/quote-response/:token            { action: 'accept' | 'reject', note? }
 *   POST   /api/quote-response/:token/feedback   { feedback } once, after an acceptance
 */
import express, { type Express, type RequestHandler } from "express";
import { QUOTE_STATUSES, sendQuoteSchema, type QuoteStatus } from "@shared/quotes";
import { apiRateLimiter } from "../../rateLimitMiddleware";
import { quotesService as defaultService, type QuotesService } from "./service";
import type { QuoteListQuery, QuoteSortBy, Result } from "./types";

const QUOTE_PDF_MAX_BYTES = 5 * 1024 * 1024;
const linkRateLimiter = apiRateLimiter(30, 60_000);

/**
 * Buffers the `application/pdf` body of the send route. `express.json()` never
 * sees these requests (its 100 KB limit does not apply). Parser errors are
 * answered here because the global handler rethrows.
 */
const rawPdfBody: RequestHandler = (req, res, next) => {
  const parser = express.raw({ type: "application/pdf", limit: QUOTE_PDF_MAX_BYTES });
  parser(req, res, (err?: any) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      return res.status(413).json({ message: "The quote PDF must be 5 MB or smaller", code: "QUOTE_PDF_TOO_LARGE" });
    }
    console.error("[quotes] pdf body:", err?.message ?? String(err));
    return res.status(400).json({ message: "Could not read the quote PDF", code: "QUOTE_PDF_INVALID" });
  });
};

function requestBaseUrl(req: any): string {
  return process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;
}

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

  app.post("/api/quotes/:id/send", authMiddleware, requireSdp, rawPdfBody, async (req: any, res) => {
    try {
      const parsed = sendQuoteSchema.safeParse({ to: req.query.to, message: req.query.message ?? "" });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Enter a valid email address", code: "QUOTE_INVALID" });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ message: "The quote PDF is missing from the request", code: "QUOTE_PDF_REQUIRED" });
      }
      const result = await service.send(authUser(req), String(req.params.id), { ...parsed.data, pdf: req.body, baseUrl: requestBaseUrl(req) });
      if (!result.ok) return sendError(res, result);
      return res.json({ quote: result.data });
    } catch (error: any) {
      console.error("[quotes] send failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to send the quote" });
    }
  });

  // ── Email link: look up (public, read-only) ──────────────────────────────
  app.get("/api/quote-response/:token", linkRateLimiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await service.getResponsePage(String(req.params.token || ""));
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[quotes] response link lookup failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Could not load this quote link" });
    }
  });

  // ── Email link: the client's answer (public, the confirm click) ──────────
  app.post("/api/quote-response/:token", linkRateLimiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await service.respond(String(req.params.token || ""), req.body, requestBaseUrl(req));
      if (!result.ok) return sendError(res, result);
      return res.json({
        message: result.data.action === "accepted" ? "Quote accepted." : "Quote declined.",
        ...result.data,
      });
    } catch (error: any) {
      console.error("[quotes] response link decision failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Could not record your answer. Please try again." });
    }
  });

  app.post("/api/quote-response/:token/feedback", linkRateLimiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await service.addFeedback(String(req.params.token || ""), req.body, requestBaseUrl(req));
      if (!result.ok) return sendError(res, result);
      return res.json({ message: "Thank you for your feedback.", ...result.data });
    } catch (error: any) {
      console.error("[quotes] response feedback failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Could not save your feedback. Please try again." });
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
