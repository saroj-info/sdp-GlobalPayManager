/**
 * The live quote preview: what the PDF shows, recomputed from the draft on
 * every change. Monthly and annual columns, each amount in the local currency
 * with the comparison currency underneath (when the quote has one). Cost items
 * print their full description under the name.
 */
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getEngagementTypeLabel } from "@shared/engagementTypes";
import {
  QUOTE_BILLING_MODE_LABELS,
  QUOTE_DISCLAIMER,
  QUOTE_ENGAGEMENT_CATEGORY_LABELS,
  QUOTE_RATE_TYPE_LABELS,
  QUOTE_RATE_UNIT_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_WORK_LOCATION_LABELS,
  describeCostLineBasis,
  describeFeeLineBasis,
  fmtFxRate,
  fmtQuoteMoney,
  printableCostLines,
  resolveQuoteBillingMode,
  type QuoteMoney,
  type QuoteResult,
} from "@shared/quotes";
import { MoneyPair } from "./money";
import { draftFx, needsSeparateUsdRate, num, type QuoteDraft } from "./quote-draft";

interface QuotePreviewPanelProps {
  draft: QuoteDraft;
  result: QuoteResult;
  countryName: string;
  onDownloadPdf: () => void;
  pdfDisabled?: boolean;
  className?: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ label, sub, description, monthly, annual, currency, comparisonCurrency, muted, bold, testId }: {
  label: string; sub?: string; description?: string | null; monthly: QuoteMoney; annual: QuoteMoney; currency: string; comparisonCurrency: string | null;
  muted?: boolean; bold?: boolean; testId?: string;
}) {
  return (
    <tr className={cn("border-b border-secondary-100 align-top", bold && "font-semibold")} data-testid={testId}>
      <td className="py-1.5 pr-2">
        <div className={cn("text-sm text-secondary-900", muted && "line-through opacity-50")}>{label}</div>
        {sub && <div className="text-[11px] text-secondary-500">{sub}</div>}
        {description && <div className="mt-0.5 whitespace-pre-line text-[11px] font-normal leading-snug text-secondary-500" data-testid="preview-description">{description}</div>}
      </td>
      <td className="py-1.5 pr-2 text-right"><MoneyPair size="xs" local={monthly.local} comparison={monthly.comparison} currency={currency} comparisonCurrency={comparisonCurrency} muted={muted} /></td>
      <td className="py-1.5 text-right"><MoneyPair size="xs" local={annual.local} comparison={annual.comparison} currency={currency} comparisonCurrency={comparisonCurrency} muted={muted} /></td>
    </tr>
  );
}

function SectionRow({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={3} className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-secondary-600">{title}</td>
    </tr>
  );
}

