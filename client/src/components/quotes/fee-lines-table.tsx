/**
 * SDP fee lines: the same row grid as the cost items. `mode="defaults"` is the
 * admin schedule editor (no include checkbox, no computed column).
 */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  QUOTE_FEE_LINE_TYPES,
  QUOTE_FEE_LINE_TYPE_LABELS,
  QUOTE_FEE_PAID_BY,
  QUOTE_FEE_PAID_BY_LABELS,
  newQuoteLineId,
  type QuoteComputedFeeLine,
  type QuoteFeeLine,
  type QuoteFeeLineType,
  type QuoteFeePaidBy,
  type QuoteMoney,
} from "@shared/quotes";
import { LINE_CELL_LABEL, LINE_ROW_BOX, LINE_ROW_GRID } from "./cost-lines-table";
import { MoneyPair } from "./money";

interface FeeLinesTableProps {
  lines: QuoteFeeLine[];
  onChange: (lines: QuoteFeeLine[]) => void;
  mode?: "quote" | "defaults";
  /** Quote mode only. */
  computed?: QuoteComputedFeeLine[];
  currency?: string;
  /** Host Client Work: the "Paid by" column is shown. Internal Work: every fee is paid by the business. */
  showPaidBy?: boolean;
  subtotal?: QuoteMoney;
  addLabel?: string;
  emptyText?: string;
}

function numberOrNull(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function FeeLinesTable({
  lines,
  onChange,
  mode = "quote",
  computed = [],
  currency = "USD",
  showPaidBy = true,
  subtotal,
  addLabel = "Add fee line",
  emptyText = "No SDP fee lines.",
}: FeeLinesTableProps) {
  const isQuote = mode === "quote";
  const sorted = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(computed.map((c) => [c.id, c]));

  const patch = (id: string, p: Partial<QuoteFeeLine>) => onChange(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id));
  const add = () =>
    onChange([
      ...lines,
      {
        id: newQuoteLineId("fee"),
        description: "",
        lineType: "percentage_of_pay",
        rate: 0,
        amountUsd: null,
        paidBy: "business",
        applies: true,
        sortOrder: lines.reduce((m, l) => Math.max(m, l.sortOrder), -1) + 1,
        note: null,
      },
    ]);

  // Spans: quote + paid by = 4/2/2/2/2; quote without = 6/2/2/2; defaults = 5/2/2/3 (or 8/2/2).
  const descSpan = isQuote ? (showPaidBy ? "col-span-4" : "col-span-6") : showPaidBy ? "col-span-5" : "col-span-8";
  const typeSpan = "col-span-2";
  const rateSpan = "col-span-2";
  const paidSpan = isQuote ? "col-span-2" : "col-span-3";

  return (
    <div className="space-y-2" data-testid={isQuote ? "fee-lines-table" : "fee-defaults-table"}>
      {sorted.length === 0 && (
        <p className="rounded-md border border-dashed border-secondary-200 p-3 text-sm text-secondary-500">{emptyText}</p>
      )}
      {sorted.map((line, idx) => {
        const c = byId.get(line.id);
        const first = idx === 0;
        const fixed = line.lineType === "fixed_amount";
        return (
          <div key={line.id} className={cn(LINE_ROW_BOX, isQuote && !line.applies && "bg-white")} data-testid="fee-line-row">
            <div className={LINE_ROW_GRID}>
              <div className={descSpan}>
                {first && <Label className={LINE_CELL_LABEL}>{isQuote ? "Fee (tick to include)" : "Fee"}</Label>}
                <div className="flex h-9 items-center gap-2">
                  {isQuote && (
                    <Checkbox
                      checked={line.applies}
                      onCheckedChange={(v) => patch(line.id, { applies: v === true })}
                      aria-label="Include this fee"
                      className="shrink-0"
                      data-testid="fee-line-applies"
                    />
                  )}
                  <Input
                    className="h-9 min-w-0 text-sm"
                    value={line.description}
                    onChange={(e) => patch(line.id, { description: e.target.value })}
                    placeholder="e.g. Management fee"
                    data-testid="fee-line-description"
                  />
                </div>
              </div>
              <div className={typeSpan}>
                {first && <Label className={LINE_CELL_LABEL}>Type</Label>}
                <Select
                  value={line.lineType}
                  onValueChange={(v) => {
                    const lineType = v as QuoteFeeLineType;
                    patch(line.id, lineType === "fixed_amount"
                      ? { lineType, amountUsd: line.amountUsd ?? 0, rate: null }
                      : { lineType, rate: line.rate ?? 0, amountUsd: null });
                  }}
                >
                  <SelectTrigger className="h-9 text-sm" data-testid="fee-line-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_FEE_LINE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{QUOTE_FEE_LINE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={rateSpan}>
                {first && <Label className={LINE_CELL_LABEL}>{fixed ? "USD/month" : "Rate"}</Label>}
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cn("h-9 text-right text-sm tabular-nums", fixed ? "pr-9" : "pr-6")}
                    value={(fixed ? line.amountUsd : line.rate) ?? ""}
                    onChange={(e) =>
                      patch(line.id, fixed ? { amountUsd: numberOrNull(e.target.value) ?? 0 } : { rate: numberOrNull(e.target.value) ?? 0 })
                    }
                    data-testid="fee-line-value"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-secondary-500">
                    {fixed ? "USD" : "%"}
                  </span>
                </div>
              </div>
              {showPaidBy && (
                <div className={paidSpan}>
                  {first && <Label className={LINE_CELL_LABEL}>Paid by</Label>}
                  <Select value={line.paidBy} onValueChange={(v) => patch(line.id, { paidBy: v as QuoteFeePaidBy })}>
                    <SelectTrigger className="h-9 text-sm" data-testid="fee-line-paid-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUOTE_FEE_PAID_BY.map((p) => (
                        <SelectItem key={p} value={p}>{QUOTE_FEE_PAID_BY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isQuote && (
                <div className="col-span-2">
                  {first && <Label className={cn(LINE_CELL_LABEL, "text-right")}>Per year</Label>}
                  <div className="flex h-9 flex-col items-end justify-center">
                    <MoneyPair
                      size="xs"
                      local={c?.annual.local ?? 0}
                      usd={c?.annual.usd ?? 0}
                      currency={currency}
                      muted={!line.applies}
                      data-testid="fee-line-amount"
                    />
                  </div>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0 text-secondary-500 hover:text-destructive"
              onClick={() => remove(line.id)}
              aria-label="Remove fee line"
              data-testid="fee-line-remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={add} data-testid="button-add-fee-line">
          <Plus className="mr-1 h-4 w-4" /> {addLabel}
        </Button>
        {isQuote && subtotal && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary-600">SDP fees</span>
            <MoneyPair local={subtotal.local} usd={subtotal.usd} currency={currency} data-testid="fee-lines-subtotal" />
          </div>
        )}
      </div>
    </div>
  );
}
