/**
 * "Statutory and employer cost items" rows. Every row is one 12-column grid
 * with the same spans, every control is h-9 and the computed amount sits in an
 * h-9 box, so names, rates and amounts share one baseline. Column labels are
 * drawn once, on the first row. Under the grid every row shows its full
 * description (an auto-growing textarea, so nothing is clipped). The delete
 * button floats in the row's corner so it never shifts the columns.
 */
import { useLayoutEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  QUOTE_CALC_TYPES,
  QUOTE_CALC_TYPE_LABELS,
  newQuoteLineId,
  type QuoteCalcType,
  type QuoteComputedCostLine,
  type QuoteCostLine,
  type QuoteMoney,
} from "@shared/quotes";
import { MoneyPair } from "./money";

export const LINE_ROW_GRID = "grid grid-cols-12 items-end gap-2";
export const LINE_CELL_LABEL = "mb-1 block whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-secondary-600";
export const LINE_ROW_BOX = "relative rounded-md border border-secondary-200 bg-secondary-50 p-2 pr-9";

interface CostLinesTableProps {
  lines: QuoteCostLine[];
  computed: QuoteComputedCostLine[];
  currency: string;
  comparisonCurrency: string | null;
  subtotal: QuoteMoney;
  onChange: (lines: QuoteCostLine[]) => void;
}

function numberOrNull(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** A borderless textarea that grows with its content, for the description under each item. */
export function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  "data-testid": testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 22)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "block w-full resize-none overflow-hidden rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-xs leading-snug text-secondary-600",
        "placeholder:text-secondary-400 hover:border-secondary-200 focus:border-secondary-300 focus:bg-white focus:outline-none focus:text-secondary-900",
        "disabled:cursor-default disabled:hover:border-transparent",
        className,
      )}
      data-testid={testId}
    />
  );
}

export function CostLinesTable({ lines, computed, currency, comparisonCurrency, subtotal, onChange }: CostLinesTableProps) {
  const sorted = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const byId = new Map(computed.map((c) => [c.id, c]));

  const patch = (id: string, p: Partial<QuoteCostLine>) => onChange(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id));
  const add = () =>
    onChange([
      ...lines,
      {
        id: newQuoteLineId("custom"),
        name: "",
        description: null,
        calcType: "percent",
        value: 0,
        capAmount: null,
        source: "custom",
        sourceId: null,
        applies: true,
        sortOrder: lines.reduce((m, l) => Math.max(m, l.sortOrder), -1) + 1,
      },
    ]);

  return (
    <div className="space-y-2" data-testid="cost-lines-table">
      {sorted.length === 0 && (
        <p className="rounded-md border border-dashed border-secondary-200 p-3 text-sm text-secondary-500">
          No statutory or employer cost items yet. Add one below.
        </p>
      )}
      {sorted.map((line, idx) => {
        const c = byId.get(line.id);
        const first = idx === 0;
        const needsCap = line.calcType === "percent_with_cap";
        return (
          <div key={line.id} className={cn(LINE_ROW_BOX, !line.applies && "bg-white")} data-testid="cost-line-row">
            <div className={LINE_ROW_GRID}>
              <div className="col-span-5">
                {first && <Label className={LINE_CELL_LABEL}>Item (tick to include)</Label>}
                <div className="flex h-9 items-center gap-2">
                  <Checkbox
                    checked={line.applies}
                    onCheckedChange={(v) => patch(line.id, { applies: v === true })}
                    aria-label="Include this item"
                    className="shrink-0"
                    data-testid="cost-line-applies"
                  />
                  <Input
                    className="h-9 min-w-0 text-sm"
                    value={line.name}
                    onChange={(e) => patch(line.id, { name: e.target.value })}
                    placeholder="e.g. Superannuation"
                    data-testid="cost-line-name"
                  />
                  {line.source === "jurisdiction" && (
                    <Badge variant="outline" className="shrink-0 px-1.5 text-[10px] font-medium">State</Badge>
                  )}
                </div>
              </div>
              <div className="col-span-3">
                {first && <Label className={LINE_CELL_LABEL}>Type</Label>}
                <Select value={line.calcType} onValueChange={(v) => patch(line.id, { calcType: v as QuoteCalcType })}>
                  <SelectTrigger className="h-9 text-sm" data-testid="cost-line-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUOTE_CALC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{QUOTE_CALC_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                {first && <Label className={LINE_CELL_LABEL}>Rate / value</Label>}
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-9 pr-6 text-right text-sm tabular-nums"
                    value={line.value}
                    onChange={(e) => patch(line.id, { value: numberOrNull(e.target.value) ?? 0 })}
                    data-testid="cost-line-value"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-secondary-500">
                    {line.calcType === "flat" ? currency : "%"}
                  </span>
                </div>
              </div>
              <div className="col-span-2">
                {first && <Label className={cn(LINE_CELL_LABEL, "text-right")}>Per year</Label>}
                <div className="flex h-9 flex-col items-end justify-center">
                  <MoneyPair
                    size="xs"
                    local={c?.annual.local ?? 0}
                    comparison={c?.annual.comparison ?? null}
                    currency={currency}
                    comparisonCurrency={comparisonCurrency}
                    muted={!line.applies}
                    data-testid="cost-line-amount"
                  />
                </div>
              </div>
            </div>

            <div className="mt-1.5 pl-6">
              <AutoGrowTextarea
                value={line.description ?? ""}
                onChange={(v) => patch(line.id, { description: v || null })}
                placeholder="Description shown on the quote under the item name"
                className={cn(!line.applies && "opacity-60")}
                data-testid="cost-line-description"
              />
            </div>

            {needsCap && (
              <div className={cn(LINE_ROW_GRID, "mt-2")}>
                <div className="col-span-5">
                  <Label className={LINE_CELL_LABEL}>Cap ({currency} per year)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 text-right text-sm tabular-nums"
                    value={line.capAmount ?? ""}
                    onChange={(e) => patch(line.id, { capAmount: numberOrNull(e.target.value) })}
                    data-testid="cost-line-cap"
                  />
                </div>
                <div className="col-span-7 flex h-8 items-center text-xs text-secondary-500">Applied to pay up to the cap.</div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0 text-secondary-500 hover:text-destructive"
              onClick={() => remove(line.id)}
              aria-label="Remove item"
              data-testid="cost-line-remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={add} data-testid="button-add-cost-line">
          <Plus className="mr-1 h-4 w-4" /> Add cost item
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-secondary-600">Statutory and employer costs</span>
          <MoneyPair local={subtotal.local} comparison={subtotal.comparison} currency={currency} comparisonCurrency={comparisonCurrency} data-testid="cost-lines-subtotal" />
        </div>
      </div>
    </div>
  );
}
