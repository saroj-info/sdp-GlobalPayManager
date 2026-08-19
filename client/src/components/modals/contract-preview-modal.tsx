import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, User, Building2, Wallet, FileSignature, X, MinusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PreviewRow {
  label: string;
  value: string | null;
  wide?: boolean;
}

export interface PreviewSection {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle?: string;
  skipped?: boolean;
  emptyMessage?: string;
  rows: PreviewRow[];
}

interface ContractPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headerSubtitle?: string;
  sections: PreviewSection[];
  onGenerate?: () => void;
  onGenerateDisabled?: boolean;
  generateLabel?: string;
  generatePending?: boolean;
}

const STEP_ICON: Record<PreviewSection["step"], LucideIcon> = {
  1: User,
  2: Building2,
  3: Wallet,
  4: FileSignature,
};

function ValueCell({ value }: { value: string | null }) {
  if (value === null || value === "" || value === undefined) {
    return <span className="text-sm text-muted-foreground italic">Not set</span>;
  }
  return <span className="text-sm font-medium text-foreground break-words">{value}</span>;
}

function SectionCard({ section }: { section: PreviewSection }) {
  const Icon = STEP_ICON[section.step];
  return (
    <section
      className="rounded-lg border bg-card overflow-hidden shadow-sm"
      data-testid={`preview-section-${section.step}`}
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-secondary-50">
        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary-500 shrink-0">
              Step {section.step}
            </span>
            <h3 className="text-sm font-semibold text-foreground truncate">{section.title}</h3>
          </div>
          {section.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.subtitle}</p>
          )}
        </div>
      </div>
      {section.skipped ? (
        <div className="px-5 py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <MinusCircle className="h-4 w-4 shrink-0" />
          <span>{section.emptyMessage ?? "Not applicable for this contract."}</span>
        </div>
      ) : section.rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground italic">Nothing captured for this step yet.</div>
      ) : (
        <dl className="divide-y">
          {section.rows.map((row, idx) => (
            <div
              key={`${section.step}-${row.label}-${idx}`}
              className={
                row.wide
                  ? "px-5 py-3"
                  : "px-5 py-3 grid grid-cols-1 sm:grid-cols-[minmax(0,180px)_1fr] gap-1 sm:gap-4 items-start"
              }
            >
              <dt className="text-xs uppercase tracking-wide text-secondary-500 font-medium">
                {row.label}
              </dt>
              <dd className={row.wide ? "mt-1" : ""}>
                <ValueCell value={row.value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function ContractPreviewModal({
  open,
  onOpenChange,
  headerSubtitle,
  sections,
  onGenerate,
  onGenerateDisabled,
  generateLabel = "Generate Document",
  generatePending,
}: ContractPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 gap-0"
        data-testid="dialog-contract-preview"
      >
        <div className="sticky top-0 z-10 border-b bg-card px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 rounded-md bg-primary/10 p-2 shrink-0">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight">Contract Preview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {headerSubtitle ?? "Review every step before you create the contract."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            data-testid="button-preview-close-x"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-5 space-y-4 bg-muted/30">
          {sections.map((section) => (
            <SectionCard key={section.step} section={section} />
          ))}
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-card px-6 py-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="button-preview-close"
          >
            Close
          </Button>
          {onGenerate && (
            <Button
              type="button"
              size="sm"
              onClick={onGenerate}
              disabled={onGenerateDisabled}
              data-testid="button-preview-generate"
              className="whitespace-nowrap"
            >
              {generatePending ? "Generating…" : generateLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
