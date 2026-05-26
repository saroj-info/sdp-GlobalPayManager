import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  FileText,
  Calendar,
  Hash,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  StickyNote,
  Briefcase,
} from "lucide-react";

interface MarginPaymentDetailsModalProps {
  marginPayment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmtDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

function formatMoney(amount: any, currency = "") {
  const n = parseFloat(amount ?? "0");
  if (!Number.isFinite(n)) return "—";
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: any; label: string }> = {
    paid: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Paid" },
    partial: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Partial" },
    pending: { color: "bg-gray-100 text-gray-700", icon: AlertCircle, label: "Pending" },
  };
  const entry = map[status] || map.pending;
  const Icon = entry.icon;
  return (
    <Badge className={`text-xs ${entry.color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {entry.label}
    </Badge>
  );
}

function Row({ icon: Icon, label, value }: { icon?: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5">
      <span className="text-sm text-secondary-500 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-secondary-900 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export function MarginPaymentDetailsModal({
  marginPayment,
  open,
  onOpenChange,
}: MarginPaymentDetailsModalProps) {
  if (!marginPayment) return null;

  const mp = marginPayment;
  const inv = mp.invoice;
  const ctr = mp.contract;

  const contractLabel = ctr
    ? ctr.contractName || ctr.customRoleTitle || ctr.jobTitle || `Contract ${String(ctr.id).slice(0, 8)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-margin-payment-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Margin Payment Details
          </DialogTitle>
          <DialogDescription>
            Margin owed to your business for invoice {inv?.invoiceNumber || "—"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header — amount + status */}
          <div className="flex items-start justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div>
              <p className="text-xs text-secondary-600 font-medium uppercase tracking-wide">Margin amount</p>
              <p className="text-2xl font-bold text-secondary-900 mt-0.5">
                {formatMoney(mp.marginAmount, mp.currency)}
              </p>
            </div>
            <StatusBadge status={mp.status} />
          </div>

          {/* Margin payment details */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </h3>
            <div className="bg-white border border-secondary-100 rounded-lg px-4 py-2 divide-y divide-secondary-100">
              <Row icon={DollarSign} label="Amount" value={formatMoney(mp.marginAmount, mp.currency)} />
              {mp.suggestedMargin && parseFloat(mp.suggestedMargin) > 0 && (
                <Row label="Suggested margin" value={formatMoney(mp.suggestedMargin, mp.currency)} />
              )}
              <Row icon={Calendar} label="Disbursed on" value={fmtDate(mp.paidDate)} />
              <Row icon={Hash} label="Reference number" value={mp.referenceNumber || "—"} />
              <Row icon={Calendar} label="Recorded on" value={fmtDate(mp.createdAt)} />
              {mp.updatedAt && mp.updatedAt !== mp.createdAt && (
                <Row icon={Calendar} label="Last updated" value={fmtDate(mp.updatedAt)} />
              )}
            </div>
            {mp.notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  Notes
                </p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{mp.notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Invoice details */}
          {inv && (
            <div>
              <h3 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Source Invoice
              </h3>
              <div className="bg-white border border-secondary-100 rounded-lg px-4 py-2 divide-y divide-secondary-100">
                <Row icon={Hash} label="Invoice number" value={inv.invoiceNumber} />
                <Row label="Invoice total" value={formatMoney(inv.totalAmount, inv.currency)} />
                <Row label="Subtotal" value={formatMoney(inv.subtotal, inv.currency)} />
                {inv.gstVatAmount && parseFloat(inv.gstVatAmount) > 0 && (
                  <Row
                    label={`Tax (${parseFloat(inv.gstVatRate || "0").toFixed(2)}%)`}
                    value={formatMoney(inv.gstVatAmount, inv.currency)}
                  />
                )}
                <Row label="Status" value={<Badge className="text-xs capitalize">{inv.status}</Badge>} />
                <Row icon={Calendar} label="Invoice date" value={fmtDate(inv.invoiceDate)} />
                <Row icon={Calendar} label="Due date" value={fmtDate(inv.dueDate)} />
                {inv.periodStart && inv.periodEnd && (
                  <Row
                    icon={Calendar}
                    label="Period"
                    value={`${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}`}
                  />
                )}
                {inv.paidAt && (
                  <Row
                    icon={CheckCircle}
                    label="Client paid SDP"
                    value={<span className="text-green-700">{fmtDate(inv.paidAt)}</span>}
                  />
                )}
                {inv.description && (
                  <Row label="Description" value={<span className="text-xs">{inv.description}</span>} />
                )}
              </div>
            </div>
          )}

          {/* Contract details */}
          {ctr && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Contract
                </h3>
                <div className="bg-white border border-secondary-100 rounded-lg px-4 py-2 divide-y divide-secondary-100">
                  {contractLabel && <Row label="Name" value={contractLabel} />}
                  {ctr.employmentType && (
                    <Row label="Employment type" value={<span className="capitalize">{String(ctr.employmentType).replace(/_/g, " ")}</span>} />
                  )}
                  {ctr.rate && ctr.rateType && (
                    <Row
                      label="Rate"
                      value={`${ctr.currency || mp.currency} ${parseFloat(ctr.rate).toFixed(2)}/${ctr.rateType}`}
                    />
                  )}
                  {ctr.billingMode && (
                    <Row label="Billing mode" value={<span className="capitalize">{String(ctr.billingMode).replace(/_/g, " ")}</span>} />
                  )}
                  {ctr.startDate && <Row icon={Calendar} label="Start date" value={fmtDate(ctr.startDate)} />}
                  {ctr.endDate && <Row icon={Calendar} label="End date" value={fmtDate(ctr.endDate)} />}
                </div>
              </div>
            </>
          )}

        </div>

        <div className="flex justify-end pt-4 border-t border-secondary-100">
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-margin-details">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
