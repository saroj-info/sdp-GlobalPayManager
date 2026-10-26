/**
 * USD exchange rates for quotes. Live rates come from open.er-api.com (free,
 * no key, updated daily); every successful fetch is memoised for a day and
 * written to `fx_rate_snapshots`, so after a restart or during an outage the
 * last snapshot is served flagged `stale: true`. With no snapshot at all the
 * caller gets 503 FX_UNAVAILABLE and the quote editor falls back to a manual rate.
 */
import { desc } from "drizzle-orm";
import { db } from "../../db";
import { fxRateSnapshots } from "@shared/schema";
import type { FxRatesResponse } from "@shared/quotes";

export const FX_API_URL = "https://open.er-api.com/v6/latest/USD";
export const FX_SOURCE = "open.er-api.com";
export const FX_TTL_MS = 24 * 60 * 60 * 1000;
export const FX_STALE_RETRY_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

export type FxResult =
  | { ok: true; data: FxRatesResponse }
  | { ok: false; status: number; message: string; code: string };

export interface FxLive {
  rates: Record<string, number>;
  asOf: string | null;
}

export interface FxSnapshot {
  rates: Record<string, number>;
  providerAsOf: Date | null;
  fetchedAt: Date;
  source: string;
}

export interface FxDeps {
  fetchLive: () => Promise<FxLive>;
  latestSnapshot: () => Promise<FxSnapshot | undefined>;
  saveSnapshot: (input: { rates: Record<string, number>; providerAsOf: Date | null; source: string }) => Promise<void>;
  now: () => number;
  ttlMs: number;
  staleRetryMs: number;
}

export async function fetchLiveFromApi(): Promise<FxLive> {
  const res = await fetch(FX_API_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: any = await res.json();
  if (!body || body.result !== "success" || typeof body.rates !== "object" || body.rates === null) {
    throw new Error("unexpected payload");
  }
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(body.rates)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) rates[code.toUpperCase()] = value;
  }
  if (!rates.USD) rates.USD = 1;
  const asOf = typeof body.time_last_update_utc === "string" ? body.time_last_update_utc : null;
  return { rates, asOf };
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function createFxService(deps: FxDeps) {
  let memo: { data: FxRatesResponse; expiresAt: number } | null = null;
  let inflight: Promise<FxResult> | null = null;

  async function refresh(): Promise<FxResult> {
    try {
      const live = await deps.fetchLive();
      const providerAsOf = parseDate(live.asOf);
      try {
        await deps.saveSnapshot({ rates: live.rates, providerAsOf, source: FX_SOURCE });
      } catch (err: any) {
        console.warn("[fx] snapshot write failed:", err?.message ?? String(err));
      }
      const data: FxRatesResponse = {
        base: "USD",
        rates: live.rates,
        asOf: providerAsOf ? providerAsOf.toISOString() : null,
        source: FX_SOURCE,
        stale: false,
      };
      memo = { data, expiresAt: deps.now() + deps.ttlMs };
      return { ok: true, data };
    } catch (err: any) {
      console.warn("[fx] live fetch failed:", err?.message ?? String(err));
      let snap: FxSnapshot | undefined;
      try {
        snap = await deps.latestSnapshot();
      } catch (readErr: any) {
        console.warn("[fx] snapshot read failed:", readErr?.message ?? String(readErr));
      }
      if (snap) {
        const data: FxRatesResponse = {
          base: "USD",
          rates: snap.rates,
          asOf: (snap.providerAsOf ?? snap.fetchedAt).toISOString(),
          source: snap.source,
          stale: true,
        };
        memo = { data, expiresAt: deps.now() + deps.staleRetryMs };
        return { ok: true, data };
      }
      return {
        ok: false,
        status: 503,
        code: "FX_UNAVAILABLE",
        message: "Exchange rates are unavailable right now. Enter the rate manually.",
      };
    }
  }

  return {
    async getUsdRates(): Promise<FxResult> {
      if (memo && deps.now() < memo.expiresAt) return { ok: true, data: memo.data };
      if (!inflight) {
        inflight = refresh().finally(() => {
          inflight = null;
        });
      }
      return inflight;
    },
    /** Local units per 1 USD for a currency code, or null when the provider has no rate. */
    rateFor(data: FxRatesResponse, currency: string): number | null {
      const v = data.rates[(currency || "").toUpperCase()];
      return typeof v === "number" && v > 0 ? v : null;
    },
    reset() {
      memo = null;
      inflight = null;
    },
  };
}

export type FxService = ReturnType<typeof createFxService>;

export const fxService: FxService = createFxService({
  fetchLive: fetchLiveFromApi,
  async latestSnapshot() {
    const [row] = await db.select().from(fxRateSnapshots).orderBy(desc(fxRateSnapshots.fetchedAt)).limit(1);
    if (!row) return undefined;
    return { rates: row.rates, providerAsOf: row.providerAsOf, fetchedAt: row.fetchedAt, source: row.source };
  },
  async saveSnapshot(input) {
    await db.insert(fxRateSnapshots).values({ base: "USD", rates: input.rates, providerAsOf: input.providerAsOf, source: input.source });
  },
  now: () => Date.now(),
  ttlMs: FX_TTL_MS,
  staleRetryMs: FX_STALE_RETRY_MS,
});
