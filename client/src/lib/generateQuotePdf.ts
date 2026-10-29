/**
 * Quote PDF (jsPDF + autotable), same look as generateInvoicePdf.ts: blue header
 * band, Helvetica, striped tables, right-aligned money. Rendered from the
 * editor draft + the shared engine result, so an unsaved quote can be printed.
 * The comparison-currency columns appear only when the quote has one; cost
 * items print their description under the name.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getEngagementTypeLabel } from '@shared/engagementTypes';
import {
  QUOTE_BILLING_MODE_LABELS,
  QUOTE_DISCLAIMER,
  QUOTE_ENGAGEMENT_CATEGORY_LABELS,
  QUOTE_RATE_TYPE_LABELS,
  QUOTE_RATE_UNIT_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_WORK_LOCATION_LABELS,
  ZERO_DECIMAL_CURRENCIES,
  describeCostLineBasis,
  describeFeeLineBasis,
  fmtFxRate,
  fmtQuoteMoney,
  printableCostLines,
  resolveQuoteBillingMode,
  type QuoteMoney,
  type QuoteResult,
} from '@shared/quotes';
import { draftFx, type QuoteDraft } from '@/components/quotes/quote-draft';

export interface QuotePdfInput {
  draft: QuoteDraft;
  result: QuoteResult;
  countryName: string;
}

const BLUE = '#1e40af';
const LIGHT_BLUE = '#eff6ff';
const GRAY = '#6b7280';
const DARK = '#111827';

function num(n: number | null | undefined, currency: string): string {
  const digits = ZERO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number.isFinite(n ?? NaN) ? (n as number) : 0);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function downloadQuotePdf({ draft, result, countryName }: QuotePdfInput): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const currency = draft.currency || 'USD';
  const cmp = result.comparisonCurrency;
  const fx = draftFx(draft);
  const number = draft.quoteNumber ?? 'Draft quote';
  const t = result.totals;
  const inclusive = result.inclusive;
  const unit = QUOTE_RATE_UNIT_LABELS[draft.rateType];

  // Header band
  doc.setFillColor(BLUE);
  doc.rect(0, 0, PAGE_W, 40, 'F');
  doc.setTextColor('#ffffff');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SDP Global Pay', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Cost quote', 14, 24);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Quote: ${number}`, PAGE_W - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Status: ${QUOTE_STATUS_LABELS[draft.status].toUpperCase()}`, PAGE_W - 14, 24, { align: 'right' });

  let y = 52;
  doc.setTextColor(DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(draft.title || 'Untitled quote', PAGE_W - 28)[0] ?? '', 14, y);
  y += 9;

  const billingMode = resolveQuoteBillingMode(draft.isForClient, draft.sdpIsBillingAgent);
  const rateText = fmtQuoteMoney(Number(draft.rate) || 0, currency);
  const payBasis =
    draft.rateType === 'annual'
      ? `${inclusive ? 'All-inclusive annual amount' : QUOTE_RATE_TYPE_LABELS.annual} ${rateText}`
      : `${inclusive ? 'All-inclusive ' : ''}${rateText} ${unit} · ${
          draft.rateType === 'hourly' ? `${draft.hoursPerWeek || 0} h/week` : `${draft.daysPerWeek || 0} days/week`
        } · ${draft.weeksPerYear || 0} weeks/year`;
  const comparisonText =
    cmp && fx.localPerComparison
      ? `${fmtFxRate(fx.localPerComparison, currency, cmp)} (${draft.fxRateSource}${draft.fxRateAsOf ? `, ${fmtDate(draft.fxRateAsOf)}` : ''})`
      : 'none';
  const meta: Array<[string, string]> = [
    ['Prepared for', draft.clientName || '—'],
    ['Valid until', fmtDate(draft.validUntil || null)],
    ['Country', `${countryName}${draft.jurisdiction ? ` · ${draft.jurisdiction}` : ''}`],
    ['Currency', `${currency} · comparison ${comparisonText}`],
    ['Engagement', `${QUOTE_ENGAGEMENT_CATEGORY_LABELS[draft.engagementCategory]} · ${getEngagementTypeLabel(draft.employmentType)}`],
    ['Work', QUOTE_WORK_LOCATION_LABELS[draft.isForClient ? 'host_client' : 'internal']],
    ['Billing', QUOTE_BILLING_MODE_LABELS[billingMode]],
    ['Pay basis', payBasis],
  ];
  const colW = (PAGE_W - 28) / 2;
  doc.setFontSize(9);
  meta.forEach((row, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) y += 6;
    const x = 14 + col * colW;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(GRAY);
    doc.text(row[0], x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK);
    doc.text(doc.splitTextToSize(row[1], colW - 26)[0] ?? '', x + 24, y);
  });
  y += 12;

  const rightAlignMoney = (fromColumn: number) => (data: any) => {
    if (data.column.index >= fromColumn) data.cell.styles.halign = 'right';
  };
  const tableBase = {
    theme: 'striped' as const,
    styles: { fontSize: 8, cellPadding: 2, textColor: DARK },
    headStyles: { fillColor: BLUE, textColor: '#ffffff', fontSize: 8 },
    footStyles: { fillColor: LIGHT_BLUE, textColor: DARK, fontStyle: 'bold' as const, fontSize: 8 },
    margin: { left: 14, right: 14 },
  };
  /** Local (and comparison) annual + monthly cells for one money pair. */
  const moneyCells = (annual: QuoteMoney, monthly: QuoteMoney): string[] =>
    cmp
      ? [num(annual.local, currency), num(annual.comparison, cmp), num(monthly.local, currency), num(monthly.comparison, cmp)]
      : [num(annual.local, currency), num(monthly.local, currency)];
  const moneyHead = cmp
    ? [`Annual ${currency}`, `Annual ${cmp}`, `Monthly ${currency}`, `Monthly ${cmp}`]
    : [`Annual ${currency}`, `Monthly ${currency}`];
  const pair = (annual: number, comparison: number | null | undefined, monthly: number, monthlyComparison: number | null | undefined) =>
    moneyCells({ local: annual, comparison: comparison ?? null }, { local: monthly, comparison: monthlyComparison ?? null });
  const itemCell = (name: string, description?: string | null) => (description ? `${name}\n${description}` : name);

  // Table 1 — pay and statutory costs
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DARK);
  doc.text('Pay and statutory / employer costs', 14, y);
  y += 3;
  const payRows: any[][] = inclusive
    ? [
        [{ content: 'All-inclusive pay', styles: { fontStyle: 'bold' } }, `${payBasis} · includes the costs below`, ...moneyCells(inclusive.annualTotal, inclusive.monthlyTotal)],
        ['Gross pay to worker (derived)', draft.rateType !== 'annual' ? `≈ ${fmtQuoteMoney(inclusive.derivedRate.local, currency)} ${unit}` : 'After the statutory and employer costs', ...moneyCells(result.annualPay, result.monthlyPay)],
      ]
    : [['Gross pay', payBasis, ...moneyCells(result.annualPay, result.monthlyPay)]];
  const costRows = printableCostLines(result.costLines).map((l) => [
    itemCell(l.name || 'Untitled item', l.description),
    describeCostLineBasis(l, currency),
    ...moneyCells(l.annual, l.monthly),
  ]);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Item', 'Basis', ...moneyHead]],
    body: [...payRows, ...costRows],
    foot: [[
      'Total employer cost',
      inclusive ? `= the all-inclusive pay · on-costs ${t.onCostPct}% of gross pay` : `On-costs ${t.onCostPct}% of pay`,
      ...pair(t.local.annual.employerCost, t.comparison?.annual.employerCost, t.local.monthly.employerCost, t.comparison?.monthly.employerCost),
    ]],
    columnStyles: cmp ? { 0: { cellWidth: 58 }, 1: { cellWidth: 36 } } : { 0: { cellWidth: 76 }, 1: { cellWidth: 46 } },
    didParseCell: rightAlignMoney(2),
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Table 2 — SDP fees
  if (y > PAGE_H - 60) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(DARK);
  doc.text('SDP fees', 14, y);
  y += 3;
  const fixedFeeRate = currency !== 'USD' && fx.localPerUsd ? ` · at ${fmtFxRate(fx.localPerUsd, currency, 'USD')}` : '';
  const feeRows = result.feeLines
    .filter((l) => l.applies)
    .map((l) => [
      l.description || 'Untitled fee',
      `${describeFeeLineBasis(l, !!inclusive)}${l.lineType === 'fixed_amount' ? fixedFeeRate : ''}`,
      draft.isForClient && l.paidBy === 'host_client' ? 'Host client' : 'Business',
      ...moneyCells(l.annual, l.monthly),
    ]);
  const feeCols = 3 + moneyHead.length;
  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Fee', 'Basis', 'Paid by', ...moneyHead]],
    body: feeRows.length ? feeRows : [[{ content: 'No SDP fees on this quote.', colSpan: feeCols, styles: { textColor: GRAY } }]],
    foot: [[
      'Total SDP fees',
      '',
      '',
      ...pair(t.local.annual.fees, t.comparison?.annual.fees, t.local.monthly.fees, t.comparison?.monthly.fees),
    ]],
    columnStyles: cmp ? { 0: { cellWidth: 44 }, 1: { cellWidth: 40 }, 2: { cellWidth: 20 } } : { 0: { cellWidth: 60 }, 1: { cellWidth: 56 }, 2: { cellWidth: 22 } },
    didParseCell: rightAlignMoney(3),
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Totals block
  if (y > PAGE_H - 70) { doc.addPage(); y = 20; }
  const cmpText = (n: number | null | undefined) => (cmp && n != null ? fmtQuoteMoney(n, cmp) : '');
  const totalsLines: Array<[string, string, string, boolean]> = [
    ['Total employer cost per year', fmtQuoteMoney(t.local.annual.employerCost, currency), cmpText(t.comparison?.annual.employerCost), false],
    ['SDP fees per year', fmtQuoteMoney(t.local.annual.fees, currency), cmpText(t.comparison?.annual.fees), false],
    ['Total quote per year', fmtQuoteMoney(t.local.annual.total, currency), cmpText(t.comparison?.annual.total), true],
    ['Total quote per month', fmtQuoteMoney(t.local.monthly.total, currency), cmpText(t.comparison?.monthly.total), false],
  ];
  if (result.perUnit) {
    totalsLines.push([
      `Loaded cost per ${result.perUnit.unit}`,
      fmtQuoteMoney(result.perUnit.loadedCost.local, currency),
      cmpText(result.perUnit.loadedCost.comparison),
      false,
    ]);
  }
  const rightX = PAGE_W - 14;
  totalsLines.forEach(([label, local, comparison, bold]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(bold ? BLUE : DARK);
    doc.text(label, rightX - 95, y);
    doc.text(local, cmp ? rightX - 36 : rightX, y, { align: 'right' });
    if (comparison) {
      doc.setTextColor(GRAY);
      doc.setFontSize(bold ? 9 : 8);
      doc.text(comparison, rightX, y, { align: 'right' });
    }
    y += bold ? 7 : 6;
  });
  y += 4;

  // Notes
  if (draft.notes.trim()) {
    const lines: string[] = doc.splitTextToSize(draft.notes.trim(), PAGE_W - 28);
    if (y + lines.length * 4.5 + 12 > PAGE_H - 25) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(DARK);
    doc.text('Notes', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 6;
  }

  // Disclaimer
  const disclaimer: string[] = doc.splitTextToSize(QUOTE_DISCLAIMER, PAGE_W - 28);
  if (y + disclaimer.length * 4 > PAGE_H - 25) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text(disclaimer, 14, y);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRAY);
    doc.text(`${number} · generated ${generated}`, 14, PAGE_H - 10);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - 14, PAGE_H - 10, { align: 'right' });
  }

  const safe = (draft.quoteNumber ?? 'draft').replace(/[^A-Za-z0-9-]/g, '-');
  doc.save(`Quote-${safe}.pdf`);
}
