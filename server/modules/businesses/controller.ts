/**
 * HTTP layer for business profile details and the business logo.
 *
 *   PATCH  /api/businesses/me              own business (business user)
 *   PATCH  /api/businesses/:id/profile     any customer business (SDP admin) or own ("me")
 *   PUT    /api/businesses/:id/logo        raw image body → stored, returns the business
 *   DELETE /api/businesses/:id/logo        returns the business
 *   GET    /api/businesses/:id/logo        public image (an <img> cannot send a bearer)
 *
 * `/me` literals register before the `/:id/...` paths. Never add a bare
 * `/api/businesses/:id` here: it would shadow `/me` and `/host-clients` in
 * routes.ts for that verb.
 */

import express, { type Express, type RequestHandler, type Request, type Response, type NextFunction } from "express";
import { BUSINESS_LOGO_MAX_BYTES, BUSINESS_LOGO_TYPES } from "@shared/businessLogo";
import { businessesService as defaultService } from "./service";
import type { AuthUser, Result } from "./types";

function toAuthUser(req: any): AuthUser | null {
  const u = req.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    userType: u.userType,
    sdpRole: u.sdpRole ?? null,
    accessibleBusinessIds: Array.isArray(u.accessibleBusinessIds) ? u.accessibleBusinessIds : null,
  };
}

function sendResult<T>(res: Response, result: Result<T>) {
  if (!result.ok) {
    return res.status(result.status).json(result.code ? { message: result.message, code: result.code } : { message: result.message });
  }
  return res.json(result.data);
}

function logError(where: string, error: any) {
  console.error(`[businesses] ${where}: ${error?.message ?? String(error)}`);
}

/**
 * Buffers an `image/*` body for the logo upload. `express.json()` never sees
 * these requests (the body is not JSON), so its 100 KB limit does not apply.
 * Parser errors are answered here because the global handler rethrows.
 */
const rawImageBody: RequestHandler = (req, res, next) => {
  const parser = express.raw({ type: [...BUSINESS_LOGO_TYPES], limit: BUSINESS_LOGO_MAX_BYTES + 1024 });
  parser(req, res, (err?: any) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      return res.status(413).json({ message: "The logo must be 1 MB or smaller", code: "LOGO_TOO_LARGE" });
    }
    logError("logo body", err);
    return res.status(400).json({ message: "Could not read the uploaded image", code: "LOGO_BODY_INVALID" });
  });
};

export type BusinessesService = typeof defaultService;

/** `service` is a seam for tests; production uses the wired singleton. */
export function registerBusinessProfileRoutes(
  app: Express,
  authMiddleware: RequestHandler,
  businessesService: BusinessesService = defaultService,
): void {
  app.patch("/api/businesses/me", authMiddleware, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      return sendResult(res, await businessesService.updateBusinessProfile(user, "me", req.body));
    } catch (error: any) {
      logError("Error saving profile details", error);
      return res.status(500).json({ message: "Failed to save business details" });
    }
  });

  app.patch("/api/businesses/:id/profile", authMiddleware, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      return sendResult(res, await businessesService.updateBusinessProfile(user, req.params.id, req.body));
    } catch (error: any) {
      logError("Error saving profile details", error);
      return res.status(500).json({ message: "Failed to save business details" });
    }
  });

  app.put("/api/businesses/:id/logo", authMiddleware, rawImageBody, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (!Buffer.isBuffer(req.body)) {
        return res.status(415).json({ message: "The logo must be a PNG, JPEG or WebP image", code: "LOGO_INVALID_TYPE" });
      }
      return sendResult(res, await businessesService.setBusinessLogo(user, req.params.id, req.body));
    } catch (error: any) {
      logError("Error saving logo", error);
      return res.status(500).json({ message: "Failed to save the logo" });
    }
  });

  app.delete("/api/businesses/:id/logo", authMiddleware, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      return sendResult(res, await businessesService.removeBusinessLogo(user, req.params.id));
    } catch (error: any) {
      logError("Error removing logo", error);
      return res.status(500).json({ message: "Failed to remove the logo" });
    }
  });

  // Public on purpose: the sidebar <img> cannot send Authorization. Ids are
  // UUIDs and the response is a logo the business chose to show.
  app.get("/api/businesses/:id/logo", async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const row = await businessesService.getBusinessLogo(req.params.id);
      if (!row) return res.status(404).json({ message: "No logo", code: "LOGO_NOT_FOUND" });
      res.set({
        "Content-Type": row.contentType,
        "Cache-Control": "public, max-age=86400",
        ETag: `"${row.sha256}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      });
      if (req.fresh) return res.status(304).end();
      const bytes = Buffer.from(row.data, "base64");
      res.set("Content-Length", String(bytes.length));
      return res.send(bytes);
    } catch (error: any) {
      logError("Error reading logo", error);
      return res.status(500).json({ message: "Failed to load the logo" });
    }
  });
}
