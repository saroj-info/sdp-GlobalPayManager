// Renders SDP's billing terms (the text exactly as shown to the business) as a
// PDF with a signature block, so the business can sign on paper and upload the
// signed copy in the billing terms dialog. Browser-side only (jsPDF), like
// generateInvoicePdf.ts.
import jsPDF from 'jspdf';

export interface BillingTermsPdfInput {
  title: string;
  versionNumber: number | null | undefined;
  text: string;
  businessName?: string | null;
  publishedAt?: string | null;
  /** When set (read-only view of a stored acceptance), printed in the footer. */
  acceptedAt?: string | null;
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

export function downloadBillingTermsPdf(input: BillingTermsPdfInput): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 18;
  const BOTTOM = PAGE_H - 20;
  const BLUE = '#1e40af';
  const GRAY = '#6b7280';
  let y = 0;

  // Header band
  doc.setFillColor(BLUE);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SDP Global Pay', MARGIN, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(input.title, MARGIN, 20);
  if (input.versionNumber) {
    doc.text(`Version ${input.versionNumber}`, PAGE_W - MARGIN, 20, { align: 'right' });
  }
  y = 38;

  // Parties / meta
  doc.setTextColor('#111827');
  doc.setFontSize(10);
  if (input.businessName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Business:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(input.businessName), MARGIN + 22, y);
    y += 6;
  }
  if (input.publishedAt) {
    doc.setFont('helvetica', 'bold');
    doc.text('Published:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDate(input.publishedAt), MARGIN + 22, y);
    y += 6;
  }
  doc.setDrawColor('#e5e7eb');
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Body (pre-wrapped text, honours blank lines)
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  const lineH = 5.2;
  const maxW = PAGE_W - MARGIN * 2;
  const paragraphs = input.text.replace(/\r\n/g, '\n').split('\n');
  const ensureRoom = (needed: number) => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  };
  for (const para of paragraphs) {
    if (!para.trim()) {
      y += lineH * 0.6;
      continue;
    }
    const lines: string[] = doc.splitTextToSize(para, maxW);
    for (const line of lines) {
      ensureRoom(lineH);
      doc.text(line, MARGIN, y);
      y += lineH;
    }
  }

  // Signature block
  ensureRoom(58);
  y += 8;
  doc.setDrawColor('#9ca3af');
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Accepted on behalf of the Business', MARGIN, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const field = (label: string, x: number, w: number) => {
    doc.line(x, y, x + w, y);
    doc.setTextColor(GRAY);
    doc.text(label, x, y + 4.5);
    doc.setTextColor('#111827');
  };
  const half = (PAGE_W - MARGIN * 2 - 10) / 2;
  field('Signature', MARGIN, half);
  field('Name', MARGIN + half + 10, half);
  y += 16;
  field('Position', MARGIN, half);
  field('Date', MARGIN + half + 10, half);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(GRAY);
    const left = input.acceptedAt
      ? `Accepted ${fmtDate(input.acceptedAt)}`
      : `Generated ${fmtDate(new Date().toISOString())}`;
    doc.text(left, MARGIN, PAGE_H - 10);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
  }

  doc.save(`SDP-Billing-Terms${input.versionNumber ? `-v${input.versionNumber}` : ''}.pdf`);
}
