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
 */

import type { Express, RequestHandler } from "express";
import { processStatusUpdate } from "./service";

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

        if (!result.ok) return res.status(result.status).json({ message: result.message });
        return res.json({ message: "Timesheet status updated successfully" });
      } catch (error: any) {
        console.error("Error updating timesheet status:", error);
        return res.status(400).json({ message: "Failed to update timesheet status" });
      }
    },
  );
}
