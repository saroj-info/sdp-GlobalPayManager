import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Plus, FileText, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Building, Globe, CreditCard, LayoutGrid, List } from "lucide-react";
import { Loader, PageLoader } from "@/components/ui/loader";
import { DataPagination } from "@/components/ui/data-pagination";
import { usePagination } from "@/hooks/usePagination";
import { apiRequest } from "@/lib/queryClient";
import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal";
import { SdpInvoicePaymentModal } from "@/components/modals/sdp-invoice-payment-modal";
import { InvoiceDetailsModal } from "@/components/modals/invoice-details-modal";
import { MarginPaymentDetailsModal } from "@/components/modals/margin-payment-details-modal";
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
  contractId?: string;
  submittedAt?: string;
  reviewedAt?: string;
  paidAt?: string | Date | null;
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

// Older line-item descriptions stored a raw `Date.toString()` chunk
// ("Fri May 15 2026 00:00:00 GMT+0000 (Coordinated Universal Time)"). Scrub
// those to `YYYY-MM-DD` at render time so the card stays readable.
function formatLineItemDescription(description: string | null | undefined): string {
  if (!description) return '';
  return description.replace(
    /([A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{4}) \d{2}:\d{2}:\d{2} GMT[+-]\d{4} \([^)]*\)/g,
    (_match, head) => {
      const d = new Date(head);
      if (isNaN(d.getTime())) return head;
      return d.toISOString().slice(0, 10);
    },
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
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<any | null>(null);
  const [selectedMarginPayment, setSelectedMarginPayment] = useState<any | null>(null);
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

  // Margin payments owed to / paid to this business by SDP — sourced from the
  // customer_billing invoices SDP raised on their behalf.
  const { data: marginPayments = [], isLoading: isMarginPaymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/margin-payments", myBusiness?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/margin-payments?businessId=${myBusiness?.id}`);
      return res.json();
    },
    enabled: user?.userType === 'business_user' && !isHostClientBusiness && !!myBusiness?.id,
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

  // Client-side pagination for each tab. Each tab has its own page state so switching
  // tabs doesn't reset your position in the others.
  const INVOICES_PAGE_SIZE = 12;
  const contractorPagination = usePagination(sortedContractorInvoices, { pageSize: INVOICES_PAGE_SIZE });
  const sdpPagination = usePagination(sortedSdpInvoices, { pageSize: INVOICES_PAGE_SIZE });
  const clientPagination = usePagination(clientInvoices as any[], { pageSize: INVOICES_PAGE_SIZE });

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
    return <PageLoader label="Loading invoices" />;
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

          {/* Tabs for business + SDP users to separate contractor (and, for businesses, SDP / Client) invoices */}
          {(user?.userType === 'business_user' || user?.userType === 'sdp_internal') ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {(() => {
                const cols =
                  user?.userType === 'sdp_internal' ? 'grid-cols-1' :
                  isHostClientBusiness ? 'grid-cols-2' : 'grid-cols-4';
                return (
                  <TabsList className={`grid w-full ${cols}`}>
                    <TabsTrigger value="contractor" className="flex items-center gap-2" data-testid="tab-contractor-invoices">
                      <FileText className="h-4 w-4" />
                      Contractor Invoices
                    </TabsTrigger>
                    {user?.userType === 'business_user' && (
                      <TabsTrigger value="sdp" className="flex items-center gap-2" data-testid="tab-sdp-invoices">
                        <Building className="h-4 w-4" />
                        SDP Global Pay Invoices
                      </TabsTrigger>
                    )}
                    {user?.userType === 'business_user' && !isHostClientBusiness && (
                      <TabsTrigger value="client" className="flex items-center gap-2" data-testid="tab-client-invoices">
                        <Globe className="h-4 w-4" />
                        Client Invoices
                        {clientInvoices.length > 0 && (
                          <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{clientInvoices.length}</span>
                        )}
                      </TabsTrigger>
                    )}
                    {user?.userType === 'business_user' && !isHostClientBusiness && (
                      <TabsTrigger value="margin" className="flex items-center gap-2" data-testid="tab-margin-payments">
                        <DollarSign className="h-4 w-4" />
                        Margin Payments
                        {marginPayments.length > 0 && (
                          <span className="ml-1 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">{marginPayments.length}</span>
                        )}
                      </TabsTrigger>
                    )}
                  </TabsList>
                );
              })()}
              
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
                  <Loader fullPage label="Loading contractor invoices" />
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
                            {contractorPagination.pageItems.map((invoice: any) => {
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
                                    {canUpdateStatus && (invoice.status === 'submitted' || invoice.status === 'draft') && (
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
                                    {canUpdateStatus && invoice.status === 'approved' && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                                        disabled={updateStatusMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Mark Paid
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
                        {contractorPagination.pageItems.map((invoice: any) => {
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

                                {/* Contractor contact / country — useful for SDP and business owners */}
                                {(invoice.contractor?.email || invoice.contractor?.country?.name) && user?.userType !== 'worker' && (
                                  <div className="rounded-md border border-secondary-200 bg-white px-2.5 py-1.5 text-[11px] text-secondary-700 space-y-0.5">
                                    {invoice.contractor.email && (
                                      <div className="flex justify-between gap-2">
                                        <span className="text-secondary-500">Email</span>
                                        <span className="font-medium truncate max-w-[60%]" title={invoice.contractor.email}>{invoice.contractor.email}</span>
                                      </div>
                                    )}
                                    {invoice.contractor.country?.name && (
                                      <div className="flex justify-between gap-2">
                                        <span className="text-secondary-500">Country</span>
                                        <span className="font-medium">{invoice.contractor.country.name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Linked contract & timesheet (if either was set when the invoice was created) */}
                                {((invoice as any).contract || (invoice as any).timesheet) && (
                                  <div className="rounded-md border border-secondary-200 bg-secondary-50/40 p-2 text-xs space-y-1">
                                    {(invoice as any).contract && (
                                      <div className="flex justify-between gap-2">
                                        <span className="text-secondary-600">Contract</span>
                                        <span className="font-medium text-right truncate max-w-[60%]">
                                          {(invoice as any).contract.contractName || (invoice as any).contract.jobTitle || 'Contract'}
                                          {(invoice as any).contract.rate ? ` · ${(invoice as any).contract.currency} ${(invoice as any).contract.rate}/${(invoice as any).contract.rateType}` : ''}
                                        </span>
                                      </div>
                                    )}
                                    {(invoice as any).timesheet && (
                                      <>
                                        <div className="flex justify-between gap-2">
                                          <span className="text-secondary-600">Timesheet</span>
                                          <span className="font-medium text-right">
                                            {formatDate((invoice as any).timesheet.periodStart)} – {formatDate((invoice as any).timesheet.periodEnd)}
                                            {parseFloat((invoice as any).timesheet.totalHours || '0') > 0 ? ` · ${parseFloat((invoice as any).timesheet.totalHours).toFixed(1)}h` : ''}
                                            {parseFloat((invoice as any).timesheet.totalDays || '0') > 0 ? ` · ${parseFloat((invoice as any).timesheet.totalDays).toFixed(1)}d` : ''}
                                          </span>
                                        </div>
                                        {((invoice as any).timesheet.entryCount > 0 || (invoice as any).timesheet.status) && (
                                          <div className="flex justify-between gap-2">
                                            <span className="text-secondary-600">Entries / Status</span>
                                            <span className="font-medium text-right capitalize">
                                              {(invoice as any).timesheet.entryCount ? `${(invoice as any).timesheet.entryCount} entr${(invoice as any).timesheet.entryCount === 1 ? 'y' : 'ies'}` : ''}
                                              {(invoice as any).timesheet.entryCount && (invoice as any).timesheet.status ? ' · ' : ''}
                                              {(invoice as any).timesheet.status ? String((invoice as any).timesheet.status).replace(/_/g, ' ') : ''}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Issue Date:</span>
                                    <span>{formatDate(invoice.invoiceDate)}</span>
                                  </div>

                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Period:</span>
                                    <span>{formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</span>
                                  </div>

                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Due Date:</span>
                                    <span>{formatDate(invoice.dueDate)}</span>
                                  </div>

                                  {invoice.hoursWorked && parseFloat(invoice.hoursWorked) > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">Hours:</span>
                                      <span>{parseFloat(invoice.hoursWorked).toFixed(1)}h{invoice.hourlyRate ? ` @ ${invoice.currency} ${parseFloat(invoice.hourlyRate).toFixed(2)}/hr` : ''}</span>
                                    </div>
                                  )}

                                  {parseFloat((invoice as any).daysWorked || '0') > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">Days:</span>
                                      <span>{parseFloat((invoice as any).daysWorked).toFixed(1)}d{(invoice as any).dayRate ? ` @ ${invoice.currency} ${parseFloat((invoice as any).dayRate).toFixed(2)}/day` : ''}</span>
                                    </div>
                                  )}

                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Subtotal:</span>
                                    <span>{formatCurrency(invoice.subtotal || invoice.totalAmount, invoice.currency)}</span>
                                  </div>

                                  {parseFloat(invoice.taxAmount || '0') > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">GST / Tax:</span>
                                      <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
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
                                  <div className="text-sm text-secondary-700">
                                    <span className="text-xs uppercase tracking-wide text-secondary-500">Description</span>
                                    <p className="whitespace-pre-wrap">{invoice.description}</p>
                                  </div>
                                )}

                                {invoice.notes && (
                                  <div className="text-xs text-secondary-700 rounded-md bg-blue-50/60 border border-blue-100 p-2">
                                    <span className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">Notes</span>
                                    <p className="whitespace-pre-wrap mt-0.5">{invoice.notes}</p>
                                  </div>
                                )}

                                {/* Activity timeline */}
                                {(invoice.createdAt || invoice.submittedAt || invoice.reviewedAt || invoice.paidAt) && (
                                  <div className="rounded-md border border-secondary-200 bg-secondary-50/40 p-2 text-[11px]">
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                      {invoice.createdAt && (
                                        <>
                                          <span className="text-secondary-500">Created</span>
                                          <span className="font-medium">{formatDate(invoice.createdAt)}</span>
                                        </>
                                      )}
                                      {invoice.submittedAt && (
                                        <>
                                          <span className="text-secondary-500">Submitted</span>
                                          <span className="font-medium">{formatDate(invoice.submittedAt)}</span>
                                        </>
                                      )}
                                      {invoice.reviewedAt && (
                                        <>
                                          <span className="text-secondary-500">{invoice.status === 'rejected' ? 'Rejected' : 'Approved'}</span>
                                          <span className="font-medium">{formatDate(invoice.reviewedAt)}</span>
                                        </>
                                      )}
                                      {invoice.paidAt && (
                                        <>
                                          <span className="text-secondary-500">Paid</span>
                                          <span className="font-medium">{formatDate(invoice.paidAt)}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {invoice.timesheetId && !((invoice as any).timesheet) && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    From Timesheet
                                  </Badge>
                                )}

                                {canUpdateStatus && (invoice.status === 'submitted' || invoice.status === 'draft') && (
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
                                {canUpdateStatus && invoice.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(invoice.id, 'paid')}
                                    disabled={updateStatusMutation.isPending}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Mark as Paid
                                  </Button>
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
                <DataPagination
                  page={contractorPagination.page}
                  totalPages={contractorPagination.totalPages}
                  totalItems={contractorPagination.totalItems}
                  pageSize={INVOICES_PAGE_SIZE}
                  onPageChange={contractorPagination.setPage}
                  label="invoices"
                />
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
                  <Loader fullPage label="Loading SDP invoices" />
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
                            {sdpPagination.pageItems.map((invoice: any) => {
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
                        {sdpPagination.pageItems.map((invoice: any) => {
                        const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons] || FileText;
                        
                        return (
                          <Card
                            key={invoice.id}
                            className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                            data-testid={`sdp-invoice-${invoice.id}`}
                            onClick={() => setSelectedInvoiceForDetails(invoice)}
                          >
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
                                {/* Always-rendered "core info" rows. Empty fields show "—"
                                    so every card has the same visual footprint, matching
                                    the admin /sdp-invoices layout. */}
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Worker:</span>
                                  <span className="font-medium truncate max-w-[60%] text-right">
                                    {(invoice as any).worker
                                      ? `${(invoice as any).worker.firstName ?? ''} ${(invoice as any).worker.lastName ?? ''}`.trim() || '—'
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Role:</span>
                                  <span className="truncate max-w-[60%] text-right">
                                    {(invoice as any).contract?.jobTitle || (invoice as any).contract?.contractName || '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Period:</span>
                                  <span>
                                    {(invoice as any).timesheet
                                      ? `${formatDate((invoice as any).timesheet.periodStart)} – ${formatDate((invoice as any).timesheet.periodEnd)}`
                                      : ((invoice as any).periodStart && (invoice as any).periodEnd
                                          ? `${formatDate((invoice as any).periodStart)} – ${formatDate((invoice as any).periodEnd)}`
                                          : '—')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-secondary-600">Time Logged:</span>
                                  <span>
                                    {(invoice as any).timesheet ? (
                                      <>
                                        {parseFloat((invoice as any).timesheet.totalDays || '0') > 0
                                          ? `${parseFloat((invoice as any).timesheet.totalDays).toFixed(1)}d`
                                          : `${parseFloat((invoice as any).timesheet.totalHours || '0').toFixed(1)}h`}
                                        {(invoice as any).timesheet.entryCount ? ` · ${(invoice as any).timesheet.entryCount} entries` : ''}
                                      </>
                                    ) : '—'}
                                  </span>
                                </div>
                                {/*
                                  Display the rate frozen at invoice-creation time:
                                  - currency  → invoice.currency (snapshot column)
                                  - rate      → first line item's unitPrice (stored row)
                                  - unit      → invoice.contract.rateType (live; rarely changes)
                                  This stops the displayed rate from shifting after the contract is renegotiated.
                                */}
                                {(() => {
                                  const firstLi = (invoice as any).lineItems?.[0];
                                  const frozenUnitPrice = firstLi?.unitPrice ? parseFloat(firstLi.unitPrice) : null;
                                  if (frozenUnitPrice === null || !Number.isFinite(frozenUnitPrice)) return null;
                                  const rt = (invoice as any).contract?.rateType;
                                  const unit = rt === 'daily' ? 'day' : rt === 'hourly' ? 'hr' : (rt || 'unit');
                                  return (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-secondary-600">{isHostClientBusiness ? 'Billing Rate' : 'Worker Rate'}:</span>
                                      <span>{invoice.currency} {frozenUnitPrice.toFixed(2)}/{unit}</span>
                                    </div>
                                  );
                                })()}
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
                                  <div className="pt-2 border-t">
                                    <div className="text-sm font-medium text-secondary-900 mb-2">Line Items:</div>
                                    <div className="space-y-2">
                                      {(invoice as any).lineItems.map((item: any, index: number) => (
                                        <div key={item.id || index} className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                                          <div className="font-medium break-words" title={item.description}>
                                            {formatLineItemDescription(item.description)}
                                          </div>
                                          <div className="flex justify-between text-secondary-600">
                                            <span>{item.quantity} × {formatCurrency(String(item.unitPrice), invoice.currency)}</span>
                                            <span className="font-medium text-secondary-900">{formatCurrency(String(item.amount), invoice.currency)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                <DataPagination
                  page={sdpPagination.page}
                  totalPages={sdpPagination.totalPages}
                  totalItems={sdpPagination.totalItems}
                  pageSize={INVOICES_PAGE_SIZE}
                  onPageChange={sdpPagination.setPage}
                  label="invoices"
                />
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
                  <Loader fullPage label="Loading client invoices" />
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
                            {clientPagination.pageItems.map((invoice: any) => {
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
                    {clientPagination.pageItems.map((invoice: any) => {
                      const isAutoGenerated = invoice.invoiceCategory === 'customer_billing';
                      const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons] || FileText;
                      const totalLabel = invoice.timesheet
                        ? (parseFloat(invoice.timesheet.totalDays || '0') > 0
                            ? `${parseFloat(invoice.timesheet.totalDays).toFixed(1)}d`
                            : `${parseFloat(invoice.timesheet.totalHours || '0').toFixed(1)}h`)
                        : null;
                      return (
                        <Card
                          key={invoice.id}
                          className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                          data-testid={`client-invoice-${invoice.id}`}
                          onClick={() => setSelectedInvoiceForDetails(invoice)}
                        >
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
                              {(() => {
                                // Read the rate from the stored invoice snapshot, not the live
                                // contract — otherwise renegotiation rewrites historical invoices.
                                const firstLi = (invoice as any).lineItems?.[0];
                                const frozenUnitPrice = firstLi?.unitPrice ? parseFloat(firstLi.unitPrice) : null;
                                if (frozenUnitPrice === null || !Number.isFinite(frozenUnitPrice)) return null;
                                const rt = invoice.contract?.rateType;
                                const unit = rt === 'daily' ? 'day' : rt === 'hourly' ? 'hr' : (rt || 'unit');
                                return (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-secondary-600">Client Rate:</span>
                                    <span>{invoice.currency} {frozenUnitPrice.toFixed(2)}/{unit}</span>
                                  </div>
                                );
                              })()}
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
                <DataPagination
                  page={clientPagination.page}
                  totalPages={clientPagination.totalPages}
                  totalItems={clientPagination.totalItems}
                  pageSize={INVOICES_PAGE_SIZE}
                  onPageChange={clientPagination.setPage}
                  label="invoices"
                />
              </TabsContent>

              <TabsContent value="margin" className="mt-6">
                <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-2 mb-4 text-sm text-green-900">
                  <span className="font-medium">Margins owed to you by SDP.</span>{' '}
                  When SDP raises an invoice on your host client (Client Invoices), your margin
                  share is tracked below. Status reflects what SDP has actually disbursed.
                </div>

                {isMarginPaymentsLoading ? (
                  <Loader />
                ) : marginPayments.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12 text-secondary-600">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 text-secondary-300" />
                      <p className="font-medium">No margin payments yet</p>
                      <p className="text-sm mt-1">Once SDP records a margin payout against a customer-billing invoice, it will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {marginPayments.map((mp: any) => {
                      const inv = mp.invoice;
                      const ctr = mp.contract;
                      const contractLabel = ctr
                        ? (ctr.contractName || ctr.customRoleTitle || ctr.jobTitle || `Contract ${String(ctr.id).slice(0, 8)}`)
                        : null;
                      const statusColor =
                        mp.status === 'paid' ? 'bg-green-100 text-green-800' :
                        mp.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-700';
                      const statusIcon =
                        mp.status === 'paid' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                        mp.status === 'partial' ? <Clock className="h-3 w-3 mr-1" /> :
                        <AlertCircle className="h-3 w-3 mr-1" />;
                      return (
                        <Card
                          key={mp.id}
                          className="hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
                          onClick={() => setSelectedMarginPayment(mp)}
                          data-testid={`card-margin-${mp.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-base">
                                  {mp.currency} {parseFloat(mp.marginAmount).toFixed(2)}
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                  {inv?.invoiceNumber || 'Invoice —'}
                                </CardDescription>
                              </div>
                              <Badge className={`text-xs whitespace-nowrap ${statusColor}`}>
                                {statusIcon}
                                {mp.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-1.5 text-xs text-secondary-700">
                            {contractLabel && (
                              <div className="flex justify-between">
                                <span className="text-secondary-500">Contract</span>
                                <span className="font-medium text-right max-w-[60%] truncate" title={contractLabel}>{contractLabel}</span>
                              </div>
                            )}
                            {ctr?.employmentType && (
                              <div className="flex justify-between">
                                <span className="text-secondary-500">Employment</span>
                                <span className="capitalize">{String(ctr.employmentType).replace(/_/g, ' ')}</span>
                              </div>
                            )}
                            {ctr?.rate && ctr?.rateType && (
                              <div className="flex justify-between">
                                <span className="text-secondary-500">Rate</span>
                                <span>{ctr.currency || mp.currency} {parseFloat(ctr.rate).toFixed(2)}/{ctr.rateType}</span>
                              </div>
                            )}
                            {inv && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-secondary-500">Invoice total</span>
                                  <span className="font-medium">{inv.currency} {parseFloat(inv.totalAmount).toFixed(2)}</span>
                                </div>
                                {inv.periodStart && inv.periodEnd && (
                                  <div className="flex justify-between">
                                    <span className="text-secondary-500">Period</span>
                                    <span>{formatPeriod(inv.periodStart, inv.periodEnd)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-secondary-500">Invoice date</span>
                                  <span>{new Date(inv.invoiceDate).toLocaleDateString()}</span>
                                </div>
                                {inv.paidAt && (
                                  <div className="flex justify-between">
                                    <span className="text-secondary-500">Client paid SDP</span>
                                    <span className="text-green-700">{new Date(inv.paidAt).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {mp.suggestedMargin && parseFloat(mp.suggestedMargin) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-secondary-500">Suggested margin</span>
                                <span>{mp.currency} {parseFloat(mp.suggestedMargin).toFixed(2)}</span>
                              </div>
                            )}
                            {mp.paidDate && (
                              <div className="flex justify-between">
                                <span className="text-secondary-500">Disbursed on</span>
                                <span className="text-green-700 font-medium">{new Date(mp.paidDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {mp.referenceNumber && (
                              <div className="flex justify-between">
                                <span className="text-secondary-500">Reference</span>
                                <span className="font-mono">{mp.referenceNumber}</span>
                              </div>
                            )}
                            {mp.notes && (
                              <div className="pt-1 border-t border-secondary-100 text-secondary-600 italic">
                                {mp.notes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
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

          {/* Read-only invoice details — shared modal with the admin /sdp-invoices page.
              Mounted unconditionally; renders nothing when `invoice` is null. */}
          <InvoiceDetailsModal
            invoice={selectedInvoiceForDetails}
            open={!!selectedInvoiceForDetails}
            onOpenChange={(open) => { if (!open) setSelectedInvoiceForDetails(null); }}
          />

          {/* Margin payment details — opened by clicking a card on the Margin Payments tab. */}
          <MarginPaymentDetailsModal
            marginPayment={selectedMarginPayment}
            open={!!selectedMarginPayment}
            onOpenChange={(open) => { if (!open) setSelectedMarginPayment(null); }}
          />
        </div>
  );
}