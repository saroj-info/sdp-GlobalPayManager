import { useEffect, useMemo, useState } from "react";
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
import { DataPagination } from "@/components/ui/data-pagination";
import { usePagination } from "@/hooks/usePagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeaveRequestDetailsModal } from "@/components/modals/leave-request-details-modal";
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
import { Calendar as CalendarIcon, Plus, Clock, Check, X, AlertCircle, Search, Plane, CalendarDays, Hourglass, LayoutGrid, List as ListIcon, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/loader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type LeaveRequestData = {
  leaveType: 'annual' | 'sick' | 'personal' | 'parental' | 'compassionate' | 'unpaid';
  startDate: Date;
  endDate: Date;
  reason: string;
};

export default function LeavePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // View + sort parity with the admin /leave-requests page.
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'recent' | 'startDate' | 'type' | 'status'>('recent');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();

  usePageHeader("Leave Requests", "Manage your leave requests and time off");

  const { data: workerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/workers/profile"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const { data: leaveRequests = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/leave-requests"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const form = useForm<LeaveRequestData>({
    defaultValues: {
      leaveType: 'annual',
      startDate: new Date(),
      endDate: new Date(),
      reason: '',
    }
  });

  const createLeaveRequestMutation = useMutation({
    mutationFn: async (data: LeaveRequestData) => {
      const totalDays = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const payload = { ...data, totalDays };
      // Same dialog handles both Create and Edit — endpoint switches on
      // whether `editingId` is set. Server enforces "pending status only".
      if (editingId) {
        return await apiRequest('PATCH', `/api/leave-requests/${editingId}`, payload);
      }
      return await apiRequest('POST', '/api/leave-requests', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      setShowForm(false);
      setEditingId(null);
      form.reset();
      toast({
        title: editingId ? "Leave request updated" : "Leave request submitted",
        description: editingId ? "Your changes have been saved." : "Leave request submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request.",
        variant: "destructive",
      });
    },
  });

  // Open the dialog pre-filled with an existing request for editing.
  const openEditDialog = (request: any) => {
    setEditingId(request.id);
    form.reset({
      leaveType: request.leaveType,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      reason: request.reason || '',
    });
    setShowForm(true);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  // IMPORTANT: hooks must run on every render. Compute these BEFORE any
  // conditional `return`, otherwise React throws "Rendered more hooks than
  // during the previous render" when the early-return branch flips.
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Today's active leave — approved leave whose period contains today.
  const activeToday = useMemo(() => {
    return leaveRequests.find((r: any) => {
      if (r.status !== 'approved') return false;
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      return s <= today && e >= today;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveRequests]);

  const stats = useMemo(() => {
    let pending = 0;
    let approvedThisYear = 0;
    let daysUsedThisYear = 0;
    for (const r of leaveRequests) {
      const s = new Date(r.startDate);
      if (r.status === 'pending') pending += 1;
      if (r.status === 'approved' && s >= startOfYear) {
        approvedThisYear += 1;
        daysUsedThisYear += parseFloat(r.totalDays || '0') || 0;
      }
    }
    return { pending, approvedThisYear, daysUsedThisYear };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveRequests]);

  // Filter + search applied client-side (volume is per-worker; paginate after).
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaveRequests.filter((r: any) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.leaveType !== typeFilter) return false;
      if (q && !(r.reason || '').toLowerCase().includes(q) && !(r.leaveType || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leaveRequests, statusFilter, typeFilter, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'startDate':
        arr.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        break;
      case 'type':
        arr.sort((a, b) => String(a.leaveType).localeCompare(String(b.leaveType)));
        break;
      case 'status':
        arr.sort((a, b) => String(a.status).localeCompare(String(b.status)));
        break;
      case 'recent':
      default:
        arr.sort((a, b) => new Date(b.createdAt || b.submittedAt || 0).getTime() - new Date(a.createdAt || a.submittedAt || 0).getTime());
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const {
    pageItems,
    page,
    setPage,
    pageSize,
    totalPages,
    totalItems,
  } = usePagination(sorted, { pageSize: viewMode === 'list' ? 20 : 9 });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, searchQuery, sortBy, viewMode, setPage]);

  if (isLoading || profileLoading) {
    return <PageLoader label="Loading leave requests" />;
  }

  if (!isAuthenticated || (user as any)?.userType !== 'worker') {
    return null;
  }

  const isEligibleForLeave = workerProfile?.workerType === 'employee' ||
    (workerProfile?.workerType === 'contractor' && workerProfile?.businessStructure === 'contractor_of_record');

  if (!isEligibleForLeave) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Leave Requests Not Available</h3>
                <p className="text-gray-600">
                  Leave requests are only available for employees and contractors of record.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = (data: LeaveRequestData) => {
    createLeaveRequestMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top callout — only when worker is currently on approved leave. */}
        {activeToday && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3">
            <Plane className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">You're on {activeToday.leaveType.replace(/_/g, ' ')} leave today</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {format(new Date(activeToday.startDate), "PPP")} – {format(new Date(activeToday.endDate), "PPP")}
                {' · '}{activeToday.totalDays} day{activeToday.totalDays !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Stats — quick at-a-glance numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Total Requests</p>
                  <p className="text-2xl font-semibold mt-1">{leaveRequests.length}</p>
                </div>
                <CalendarDays className="h-5 w-5 text-secondary-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Pending</p>
                  <p className="text-2xl font-semibold mt-1 text-amber-700">{stats.pending}</p>
                </div>
                <Hourglass className="h-5 w-5 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Approved (YTD)</p>
                  <p className="text-2xl font-semibold mt-1 text-emerald-700">{stats.approvedThisYear}</p>
                </div>
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-secondary-500">Days Used (YTD)</p>
                  <p className="text-2xl font-semibold mt-1">{stats.daysUsedThisYear}</p>
                </div>
                <CalendarIcon className="h-5 w-5 text-secondary-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar — search, filters, create */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reason or type…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="parental">Parental</SelectItem>
                <SelectItem value="compassionate">Compassionate</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex border border-secondary-300 rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-none border-r border-secondary-300 h-9"
                data-testid="button-leave-view-card"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Card
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none h-9"
                data-testid="button-leave-view-list"
              >
                <ListIcon className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-secondary-600" />
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[150px] h-9 text-sm" data-testid="select-leave-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="startDate">Start date</SelectItem>
                  <SelectItem value="type">Leave type</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              data-testid="button-new-leave-request"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Leave Request
            </Button>
          </div>
        </div>

        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              setEditingId(null);
              form.reset();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Leave Request' : 'New Leave Request'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update the details below — only pending requests can be edited.' : 'Submit a new leave request for approval'}
              </DialogDescription>
            </DialogHeader>
            <div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leaveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leave Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-leave-type">
                                <SelectValue placeholder="Select leave type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="annual">Annual Leave</SelectItem>
                              <SelectItem value="sick">Sick Leave</SelectItem>
                              <SelectItem value="personal">Personal Leave</SelectItem>
                              <SelectItem value="parental">Parental Leave</SelectItem>
                              <SelectItem value="compassionate">Compassionate Leave</SelectItem>
                              <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div></div>
                    
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-start-date"
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
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-end-date"
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
                                disabled={(date) => date < form.watch('startDate')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Leave</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Please provide a reason for your leave request..."
                            data-testid="input-leave-reason"
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
                      data-testid="button-cancel-leave"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLeaveRequestMutation.isPending}
                      data-testid="button-submit-leave"
                    >
                      {createLeaveRequestMutation.isPending
                        ? (editingId ? 'Saving…' : 'Submitting…')
                        : (editingId ? 'Save Changes' : 'Submit Request')}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
          {requestsLoading ? (
            <div className="text-center py-8">Loading leave requests...</div>
          ) : leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Leave Requests</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't submitted any leave requests yet.
                  </p>
                  <Button onClick={() => setShowForm(true)} data-testid="button-first-leave-request">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Leave Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : sorted.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10 text-center text-sm text-secondary-600">
                No leave requests match the current filters.
              </CardContent>
            </Card>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageItems.map((request: any) => (
                <Card
                  key={request.id}
                  className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                  data-testid={`card-leave-request-${request.id}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1 text-xs whitespace-nowrap">
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-secondary-500 ml-auto">
                        Submitted {format(new Date(request.submittedAt), "MMM dd")}
                      </span>
                    </div>
                    <div className="text-sm font-medium capitalize">
                      {request.leaveType.replace('_', ' ')} Leave
                      <span className="ml-2 text-xs text-secondary-500 font-normal">
                        · {request.totalDays} day{request.totalDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-secondary-600">
                      {format(new Date(request.startDate), "MMM dd, yyyy")} – {format(new Date(request.endDate), "MMM dd, yyyy")}
                    </div>
                    {request.reason && (
                      <p className="text-xs text-secondary-700 bg-gray-50 rounded px-2 py-1.5 line-clamp-2" title={request.reason}>
                        {request.reason}
                      </p>
                    )}
                    {request.rejectionReason && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800 line-clamp-2" title={request.rejectionReason}>
                        <strong>Rejected:</strong> {request.rejectionReason}
                      </div>
                    )}
                    {request.status === 'pending' && (
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-xs w-full"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(request); }}
                          data-testid={`button-edit-leave-${request.id}`}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-secondary-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((request: any) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-secondary-50"
                      onClick={() => setSelectedRequest(request)}
                      data-testid={`row-leave-request-${request.id}`}
                    >
                      <TableCell className="text-sm capitalize">{request.leaveType}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(request.startDate), "MMM dd, yyyy")} – {format(new Date(request.endDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right text-sm">{request.totalDays}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1 text-xs w-fit">
                          {getStatusIcon(request.status)}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-secondary-600 whitespace-nowrap">
                        {format(new Date(request.submittedAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(request); }}
                            data-testid={`button-edit-leave-list-${request.id}`}
                          >
                            Edit
                          </Button>
                        ) : (
                          <span className="text-xs text-secondary-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {sorted.length > 0 && (
            <DataPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              label="leave requests"
            />
          )}
        </div>

        <LeaveRequestDetailsModal
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}
        />
      </div>
    </div>
  );
}