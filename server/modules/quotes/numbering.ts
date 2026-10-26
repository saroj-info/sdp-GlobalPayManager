/** Quote numbers: Q-<year>-<4-digit sequence>, restarting each year. */
export function formatQuoteNumber(year: number, seq: number): string {
  return `Q-${year}-${String(seq).padStart(4, "0")}`;
}

/** Postgres advisory lock key shared by every allocation (see repository.insert). */
export const QUOTE_NUMBER_LOCK_KEY = "quote_number";
