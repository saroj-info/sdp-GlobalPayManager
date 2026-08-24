import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Debounce a value — used to throttle worker search keystrokes before they
// hit the server. 250ms keeps typing responsive without thrashing the API.
function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface WorkerComboboxProps {
  value: string;
  onChange: (workerId: string, worker: any) => void;
  /** When set, restricts the worker list to this business. */
  businessId?: string;
  disabled?: boolean;
  placeholder?: string;
  testId?: string;
  /**
   * Optional pre-fetched worker object to seed the label when `value` is
   * already set but the popover hasn't been opened (e.g. when reopening an
   * Edit dialog with a worker selected). Lets the trigger show the correct
   * name without forcing the workers list to fetch on mount.
   */
  initialWorker?: { id: string; firstName?: string; lastName?: string; email?: string } | null;
  /**
   * When true (and combined with `businessId`), the picker also surfaces
   * SDP-direct workers as sharing candidates. Use in flows where the caller
   * is drafting an on-behalf contract that can share an SDP employee into
   * the picked business. Default false — payslips / leave-requests / any
   * "workers already on this business" flow keeps it off.
   */
  includeSdpCandidates?: boolean;
}

/**
 * Server-paginated, debounced worker picker. Hits /api/workers/list with
 * search + optional businessId so it scales to thousands of workers without
 * loading the full list at once. Shows "Load more (N of total)" to fetch
 * additional pages incrementally.
 */
export function WorkerCombobox({
  value,
  onChange,
  businessId,
  disabled,
  placeholder = 'Select worker…',
  testId,
  initialWorker,
  includeSdpCandidates,
}: WorkerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 250);
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<any[]>([]);

  // Reset to first page whenever the filter changes.
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch, businessId]);

  const enabled = open;
  const { data, isFetching } = useQuery<{ items: any[]; total: number; page: number; pageSize: number }>({
    queryKey: ['/api/workers/list', { search: debouncedSearch, businessId, page, pageSize: 20, includeSdpCandidates: !!includeSdpCandidates }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', '20');
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (businessId) qs.set('businessId', businessId);
      if (includeSdpCandidates) qs.set('includeSdpCandidates', 'true');
      return (await apiRequest('GET', `/api/workers/list?${qs.toString()}`)).json();
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  // Accumulate pages so "Load more" appends rather than replaces.
  useEffect(() => {
    if (!data?.items) return;
    setAccumulated((prev) =>
      page === 1
        ? data.items
        : [...prev, ...data.items.filter((i: any) => !prev.some((p) => p.id === i.id))],
    );
  }, [data, page]);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    // Prefer a freshly-fetched row (handles the case where the user just
    // searched and picked a different worker). Fall back to the seeded
    // `initialWorker` when the popover hasn't been opened yet so the
    // Edit dialog displays the existing worker without needing the list
    // to load first.
    const fromList = accumulated.find((w: any) => w.id === value);
    const w = fromList || (initialWorker && initialWorker.id === value ? initialWorker : null);
    if (!w) return '';
    return `${w.firstName ?? ''} ${w.lastName ?? ''}`.trim();
  }, [accumulated, value, initialWorker]);

  const total = data?.total ?? 0;
  const canLoadMore = accumulated.length > 0 && accumulated.length < total && !isFetching;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
          data-testid={testId}
        >
          {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search workers by name or email…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && accumulated.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading workers…
              </div>
            ) : accumulated.length === 0 ? (
              <CommandEmpty>No workers found.</CommandEmpty>
            ) : (
              <>
                <CommandGroup>
                  {accumulated.map((w: any) => (
                    <CommandItem
                      key={w.id}
                      value={w.id}
                      onSelect={() => {
                        onChange(w.id, w);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value === w.id ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                          {w.firstName} {w.lastName}
                          {w.business?.isSdpOwned && (
                            <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded border border-primary-300 text-primary-700">
                              SDP
                            </span>
                          )}
                        </span>
                        {w.email && (
                          <span className="text-xs text-muted-foreground">{w.email}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {(canLoadMore || isFetching) && (
                  <div className="border-t p-2 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!canLoadMore}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {isFetching ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading…</>
                      ) : (
                        <>Load more ({accumulated.length} of {total})</>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
