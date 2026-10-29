/**
 * Country cost items — the ONE vocabulary for statutory / employer cost items
 * (country-wide and per state) maintained by SDP on /platform-config → "Cost
 * Settings" (table `country_cost_items`). Read by the quote engine
 * (shared/quotes.ts), the AI country tools, the contract wizard's country panel
 * and the /resources calculator. Pure: no DB, no React.
 *
 * `appliesTo` says which engagement categories an item is seeded into on a
 * quote (the user can still untick it there). State items (`stateProvince`
 * set) are added only when that state is picked.
 */
import { z } from "zod";

export const COST_CALC_TYPES = ["percent", "percent_with_cap", "flat"] as const;
export type CostCalcType = (typeof COST_CALC_TYPES)[number];
export const COST_CALC_TYPE_LABELS: Record<CostCalcType, string> = {
  percent: "% of pay",
  percent_with_cap: "% up to cap",
  flat: "Flat per year",
};

/** Same values as QUOTE_ENGAGEMENT_CATEGORIES in shared/quotes.ts (kept here to avoid a circular import). */
export const COST_APPLIES_TO = ["employment", "contractor_standard", "contractor_of_record"] as const;
export type CostAppliesTo = (typeof COST_APPLIES_TO)[number];
export const COST_APPLIES_TO_SHORT_LABELS: Record<CostAppliesTo, string> = {
  employment: "Employment",
  contractor_standard: "Standard contractor",
  contractor_of_record: "Contractor of Record",
};

export interface CountryCostItem {
  id: string;
  countryId: string;
  /** null = country-wide; otherwise the state / province the item belongs to. */
  stateProvince: string | null;
  /** Stable key (`super`, `nsw_payroll_tax`, `custom_ab12`) — the seed's id or a generated one. */
  itemKey: string;
  name: string;
  /** Full text shown under the name on the quote, the preview and the PDF. */
  description: string;
  appliesTo: CostAppliesTo[];
  calcType: CostCalcType;
  /** Percent for the percent types; the annual local amount for `flat`. */
  value: number;
  /** Annual wage cap in the local currency (`percent_with_cap`). */
  capAmount: number | null;
  sortOrder: number;
  isActive: boolean;
}

export type CostCalcInput = { calcType: CostCalcType | string; value: number; capAmount?: number | null };

/** The one copy of the maths: percent of the base, percent of min(base, cap), or a flat annual amount. */
export function calcCostAmount(line: CostCalcInput, base: number): { amount: number; effectiveBase: number } {
  const b = Number.isFinite(base) ? base : 0;
  const pct = (amount: number, percent: number) => (amount * (Number.isFinite(percent) ? percent : 0)) / 100;
  switch (line.calcType) {
    case "percent_with_cap": {
      const cap = line.capAmount ?? null;
      const effectiveBase = cap && cap > 0 ? Math.min(b, cap) : b;
      return { amount: pct(effectiveBase, line.value), effectiveBase };
    }
    case "flat":
      return { amount: Number.isFinite(line.value) ? line.value : 0, effectiveBase: b };
    case "percent":
    default:
      return { amount: pct(b, line.value), effectiveBase: b };
  }
}

function sameState(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/**
 * Items that apply to one engagement category in one state: active, `appliesTo`
 * includes the category, and country-wide or matching the state. Country-wide
 * items come first, then the state's, each in `sortOrder`.
 */
export function costItemsFor<T extends Pick<CountryCostItem, "stateProvince" | "appliesTo" | "isActive" | "sortOrder">>(
  items: T[],
  opts: { category: string; jurisdiction?: string | null },
): T[] {
  const jurisdiction = opts.jurisdiction?.trim() || null;
  const bySort = (a: T, b: T) => a.sortOrder - b.sortOrder;
  const active = items.filter((i) => i.isActive !== false && (i.appliesTo as readonly string[]).includes(opts.category));
  const countryWide = active.filter((i) => !i.stateProvince).sort(bySort);
  const state = jurisdiction ? active.filter((i) => i.stateProvince && sameState(i.stateProvince, jurisdiction)).sort(bySort) : [];
  return [...countryWide, ...state];
}

/** Distinct states of the active items, in the order they are first listed (so the seed's first state stays first). */
export function jurisdictionsOf(items: Array<Pick<CountryCostItem, "stateProvince" | "isActive" | "sortOrder">>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const s = item.stateProvince?.trim();
    if (!s || item.isActive === false) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export interface CostBreakdownLine {
  id: string;
  itemKey: string;
  name: string;
  description: string;
  stateProvince: string | null;
  calcType: CostCalcType;
  value: number;
  capAmount: number | null;
  amount: number;
}

export interface CostBreakdown {
  base: number;
  lines: CostBreakdownLine[];
  onCostTotal: number;
  totalEmployerCost: number;
  onCostPct: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Employer cost of a gross annual pay against a (pre-filtered) item list — the calculator and the AI estimate use it. */
export function computeCostBreakdown(items: CountryCostItem[], base: number): CostBreakdown {
  const b = Number.isFinite(base) ? base : 0;
  const lines = items.map((item) => ({
    id: item.id,
    itemKey: item.itemKey,
    name: item.name,
    description: item.description,
    stateProvince: item.stateProvince,
    calcType: item.calcType,
    value: item.value,
    capAmount: item.capAmount,
    amount: round2(calcCostAmount(item, b).amount),
  }));
  const onCostTotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  return {
    base: round2(b),
    lines,
    onCostTotal,
    totalEmployerCost: round2(b + onCostTotal),
    onCostPct: b > 0 ? round2((onCostTotal / b) * 100) : 0,
  };
}

export function newCostItemKey(): string {
  return `custom_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Zod (admin save) ────────────────────────────────────────────────────────

export const countryCostItemSchema = z.object({
  id: z.string().max(80).nullable().optional(),
  stateProvince: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  itemKey: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9_-]+$/, "Letters, digits, _ and - only"),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  appliesTo: z.array(z.enum(COST_APPLIES_TO)).min(1, "Pick at least one engagement category").max(3),
  calcType: z.enum(COST_CALC_TYPES),
  value: z.number().min(0).max(1e12),
  capAmount: z.number().min(0).max(1e12).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean().default(true),
});

export const saveCountryCostItemsSchema = z.object({
  items: z.array(countryCostItemSchema).max(80),
});

export type SaveCountryCostItemsInput = z.infer<typeof saveCountryCostItemsSchema>;

// ─── Wire types ──────────────────────────────────────────────────────────────

export interface CountryCostsResponse {
  countryId: string;
  items: CountryCostItem[];
}

export interface AllCountryCostsResponse {
  items: CountryCostItem[];
}
