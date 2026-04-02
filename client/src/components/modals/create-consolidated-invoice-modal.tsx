import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Layers } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CURRENCIES = ["USD", "AUD", "GBP", "EUR", "SGD", "PHP", "NZD"];

export function CreateConsolidatedInvoiceModal({ onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);

  const [fromCountryId, setFromCountryId] = useState("");
  const [toBusinessId, setToBusinessId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"));
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("__none__");

  const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<Set<string>>(new Set());

  const { data: countries = [] } = useQuery<any[]>({ queryKey: ["/api/countries"] });
  const { data: businesses = [] } = useQuery<any[]>({ queryKey: ["/api/businesses"] });

  const { data: purchaseOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/purchase-orders", toBusinessId],
    queryFn: () =>
      toBusinessId
        ? apiRequest("GET", `/api/purchase-orders?businessId=${toBusinessId}`).then((r) => r.json())
        : Promise.resolve([]),
    enabled: !!toBusinessId,
  });

  const openPOs = useMemo(
    () => purchaseOrders.filter((po: any) => po.status === "open"),
    [purchaseOrders]
  );

  const { data: allTimesheets = [], isLoading: timesheetsLoading } = useQuery<any[]>({
    queryKey: ["/api/timesheets", toBusinessId, periodStart, periodEnd],
    queryFn: () => apiRequest("GET", "/api/timesheets").then((r) => r.json()),
    enabled: step >= 2,
  });

  const eligibleTimesheets = useMemo(() => {
    return allTimesheets.filter((ts: any) => {
      if (ts.status !== "approved") return false;
      if (ts.sdpInvoiced) return false;
      if (toBusinessId && ts.businessId !== toBusinessId) return false;
      if (periodStart && ts.periodEnd && ts.periodEnd < periodStart) return false;
      if (periodEnd && ts.periodStart && ts.periodStart > periodEnd) return false;
      return true;
    });
  }, [allTimesheets, toBusinessId, periodStart, periodEnd]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedTimesheetIds(new Set(eligibleTimesheets.map((ts: any) => ts.id)));
    } else {
      setSelectedTimesheetIds(new Set());
    }
  };

  const toggleOne = (id: string) => {
    setSelectedTimesheetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTimesheets = eligibleTimesheets.filter((ts: any) =>
    selectedTimesheetIds.has(ts.id)
  );

  const subtotal = useMemo(() => {
    return selectedTimesheets.reduce((sum: number, ts: any) => {
      const hours = parseFloat(ts.totalHours || ts.regularHours || 0);
      const rate = parseFloat(ts.payRate || 0);
      return sum + hours * rate;
    }, 0);
  }, [selectedTimesheets]);

  const selectedPO = openPOs.find((po: any) => po.id === purchaseOrderId);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fromCountryId,
        toBusinessId,
        timesheetIds: Array.from(selectedTimesheetIds),
        currency,
        invoiceDate,
        dueDate,
        purchaseOrderId: purchaseOrderId === "__none__" ? null : purchaseOrderId,
      };
      const res = await apiRequest("POST", "/api/sdp-invoices/consolidated", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create consolidated invoice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Consolidated invoice created",
        description: `Invoice ${data.invoiceNumber} created with ${selectedTimesheetIds.size} worker${selectedTimesheetIds.size !== 1 ? "s" : ""}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canProceedStep1 = fromCountryId && toBusinessId && currency && invoiceDate && dueDate;
  const canProceedStep2 = selectedTimesheetIds.size > 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Create Consolidated Invoice
          </DialogTitle>
          <DialogDescription>
            Combine multiple workers into a single SDP invoice
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
                {s === 1 ? "Configure" : s === 2 ? "Select Workers" : "Preview & Create"}
              </span>
              {s < 3 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">SDP Entity *</label>
                <Select value={fromCountryId || "__none__"} onValueChange={(v) => setFromCountryId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select SDP entity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select SDP entity…</SelectItem>
                    {countries.filter((c: any) => c.id).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Client Business *</label>
                <Select value={toBusinessId || "__none__"} onValueChange={(v) => { setToBusinessId(v === "__none__" ? "" : v); setPurchaseOrderId("__none__"); }}>
                  <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select business…</SelectItem>
                    {businesses.filter((b: any) => b.id && b.name).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Currency *</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Purchase Order (optional)</label>
                <Select value={purchaseOrderId} onValueChange={setPurchaseOrderId} disabled={!toBusinessId}>
                  <SelectTrigger>
                    <SelectValue placeholder={toBusinessId ? "No PO" : "Select business first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Purchase Order</SelectItem>
                    {openPOs.map((po: any) => {
                      const remaining = parseFloat(po.totalValue || 0) - parseFloat(po.invoicedToDate || 0);
                      return (
                        <SelectItem key={po.id} value={po.id}>
                          {po.poNumber} — {po.projectName} (remaining: {po.currency} {remaining.toFixed(2)})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Invoice Date *</label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Due Date *</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Period Start (optional)</label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Period End (optional)</label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next: Select Workers <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select workers */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {timesheetsLoading
                  ? "Loading timesheets…"
                  : `${eligibleTimesheets.length} approved, uninvoiced timesheet${eligibleTimesheets.length !== 1 ? "s" : ""} available`}
              </p>
              {eligibleTimesheets.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(selectedTimesheetIds.size !== eligibleTimesheets.length)}
                >
                  {selectedTimesheetIds.size === eligibleTimesheets.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {eligibleTimesheets.length === 0 && !timesheetsLoading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No eligible timesheets</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are no approved, uninvoiced timesheets for the selected business and period.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border max-h-[340px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedTimesheetIds.size === eligibleTimesheets.length && eligibleTimesheets.length > 0}
                          onCheckedChange={(v) => toggleAll(!!v)}
                        />
                      </TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead className="text-right">Amount ({currency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleTimesheets.map((ts: any) => {
                      const hours = parseFloat(ts.totalHours || ts.regularHours || 0);
                      const rate = parseFloat(ts.payRate || 0);
                      const amount = hours * rate;
                      return (
                        <TableRow key={ts.id} className={selectedTimesheetIds.has(ts.id) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTimesheetIds.has(ts.id)}
                              onCheckedChange={() => toggleOne(ts.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{ts.workerName || "Unknown"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ts.periodStart ? format(new Date(ts.periodStart), "d MMM") : ""}
                            {ts.periodEnd ? ` – ${format(new Date(ts.periodEnd), "d MMM yyyy")}` : ""}
                          </TableCell>
                          <TableCell className="text-sm">{hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right text-sm">{amount.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedTimesheetIds.size > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm font-medium">{selectedTimesheetIds.size} worker{selectedTimesheetIds.size !== 1 ? "s" : ""} selected</span>
                <span className="text-sm font-semibold">{currency} {subtotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next: Preview <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Create */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">SDP Entity:</span> <span className="font-medium">{countries.find((c: any) => c.id === fromCountryId)?.name}</span></div>
              <div><span className="text-muted-foreground">Client Business:</span> <span className="font-medium">{businesses.find((b: any) => b.id === toBusinessId)?.name}</span></div>
              <div><span className="text-muted-foreground">Invoice Date:</span> <span className="font-medium">{invoiceDate}</span></div>
              <div><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{dueDate}</span></div>
              {selectedPO && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Purchase Order:</span>{" "}
                  <span className="font-medium text-blue-600">{selectedPO.poNumber} — {selectedPO.projectName}</span>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Line Items</p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker / Description</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead className="text-right">Amount ({currency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTimesheets.map((ts: any) => {
                      const hours = parseFloat(ts.totalHours || ts.regularHours || 0);
                      const rate = parseFloat(ts.payRate || 0);
                      const amount = hours * rate;
                      return (
                        <TableRow key={ts.id}>
                          <TableCell className="font-medium text-sm">{ts.workerName || "Unknown"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ts.periodStart ? format(new Date(ts.periodStart), "d MMM") : ""}
                            {ts.periodEnd ? ` – ${format(new Date(ts.periodEnd), "d MMM yyyy")}` : ""}
                          </TableCell>
                          <TableCell className="text-sm">{hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right text-sm">{amount.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {createMutation.isPending ? "Creating…" : "Create Consolidated Invoice"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
