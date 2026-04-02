import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Building, FileText, DollarSign } from "lucide-react";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.coerce.number().positive("Must be positive"),
  unitPrice: z.coerce.number().positive("Must be positive"),
  amount: z.coerce.number(),
});

const formSchema = z.object({
  contractId: z.string().min(1, "Please select a contract"),
  description: z.string().min(1, "Description is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export default function NewClientInvoicePage() {
  usePageHeader("New Client Invoice", "Create an invoice to bill your host client");

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["/api/contracts"],
  });

  const clientContracts = (contracts as any[]).filter(
    (c) => c.customerBusinessId && c.customerBusinessId !== ""
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractId: "",
      description: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
      })(),
      periodStart: "",
      periodEnd: "",
      currency: "USD",
      notes: "",
    },
  });

  const selectedContractId = form.watch("contractId");
  const selectedContract = (clientContracts as any[]).find((c) => c.id === selectedContractId);

  useEffect(() => {
    if (selectedContract) {
      const currency = selectedContract.customerCurrency || selectedContract.currency || "USD";
      const rate = parseFloat(selectedContract.customerBillingRate || "0");
      const rateType = selectedContract.customerBillingRateType || "hourly";

      form.setValue("currency", currency);
      form.setValue(
        "description",
        `Services provided to ${selectedContract.customerBusiness?.name || "client"} — ${selectedContract.worker?.firstName || ""} ${selectedContract.worker?.lastName || ""}`.trim()
      );

      const paymentTermsDays = parseInt(selectedContract.paymentTerms || "30");
      const due = new Date();
      due.setDate(due.getDate() + paymentTermsDays);
      form.setValue("dueDate", due.toISOString().split("T")[0]);

      if (rate > 0) {
        setLineItems([
          {
            description: `${rateType.charAt(0).toUpperCase() + rateType.slice(1)} rate — ${selectedContract.worker?.firstName || ""} ${selectedContract.worker?.lastName || ""}`.trim(),
            quantity: 1,
            unitPrice: rate,
            amount: rate,
          },
        ]);
      }
    }
  }, [selectedContractId]);

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalAmount = subtotal;

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        updated[index].amount = Number(updated[index].quantity) * Number(updated[index].unitPrice);
      }
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedContract) throw new Error("No contract selected");

      const payload = {
        toBusinessId: selectedContract.customerBusinessId,
        contractId: values.contractId,
        description: values.description,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          amount: String(item.quantity * item.unitPrice),
        })),
        subtotal: String(subtotal),
        totalAmount: String(totalAmount),
        currency: values.currency,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        periodStart: values.periodStart || undefined,
        periodEnd: values.periodEnd || undefined,
        notes: values.notes || undefined,
        fromCountryId: selectedContract.countryId,
      };

      return apiRequest("/api/client-invoices", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-invoices"] });
      toast({ title: "Invoice created", description: "Your client invoice has been saved as a draft." });
      setLocation("/invoices?tab=client");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create invoice",
        description: err?.message || "An error occurred. Please check all fields.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (lineItems.some((item) => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast({
        title: "Invalid line items",
        description: "All line items must have a description, quantity, and unit price.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(values);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/invoices?tab=client")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Client Invoices
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Contract Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4 text-indigo-600" />
                Select Host Client Contract
              </CardTitle>
              <CardDescription>
                Choose the contract that governs the services you are billing for.
                Only contracts with a host client are shown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientContracts.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No client contracts found. Create a contract with a host client first.
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contract…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientContracts.map((contract: any) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.worker?.firstName} {contract.worker?.lastName} —{" "}
                              {contract.customerBusiness?.name || contract.customerBusinessId?.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedContract && (
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Host Client</span>
                    <span className="font-medium text-indigo-900">
                      {selectedContract.customerBusiness?.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Worker</span>
                    <span className="font-medium">
                      {selectedContract.worker?.firstName} {selectedContract.worker?.lastName}
                    </span>
                  </div>
                  {selectedContract.customerBillingRate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Billing Rate</span>
                      <Badge variant="outline" className="text-indigo-700 border-indigo-300">
                        {selectedContract.customerCurrency}{" "}
                        {parseFloat(selectedContract.customerBillingRate).toFixed(2)} /{" "}
                        {selectedContract.customerBillingRateType || "unit"}
                      </Badge>
                    </div>
                  )}
                  {selectedContract.paymentTerms && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payment Terms</span>
                      <span className="font-medium">{selectedContract.paymentTerms} days</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the services provided…"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="invoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Start <span className="text-gray-400 text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period End <span className="text-gray-400 text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["USD", "AUD", "GBP", "EUR", "CAD", "NZD", "SGD", "HKD", "JPY", "INR"].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-indigo-600" />
                  Line Items
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Rate"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      readOnly
                      value={(item.quantity * item.unitPrice).toFixed(2)}
                      className="bg-gray-50 text-right font-medium"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-400 hover:text-red-500"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-bold text-indigo-900">
                    {form.watch("currency")} {totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-gray-400 text-xs">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Any additional information for your client…"
                        rows={3}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/invoices?tab=client")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || clientContracts.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {mutation.isPending ? "Creating…" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
