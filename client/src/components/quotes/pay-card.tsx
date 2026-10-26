/**
 * Card "Pay and employer costs": pay basis and rate (local + USD), the exchange
 * rate, the gross pay strip, the payroll-tax threshold switch and the
 * statutory / employer cost items.
 */
import { Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  QUOTE_RATE_TYPES,
  QUOTE_RATE_TYPE_SHORT_LABELS,
  fmtQuoteMoney,
  type FxRatesResponse,
  type QuoteCostLine,
  type QuoteRateType,
  type QuoteResult,
} from "@shared/quotes";
import { CostLinesTable } from "./cost-lines-table";
import { MoneyPair } from "./money";
import { draftFx, num, type QuoteDraft } from "./quote-draft";

interface PayCardProps {
  draft: QuoteDraft;
  result: QuoteResult;
  fx: FxRatesResponse | null | undefined;
  fxLoading: boolean;
  liveRateAvailable: boolean;
  onChange: (patch: Partial<QuoteDraft>) => void;
  onUseLiveRate: () => void;
  onCostLinesChange: (lines: QuoteCostLine[]) => void;
  costLinesTouched: boolean;
  onReloadCostDefaults: () => void;
}

function fmtAsOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PayCard({
  draft,
  result,
  fx,
  fxLoading,
  liveRateAvailable,
  onChange,
  onUseLiveRate,
  onCostLinesChange,
  costLinesTouched,
  onReloadCostDefaults,
}: PayCardProps) {
  const currency = draft.currency || "USD";
  const fxValue = draftFx(draft);
  const rateUsd = fxValue > 0 ? num(draft.rate) / fxValue : 0;
  const fieldLabel = "mb-1 block text-xs font-medium text-secondary-600";

  return (
    <Card data-testid="quote-pay-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-primary-600" /> Pay and employer costs
        </CardTitle>
        <CardDescription>Gross pay in {currency}, shown with its USD equivalent at the quote's exchange rate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="quote-rate-type" className={fieldLabel}>Pay basis</Label>
            <Select value={draft.rateType} onValueChange={(v) => onChange({ rateType: v as QuoteRateType })}>
              <SelectTrigger id="quote-rate-type" className="h-9" data-testid="select-quote-rate-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_RATE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{QUOTE_RATE_TYPE_SHORT_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 md:col-span-3">
            <Label htmlFor="quote-rate" className={fieldLabel}>
              {draft.rateType === "hourly" ? "Rate per hour" : draft.rateType === "daily" ? "Rate per day" : "Annual salary"}
            </Label>
            <div className="relative">
              <Input
                id="quote-rate"
                type="number"
                step="0.01"
                min="0"
                className="h-9 pr-12 text-right tabular-nums"
                value={draft.rate}
                onChange={(e) => onChange({ rate: e.target.value })}
                placeholder="0.00"
                data-testid="input-quote-rate"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-500">{currency}</span>
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <Label className={fieldLabel}>≈ USD</Label>
            <div className="flex h-9 items-center justify-end rounded-md border border-secondary-200 bg-secondary-50 px-3 text-sm tabular-nums text-secondary-900" data-testid="quote-rate-usd">
              {fmtQuoteMoney(rateUsd, "USD")}
            </div>
          </div>
          {draft.rateType !== "annual" && (
            <>
              <div className="col-span-3 md:col-span-2">
                <Label htmlFor="quote-units" className={fieldLabel}>{draft.rateType === "hourly" ? "Hours / week" : "Days / week"}</Label>
                <Input
                  id="quote-units"
                  type="number"
                  step={draft.rateType === "hourly" ? "0.5" : "1"}
                  min="1"
                  className="h-9 text-right tabular-nums"
                  value={draft.rateType === "hourly" ? draft.hoursPerWeek : draft.daysPerWeek}
                  onChange={(e) => onChange(draft.rateType === "hourly" ? { hoursPerWeek: e.target.value } : { daysPerWeek: e.target.value })}
                  data-testid="input-quote-units-per-week"
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Label htmlFor="quote-weeks" className={fieldLabel}>Weeks / year</Label>
                <Input
                  id="quote-weeks"
                  type="number"
                  step="1"
                  min="1"
                  max="53"
                  className="h-9 text-right tabular-nums"
                  value={draft.weeksPerYear}
                  onChange={(e) => onChange({ weeksPerYear: e.target.value })}
                  data-testid="input-quote-weeks-per-year"
                />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-12 items-end gap-2 rounded-md border border-secondary-200 p-3">
          <div className="col-span-12 md:col-span-4">
            <Label htmlFor="quote-fx" className={fieldLabel}>{currency} per 1 USD</Label>
            <div className="relative">
              <Input
                id="quote-fx"
                type="number"
                step="0.0001"
                min="0"
                className="h-9 pr-12 text-right tabular-nums"
                value={draft.fxLocalPerUsd}
                onChange={(e) => onChange({ fxLocalPerUsd: e.target.value, fxRateSource: "manual", fxRateAsOf: new Date().toISOString() })}
                placeholder="0.0000"
                data-testid="input-quote-fx"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-500">{currency}</span>
            </div>
          </div>
          <div className="col-span-8 md:col-span-5">
            <p className="flex h-9 items-center text-xs text-secondary-600" data-testid="quote-fx-caption">
              {draft.fxRateSource === "manual"
                ? "Manual rate."
                : `${draft.fxRateSource}${draft.fxRateAsOf ? ` · ${fmtAsOf(draft.fxRateAsOf)}` : ""}${fx?.stale ? " · last known, provider unreachable" : ""}`}
              {!fxLoading && !liveRateAvailable && (
                <span className="ml-1 text-amber-700">Live rate unavailable — enter the rate.</span>
              )}
            </p>
          </div>
          <div className="col-span-4 md:col-span-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onUseLiveRate}
              disabled={fxLoading || !liveRateAvailable}
              data-testid="button-use-live-rate"
            >
              <RefreshCw className={cn("mr-1 h-3.5 w-3.5", fxLoading && "animate-spin")} /> Use today's rate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-md bg-secondary-50 p-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-secondary-600">Annual gross pay</p>
            <MoneyPair size="md" align="left" local={result.annualPay.local} usd={result.annualPay.usd} currency={currency} data-testid="quote-annual-pay" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-secondary-600">Monthly gross pay</p>
            <MoneyPair size="md" align="left" local={result.monthlyPay.local} usd={result.monthlyPay.usd} currency={currency} data-testid="quote-monthly-pay" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-secondary-200 px-3 py-2">
          <div>
            <Label htmlFor="quote-above-threshold" className="text-sm font-medium text-secondary-900">Employer is above the payroll-tax threshold</Label>
            <p className="mt-0.5 text-xs text-secondary-500">
              Payroll-tax thresholds apply to an employer's total wages, not to one worker. When on, "% above threshold" items are applied to the whole wage.
            </p>
          </div>
          <Switch
            id="quote-above-threshold"
            checked={draft.aboveThreshold}
            onCheckedChange={(v) => onChange({ aboveThreshold: v })}
            data-testid="switch-quote-above-threshold"
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-secondary-900">Statutory and employer cost items</h4>
            {costLinesTouched && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onReloadCostDefaults} data-testid="button-reload-cost-defaults">
                Reload defaults for this country and category
              </Button>
            )}
          </div>
          <CostLinesTable
            lines={draft.costLines}
            computed={result.costLines}
            currency={currency}
            aboveThreshold={draft.aboveThreshold}
            subtotal={{ local: result.totals.local.annual.statutory, usd: result.totals.usd.annual.statutory }}
            onChange={onCostLinesChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
