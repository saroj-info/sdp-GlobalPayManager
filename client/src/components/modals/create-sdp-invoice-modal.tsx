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
import { ArrowLeft, FileText, Building, Globe, Plus, Trash2 } from "lucide-react";

const createSdpInvoiceSchema = z.object({
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

type CreateSdpInvoiceForm = z.infer<typeof createSdpInvoiceSchema>;

interface CreateSdpInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSdpInvoiceModal({ onClose, onSuccess }: CreateSdpInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, amount: 0 }
  ]);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string>("__none__");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate subtotal from line items
  const calculateSubtotal = useCallback(() => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  }, [lineItems]);

  // Calculate estimated invoice totals for preview (matches form logic exactly)
  const calculatePreviewTotals = (data: CreateSdpInvoiceForm) => {
    const subtotal = calculateSubtotal();
    const fromCountry = countries.find((c: any) => c.id === data.fromCountryId);
    const toBusiness = businesses.find((b: any) => b.id === data.toBusinessId);
    
    // Use same cross-border logic as form (ID-based comparison)
    const businessCountryId = toBusiness?.countryId || toBusiness?.accessibleCountries?.[0];
    const isCrossBorder = businessCountryId && businessCountryId !== data.fromCountryId;
    
    // Use form's GST rate if provided, otherwise use country defaults
    let gstRate = 0;
    if (!isCrossBorder) {
      if (data.gstVatRate && !isNaN(parseFloat(data.gstVatRate))) {
        gstRate = parseFloat(data.gstVatRate);
      } else {
        // Fallback to country defaults only if no user input
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
    
    // Get business country name for display
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

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/countries"],
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["/api/businesses"],
  });

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
        // Recalculate amount when quantity or unitPrice changes
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

  const form = useForm<CreateSdpInvoiceForm>({
    resolver: zodResolver(createSdpInvoiceSchema),
    defaultValues: {
      currency: "USD",
      gstVatRate: "10",
      serviceType: "employment_services",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isCrossBorder: false,
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: CreateSdpInvoiceForm) => {
      // Calculate subtotal from line items
      const subtotal = calculateSubtotal();
      
      // Only send basic data - server will calculate GST/VAT and totals
      const processedData = {
        fromCountryId: data.fromCountryId,
        toBusinessId: data.toBusinessId,
        serviceType: data.serviceType,
        description: data.description,
        subtotal: subtotal.toString(),
        currency: data.currency,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        periodStart: data.periodStart || undefined,
        periodEnd: data.periodEnd || undefined,
        lineItems: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: index
        })),
        purchaseOrderId: selectedPurchaseOrderId !== "__none__" ? selectedPurchaseOrderId : null,
      };
      
      await apiRequest("POST", "/api/sdp-invoices", processedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SDP invoice created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create SDP invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: CreateSdpInvoiceForm) => {
    setIsSubmitting(true);
    try {
      await createInvoiceMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch form values for cross-border calculation
  const watchedValues = form.watch();
  const { fromCountryId, toBusinessId } = watchedValues;

  // PO query — must come after toBusinessId is declared to avoid TDZ error
  const { data: purchaseOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/purchase-orders", toBusinessId],
    queryFn: () =>
      toBusinessId
        ? apiRequest("GET", `/api/purchase-orders?businessId=${toBusinessId}`).then((r) => r.json())
        : Promise.resolve([]),
    enabled: !!toBusinessId,
  });
  const openPOs = (purchaseOrders as any[]).filter((po: any) => po.status === "open");

  // Update cross-border status and auto-populate GST rate when country or business changes
  useEffect(() => {
    const selectedFromCountry = countries.find((c: any) => c.id === fromCountryId);
    const selectedBusiness = businesses.find((b: any) => b.id === toBusinessId);
    
    if (selectedFromCountry) {
      // Auto-populate GST rate from country config if rate is still at default and not manually changed
      const countryGstRate = selectedFromCountry.gstRate ? String(parseFloat(selectedFromCountry.gstRate)) : null;
      if (countryGstRate) {
        const currentRate = form.getValues('gstVatRate');
        if (!currentRate || currentRate === '10') {
          form.setValue('gstVatRate', countryGstRate);
        }
      }
    }

    if (selectedFromCountry && selectedBusiness) {
      // Determine business country (use primary country or first accessible)
      const businessCountry = selectedBusiness.countryId || selectedBusiness.accessibleCountries?.[0];
      const isCrossBorder = businessCountry && businessCountry !== selectedFromCountry.id;
      
      // Update form values if they've changed
      if (isCrossBorder !== watchedValues.isCrossBorder) {
        form.setValue('isCrossBorder', isCrossBorder);
        form.setValue('businessCountry', businessCountry || '');
      }
    }
  }, [fromCountryId, toBusinessId, countries, businesses, form, watchedValues.isCrossBorder]);

  // Get current cross-border status for UI display
  const selectedFromCountry = countries.find((c: any) => c.id === fromCountryId);
  const selectedBusiness = businesses.find((b: any) => b.id === toBusinessId);
  const businessCountry = selectedBusiness?.countryId || selectedBusiness?.accessibleCountries?.[0];
  const isCrossBorder = businessCountry && businessCountry !== fromCountryId;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showPreview && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPreview(false)}
                className="p-1 mr-2"
                data-testid="button-back-to-form"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <FileText className="h-5 w-5" />
            {showPreview ? "Invoice Preview" : "Create SDP Invoice"}
          </DialogTitle>
          <DialogDescription>
            {showPreview 
              ? "Review the invoice details before creating"
              : "Create a new invoice from SDP entity to business client"
            }
          </DialogDescription>
        </DialogHeader>

        {showPreview ? (
          // Preview View
          <div className="space-y-6">
            {(() => {
              const formData = form.getValues();
              const preview = calculatePreviewTotals(formData);
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        SDP Global Pay Invoice
                      </div>
                      <div className="text-lg font-mono">
                        INV-{new Date().getFullYear()}-{String(Date.now()).slice(-6)}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Invoice Header */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          From: SDP Entity
                        </h3>
                        <p className="text-sm text-gray-600" data-testid="text-from-entity">{preview.fromCountryName}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          To: Business Client
                        </h3>
                        <p className="text-sm text-gray-600" data-testid="text-to-business">{preview.toBusinessName}</p>
                        <p className="text-sm text-gray-500">{preview.toBusinessCountry}</p>
                      </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium">Service Type</h4>
                        <p className="text-sm capitalize">{formData.serviceType?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Currency</h4>
                        <p className="text-sm">{formData.currency}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Invoice Date</h4>
                        <p className="text-sm" data-testid="text-invoice-date">
                          {formData.invoiceDate ? format(new Date(formData.invoiceDate), 'PPP') : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium">Due Date</h4>
                        <p className="text-sm" data-testid="text-due-date">
                          {formData.dueDate ? format(new Date(formData.dueDate), 'PPP') : 'Not set'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded">{formData.description}</p>
                    </div>

                    {/* Line Items Table */}
                    <div>
                      <h4 className="font-medium mb-2">Line Items</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left p-2">Description</th>
                              <th className="text-right p-2">Qty</th>
                              <th className="text-right p-2">Unit Price</th>
                              <th className="text-right p-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineItems.map((item, index) => (
                              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-2">{item.description || '-'}</td>
                                <td className="text-right p-2">{item.quantity}</td>
                                <td className="text-right p-2">{formData.currency} {item.unitPrice.toFixed(2)}</td>
                                <td className="text-right p-2 font-medium">{formData.currency} {item.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Cross-border Warning */}
                    {preview.isCrossBorder && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                          <span>Cross-Border Invoice</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          This invoice is cross-border (different countries). GST/VAT will not be applied.
                        </p>
                      </div>
                    )}

                    {/* Invoice Totals */}
                    <div className="border-t pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span data-testid="text-subtotal-amount">{formData.currency} {preview.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST/VAT ({preview.gstRate}%):</span>
                          <span data-testid="text-gst-amount">{formData.currency} {preview.gstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span data-testid="text-total-amount">{formData.currency} {preview.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Preview Footer */}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPreview(false)}
                data-testid="button-edit-invoice"
              >
                Edit Invoice
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  onClick={() => form.handleSubmit(onSubmit)()}
                  disabled={isSubmitting}
                  data-testid="button-create-invoice"
                >
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Form View
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromCountryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SDP Entity (Country)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-from-country">
                          <SelectValue placeholder="Select SDP entity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.filter((country: any) => country.id && country.name).map((country: any) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.name}
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
                    <FormLabel>Business Client</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-to-business">
                          <SelectValue placeholder="Select business" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businesses.filter((business: any) => business.id && business.name).map((business: any) => (
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
            </div>

            {/* PO selector: only shown when a business is selected and has open POs */}
            {toBusinessId && (
              <div>
                <label className="text-sm font-medium block mb-1.5">Purchase Order (optional)</label>
                <Select value={selectedPurchaseOrderId} onValueChange={setSelectedPurchaseOrderId}>
                  <SelectTrigger data-testid="select-purchase-order">
                    <SelectValue placeholder="No Purchase Order" />
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
            )}

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
                      <SelectItem value="contractor_services">Contractor Services</SelectItem>
                      <SelectItem value="timesheet_processing">Timesheet Processing</SelectItem>
                      <SelectItem value="payroll_services">Payroll Services</SelectItem>
                      <SelectItem value="compliance_services">Compliance Services</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="setup_fees">Setup Fees</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-period-start" />
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
                    <FormLabel>Period End (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-period-end" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  {watchedValues.currency} {calculateSubtotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        placeholder="10"
                        disabled={isCrossBorder}
                        {...field}
                        data-testid="input-gst-rate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="SGD">SGD</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="PHP">PHP</SelectItem>
                        <SelectItem value="NZD">NZD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-invoice-date" />
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
                      <Input type="date" {...field} data-testid="input-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isCrossBorder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                  <span>Cross-Border Invoice</span>
                </div>
                <p className="text-sm text-blue-700">
                  This invoice is cross-border (different countries). GST/VAT will not be applied.
                </p>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={async () => {
                    const isValid = await form.trigger();
                    if (isValid) {
                      setShowPreview(true);
                    }
                  }}
                  data-testid="button-preview-invoice"
                >
                  Preview
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  data-testid="button-create-invoice"
                >
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}