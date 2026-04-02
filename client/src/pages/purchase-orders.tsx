import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Trash2, FileText, DollarSign, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open": return "default";
    case "exhausted": return "destructive";
    case "closed": return "secondary";
    case "cancelled": return "outline";
    default: return "secondary";
  }
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPO, setEditingPO] = useState<any>(null);

  usePageHeader(
    "Purchase Orders",
    "Track PO/SOW authorised value vs invoiced amount"
  );

  const isSDPInternal = (user as any)?.userType === 'sdp_internal';

  const { data: pos = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const filteredPOs = useMemo(() => {
    let result = [...(pos as any[])];
    if (filterStatus !== 'all') {
      result = result.filter(p => p.status === filterStatus);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.poNumber?.toLowerCase().includes(s) ||
        p.sowNumber?.toLowerCase().includes(s) ||
        p.projectName?.toLowerCase().includes(s) ||
        p.contractWorkerName?.toLowerCase().includes(s) ||
        p.businessName?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [pos, filterStatus, search]);

  const updatePOMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const resp = await apiRequest("PATCH", `/api/purchase-orders/${id}`, data);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setShowEditDialog(false);
      setEditingPO(null);
      toast({ title: "Purchase order updated" });
    },
    onError: () => toast({ title: "Failed to update purchase order", variant: "destructive" }),
  });

  const deletePOMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({ title: "Purchase order deleted" });
    },
    onError: () => toast({ title: "Failed to delete purchase order", variant: "destructive" }),
  });

  const formatCurrency = (amount: string | number | null, currency: string) => {
    if (!amount) return `${currency} 0.00`;
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency || 'AUD', minimumFractionDigits: 2 }).format(parseFloat(String(amount)));
  };

  const getRemaining = (po: any) => {
    const auth = parseFloat(po.authorisedValue || '0');
    const invoiced = parseFloat(po.invoicedToDate || '0');
    return auth - invoiced;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <Input
            className="pl-10"
            placeholder="Search by PO number, project, worker or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="exhausted">Exhausted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['open', 'exhausted', 'closed', 'cancelled'].map(s => {
          const count = (pos as any[]).filter(p => p.status === s).length;
          return (
            <Card key={s}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(s)} className="capitalize">{s}</Badge>
                </div>
                <div className="text-2xl font-bold mt-1">{count}</div>
                <div className="text-xs text-secondary-500">purchase orders</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-secondary-400">Loading purchase orders...</div>
          ) : filteredPOs.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 mb-3 text-secondary-300" />
              <p className="text-secondary-500">No purchase orders found.</p>
              <p className="text-sm text-secondary-400 mt-1">Add POs when creating or editing a contract.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>SOW</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Worker / Business</TableHead>
                    <TableHead>Authorised</TableHead>
                    <TableHead>Invoiced</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po: any) => {
                    const remaining = getRemaining(po);
                    const isExhausted = remaining <= 0;
                    return (
                      <TableRow
                        key={po.id}
                        className="cursor-pointer hover:bg-secondary-50"
                        onClick={() => navigate(`/contracts`)}
                      >
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell className="text-secondary-600">{po.sowNumber || '—'}</TableCell>
                        <TableCell>{po.projectName}</TableCell>
                        <TableCell>
                          <div className="text-sm">{po.contractWorkerName || '—'}</div>
                          <div className="text-xs text-secondary-500">{po.businessName || '—'}</div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(po.authorisedValue, po.currency)}</TableCell>
                        <TableCell>{formatCurrency(po.invoicedToDate, po.currency)}</TableCell>
                        <TableCell>
                          <span className={isExhausted ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
                            {formatCurrency(remaining, po.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="text-secondary-600">
                          {po.endDate ? new Date(po.endDate).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(po.status)} className="capitalize">
                            {po.status || 'open'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingPO(po); setShowEditDialog(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isSDPInternal && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePOMutation.mutate(po.id)}
                                disabled={deletePOMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
          </DialogHeader>
          {editingPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={editingPO.status || 'open'}
                    onValueChange={(v) => setEditingPO({ ...editingPO, status: v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="exhausted">Exhausted</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Invoiced to Date</Label>
                  <Input
                    className="h-9"
                    type="number"
                    step="0.01"
                    value={editingPO.invoicedToDate || '0'}
                    onChange={(e) => setEditingPO({ ...editingPO, invoicedToDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Authorised Value</Label>
                  <Input
                    className="h-9"
                    type="number"
                    step="0.01"
                    value={editingPO.authorisedValue || ''}
                    onChange={(e) => setEditingPO({ ...editingPO, authorisedValue: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={editingPO.endDate ? editingPO.endDate.split('T')[0] : ''}
                    onChange={(e) => setEditingPO({ ...editingPO, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  className="h-9"
                  value={editingPO.notes || ''}
                  onChange={(e) => setEditingPO({ ...editingPO, notes: e.target.value })}
                  placeholder="Notes"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingPO(null); }}>
                  Cancel
                </Button>
                <Button
                  disabled={updatePOMutation.isPending}
                  onClick={() => updatePOMutation.mutate({ id: editingPO.id, data: {
                    status: editingPO.status,
                    invoicedToDate: editingPO.invoicedToDate,
                    authorisedValue: editingPO.authorisedValue,
                    endDate: editingPO.endDate || null,
                    notes: editingPO.notes,
                  }})}
                >
                  {updatePOMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
