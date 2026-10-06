/**
 * Express controller — registers `PATCH /api/businesses/me`.
 * Strictly HTTP concerns: auth guard → call service → translate result.
 */

import type { Express, RequestHandler } from "express";
import { updateOwnBusinessProfile } from "./service";

export function registerBusinessProfileRoutes(
  app: Express,
  authMiddleware: RequestHandler,
): void {
  app.patch("/api/businesses/me", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await updateOwnBusinessProfile(
        { id: userId, userType: req.user?.userType },
        req.body,
      );
      if (!result.ok) {
        return res.status(result.status).json(
          result.code ? { message: result.message, code: result.code } : { message: result.message },
        );
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error("[businesses] Error saving profile details:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save business details" });
    }
  });
}
