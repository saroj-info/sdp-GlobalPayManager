/**
 * Express controller for the role-description suggester.
 *   POST /api/ai/suggest-role-description
 *
 * Feature-flagged on AI_ROLE_SUGGEST_ENABLED (opt-out). Audit-logs every
 * ask to ai_prompt_log with endpoint="role-suggest".
 */

import type { Express, RequestHandler } from "express";
import { db } from "../../../db";
import { aiPromptLog } from "@shared/schema";
import { isAiRoleSuggestEnabled } from "../openaiClient";
import { suggestRoleDescription, hashPrompt } from "./service";
import type { AuthUser, RoleSuggestAudit } from "./types";

const FEATURE = "role-suggest";
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
  audit: RoleSuggestAudit;
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
    console.error("[ai/role-suggest] audit log insert failed:", (err as Error)?.message);
  }
}

export function registerAiRoleSuggestRoutes(app: Express, authMiddleware: RequestHandler): void {
  app.post("/api/ai/suggest-role-description", authMiddleware, async (req: any, res) => {
    if (!isAiRoleSuggestEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });

    const body = {
      roleTitle: typeof req.body?.roleTitle === "string" ? req.body.roleTitle : "",
    };

    try {
      const result = await suggestRoleDescription(user, body);
      if (result.audit) {
        void writeAudit({
          userId: user.id,
          businessId: result.audit.businessId,
          prompt: body.roleTitle,
          audit: result.audit,
        });
      }
      if (!result.ok) {
        return res.status(result.status).json({ message: result.message, code: result.code });
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error("[ai/role-suggest] error:", error?.message);
      return res.status(500).json({ message: "Suggestion failed", code: "AI_INTERNAL_ERROR" });
    }
  });
}
