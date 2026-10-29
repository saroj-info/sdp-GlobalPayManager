/**
 * Cost Settings (Templates → Cost Settings): the statutory / employer cost
 * items per country — country-wide and per state — that every new quote, the
 * /resources calculator, the wizard's country panel and the AI country tools
 * read. Super admin / admin edit; agents see it read-only. Save replaces the
 * country's whole set (PUT /api/admin/country-costs/:countryId).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, MapPin, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { apiRequest, extractApiErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Country } from "@shared/schema";
import {
  COST_APPLIES_TO,
  COST_APPLIES_TO_SHORT_LABELS,
  COST_CALC_TYPES,
  COST_CALC_TYPE_LABELS,
  newCostItemKey,
  type CostAppliesTo,
  type CostCalcType,
  type CountryCostItem,
  type CountryCostsResponse,
} from "@shared/countryCosts";
import { AutoGrowTextarea, LINE_CELL_LABEL, LINE_ROW_BOX, LINE_ROW_GRID } from "@/components/quotes/cost-lines-table";

const ADMIN_PREFIX = "/api/admin/country-costs";
const COUNTRY_WIDE = "";

type LocalItem = CountryCostItem;

function numberOrNull(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function newItem(countryId: string, stateProvince: string | null, sortOrder: number): LocalItem {
  return {
    id: `new:${Math.random().toString(36).slice(2, 10)}`,
    countryId,
    stateProvince,
    itemKey: newCostItemKey(),
    name: "",
    description: "",
    appliesTo: stateProvince ? [...COST_APPLIES_TO] : ["employment"],
    calcType: "percent",
    value: 0,
    capAmount: null,
    sortOrder,
    isActive: true,
  };
}

export function CountryCostSettingsPanel() {
  const { user } = useAuth();
  const sdpRole = (user as any)?.sdpRole;
  const isSdp = (user as any)?.userType === "sdp_internal";
  const isAdmin = sdpRole === "sdp_super_admin" || sdpRole === "sdp_admin";
  const readOnly = !isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: countriesData = [] } = useQuery<Country[]>({ queryKey: ["/api/countries"], enabled: isSdp });
  const countries = useMemo(() => countriesData.filter((c) => c.isActive !== false), [countriesData]);
  const [countryId, setCountryId] = useState("");
  useEffect(() => {
    if (!countryId && countries.length) setCountryId(countries.find((c) => c.id === "au")?.id ?? countries[0].id);
  }, [countries, countryId]);
  const country = countries.find((c) => c.id === countryId) ?? null;
  const currency = country?.currency ?? "";

  const { data, isLoading, error } = useQuery<CountryCostsResponse>({
    queryKey: [ADMIN_PREFIX, countryId],
    enabled: isSdp && !!countryId,
    staleTime: 0,
  });

  const [items, setItems] = useState<LocalItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);

  useEffect(() => {
    if (dirty || !data || data.countryId !== countryId) return;
    setItems(data.items);
  }, [data, dirty, countryId]);

  const switchCountry = (id: string) => {
    if (dirty && !window.confirm("Discard the unsaved changes on this country?")) return;
    setDirty(false);
    setItems([]);
    setCountryId(id);
  };

  const states = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const i of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const s = i.stateProvince?.trim();
      if (!s || seen.has(s.toLowerCase())) continue;
      seen.add(s.toLowerCase());
      out.push(s);
    }
    return out;
  }, [items]);

  const change = (next: LocalItem[]) => {
    setDirty(true);
    setItems(next);
  };
  const patch = (id: string, p: Partial<LocalItem>) => change(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id: string) => change(items.filter((i) => i.id !== id));
  const nextSort = () => items.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
  const addItem = (stateProvince: string | null) => change([...items, newItem(countryId, stateProvince, nextSort())]);
  const addState = () => {
    const name = newStateName.trim();
    if (!name) return;
    if (states.some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast({ title: "That state already has items", description: "Add an item under it instead.", variant: "destructive" });
      return;
    }
    change([...items, newItem(countryId, name, nextSort())]);
    setNewStateName("");
  };
  const toggleApplies = (item: LocalItem, cat: CostAppliesTo) => {
    const has = item.appliesTo.includes(cat);
    const next = has ? item.appliesTo.filter((c) => c !== cat) : [...item.appliesTo, cat];
    patch(item.id, { appliesTo: COST_APPLIES_TO.filter((c) => next.includes(c)) });
  };

  const invalid = items.find((i) => !i.name.trim() || i.appliesTo.length === 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: [...items]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i, idx) => ({
            id: i.id.startsWith("new:") ? null : i.id,
            stateProvince: i.stateProvince?.trim() || null,
            itemKey: i.itemKey,
            name: i.name.trim(),
            description: i.description.trim(),
            appliesTo: i.appliesTo,
            calcType: i.calcType,
            value: i.value,
            capAmount: i.calcType === "percent_with_cap" ? i.capAmount : null,
            sortOrder: idx,
            isActive: i.isActive,
          })),
      };
      const res = await apiRequest("PUT", `${ADMIN_PREFIX}/${countryId}`, payload);
      return (await res.json()) as CountryCostsResponse;
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData([ADMIN_PREFIX, countryId], saved);
      setItems(saved.items);
      setDirty(false);
      toast({ title: "Cost settings saved", description: `${saved.items.length} item${saved.items.length === 1 ? "" : "s"} for ${country?.name ?? countryId}.` });
      await invalidateReaders();
    },
    onError: (err: any) => toast({ title: "Could not save the cost settings", description: extractApiErrorMessage(err, "Please check the items and try again."), variant: "destructive" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => (await (await apiRequest("POST", `${ADMIN_PREFIX}/${countryId}/restore-defaults`)).json()) as CountryCostsResponse,
    onSuccess: async (saved) => {
      queryClient.setQueryData([ADMIN_PREFIX, countryId], saved);
      setItems(saved.items);
      setDirty(false);
      setRestoreOpen(false);
      toast({ title: "Defaults restored", description: `${saved.items.length} default items loaded for ${country?.name ?? countryId}.` });
      await invalidateReaders();
    },
    onError: (err: any) => {
      setRestoreOpen(false);
      toast({ title: "Could not restore the defaults", description: extractApiErrorMessage(err, "Please try again."), variant: "destructive" });
    },
  });

  async function invalidateReaders() {
    await queryClient.invalidateQueries({
      predicate: (q) =>
        typeof q.queryKey[0] === "string" &&
        (q.queryKey[0].startsWith(ADMIN_PREFIX) || q.queryKey[0].startsWith("/api/country-costs") || q.queryKey[0].startsWith("/api/quotes/defaults")),
    });
  }

  const renderGroup = (title: string, stateProvince: string | null, groupItems: LocalItem[], testId: string) => (
    <div key={stateProvince ?? COUNTRY_WIDE} className="space-y-2" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-secondary-900">
          {stateProvince ? <MapPin className="h-4 w-4 text-secondary-500" /> : null}
          {title}
          <Badge variant="outline" className="px-1.5 text-[10px] font-medium">{groupItems.length}</Badge>
        </h4>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addItem(stateProvince)} data-testid={stateProvince ? `button-add-cost-item-${stateProvince}` : "button-add-cost-item"}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add item
          </Button>
        )}
      </div>
      {groupItems.length === 0 && (
        <p className="rounded-md border border-dashed border-secondary-200 p-3 text-sm text-secondary-500">No items yet.</p>
      )}
      {groupItems.map((item, idx) => {
        const first = idx === 0;
        const needsCap = item.calcType === "percent_with_cap";
        return (
          <div key={item.id} className={cn(LINE_ROW_BOX, !item.isActive && "bg-white opacity-70")} data-testid="cost-item-row">
            <div className={LINE_ROW_GRID}>
              <div className="col-span-4">
                {first && <Label className={LINE_CELL_LABEL}>Item</Label>}
                <Input
                  className="h-9 min-w-0 text-sm"
                  value={item.name}
                  disabled={readOnly}
                  onChange={(e) => patch(item.id, { name: e.target.value })}
                  placeholder="e.g. Superannuation Guarantee"
                  data-testid="cost-item-name"
                />
              </div>
              <div className="col-span-3">
                {first && <Label className={LINE_CELL_LABEL}>Applies to</Label>}
                <div className="flex h-9 items-center gap-1">
                  {COST_APPLIES_TO.map((cat) => {
                    const on = item.appliesTo.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleApplies(item, cat)}
                        title={COST_APPLIES_TO_SHORT_LABELS[cat]}
                        className={cn(
                          "h-7 rounded border px-1.5 text-[10px] font-medium leading-none transition-colors",
                          on ? "border-primary-600 bg-primary-600 text-white" : "border-secondary-200 bg-white text-secondary-500",
                          readOnly && "cursor-default",
                        )}
                        data-testid={`cost-item-applies-${cat}`}
                        aria-pressed={on}
                      >
                        {cat === "employment" ? "Employment" : cat === "contractor_standard" ? "Contractor" : "CoR"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-2">
                {first && <Label className={LINE_CELL_LABEL}>Type</Label>}
                <Select value={item.calcType} disabled={readOnly} onValueChange={(v) => patch(item.id, { calcType: v as CostCalcType })}>
                  <SelectTrigger className="h-9 text-sm" data-testid="cost-item-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CALC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{COST_CALC_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                {first && <Label className={LINE_CELL_LABEL}>Rate / value</Label>}
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-9 pr-8 text-right text-sm tabular-nums"
                    value={item.value}
                    disabled={readOnly}
                    onChange={(e) => patch(item.id, { value: numberOrNull(e.target.value) ?? 0 })}
                    data-testid="cost-item-value"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-secondary-500">
                    {item.calcType === "flat" ? currency : "%"}
                  </span>
                </div>
              </div>
              <div className="col-span-1">
                {first && <Label className={cn(LINE_CELL_LABEL, "text-center")}>Active</Label>}
                <div className="flex h-9 items-center justify-center">
                  <Switch checked={item.isActive} disabled={readOnly} onCheckedChange={(v) => patch(item.id, { isActive: v })} data-testid="cost-item-active" />
                </div>
              </div>
            </div>
            <div className="mt-1.5">
              <AutoGrowTextarea
                value={item.description}
                disabled={readOnly}
                onChange={(v) => patch(item.id, { description: v })}
                placeholder="Full description shown on quotes, the calculator and the country panel"
                data-testid="cost-item-description"
              />
            </div>
            {needsCap && (
              <div className={cn(LINE_ROW_GRID, "mt-2")}>
                <div className="col-span-4">
                  <Label className={LINE_CELL_LABEL}>Cap ({currency} per year)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 text-right text-sm tabular-nums"
                    value={item.capAmount ?? ""}
                    disabled={readOnly}
                    onChange={(e) => patch(item.id, { capAmount: numberOrNull(e.target.value) })}
                    data-testid="cost-item-cap"
                  />
                </div>
                <div className="col-span-8 flex h-8 items-center text-xs text-secondary-500">Applied to pay up to the cap.</div>
              </div>
            )}
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0 text-secondary-500 hover:text-destructive"
                onClick={() => remove(item.id)}
                aria-label="Remove item"
                data-testid="cost-item-remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );

  const countryWide = [...items].filter((i) => !i.stateProvince).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card data-testid="panel-cost-settings">
      <CardHeader>
        <CardTitle className="text-base">Cost Settings — statutory and employer cost items</CardTitle>
        <CardDescription>
          The items a new quote starts with for each engagement category, country-wide and per state (payroll tax, SUTA…). The same
          rates feed the /resources calculator, the contract wizard's country panel and the AI country answers. Percentages are of
          annual gross pay; a flat item is an annual amount in the country's currency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isSdp && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Only SDP users can view the cost settings.</AlertDescription>
          </Alert>
        )}
        {isSdp && readOnly && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Only SDP super admins and admins can edit the cost settings; you can review them here.</AlertDescription>
          </Alert>
        )}
        {isSdp && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{extractApiErrorMessage(error, "Could not load the cost settings.")}</AlertDescription>
          </Alert>
        )}
        {isSdp && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-64">
                <Label htmlFor="cost-country" className="mb-1 block text-xs font-medium text-secondary-600">Country</Label>
                <Select value={countryId} onValueChange={switchCountry}>
                  <SelectTrigger id="cost-country" className="h-9" data-testid="select-cost-country">
                    <SelectValue placeholder="Pick a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRestoreOpen(true)} disabled={!countryId || restoreMutation.isPending} data-testid="button-restore-cost-defaults">
                    <RotateCcw className="mr-1 h-4 w-4" /> Restore defaults
                  </Button>
                  {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
                  <Button type="button" size="sm" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending || !!invalid} data-testid="button-save-cost-items">
                    {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save {country?.name ?? ""}
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-secondary-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : (
              <>
                {renderGroup("Country-wide items", null, countryWide, "cost-group-country")}
                {states.map((s) =>
                  renderGroup(
                    s,
                    s,
                    [...items].filter((i) => (i.stateProvince ?? "").toLowerCase() === s.toLowerCase()).sort((a, b) => a.sortOrder - b.sortOrder),
                    `cost-group-state-${s}`,
                  ),
                )}
                {!readOnly && (
                  <div className="flex flex-wrap items-end gap-2 border-t border-secondary-100 pt-4">
                    <div className="w-64">
                      <Label htmlFor="cost-new-state" className="mb-1 block text-xs font-medium text-secondary-600">Add a state / province</Label>
                      <Input
                        id="cost-new-state"
                        className="h-9"
                        value={newStateName}
                        onChange={(e) => setNewStateName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addState(); } }}
                        placeholder="e.g. New South Wales"
                        data-testid="input-cost-new-state"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-9" onClick={addState} disabled={!newStateName.trim()} data-testid="button-add-cost-state">
                      <Plus className="mr-1 h-4 w-4" /> Add state
                    </Button>
                    <p className="text-xs text-secondary-500">A state's items are added to a quote only when that state is picked.</p>
                  </div>
                )}
                {invalid && <p className="text-xs text-destructive">Every item needs a name and at least one engagement category before saving.</p>}
              </>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore the default items for {country?.name ?? "this country"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every item of this country, edited or added by hand, is replaced by SDP's seed list. Quotes already saved keep their own lines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my items</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); restoreMutation.mutate(); }} disabled={restoreMutation.isPending} data-testid="button-confirm-restore-cost-defaults">
              {restoreMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Restore defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
