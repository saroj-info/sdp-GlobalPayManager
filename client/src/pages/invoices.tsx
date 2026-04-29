import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Plus, FileText, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Building, Globe, CreditCard, LayoutGrid, List } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal";
import { SdpInvoicePaymentModal } from "@/components/modals/sdp-invoice-payment-modal";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  description?: string;
  hoursWorked?: string;
  hourlyRate?: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  status: string;
  notes?: string;
  timesheetId?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  contractor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    country: {
      name: string;
      code: string;
    };
  };
  business: {
    id: string;
    name: string;
  };
}

interface SdpInvoice {
  id: string;
  invoiceNumber: string;
  fromCountryId: string;
  fromCountryName: string;
  toBusinessId: string;
  toBusinessName: string;
  serviceType: string;
  description: string;
  subtotal: string;
  gstVatAmount: string;
  gstVatRate: string;
  totalAmount: string;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  status: string;
  isCrossBorder: boolean;
  createdAt: string;
  issuerName?: string;
  paidAt?: string | Date | null;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-purple-100 text-purple-800",
};

type InvoiceSource = 'contractor' | 'sdp_services' | 'customer_billing' | 'business_to_client';

function getContractLabel(invoice: any): string | null {
  const c = invoice?.contract;
  if (!c) return null;
  return (
    c.contractName ||
    c.customRoleTitle ||
    c.roleTitle?.title ||
    c.roleTitle?.name ||
    c.jobTitle ||
    null
  );
}

function formatPeriod(start: string | Date, end: string | Date): string {
  const fmt = (d: string | Date) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Single source of truth for "who raised / who pays / which contract / which timesheet"
 * across all 7 invoice tabs in the app.
 */
function InvoiceParties({ invoice, source }: { invoice: any; source: InvoiceSource }) {
  const fromCountryName = invoice.fromCountry?.name || invoice.fromCountryName || '';
  const toBusinessName = invoice.toBusiness?.name || invoice.toBusinessName || '';
  const fromBusinessName = invoice.fromBusiness?.name || invoice.fromBusinessName || '';

  let raisedBy: React.ReactNode = '—';
  let payableBy: React.ReactNode = '—';

  if (source === 'contractor') {
    const c = invoice.contractor;
    raisedBy = c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : '—';
    payableBy = invoice.business?.name || '—';
  } else if (source === 'sdp_services') {
    raisedBy = fromCountryName ? `SDP ${fromCountryName}` : 'SDP Global Pay';
    payableBy = toBusinessName || '—';
  } else if (source === 'customer_billing') {
    raisedBy = (
      <span>
        {fromCountryName ? `SDP ${fromCountryName}` : 'SDP Global Pay'}
        {fromBusinessName && (
          <span className="text-xs text-secondary-500"> · on behalf of {fromBusinessName}</span>
        )}
      </span>
    );
    payableBy = toBusinessName || '—';
  } else if (source === 'business_to_client') {
    raisedBy = fromBusinessName || '—';
    payableBy = toBusinessName || '—';
  }

  const contractLabel = getContractLabel(invoice);
  const ts = invoice.timesheet;
  const periodStart = ts?.periodStart || invoice.periodStart;
  const periodEnd = ts?.periodEnd || invoice.periodEnd;
  const showPeriod = !!(periodStart && periodEnd);

  return (
    <div className="rounded-md border border-secondary-200 bg-secondary-50/50 p-3 space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-secondary-600">Raised by</span>
        <span className="font-medium text-secondary-900 text-right truncate max-w-[60%]">{raisedBy}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-secondary-600">Payable by</span>
        <span className="font-semibold text-orange-700 text-right truncate max-w-[60%]">{payableBy}</span>
      </div>
      {contractLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">Contract</span>
          <span className="text-secondary-900 text-right truncate max-w-[60%]">{contractLabel}</span>
        </div>
      )}
      {showPeriod && (
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">Timesheet</span>
          <span className="text-secondary-900 text-right">{formatPeriod(periodStart, periodEnd)}</span>
        </div>
      )}
    </div>
  );
}

