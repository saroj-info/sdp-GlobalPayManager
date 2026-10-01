/**
 * Contract tier-discount helpers — pure functions only (no DB, no Express).
 *
 * A tier discount is a step like "after 3 months of the contract → 10% off
 * the host-client invoice". Tiers ride the contract create/edit payload as
 * `tierDiscounts: [{ monthsAfterStart, discountPercent }]` (the wizard sends
 * strings); these helpers validate them and enforce the edit-time rule that
 * new or changed tiers must take effect on a future date.
 */

export interface NormalizedTier {
  monthsAfterStart: number;
  discountPercent: number;
}

/** Native setMonth month-add. Jan-31 + 1mo overflows to Mar 2/3 — accepted;
 *  the wizard's effective-date preview uses the same semantics. */
export function addMonths(start: Date, months: number): Date {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Parse + validate raw tierDiscounts rows. Error strings are user-facing. */
export function normalizeTierDiscounts(raw: unknown):
  | { ok: true; tiers: NormalizedTier[] }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, tiers: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "tierDiscounts must be an array" };
  const tiers: NormalizedTier[] = [];
  const seen = new Set<number>();
  for (const row of raw) {
    const months = Number((row as any)?.monthsAfterStart);
    const pct = Number((row as any)?.discountPercent);
    if (!Number.isInteger(months) || months < 1) {
      return { ok: false, error: "Each tier discount needs a whole number of months (1 or more)." };
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return { ok: false, error: "Each tier discount percent must be greater than 0 and at most 100." };
    }
    if (seen.has(months)) {
      return { ok: false, error: `Duplicate tier at ${months} months — each tier must use a different month.` };
    }
    seen.add(months);
    tiers.push({ monthsAfterStart: months, discountPercent: pct });
  }
  tiers.sort((a, b) => a.monthsAfterStart - b.monthsAfterStart);
  return { ok: true, tiers };
}

/**
 * Edit rule: any incoming tier that does NOT match an existing row (matched
 * on monthsAfterStart + discountPercent, number-normalized so a hydrated
 * "10" matches a stored "10.00") must have a strictly-future effective date.
 * Returns the first violator, or null when the update is acceptable.
 * Unchanged tiers are kept even if their date has passed; removals are fine.
 */
export function findPastEffectiveTier(args: {
  incoming: NormalizedTier[];
  existing: Array<{ monthsAfterStart: number; discountPercent: string | number }>;
  startDate: Date;
  now?: Date;
}): NormalizedTier | null {
  const now = args.now ?? new Date();
  const existingKeys = new Set(
    args.existing.map(t => `${Number(t.monthsAfterStart)}|${Number(t.discountPercent)}`),
  );
  for (const t of args.incoming) {
    if (existingKeys.has(`${t.monthsAfterStart}|${t.discountPercent}`)) continue;
    if (addMonths(args.startDate, t.monthsAfterStart) <= now) return t;
  }
  return null;
}

/** "3mo → 10%; 6mo → 15%" for the change log. Empty list → null. */
export function serializeTiers(
  tiers: Array<{ monthsAfterStart: number | string; discountPercent: number | string }>,
): string | null {
  if (!tiers.length) return null;
  return [...tiers]
    .sort((a, b) => Number(a.monthsAfterStart) - Number(b.monthsAfterStart))
    .map(t => `${Number(t.monthsAfterStart)}mo → ${Number(t.discountPercent)}%`)
    .join("; ");
}