export function QuotePreviewPanel({ draft, result, countryName, onDownloadPdf, pdfDisabled, className }: QuotePreviewPanelProps) {
  const currency = draft.currency || "USD";
  const cmp = result.comparisonCurrency;
  const fx = draftFx(draft);
  const t = result.totals;
  const inclusive = result.inclusive;
  const billingMode = resolveQuoteBillingMode(draft.isForClient, draft.sdpIsBillingAgent);
  const applyingCost = printableCostLines(result.costLines);
  const applyingFees = result.feeLines.filter((l) => l.applies);
  const money = (local: number, comparison: number | null | undefined): QuoteMoney => ({ local, comparison: comparison ?? null });
  const unit = QUOTE_RATE_UNIT_LABELS[draft.rateType];
  const payBasis =
    draft.rateType === "annual"
      ? QUOTE_RATE_TYPE_LABELS.annual
      : `${QUOTE_RATE_TYPE_LABELS[draft.rateType]} · ${draft.rateType === "hourly" ? `${draft.hoursPerWeek || 0} h/week` : `${draft.daysPerWeek || 0} days/week`} · ${draft.weeksPerYear || 0} weeks/year`;
  const fixedFeeRate =
    currency !== "USD" && fx.localPerUsd ? ` · at ${fmtFxRate(fx.localPerUsd, currency, "USD")}` : "";

  const meta: Array<[string, string]> = [
    ["Prepared for", draft.clientName || "—"],
    ["Country", `${countryName || draft.countryId}${draft.jurisdiction ? ` · ${draft.jurisdiction}` : ""}`],
    ["Engagement", `${QUOTE_ENGAGEMENT_CATEGORY_LABELS[draft.engagementCategory]} · ${getEngagementTypeLabel(draft.employmentType)}`],
    ["Work", QUOTE_WORK_LOCATION_LABELS[draft.isForClient ? "host_client" : "internal"]],
    ["Billing", QUOTE_BILLING_MODE_LABELS[billingMode]],
    ["Pay basis", inclusive ? `${payBasis} · all-inclusive rate` : payBasis],
    [
      "Comparison",
      cmp && fx.localPerComparison
        ? `${fmtFxRate(fx.localPerComparison, currency, cmp)}${draft.fxRateAsOf ? ` · ${fmtDate(draft.fxRateAsOf)}` : ""} · ${draft.fxRateSource}`
        : "No comparison currency",
    ],
    ["Valid until", draft.validUntil ? fmtDate(draft.validUntil) : "—"],
  ];

  return (
    <Card className={cn("border-secondary-200", className)} data-testid="quote-preview">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary-600" /> Quote preview
            </CardTitle>
            <p className="mt-1 text-xs text-secondary-500">
              {draft.quoteNumber ?? "New quote"} · {QUOTE_STATUS_LABELS[draft.status]}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onDownloadPdf} disabled={pdfDisabled} data-testid="button-download-quote-pdf">
            <Download className="mr-1 h-4 w-4" /> PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="truncate text-sm font-semibold text-secondary-900" data-testid="quote-preview-title">{draft.title || "Untitled quote"}</p>
        <dl className="mt-2 space-y-1">
          {meta.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <dt className="w-24 shrink-0 text-secondary-500">{k}</dt>
              <dd className="min-w-0 flex-1 text-secondary-900">{v}</dd>
            </div>
          ))}
        </dl>

        <table className="mt-4 w-full text-sm">
          <thead className="bg-secondary-50 text-[11px] uppercase tracking-wide text-secondary-600">
            <tr>
              <th className="py-1.5 pl-1 pr-2 text-left font-medium">Item</th>
              <th className="py-1.5 pr-2 text-right font-medium">Monthly</th>
              <th className="py-1.5 pr-1 text-right font-medium">Annual</th>
            </tr>
          </thead>
          <tbody>
            <SectionRow title="Pay" />
            {inclusive ? (
              <>
                <Row
                  label="All-inclusive pay"
                  sub={`${payBasis} · includes the statutory and employer costs below`}
                  monthly={inclusive.monthlyTotal}
                  annual={inclusive.annualTotal}
                  currency={currency}
                  comparisonCurrency={cmp}
                  bold
                  testId="preview-row-inclusive"
                />
                <Row
                  label="Gross pay to worker (derived)"
                  sub={draft.rateType !== "annual" ? `≈ ${fmtQuoteMoney(inclusive.derivedRate.local, currency)} ${unit}` : "After the statutory and employer costs"}
                  monthly={result.monthlyPay}
                  annual={result.annualPay}
                  currency={currency}
                  comparisonCurrency={cmp}
                  testId="preview-row-pay"
                />
              </>
            ) : (
              <Row label="Gross pay" sub={payBasis} monthly={result.monthlyPay} annual={result.annualPay} currency={currency} comparisonCurrency={cmp} testId="preview-row-pay" />
            )}

            <SectionRow title="Statutory and employer costs" />
            {applyingCost.length === 0 && (
              <tr><td colSpan={3} className="py-1.5 text-xs text-secondary-500">None</td></tr>
            )}
            {applyingCost.map((l) => (
              <Row
                key={l.id}
                label={l.name || "Untitled item"}
                sub={describeCostLineBasis(l, currency)}
                description={l.description}
                monthly={l.monthly}
                annual={l.annual}
                currency={currency}
                comparisonCurrency={cmp}
                testId={`preview-cost-${l.sourceId ?? l.id}`}
              />
            ))}
            <Row
              label="Total employer cost"
              sub={inclusive ? `Gross pay + on-costs (${t.onCostPct}% of gross pay) = the all-inclusive pay` : `On-costs ${t.onCostPct}% of pay`}
              monthly={money(t.local.monthly.employerCost, t.comparison?.monthly.employerCost)}
              annual={money(t.local.annual.employerCost, t.comparison?.annual.employerCost)}
              currency={currency}
              comparisonCurrency={cmp}
              bold
              testId="preview-row-employer-cost"
            />

            <SectionRow title="SDP fees" />
            {applyingFees.length === 0 && (
              <tr><td colSpan={3} className="py-1.5 text-xs text-secondary-500">None</td></tr>
            )}
            {applyingFees.map((l) => (
              <Row
                key={l.id}
                label={l.description || "Untitled fee"}
                sub={`${describeFeeLineBasis(l, !!inclusive)}${l.lineType === "fixed_amount" ? fixedFeeRate : ""}${draft.isForClient && l.paidBy === "host_client" ? " · paid by host client" : ""}`}
                monthly={l.monthly}
                annual={l.annual}
                currency={currency}
                comparisonCurrency={cmp}
                testId={`preview-fee-${l.id}`}
              />
            ))}
            <Row
              label="Total SDP fees"
              monthly={money(t.local.monthly.fees, t.comparison?.monthly.fees)}
              annual={money(t.local.annual.fees, t.comparison?.annual.fees)}
              currency={currency}
              comparisonCurrency={cmp}
              bold
              testId="preview-row-fees"
            />
          </tbody>
        </table>
        {result.feesNeedUsdRate && needsSeparateUsdRate(draft) && !(num(draft.fxLocalPerUsd) > 0) && (
          <p className="mt-2 text-xs text-amber-700" data-testid="preview-fee-usd-warning">Fixed USD fees need a USD exchange rate (SDP fees card).</p>
        )}

        <Separator className="my-3" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-secondary-900">Total quote per year</p>
            <p className="text-xs text-secondary-500">Employer cost + SDP fees</p>
          </div>
          <MoneyPair size="lg" local={t.local.annual.total} comparison={t.comparison?.annual.total ?? null} currency={currency} comparisonCurrency={cmp} className="[&>span:first-child]:text-primary-600" data-testid="quote-preview-total" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-secondary-600">Per month</span>
          <MoneyPair local={t.local.monthly.total} comparison={t.comparison?.monthly.total ?? null} currency={currency} comparisonCurrency={cmp} data-testid="quote-preview-total-monthly" />
        </div>
        {result.perUnit && (
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-secondary-600">Loaded cost per {result.perUnit.unit}</span>
            <MoneyPair local={result.perUnit.loadedCost.local} comparison={result.perUnit.loadedCost.comparison} currency={currency} comparisonCurrency={cmp} data-testid="quote-preview-per-unit" />
          </div>
        )}

        {draft.notes.trim() && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-600">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-secondary-700" data-testid="quote-preview-notes">{draft.notes}</p>
          </div>
        )}
        <p className="mt-4 text-[11px] leading-snug text-secondary-500">{QUOTE_DISCLAIMER}</p>
      </CardContent>
    </Card>
  );
}
