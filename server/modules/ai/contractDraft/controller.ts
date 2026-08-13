/**
 * Express controller — registers the AI endpoints:
 *   POST /api/ai/contract-draft         — main draft
 *   POST /api/ai/resolve-worker-by-email — email → workerId for name duplicates
 *
 * Kept HTTP-only:
 *   - auth check
 *   - parse body
 *   - call service (or storage for the resolve path)
 *   - fire-and-forget audit log write
 *   - translate tagged result → status + body
 */

import type { Express, RequestHandler } from "express";
import { db } from "../../../db";
import { aiPromptLog } from "@shared/schema";
import { isAiEnabled } from "../openaiClient";
import { listWorkers } from "../../workforce";
import { resolveDraftScope } from "./authorize";
import { draftContractFromPrompt, hashPrompt } from "./service";
import type { AuthUser, ChatMessage, ContractChatRequest, DraftAudit, ResolveWorkerRequest } from "./types";

const LOG_FULL_PROMPTS = process.env.AI_LOG_FULL_PROMPTS === "true";

async function writeAudit(params: {
  userId: string;
  businessId?: string;
  endpoint: string;
  prompt: string;
  audit: DraftAudit;
}): Promise<void> {
  try {
    await db.insert(aiPromptLog).values({
      userId: params.userId,
      businessId: params.businessId ?? null,
      endpoint: params.endpoint,
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
    console.error(`[ai/${params.endpoint}] audit log insert failed:`, (err as Error)?.message);
  }
}

export function registerAiContractRoutes(app: Express, authMiddleware: RequestHandler): void {
  app.post("/api/ai/contract-draft", authMiddleware, async (req: any, res) => {
    if (!isAiEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }

    const user: AuthUser = {
      id: req.user?.id,
      userType: req.user?.userType,
      activeRole: req.user?.activeRole,
      availableRoles: req.user?.availableRoles,
    };
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });

    const rawMessages: unknown = req.body?.messages;
    const messages: ChatMessage[] = Array.isArray(rawMessages)
      ? (rawMessages as any[])
          .filter((m) => m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const rawStep = req.body?.currentStep;
    const currentStep =
      rawStep === 1 || rawStep === 2 || rawStep === 3 || rawStep === 4 ? rawStep : undefined;

    const body: ContractChatRequest = {
      messages,
      currentDraft: req.body?.currentDraft,
      currentStep,
    };

    // Audit-log preview = the last user message (or empty).
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const auditPreview = lastUser?.content ?? "";

    try {
      const result = await draftContractFromPrompt(user, body);

      if (result.audit) {
        // Fire-and-forget — never let logging block the response.
        void writeAudit({ userId: user.id, endpoint: "contract-draft", prompt: auditPreview, audit: result.audit });
      }

      if (!result.ok) {
        return res.status(result.status).json({ message: result.message, code: result.code });
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error("[ai/contract-draft] error:", error?.message);
      return res.status(500).json({ message: "Failed to draft contract", code: "AI_INTERNAL_ERROR" });
    }
  });

  // Email-based resolution used when the AI reports a duplicate name.
  // Scope enforcement matches the draft endpoint: business_user callers are
  // pinned to their JWT's business; sdp_internal callers must pass businessId.
  app.post("/api/ai/resolve-worker-by-email", authMiddleware, async (req: any, res) => {
    if (!isAiEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }

    const user: AuthUser = {
      id: req.user?.id,
      userType: req.user?.userType,
      activeRole: req.user?.activeRole,
      availableRoles: req.user?.availableRoles,
    };
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });

    const body: ResolveWorkerRequest = {
      email: typeof req.body?.email === "string" ? req.body.email.trim() : "",
      businessId: typeof req.body?.businessId === "string" ? req.body.businessId : undefined,
    };
    if (!body.email) {
      return res.status(400).json({ message: "Email is required", code: "EMAIL_REQUIRED" });
    }

    try {
      const scope = await resolveDraftScope(user);
      if (scope.kind === "denied") {
        return res.status(scope.status).json({ message: scope.message, code: "FORBIDDEN" });
      }

      let effectiveBusinessId: string | undefined;
      if (scope.role === "business_user") {
        effectiveBusinessId = scope.businessId;
      } else {
        effectiveBusinessId = body.businessId;
        if (!effectiveBusinessId) {
          return res.status(400).json({
            message: "businessId is required for SDP internal callers",
            code: "BUSINESS_ID_REQUIRED",
          });
        }
      }

      const started = Date.now();
      const listResult = await listWorkers(user, {
        page: 1,
        pageSize: 5,
        search: body.email,
        sortBy: "name",
      });
      const latencyMs = Date.now() - started;

      const items = listResult.ok ? listResult.data.items : [];
      const emailLc = body.email.toLowerCase();
      const matches = items.filter(
        (w: any) => (w.email ?? "").toLowerCase() === emailLc && w.businessId === effectiveBusinessId,
      );

      const audit: DraftAudit = {
        model: "-",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        toolCalls: [],
        resultStatus: matches.length === 1 ? "ok" : "validation_failed",
      };
      void writeAudit({
        userId: user.id,
        businessId: effectiveBusinessId,
        endpoint: "resolve-worker",
        prompt: body.email,
        audit,
      });

      if (matches.length === 0) {
        return res.status(404).json({ message: "No worker with that email in this company", code: "NOT_FOUND" });
      }
      if (matches.length > 1) {
        return res.status(409).json({ message: "Multiple workers share this email", code: "MULTIPLE_MATCHES" });
      }

      const w = matches[0];
      return res.json({
        workerId: w.id,
        workerName: `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim(),
      });
    } catch (error: any) {
      console.error("[ai/resolve-worker-by-email] error:", error?.message);
      return res.status(500).json({ message: "Failed to resolve worker", code: "AI_INTERNAL_ERROR" });
    }
  });
}
