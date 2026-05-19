import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessComboboxProps {
  value: string | null;
  onChange: (businessId: string | null, business: any | null) => void;
  disabled?: boolean;
  placeholder?: string;
  testId?: string;
  /** When true, shows an inline "Clear" button on the trigger so the caller
   *  can wipe the selection. Useful for optional filters. */
  clearable?: boolean;
}

/**
 * Business picker with client-side search + virtualisation-friendly list.
 * Backed by `/api/businesses` which returns the full list — businesses are
 * typically a small dataset (< few hundred) so client-side filtering is fine.
 * If that ever changes, swap to a server-paginated endpoint like the
 * WorkerCombobox does.
 */
export function BusinessCombobox({
  value,
  onChange,
  disabled,
  placeholder = 'Select business…',
  testId,
  clearable = false,
}: BusinessComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: businesses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/businesses'],
  });

  // Lowercase search filter on name. We disable Command's built-in filter
  // (shouldFilter={false}) so this is the single source of truth and we can
  // expand to email/code etc. later without fighting cmdk.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b: any) => (b?.name ?? '').toLowerCase().includes(q));
  }, [businesses, search]);

  const selectedLabel = useMemo(() => {
    const b = businesses.find((b: any) => b.id === value);
    return b?.name ?? '';
  }, [businesses, value]);

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
          <div className="flex items-center gap-1">
            {clearable && value && (
              <span
                role="button"
                aria-label="Clear selection"
                className="rounded p-0.5 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null, null);
                }}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search businesses…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading businesses…
              </div>
            ) : filtered.length === 0 ? (
              <CommandEmpty>No businesses found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((b: any) => (
                  <CommandItem
                    key={b.id}
                    value={b.id}
                    onSelect={() => {
                      onChange(b.id, b);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === b.id ? 'opacity-100' : 'opacity-0')} />
                    {b.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
