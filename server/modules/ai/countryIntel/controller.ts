/**
 * Express controller for country-intel Q&A.
 *   POST   /api/ai/country-intel
 *   GET    /api/ai/country-intel/sessions
 *   GET    /api/ai/country-intel/sessions/:id
 *   DELETE /api/ai/country-intel/sessions/:id   (soft archive)
 *
 * Feature-flagged on AI_COUNTRY_INTEL_ENABLED (opt-out). Audit-logs every
 * ask to ai_prompt_log with endpoint="country-intel".
 */

import type { Express, RequestHandler } from "express";
import { db } from "../../../db";
import { aiPromptLog } from "@shared/schema";
import { isAiCountryIntelEnabled } from "../openaiClient";
import { runCountryIntel, hashPrompt } from "./service";
import { resolveSearchScope } from "../search/authorize";
import { archiveSession, getSessionWithMessages, listSessionsForUser } from "../search/sessions";
import type { AuthUser, CountryIntelAudit, CountryIntelRequest } from "./types";

const FEATURE = "country-intel";
const LOG_FULL_PROMPTS = process.env.AI_LOG_FULL_PROMPTS === "true";

function extractAuthUser(req: any): AuthUser {
  return {
    id: req.user?.id,
    userType: req.user?.userType,
    activeRole: req.user?.activeRole,
    availableRoles: req.user?.availableRoles,
    sdpRole: req.user?.sdpRole,
    accessibleBusinessIds: req.user?.accessibleBusinessIds,
    accessibleCountries: req.user?.accessibleCountries,
  };
}

async function writeAudit(params: {
  userId: string;
  businessId?: string;
  prompt: string;
  audit: CountryIntelAudit;
}): Promise<void> {
  try {
    await db.insert(aiPromptLog).values({
      userId: params.userId,
      businessId: params.businessId ?? null,
      endpoint: FEATURE,
      model: params.audit.model,
      promptHash: hashPrompt(params.prompt),
      promptPreview: LOG_FULL_PROMPTS
        ? params.prompt.slice(0, 8000)
        : params.prompt.slice(0, 200),
      inputTokens: params.audit.inputTokens,
      outputTokens: params.audit.outputTokens,
      toolCalls: params.audit.toolCalls,
      latencyMs: params.audit.latencyMs,
      resultStatus: params.audit.resultStatus,
    });
  } catch (err) {
    console.error("[ai/country-intel] audit log insert failed:", (err as Error)?.message);
  }
}

export function registerAiCountryIntelRoutes(app: Express, authMiddleware: RequestHandler): void {
  app.post("/api/ai/country-intel", authMiddleware, async (req: any, res) => {
    if (!isAiCountryIntelEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });

    const body: CountryIntelRequest = {
      query: typeof req.body?.query === "string" ? req.body.query : "",
      sessionId: typeof req.body?.sessionId === "string" ? req.body.sessionId : undefined,
      country: typeof req.body?.country === "string" ? req.body.country : "",
      jurisdiction: typeof req.body?.jurisdiction === "string" ? req.body.jurisdiction : undefined,
      employmentType:
        typeof req.body?.employmentType === "string" ? req.body.employmentType : undefined,
    };

    try {
      const result = await runCountryIntel(user, body);
      if (result.audit) {
        void writeAudit({ userId: user.id, prompt: body.query, audit: result.audit });
      }
      if (!result.ok) {
        return res.status(result.status).json({ message: result.message, code: result.code });
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error("[ai/country-intel] error:", error?.message);
      return res.status(500).json({ message: "Country intel failed", code: "AI_INTERNAL_ERROR" });
    }
  });

  // ------------------------------------------------------------------
  // Session routes. Ownership-guarded on req.user.id AND feature-guarded
  // so country-intel can never read or archive an AI-search session (and
  // vice versa). Uniform 404s avoid leaking session existence.
  // ------------------------------------------------------------------

  app.get("/api/ai/country-intel/sessions", authMiddleware, async (req: any, res) => {
    if (!isAiCountryIntelEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const scope = await resolveSearchScope(user);
    if (scope.kind === "denied") {
      return res.status(scope.status).json({ message: scope.message, code: "FORBIDDEN" });
    }
    const items = await listSessionsForUser(user.id, {
      role: scope.role,
      feature: FEATURE,
    });
    return res.json({ items });
  });

  app.get("/api/ai/country-intel/sessions/:id", authMiddleware, async (req: any, res) => {
    if (!isAiCountryIntelEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    const data = await getSessionWithMessages(id, user.id, FEATURE);
    if (!data) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    return res.json(data);
  });

  app.delete("/api/ai/country-intel/sessions/:id", authMiddleware, async (req: any, res) => {
    if (!isAiCountryIntelEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    const ok = await archiveSession(id, user.id, FEATURE);
    if (!ok) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    return res.json({ id, archived: true });
  });
}
