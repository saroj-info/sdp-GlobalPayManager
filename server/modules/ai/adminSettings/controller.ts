/**
 * Express controller for SDP-admin AI settings.
 *   GET /api/ai/admin/settings
 *   PUT /api/ai/admin/settings
 *   GET /api/ai/admin/usage
 *
 * Deliberately NOT env-feature-flagged: these endpoints make no LLM calls —
 * they only read/write the limit config and aggregate the audit log. The
 * kill switch is the requireSdpRole middleware the registrar passes in.
 */

import type { Express, RequestHandler } from "express";
import { getSettings, updateSettings, getUsageToday } from "./service";

export function registerAiAdminSettingsRoutes(
  app: Express,
  authMiddleware: RequestHandler,
  requireAdmin: RequestHandler,
): void {
  app.get("/api/ai/admin/settings", authMiddleware, requireAdmin, async (_req, res) => {
    try {
      return res.json(await getSettings());
    } catch (error: any) {
      console.error("[ai/admin-settings] read failed:", error?.message);
      return res.status(500).json({ message: "Failed to load AI settings" });
    }
  });

  app.put("/api/ai/admin/settings", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await updateSettings(req.body?.dailyTokenLimit, req.user?.id);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      return res.json(result.data);
    } catch (error: any) {
      console.error("[ai/admin-settings] update failed:", error?.message);
      return res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  app.get("/api/ai/admin/usage", authMiddleware, requireAdmin, async (_req, res) => {
    try {
      return res.json({ items: await getUsageToday() });
    } catch (error: any) {
      console.error("[ai/admin-settings] usage read failed:", error?.message);
      return res.status(500).json({ message: "Failed to load AI usage" });
    }
  });
}
