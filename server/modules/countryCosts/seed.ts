/**
 * Seeding of `country_cost_items` from shared/countryCostSeed.ts: at boot for
 * every active DB country that has no rows yet, and on "Restore defaults".
 */
import { storage } from "../../storage";
import { canonicaliseCountry } from "@shared/countryEmploymentData";
import { seedItemsFor } from "@shared/countryCostSeed";
import type { Country } from "@shared/schema";
import { repository as defaultRepository, type CountryCostsRepository, type NewCountryCostItemRow } from "./repository";

export function canonicalForCountry(country: Pick<Country, "id" | "code" | "name">): string | null {
  return canonicaliseCountry(country.code) ?? canonicaliseCountry(country.name) ?? canonicaliseCountry(country.id) ?? null;
}

/** The seed rows for a DB country (empty when the seed has nothing for it). */
export function seedRowsForCountry(country: Pick<Country, "id" | "code" | "name">, userId: string | null = null): NewCountryCostItemRow[] {
  return seedItemsFor(canonicalForCountry(country)).map((item, idx) => ({
    countryId: country.id,
    stateProvince: item.stateProvince ?? null,
    itemKey: item.key,
    name: item.name,
    description: item.description,
    appliesTo: [...item.appliesTo],
    calcType: item.calcType,
    value: String(item.value),
    capAmount: item.capAmount != null ? String(item.capAmount) : null,
    sortOrder: idx,
    isActive: true,
    updatedByUserId: userId,
  }));
}

export interface SeedDeps {
  repo: CountryCostsRepository;
  getCountries: () => Promise<Country[]>;
}

/**
 * Insert the seed for every active country with zero rows. Idempotent per
 * country; never touches a country that already has rows (edited or not).
 */
export async function ensureCountryCostDefaults(deps?: Partial<SeedDeps>): Promise<{ seeded: string[]; skipped: string[] }> {
  const repo = deps?.repo ?? defaultRepository;
  const getCountries = deps?.getCountries ?? (() => storage.getAllCountries());
  const seeded: string[] = [];
  const skipped: string[] = [];
  const countries = (await getCountries()).filter((c) => c.isActive !== false);
  for (const country of countries) {
    const existing = await repo.countForCountry(country.id);
    if (existing > 0) continue;
    const rows = seedRowsForCountry(country);
    if (rows.length === 0) {
      skipped.push(country.id);
      continue;
    }
    await repo.insertMany(rows);
    seeded.push(country.id);
  }
  if (seeded.length) console.log(`[country-costs] seeded cost items for ${seeded.join(", ")}`);
  if (skipped.length) console.log(`[country-costs] no seed data for ${skipped.join(", ")} (add items in Cost Settings)`);
  return { seeded, skipped };
}
