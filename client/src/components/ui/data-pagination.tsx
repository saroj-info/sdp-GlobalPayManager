import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Pluralised noun shown in the summary line, e.g. "contracts". Defaults to "items". */
  label?: string;
  /** Hide the bar entirely when there's nothing or only a single page. Default true. */
  hideWhenSinglePage?: boolean;
  className?: string;
}

/**
 * Build a compact list of page numbers around the current page with ellipses for gaps.
 * Examples:
 *   1 page  → [1]
 *   3 pages, on 2  → [1, 2, 3]
 *   12 pages, on 6 → [1, '…', 5, 6, 7, '…', 12]
 */
function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("ellipsis");
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function DataPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  label = "items",
  hideWhenSinglePage = true,
  className,
}: DataPaginationProps) {
  if (hideWhenSinglePage && totalPages <= 1) return null;

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const onGoTo = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    onPageChange(next);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 ${className || ""}`}>
      <p className="text-xs text-muted-foreground" data-testid="pagination-summary">
        Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{totalItems}</span> {label}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              role="button"
              onClick={(e) => { e.preventDefault(); onGoTo(page - 1); }}
              className={page === 1 ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"}
              aria-disabled={page === 1}
            />
          </PaginationItem>
          {buildPageList(page, totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  role="button"
                  isActive={p === page}
                  onClick={(e) => { e.preventDefault(); onGoTo(p); }}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              role="button"
              onClick={(e) => { e.preventDefault(); onGoTo(page + 1); }}
              className={page === totalPages ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"}
              aria-disabled={page === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
