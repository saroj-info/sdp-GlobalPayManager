/**
 * Curated country employment context, shared by two AI surfaces:
 *   - the AI search tool `getCountryEmploymentRules` (search/tools.ts)
 *   - the country-intel Q&A service (countryIntel/service.ts), which injects
 *     it as the grounding system message.
 *
 * The statutory / employer cost items come from the `country_cost_items` table
 * (Cost Settings on /platform-config), the same rows the quote editor seeds
 * from; the prose narrative and currency symbols are the statics in
 * @shared/countryEmploymentData. Never throws.
 */

import { storage } from "../../storage";
import { countryCostsRepository, toCostItem } from "../countryCosts";
import {
  COUNTRY_CODE_BY_NAME,
  COUNTRY_EMPLOYMENT_NOTES,
  COUNTRY_CURRENCIES,
  canonicaliseCountry,
} from "@shared/countryEmploymentData";
import { jurisdictionsOf, type CountryCostItem } from "@shared/countryCosts";

export interface CountryEmploymentContext {
  country: {
    id: string;
    name: string;
    code: string | null;
    currency: { code: string; symbol: string } | null;
  };
  narrative: string | null;
  /** Every active Cost Settings item of the country: country-wide (`stateProvince` null) and per state, with descriptions and `appliesTo`. */
  costItems: CountryCostItem[];
  availableJurisdictions: string[];
  jurisdictionRequested: string | null;
  /** The requested state's items, or null when no state was asked for / matched. */
  jurisdictionItems: CountryCostItem[] | null;
  sourceNote: string;
}

export interface CountryContextError {
  error: "unknown_country";
  input: string | null;
  supported: readonly string[];
}

export const COUNTRY_COSTS_SOURCE_NOTE =
  "SDP Cost Settings (Templates → Cost Settings) — the same items the Quotes page seeds. Planning figures; validate against current statutory rules.";

/** Find the DB country a free-text name / ISO code / id refers to. */
export async function resolveDbCountry(input: string): Promise<{ row: any | null; supported: string[] }> {
  const countries: any[] = await storage.getAllCountries().catch(() => []);
  const supported = countries.filter((c) => c.isActive !== false).map((c) => String(c.name));
  const raw = String(input ?? "").trim();
  if (!raw) return { row: null, supported };
  const lower = raw.toLowerCase();
  const canonical = canonicaliseCountry(raw);
  const iso = canonical ? COUNTRY_CODE_BY_NAME[canonical] ?? null : null;
  const row =
    countries.find((c) => String(c.id ?? "").toLowerCase() === lower) ??
    countries.find((c) => String(c.code ?? "").toUpperCase() === raw.toUpperCase()) ??
    countries.find((c) => String(c.name ?? "").toLowerCase() === lower) ??
    (iso ? countries.find((c) => String(c.code ?? "").toUpperCase() === iso) : undefined) ??
    (canonical ? countries.find((c) => String(c.name ?? "").toLowerCase() === canonical.toLowerCase()) : undefined) ??
    null;
  return { row, supported };
}

export async function buildCountryEmploymentContext(params: {
  country: string;
  jurisdiction?: string;
}): Promise<CountryEmploymentContext | CountryContextError> {
  const { row, supported } = await resolveDbCountry(params.country);
  if (!row) {
    return { error: "unknown_country", input: params.country || null, supported };
  }
  const canonical = canonicaliseCountry(row.code) ?? canonicaliseCountry(row.name) ?? null;

  let costItems: CountryCostItem[] = [];
  try {
    costItems = (await countryCostsRepository.listForCountry(row.id, false)).map(toCostItem);
  } catch {
    // table not pushed yet or DB hiccup — answer without items rather than throw
  }
  const availableJurisdictions = jurisdictionsOf(costItems);
  const jurisdictionInput = params.jurisdiction ? String(params.jurisdiction).trim() : "";
  const matchedJurisdiction = jurisdictionInput
    ? availableJurisdictions.find((j) => j.toLowerCase() === jurisdictionInput.toLowerCase()) ?? null
    : null;
  const jurisdictionItems = matchedJurisdiction
    ? costItems.filter((i) => (i.stateProvince ?? "").toLowerCase() === matchedJurisdiction.toLowerCase())
    : null;

  const currency =
    (canonical && COUNTRY_CURRENCIES[canonical]) ||
    (row.currency ? { code: String(row.currency), symbol: String(row.currency) } : null);

  return {
    country: {
      id: String(row.id),
      name: String(row.name),
      code: row.code ? String(row.code) : canonical ? COUNTRY_CODE_BY_NAME[canonical] ?? null : null,
      currency,
    },
    narrative: canonical ? COUNTRY_EMPLOYMENT_NOTES[canonical] ?? null : null,
    costItems,
    availableJurisdictions,
    jurisdictionRequested: jurisdictionInput || null,
    jurisdictionItems,
    sourceNote: COUNTRY_COSTS_SOURCE_NOTE,
  };
}
