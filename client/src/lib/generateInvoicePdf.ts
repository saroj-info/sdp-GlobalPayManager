import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LineItem {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  amount: number | string;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  status?: string;
  currency: string;
  description?: string;
  subtotal: string | number;
  gstVatRate?: string | number;
  gstVatAmount?: string | number;
  totalAmount: string | number;
  isCrossBorder?: boolean;
  periodStart?: string;
  periodEnd?: string;
  invoiceCategory?: string;
  fromCountry?: { name?: string; companyName?: string };
  toBusiness?: { name?: string };
  fromBusiness?: { name?: string };
  lineItems?: LineItem[];
  timesheetDetails?: {
    workerName?: string;
    periodStart?: string;
    periodEnd?: string;
    totalHours?: number | string;
    status?: string;
  };
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const fmtAmt = (val: string | number | undefined, currency: string) => {
  const n = parseFloat(String(val || 0));
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function generateInvoicePdf(invoice: InvoiceData): void {
  const doc = new jsPDF();
  const PAGE_W = doc.internal.pageSize.getWidth();
  const BLUE = '#1e40af';
  const LIGHT_BLUE = '#eff6ff';
  const GRAY = '#6b7280';

  doc.setFillColor(BLUE);
  doc.rect(0, 0, PAGE_W, 40, 'F');

  doc.setTextColor('#ffffff');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SDP Global Pay', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Employment Services', 14, 24);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const invoiceLabel = `Invoice: ${invoice.invoiceNumber}`;
  doc.text(invoiceLabel, PAGE_W - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, PAGE_W - 14, 24, { align: 'right' });

  let y = 52;

  const categoryLabels: Record<string, string> = {
    sdp_services: 'SDP Employment Services Invoice',
    customer_billing: 'Client Billing Invoice',
    business_to_client: 'Business → Host Client Invoice',
  };
  doc.setTextColor(GRAY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(categoryLabels[invoice.invoiceCategory || ''] || 'Invoice', 14, y);
  y += 6;

  doc.setTextColor('#111827');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoiceNumber, 14, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY);
  doc.text('Amount Due', PAGE_W - 14, y - 4, { align: 'right' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BLUE);
  doc.text(fmtAmt(invoice.totalAmount, invoice.currency), PAGE_W - 14, y + 4, { align: 'right' });
  y += 14;

  doc.setDrawColor('#e5e7eb');
  doc.line(14, y, PAGE_W - 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#374151');

  const col1 = 14;
  const col2 = PAGE_W / 2 + 4;

  const addRow = (label: string, value: string, x: number, yCur: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, x, yCur);
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + 28, yCur);
  };

  addRow('Invoice Date:', fmtDate(invoice.invoiceDate), col1, y);
  addRow('Due Date:', fmtDate(invoice.dueDate), col2, y);
  y += 7;

  const fromName = invoice.fromBusiness?.name || invoice.fromCountry?.companyName || '—';
  const toName = invoice.toBusiness?.name || '—';
  addRow('From:', fromName, col1, y);
  addRow('To:', toName, col2, y);
  y += 10;

  if (invoice.description) {
    doc.setFillColor(LIGHT_BLUE);
    doc.roundedRect(14, y, PAGE_W - 28, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1e3a8a');
    doc.text('Description', 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#374151');
    const lines = doc.splitTextToSize(invoice.description, PAGE_W - 36);
    doc.text(lines[0] || '', 18, y + 13);
    y += 22;
  }

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#111827');
    doc.text('Line Items', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: invoice.lineItems.map((item) => [
        item.description,
        String(item.quantity),
        fmtAmt(item.unitPrice, invoice.currency),
        fmtAmt(item.amount, invoice.currency),
      ]),
      headStyles: { fillColor: BLUE, textColor: '#ffffff', fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: '#374151' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 40 },
      },
      margin: { left: 14, right: 14 },
      theme: 'striped',
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subtotal = parseFloat(String(invoice.subtotal || 0));
  const gstAmt = parseFloat(String(invoice.gstVatAmount || 0));
  const total = parseFloat(String(invoice.totalAmount || 0));
  const gstRate = parseFloat(String(invoice.gstVatRate || 0));

  const summaryX = PAGE_W - 80;
  doc.setTextColor(GRAY);
  doc.text('Subtotal:', summaryX, y);
  doc.setTextColor('#111827');
  doc.text(fmtAmt(subtotal, invoice.currency), PAGE_W - 14, y, { align: 'right' });
  y += 6;

  if (!invoice.isCrossBorder && gstAmt > 0) {
    doc.setTextColor(GRAY);
    doc.text(`GST/VAT (${gstRate}%):`, summaryX, y);
    doc.setTextColor('#111827');
    doc.text(fmtAmt(gstAmt, invoice.currency), PAGE_W - 14, y, { align: 'right' });
    y += 6;
  } else if (invoice.isCrossBorder) {
    doc.setTextColor(GRAY);
    doc.text('GST/VAT:', summaryX, y);
    doc.setTextColor('#059669');
    doc.text('Zero-rated (cross-border)', PAGE_W - 14, y, { align: 'right' });
    y += 6;
  }

  doc.setDrawColor('#d1d5db');
  doc.line(summaryX, y, PAGE_W - 14, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BLUE);
  doc.text('Total:', summaryX, y);
  doc.text(fmtAmt(total, invoice.currency), PAGE_W - 14, y, { align: 'right' });
  y += 10;

  if (invoice.timesheetDetails) {
    const ts = invoice.timesheetDetails;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#111827');
    doc.text('Timesheet Summary', 14, y);
    y += 4;

    const tsRows: [string, string][] = [];
    if (ts.workerName) tsRows.push(['Worker', ts.workerName]);
    if (ts.periodStart || ts.periodEnd) {
      const period =
        (ts.periodStart ? new Date(ts.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '') +
        ' — ' +
        (ts.periodEnd ? new Date(ts.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
      tsRows.push(['Period', period]);
    }
    if (ts.totalHours) tsRows.push(['Total Hours', `${ts.totalHours}h`]);
    if (ts.status) tsRows.push(['Status', ts.status.charAt(0).toUpperCase() + ts.status.slice(1)]);

    autoTable(doc, {
      startY: y,
      body: tsRows,
      bodyStyles: { fontSize: 9, textColor: '#374151' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto' } },
      margin: { left: 14, right: 14 },
      theme: 'plain',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor('#e5e7eb');
  doc.line(14, footerY - 2, PAGE_W - 14, footerY - 2);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY);
  doc.text('SDP Global Pay  |  billing@sdpglobalpay.com  |  © 2025 SDP Global Pay', PAGE_W / 2, footerY + 5, { align: 'center' });

  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}
