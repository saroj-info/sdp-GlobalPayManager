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
import { PageLoader } from "@/components/ui/loader";
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
  contractId?: string;
  timesheetId?: string;
};

export default function WorkerInvoicesPage() {
  usePageHeader("Contractor Invoices", "Create and submit invoices for services rendered");
  
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Fetch worker profile to check eligibility
  const { data: workerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/workers/profile"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
    enabled: isAuthenticated,
  });

  // Worker's contracts — used to link an invoice to a specific contract
  const { data: workerContracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts'],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  // Worker's timesheets — used to link an invoice to a specific approved timesheet
  const { data: workerTimesheets = [] } = useQuery<any[]>({
    queryKey: ['/api/timesheets'],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
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
      contractId: '',
      timesheetId: '',
    }
  });

  // Auto-populate from selected timesheet
  const selectedTimesheetId = form.watch('timesheetId');
  const selectedContractId = form.watch('contractId');
  const selectedTimesheet = (workerTimesheets as any[]).find(t => t.id === selectedTimesheetId);
  const selectedContract = (workerContracts as any[]).find(c => c.id === selectedContractId);

  const submitInvoiceMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest('PATCH', `/api/invoices/${id}/status`, { status: 'submitted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ title: 'Submitted', description: 'Invoice sent to the business for approval.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to submit invoice.', variant: 'destructive' });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceData) => {
      const subtotal = data.amount.toString();
      const taxAmount = (data.gstAmount || 0).toString();
      const totalAmount = (data.amount + (data.gstAmount || 0)).toString();
      // If a timesheet is selected, derive period dates from it (more accurate than form dates).
      const ts = (workerTimesheets as any[]).find(t => t.id === data.timesheetId);
      const periodStart = ts?.periodStart
        ? new Date(ts.periodStart).toISOString()
        : (data.issueDate instanceof Date ? data.issueDate.toISOString() : data.issueDate);
      const periodEnd = ts?.periodEnd
        ? new Date(ts.periodEnd).toISOString()
        : (data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate);

      // If a contract is selected, prefer its businessId over the worker profile's default.
      const contract = (workerContracts as any[]).find(c => c.id === data.contractId);
      const businessId = contract?.businessId || (workerProfile as any)?.businessId;

      return await apiRequest('POST', '/api/invoices', {
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.issueDate instanceof Date ? data.issueDate.toISOString() : data.issueDate,
        dueDate: data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate,
        periodStart,
        periodEnd,
        description: data.description,
        subtotal,
        taxAmount,
        totalAmount,
        currency: data.currency,
        businessId,
        contractId: data.contractId || undefined,
        timesheetId: data.timesheetId || undefined,
        // Worker is creating + sending in one go — go straight to "submitted" so the business
        // sees it in their approval queue. (Old default was "draft" which left it stuck.)
        status: 'submitted',
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
    return <PageLoader label="Loading invoices" />;
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
                      {/* Contract & Timesheet pickers — link the invoice to a specific engagement */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contractId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contract</FormLabel>
                              <Select
                                value={field.value || '__none__'}
                                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-contract">
                                    <SelectValue placeholder="Select a contract (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">— None —</SelectItem>
                                  {(workerContracts as any[])
                                    .filter((c: any) => !!c.signedAt)
                                    .map((c: any) => {
                                      const label = c.contractName
                                        || c.customRoleTitle
                                        || c.roleTitle?.title
                                        || c.roleTitle?.name
                                        || 'Contract';
                                      return (
                                        <SelectItem key={c.id} value={c.id}>
                                          {label} · {c.country?.name || ''} · {c.rateType}
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Optional — link the invoice to the contract that this work falls under.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="timesheetId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Approved Timesheet</FormLabel>
                              <Select
                                value={field.value || '__none__'}
                                onValueChange={(v) => {
                                  const value = v === '__none__' ? '' : v;
                                  field.onChange(value);
                                  // Auto-fill contract, period and amount when a timesheet is picked.
                                  const ts = (workerTimesheets as any[]).find(t => t.id === value);
                                  if (ts) {
                                    if (ts.contractId) form.setValue('contractId', ts.contractId);
                                    if (ts.periodStart) form.setValue('issueDate', new Date(ts.periodStart));
                                    if (ts.periodEnd) form.setValue('dueDate', new Date(new Date(ts.periodEnd).getTime() + 30 * 24 * 60 * 60 * 1000));
                                    // Compute amount from worker rate × hours/days when available.
                                    const c = (workerContracts as any[]).find(cc => cc.id === ts.contractId);
                                    const rate = c?.rate ? parseFloat(c.rate) : 0;
                                    const hours = parseFloat(ts.totalHours || '0');
                                    const days = parseFloat(ts.totalDays || '0');
                                    if (rate > 0 && (c?.rateType === 'hourly' && hours > 0)) {
                                      form.setValue('amount', +(rate * hours).toFixed(2));
                                    } else if (rate > 0 && (c?.rateType === 'daily' && days > 0)) {
                                      form.setValue('amount', +(rate * days).toFixed(2));
                                    }
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-timesheet">
                                    <SelectValue placeholder="Select a timesheet (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__none__">— None —</SelectItem>
                                  {(workerTimesheets as any[])
                                    .filter((t: any) => t.status === 'approved')
                                    // Hide timesheets that already have any invoice (contractor OR
                                    // auto-generated SDP-side invoice) tied to them. Server tags this
                                    // via `hasInvoice` so the picker only shows un-invoiced timesheets.
                                    .filter((t: any) => !t.hasInvoice && !(invoices as any[]).some(inv => inv.timesheetId === t.id))
                                    .map((t: any) => {
                                      const period = `${new Date(t.periodStart).toLocaleDateString()} – ${new Date(t.periodEnd).toLocaleDateString()}`;
                                      const total = parseFloat(t.totalHours || '0') > 0
                                        ? `${parseFloat(t.totalHours).toFixed(1)}h`
                                        : parseFloat(t.totalDays || '0') > 0
                                          ? `${parseFloat(t.totalDays).toFixed(1)}d`
                                          : '';
                                      return (
                                        <SelectItem key={t.id} value={t.id}>
                                          {period}{total ? ` · ${total}` : ''}
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Optional — pre-fills the period and amount from the timesheet.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Read-only summary of the picked engagement */}
                      {(selectedContract || selectedTimesheet) && (
                        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                          {selectedContract && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Contract</span>
                              <span className="font-medium">
                                {selectedContract.contractName || selectedContract.customRoleTitle || selectedContract.roleTitle?.title || 'Contract'}
                                {selectedContract.rate ? ` · ${selectedContract.currency} ${selectedContract.rate}/${selectedContract.rateType}` : ''}
                              </span>
                            </div>
                          )}
                          {selectedTimesheet && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Timesheet</span>
                              <span className="font-medium">
                                {new Date(selectedTimesheet.periodStart).toLocaleDateString()} – {new Date(selectedTimesheet.periodEnd).toLocaleDateString()}
                                {parseFloat(selectedTimesheet.totalHours || '0') > 0 ? ` · ${parseFloat(selectedTimesheet.totalHours).toFixed(1)}h` : ''}
                                {parseFloat(selectedTimesheet.totalDays || '0') > 0 ? ` · ${parseFloat(selectedTimesheet.totalDays).toFixed(1)}d` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

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
                          {/* Dates row */}
                          <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600">
                            <div><span className="text-gray-500">Issue Date:</span> {format(new Date(invoice.invoiceDate), 'PPP')}</div>
                            <div><span className="text-gray-500">Due Date:</span> {format(new Date(invoice.dueDate), 'PPP')}</div>
                            {invoice.periodStart && invoice.periodEnd && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Period:</span> {format(new Date(invoice.periodStart), 'MMM d, yyyy')} – {format(new Date(invoice.periodEnd), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>

                          {/* Amount breakdown */}
                          <div className="text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-500">Subtotal</span>
                              <span>{invoice.currency} ${parseFloat(invoice.subtotal || invoice.totalAmount || '0').toFixed(2)}</span>
                            </div>
                            {parseFloat(invoice.taxAmount || '0') > 0 && (
                              <div className="flex justify-between gap-3">
                                <span className="text-gray-500">GST / Tax</span>
                                <span>{invoice.currency} ${parseFloat(invoice.taxAmount).toFixed(2)}</span>
                              </div>
                            )}
                            {invoice.hoursWorked && parseFloat(invoice.hoursWorked) > 0 && (
                              <div className="flex justify-between gap-3 text-xs text-gray-500">
                                <span>Hours</span>
                                <span>{parseFloat(invoice.hoursWorked).toFixed(1)}h{invoice.hourlyRate ? ` @ ${invoice.currency} ${parseFloat(invoice.hourlyRate).toFixed(2)}/hr` : ''}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-3 pt-1 mt-1 border-t font-semibold text-base text-green-600">
                              <span>Total</span>
                              <span>{invoice.currency} ${parseFloat(invoice.totalAmount || '0').toFixed(2)}</span>
                            </div>
                          </div>

                          {invoice.description && (
                            <div className="text-sm text-gray-800">
                              <span className="text-xs uppercase tracking-wide text-gray-500">Description</span>
                              <p className="whitespace-pre-wrap">{invoice.description}</p>
                            </div>
                          )}

                          {invoice.notes && (
                            <div className="text-xs text-gray-700 rounded-md bg-blue-50/60 border border-blue-100 p-2">
                              <span className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">Notes</span>
                              <p className="whitespace-pre-wrap mt-0.5">{invoice.notes}</p>
                            </div>
                          )}

                          {/* Activity timeline */}
                          {(invoice.submittedAt || invoice.reviewedAt || invoice.paidAt) && (
                            <div className="rounded-md border bg-muted/30 p-2 text-[11px]">
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {invoice.submittedAt && (
                                  <>
                                    <span className="text-gray-500">Submitted</span>
                                    <span className="font-medium">{format(new Date(invoice.submittedAt), 'MMM d, yyyy')}</span>
                                  </>
                                )}
                                {invoice.reviewedAt && (
                                  <>
                                    <span className="text-gray-500">{invoice.status === 'rejected' ? 'Rejected' : 'Approved'}</span>
                                    <span className="font-medium">{format(new Date(invoice.reviewedAt), 'MMM d, yyyy')}</span>
                                  </>
                                )}
                                {invoice.paidAt && (
                                  <>
                                    <span className="text-gray-500">Paid</span>
                                    <span className="font-medium">{format(new Date(invoice.paidAt), 'MMM d, yyyy')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Contract & timesheet linkage */}
                          {(invoice.contract || invoice.timesheet) && (
                            <div className="mt-2 rounded-md border bg-muted/40 p-2 space-y-1 text-xs">
                              {invoice.contract && (
                                <div>
                                  <span className="text-muted-foreground">Contract: </span>
                                  <span className="font-medium">
                                    {invoice.contract.contractName || invoice.contract.jobTitle || 'Contract'}
                                    {invoice.contract.rate ? ` · ${invoice.contract.currency} ${invoice.contract.rate}/${invoice.contract.rateType}` : ''}
                                  </span>
                                </div>
                              )}
                              {invoice.timesheet && (
                                <div>
                                  <span className="text-muted-foreground">Timesheet: </span>
                                  <span className="font-medium">
                                    {format(new Date(invoice.timesheet.periodStart), 'MMM d, yyyy')} – {format(new Date(invoice.timesheet.periodEnd), 'MMM d, yyyy')}
                                    {parseFloat(invoice.timesheet.totalHours || '0') > 0 ? ` · ${parseFloat(invoice.timesheet.totalHours).toFixed(1)}h` : ''}
                                    {parseFloat(invoice.timesheet.totalDays || '0') > 0 ? ` · ${parseFloat(invoice.timesheet.totalDays).toFixed(1)}d` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600 space-y-2">
                          <div>Created: {format(new Date(invoice.createdAt), "MMM dd, yyyy")}</div>
                          {invoice.paidAt && (
                            <div>Paid: {format(new Date(invoice.paidAt), "MMM dd, yyyy")}</div>
                          )}
                          {invoice.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => submitInvoiceMutation.mutate(invoice.id)}
                              disabled={submitInvoiceMutation.isPending}
                              data-testid={`button-submit-invoice-${invoice.id}`}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              {submitInvoiceMutation.isPending ? 'Sending...' : 'Send for Approval'}
                            </Button>
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