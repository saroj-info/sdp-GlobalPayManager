import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Plus, FileText, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Building, Globe, Edit, Send, Mail, ArrowRight, Download, RefreshCw, RotateCcw, LayoutGrid, List, Search, Filter, Layers, Trash2, Ban } from "lucide-react";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { apiRequest } from "@/lib/queryClient";
import { CreateSdpInvoiceModal } from "@/components/modals/create-sdp-invoice-modal";
import { CreateConsolidatedInvoiceModal } from "@/components/modals/create-consolidated-invoice-modal";
import { EditSdpInvoiceModal } from "@/components/modals/edit-sdp-invoice-modal";
import MarkAsPaidModal from "@/components/modals/mark-as-paid-modal";
import { MarginPaymentModal } from "@/components/modals/margin-payment-modal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { User, Country, Business, Timesheet } from "@shared/schema";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}

interface SdpInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  description: string;
  serviceType: string;
  subtotal: string;
  gstVatAmount: string;
  gstVatRate: string;
  totalAmount: string;
  currency: string;
  status: string;
  notes?: string;
  isCrossBorder: boolean;
  businessCountry?: string;
  timesheetId?: string;
  contractId?: string;
  workerId?: string;
  issuedAt?: string;
  paidAt?: string;
  createdAt: string;
  invoiceCategory?: string;
  suggestedMargin?: string;
  lineItems?: LineItem[];
  fromCountry: {
    id: string;
    name: string;
    code: string;
  };
  toBusiness: {
    id: string;
    name: string;
  };
  fromBusiness?: {
    id: string;
    name: string;
  } | null;
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  issued: "bg-blue-100 text-blue-800",
  sent: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusIcons = {
  draft: Clock,
  issued: FileText,
  sent: AlertCircle,
  overdue: XCircle,
  paid: CheckCircle,
  cancelled: XCircle,
};

