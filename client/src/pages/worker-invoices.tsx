import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarIcon, Plus, FileText, Check, X, AlertCircle, DollarSign, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type InvoiceData = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  description: string;
  amount: number;
  gstAmount?: number;
  currency: string;
};

export default function WorkerInvoicesPage() {
  usePageHeader("Contractor Invoices", "Create and submit invoices for services rendered");
  
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Fetch worker profile to check eligibility
  const { data: workerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/workers/profile"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
    enabled: isAuthenticated,
  });

  const form = useForm<InvoiceData>({
    defaultValues: {
      invoiceNumber: '',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      description: '',
      amount: 0,
      gstAmount: 0,
      currency: 'AUD',
    }
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceData) => {
      return await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setShowForm(false);
      form.reset();
      toast({
        title: "Success",
        description: "Invoice created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.userType !== 'worker') {
    return null;
  }

  // Check if worker is eligible for invoices (contractors but not contractor of record)
  const isEligibleForInvoices = workerProfile?.workerType === 'contractor' && 
    workerProfile?.businessStructure !== 'contractor_of_record';

  if (!isEligibleForInvoices) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoices Not Available</h3>
                <p className="text-gray-600">
                  Invoice functionality is only available for contractors (excluding contractors of record).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = (data: InvoiceData) => {
    createInvoiceMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'paid': return 'default';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'paid': return <DollarSign className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
            
            {/* New Invoice Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Contractor Invoices</h2>
              <Button 
                onClick={() => setShowForm(true)}
                data-testid="button-new-invoice"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>

            {/* New Invoice Form */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Invoice</CardTitle>
                  <CardDescription>
                    Create an invoice for your contracting services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Number</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="INV-001"
                                  data-testid="input-invoice-number"
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-currency">
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                                  <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="issueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Issue Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      data-testid="button-issue-date"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Due Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      data-testid="button-due-date"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < form.watch('issueDate')}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (excluding GST)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  data-testid="input-amount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {workerProfile?.gstRegistered && (
                          <FormField
                            control={form.control}
                            name="gstAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GST Amount</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    data-testid="input-gst-amount"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Usually 10% of the amount for Australian GST
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description of Services</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Describe the services provided..."
                                rows={4}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowForm(false)}
                          data-testid="button-cancel-invoice"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createInvoiceMutation.isPending}
                          data-testid="button-submit-invoice"
                        >
                          {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Invoices List */}
            <div className="space-y-4">
              {invoicesLoading ? (
                <div className="text-center py-8">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices</h3>
                      <p className="text-gray-600 mb-4">
                        You haven't created any invoices yet.
                      </p>
                      <Button onClick={() => setShowForm(true)} data-testid="button-first-invoice">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                invoices.map((invoice: any) => (
                  <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusBadgeVariant(invoice.status)} className="flex items-center gap-1">
                              {getStatusIcon(invoice.status)}
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                            <span className="font-semibold text-lg">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <strong>Issue Date:</strong> {format(new Date(invoice.issueDate), "PPP")} | 
                            <strong> Due Date:</strong> {format(new Date(invoice.dueDate), "PPP")}
                          </div>
                          <div className="text-lg font-semibold text-green-600">
                            {invoice.currency} ${invoice.totalAmount.toFixed(2)}
                            {invoice.gstAmount > 0 && (
                              <span className="text-sm text-gray-600 ml-2">
                                (incl. ${invoice.gstAmount.toFixed(2)} GST)
                              </span>
                            )}
                          </div>
                          {invoice.description && (
                            <p className="text-sm text-gray-800">{invoice.description}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div>Created: {format(new Date(invoice.createdAt), "MMM dd, yyyy")}</div>
                          {invoice.paidAt && (
                            <div>Paid: {format(new Date(invoice.paidAt), "MMM dd, yyyy")}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
    </div>
  );
}