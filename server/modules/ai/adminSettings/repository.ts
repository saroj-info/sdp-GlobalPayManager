/**
 * AI settings repository — the singleton ai_settings row plus the "today's
 * usage by business" aggregate over ai_prompt_log.
 */

import { db } from "../../../db";
import { aiPromptLog, aiSettings, businesses } from "@shared/schema";
import { eq, gte, sql } from "drizzle-orm";
import type { AiSettings } from "@shared/schema";

export async function readSettings(): Promise<AiSettings | null> {
  const [row] = await db.select().from(aiSettings).limit(1);
  return row ?? null;
}

export async function upsertSettings(
  dailyTokenLimit: number | null,
  userId: string,
): Promise<AiSettings> {
  const [row] = await db
    .insert(aiSettings)
    .values({ id: "singleton", dailyTokenLimit, updatedByUserId: userId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: aiSettings.id,
      set: { dailyTokenLimit, updatedByUserId: userId, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/**
 * Today's (UTC) usage grouped by business. Driven by the LOG rows, not by
 * enumerating all businesses — the page answers "who is using AI today and
 * how close are they", so zero-usage businesses are noise. LEFT JOIN supplies
 * names; NULL businessId groups as SDP-internal / unattributed.
 */
export async function usageToday() {
  return db
    .select({
      businessId: aiPromptLog.businessId,
      businessName: businesses.name,
      tokens: sql<number>`coalesce(sum(coalesce(${aiPromptLog.inputTokens}, 0) + coalesce(${aiPromptLog.outputTokens}, 0)), 0)::int`,
      requests: sql<number>`count(*)::int`,
    })
    .from(aiPromptLog)
    .leftJoin(businesses, eq(aiPromptLog.businessId, businesses.id))
    .where(gte(aiPromptLog.createdAt, sql`date_trunc('day', now())`))
    .groupBy(aiPromptLog.businessId, businesses.name);
}
