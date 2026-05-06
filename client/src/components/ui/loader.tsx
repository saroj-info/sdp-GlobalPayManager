import { cn } from "@/lib/utils";

interface LoaderProps {
  /** Visual size of the spinner. Defaults to "md". */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Optional caption shown next to / below the spinner. */
  label?: string;
  /** Center the loader inside a full container or viewport block. */
  fullPage?: boolean;
  /** Stack the label below the spinner instead of inline. */
  vertical?: boolean;
  /** Override the colour for the moving stroke (defaults to primary). */
  className?: string;
}

const SIZE_MAP: Record<NonNullable<LoaderProps["size"]>, { ring: string; border: string; gap: string; text: string }> = {
  xs: { ring: "h-4 w-4", border: "border-2", gap: "gap-2", text: "text-xs" },
  sm: { ring: "h-6 w-6", border: "border-[3px]", gap: "gap-2.5", text: "text-sm" },
  md: { ring: "h-10 w-10", border: "border-[3px]", gap: "gap-3", text: "text-sm" },
  lg: { ring: "h-14 w-14", border: "border-4", gap: "gap-3.5", text: "text-base" },
  xl: { ring: "h-20 w-20", border: "border-[5px]", gap: "gap-4", text: "text-lg" },
};

export function Loader({ size = "md", label, fullPage = false, vertical = false, className }: LoaderProps) {
  const sz = SIZE_MAP[size];

  const spinner = (
    <span
      className={cn(
        "inline-block rounded-full border-primary/20 border-t-primary animate-spin",
        sz.ring,
        sz.border,
        className
      )}
      role="status"
      aria-label={label || "Loading"}
    />
  );

  const content = (
    <div
      className={cn(
        "inline-flex items-center text-muted-foreground",
        vertical ? "flex-col" : "flex-row",
        sz.gap,
      )}
    >
      {spinner}
      {label ? <span className={cn("font-medium tracking-tight", sz.text)}>{label}</span> : null}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex w-full min-h-[180px] items-center justify-center py-8">
        {content}
      </div>
    );
  }

  return content;
}

/** Page-level loader that centers itself within the available viewport height. */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-8rem)] w-full py-12">
      <Loader size="lg" label={label || "Loading…"} vertical />
    </div>
  );
}

/** Tiny inline loader for inside buttons (no label by default). */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-3 w-3 rounded-full border-2 border-current/30 border-t-current animate-spin",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
