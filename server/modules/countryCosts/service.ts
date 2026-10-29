/**
 * Cost Settings orchestration: read the items (public for the calculator and
 * the wizard panel, every row for the admin tab), replace a country's set, and
 * restore the seed. `createCountryCostsService(deps)` keeps it testable.
 */
import { storage } from "../../storage";
import type { Country } from "@shared/schema";
import { saveCountryCostItemsSchema, type CountryCostItem } from "@shared/countryCosts";
import { repository as defaultRepository, toCostItem, type CountryCostsRepository, type NewCountryCostItemRow } from "./repository";
import { seedRowsForCountry } from "./seed";
import type { AuthUser, Result } from "./types";

export interface CountryCostsDeps {
  repo: CountryCostsRepository;
  getCountries: () => Promise<Country[]>;
}

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (status: number, code: string, message: string, extra?: Record<string, unknown>): Result<never> => ({ ok: false, status, message, code, extra });

export function createCountryCostsService(deps: CountryCostsDeps) {
  async function findCountry(countryId: string): Promise<Country | undefined> {
    const all = await deps.getCountries();
    return all.find((c) => c.id === countryId);
  }

  return {
    /** Active items of every country (public). */
    async getAll(): Promise<Result<CountryCostItem[]>> {
      return ok((await deps.repo.listActive()).map(toCostItem));
    },

    async getForCountry(countryId: string, opts: { includeInactive: boolean }): Promise<Result<{ countryId: string; items: CountryCostItem[] }>> {
      const country = await findCountry(countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const rows = await deps.repo.listForCountry(country.id, opts.includeInactive);
      return ok({ countryId: country.id, items: rows.map(toCostItem) });
    },

    /** Replace the country's whole item set (the admin tab's Save). */
    async replace(user: AuthUser, countryId: string, body: unknown): Promise<Result<{ countryId: string; items: CountryCostItem[] }>> {
      const country = await findCountry(countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const parsed = saveCountryCostItemsSchema.safeParse(body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return fail(400, "COST_ITEMS_INVALID", issues[0] ? `${issues[0].path || "items"}: ${issues[0].message}` : "Invalid cost items", { issues });
      }
      const rows: NewCountryCostItemRow[] = parsed.data.items.map((item, idx) => ({
        countryId: country.id,
        stateProvince: item.stateProvince ?? null,
        itemKey: item.itemKey,
        name: item.name,
        description: item.description ?? "",
        appliesTo: item.appliesTo,
        calcType: item.calcType,
        value: String(item.value),
        capAmount: item.calcType === "percent_with_cap" && item.capAmount != null ? String(item.capAmount) : null,
        sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : idx,
        isActive: item.isActive,
        updatedByUserId: user.id,
      }));
      const saved = await deps.repo.replaceForCountry(country.id, rows);
      console.log(`[country-costs] ${country.id}: ${saved.length} items saved by ${user.id}`);
      return ok({ countryId: country.id, items: saved.map(toCostItem) });
    },

    /** Drop the country's items and load the seed again. */
    async restoreDefaults(user: AuthUser, countryId: string): Promise<Result<{ countryId: string; items: CountryCostItem[] }>> {
      const country = await findCountry(countryId);
      if (!country) return fail(404, "COUNTRY_NOT_FOUND", "Country not found");
      const rows = seedRowsForCountry(country, user.id);
      if (rows.length === 0) return fail(409, "NO_SEED_FOR_COUNTRY", `There are no default cost items for ${country.name}; add them by hand.`);
      const saved = await deps.repo.replaceForCountry(country.id, rows);
      console.log(`[country-costs] ${country.id}: defaults restored (${saved.length} items) by ${user.id}`);
      return ok({ countryId: country.id, items: saved.map(toCostItem) });
    },
  };
}

export type CountryCostsService = ReturnType<typeof createCountryCostsService>;

export const countryCostsService: CountryCostsService = createCountryCostsService({
  repo: defaultRepository,
  getCountries: () => storage.getAllCountries(),
});
