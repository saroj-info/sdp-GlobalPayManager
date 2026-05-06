import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Globe, Search, Coins, Building2 } from "lucide-react";
import { Loader } from "@/components/ui/loader";

const PAY_ITEM_TYPE_LABELS: Record<string, string> = {
  earnings: "Earnings",
  discretionary_earnings: "Discretionary Earnings",
  addition_before_tax: "Addition Before Tax",
  deduction_before_tax: "Deduction Before Tax",
  addition_after_tax: "Addition After Tax",
  deduction_after_tax: "Deduction After Tax",
  retirement_benefits: "Retirement Benefits",
};

const FREQUENCY_LABELS: Record<string, string> = {
  annual: "Annual",
  monthly: "Monthly",
  hourly: "Hourly",
  daily: "Daily",
  per_occurrence: "Per Occurrence",
};

const TRIGGER_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  timesheet_period: "Per Timesheet",
  event_triggered: "Event",
};

export default function PayItemsPage() {
  usePageHeader("Pay Items", "Reusable compensation building blocks for contracts");
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterScope, setFilterScope] = useState<"all" | "global" | "business">("all");
  const [filterType, setFilterType] = useState<string>("all");

  const sdpRole = (user as any)?.sdpRole;
  const isSdp = !!sdpRole;
  const callerBusinessId: string | null = (user as any)?.business?.id ?? null;

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pay-items"],
    queryFn: async () => (await apiRequest("GET", "/api/pay-items")).json(),
  });

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ["/api/countries"],
    queryFn: async () => (await apiRequest("GET", "/api/countries")).json(),
  });

  const countryById = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of countries) m.set(c.id, c);
    return m;
  }, [countries]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/pay-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pay-items"] });
      toast({ title: "Pay Item removed" });
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  const canEdit = (item: any) => {
    if (isSdp) return true;
    return !!item.businessId && item.businessId === callerBusinessId;
  };

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (items || []).filter((item: any) => {
      if (q && !(item.name || "").toLowerCase().includes(q)) return false;
      if (filterScope === "global" && item.businessId !== null) return false;
      if (filterScope === "business" && item.businessId === null) return false;
      if (filterType !== "all" && item.type !== filterType) return false;
      return true;
    });
  }, [items, searchTerm, filterScope, filterType]);

  const stats = useMemo(() => {
    const total = (items || []).length;
    const global = (items || []).filter((i: any) => i.businessId === null).length;
    const business = total - global;
    return { total, global, business };
  }, [items]);

  return (
    <div className="p-6 space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Pay Items</p>
              <p className="text-2xl font-semibold mt-1">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Global</p>
              <p className="text-2xl font-semibold mt-1">{stats.global}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Business-Scoped</p>
              <p className="text-2xl font-semibold mt-1">{stats.business}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-1 gap-2 max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pay items by name…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterScope} onValueChange={v => setFilterScope(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(PAY_ITEM_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)} className="md:ml-2">
          <Plus className="h-4 w-4 mr-1.5" /> New Pay Item
        </Button>
      </div>

      {/* Body */}
      {isLoading ? (
        <Loader fullPage label="Loading Pay Items" />
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Coins className="h-7 w-7" />
            </div>
            <p className="text-base font-medium">No Pay Items yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {isSdp
                ? "Create reusable building blocks (earnings, deductions, retirement) that any business can attach to their contracts."
                : "Create reusable building blocks for your contracts. Items marked Global are managed by SDP."}
            </p>
            <Button className="mt-5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Create your first Pay Item
            </Button>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No Pay Items match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item: any) => {
            const isGlobal = item.businessId === null;
            const editable = canEdit(item);
            return (
              <Card
                key={item.id}
                className="group hover:shadow-md hover:border-primary/30 transition-all overflow-hidden"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-snug truncate" title={item.name}>{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {isGlobal ? (
                          <Badge variant="secondary" className="gap-1 text-[11px]"><Globe className="h-3 w-3" /> Global</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[11px]"><Building2 className="h-3 w-3" /> Business</Badge>
                        )}
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {PAY_ITEM_TYPE_LABELS[item.type] || item.type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="uppercase tracking-wide">Country: </span>
                    <span className="font-medium text-foreground">
                      {item.countryId ? (countryById.get(item.countryId)?.name || item.countryId) : "All Countries"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-1 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      disabled={!editable}
                      onClick={() => setEditing(item)}
                      title={editable ? "Edit" : "Read-only — managed by another scope"}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={!editable || deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"? Existing remuneration lines will keep their reference.`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <PayItemEditor
          isSdp={isSdp}
          countries={countries}
          item={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function PayItemEditor({
  isSdp,
  countries,
  item,
  onClose,
}: {
  isSdp: boolean;
  countries: any[];
  item: any | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>(() => item ? { ...item, isGlobal: item.businessId === null } : {
    name: "",
    type: "earnings",
    countryId: null,
    defaultAmount: "",
    defaultFrequency: "",
    defaultPaymentTrigger: "",
    isGlobal: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (item?.id) {
        const res = await apiRequest("PATCH", `/api/pay-items/${item.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/pay-items", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pay-items"] });
      toast({ title: item ? "Pay Item updated" : "Pay Item created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload: any = {
      name: form.name.trim(),
      type: form.type,
      countryId: form.countryId || null,
      defaultAmount: form.defaultAmount === "" || form.defaultAmount === null ? null : form.defaultAmount,
      defaultFrequency: form.defaultFrequency || null,
      defaultPaymentTrigger: form.defaultPaymentTrigger || null,
    };
    // SDP users can choose to make a new pay item global. Business users always create scoped to themselves.
    if (isSdp && !item) {
      payload.businessId = form.isGlobal ? null : (form.businessId || null);
    }
    saveMutation.mutate(payload);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Pay Item" : "New Pay Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Pay Item</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Superannuation" className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Country</label>
            <Select value={form.countryId || "all"} onValueChange={v => setForm({ ...form, countryId: v === "all" ? null : v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAY_ITEM_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Optional Pay Item defaults — set per contract instead of on the Pay Item itself
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Default Amount</label>
              <Input value={form.defaultAmount ?? ""} onChange={e => setForm({ ...form, defaultAmount: e.target.value })} placeholder="Optional" type="number" step="0.01" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Pay Frequency</label>
              <Select value={form.defaultFrequency || ""} onValueChange={v => setForm({ ...form, defaultFrequency: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Pay Trigger</label>
            <Select value={form.defaultPaymentTrigger || ""} onValueChange={v => setForm({ ...form, defaultPaymentTrigger: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          */}
          {isSdp && !item && (
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="text-sm font-medium">Make Global</p>
                <p className="text-xs text-muted-foreground">Visible to every business across the platform.</p>
              </div>
              <Switch checked={!!form.isGlobal} onCheckedChange={v => setForm({ ...form, isGlobal: v })} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : (item ? "Save Changes" : "Create Pay Item")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
