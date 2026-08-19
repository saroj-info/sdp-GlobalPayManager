import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, Download, X } from "lucide-react";

export interface ContractDocumentSummary {
  workerName?: string;
  roleTitle?: string;
  countryName?: string;
  employmentType?: string;
  rate?: string;
  period?: string;
  templateName?: string;
}

interface ContractDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  summary: ContractDocumentSummary;
}

const SUMMARY_FIELDS: Array<{ key: keyof ContractDocumentSummary; label: string }> = [
  { key: "workerName", label: "Worker" },
  { key: "roleTitle", label: "Role" },
  { key: "employmentType", label: "Type" },
  { key: "countryName", label: "Country" },
  { key: "rate", label: "Rate" },
  { key: "period", label: "Period" },
];

function handlePrint(content: string, summary: ContractDocumentSummary) {
  const w = window.open("", "_blank", "width=900,height=700,scrollbars=yes,resizable=yes");
  if (!w) return;
  const safe = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  const heading = [summary.workerName, summary.roleTitle, summary.countryName].filter(Boolean).join(" · ");
  w.document.write(`
    <html>
      <head>
        <title>Contract Document${heading ? ` — ${safe(heading)}` : ""}</title>
        <style>
          @page { margin: 0.75in; }
          body {
            font-family: Georgia, 'Times New Roman', Times, serif;
            line-height: 1.6;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 40px 20px;
            background: #fff;
            color: #1e293b;
            font-size: 15px;
          }
          .contract-body { white-space: pre-wrap; word-wrap: break-word; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="contract-body">${safe(content || "")}</div>
        <script>window.onload = () => { window.focus(); window.print(); };</script>
      </body>
    </html>
  `);
  w.document.close();
}

function handleDownload(content: string, summary: ContractDocumentSummary) {
  const worker = (summary.workerName || "Draft").replace(/[^a-zA-Z0-9-_]+/g, "-");
  const filename = `Contract-${worker}.txt`;
  const blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ContractDocumentModal({ open, onOpenChange, content, summary }: ContractDocumentModalProps) {
  const subtitle = [summary.workerName, summary.roleTitle, summary.countryName].filter(Boolean).join(" · ");
  const filledSummary = SUMMARY_FIELDS.filter(({ key }) => summary[key]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 gap-0"
        data-testid="dialog-contract-document"
      >
        <div className="sticky top-0 z-10 border-b bg-card px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 rounded-md bg-primary/10 p-2 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight">Contract Document</h2>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate" data-testid="text-document-subtitle">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            data-testid="button-document-close-x"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {filledSummary.length > 0 && (
          <div className="mx-6 mt-4 mb-2 p-4 rounded-lg bg-secondary-50 border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {filledSummary.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs uppercase tracking-wide text-secondary-500 mb-0.5">{label}</p>
                  <p className="font-medium break-words">{summary[key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          <div className="bg-white text-slate-900 border rounded-md shadow-sm max-w-[8.5in] mx-auto my-4 p-10 min-h-[60vh]">
            {content ? (
              <div
                className="whitespace-pre-wrap font-serif leading-relaxed text-[15px]"
                data-testid="text-document-content"
              >
                {content}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center text-sm text-slate-500">
                <FileText className="h-10 w-10 mb-3 text-slate-300" />
                <p>No content generated — the template may be missing required variables.</p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-card px-6 py-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="button-document-close"
          >
            Close
          </Button>
          <div className="flex items-center justify-end gap-2 flex-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint(content, summary)}
              disabled={!content}
              data-testid="button-document-print"
              className="whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleDownload(content, summary)}
              disabled={!content}
              data-testid="button-document-download"
              className="whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
