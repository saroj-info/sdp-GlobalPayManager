/**
 * GET /api/fx/rates — USD base rates for the quote editor (SDP users only).
 * Never cached by the browser; the server memoises for a day (service.ts).
 */
import type { Express, RequestHandler } from "express";
import { apiRateLimiter } from "../../rateLimitMiddleware";
import { fxService } from "./service";

export function registerFxRoutes(app: Express, authMiddleware: RequestHandler, requireSdp: RequestHandler): void {
  const limiter = apiRateLimiter(60, 60_000);

  app.get("/api/fx/rates", authMiddleware, requireSdp, limiter, async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await fxService.getUsdRates();
      if (!result.ok) return res.status(result.status).json({ message: result.message, code: result.code });
      return res.json(result.data);
    } catch (error: any) {
      console.error("[fx] rates failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load exchange rates" });
    }
  });
}
