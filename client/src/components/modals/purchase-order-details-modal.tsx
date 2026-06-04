import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  FileText,
  DollarSign,
  Calendar,
  Hash,
  Briefcase,
  User,
  Building,
  StickyNote,
  TrendingUp,
} from "lucide-react";

interface PurchaseOrderDetailsModalProps {
  po: any | null;
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

function statusColor(status: string): string {
  switch (status) {
    case "open": return "bg-green-100 text-green-800";
    case "exhausted": return "bg-red-100 text-red-800";
    case "closed": return "bg-gray-100 text-gray-700";
    case "cancelled": return "bg-amber-100 text-amber-800";
    default: return "bg-gray-100 text-gray-700";
  }
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

export function PurchaseOrderDetailsModal({ po, open, onOpenChange }: PurchaseOrderDetailsModalProps) {
  if (!po) return null;

  const auth = parseFloat(po.authorisedValue || "0");
  const invoiced = parseFloat(po.invoicedToDate || "0");
  const remaining = auth - invoiced;
  const pct = auth > 0 ? Math.min(100, Math.max(0, (invoiced / auth) * 100)) : 0;

  const contract = po.contract;
  const contractLabel = contract
    ? (contract.contractName || contract.customRoleTitle || contract.jobTitle || `Contract ${String(contract.id).slice(0, 8)}`)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-purchase-order-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Purchase Order Details
          </DialogTitle>
          <DialogDescription>
            PO {po.poNumber}{po.sowNumber ? ` · SOW ${po.sowNumber}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Hero — authorised total + status + progress bar */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-xs text-secondary-600 font-medium uppercase tracking-wide">Authorised value</p>
                <p className="text-2xl font-bold text-secondary-900 mt-0.5">
                  {formatMoney(po.authorisedValue, po.currency)}
                </p>
                <p className="text-xs text-secondary-600 mt-1">{po.projectName}</p>
              </div>
              <Badge className={`text-xs whitespace-nowrap ${statusColor(po.status)}`}>
                <span className="capitalize">{po.status || "open"}</span>
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-secondary-600">
                  Invoiced: <span className="font-medium text-secondary-900">{formatMoney(po.invoicedToDate, po.currency)}</span>
                </span>
                <span className="text-secondary-600">
                  Remaining: <span className={`font-medium ${remaining <= 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatMoney(remaining, po.currency)}
                  </span>
                </span>
              </div>
              <div className="h-2 bg-white/70 rounded-full overflow-hidden">
                <div
                  className={`h-full ${remaining <= 0 ? "bg-red-500" : "bg-blue-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-right text-xs text-secondary-500">{pct.toFixed(1)}% utilised</div>
            </div>
          </div>

          {/* PO core details */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Purchase Order
            </h3>
            <div className="bg-white border border-secondary-100 rounded-lg px-4 py-2 divide-y divide-secondary-100">
              <Row icon={Hash} label="PO number" value={po.poNumber} />
              <Row label="SOW number" value={po.sowNumber || "—"} />
              <Row icon={Briefcase} label="Project" value={po.projectName} />
              <Row icon={DollarSign} label="Currency" value={po.currency} />
              <Row icon={DollarSign} label="Authorised value" value={formatMoney(po.authorisedValue, po.currency)} />
              <Row icon={TrendingUp} label="Invoiced to date" value={formatMoney(po.invoicedToDate, po.currency)} />
              <Row label="Remaining" value={
                <span className={remaining <= 0 ? "text-red-700" : "text-green-700"}>
                  {formatMoney(remaining, po.currency)}
                </span>
              } />
              <Row icon={Calendar} label="Start date" value={fmtDate(po.startDate)} />
              <Row icon={Calendar} label="End date" value={fmtDate(po.endDate)} />
              <Row icon={Calendar} label="Created" value={fmtDate(po.createdAt)} />
              {po.updatedAt && po.updatedAt !== po.createdAt && (
                <Row icon={Calendar} label="Last updated" value={fmtDate(po.updatedAt)} />
              )}
            </div>
            {po.notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  Notes
                </p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{po.notes}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Worker + Business */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Worker & Business
            </h3>
            <div className="bg-white border border-secondary-100 rounded-lg px-4 py-2 divide-y divide-secondary-100">
              <Row icon={User} label="Worker" value={po.contractWorkerName || "—"} />
              {po.workerEmail && <Row label="Worker email" value={po.workerEmail} />}
              <Row icon={Building} label="Employing business" value={po.businessName || "—"} />
            </div>
          </div>

          {/* Contract details */}
          {contract && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Contract
                </h3>
                <div className="bg-white border border-secondary-100 rounded-lg px-4 py-2 divide-y divide-secondary-100">
                  {contractLabel && <Row label="Name" value={contractLabel} />}
                  {contract.employmentType && (
                    <Row label="Employment type" value={<span className="capitalize">{String(contract.employmentType).replace(/_/g, " ")}</span>} />
                  )}
                  {contract.rate && contract.rateType && (
                    <Row label="Rate" value={`${contract.currency || po.currency} ${parseFloat(contract.rate).toFixed(2)}/${contract.rateType}`} />
                  )}
                  {contract.rateStructure && (
                    <Row label="Rate structure" value={<span className="capitalize">{String(contract.rateStructure).replace(/_/g, " ")}</span>} />
                  )}
                  {contract.billingMode && (
                    <Row label="Billing mode" value={<span className="capitalize">{String(contract.billingMode).replace(/_/g, " ")}</span>} />
                  )}
                  {contract.isForClient !== undefined && (
                    <Row label="Has host client" value={contract.isForClient ? "Yes" : "No"} />
                  )}
                  {contract.startDate && <Row icon={Calendar} label="Start date" value={fmtDate(contract.startDate)} />}
                  {contract.endDate && <Row icon={Calendar} label="End date" value={fmtDate(contract.endDate)} />}
                  {contract.status && (
                    <Row label="Status" value={<Badge className="text-xs capitalize">{contract.status}</Badge>} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-secondary-100">
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-po-details">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
