/**
 * Per-currency amount list. Money is never summed across currencies —
 * each currency gets its own row.
 */

import type { CurrencyAmount } from "@shared/dashboard";
import { formatMoney } from "./use-dashboard-summary";
import { EmptyState } from "./empty-state";
import { Receipt } from "lucide-react";

interface CurrencyAmountsProps {
  amounts: CurrencyAmount[];
  countNoun?: string; // e.g. "invoice"
  emptyMessage?: string;
}

export function CurrencyAmounts({ amounts, countNoun = "invoice", emptyMessage = "Nothing outstanding" }: CurrencyAmountsProps) {
  if (amounts.length === 0) {
    return <EmptyState icon={Receipt} message={emptyMessage} />;
  }

  return (
    <ul className="space-y-2.5">
      {amounts.map(a => (
        <li key={a.currency} className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums leading-tight">
              {formatMoney(a.total, a.currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {a.count} {countNoun}{a.count === 1 ? "" : "s"} · {a.currency}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
