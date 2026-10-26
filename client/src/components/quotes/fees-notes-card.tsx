/**
 * Card "SDP fees and quote notes": the fee lines (seeded from the admin
 * schedule for the category × billing-agent choice) and the free-text notes
 * printed on the quote.
 */
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuoteFeeLine, QuoteResult } from "@shared/quotes";
import { FeeLinesTable } from "./fee-lines-table";
import type { QuoteDraft } from "./quote-draft";

interface FeesNotesCardProps {
  draft: QuoteDraft;
  result: QuoteResult;
  onChange: (patch: Partial<QuoteDraft>) => void;
  onFeeLinesChange: (lines: QuoteFeeLine[]) => void;
  feeLinesTouched: boolean;
  defaultsEmpty: boolean;
  onReloadFeeDefaults: () => void;
}

export function FeesNotesCard({ draft, result, onChange, onFeeLinesChange, feeLinesTouched, defaultsEmpty, onReloadFeeDefaults }: FeesNotesCardProps) {
  const currency = draft.currency || "USD";
  return (
    <Card data-testid="quote-fees-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4 text-primary-600" /> SDP fees and quote notes
        </CardTitle>
        <CardDescription>
          Percentage fees are a share of annual gross pay; fixed fees are USD per month. Shown in {currency} and USD.
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
            showPaidBy={draft.isForClient}
            subtotal={{ local: result.totals.local.annual.fees, usd: result.totals.usd.annual.fees }}
            onChange={onFeeLinesChange}
            emptyText="No SDP fee lines on this quote."
          />
        </div>
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
