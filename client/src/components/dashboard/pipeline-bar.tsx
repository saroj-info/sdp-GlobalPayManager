/**
 * Timesheet pipeline — one segmented horizontal bar + a count legend.
 * State never rides on color alone: every segment is named with its count
 * in the legend below (the bar is the magnitude read, the legend the key).
 */

import type { TimesheetPipeline } from "@shared/dashboard";
import { EmptyState } from "./empty-state";
import { ClipboardList } from "lucide-react";

const SEGMENTS: Array<{ key: keyof TimesheetPipeline; label: string; color: string }> = [
  { key: "draft", label: "Draft", color: "var(--chart-1)" },
  { key: "submitted", label: "Submitted", color: "var(--chart-4)" },
  { key: "approved", label: "Approved", color: "var(--chart-6)" },
  { key: "rejected", label: "Rejected", color: "var(--chart-8)" },
];

export function PipelineBar({ pipeline }: { pipeline: TimesheetPipeline }) {
  const total = SEGMENTS.reduce((sum, s) => sum + pipeline[s.key], 0);

  if (total === 0) {
    return <EmptyState icon={ClipboardList} message="No timesheets yet" />;
  }

  return (
    <div>
      {/* 2px surface gaps between fills so adjacent segments never touch */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${total} timesheets`}>
        {SEGMENTS.filter(s => pipeline[s.key] > 0).map(s => (
          <div
            key={s.key}
            className="h-full rounded-sm"
            style={{ backgroundColor: s.color, flexGrow: pipeline[s.key], flexBasis: 8 }}
            title={`${s.label}: ${pipeline[s.key]}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {SEGMENTS.map(s => (
          <div key={s.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-medium tabular-nums">{pipeline[s.key]}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{total} total</p>
    </div>
  );
}
