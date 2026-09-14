/**
 * Express controller — registers `GET /api/dashboard/summary`.
 * Strictly HTTP concerns: auth guard → call service → translate result.
 */

import type { Express, RequestHandler } from "express";
import { getDashboardSummary } from "./service";

export function registerDashboardRoutes(
  app: Express,
  authMiddleware: RequestHandler,
): void {
  app.get("/api/dashboard/summary", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await getDashboardSummary({
        id: userId,
        userType: req.user?.userType,
        activeRole: req.user?.activeRole,
        availableRoles: req.user?.availableRoles,
      });
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      return res.json(result.data);
    } catch (error: any) {
      console.error("[dashboard] Error building summary:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load dashboard summary" });
    }
  });
}
