/**
 * In-card empty state — the section keeps its place; the body says why it's
 * empty and (optionally) where to fix that. Real zeros, never sample data.
 */

import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export function EmptyState({ icon: Icon, message, ctaLabel, ctaTo }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 py-6 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {ctaTo && ctaLabel && (
        <Link href={ctaTo} className="text-xs font-medium text-primary hover:underline">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
