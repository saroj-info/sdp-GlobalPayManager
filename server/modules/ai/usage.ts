/**
 * Daily AI token budget, shared by every AI feature (search, contract draft,
 * country intel, role suggest).
 *
 * One check per AI request, after scope resolution and input validation,
 * BEFORE the first chatExtract call. sdp_internal callers are exempt (they
 * administer the limit and usually have no business to charge). Usage is the
 * sum of input+output tokens already written to ai_prompt_log for the caller's
 * business since UTC midnight — audit rows are fire-and-forget, so a request
 * in flight can overshoot the limit slightly. Accepted: this is a cost
 * guardrail, not a hard quota.
 */

import { db } from "../../db";
import { aiPromptLog, aiSettings } from "@shared/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export const TOKEN_LIMIT_CODE = "AI_TOKEN_LIMIT_EXCEEDED";
export const TOKEN_LIMIT_MESSAGE =
  "Your business has reached its daily AI usage limit. Try again tomorrow.";

export interface TokenBudget {
  allowed: boolean;
  used: number;
  limit: number | null; // null = unlimited
}

/** The configured global daily limit; null/0 stored means unlimited (null). */
export async function getDailyTokenLimit(): Promise<number | null> {
  const [row] = await db.select().from(aiSettings).limit(1);
  const limit = row?.dailyTokenLimit ?? null;
  return limit && limit > 0 ? limit : null;
}

/** Tokens (input+output) this business has burned since UTC midnight. */
export async function getTokensUsedToday(businessId: string): Promise<number> {
  const [row] = await db
    .select({
      used: sql<number>`coalesce(sum(coalesce(${aiPromptLog.inputTokens}, 0) + coalesce(${aiPromptLog.outputTokens}, 0)), 0)::int`,
    })
    .from(aiPromptLog)
    .where(
      and(
        eq(aiPromptLog.businessId, businessId),
        gte(aiPromptLog.createdAt, sql`date_trunc('day', now())`),
      ),
    );
  return row?.used ?? 0;
}

export async function checkAiTokenBudget(scope: {
  role: string;
  businessId?: string;
}): Promise<TokenBudget> {
  if (scope.role === "sdp_internal" || !scope.businessId) {
    return { allowed: true, used: 0, limit: null };
  }
  try {
    const limit = await getDailyTokenLimit();
    if (limit === null) return { allowed: true, used: 0, limit: null };
    const used = await getTokensUsedToday(scope.businessId);
    return { allowed: used < limit, used, limit };
  } catch (err) {
    // Fail OPEN: a broken budget check must not take every AI feature down.
    console.error("[ai/usage] budget check failed:", (err as Error)?.message ?? String(err));
    return { allowed: true, used: 0, limit: null };
  }
}
