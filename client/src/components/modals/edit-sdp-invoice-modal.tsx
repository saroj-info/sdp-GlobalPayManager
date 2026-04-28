import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, FileText, Building, Globe, Edit, Plus, Trash2 } from "lucide-react";

const editSdpInvoiceSchema = z.object({
  fromCountryId: z.string().min(1, "SDP entity (country) is required"),
  toBusinessId: z.string().min(1, "Business is required"),
  serviceType: z.string().min(1, "Service type is required"),
  description: z.string().min(1, "Description is required"),
  gstVatRate: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  isCrossBorder: z.boolean().optional(),
  businessCountry: z.string().optional(),
});

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

type EditSdpInvoiceForm = z.infer<typeof editSdpInvoiceSchema>;

interface EditSdpInvoiceModalProps {
  invoice: any; // The invoice to edit
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSdpInvoiceModal({ invoice, onClose, onSuccess }: EditSdpInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Initialize line items from invoice or default
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (invoice?.lineItems && invoice.lineItems.length > 0) {
      return invoice.lineItems.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: parseFloat(item.amount) || 0
      }));
    }
    return [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, amount: 0 }];
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only allow editing of draft and issued invoices
  const canEdit = invoice?.status === 'draft' || invoice?.status === 'issued';

  if (!canEdit) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Cannot Edit Invoice
            </DialogTitle>
            <DialogDescription>
              Invoices can only be edited when they are in draft or issued status.
              This invoice is currently {invoice?.status}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose} data-testid="button-close-edit-warning">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate subtotal from line items
  const calculateSubtotal = useCallback(() => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  }, [lineItems]);

  // Line item management functions
  const addLineItem = useCallback(() => {
    setLineItems(prev => [...prev, { 
      id: crypto.randomUUID(), 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      amount: 0 
    }]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  }, [lineItems.length]);

  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          // Always parse both values to ensure they're numbers
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
          const price = parseFloat(field === 'unitPrice' ? value : updated.unitPrice) || 0;
          updated.quantity = qty;
          updated.unitPrice = price;
          updated.amount = qty * price;
        }
        return updated;
      }
      return item;
    }));
  }, []);

  // Calculate invoice totals for preview
  const calculatePreviewTotals = (data: EditSdpInvoiceForm) => {
    const subtotal = calculateSubtotal();
    const fromCountry = countries.find((c: any) => c.id === data.fromCountryId);
    const toBusiness = businesses.find((b: any) => b.id === data.toBusinessId);
    
    const businessCountryId = toBusiness?.countryId || toBusiness?.accessibleCountries?.[0];
    const isCrossBorder = businessCountryId && businessCountryId !== data.fromCountryId;
    
    let gstRate = 0;
    if (!isCrossBorder) {
      if (data.gstVatRate && !isNaN(parseFloat(data.gstVatRate))) {
        gstRate = parseFloat(data.gstVatRate);
      } else {
        const gstRates: Record<string, number> = {
          'Australia': 10,
          'New Zealand': 15,
          'United Kingdom': 20,
          'Canada': 5,
          'Singapore': 7
        };
        gstRate = gstRates[fromCountry?.name] || 0;
      }
    }
    
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;
    
    const businessCountry = countries.find((c: any) => c.id === businessCountryId);
    
    return {
      subtotal,
      gstRate,
      gstAmount,
      total,
      isCrossBorder: !!isCrossBorder,
      fromCountryName: fromCountry?.name,
      toBusinessName: toBusiness?.name,
      toBusinessCountry: businessCountry?.name || 'Unknown'
    };
  };

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ["/api/countries"],
  });

  const { data: businesses = [] } = useQuery<any[]>({
    queryKey: ["/api/businesses"],
  });

  // Format dates for form inputs
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd');
  };

  const form = useForm<EditSdpInvoiceForm>({
    resolver: zodResolver(editSdpInvoiceSchema),
    defaultValues: {
      fromCountryId: invoice?.fromCountryId || "",
      toBusinessId: invoice?.toBusinessId || "",
      serviceType: invoice?.serviceType || "employment_services",
      description: invoice?.description || "",
      gstVatRate: invoice?.gstVatRate || "10",
      currency: invoice?.currency || "USD",
      invoiceDate: invoice?.invoiceDate ? formatDateForInput(invoice.invoiceDate) : "",
      dueDate: invoice?.dueDate ? formatDateForInput(invoice.dueDate) : "",
      periodStart: invoice?.periodStart ? formatDateForInput(invoice.periodStart) : "",
      periodEnd: invoice?.periodEnd ? formatDateForInput(invoice.periodEnd) : "",
      isCrossBorder: invoice?.isCrossBorder || false,
      businessCountry: invoice?.businessCountry || "",
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: EditSdpInvoiceForm) => {
      const subtotal = calculateSubtotal();
      const payload = {
        ...data,
        subtotal: subtotal.toString(),
        lineItems: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: index
        }))
      };
      const response = await apiRequest("PATCH", `/api/sdp-invoices/${invoice.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invoice Updated",
        description: "The SDP invoice has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update SDP invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EditSdpInvoiceForm) => {
    setIsSubmitting(true);
    try {
      await updateInvoiceMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formData = form.watch();
  const { fromCountryId: watchedFromCountryId } = formData;

  // Auto-populate GST rate from country config when country changes
  useEffect(() => {
    if (!watchedFromCountryId) return;
    const selectedCountry = countries.find((c: any) => c.id === watchedFromCountryId);
    if (selectedCountry?.gstRate) {
      const countryRate = String(parseFloat(selectedCountry.gstRate));
      const currentRate = form.getValues('gstVatRate');
      if (!currentRate || currentRate === '10') {
        form.setValue('gstVatRate', countryRate);
      }
    }
  }, [watchedFromCountryId, countries, form]);

  const previewTotals = calculatePreviewTotals(formData);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit SDP Invoice #{invoice?.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Update the details for this SDP invoice. Only draft and issued invoices can be edited.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Invoice Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Invoice Details
                  </h3>

                  <FormField
                    control={form.control}
                    name="fromCountryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SDP Entity (From Country)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-from-country">
                              <SelectValue placeholder="Select SDP entity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country: any) => (
                              <SelectItem key={country.id} value={country.id}>
                                {country.name} - {country.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toBusinessId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Business</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-to-business">
                              <SelectValue placeholder="Select client business" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businesses.map((business: any) => (
                              <SelectItem key={business.id} value={business.id}>
                                {business.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service-type">
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employment_services">Employment Services</SelectItem>
                            <SelectItem value="timesheet_processing">Timesheet Processing</SelectItem>
                            <SelectItem value="payroll_services">Payroll Services</SelectItem>
                            <SelectItem value="compliance_services">Compliance Services</SelectItem>
                            <SelectItem value="consulting">Consulting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the services provided..."
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Financial Details
                  </h3>

                  {/* Line Items Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base">Line Items</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addLineItem}
                        data-testid="button-add-line-item"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Line Item
                      </Button>
                    </div>
                    
                    {lineItems.map((item, index) => (
                      <Card key={item.id} className="p-3">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                placeholder="Description (e.g., SDP Global Pay Fee)"
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                data-testid={`input-line-item-description-${index}`}
                              />
                            </div>
                            {lineItems.length > 1 && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeLineItem(item.id)}
                                data-testid={`button-remove-line-item-${index}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Input
                                type="number"
                                placeholder="Qty"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                                data-testid={`input-line-item-quantity-${index}`}
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                placeholder="Unit Price"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                                data-testid={`input-line-item-unit-price-${index}`}
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={item.amount.toFixed(2)}
                                readOnly
                                className="bg-gray-50"
                                data-testid={`text-line-item-amount-${index}`}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">Subtotal:</span>
                      <span className="text-lg font-semibold" data-testid="text-calculated-subtotal">
                        {formData.currency} {calculateSubtotal().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="AUD">AUD</SelectItem>
                            <SelectItem value="NZD">NZD</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="CAD">CAD</SelectItem>
                            <SelectItem value="SGD">SGD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!previewTotals.isCrossBorder && (
                    <FormField
                      control={form.control}
                      name="gstVatRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GST/VAT Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="10.00"
                              {...field}
                              data-testid="input-gst-rate"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              data-testid="input-invoice-date"
                            />
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
                            <Input 
                              type="date" 
                              {...field}
                              data-testid="input-due-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Service Period (Optional) */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="periodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Period Start (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              data-testid="input-period-start"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="periodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Period End (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              data-testid="input-period-end"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPreview(true)}
                  data-testid="button-preview"
                >
                  Preview
                </Button>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-update-invoice"
                  >
                    {isSubmitting ? "Updating..." : "Update Invoice"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Invoice Preview - #{invoice?.invoiceNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">From:</p>
                    <p className="font-semibold">{previewTotals.fromCountryName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">To:</p>
                    <p className="font-semibold">{previewTotals.toBusinessName}</p>
                    <p className="text-sm text-gray-500">{previewTotals.toBusinessCountry}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span>{formData.currency} {previewTotals.subtotal.toFixed(2)}</span>
                  </div>
                  {!previewTotals.isCrossBorder && (
                    <div className="flex justify-between items-center">
                      <span>GST/VAT ({previewTotals.gstRate}%):</span>
                      <span>{formData.currency} {previewTotals.gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formData.currency} {previewTotals.total.toFixed(2)}</span>
                  </div>
                </div>

                {previewTotals.isCrossBorder && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Cross-border service:</strong> No GST/VAT applicable as this is an international transaction.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2"
                data-testid="button-back-to-form"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Form
              </Button>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  data-testid="button-cancel-preview"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => form.handleSubmit(onSubmit)()}
                  disabled={isSubmitting}
                  data-testid="button-update-from-preview"
                >
                  {isSubmitting ? "Updating..." : "Update Invoice"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}