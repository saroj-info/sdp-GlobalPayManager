/**
 * A money figure in the quote's local currency with the comparison-currency
 * equivalent under it (one line when the quote has no comparison currency).
 * Every amount on the Quotes editor (inputs side AND preview) renders through
 * this so the two currencies always appear together.
 */
import { cn } from "@/lib/utils";
import { fmtQuoteMoney } from "@shared/quotes";

interface MoneyPairProps {
  local: number;
  /** Amount in the comparison currency; null / undefined = no second line. */
  comparison?: number | null;
  currency: string;
  comparisonCurrency?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  align?: "left" | "right";
  /** Greyed and struck through (a line that does not apply). */
  muted?: boolean;
  className?: string;
  "data-testid"?: string;
}

const SIZES: Record<NonNullable<MoneyPairProps["size"]>, [string, string]> = {
  xs: ["text-xs", "text-[11px]"],
  sm: ["text-sm", "text-[11px]"],
  md: ["text-base", "text-xs"],
  lg: ["text-xl", "text-sm"],
};

export function MoneyPair({ local, comparison, currency, comparisonCurrency, size = "sm", align = "right", muted = false, className, ...rest }: MoneyPairProps) {
  const [localCls, cmpCls] = SIZES[size];
  const showComparison = comparison != null && !!comparisonCurrency;
  return (
    <div
      className={cn(
        "flex flex-col leading-tight",
        align === "right" ? "items-end text-right" : "items-start text-left",
        muted && "opacity-50 line-through",
        className,
      )}
      data-testid={rest["data-testid"]}
    >
      <span className={cn(localCls, "whitespace-nowrap font-medium tabular-nums text-secondary-900")}>{fmtQuoteMoney(local, currency)}</span>
      {showComparison && (
        <span className={cn(cmpCls, "whitespace-nowrap tabular-nums text-secondary-500")} data-testid="money-comparison">
          {fmtQuoteMoney(comparison as number, comparisonCurrency as string)}
        </span>
      )}
    </div>
  );
}