export default function SdpInvoices() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<SdpInvoice | null>(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SdpInvoice | null>(null);
  const [showMarginPaymentModal, setShowMarginPaymentModal] = useState(false);
  const [selectedInvoiceForMargin, setSelectedInvoiceForMargin] = useState<SdpInvoice | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [workerFilter, setWorkerFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth() as { user: User | undefined; isLoading: boolean; isAuthenticated: boolean; authReady: boolean; error: any };
  
  usePageHeader("Invoices", "Create and manage invoices for payroll and contract services");

  const isSdpUser = user?.userType === 'sdp_internal';

  const { data: sdpInvoices = [], isLoading } = useQuery<SdpInvoice[]>({
    queryKey: ["/api/sdp-invoices", selectedCountry, selectedBusiness],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCountry && selectedCountry !== "all") params.append('countryId', selectedCountry);
      if (selectedBusiness && selectedBusiness !== "all") params.append('businessId', selectedBusiness);
      const url = `/api/sdp-invoices${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: isSdpUser,
  });

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
    enabled: isSdpUser,
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
    enabled: isSdpUser,
  });

  const { data: timesheets = [] } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
    enabled: isSdpUser,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      await apiRequest("PATCH", `/api/sdp-invoices/${id}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
    },
  });

  const createFromTimesheetMutation = useMutation({
    mutationFn: async ({ timesheetId, data }: { timesheetId: string; data: any }) => {
      await apiRequest("POST", `/api/sdp-invoices/from-timesheet/${timesheetId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest("POST", `/api/sdp-invoices/${invoiceId}/send`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Sent",
        description: "The invoice has been sent to the client successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    },
  });

  const resendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest("POST", `/api/sdp-invoices/${invoiceId}/resend`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Resent", description: "The invoice has been resent to the client." });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to resend invoice", variant: "destructive" });
    },
  });

  const reviseInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest("POST", `/api/sdp-invoices/${invoiceId}/revise`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Reset to Draft", description: "The invoice has been moved back to draft for editing." });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to revise invoice", variant: "destructive" });
    },
  });

  const retractInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest("POST", `/api/sdp-invoices/${invoiceId}/retract`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Retracted", description: "The invoice has been voided and the timesheet is available again." });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to retract invoice", variant: "destructive" });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest("DELETE", `/api/sdp-invoices/${invoiceId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Deleted", description: "The invoice has been permanently deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
    },
    onError: (error: any) => {
      toast({ title: "Cannot Delete", description: error.message || "Failed to delete invoice", variant: "destructive" });
    },
  });

  const handleRetractInvoice = (invoice: SdpInvoice) => {
    if (confirm(`Retract invoice ${invoice.invoiceNumber}? This will void it and free its timesheet(s) for re-consolidation.`)) {
      retractInvoiceMutation.mutate(invoice.id);
    }
  };

  const handleDeleteInvoice = (invoice: SdpInvoice) => {
    if (invoice.status === 'paid') {
      toast({ title: "Cannot Delete", description: "Cannot delete an invoice where payment has been received.", variant: "destructive" });
      return;
    }
    if (confirm(`Permanently delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const handleDownloadPdf = (invoice: SdpInvoice) => {
    generateInvoicePdf({
      ...invoice,
      subtotal: invoice.subtotal,
      gstVatAmount: invoice.gstVatAmount,
      gstVatRate: invoice.gstVatRate,
      totalAmount: invoice.totalAmount,
      lineItems: (invoice as any).lineItems || [],
      fromCountry: (invoice as any).fromCountry,
      toBusiness: (invoice as any).toBusiness,
      fromBusiness: (invoice as any).fromBusiness,
      timesheetDetails: (invoice as any).timesheetDetails,
    });
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleStatusUpdate = (invoiceId: string, newStatus: string, notes?: string) => {
    updateStatusMutation.mutate({ id: invoiceId, status: newStatus, notes });
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

  const handleEditInvoice = (invoice: SdpInvoice) => {
    setSelectedInvoiceForEdit(invoice);
    setShowEditModal(true);
  };

  const handleSendInvoice = (invoiceId: string) => {
    sendInvoiceMutation.mutate(invoiceId);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedInvoiceForEdit(null);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedInvoiceForEdit(null);
    queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
  };

  const handleMarkAsPaid = (invoice: SdpInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    setShowMarkAsPaidModal(true);
  };

  const handleCloseMarkAsPaidModal = () => {
    setShowMarkAsPaidModal(false);
    setSelectedInvoiceForPayment(null);
  };

  const handleMarkAsPaidSuccess = () => {
    setShowMarkAsPaidModal(false);
    setSelectedInvoiceForPayment(null);
    queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
  };

  // Get approved timesheets that haven't been invoiced by SDP yet
  const availableTimesheets = timesheets.filter((ts: any) => 
    ts.status === 'approved' && 
    !sdpInvoices.some(inv => inv.timesheetId === ts.id)
  );

  // Category counts for tab badges
  const sdpOwnInvoices = useMemo(() =>
    sdpInvoices.filter(inv => !inv.invoiceCategory || inv.invoiceCategory === 'sdp_services'),
    [sdpInvoices]
  );
  const customerBillingInvoices = useMemo(() =>
    sdpInvoices.filter(inv => inv.invoiceCategory === 'customer_billing'),
    [sdpInvoices]
  );
  const businessToClientInvoices = useMemo(() =>
    sdpInvoices.filter(inv => inv.invoiceCategory === 'business_to_client'),
    [sdpInvoices]
  );
  const filteredByCategory = useMemo(() => {
    if (activeCategory === 'all') return sdpInvoices;
    if (activeCategory === 'sdp_own') return sdpOwnInvoices;
    if (activeCategory === 'customer_billing') return customerBillingInvoices;
    if (activeCategory === 'business_to_client') return businessToClientInvoices;
    return sdpInvoices;
  }, [activeCategory, sdpInvoices, sdpOwnInvoices, customerBillingInvoices, businessToClientInvoices]);

  const filterOptions = useMemo(() => {
    const workers = new Set<string>();
    const biz = new Set<string>();
    const countries = new Set<string>();
    sdpInvoices.forEach((inv: any) => {
      if (inv.workerName) workers.add(inv.workerName);
      if (inv.toBusiness?.name) biz.add(inv.toBusiness.name);
      if (inv.fromCountry?.name) countries.add(inv.fromCountry.name);
    });
    return { workers: [...workers].sort(), businesses: [...biz].sort(), countries: [...countries].sort() };
  }, [sdpInvoices]);

  const activeFilterCount = [workerFilter, businessFilter, countryFilter].filter(Boolean).length;

  const displayedInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return filteredByCategory.filter((inv: any) => {
      const matchesSearch = !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.toBusiness?.name || '').toLowerCase().includes(q) ||
        (inv.fromCountry?.name || '').toLowerCase().includes(q) ||
        (inv.workerName || '').toLowerCase().includes(q) ||
        (inv.description || '').toLowerCase().includes(q);
      const matchesWorker = !workerFilter || (inv.workerName || '') === workerFilter;
      const matchesBusiness = !businessFilter || (inv.toBusiness?.name || '') === businessFilter;
      const matchesCountry = !countryFilter || (inv.fromCountry?.name || '') === countryFilter;
      return matchesSearch && matchesWorker && matchesBusiness && matchesCountry;
    });
  }, [filteredByCategory, searchQuery, workerFilter, businessFilter, countryFilter]);

  // Access check after all hooks — prevents Rules of Hooks violation
  if (user && user.userType !== 'sdp_internal') {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">Access Denied</h1>
          <p className="text-secondary-600">Only SDP internal users can access SDP invoices.</p>
        </div>
      </div>
    );
  }

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
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Search + Filters */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice number, worker, business…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full text-xs px-1.5">{activeFilterCount}</span>
            )}
          </Button>
        </div>

        {/* SDP Entity + Business top filters */}
        <div className="flex items-center gap-2">
          <Select value={selectedCountry || '__all__'} onValueChange={(v) => setSelectedCountry(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9 text-sm" data-testid="select-country-filter">
              <SelectValue placeholder="All SDP Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All SDP Entities</SelectItem>
              {countries.filter((c: any) => c.id && c.name).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBusiness || '__all__'} onValueChange={(v) => setSelectedBusiness(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9 text-sm" data-testid="select-business-filter">
              <SelectValue placeholder="All Businesses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Businesses</SelectItem>
              {businesses.filter((b: any) => b.id && b.name).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid/List + Action buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-0.5">
            <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('card')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowConsolidatedModal(true)}
            className="h-9"
            data-testid="button-create-consolidated-invoice"
          >
            <Layers className="h-4 w-4 mr-2" />
            Consolidated Invoice
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 h-9"
            data-testid="button-create-sdp-invoice"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="bg-muted/40 border rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Worker</label>
            <Select value={workerFilter || '__all__'} onValueChange={(v) => setWorkerFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All workers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All workers</SelectItem>
                {filterOptions.workers.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Business</label>
            <Select value={businessFilter || '__all__'} onValueChange={(v) => setBusinessFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All businesses</SelectItem>
                {filterOptions.businesses.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Country</label>
            <Select value={countryFilter || '__all__'} onValueChange={(v) => setCountryFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All countries</SelectItem>
                {filterOptions.countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setWorkerFilter(''); setBusinessFilter(''); setCountryFilter(''); }}>
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Active filter pills */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {workerFilter && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setWorkerFilter('')}>Worker: {workerFilter} ×</Badge>}
          {businessFilter && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setBusinessFilter('')}>Business: {businessFilter} ×</Badge>}
          {countryFilter && <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCountryFilter('')}>Country: {countryFilter} ×</Badge>}
        </div>
      )}

          {/* Available Timesheets for Invoice Creation */}
          {availableTimesheets.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create SDP Invoice from Timesheet</CardTitle>
                <CardDescription>
                  Convert approved timesheets into SDP invoices for billing businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableTimesheets.map((timesheet: any) => (
                    <div key={timesheet.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {timesheet.totalHours}h
                        </Badge>
                      </div>
                      <div className="text-sm text-secondary-600 mb-2">
                        Worker: {timesheet.worker?.firstName} {timesheet.worker?.lastName}
                      </div>
                      <div className="text-sm text-secondary-600 mb-3">
                        Business: {timesheet.business?.name}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCreateFromTimesheet(timesheet.id)}
                        disabled={createFromTimesheetMutation.isPending}
                        className="w-full"
                        data-testid={`button-create-from-timesheet-${timesheet.id}`}
                      >
                        Create SDP Invoice
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="all" data-testid="tab-all-invoices">
                All ({sdpInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="sdp_own" data-testid="tab-sdp-own">
                SDP Invoices ({sdpOwnInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="customer_billing" data-testid="tab-customer-billing">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Customer Billing ({customerBillingInvoices.length})
                </span>
              </TabsTrigger>
              <TabsTrigger value="business_to_client" data-testid="tab-business-to-client">
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Uploaded Invoices ({businessToClientInvoices.length})
                </span>
              </TabsTrigger>
            </TabsList>
            {activeCategory === 'customer_billing' && (
              <p className="text-sm text-gray-500 mt-2">Auto-generated invoices from timesheet approvals, billed to host clients on behalf of businesses.</p>
            )}
            {activeCategory === 'business_to_client' && (
              <p className="text-sm text-gray-500 mt-2">Uploaded invoices and external documents raised by businesses to their host clients.</p>
            )}
          </Tabs>

          {/* SDP Invoices Grid or List */}
          {displayedInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-secondary-400 mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">No invoices found</h3>
                <p className="text-secondary-600 text-center max-w-md">
                  {searchQuery || activeFilterCount > 0
                    ? 'No invoices match the current search or filters.'
                    : activeCategory === 'all'
                    ? 'Create your first SDP invoice to start billing businesses for employment services.'
                    : activeCategory === 'customer_billing'
                    ? 'Customer billing invoices are auto-generated when timesheets are approved.'
                    : activeCategory === 'business_to_client'
                    ? 'Uploaded invoices appear here once businesses upload them.'
                    : 'No SDP invoices created yet.'}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>SDP Entity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedInvoices.map((invoice: any) => {
                    const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons] || FileText;
                    return (
                      <TableRow key={invoice.id} className={invoice.status === 'cancelled' ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                          {(invoice as any).poNumber && (
                            <div className="text-xs text-blue-600">PO: {(invoice as any).poNumber}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{invoice.toBusiness?.name || '—'}</TableCell>
                        <TableCell className="text-sm">{(invoice as any).workerName || '—'}</TableCell>
                        <TableCell className="text-sm">{invoice.fromCountry?.name || '—'}</TableCell>
                        <TableCell className="text-sm font-medium">{invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[invoice.status as keyof typeof statusColors]} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />{invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {invoice.status !== 'paid' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-orange-600" onClick={() => handleRetractInvoice(invoice)} title="Retract invoice">
                                  <Ban className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={() => handleDeleteInvoice(invoice)} title="Delete invoice">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleDownloadPdf(invoice)} title="Download PDF">
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayedInvoices.map((invoice: any) => {
                const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons];
                
                return (
                  <Card key={invoice.id} className="hover:shadow-md transition-shadow" data-testid={`card-sdp-invoice-${invoice.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg" data-testid={`text-invoice-number-${invoice.id}`}>
                            {invoice.invoiceNumber}
                          </CardTitle>
                          {(invoice as any).poNumber && (
                            <div className="text-xs text-blue-600 mt-0.5">PO: {(invoice as any).poNumber} — {(invoice as any).poProjectName}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {invoice.invoiceCategory === 'customer_billing' && (
                            <Badge className="bg-purple-100 text-purple-800" data-testid={`badge-customer-billing-${invoice.id}`}>
                              <DollarSign className="h-3 w-3 mr-1" />
                              Customer Billing
                            </Badge>
                          )}
                          {invoice.invoiceCategory === 'business_to_client' && (
                            <Badge className="bg-indigo-100 text-indigo-800" data-testid={`badge-b2c-${invoice.id}`}>
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Uploaded Invoice
                            </Badge>
                          )}
                          <Badge className={statusColors[invoice.status as keyof typeof statusColors]} data-testid={`badge-status-${invoice.id}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {invoice.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription data-testid={`text-business-name-${invoice.id}`}>
                        {invoice.invoiceCategory === 'business_to_client' ? (
                          <span className="flex items-center gap-1 text-indigo-700">
                            <Building className="h-3 w-3" />
                            {invoice.toBusiness?.name || 'Business'} → Host Client
                          </span>
                        ) : invoice.invoiceCategory === 'customer_billing' ? (
                          <span className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-purple-700">
                              <Building className="h-3 w-3" />
                              Billed to: {invoice.toBusiness?.name || 'Host Client'}
                            </span>
                            {invoice.fromBusiness && (
                              <span className="text-xs text-gray-500">
                                On behalf of: {invoice.fromBusiness.name}
                              </span>
                            )}
                          </span>
                        ) : (
                          invoice.toBusiness?.name
                        )}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {invoice.invoiceCategory !== 'business_to_client' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary-600">SDP Entity:</span>
                            <span data-testid={`text-sdp-entity-${invoice.id}`}>
                              {invoice.fromCountry?.name || '—'}
                            </span>
                          </div>
                        )}
                        {invoice.invoiceCategory === 'business_to_client' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary-600">Raised By:</span>
                            <span className="text-indigo-700 font-medium">{invoice.toBusiness?.name || 'Business'}</span>
                          </div>
                        )}
                        {invoice.invoiceCategory === 'customer_billing' && invoice.fromBusiness && (
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary-600">Employing Business:</span>
                            <span className="text-purple-700 font-medium">{invoice.fromBusiness.name}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span className="text-secondary-600">Service:</span>
                          <span data-testid={`text-service-type-${invoice.id}`}>
                            {invoice.serviceType.replace('_', ' ')}
                          </span>
                        </div>

                        {invoice.periodStart && invoice.periodEnd && (
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary-600">Period:</span>
                            <span data-testid={`text-period-${invoice.id}`}>
                              {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-secondary-600">Due Date:</span>
                          <span data-testid={`text-due-date-${invoice.id}`}>
                            {formatDate(invoice.dueDate)}
                          </span>
                        </div>

                        {invoice.isCrossBorder && (
                          <div className="flex justify-between text-sm">
                            <span className="text-secondary-600">Cross-border:</span>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              No GST/VAT
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Line Items Display */}
                      {invoice.lineItems && invoice.lineItems.length > 0 && (
                        <div className="border-t pt-4">
                          <div className="text-sm font-medium text-secondary-900 mb-2">Line Items:</div>
                          <div className="space-y-2">
                            {invoice.lineItems.map((item, index) => (
                              <div key={item.id || index} className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                                <div className="font-medium">{item.description}</div>
                                <div className="flex justify-between text-secondary-600">
                                  <span>{item.quantity} × {formatCurrency(String(item.unitPrice), invoice.currency)}</span>
                                  <span className="font-medium text-secondary-900">{formatCurrency(String(item.amount), invoice.currency)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-secondary-600">Subtotal:</span>
                          <span className="text-sm" data-testid={`text-subtotal-${invoice.id}`}>
                            {formatCurrency(invoice.subtotal, invoice.currency)}
                          </span>
                        </div>
                        
                        {parseFloat(invoice.gstVatAmount) > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-secondary-600">
                              GST/VAT ({invoice.gstVatRate}%):
                            </span>
                            <span className="text-sm" data-testid={`text-gst-amount-${invoice.id}`}>
                              {formatCurrency(invoice.gstVatAmount, invoice.currency)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total:</span>
                          <span className="text-lg" data-testid={`text-total-amount-${invoice.id}`}>
                            {formatCurrency(invoice.totalAmount, invoice.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="text-xs text-secondary-500 mb-2">
                          Created by {invoice.createdByUser.firstName} {invoice.createdByUser.lastName}
                        </div>
                        
                        {invoice.status === 'draft' && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditInvoice(invoice)}
                                className="flex-1"
                                data-testid={`button-edit-invoice-${invoice.id}`}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(invoice.id, 'issued')}
                                disabled={updateStatusMutation.isPending}
                                className="flex-1"
                                data-testid={`button-issue-invoice-${invoice.id}`}
                              >
                                Issue Invoice
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(invoice.id, 'cancelled')}
                              disabled={updateStatusMutation.isPending}
                              className="w-full"
                              data-testid={`button-cancel-invoice-${invoice.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        
                        {invoice.status === 'issued' && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditInvoice(invoice)}
                                className="flex-1"
                                data-testid={`button-edit-invoice-${invoice.id}`}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSendInvoice(invoice.id)}
                                disabled={sendInvoiceMutation.isPending}
                                className="flex-1"
                                data-testid={`button-send-invoice-${invoice.id}`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice"}
                              </Button>
                            </div>
                          </div>
                        )}

                        {invoice.status === 'sent' && (
                          <div className="flex gap-2">
                            <Badge className="flex-1 justify-center bg-yellow-100 text-yellow-800" data-testid={`badge-sent-status-${invoice.id}`}>
                              <Mail className="h-3 w-3 mr-1" />
                              Sent to Client
                            </Badge>
                          </div>
                        )}
                        
                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsPaid(invoice)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                data-testid={`button-mark-paid-${invoice.id}`}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Mark as Paid
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resendInvoiceMutation.mutate(invoice.id)}
                                disabled={resendInvoiceMutation.isPending}
                                className="flex-1"
                                data-testid={`button-resend-invoice-${invoice.id}`}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {resendInvoiceMutation.isPending ? "Resending..." : "Resend"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviseInvoiceMutation.mutate(invoice.id)}
                                disabled={reviseInvoiceMutation.isPending}
                                className="flex-1"
                                data-testid={`button-revise-invoice-${invoice.id}`}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Revise
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {invoice.invoiceCategory === 'customer_billing' && ['sent', 'overdue', 'paid'].includes(invoice.status) && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoiceForMargin(invoice);
                                setShowMarginPaymentModal(true);
                              }}
                              className="flex-1"
                              data-testid={`button-margin-payments-${invoice.id}`}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Margin Payments
                            </Button>
                          </div>
                        )}

                        <div className="pt-1 space-y-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadPdf(invoice)}
                            className="w-full text-gray-500 hover:text-gray-700"
                            data-testid={`button-download-pdf-${invoice.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download PDF
                          </Button>
                          {invoice.status !== 'paid' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRetractInvoice(invoice)}
                                disabled={retractInvoiceMutation.isPending}
                                className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs"
                                data-testid={`button-retract-invoice-${invoice.id}`}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Retract
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteInvoice(invoice)}
                                disabled={deleteInvoiceMutation.isPending}
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                                data-testid={`button-delete-invoice-${invoice.id}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

      {showCreateModal && (
        <CreateSdpInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
          }}
        />
      )}

      {showConsolidatedModal && (
        <CreateConsolidatedInvoiceModal
          onClose={() => setShowConsolidatedModal(false)}
          onSuccess={() => {
            setShowConsolidatedModal(false);
            queryClient.invalidateQueries({ queryKey: ["/api/sdp-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
          }}
        />
      )}

      {showEditModal && selectedInvoiceForEdit && (
        <EditSdpInvoiceModal
          invoice={selectedInvoiceForEdit}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}

      {showMarkAsPaidModal && selectedInvoiceForPayment && (
        <MarkAsPaidModal
          invoice={selectedInvoiceForPayment}
          onClose={handleCloseMarkAsPaidModal}
          onSuccess={handleMarkAsPaidSuccess}
        />
      )}

      {showMarginPaymentModal && selectedInvoiceForMargin && (
        <MarginPaymentModal
          isOpen={showMarginPaymentModal}
          onClose={() => {
            setShowMarginPaymentModal(false);
            setSelectedInvoiceForMargin(null);
          }}
          invoice={selectedInvoiceForMargin}
        />
      )}
    </div>
  );
}