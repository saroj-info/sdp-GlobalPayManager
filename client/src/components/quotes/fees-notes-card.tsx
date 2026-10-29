/**
 * Card "SDP fees and quote notes": the fee lines (seeded from the admin
 * schedule for the category × billing-agent choice), the USD rate the fixed
 * USD fees are converted at (only when the comparison rate does not cover
 * USD), and the free-text notes printed on the quote.
 */
import { Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { crossRate, type FxRatesResponse, type QuoteFeeLine, type QuoteResult } from "@shared/quotes";
import { FeeLinesTable } from "./fee-lines-table";
import { needsSeparateUsdRate, type QuoteDraft } from "./quote-draft";

interface FeesNotesCardProps {
  draft: QuoteDraft;
  result: QuoteResult;
  fx: FxRatesResponse | null | undefined;
  fxLoading: boolean;
  onChange: (patch: Partial<QuoteDraft>) => void;
  onFeeLinesChange: (lines: QuoteFeeLine[]) => void;
  feeLinesTouched: boolean;
  defaultsEmpty: boolean;
  onReloadFeeDefaults: () => void;
}

function fmtAsOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function FeesNotesCard({ draft, result, fx, fxLoading, onChange, onFeeLinesChange, feeLinesTouched, defaultsEmpty, onReloadFeeDefaults }: FeesNotesCardProps) {
  const currency = draft.currency || "USD";
  const comparisonCurrency = draft.comparisonCurrency || null;
  const hasFixedFee = draft.feeLines.some((l) => l.applies && l.lineType === "fixed_amount" && (l.amountUsd ?? 0) > 0);
  const separateUsd = hasFixedFee && needsSeparateUsdRate(draft);
  const liveUsd = fx ? crossRate(fx.rates, currency, "USD") : null;
  const feeBasis = draft.rateIncludesOnCosts ? "the all-inclusive pay" : "annual gross pay";

  return (
    <Card data-testid="quote-fees-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-primary-600" /> SDP fees and quote notes
        </CardTitle>
        <CardDescription>
          Percentage fees are a share of {feeBasis}; fixed fees are USD per month. SDP fees are always on top of the employer cost.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-secondary-900">Fee lines</h4>
            {feeLinesTouched && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onReloadFeeDefaults} data-testid="button-reload-fee-defaults">
                Reload the default fees for this engagement
              </Button>
            )}
          </div>
          {defaultsEmpty && draft.feeLines.length === 0 && (
            <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" data-testid="quote-fee-defaults-empty">
              No default SDP fees are set for this engagement category and billing choice. Add them here, or set defaults in Templates → System Settings.
            </p>
          )}
          <FeeLinesTable
            lines={draft.feeLines}
            computed={result.feeLines}
            currency={currency}
            comparisonCurrency={comparisonCurrency}
            showPaidBy={draft.isForClient}
            subtotal={{ local: result.totals.local.annual.fees, comparison: result.totals.comparison?.annual.fees ?? null }}
            onChange={onFeeLinesChange}
            emptyText="No SDP fee lines on this quote."
          />
        </div>

        {hasFixedFee && currency !== "USD" && (
          <div className="rounded-md border border-secondary-200 p-3" data-testid="quote-fee-usd-rate">
            {separateUsd ? (
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 md:col-span-4">
                  <Label htmlFor="quote-fx-usd" className="mb-1 block text-xs font-medium text-secondary-600">{currency} per 1 USD (fixed fees)</Label>
                  <div className="relative">
                    <Input
                      id="quote-fx-usd"
                      type="number"
                      step="0.0001"
                      min="0"
                      className="h-9 pr-12 text-right tabular-nums"
                      value={draft.fxLocalPerUsd}
                      onChange={(e) => onChange({ fxLocalPerUsd: e.target.value, fxRateSource: "manual", fxRateAsOf: new Date().toISOString() })}
                      placeholder="0.0000"
                      data-testid="input-quote-fx-usd"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-500">{currency}</span>
                  </div>
                </div>
                <div className="col-span-8 md:col-span-5">
                  <p className="flex h-9 items-center text-xs text-secondary-600" data-testid="quote-fee-usd-caption">
                    Converts the fixed USD fees into {currency}.
                    {result.feesNeedUsdRate && <span className="ml-1 text-amber-700">Enter the rate — the fixed fees show as 0 until then.</span>}
                  </p>
                </div>
                <div className="col-span-4 md:col-span-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={fxLoading || liveUsd == null}
                    onClick={() => liveUsd != null && onChange({ fxLocalPerUsd: String(liveUsd), fxRateSource: "open.er-api.com", fxRateAsOf: fx?.asOf ?? null })}
                    data-testid="button-use-live-usd-rate"
                  >
                    <RefreshCw className={cn("mr-1 h-3.5 w-3.5", fxLoading && "animate-spin")} /> Use today's rate
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary-600" data-testid="quote-fee-usd-caption">
                Fixed USD fees are converted at the USD comparison rate above
                {draft.fxRateAsOf ? ` (${fmtAsOf(draft.fxRateAsOf)})` : ""}.
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="quote-notes" className="mb-1 block text-xs font-medium text-secondary-600">Quote notes</Label>
          <Textarea
            id="quote-notes"
            value={draft.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={4}
            placeholder="Assumptions, inclusions, validity, next steps… printed on the quote."
            data-testid="textarea-quote-notes"
          />
        </div>
      </CardContent>
    </Card>
  );
}
