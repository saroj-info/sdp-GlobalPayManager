import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CheckCircle, XCircle, Clock, User, Plane, Plus, Search } from 'lucide-react';
import { usePageHeader } from '@/contexts/AuthenticatedLayoutContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DataPagination } from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { LeaveRequestDetailsModal } from '@/components/modals/leave-request-details-modal';
import { WorkerCombobox } from '@/components/pickers/WorkerCombobox';
import { BusinessCombobox } from '@/components/pickers/BusinessCombobox';

export default function LeaveRequests() {
  usePageHeader("Leave Requests", "Review and manage employee leave requests");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const userType: string | undefined = (user as any)?.userType;
  const isSdpInternal = userType === 'sdp_internal';
  const isBusinessUser = userType === 'business_user';
  const canCreateOnBehalf = isSdpInternal || isBusinessUser;

  const { data: leaveRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/leave-requests'],
  });

  // ── Filters (status / business / worker search) ────────────────────────
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterBusinessId, setFilterBusinessId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Selected leave request for the read-only details modal.
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Toolbar businesses dropdown — SDP only. We fetch outside the create
  // dialog's `enabled` gate so the filter dropdown is populated immediately.
  const { data: toolbarBusinesses = [] } = useQuery<any[]>({
    queryKey: ['/api/businesses'],
    enabled: isSdpInternal,
  });

  const filteredLeaveRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaveRequests.filter((r: any) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (filterBusinessId !== 'all' && r.businessId !== filterBusinessId) return false;
      if (q) {
        const workerName = `${r.worker?.firstName ?? ''} ${r.worker?.lastName ?? ''}`.toLowerCase();
        const workerEmail = (r.worker?.email ?? '').toLowerCase();
        const businessName = (r.business?.name ?? '').toLowerCase();
        if (!workerName.includes(q) && !workerEmail.includes(q) && !businessName.includes(q)) return false;
      }
      return true;
    });
  }, [leaveRequests, statusFilter, filterBusinessId, searchQuery]);

  const {
    pageItems: pagedLeaveRequests,
    page: lrPage,
    setPage: setLrPage,
    pageSize: lrPageSize,
    totalPages: lrTotalPages,
    totalItems: lrTotalItems,
  } = usePagination(filteredLeaveRequests, { pageSize: 10 });

  // Reset to page 1 whenever filters change to avoid stranding the user on
  // an empty page after narrowing.
  useEffect(() => {
    setLrPage(1);
  }, [statusFilter, filterBusinessId, searchQuery, setLrPage]);

  // ── Create-on-behalf / edit dialog ────────────────────────────────────
  // Same dialog handles both flows. `editingId` distinguishes mode: null →
  // create, set → edit. Server enforces "pending only" on PATCH.
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string>('');
  const [workerId, setWorkerId] = useState<string>('');
  const [leaveType, setLeaveType] = useState<string>('annual');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Cache the selected worker object so we can read its businessId on submit
  // (the combobox owns the worker list internally — no page-level fetch).
  // The BusinessCombobox below similarly owns its own /api/businesses query.
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  // Reset the worker selection whenever the business changes.
  useEffect(() => {
    setWorkerId('');
    setSelectedWorker(null);
  }, [businessId]);

  const resetForm = () => {
    setBusinessId('');
    setWorkerId('');
    setSelectedWorker(null);
    setLeaveType('annual');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Edit mode (PATCH) — only sends the editable fields. Worker/business are
      // immutable on an existing request so we don't include them.
      if (editingId) {
        const editPayload: Record<string, any> = {
          leaveType,
          startDate,
          endDate,
          totalDays: calculateDays(startDate, endDate),
          reason: reason || undefined,
        };
        const res = await apiRequest('PATCH', `/api/leave-requests/${editingId}`, editPayload);
        return res.json();
      }
      // Create mode (POST) — full payload.
      const payload: Record<string, any> = {
        workerId,
        businessId: isSdpInternal ? businessId : selectedWorker?.businessId,
        leaveType,
        startDate,
        endDate,
        totalDays: calculateDays(startDate, endDate),
        reason: reason || undefined,
      };
      const res = await apiRequest('POST', '/api/leave-requests', payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: editingId ? 'Leave request updated' : 'Leave request created',
        description: editingId
          ? 'Your changes have been saved.'
          : 'The leave request was submitted on behalf of the worker.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      setShowCreate(false);
      setEditingId(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || (editingId ? 'Failed to update leave request' : 'Failed to create leave request'),
        variant: 'destructive',
      });
    },
  });

  // In edit mode we already have the worker → don't require re-selecting one.
  const canSubmit = leaveType && startDate && endDate
    && (editingId || (workerId && (!isSdpInternal || !!businessId)));

  // Open the dialog pre-filled for editing an existing pending request.
  const openEditDialog = (request: any) => {
    setEditingId(request.id);
    setLeaveType(request.leaveType);
    setStartDate(String(request.startDate).slice(0, 10));
    setEndDate(String(request.endDate).slice(0, 10));
    setReason(request.reason || '');
    // worker + business already locked on the request; we don't need them for PATCH.
    setBusinessId(request.businessId || '');
    setWorkerId(request.workerId || '');
    setSelectedWorker(request.worker || null);
    setShowCreate(true);
  };

  // Single mutation handles both approve and reject — server PATCH expects
  // `status` and optional `rejectionReason`.
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) => {
      const res = await apiRequest('PATCH', `/api/leave-requests/${id}/status`, { status, rejectionReason });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: variables.status === 'approved' ? 'Leave approved' : 'Leave rejected',
        description: variables.status === 'approved' ? 'The leave request has been approved.' : 'The leave request has been rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update leave request',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (id: string) => {
    statusMutation.mutate({ id, status: 'approved' });
  };

  const handleReject = (id: string) => {
    const reason = prompt('Reason for rejection (optional):') ?? undefined;
    statusMutation.mutate({ id, status: 'rejected', rejectionReason: reason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'annual':
        return <Plane className="w-4 h-4" />;
      case 'sick':
        return <Clock className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

          {/* Toolbar: search + status filter + business filter (SDP) + Create */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isSdpInternal ? 'Search worker or business…' : 'Search worker…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                  data-testid="input-leave-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[150px] h-9 text-sm" data-testid="select-leave-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {isSdpInternal && (
                <Select value={filterBusinessId} onValueChange={setFilterBusinessId}>
                  <SelectTrigger className="w-[200px] h-9 text-sm" data-testid="select-leave-business-filter">
                    <SelectValue placeholder="Business" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Businesses</SelectItem>
                    {(toolbarBusinesses as any[]).filter((b: any) => b.id && b.name).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {canCreateOnBehalf && (
              <Button
                onClick={() => setShowCreate(true)}
                data-testid="button-create-leave-request"
              >
                <Plus className="w-4 h-4 mr-1" /> New Leave Request
              </Button>
            )}
          </div>

          <Dialog
            open={showCreate}
            onOpenChange={(open) => {
              setShowCreate(open);
              if (!open) {
                setEditingId(null);
                resetForm();
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Leave Request' : 'New Leave Request'}</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? 'Update the details below — only pending requests can be edited.'
                    : 'Create a leave request on behalf of a worker.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Business + Worker pickers — searchable comboboxes shared
                    with the payslip and leave-request flows. In edit mode the
                    pickers are disabled (business/worker can't change on an
                    existing leave request) but they still display the existing
                    values via the `initialWorker` seed so the user sees the
                    correct worker name without opening the popover. */}
                {isSdpInternal && (
                  <div className="space-y-1.5">
                    <Label>Business {!editingId && '*'}</Label>
                    <BusinessCombobox
                      value={businessId || null}
                      onChange={(id) => {
                        setBusinessId(id || '');
                        // Clear worker if business changes — old selection
                        // may no longer be in the narrowed list.
                        if (!editingId) {
                          setWorkerId('');
                          setSelectedWorker(null);
                        }
                      }}
                      disabled={!!editingId}
                      placeholder="Select business…"
                      testId="select-leave-business"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Worker {!editingId && '*'}</Label>
                  <WorkerCombobox
                    value={workerId}
                    onChange={(id, worker) => {
                      setWorkerId(id);
                      setSelectedWorker(worker);
                    }}
                    businessId={isSdpInternal ? businessId || undefined : undefined}
                    disabled={!!editingId || (isSdpInternal && !businessId)}
                    placeholder={
                      editingId
                        ? 'Worker (locked)'
                        : isSdpInternal && !businessId
                          ? 'Select business first'
                          : 'Select worker…'
                    }
                    initialWorker={selectedWorker}
                    testId="select-leave-worker"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Leave Type *</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="parental">Parental</SelectItem>
                      <SelectItem value="compassionate">Compassionate</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start Date *</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-leave-start" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date *</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} data-testid="input-leave-end" />
                  </div>
                </div>

                {startDate && endDate && (
                  <div className="text-xs text-muted-foreground">
                    Total: {calculateDays(startDate, endDate)} day{calculateDays(startDate, endDate) !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief reason for the leave…"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!canSubmit || createMutation.isPending}
                  data-testid="button-submit-leave-request"
                >
                  {createMutation.isPending
                    ? (editingId ? 'Saving…' : 'Creating…')
                    : (editingId ? 'Save Changes' : 'Create Leave Request')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
                <p className="text-gray-600">Workers haven't submitted any leave requests yet.</p>
              </CardContent>
            </Card>
          ) : filteredLeaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-secondary-600">
                No leave requests match the current filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {pagedLeaveRequests.map((request: any) => (
                <Card
                  key={request.id}
                  className="border-l-4 border-l-primary-500 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => setSelectedRequest(request)}
                  data-testid={`card-leave-request-${request.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-500" />
                        <div>
                          <CardTitle className="text-lg">
                            {request.worker?.firstName} {request.worker?.lastName}
                          </CardTitle>
                          <p className="text-sm text-gray-600">{request.worker?.email}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(request.status)}
                          <span className="capitalize">{request.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        {getLeaveTypeIcon(request.leaveType)}
                        <span className="text-sm capitalize font-medium">{request.leaveType} Leave</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{calculateDays(request.startDate, request.endDate)} days</span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Reason</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.reason}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex space-x-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                          disabled={statusMutation.isPending}
                          data-testid={`button-approve-${request.id}`}
                        >
                          {statusMutation.isPending && statusMutation.variables?.id === request.id && statusMutation.variables?.status === 'approved'
                            ? 'Approving…'
                            : 'Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleReject(request.id); }}
                          disabled={statusMutation.isPending}
                          data-testid={`button-reject-${request.id}`}
                        >
                          {statusMutation.isPending && statusMutation.variables?.id === request.id && statusMutation.variables?.status === 'rejected'
                            ? 'Rejecting…'
                            : 'Reject'}
                        </Button>
                        {canCreateOnBehalf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(request); }}
                            data-testid={`button-edit-leave-${request.id}`}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )}

                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                        <h5 className="font-medium text-red-800 mb-1">Rejection Reason</h5>
                        <p className="text-sm text-red-700">{request.rejectionReason}</p>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Requested: {new Date(request.createdAt).toLocaleString()}
                      {request.approvedAt && (
                        <span className="ml-4">Approved: {new Date(request.approvedAt).toLocaleString()}</span>
                      )}
                      {request.rejectedAt && (
                        <span className="ml-4">Rejected: {new Date(request.rejectedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredLeaveRequests.length > 0 && (
            <DataPagination
              page={lrPage}
              totalPages={lrTotalPages}
              totalItems={lrTotalItems}
              pageSize={lrPageSize}
              onPageChange={setLrPage}
              label="leave requests"
            />
          )}

          <LeaveRequestDetailsModal
            request={selectedRequest}
            open={!!selectedRequest}
            onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}
          />
      </div>
    </div>
  );
}