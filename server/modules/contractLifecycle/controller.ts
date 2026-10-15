/**
 * HTTP layer for contract lifecycle actions.
 *   POST /api/contracts/:id/renew                                  (new contract cloned from :id)
 *   POST /api/contracts/:id/extend                                 (end date only)
 *   PUT  /api/contracts/:id/host-client-confirmation
 *   PUT  /api/contracts/host-client-confirmation/document          (SDP or business user: ACL on an uploaded file)
 *   GET  /api/contracts/:id/host-client-confirmation/document-url
 */
import type { Express, RequestHandler } from "express";
import { storage } from "../../storage";
import { ObjectStorageService } from "../../objectStorage";
import { contractLifecycleService as svc } from "./service";
import type { AuthUser, Result } from "./types";

function sendError(res: any, r: Extract<Result<unknown>, { ok: false }>) {
  return res.status(r.status).json({ message: r.message, ...(r.code ? { code: r.code } : {}), ...(r.extra ?? {}) });
}

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

// Same read gate as the billing-terms routes: SDP, the employing business or
// the host-client business may read.
async function canReadContract(user: any, contract: any): Promise<boolean> {
  if (user?.userType === 'sdp_internal') return true;
  const business = await storage.getPrimaryBusinessForUser(user?.id);
  return !!business && (contract.businessId === business.id || contract.customerBusinessId === business.id);
}

export function registerContractLifecycleRoutes(app: Express, authMiddleware: RequestHandler): void {
  app.post("/api/contracts/:id/renew", authMiddleware, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const result = await svc.renewContract(user, req.params.id, req.body ?? {});
      if (!result.ok) return sendError(res, result);
      return res.status(201).json(result.data);
    } catch (error: any) {
      console.error("[contract-lifecycle] renew failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to renew the contract" });
    }
  });

  app.post("/api/contracts/:id/extend", authMiddleware, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const result = await svc.extendContract(user, req.params.id, req.body ?? {});
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[contract-lifecycle] extend failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to extend the contract" });
    }
  });

  app.put("/api/contracts/:id/host-client-confirmation", authMiddleware, async (req: any, res) => {
    try {
      const user = toAuthUser(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const result = await svc.setHostClientConfirmation(user, req.params.id, req.body ?? {});
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[contract-lifecycle] host-client-confirmation failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save the host client confirmation" });
    }
  });

  // ACL for a file uploaded through POST /api/objects/upload. The path is tied
  // to a contract when the confirmation is saved.
  app.put("/api/contracts/host-client-confirmation/document", authMiddleware, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });
      if (user.userType !== 'sdp_internal' && user.userType !== 'business_user') {
        return res.status(403).json({ message: "Your account cannot upload a confirmation file." });
      }
      const documentURL = req.body?.documentURL;
      if (typeof documentURL !== 'string' || !documentURL) return res.status(400).json({ message: "documentURL is required" });
      const objectPath = await new ObjectStorageService().trySetObjectEntityAclPolicy(documentURL, { owner: user.id, visibility: "private" });
      return res.json({ objectPath });
    } catch (error: any) {
      console.error("[contract-lifecycle] confirmation document ACL failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to store the confirmation file" });
    }
  });

  app.get("/api/contracts/:id/host-client-confirmation/document-url", authMiddleware, async (req: any, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ message: "Contract not found", code: 'CONTRACT_NOT_FOUND' });
      if (!(await canReadContract(req.user, contract))) return res.status(403).json({ message: "Unauthorized" });
      const path = (contract as any).hostClientConfirmationDocumentPath as string | null | undefined;
      if (!path) return res.status(404).json({ message: "No confirmation file on file", code: 'NO_DOCUMENT' });
      const url = await new ObjectStorageService().getDownloadURL(path);
      return res.json({ url });
    } catch (error: any) {
      console.error("[contract-lifecycle] document-url failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to generate download URL" });
    }
  });
}
