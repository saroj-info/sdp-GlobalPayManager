import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Globe } from "lucide-react";
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pay Items</h2>
          <p className="text-muted-foreground text-sm">
            {isSdp
              ? "Manage business-scoped and global Pay Items."
              : "Pay Items used on your contracts. Items marked Global are managed by SDP."}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Pay Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Pay Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader fullPage label="Loading Pay Items" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No Pay Items yet. Create your first one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Default Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.businessId === null ? (
                        <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" /> Global</Badge>
                      ) : (
                        <Badge variant="outline">Business</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.countryId ? (countryById.get(item.countryId)?.name || item.countryId) : "All"}
                    </TableCell>
                    <TableCell className="text-sm">{PAY_ITEM_TYPE_LABELS[item.type] || item.type}</TableCell>
                    <TableCell className="text-sm">{item.defaultAmount ?? "—"}</TableCell>
                    <TableCell className="text-sm">{item.defaultFrequency ? (FREQUENCY_LABELS[item.defaultFrequency] || item.defaultFrequency) : "—"}</TableCell>
                    <TableCell className="text-sm">{item.defaultPaymentTrigger ? (TRIGGER_LABELS[item.defaultPaymentTrigger] || item.defaultPaymentTrigger) : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={!canEdit(item)}
                          onClick={() => setEditing(item)}
                          title={canEdit(item) ? "Edit" : "Read-only (managed by another scope)"}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          disabled={!canEdit(item) || deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${item.name}"? Existing remuneration lines will keep their reference.`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
