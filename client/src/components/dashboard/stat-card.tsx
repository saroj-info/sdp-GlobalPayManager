/**
 * The one KPI primitive for every dashboard — uniformity is the design.
 * All colors are theme tokens so light/dark both work.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  onClick?: () => void;
  testId: string;
}

export function StatCard({ label, value, hint, icon: Icon, onClick, testId }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm p-5",
        onClick && "cursor-pointer transition-colors hover:border-primary/40",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums leading-none">{value}</p>
          {hint && <p className="mt-2 text-xs text-muted-foreground truncate">{hint}</p>}
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}
