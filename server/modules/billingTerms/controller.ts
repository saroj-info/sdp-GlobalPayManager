/**
 * HTTP layer for SDP Billing Terms.
 *   GET  /api/billing-terms/current?businessId=&countryId=
 *   PUT  /api/billing-terms/signed-document                 (SDP or business user: ACL on an uploaded file)
 *   GET  /api/contracts/:id/billing-terms-acceptance
 *   POST /api/contracts/:id/billing-terms-acceptance        (accept later, after a skip)
 *   GET  /api/contracts/:id/billing-terms-acceptance/document-url
 *   GET  /api/admin/billing-terms, /versions; POST /api/admin/billing-terms;
 *   PUT  /api/admin/billing-terms/:id; POST /:id/publish; POST /preview   (SDP admins)
 */
import type { Express, RequestHandler } from "express";
import { storage } from "../../storage";
import { ObjectStorageService } from "../../objectStorage";
import { billingTermsService as svc } from "./service";
import type { Result } from "./types";

function sendError(res: any, r: Extract<Result<unknown>, { ok: false }>) {
  return res.status(r.status).json({ message: r.message, ...(r.code ? { code: r.code } : {}), ...(r.extra ?? {}) });
}

async function canReadContract(user: any, contract: any): Promise<boolean> {
  if (user?.userType === 'sdp_internal') return true;
  const business = await storage.getPrimaryBusinessForUser(user?.id);
  return !!business && (contract.businessId === business.id || contract.customerBusinessId === business.id);
}

export function registerBillingTermsRoutes(app: Express, authMiddleware: RequestHandler, requireAdmin: RequestHandler): void {
  app.get("/api/billing-terms/current", authMiddleware, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });
      let businessId: string | undefined;
      if (user.userType === 'business_user') {
        const business = await storage.getPrimaryBusinessForUser(user.id);
        if (!business) return res.status(404).json({ message: "No business found for your account", code: 'BUSINESS_NOT_FOUND' });
        businessId = business.id;
      } else if (user.userType === 'sdp_internal') {
        businessId = typeof req.query.businessId === 'string' ? req.query.businessId : undefined;
        if (!businessId) return res.status(400).json({ message: "businessId is required", code: 'BUSINESS_ID_REQUIRED' });
      } else {
        return res.status(403).json({ message: "Your account cannot accept billing terms." });
      }
      const business = await storage.getBusinessById(businessId);
      if (!business) return res.status(404).json({ message: "Business not found", code: 'BUSINESS_NOT_FOUND' });
      const countryId = typeof req.query.countryId === 'string' && req.query.countryId ? req.query.countryId : (business as any).registrationCountryId;
      const result = await svc.getCurrentRenderedTerms(businessId, countryId);
      if (!result.ok) return sendError(res, result);
      const { hash, placeholders, ...wire } = result.data;
      void hash; void placeholders;
      return res.json(wire);
    } catch (error: any) {
      console.error("[billing-terms] current failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load billing terms" });
    }
  });

  app.put("/api/billing-terms/signed-document", authMiddleware, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });
      if (user.userType !== 'sdp_internal' && user.userType !== 'business_user') return res.status(403).json({ message: "Your account cannot upload a signed agreement." });
      const documentURL = req.body?.documentURL;
      if (typeof documentURL !== 'string' || !documentURL) return res.status(400).json({ message: "documentURL is required" });
      const objectPath = await new ObjectStorageService().trySetObjectEntityAclPolicy(documentURL, { owner: user.id, visibility: "private" });
      return res.json({ objectPath });
    } catch (error: any) {
      console.error("[billing-terms] signed-document ACL failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to store the signed document" });
    }
  });

  app.get("/api/contracts/:id/billing-terms-acceptance", authMiddleware, async (req: any, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      if (!(await canReadContract(req.user, contract))) return res.status(403).json({ message: "Unauthorized" });
      const { view } = await svc.getAcceptanceForContract(contract.id);
      return res.json({ acceptance: view });
    } catch (error: any) {
      console.error("[billing-terms] acceptance read failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load billing terms acceptance" });
    }
  });

  app.post("/api/contracts/:id/billing-terms-acceptance", authMiddleware, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.id) return res.status(401).json({ message: "Unauthorized" });
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      // Only the contract's own business (not the host client) or SDP may accept.
      if (user.userType === 'business_user') {
        const business = await storage.getPrimaryBusinessForUser(user.id);
        if (!business || contract.businessId !== business.id) return res.status(403).json({ message: "Unauthorized" });
      } else if (user.userType !== 'sdp_internal') {
        return res.status(403).json({ message: "Your account cannot accept billing terms." });
      }
      const result = await svc.acceptForExistingContract({
        contract: {
          id: contract.id,
          businessId: contract.businessId,
          countryId: contract.countryId ?? null,
          billingMode: contract.billingMode ?? null,
          isForClient: contract.isForClient ?? null,
        },
        acceptanceRaw: req.body?.billingTermsAcceptance ?? req.body,
        callerUserType: user.userType,
        callerUserId: user.id,
        ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
      });
      if (!result.ok) return sendError(res, result);
      return res.status(201).json({ acceptance: result.data });
    } catch (error: any) {
      console.error("[billing-terms] accept-later failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to record the billing terms acceptance" });
    }
  });

  app.get("/api/contracts/:id/billing-terms-acceptance/document-url", authMiddleware, async (req: any, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      if (!(await canReadContract(req.user, contract))) return res.status(403).json({ message: "Unauthorized" });
      const { row } = await svc.getAcceptanceForContract(contract.id);
      if (!row?.signedDocumentPath) return res.status(404).json({ message: "No signed document on file" });
      const url = await new ObjectStorageService().getDownloadURL(row.signedDocumentPath);
      return res.json({ url });
    } catch (error: any) {
      console.error("[billing-terms] document-url failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  // ---- admin ---------------------------------------------------------------

  app.get("/api/admin/billing-terms", authMiddleware, requireAdmin, async (_req, res) => {
    try {
      return res.json(await svc.adminOverview());
    } catch (error: any) {
      console.error("[billing-terms] overview failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load billing terms" });
    }
  });

  app.get("/api/admin/billing-terms/versions", authMiddleware, requireAdmin, async (_req, res) => {
    try {
      return res.json({ items: await svc.listVersions() });
    } catch (error: any) {
      console.error("[billing-terms] versions failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to load versions" });
    }
  });

  app.post("/api/admin/billing-terms/preview", authMiddleware, requireAdmin, (req: any, res) => {
    const result = svc.adminPreview(req.body);
    if (!result.ok) return sendError(res, result);
    return res.json(result.data);
  });

  app.post("/api/admin/billing-terms", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await svc.adminCreateDraft(req.user.id, req.body);
      if (!result.ok) return sendError(res, result);
      return res.status(201).json(result.data);
    } catch (error: any) {
      console.error("[billing-terms] create draft failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save draft" });
    }
  });

  app.put("/api/admin/billing-terms/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await svc.adminUpdateDraft(req.user.id, req.params.id, req.body);
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[billing-terms] update draft failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to save draft" });
    }
  });

  app.post("/api/admin/billing-terms/:id/publish", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const result = await svc.adminPublish(req.user.id, req.params.id, req.body ?? {});
      if (!result.ok) return sendError(res, result);
      return res.json(result.data);
    } catch (error: any) {
      console.error("[billing-terms] publish failed:", error?.message ?? String(error));
      return res.status(500).json({ message: "Failed to publish" });
    }
  });
}
