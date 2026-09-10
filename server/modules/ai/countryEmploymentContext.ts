/**
 * Curated country employment context, shared by two AI surfaces:
 *   - the AI search tool `getCountryEmploymentRules` (search/tools.ts)
 *   - the country-intel Q&A service (countryIntel/service.ts), which injects
 *     it as the grounding system message.
 *
 * Statics come from @shared/countryEmploymentData; DB jurisdiction rows are
 * cross-referenced best-effort so answers can quote the exact rows admins
 * see under /country-management. Never throws.
 */

import { storage } from "../../storage";
import {
  COUNTRY_LIST,
  COUNTRY_CODE_BY_NAME,
  COUNTRY_EMPLOYMENT_NOTES,
  DEFAULT_EMPLOYER_ONCOSTS,
  DEFAULT_CONTRACTOR_ONCOSTS,
  DEFAULT_JURISDICTIONS_OVERLAY,
  COUNTRY_CURRENCIES,
  canonicaliseCountry,
  type OnCostItem,
} from "@shared/countryEmploymentData";

export interface CountryEmploymentContext {
  country: {
    name: string;
    code: string | null;
    currency: { code: string; symbol: string } | null;
  };
  narrative: string | null;
  employerOnCosts: OnCostItem[];
  contractorOnCosts: OnCostItem[];
  availableJurisdictions: string[];
  jurisdictionRequested: string | null;
  jurisdictionOverlayRows: OnCostItem[] | null;
  dbJurisdictionRows: Array<Record<string, any>>;
  sourceNote: string;
}

export interface CountryContextError {
  error: "unknown_country";
  input: string | null;
  supported: readonly string[];
}

export async function buildCountryEmploymentContext(params: {
  country: string;
  jurisdiction?: string;
}): Promise<CountryEmploymentContext | CountryContextError> {
  const canonical = canonicaliseCountry(params.country);
  if (!canonical) {
    return {
      error: "unknown_country",
      input: params.country || null,
      supported: COUNTRY_LIST,
    };
  }
  const jurisdictionInput = params.jurisdiction ? String(params.jurisdiction).trim() : "";
  const jurisdictionRows = jurisdictionInput
    ? DEFAULT_JURISDICTIONS_OVERLAY[canonical]?.[jurisdictionInput] ?? null
    : null;

  // Cross-reference the DB jurisdictions table so answers can quote the
  // exact rows admins see under /country-management too. Best-effort.
  let dbJurisdictionRows: Array<Record<string, any>> = [];
  try {
    const countries = await storage.getCountries().catch(() => []);
    const iso = COUNTRY_CODE_BY_NAME[canonical];
    const match = countries.find(
      (c: any) =>
        (iso && String(c.code ?? "").toUpperCase() === iso) ||
        String(c.name ?? "").toLowerCase() === canonical.toLowerCase(),
    );
    if (match?.id) {
      const rows = await storage.getJurisdictionsByCountry(match.id).catch(() => []);
      dbJurisdictionRows = (rows ?? []).map((r: any) => ({
        stateProvince: r.stateProvince,
        name: r.name,
        calculationType: r.calculationType,
        value: r.value,
        capAmount: r.capAmount,
        thresholdAmount: r.thresholdAmount,
        note: r.note,
      }));
    }
  } catch {
    // ignore
  }

  return {
    country: {
      name: canonical,
      code: COUNTRY_CODE_BY_NAME[canonical] ?? null,
      currency: COUNTRY_CURRENCIES[canonical] ?? null,
    },
    narrative: COUNTRY_EMPLOYMENT_NOTES[canonical] ?? null,
    employerOnCosts: DEFAULT_EMPLOYER_ONCOSTS[canonical] ?? [],
    contractorOnCosts: DEFAULT_CONTRACTOR_ONCOSTS[canonical] ?? [],
    availableJurisdictions: Object.keys(DEFAULT_JURISDICTIONS_OVERLAY[canonical] ?? {}),
    jurisdictionRequested: jurisdictionInput || null,
    jurisdictionOverlayRows: jurisdictionRows,
    dbJurisdictionRows,
    sourceNote:
      "SDP-maintained defaults from /resources (Employment Cost Calculator). Illustrative — validate against current statutory rules.",
  };
}
