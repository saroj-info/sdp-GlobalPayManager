/**
 * AI settings service — validation + shaping between the HTTP layer and the
 * repository. Authorization lives entirely in the route middleware
 * (requireSdpRole), so there is no authorize.ts here.
 */

import { readSettings, upsertSettings, usageToday } from "./repository";
import type { AiSettingsPayload, AiUsageRow, SettingsResult } from "./types";

const MAX_LIMIT = 2_000_000_000;

export async function getSettings(): Promise<AiSettingsPayload> {
  const row = await readSettings();
  return {
    dailyTokenLimit: row?.dailyTokenLimit ?? null,
    updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

export async function updateSettings(raw: unknown, userId: string): Promise<SettingsResult> {
  let dailyTokenLimit: number | null;
  if (raw === null || raw === undefined || raw === "") {
    dailyTokenLimit = null;
  } else if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= MAX_LIMIT) {
    dailyTokenLimit = raw;
  } else {
    return { ok: false, status: 400, message: "dailyTokenLimit must be null or a non-negative integer" };
  }

  const row = await upsertSettings(dailyTokenLimit, userId);
  return {
    ok: true,
    data: {
      dailyTokenLimit: row.dailyTokenLimit ?? null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    },
  };
}

export async function getUsageToday(): Promise<AiUsageRow[]> {
  const rows = await usageToday();
  return rows
    .map((r) => ({
      businessId: r.businessId ?? null,
      businessName: r.businessName ?? null,
      tokens: r.tokens ?? 0,
      requests: r.requests ?? 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);
}
