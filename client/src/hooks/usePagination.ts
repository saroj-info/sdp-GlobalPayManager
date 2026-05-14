import { useState, useMemo } from "react";

/**
 * Client-side pagination over an already-filtered+sorted list.
 *
 * The consumer keeps doing its filtering / sorting as before — this hook just
 * slices the final array and tracks page state. Returns a `pageItems` slice for
 * the consumer to render and the props you pass straight into <DataPagination>.
 *
 * Usage:
 *   const { pageItems, page, setPage, pageSize, totalPages, totalItems } = usePagination(filtered);
 *   {pageItems.map(...)}
 *   <DataPagination page={page} onPageChange={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
 */
export function usePagination<T>(items: T[], opts?: { pageSize?: number; initialPage?: number }) {
  const pageSize = opts?.pageSize ?? 10;
  const [page, setPage] = useState(opts?.initialPage ?? 1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // Clamp to the valid range so a filter change that shrinks the list doesn't strand the user on an empty page.
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    pageItems,
    page: safePage,
    setPage,
    pageSize,
    totalPages,
    totalItems,
  };
}
