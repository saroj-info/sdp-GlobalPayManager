/**
 * HTTP layer for Cost Settings (statutory / employer cost items per country).
 *   GET  /api/country-costs                                   public: active items, every country
 *   GET  /api/country-costs/:countryId                        public: active items of one country
 *   GET  /api/admin/country-costs/:countryId                  SDP (any role): every row, inactive included
 *   PUT  /api/admin/country-costs/:countryId                  SDP super admin / admin: replace the set
 *   POST /api/admin/country-costs/:countryId/restore-defaults SDP super admin / admin: reload the seed
 * The public reads exist for the /resources calculator (a public page) and the
 * contract wizard's country panel, as GET /api/countries is public too.
 */
import type { Express, RequestHandler } from "express";
import { countryCostsService as defaultService, type CountryCostsService } from "./service";
import type { Result } from "./types";

function sendError(res: any, r: Extract<Result<unknown>, { ok: false }>) {
  return res.status(r.status).json({ message: r.message, ...(r.code ? { code: r.code } : {}), ...(r.extra ?? {}) });
}

function countryParam(req: any): string {
  return String(req.params.countryId ?? "").trim().slice(0, 10);
}

function authUser(req: any) {
  return { id: String(req.user?.id), userType: String(req.user?.userType ?? ""), sdpRole: req.user?.sdpRole ?? null };
}

export function registerCountryCostsRoutes(
  app: Express,
  authMiddleware: RequestHandler,
  requireSdp: RequestHandler,
  requireAdmin: RequestHandler,
  service: CountryCostsService = defaultService,
): void {
  app.get("/api/country-costs", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await service.getAll();
      if (!result.ok) return sendError(res, result);
      return res.json({ items: result.data });
    } catch (error: any) {
      console.error("[country-costs] list failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load cost items" });
    }
  });

  app.get("/api/country-costs/:countryId", async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await service.getForCountry(countryParam(req), { includeInactive: false });
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[country-costs] country read failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load cost items" });
    }
  });

  app.get("/api/admin/country-costs/:countryId", authMiddleware, requireSdp, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const result = await service.getForCountry(countryParam(req), { includeInactive: true });
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[country-costs] admin read failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load cost items" });
    }
  });

  app.put("/api/admin/country-costs/:countryId", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await service.replace(authUser(req), countryParam(req), req.body);
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[country-costs] save failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save cost items" });
    }
  });

  app.post("/api/admin/country-costs/:countryId/restore-defaults", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await service.restoreDefaults(authUser(req), countryParam(req));
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[country-costs] restore failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to restore the default cost items" });
    }
  });
}
