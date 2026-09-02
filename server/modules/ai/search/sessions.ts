/**
 * Persistent chat sessions for the AI search + Q&A modal.
 *
 * Ownership: every read/write is ownership-guarded on (sessionId, userId).
 * Cross-user access always returns null / boolean-false so the caller can
 * uniformly 404 without leaking existence.
 *
 * Titling:
 *   - createSession seeds title = "New chat".
 *   - On the FIRST user turn, autoTitleFromFirstMessage sets a heuristic title
 *     (first ~48 chars). Optionally follow up with autoTitleFromLLM to
 *     summarise into <=6 words via chatExtract. Both are best-effort.
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../db";
import { aiSearchSessions, aiSearchMessages } from "@shared/schema";
import type { AiSearchSession, AiSearchMessage } from "@shared/schema";
import { chatExtract, AiUpstreamError } from "../openaiClient";
import type { CallerRole } from "./types";

const MAX_TITLE_CHARS = 60;

export interface SessionSummary {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload: unknown | null;
  createdAt: string;
}

export interface SessionWithMessages {
  session: SessionSummary & { role: CallerRole; businessId: string | null };
  messages: StoredMessage[];
}

function toSummary(row: AiSearchSession): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toMessage(row: AiSearchMessage): StoredMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    payload: row.payload ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listSessionsForUser(
  userId: string,
  opts: { role?: CallerRole; limit?: number; includeArchived?: boolean } = {},
): Promise<SessionSummary[]> {
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || 30));
  const rows = await db
    .select()
    .from(aiSearchSessions)
    .where(
      opts.role
        ? and(
            eq(aiSearchSessions.userId, userId),
            eq(aiSearchSessions.role, opts.role),
            opts.includeArchived ? sql`true` : isNull(aiSearchSessions.archivedAt),
          )
        : and(
            eq(aiSearchSessions.userId, userId),
            opts.includeArchived ? sql`true` : isNull(aiSearchSessions.archivedAt),
          ),
    )
    .orderBy(desc(aiSearchSessions.lastMessageAt))
    .limit(limit);
  return rows.map(toSummary);
}

export async function createSession(params: {
  userId: string;
  businessId?: string | null;
  role: CallerRole;
  title?: string;
}): Promise<SessionSummary> {
  const [row] = await db
    .insert(aiSearchSessions)
    .values({
      userId: params.userId,
      businessId: params.businessId ?? null,
      role: params.role,
      title: (params.title ?? "New chat").slice(0, MAX_TITLE_CHARS),
    })
    .returning();
  return toSummary(row);
}

export async function getSessionOwned(
  sessionId: string,
  userId: string,
): Promise<AiSearchSession | null> {
  const [row] = await db
    .select()
    .from(aiSearchSessions)
    .where(and(eq(aiSearchSessions.id, sessionId), eq(aiSearchSessions.userId, userId)))
    .limit(1);
  if (!row) return null;
  if (row.archivedAt) return null;
  return row;
}

export async function getSessionWithMessages(
  sessionId: string,
  userId: string,
): Promise<SessionWithMessages | null> {
  const session = await getSessionOwned(sessionId, userId);
  if (!session) return null;
  const rows = await db
    .select()
    .from(aiSearchMessages)
    .where(eq(aiSearchMessages.sessionId, sessionId))
    .orderBy(aiSearchMessages.createdAt);
  return {
    session: {
      ...toSummary(session),
      role: session.role as CallerRole,
      businessId: session.businessId,
    },
    messages: rows.map(toMessage),
  };
}

/** Count of messages currently persisted in the session — used to detect "first turn". */
export async function countSessionMessages(sessionId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiSearchMessages)
    .where(eq(aiSearchMessages.sessionId, sessionId));
  return Number(row?.n ?? 0);
}

/** Append a message and bump the session's lastMessageAt. Ownership is assumed to have been validated by the caller. */
export async function appendMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  payload?: unknown;
}): Promise<void> {
  await db.insert(aiSearchMessages).values({
    sessionId: params.sessionId,
    role: params.role,
    content: params.content,
    payload: (params.payload ?? null) as any,
  });
  await db
    .update(aiSearchSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiSearchSessions.id, params.sessionId));
}

export async function renameSession(
  sessionId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const cleaned = title.trim().slice(0, MAX_TITLE_CHARS);
  if (!cleaned) return false;
  const rows = await db
    .update(aiSearchSessions)
    .set({ title: cleaned })
    .where(and(eq(aiSearchSessions.id, sessionId), eq(aiSearchSessions.userId, userId)))
    .returning({ id: aiSearchSessions.id });
  return rows.length > 0;
}

export async function archiveSession(sessionId: string, userId: string): Promise<boolean> {
  const rows = await db
    .update(aiSearchSessions)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(aiSearchSessions.id, sessionId),
        eq(aiSearchSessions.userId, userId),
        isNull(aiSearchSessions.archivedAt),
      ),
    )
    .returning({ id: aiSearchSessions.id });
  return rows.length > 0;
}

/** Heuristic first-turn title: strip newlines, trim, cap at MAX_TITLE_CHARS. */
export function heuristicTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "New chat";
  return cleaned.length <= MAX_TITLE_CHARS ? cleaned : cleaned.slice(0, MAX_TITLE_CHARS - 1) + "…";
}

/**
 * Best-effort LLM-summarised session title. Never throws — falls back to the
 * heuristic on any upstream failure. Fire-and-forget from the caller (don't
 * await if you don't need the value).
 */
export async function generateSummaryTitle(firstUserMessage: string): Promise<string> {
  const fallback = heuristicTitle(firstUserMessage);
  const text = firstUserMessage.trim().slice(0, 500);
  if (!text) return fallback;
  try {
    const { completion } = await chatExtract({
      messages: [
        {
          role: "system",
          content:
            "You name chat sessions. Summarise the user's first message in 3-6 words, lowercase, no punctuation, no quotes. Return JSON: {\"title\": \"...\"}. If the message is too vague, return {\"title\": \"new chat\"}.",
        },
        { role: "user", content: `Message: """${text}"""` },
      ],
      jsonMode: true,
      toolChoice: "none",
    });
    const content = completion.choices[0]?.message?.content ?? "";
    if (!content) return fallback;
    const parsed = JSON.parse(content);
    const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
    if (!title) return fallback;
    return title.slice(0, MAX_TITLE_CHARS);
  } catch (err) {
    if (err instanceof AiUpstreamError) return fallback;
    return fallback;
  }
}

/** Update the title using generateSummaryTitle. Best-effort, ownership-guarded. */
export async function autoTitleFromLLM(
  sessionId: string,
  userId: string,
  firstUserMessage: string,
): Promise<void> {
  try {
    const title = await generateSummaryTitle(firstUserMessage);
    await renameSession(sessionId, userId, title);
  } catch {
    // Fire-and-forget — never surface titling errors to the caller.
  }
}
