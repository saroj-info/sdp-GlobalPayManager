/**
 * Express controller for timesheet-approval.
 *
 * Strictly HTTP concerns:
 *   - parse request shape
 *   - call the service
 *   - translate the result to a status code + body
 *
 * No business logic. No DB calls. If a change is needed in *what* approval does,
 * it belongs in service.ts, not here.
 *
 * Three routes:
 *   PATCH /api/timesheets/:id/status        signed-in approve / reject (unchanged)
 *   GET   /api/timesheet-approval/:token    PUBLIC: what the email link points at (never changes state)
 *   POST  /api/timesheet-approval/:token    PUBLIC: the confirm step of the email link
 */

import type { Express, RequestHandler } from "express";
import { apiRateLimiter } from "../../rateLimitMiddleware";
import { processStatusUpdate } from "./service";
import { lookupApprovalToken, summarizeForApprover } from "./tokens";

const linkRateLimiter = apiRateLimiter(30, 60_000);

export function registerTimesheetApprovalRoutes(
  app: Express,
  authMiddleware: RequestHandler,
): void {
  app.patch(
    "/api/timesheets/:id/status",
    authMiddleware,
    async (req: any, res) => {
      try {
        const userId = req.user?.id;
        const userType = req.user?.userType;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        const { status, rejectionReason } = req.body ?? {};
        if (!id || !status) {
          return res.status(400).json({ message: "Timesheet id and status are required" });
        }

        const result = await processStatusUpdate({
          timesheetId: id,
          status,
          rejectionReason,
          user: { id: userId, userType, activeRole: req.user?.activeRole, availableRoles: req.user?.availableRoles },
        });

        if (!result.ok) return res.status(result.status).json({ message: result.message, code: result.code });
        return res.json({ message: "Timesheet status updated successfully" });
      } catch (error: any) {
        console.error("Error updating timesheet status:", error);
        return res.status(400).json({ message: "Failed to update timesheet status" });
      }
    },
  );

  // ── Email link: look up (public, read-only) ────────────────────────────────
  app.get("/api/timesheet-approval/:token", linkRateLimiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const found = await lookupApprovalToken(String(req.params.token || ""));
      if (found.state === "invalid") {
        return res.status(404).json({ state: "invalid", code: found.code, message: found.message });
      }
      const summary = summarizeForApprover(found.timesheet, found.contract, found.worker);
      return res.json({
        state: found.state,
        code: found.ok ? undefined : found.code,
        message: found.ok ? undefined : found.message,
        timesheetId: found.timesheet.id,
        approverRole: found.token.approverRole,
        expiresAt: found.token.expiresAt,
        usedAction: found.token.usedAction ?? null,
        usedAt: found.token.usedAt ?? null,
        summary,
      });
    } catch (error: any) {
      console.error("[timesheet-approval] link lookup failed:", error?.message || error);
      return res.status(500).json({ message: "Could not load this approval link" });
    }
  });

  // ── Email link: decide (public, the confirm click) ─────────────────────────
  app.post("/api/timesheet-approval/:token", linkRateLimiter, async (req: any, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      const { action, rejectionReason } = req.body ?? {};
      if (action !== "approve" && action !== "reject") {
        return res.status(400).json({ code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'." });
      }
      const reason = typeof rejectionReason === "string" ? rejectionReason.trim() : "";
      if (action === "reject" && !reason) {
        return res.status(400).json({ code: "REJECTION_REASON_REQUIRED", message: "Please give a reason for rejecting this timesheet." });
      }

      const found = await lookupApprovalToken(String(req.params.token || ""));
      if (!found.ok) {
        const extra = found.state === "invalid"
          ? {}
          : { timesheetId: found.timesheet.id, usedAction: found.token.usedAction ?? null, usedAt: found.token.usedAt ?? null };
        return res.status(found.status).json({ state: found.state, code: found.code, message: found.message, ...extra });
      }

      const status = action === "approve" ? "approved" : "rejected";
      const result = await processStatusUpdate({
        timesheetId: found.timesheet.id,
        status,
        rejectionReason: reason || undefined,
        actor: { kind: "email_link", token: found.token },
      });
      if (!result.ok) return res.status(result.status).json({ message: result.message, code: result.code });
      return res.json({
        message: status === "approved" ? "Timesheet approved." : "Timesheet rejected.",
        action: status,
        timesheetId: found.timesheet.id,
      });
    } catch (error: any) {
      console.error("[timesheet-approval] link decision failed:", error?.message || error);
      return res.status(500).json({ message: "Could not record your decision. Please try again or sign in to SDP Global Pay." });
    }
  });
}
