/**
 * Titled card wrapping one chart or list. Header row (title, subtitle,
 * optional "View all →" link) + body. Fixed-height bodies come from the
 * children (charts use h-[280px]).
 */

import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  className?: string;
  testId: string;
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, linkTo, linkLabel, className, testId, children }: ChartCardProps) {
  return (
    <section
      className={cn("rounded-xl border bg-card text-card-foreground shadow-sm p-5 min-w-0", className)}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
          {subtitle && <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link
            href={linkTo}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {linkLabel ?? "View all"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
