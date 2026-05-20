import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar, User, Building, DollarSign, FileText, ExternalLink, ImageOff, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PayslipDetailsModalProps {
  payslip: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function formatMoney(amount: any, currency = "") {
  const n = parseFloat(amount ?? "0");
  if (!Number.isFinite(n)) return "—";
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

// Decide how to embed the uploaded document. Image extensions → <img>;
// PDFs and "unknown" → <iframe> (iframes render images, PDFs, plain text
// inline so an unknown content type still previews cleanly). Stored URLs
// from the GCS proxy route (`/objects/<id>`) carry no extension, which
// is why "unknown" defaults to iframe rather than a bare download link.
function classifyAsset(url: string): "image" | "iframe" {
  const lower = url.toLowerCase().split("?")[0];
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(lower)) return "image";
  return "iframe";
}

export function PayslipDetailsModal({ payslip, open, onOpenChange }: PayslipDetailsModalProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Fetch a short-lived presigned GCS GET URL via the auth'd API.
  // The browser can't send Authorization on iframe/img requests, so we
  // need a self-validating URL the browser can load directly.
  const { data: downloadData, isFetching: isFetchingUrl } = useQuery<{ url: string }>({
    queryKey: ['/api/payslips', payslip?.id, 'download-url'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/payslips/${payslip!.id}/download-url`);
      return res.json();
    },
    enabled: open && !!payslip?.id && !!payslip?.payslipFileUrl,
  });

  const docUrl: string | null = downloadData?.url ?? null;

  const docKind = useMemo(
    () => (docUrl ? classifyAsset(String(docUrl)) : "iframe"),
    [docUrl],
  );

  if (!payslip) return null;

  const currency = payslip.worker?.country?.currency || payslip.currency || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payslip Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Worker + business summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-secondary-50 rounded-lg text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1 mb-0.5">
                <User className="h-3 w-3" /> Worker
              </p>
              <p className="font-medium">
                {payslip.worker?.firstName} {payslip.worker?.lastName}
              </p>
              {payslip.worker?.country?.name && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {payslip.worker.country.name}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1 mb-0.5">
                <Building className="h-3 w-3" /> Business
              </p>
              <p className="font-medium">{payslip.business?.name || "—"}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3 text-sm border rounded-lg p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Pay Date
              </p>
              <p className="font-medium mt-0.5">{fmtDate(payslip.payDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Period Start
              </p>
              <p className="font-medium mt-0.5">{fmtDate(payslip.payPeriodStart)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Period End
              </p>
              <p className="font-medium mt-0.5">{fmtDate(payslip.payPeriodEnd)}</p>
            </div>
          </div>

          {/* Money */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-secondary-50 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-700 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Earnings
              </p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Gross Taxable Wages</span>
                <span className="font-medium tabular-nums">{formatMoney(payslip.grossTaxableWages, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Tax</span>
                <span className="font-medium tabular-nums">{formatMoney(payslip.tax, currency)}</span>
              </div>
              {parseFloat(payslip.superannuation ?? "0") > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary-600">Superannuation (AU)</span>
                  <span className="font-medium tabular-nums">{formatMoney(payslip.superannuation, currency)}</span>
                </div>
              )}
              {parseFloat(payslip.providentFund ?? "0") > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary-600">Provident Fund</span>
                  <span className="font-medium tabular-nums">{formatMoney(payslip.providentFund, currency)}</span>
                </div>
              )}
              {parseFloat(payslip.kiwiSaver ?? "0") > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary-600">KiwiSaver (NZ)</span>
                  <span className="font-medium tabular-nums">{formatMoney(payslip.kiwiSaver, currency)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-base font-semibold">
                <span>Net Pay</span>
                <span className="tabular-nums text-primary-600">{formatMoney(payslip.netPay, currency)}</span>
              </div>
            </div>
          </div>

          {/* Document preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-secondary-50 border-b flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary-700">Document</p>
              {docUrl && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <a href={docUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Open in new tab
                  </a>
                </Button>
              )}
            </div>
            <div className="p-4 bg-gray-50 min-h-[260px] flex items-center justify-center">
              {!payslip.payslipFileUrl ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ImageOff className="h-4 w-4" /> No document uploaded for this payslip.
                </div>
              ) : isFetchingUrl || !docUrl ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing document…
                </div>
              ) : docKind === "image" ? (
                imgFailed ? (
                  <a href={docUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-700 underline">
                    Document failed to render inline — open file
                  </a>
                ) : (
                  <img
                    src={docUrl}
                    alt="Payslip document"
                    className="max-h-[60vh] w-auto rounded border bg-white object-contain"
                    onError={() => setImgFailed(true)}
                  />
                )
              ) : (
                <iframe
                  src={docUrl}
                  title="Payslip document"
                  className="w-full h-[60vh] rounded border bg-white"
                />
              )}
            </div>
          </div>

          {/* Audit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-secondary-600">
            <div>Uploaded by: <span className="font-medium text-secondary-800">{payslip.uploadedByUser?.firstName || payslip.uploadedByUser?.email || "—"}</span></div>
            <div>Created: <span className="font-medium text-secondary-800">{fmtDate(payslip.createdAt)}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
