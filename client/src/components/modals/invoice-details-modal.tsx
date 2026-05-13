import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, DollarSign, Building, User, Clock, Globe } from "lucide-react";

interface InvoiceDetailsModalProps {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  sdp_services: "SDP Services → Business",
  customer_billing: "SDP → Host Client",
  business_to_client: "Business → Host Client",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const fmt = (d: string | Date | undefined | null) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const money = (amt: any, currency = "") => {
  const n = parseFloat(amt ?? "0");
  if (!Number.isFinite(n)) return "—";
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
};

export function InvoiceDetailsModal({ invoice, open, onOpenChange }: InvoiceDetailsModalProps) {
  if (!invoice) return null;

  const lineItems: any[] = invoice.lineItems || [];
  const currency = invoice.currency || "";
  const taxAmount = parseFloat(invoice.gstVatAmount ?? "0") || 0;
  const taxRate = parseFloat(invoice.gstVatRate ?? "0") || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header summary */}
          <div className="flex flex-wrap items-center gap-2">
            {invoice.invoiceCategory && (
              <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[invoice.invoiceCategory] || invoice.invoiceCategory}</Badge>
            )}
            {invoice.status && (
              <Badge className={`${STATUS_COLORS[invoice.status] || "bg-gray-100 text-gray-700"} text-xs capitalize`}>
                {invoice.status}
              </Badge>
            )}
            {invoice.isCrossBorder && (
              <Badge variant="outline" className="text-xs gap-1"><Globe className="h-3 w-3" /> Cross-border</Badge>
            )}
            {invoice.poNumber && (
              <Badge variant="outline" className="text-xs text-blue-700 border-blue-200">PO: {invoice.poNumber}</Badge>
            )}
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-secondary-50 rounded-lg text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 mb-0.5">Raised By</p>
              <p className="font-medium">{invoice.fromBusiness?.name || invoice.fromCountry?.companyName || invoice.fromCountry?.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 mb-0.5">Payable By</p>
              <p className="font-medium">{invoice.toBusiness?.name || "—"}</p>
            </div>
            {invoice.fromCountry?.name && (
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-500 mb-0.5">From Country</p>
                <p className="font-medium">{invoice.fromCountry.name}</p>
              </div>
            )}
            {invoice.serviceType && (
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-500 mb-0.5">Service Type</p>
                <p className="font-medium capitalize">{String(invoice.serviceType).replace(/_/g, " ")}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm border rounded-lg p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Invoice Date</p>
              <p className="font-medium mt-0.5">{fmt(invoice.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</p>
              <p className="font-medium mt-0.5">{fmt(invoice.dueDate)}</p>
            </div>
            {invoice.periodStart && (
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Period Start</p>
                <p className="font-medium mt-0.5">{fmt(invoice.periodStart)}</p>
              </div>
            )}
            {invoice.periodEnd && (
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Period End</p>
                <p className="font-medium mt-0.5">{fmt(invoice.periodEnd)}</p>
              </div>
            )}
          </div>

          {/* Contract / Timesheet links */}
          {(invoice.contract || invoice.timesheet) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm border rounded-lg p-4">
              {invoice.contract && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1"><Building className="h-3 w-3" /> Contract</p>
                  <p className="font-medium mt-0.5 truncate" title={invoice.contract.contractName || invoice.contract.jobTitle || ""}>
                    {invoice.contract.contractName || invoice.contract.jobTitle || "—"}
                  </p>
                  {invoice.contract.rate && (
                    <p className="text-xs text-secondary-600 mt-0.5">
                      {invoice.contract.currency} {invoice.contract.rate} / {invoice.contract.rateType}
                    </p>
                  )}
                </div>
              )}
              {invoice.timesheet && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Timesheet</p>
                  <p className="font-medium mt-0.5">
                    {fmt(invoice.timesheet.periodStart)} – {fmt(invoice.timesheet.periodEnd)}
                  </p>
                  <p className="text-xs text-secondary-600 mt-0.5">
                    {parseFloat(invoice.timesheet.totalHours || "0") > 0 && `${parseFloat(invoice.timesheet.totalHours).toFixed(1)}h`}
                    {parseFloat(invoice.timesheet.totalDays || "0") > 0 && `${parseFloat(invoice.timesheet.totalDays).toFixed(1)}d`}
                    {invoice.timesheet.status && ` · ${String(invoice.timesheet.status).replace(/_/g, " ")}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Worker */}
          {invoice.worker && (
            <div className="border rounded-lg p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1 mb-1"><User className="h-3 w-3" /> Worker</p>
              <p className="font-medium">
                {invoice.worker.firstName} {invoice.worker.lastName}
              </p>
              {invoice.worker.email && (
                <p className="text-xs text-secondary-600 mt-0.5">{invoice.worker.email}</p>
              )}
            </div>
          )}

          {/* Description */}
          {invoice.description && (
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 mb-1">Description</p>
              <p className="text-sm whitespace-pre-wrap text-secondary-800">{invoice.description}</p>
            </div>
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-secondary-50 border-b">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-700">Line Items</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 text-xs text-secondary-600">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li: any, idx: number) => (
                    <tr key={li.id ?? idx} className="border-t">
                      <td className="px-4 py-2">{li.description}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{li.quantity}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{money(li.unitPrice, currency)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{money(li.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-3">
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-6">
                <span className="text-secondary-600">Subtotal</span>
                <span className="font-medium tabular-nums w-32 text-right">{money(invoice.subtotal, currency)}</span>
              </div>
              {(taxAmount > 0 || taxRate > 0) && (
                <div className="flex gap-6">
                  <span className="text-secondary-600">
                    Tax{taxRate > 0 ? ` (${taxRate}%)` : ""}
                  </span>
                  <span className="font-medium tabular-nums w-32 text-right">{money(invoice.gstVatAmount, currency)}</span>
                </div>
              )}
              <Separator className="my-2 w-48" />
              <div className="flex gap-6 text-base font-semibold">
                <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Total</span>
                <span className="tabular-nums w-32 text-right text-primary-600">{money(invoice.totalAmount, currency)}</span>
              </div>
            </div>
          </div>

          {/* Margin (customer_billing only) */}
          {invoice.suggestedMargin && parseFloat(invoice.suggestedMargin) > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
              <span className="font-medium">Suggested margin: </span>
              {money(invoice.suggestedMargin, currency)} — settled separately between SDP and the employing business.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