const statusIcons = {
  draft: Clock,
  submitted: FileText,
  under_review: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
  paid: DollarSign,
};

export default function Invoices() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SdpInvoice | null>(null);
  const [activeTab, setActiveTab] = useState("contractor");
  const [contractorViewMode, setContractorViewMode] = useState<'card' | 'list'>('card');
  const [contractorSortBy, setContractorSortBy] = useState<'date' | 'invoice_number' | 'contractor' | 'amount' | 'status'>('date');
  const [sdpViewMode, setSdpViewMode] = useState<'card' | 'list'>('card');
  const [sdpSortBy, setSdpSortBy] = useState<'date' | 'invoice_number' | 'country' | 'service' | 'amount' | 'status'>('date');
  const [clientViewMode, setClientViewMode] = useState<'card' | 'list'>('card');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Contractor invoices (existing functionality)
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  // SDP invoices for business users
  const { data: sdpInvoices = [], isLoading: isSdpLoading } = useQuery<SdpInvoice[]>({
    queryKey: ["/api/business/sdp-invoices"],
    enabled: user?.userType === 'business_user',
  });

  // Detect whether the current user owns a host-client business (parentBusinessId set)
  const { data: myBusiness } = useQuery<any>({
    queryKey: ["/api/businesses/me"],
    enabled: user?.userType === 'business_user',
  });
  const isHostClientBusiness = !!myBusiness?.parentBusinessId;

  // Client invoices raised BY this business TO their host clients — not relevant for host-client users
  const { data: clientInvoices = [], isLoading: isClientInvoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/client-invoices"],
    enabled: user?.userType === 'business_user' && !isHostClientBusiness,
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["/api/timesheets"],
    enabled: user?.userType === 'worker',
  });

  // Sort contractor invoices based on selected sort option
  const sortedContractorInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => {
      switch (contractorSortBy) {
        case 'date':
          return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        case 'invoice_number':
          return a.invoiceNumber.localeCompare(b.invoiceNumber);
        case 'contractor':
          const aName = `${a.contractor.firstName} ${a.contractor.lastName}`;
          const bName = `${b.contractor.firstName} ${b.contractor.lastName}`;
          return aName.localeCompare(bName);
        case 'amount':
          return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [invoices, contractorSortBy]);

  // Sort SDP invoices based on selected sort option
  const sortedSdpInvoices = useMemo(() => {
    return [...sdpInvoices].sort((a, b) => {
      switch (sdpSortBy) {
        case 'date':
          return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
        case 'invoice_number':
          return a.invoiceNumber.localeCompare(b.invoiceNumber);
        case 'country':
          return a.fromCountryName.localeCompare(b.fromCountryName);
        case 'service':
          return a.serviceType.localeCompare(b.serviceType);
        case 'amount':
          return parseFloat(b.totalAmount) - parseFloat(a.totalAmount);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [sdpInvoices, sdpSortBy]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/invoices/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const createFromTimesheetMutation = useMutation({
    mutationFn: async ({ timesheetId, data }: { timesheetId: string; data: any }) => {
      await apiRequest("POST", `/api/invoices/from-timesheet/${timesheetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleStatusUpdate = (invoiceId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: invoiceId, status: newStatus });
  };

  const handleCreateFromTimesheet = (timesheetId: string) => {
    createFromTimesheetMutation.mutate({ 
      timesheetId, 
      data: { 
        status: 'draft',
        currency: 'USD'
      } 
    });
  };

  const canUpdateStatus = user?.userType === 'business_user' || user?.userType === 'sdp_internal';
  const canCreateInvoices = user?.userType === 'worker' || user?.userType === 'business_user' || user?.userType === 'sdp_internal';

  const headerDescription = user?.userType === 'worker' 
    ? 'Manage your contractor invoices'
    : user?.userType === 'business_user'
    ? 'Review and manage all your invoices'
    : 'Monitor all contractor invoices across businesses';

  usePageHeader("Invoices", headerDescription);

  if (isLoading) {
    return (
          <div className="p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
    );
  }

  return (
        <div className="p-6">
          {canCreateInvoices && (
            <div className="flex justify-end mb-6">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          )}

          {/* Tabs for business users to separate contractor and SDP invoices */}
          {user?.userType === 'business_user' ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${isHostClientBusiness ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <TabsTrigger value="contractor" className="flex items-center gap-2" data-testid="tab-contractor-invoices">
                  <FileText className="h-4 w-4" />
                  Contractor Invoices
                </TabsTrigger>
                <TabsTrigger value="sdp" className="flex items-center gap-2" data-testid="tab-sdp-invoices">
                  <Building className="h-4 w-4" />
                  SDP Global Pay Invoices
                </TabsTrigger>
                {!isHostClientBusiness && (
                  <TabsTrigger value="client" className="flex items-center gap-2" data-testid="tab-client-invoices">
                    <Globe className="h-4 w-4" />
                    Client Invoices
                    {clientInvoices.length > 0 && (
                      <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{clientInvoices.length}</span>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="contractor" className="mt-6">
                <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 mb-4 text-sm text-blue-900">
                  <span className="font-medium">Bills from your contractors.</span>{' '}
                  Each invoice is raised by the contractor and is payable by your business.
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div className="text-sm text-gray-600">
                    Invoices from your contractors for services rendered
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant={contractorViewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setContractorViewMode('card')}
                        className="h-8"
                        data-testid="button-view-card-contractor"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={contractorViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setContractorViewMode('list')}
                        className="h-8"
                        data-testid="button-view-list-contractor"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Sort Dropdown */}
                    <Select value={contractorSortBy} onValueChange={(value: any) => setContractorSortBy(value)}>
                      <SelectTrigger className="w-[180px]" data-testid="select-sort-by-contractor">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date Created</SelectItem>
                        <SelectItem value="invoice_number">Invoice Number</SelectItem>
                        <SelectItem value="contractor">Contractor Name</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Available Timesheets for Invoice Creation — hidden, kept for future use
                {canCreateInvoices && timesheets.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Create Invoice from Timesheet</CardTitle>
                      <CardDescription>
                        Convert approved timesheets into invoices
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {timesheets
                          .filter((ts: any) => ts.status === 'approved' && !invoices.some(inv => inv.timesheetId === ts.id))
                          .map((timesheet: any) => (
                            <div key={timesheet.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium">
                                  {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                  {timesheet.totalHours}h
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleCreateFromTimesheet(timesheet.id)}
                                disabled={createFromTimesheetMutation.isPending}
                                className="w-full"
                              >
                                Create Invoice
                              </Button>
                            </div>
                          ))}
                      </div>
                      {timesheets.filter((ts: any) => ts.status === 'approved' && !invoices.some(inv => inv.timesheetId === ts.id)).length === 0 && (
                        <p className="text-secondary-600 text-sm">No approved timesheets available for invoice creation.</p>
                      )}
                    </CardContent>
                  </Card>
                )}
                */}

                {/* Contractor Invoices Grid or List */}
                {isLoading ? (
                  <div className="text-center py-8">Loading contractor invoices...</div>
                ) : (
                  <>
                    {contractorViewMode === 'list' ? (
                      /* List View */
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice Number</TableHead>
                              <TableHead>Contractor</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedContractorInvoices.map((invoice) => {
                              const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons];
                              return (
                                <TableRow key={invoice.id} data-testid={`row-contractor-invoice-${invoice.id}`}>
                                  <TableCell>
                                    <div className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                                      {invoice.invoiceNumber}
                                    </div>
                                    {invoice.timesheetId && (
                                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        From Timesheet
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">
                                      {user?.userType === 'worker' 
                                        ? invoice.business.name 
                                        : `${invoice.contractor.firstName} ${invoice.contractor.lastName}`}
                                    </div>
                                    {invoice.hoursWorked && (
                                      <div className="text-xs text-gray-500">
                                        {parseFloat(invoice.hoursWorked).toFixed(1)}h worked
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">
                                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {invoice.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {canUpdateStatus && invoice.status === 'submitted' && (
                                      <div className="flex gap-2 justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleStatusUpdate(invoice.id, 'approved')}
                                          disabled={updateStatusMutation.isPending}
                                          className="text-green-600 border-green-200 hover:bg-green-50"
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleStatusUpdate(invoice.id, 'rejected')}
                                          disabled={updateStatusMutation.isPending}
                                          className="text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      /* Card View */
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sortedContractorInvoices.map((invoice) => {
                          const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons];
                          
                          return (
                            <Card key={invoice.id} className="hover:shadow-md transition-shadow" data-testid={`contractor-invoice-${invoice.id}`}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                                  <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {invoice.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </CardHeader>

                              <CardContent className="space-y-4">
                                <InvoiceParties invoice={invoice} source="contractor" />
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Period:</span>
                                    <span>{formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</span>
                                  </div>
                                  
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Due Date:</span>
                                    <span>{formatDate(invoice.dueDate)}</span>
                                  </div>
                                  
                                  {invoice.hoursWorked && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">Hours:</span>
                                      <span>{parseFloat(invoice.hoursWorked).toFixed(1)}h</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between font-medium pt-2 border-t">
                                    <span>Total Amount:</span>
                                    <span className="text-primary-600">
                                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                                    </span>
                                  </div>
                                </div>

                                {invoice.description && (
                                  <div className="text-sm text-secondary-600">
                                    {invoice.description}
                                  </div>
                                )}

                                {invoice.timesheetId && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    From Timesheet
                                  </Badge>
                                )}

                                {canUpdateStatus && invoice.status === 'submitted' && (
                                  <div className="flex gap-2 pt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(invoice.id, 'approved')}
                                      disabled={updateStatusMutation.isPending}
                                      className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(invoice.id, 'rejected')}
                                      disabled={updateStatusMutation.isPending}
                                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {sortedContractorInvoices.length === 0 && (
                      <Card className="text-center py-12">
                        <CardContent>
                          <FileText className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
                          <h3 className="text-lg font-medium text-secondary-900 mb-2">No contractor invoices yet</h3>
                          <p className="text-secondary-600 mb-4">
                            {canCreateInvoices
                              ? "Create your first invoice to get started with billing."
                              : "No invoices have been submitted yet."
                            }
                          </p>
                          {canCreateInvoices && (
                            <Button 
                              onClick={() => setShowCreateModal(true)}
                              className="bg-primary-600 hover:bg-primary-700"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Invoice
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="sdp" className="mt-6">
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 mb-4 text-sm text-amber-900">
                  <span className="font-medium">Bills you owe.</span>{' '}
                  Invoices addressed to your business — typically raised by an SDP Global Pay entity for employment services. Your business is the payer.
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div className="text-sm text-gray-600">
                    Invoices from SDP Global Pay for employment services
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant={sdpViewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSdpViewMode('card')}
                        className="h-8"
                        data-testid="button-view-card-sdp"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={sdpViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSdpViewMode('list')}
                        className="h-8"
                        data-testid="button-view-list-sdp"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Sort Dropdown */}
                    <Select value={sdpSortBy} onValueChange={(value: any) => setSdpSortBy(value)}>
                      <SelectTrigger className="w-[180px]" data-testid="select-sort-by-sdp">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date Created</SelectItem>
                        <SelectItem value="invoice_number">Invoice Number</SelectItem>
                        <SelectItem value="country">Country</SelectItem>
                        <SelectItem value="service">Service Type</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* SDP Invoices Grid or List */}
                {isSdpLoading ? (
                  <div className="text-center py-8">Loading SDP invoices...</div>
                ) : (
                  <>
                    {sdpViewMode === 'list' ? (
                      /* List View */
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice Number</TableHead>
                              <TableHead>Country</TableHead>
                              <TableHead>Service Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedSdpInvoices.map((invoice) => {
                              const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons] || FileText;
                              return (
                                <TableRow key={invoice.id} data-testid={`row-sdp-invoice-${invoice.id}`}>
                                  <TableCell>
                                    <div className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                                      {invoice.invoiceNumber}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatDate(invoice.invoiceDate)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Globe className="h-3 w-3 text-gray-400" />
                                      {invoice.fromCountryName}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="capitalize">{invoice.serviceType.replace('_', ' ')}</span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">
                                      {invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                                  <TableCell>
                                    <Badge className={statusColors[invoice.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {invoice.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {(invoice.status === 'issued' || invoice.status === 'overdue') && (
                                      <Button 
                                        size="sm" 
                                        className="bg-green-600 hover:bg-green-700"
                                        data-testid={`button-pay-invoice-${invoice.id}`}
                                        onClick={() => {
                                          setSelectedInvoiceForPayment(invoice);
                                          setShowPaymentModal(true);
                                        }}
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      /* Card View */
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {sortedSdpInvoices.map((invoice) => {
                        const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons] || FileText;
                        
                        return (
                          <Card key={invoice.id} className="hover:shadow-md transition-shadow" data-testid={`sdp-invoice-${invoice.id}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                                <Badge className={statusColors[invoice.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {invoice.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              <InvoiceParties
                                invoice={invoice}
                                source={((invoice as any).invoiceCategory as InvoiceSource) || 'sdp_services'}
                              />
                              <div className="space-y-2">
                                {(invoice as any).worker && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Worker:</span>
                                    <span className="font-medium truncate max-w-[60%] text-right">{(invoice as any).worker.firstName} {(invoice as any).worker.lastName}</span>
                                  </div>
                                )}
                                {(invoice as any).contract?.jobTitle && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Role:</span>
                                    <span className="truncate max-w-[60%] text-right">{(invoice as any).contract.jobTitle}</span>
                                  </div>
                                )}
                                {(invoice as any).timesheet && (
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">Period:</span>
                                      <span>{formatDate((invoice as any).timesheet.periodStart)} – {formatDate((invoice as any).timesheet.periodEnd)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">Time Logged:</span>
                                      <span>
                                        {parseFloat((invoice as any).timesheet.totalDays || '0') > 0
                                          ? `${parseFloat((invoice as any).timesheet.totalDays).toFixed(1)}d`
                                          : `${parseFloat((invoice as any).timesheet.totalHours || '0').toFixed(1)}h`}
                                        {(invoice as any).timesheet.entryCount ? ` · ${(invoice as any).timesheet.entryCount} entries` : ''}
                                      </span>
                                    </div>
                                  </>
                                )}
                                {(invoice as any).contract?.rateType && (
                                  isHostClientBusiness
                                    ? (
                                      // Host clients see only the rate they are billed at — never the worker's actual pay.
                                      // Labelled "Billing Rate" so the same label is never overloaded with two meanings.
                                      (invoice as any).contract.customerBillingRate && (
                                        <div className="flex justify-between text-sm">
                                          <span className="text-secondary-600">Billing Rate:</span>
                                          <span>{(invoice as any).contract.customerCurrency || (invoice as any).contract.currency} {parseFloat((invoice as any).contract.customerBillingRate).toFixed(2)}/{(invoice as any).contract.customerBillingRateType || ((invoice as any).contract.rateType === 'daily' ? 'day' : 'hr')}</span>
                                        </div>
                                      )
                                    )
                                    : (
                                      // SDP and employing business see the actual worker pay rate
                                      (invoice as any).contract.rate && (
                                        <div className="flex justify-between text-sm">
                                          <span className="text-secondary-600">Worker Rate:</span>
                                          <span>{(invoice as any).contract.currency} {parseFloat((invoice as any).contract.rate).toFixed(2)}/{(invoice as any).contract.rateType === 'daily' ? 'day' : (invoice as any).contract.rateType === 'hourly' ? 'hr' : (invoice as any).contract.rateType}</span>
                                        </div>
                                      )
                                    )
                                )}
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Service:</span>
                                  <span className="capitalize text-right truncate max-w-[60%]">{invoice.serviceType.replace(/_/g, ' ')}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Due Date:</span>
                                  <span>{formatDate(invoice.dueDate)}</span>
                                </div>

                                {(invoice as any).contract?.paymentTerms && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Payment Terms:</span>
                                    <span>Net {(invoice as any).contract.paymentTerms}</span>
                                  </div>
                                )}

                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Subtotal:</span>
                                  <span>{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">GST/VAT{invoice.gstVatRate ? ` (${parseFloat(invoice.gstVatRate).toFixed(0)}%)` : ''}:</span>
                                  <span>{invoice.currency} {parseFloat(invoice.gstVatAmount).toFixed(2)}</span>
                                </div>

                                {(invoice as any).lineItems && (invoice as any).lineItems.length > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Line Items:</span>
                                    <span>{(invoice as any).lineItems.length}</span>
                                  </div>
                                )}

                                <div className="flex justify-between font-medium pt-2 border-t">
                                  <span>Total Amount:</span>
                                  <span className="text-primary-600">
                                    {invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {invoice.description && (
                                <div className="text-xs text-secondary-600 bg-secondary-50 rounded p-2">
                                  {invoice.description}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1.5">
                                {invoice.isCrossBorder && (
                                  <Badge variant="outline" className="text-xs text-blue-600">
                                    <Globe className="h-3 w-3 mr-1" />Cross-Border
                                  </Badge>
                                )}
                                {(invoice as any).timesheetId && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />From Timesheet
                                  </Badge>
                                )}
                                {(invoice as any).contract?.billingMode && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {String((invoice as any).contract.billingMode).replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {(invoice as any).contract?.employmentType && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {String((invoice as any).contract.employmentType).replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>

                              {(invoice.status === 'issued' || invoice.status === 'overdue') && (
                                <Button 
                                  size="sm" 
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  data-testid={`button-pay-invoice-${invoice.id}`}
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(invoice);
                                    setShowPaymentModal(true);
                                  }}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Pay Invoice
                                </Button>
                              )}
                              
                              {invoice.status === 'paid' && (
                                <div className="flex items-center justify-center py-2 text-green-600 text-sm">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Paid on {invoice.paidAt ? formatDate(invoice.paidAt) : 'N/A'}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      </div>
                    )}

                    {sortedSdpInvoices.length === 0 && (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Building className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
                          <h3 className="text-lg font-medium text-secondary-900 mb-2">No SDP invoices yet</h3>
                          <p className="text-secondary-600">
                            SDP Global Pay invoices for employment services will appear here.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="client" className="mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Invoices billed to your host clients — includes auto-generated invoices from approved timesheets and any manually created invoices.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">
                        <CheckCircle className="h-3 w-3" /> Auto-generated from timesheet
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
                        <FileText className="h-3 w-3" /> Manually created
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => window.location.href = '/invoices/new-client'}
                    data-testid="button-new-client-invoice"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Client Invoice
                  </Button>
                </div>
                {isClientInvoicesLoading ? (
                  <div className="text-center py-8">Loading client invoices...</div>
                ) : clientInvoices.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No client invoices yet</h3>
                      <p className="text-gray-500 text-sm mb-4">
                        Client invoices are auto-generated when you approve timesheets for workers on "Invoice Through Platform" contracts.
                        You can also create them manually below.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => window.location.href = '/invoices/new-client'}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Client Invoice Manually
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Grid/List toggle for client invoices */}
                    <div className="flex justify-end mb-3">
                      <div className="flex items-center border rounded-lg p-0.5">
                        <Button
                          variant={clientViewMode === 'card' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setClientViewMode('card')}
                          data-testid="client-view-card"
                          title="Card view"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={clientViewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setClientViewMode('list')}
                          data-testid="client-view-list"
                          title="List view"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {clientViewMode === 'list' ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Billed To</TableHead>
                              <TableHead>Worker / Role</TableHead>
                              <TableHead>Period</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientInvoices.map((invoice: any) => {
                              const isAutoGenerated = invoice.invoiceCategory === 'customer_billing';
                              return (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-medium text-sm">{invoice.invoiceNumber}</TableCell>
                                  <TableCell>
                                    {isAutoGenerated ? (
                                      <Badge className="bg-purple-100 text-purple-700 text-xs">Auto</Badge>
                                    ) : (
                                      <Badge className="bg-indigo-100 text-indigo-700 text-xs">Manual</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">{invoice.toBusiness?.name || '—'}</TableCell>
                                  <TableCell className="text-sm">
                                    {invoice.worker ? (
                                      <div>
                                        <div className="font-medium">{invoice.worker.firstName} {invoice.worker.lastName}</div>
                                        {invoice.contract?.jobTitle && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{invoice.contract.jobTitle}</div>}
                                      </div>
                                    ) : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {invoice.timesheet ? (
                                      <div>
                                        <div>{new Date(invoice.timesheet.periodStart).toLocaleDateString()} – {new Date(invoice.timesheet.periodEnd).toLocaleDateString()}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {parseFloat(invoice.timesheet.totalDays || '0') > 0
                                            ? `${parseFloat(invoice.timesheet.totalDays).toFixed(1)}d`
                                            : `${parseFloat(invoice.timesheet.totalHours || '0').toFixed(1)}h`}
                                        </div>
                                      </div>
                                    ) : invoice.periodStart ? `${new Date(invoice.periodStart).toLocaleDateString()} – ${new Date(invoice.periodEnd).toLocaleDateString()}` : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">{invoice.currency} {parseFloat(invoice.totalAmount || '0').toFixed(2)}</TableCell>
                                  <TableCell className="text-sm">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</TableCell>
                                  <TableCell>
                                    <Badge className={
                                      invoice.status === 'paid' ? 'bg-green-100 text-green-800 text-xs' :
                                      invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 text-xs' :
                                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800 text-xs' :
                                      'bg-gray-100 text-gray-700 text-xs'
                                    }>
                                      {invoice.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {clientInvoices.map((invoice: any) => {
                      const isAutoGenerated = invoice.invoiceCategory === 'customer_billing';
                      const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons] || FileText;
                      const totalLabel = invoice.timesheet
                        ? (parseFloat(invoice.timesheet.totalDays || '0') > 0
                            ? `${parseFloat(invoice.timesheet.totalDays).toFixed(1)}d`
                            : `${parseFloat(invoice.timesheet.totalHours || '0').toFixed(1)}h`)
                        : null;
                      return (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow" data-testid={`client-invoice-${invoice.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                              <Badge className={statusColors[invoice.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {invoice.status}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              {isAutoGenerated ? (
                                <Badge className="bg-purple-100 text-purple-700 text-[10px] py-0">Auto-generated</Badge>
                              ) : (
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px] py-0">Manual</Badge>
                              )}
                              <span className="text-xs text-secondary-500">{formatDate(invoice.invoiceDate)}</span>
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <InvoiceParties
                              invoice={invoice}
                              source={(invoice.invoiceCategory as InvoiceSource) || 'business_to_client'}
                            />
                            {isAutoGenerated && (
                              <div className="rounded-md border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs text-purple-900">
                                <span className="font-semibold">Collected by SDP</span> from {invoice.toBusiness?.name || 'the host client'}.
                                Your margin will be settled with you separately.
                              </div>
                            )}
                            <div className="space-y-2">
                              {invoice.worker && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Worker:</span>
                                  <span className="font-medium truncate max-w-[60%] text-right">{invoice.worker.firstName} {invoice.worker.lastName}</span>
                                </div>
                              )}
                              {invoice.contract?.jobTitle && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Role:</span>
                                  <span className="truncate max-w-[60%] text-right">{invoice.contract.jobTitle}</span>
                                </div>
                              )}
                              {(invoice.timesheet || invoice.periodStart) && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Period:</span>
                                  <span>
                                    {invoice.timesheet
                                      ? `${formatDate(invoice.timesheet.periodStart)} – ${formatDate(invoice.timesheet.periodEnd)}`
                                      : `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
                                  </span>
                                </div>
                              )}
                              {totalLabel && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Time Logged:</span>
                                  <span>{totalLabel}</span>
                                </div>
                              )}
                              {invoice.contract?.rateType && invoice.contract?.customerBillingRate && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Client Rate:</span>
                                  <span>{invoice.contract.customerCurrency || invoice.currency} {parseFloat(invoice.contract.customerBillingRate).toFixed(2)}/{invoice.contract.rateType === 'daily' ? 'day' : invoice.contract.rateType === 'hourly' ? 'hr' : invoice.contract.rateType}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-secondary-600">Invoice Date:</span>
                                <span>{invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '—'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-secondary-600">Due Date:</span>
                                <span>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</span>
                              </div>
                              {invoice.lineItems && invoice.lineItems.length > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Line Items:</span>
                                  <span>{invoice.lineItems.length}</span>
                                </div>
                              )}
                              {parseFloat(invoice.gstVatAmount || '0') > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">GST/VAT ({parseFloat(invoice.gstVatRate || '0').toFixed(0)}%):</span>
                                  <span>{invoice.currency} {parseFloat(invoice.gstVatAmount).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-medium pt-2 border-t">
                                <span>Total Amount:</span>
                                <span className="text-primary-600">{invoice.currency} {parseFloat(invoice.totalAmount || '0').toFixed(2)}</span>
                              </div>
                            </div>

                            {invoice.description && (
                              <div className="text-xs text-secondary-600 bg-secondary-50 rounded p-2">
                                {invoice.description}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              {invoice.timesheetId && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />From Timesheet
                                </Badge>
                              )}
                              {invoice.contract?.billingMode && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {String(invoice.contract.billingMode).replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {isAutoGenerated && invoice.suggestedMargin && parseFloat(invoice.suggestedMargin) > 0 && (
                                <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                  <DollarSign className="h-3 w-3 mr-0.5" />
                                  Margin: {invoice.currency} {parseFloat(invoice.suggestedMargin).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            // Non-business users see the original interface
            <>
              {/* Available Timesheets for Invoice Creation — hidden, kept for future use
              {canCreateInvoices && timesheets.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create Invoice from Timesheet</CardTitle>
                <CardDescription>
                  Convert approved timesheets into invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {timesheets
                    .filter((ts: any) => ts.status === 'approved' && !invoices.some(inv => inv.timesheetId === ts.id))
                    .map((timesheet: any) => (
                      <div key={timesheet.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">
                            {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {timesheet.totalHours}h
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateFromTimesheet(timesheet.id)}
                          disabled={createFromTimesheetMutation.isPending}
                          className="w-full"
                        >
                          Create Invoice
                        </Button>
                      </div>
                    ))}
                </div>
                {timesheets.filter((ts: any) => ts.status === 'approved' && !invoices.some(inv => inv.timesheetId === ts.id)).length === 0 && (
                  <p className="text-secondary-600 text-sm">No approved timesheets available for invoice creation.</p>
                )}
              </CardContent>
            </Card>
          )}
          */}
            </>
          )}

          {showCreateModal && (
            <CreateInvoiceModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
              }}
            />
          )}

          {showPaymentModal && selectedInvoiceForPayment && (
            <SdpInvoicePaymentModal
              invoice={selectedInvoiceForPayment}
              onClose={() => {
                setShowPaymentModal(false);
                setSelectedInvoiceForPayment(null);
              }}
              onSuccess={() => {
                setShowPaymentModal(false);
                setSelectedInvoiceForPayment(null);
                // Invalidate both SDP invoices queries to refresh the data
                queryClient.invalidateQueries({ queryKey: ["/api/business/sdp-invoices"] });
              }}
            />
          )}
        </div>
  );
}