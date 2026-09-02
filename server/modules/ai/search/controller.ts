/**
 * Express controller for AI search.
 *   POST /api/ai/search
 *
 * Feature-flagged on AI_SEARCH_ENABLED. Audit-logs every call to ai_prompt_log
 * with endpoint="search".
 */

import type { Express, RequestHandler } from "express";
import { db } from "../../../db";
import { aiPromptLog } from "@shared/schema";
import { isAiSearchEnabled } from "../openaiClient";
import { runSearch, hashPrompt } from "./service";
import { getPrimer, listPrimersForRole } from "./primerRegistry";
import { resolveSearchScope } from "./authorize";
import {
  archiveSession,
  createSession,
  getSessionWithMessages,
  listSessionsForUser,
  renameSession,
} from "./sessions";
import type { AuthUser, ChatMessage, SearchAudit, SearchRequest } from "./types";

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
  audit: SearchAudit;
}): Promise<void> {
  try {
    await db.insert(aiPromptLog).values({
      userId: params.userId,
      businessId: params.businessId ?? null,
      endpoint: "search",
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
    console.error("[ai/search] audit log insert failed:", (err as Error)?.message);
  }
}

export function registerAiSearchRoutes(app: Express, authMiddleware: RequestHandler): void {
  app.post("/api/ai/search", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }

    const user: AuthUser = {
      id: req.user?.id,
      userType: req.user?.userType,
      activeRole: req.user?.activeRole,
      availableRoles: req.user?.availableRoles,
      sdpRole: req.user?.sdpRole,
      accessibleBusinessIds: req.user?.accessibleBusinessIds,
      accessibleCountries: req.user?.accessibleCountries,
    };
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });

    const rawHistory: unknown = req.body?.history;
    const history: ChatMessage[] = Array.isArray(rawHistory)
      ? (rawHistory as any[])
          .filter(
            (m) =>
              m &&
              typeof m === "object" &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const body: SearchRequest = {
      query: typeof req.body?.query === "string" ? req.body.query : "",
      history,
      sessionId: typeof req.body?.sessionId === "string" ? req.body.sessionId : undefined,
      context:
        req.body?.context && typeof req.body.context === "object"
          ? {
              currentPage:
                typeof req.body.context.currentPage === "string"
                  ? req.body.context.currentPage
                  : undefined,
              activeRole:
                typeof req.body.context.activeRole === "string"
                  ? req.body.context.activeRole
                  : undefined,
            }
          : undefined,
    };

    try {
      const result = await runSearch(user, body);
      if (result.audit) {
        void writeAudit({ userId: user.id, prompt: body.query, audit: result.audit });
      }
      if (!result.ok) {
        return res.status(result.status).json({ message: result.message, code: result.code });
      }
      return res.json(result.data);
    } catch (error: any) {
      console.error("[ai/search] error:", error?.message);
      return res.status(500).json({ message: "Search failed", code: "AI_INTERNAL_ERROR" });
    }
  });

  // Primer content — served directly (no LLM round-trip). Audience-filtered by
  // the caller's effective role via getPrimer / listPrimersForRole.
  app.get("/api/ai/search/primers", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = {
      id: req.user?.id,
      userType: req.user?.userType,
      activeRole: req.user?.activeRole,
      availableRoles: req.user?.availableRoles,
      sdpRole: req.user?.sdpRole,
      accessibleBusinessIds: req.user?.accessibleBusinessIds,
      accessibleCountries: req.user?.accessibleCountries,
    };
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const scope = await resolveSearchScope(user);
    if (scope.kind === "denied") {
      return res.status(scope.status).json({ message: scope.message, code: "FORBIDDEN" });
    }
    const primers = listPrimersForRole(scope.role);
    return res.json({
      items: primers.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, updated: p.updated })),
    });
  });

  // ------------------------------------------------------------------
  // Session CRUD. Every route ownership-guards on req.user.id via the
  // sessions module (getSessionWithMessages / renameSession / archiveSession
  // return null / false on foreign or missing ids). We uniformly 404 to
  // avoid leaking session existence across users.
  // ------------------------------------------------------------------

  app.get("/api/ai/search/sessions", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const scope = await resolveSearchScope(user);
    if (scope.kind === "denied") {
      return res.status(scope.status).json({ message: scope.message, code: "FORBIDDEN" });
    }
    const includeArchived = req.query?.includeArchived === "true";
    const items = await listSessionsForUser(user.id, {
      role: scope.role,
      includeArchived,
    });
    return res.json({ items });
  });

  app.post("/api/ai/search/sessions", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const scope = await resolveSearchScope(user);
    if (scope.kind === "denied") {
      return res.status(scope.status).json({ message: scope.message, code: "FORBIDDEN" });
    }
    try {
      const created = await createSession({
        userId: user.id,
        businessId: scope.businessId ?? null,
        role: scope.role,
        title: typeof req.body?.title === "string" ? req.body.title : undefined,
      });
      return res.status(201).json(created);
    } catch (err: any) {
      console.error("[ai/search] createSession failed:", err?.message);
      return res.status(500).json({ message: "Could not create session", code: "AI_INTERNAL_ERROR" });
    }
  });

  app.get("/api/ai/search/sessions/:id", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    const data = await getSessionWithMessages(id, user.id);
    if (!data) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    return res.json(data);
  });

  app.patch("/api/ai/search/sessions/:id", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ message: "Title required", code: "TITLE_REQUIRED" });
    const ok = await renameSession(id, user.id, title);
    if (!ok) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    return res.json({ id, title: title.slice(0, 60) });
  });

  app.delete("/api/ai/search/sessions/:id", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = extractAuthUser(req);
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    const ok = await archiveSession(id, user.id);
    if (!ok) return res.status(404).json({ message: "Session not found", code: "SESSION_NOT_FOUND" });
    return res.json({ id, archived: true });
  });

  app.get("/api/ai/search/primers/:slug", authMiddleware, async (req: any, res) => {
    if (!isAiSearchEnabled()) {
      return res.status(404).json({ message: "Not found", code: "AI_DISABLED" });
    }
    const user: AuthUser = {
      id: req.user?.id,
      userType: req.user?.userType,
      activeRole: req.user?.activeRole,
      availableRoles: req.user?.availableRoles,
      sdpRole: req.user?.sdpRole,
      accessibleBusinessIds: req.user?.accessibleBusinessIds,
      accessibleCountries: req.user?.accessibleCountries,
    };
    if (!user.id) return res.status(401).json({ message: "Unauthorized" });
    const scope = await resolveSearchScope(user);
    if (scope.kind === "denied") {
      return res.status(scope.status).json({ message: scope.message, code: "FORBIDDEN" });
    }
    const slug = String(req.params.slug || "").trim();
    const primer = slug ? getPrimer(slug, scope.role) : null;
    if (!primer) {
      return res.status(404).json({ message: "Primer not found", code: "PRIMER_NOT_FOUND" });
    }
    return res.json({
      slug: primer.slug,
      title: primer.title,
      summary: primer.summary,
      updated: primer.updated,
      body: primer.body,
    });
  });
}
