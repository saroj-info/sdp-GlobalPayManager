import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, FileText, Trash2 } from "lucide-react";

const marginPaymentSchema = z.object({
  marginAmount: z.string().min(1, "Margin amount is required"),
  status: z.enum(["pending", "partial", "paid"]),
  paidDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type MarginPaymentForm = z.infer<typeof marginPaymentSchema>;

interface MarginPayment {
  id: string;
  sdpInvoiceId: string;
  businessId: string;
  contractId?: string;
  marginAmount: string;
  currency: string;
  status: string;
  paidDate?: string;
  paidByUserId?: string;
  referenceNumber?: string;
  suggestedMargin?: string;
  notes?: string;
  createdAt: string;
}

interface MarginPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    toBusiness: { id: string; name: string };
    contractId?: string;
    currency: string;
    suggestedMargin?: string;
  };
}

export function MarginPaymentModal({ isOpen, onClose, invoice }: MarginPaymentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Fetch existing margin payments for this invoice
  const { data: marginPayments = [], isLoading } = useQuery<MarginPayment[]>({
    queryKey: ["/api/margin-payments", invoice.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/margin-payments?invoiceId=${invoice.id}`);
      return response.json();
    },
    enabled: isOpen,
  });

  const form = useForm<MarginPaymentForm>({
    resolver: zodResolver(marginPaymentSchema),
    defaultValues: {
      marginAmount: invoice.suggestedMargin || "",
      status: "pending",
      paidDate: "",
      referenceNumber: "",
      notes: "",
    },
  });

  // Reset form when editing a different payment
  useEffect(() => {
    if (editingPaymentId) {
      const payment = marginPayments.find(p => p.id === editingPaymentId);
      if (payment) {
        form.reset({
          marginAmount: payment.marginAmount,
          status: payment.status as "pending" | "partial" | "paid",
          paidDate: payment.paidDate ? new Date(payment.paidDate).toISOString().split('T')[0] : "",
          referenceNumber: payment.referenceNumber || "",
          notes: payment.notes || "",
        });
      }
    } else {
      form.reset({
        marginAmount: invoice.suggestedMargin || "",
        status: "pending",
        paidDate: "",
        referenceNumber: "",
        notes: "",
      });
    }
  }, [editingPaymentId, marginPayments, invoice.suggestedMargin, form]);

  const createMutation = useMutation({
    mutationFn: async (data: MarginPaymentForm) => {
      const response = await apiRequest("POST", "/api/margin-payments", {
        sdpInvoiceId: invoice.id,
        businessId: invoice.toBusiness.id,
        contractId: invoice.contractId || null,
        marginAmount: data.marginAmount,
        currency: invoice.currency,
        status: data.status,
        paidDate: data.paidDate || null,
        referenceNumber: data.referenceNumber || null,
        suggestedMargin: invoice.suggestedMargin || null,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Margin payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/margin-payments"] });
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to record margin payment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MarginPaymentForm) => {
      const response = await apiRequest("PATCH", `/api/margin-payments/${editingPaymentId}`, {
        marginAmount: data.marginAmount,
        status: data.status,
        paidDate: data.paidDate || null,
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Margin payment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/margin-payments"] });
      setEditingPaymentId(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update margin payment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/margin-payments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Margin payment deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/margin-payments"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete margin payment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: MarginPaymentForm) => {
    if (editingPaymentId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    partial: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-margin-payment">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            Margin Payments - {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription data-testid="text-modal-description">
            Record and manage margin payments to {invoice.toBusiness.name} for this customer billing invoice.
            {invoice.suggestedMargin && (
              <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                <strong>Suggested Margin:</strong> {formatCurrency(invoice.suggestedMargin, invoice.currency)}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div>
            <h3 className="text-sm font-medium mb-4" data-testid="text-form-title">
              {editingPaymentId ? "Edit Margin Payment" : "Record New Margin Payment"}
            </h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="marginAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margin Amount ({invoice.currency})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-margin-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending" data-testid="option-pending">Pending</SelectItem>
                          <SelectItem value="partial" data-testid="option-partial">Partial</SelectItem>
                          <SelectItem value="paid" data-testid="option-paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-paid-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Transaction reference"
                          {...field}
                          data-testid="input-reference-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes..."
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingPaymentId ? "Update Payment" : "Record Payment"}
                  </Button>
                  {editingPaymentId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingPaymentId(null);
                        form.reset();
                      }}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>

          {/* Payment History Section */}
          <div>
            <h3 className="text-sm font-medium mb-4" data-testid="text-history-title">
              Payment History
            </h3>
            {isLoading ? (
              <div className="text-sm text-secondary-600">Loading payments...</div>
            ) : marginPayments.length === 0 ? (
              <div className="text-sm text-secondary-600 text-center py-8">
                No margin payments recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {marginPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border rounded-lg p-3 space-y-2"
                    data-testid={`payment-item-${payment.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-secondary-600" />
                        <span className="font-medium">
                          {formatCurrency(payment.marginAmount, payment.currency)}
                        </span>
                      </div>
                      <Badge className={statusColors[payment.status as keyof typeof statusColors]}>
                        {payment.status}
                      </Badge>
                    </div>

                    {payment.paidDate && (
                      <div className="flex items-center gap-2 text-sm text-secondary-600">
                        <Calendar className="h-3 w-3" />
                        Paid: {formatDate(payment.paidDate)}
                      </div>
                    )}

                    {payment.referenceNumber && (
                      <div className="flex items-center gap-2 text-sm text-secondary-600">
                        <FileText className="h-3 w-3" />
                        Ref: {payment.referenceNumber}
                      </div>
                    )}

                    {payment.notes && (
                      <div className="text-xs text-secondary-600 bg-gray-50 p-2 rounded">
                        {payment.notes}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPaymentId(payment.id)}
                        data-testid={`button-edit-${payment.id}`}
                      >
                        Edit
                      </Button>
                      {payment.status !== "paid" && !payment.paidByUserId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this margin payment?")) {
                              deleteMutation.mutate(payment.id);
                            }
                          }}
                          data-testid={`button-delete-${payment.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
