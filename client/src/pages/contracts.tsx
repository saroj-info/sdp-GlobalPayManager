import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Users, Building2, MapPin, DollarSign, Edit, Save, X, Mail, ExternalLink, LayoutGrid, List as ListIcon, ArrowUpDown, RotateCcw, Lock, ChevronDown, ChevronUp, Trash2, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContractWizardModal } from "@/components/modals/contract-wizard-modal";
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { getContractStatusLabel, getContractStatusVariant } from "@shared/contractHelpers";

interface ContractInstance {
  id: string;
  contractTitle: string;
  workerName: string;
  businessName: string;
  signatureStatus: string;
  sentAt: string | null;
  workerSignedAt: string | null;
  businessSignedAt: string | null;
  createdAt: string;
  template: any;
  worker: any;
}

function ContractStatusBadge({ contract }: { contract: any }) {
  if (!contract) return null;
  
  // Use derived signature status if available, otherwise fall back to legacy status
  const derivedStatus = contract.derivedSignatureStatus || contract.status || 'draft';
  const termExpired = contract.termExpired;
  
  const icons: Record<string, any> = {
    signed: CheckCircle,
    pending: AlertCircle,
    expired: Clock,
    declined: X,
    draft: FileText,
  };

  const Icon = icons[derivedStatus] || FileText;
  const variant = getContractStatusVariant(derivedStatus);
  const label = getContractStatusLabel(derivedStatus);

  return (
    <div className="flex gap-2">
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      {termExpired && (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Term Expired
        </Badge>
      )}
    </div>
  );
}

function SdpBillingLinesPanel({ contractId }: { contractId: string }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);
  const [newLine, setNewLine] = useState<any>(null);

  const { data: billingLines = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/contracts', contractId, 'billing-lines'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts/${contractId}/billing-lines`);
      return res.json();
    },
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (line: any) => {
      if (line.id) {
        const res = await apiRequest('PATCH', `/api/contracts/${contractId}/billing-lines/${line.id}`, line);
        return res.json();
      }
      const res = await apiRequest('POST', `/api/contracts/${contractId}/billing-lines`, line);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId, 'billing-lines'] });
      setEditingLine(null);
      setNewLine(null);
      toast({ title: "Saved", description: "Billing line updated." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (lineId: string) => {
      await apiRequest('DELETE', `/api/contracts/${contractId}/billing-lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId, 'billing-lines'] });
      toast({ title: "Deleted", description: "Billing line removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const defaultNewLine = () => ({
    description: '',
    lineType: 'percentage_of_pay',
    rate: '',
    amount: '',
    currency: 'USD',
    frequency: 'per_timesheet_period',
    isActive: true,
    sortOrder: billingLines.length,
    notes: '',
  });

  const LineForm = ({ line, onSave, onCancel }: { line: any; onSave: (l: any) => void; onCancel: () => void }) => {
    const [form, setForm] = useState({ ...line });
    const [validationError, setValidationError] = useState('');
    const handleSave = () => {
      if (!form.description || !form.description.trim()) {
        setValidationError('Description is required');
        return;
      }
      if (!form.rate && form.rate !== 0) {
        setValidationError('Rate is required');
        return;
      }
      setValidationError('');
      onSave(form);
    };
    return (
      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-3">
        {validationError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{validationError}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <Input value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); setValidationError(''); }} placeholder="e.g. Management Fee" className={`h-8 text-sm ${validationError && !form.description?.trim() ? 'border-red-400' : ''}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
            <Select value={form.lineType} onValueChange={v => setForm({ ...form, lineType: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage_of_pay">% of Pay</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                <SelectItem value="fixed_percentage">Fixed %</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Rate</label>
            <Input value={form.rate} onChange={e => { setForm({ ...form, rate: e.target.value }); setValidationError(''); }} placeholder={form.lineType === 'fixed_amount' ? '500.00' : '0.15'} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Frequency</label>
            <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_timesheet_period">Per Period</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2 h-8">
              <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
              <span className="text-xs text-gray-600">{form.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="default" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-sm text-blue-900">SDP Billing Lines</span>
          <Badge variant="outline" className="text-xs text-blue-700 border-blue-300 bg-white">SDP Only</Badge>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 bg-white">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            These billing components make up the SDP invoice to the business. They are never visible to the business.
          </p>

          {isLoading ? (
            <div className="text-sm text-muted-foreground py-2">Loading billing lines...</div>
          ) : (
            <div className="space-y-2">
              {billingLines.map((line: any) => (
                editingLine?.id === line.id ? (
                  <LineForm key={line.id} line={editingLine} onSave={l => saveMutation.mutate(l)} onCancel={() => setEditingLine(null)} />
                ) : (
                  <div key={line.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{line.description}</span>
                        <Badge variant={line.isActive ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                          {line.isActive ? 'Active' : 'Off'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {line.lineType === 'percentage_of_pay' ? '% of Pay' : line.lineType === 'fixed_amount' ? 'Fixed Amount' : 'Fixed %'}
                        </span>
                        <span className="text-xs font-medium text-blue-700">
                          {line.lineType === 'fixed_amount' ? `${line.currency} ${parseFloat(line.rate || line.amount || '0').toFixed(2)}` : `${parseFloat(line.rate || '0').toFixed(1)}%`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {line.frequency === 'per_timesheet_period' ? 'Per Period' : line.frequency === 'monthly' ? 'Monthly' : 'Annual'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingLine(line)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(line.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              ))}
              {newLine && (
                <LineForm line={newLine} onSave={l => saveMutation.mutate(l)} onCancel={() => setNewLine(null)} />
              )}
              {billingLines.length === 0 && !newLine && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No billing lines yet. Add one below.
                </p>
              )}
            </div>
          )}

          {!newLine && (
            <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setNewLine(defaultNewLine())}>
              <Plus className="h-3 w-3 mr-1" />
              Add Billing Line
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SdpRemunerationPanel({ contract }: { contract: any }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);
  const [newLine, setNewLine] = useState<any>(null);
  const contractId = contract.id;
  const isSalary = contract.rateType === 'annual';
  const ctcValue = parseFloat(contract.totalPackageValue || contract.rate || '0');

  const { data: remunLines = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/contracts', contractId, 'remuneration-lines'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts/${contractId}/remuneration-lines`);
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: rateLines = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts', contractId, 'rate-lines'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/contracts/${contractId}/rate-lines`);
      return res.json();
    },
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (line: any) => {
      if (line.id) {
        const res = await apiRequest('PATCH', `/api/contracts/${contractId}/remuneration-lines/${line.id}`, line);
        return res.json();
      }
      const res = await apiRequest('POST', `/api/contracts/${contractId}/remuneration-lines`, line);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId, 'remuneration-lines'] });
      setEditingLine(null);
      setNewLine(null);
      toast({ title: "Saved", description: "Remuneration line saved." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (lineId: string) => {
      await apiRequest('DELETE', `/api/contracts/${contractId}/remuneration-lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId, 'remuneration-lines'] });
      toast({ title: "Deleted", description: "Remuneration line removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const autoPopulate = async () => {
    if (isSalary) return;
    if (contract.rateStructure === 'multiple' && rateLines.length > 0) {
      for (const rl of rateLines) {
        await saveMutation.mutateAsync({
          type: 'base_salary',
          description: rl.projectName || 'Base Rate',
          amount: rl.rate,
          frequency: contract.rateType || 'hourly',
          paymentTrigger: 'timesheet_period',
        });
      }
    } else {
      await saveMutation.mutateAsync({
        type: 'base_salary',
        description: contract.rateType === 'hourly' ? 'Base Hourly Rate' : 'Base Daily Rate',
        amount: contract.rate,
        frequency: contract.rateType || 'hourly',
        paymentTrigger: 'timesheet_period',
      });
    }
  };

  const linesTotal = remunLines.reduce((sum: number, l: any) => sum + parseFloat(l.amount || '0'), 0);
  const ctcMatch = isSalary && Math.abs(linesTotal - ctcValue) < 0.01;
  const ctcMismatch = isSalary && remunLines.length > 0 && !ctcMatch;

  const typeLabels: Record<string, string> = { base_salary: 'Base Salary/Rate', allowance: 'Allowance', bonus: 'Bonus', commission: 'Commission', overtime: 'Overtime', other: 'Other' };
  const freqLabels: Record<string, string> = { annual: 'Annual', monthly: 'Monthly', hourly: 'Hourly', daily: 'Daily', per_occurrence: 'Per Occurrence' };
  const triggerLabels: Record<string, string> = { scheduled: 'Scheduled', timesheet_period: 'Per Timesheet', event_triggered: 'Event' };

  const LineForm = ({ line, onSave, onCancel }: { line: any; onSave: (l: any) => void; onCancel: () => void }) => {
    const [form, setForm] = useState({ ...line });
    const [validationError, setValidationError] = useState('');
    const handleSave = () => {
      if (!form.description || !form.description.trim()) {
        setValidationError('Description is required');
        return;
      }
      if (!form.amount && form.amount !== 0) {
        setValidationError('Amount is required');
        return;
      }
      setValidationError('');
      onSave(form);
    };
    return (
      <div className="border border-green-200 rounded-lg p-3 bg-green-50 space-y-3">
        {validationError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{validationError}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="base_salary">Base Salary/Rate</SelectItem>
                <SelectItem value="allowance">Allowance</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="overtime">Overtime</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Amount</label>
            <Input value={form.amount} onChange={e => { setForm({ ...form, amount: e.target.value }); setValidationError(''); }} placeholder="0.00" type="number" step="0.01" className="h-8 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <Input value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); setValidationError(''); }} placeholder="e.g. Superannuation" className={`h-8 text-sm ${validationError && !form.description?.trim() ? 'border-red-400' : ''}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Frequency</label>
            <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="per_occurrence">Per Occurrence</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Payment Trigger</label>
            <Select value={form.paymentTrigger || 'scheduled'} onValueChange={v => setForm({ ...form, paymentTrigger: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="timesheet_period">Per Timesheet</SelectItem>
                <SelectItem value="event_triggered">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="default" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-green-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-700" />
          <span className="font-semibold text-sm text-green-900">Remuneration Lines</span>
          <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-white">SDP Only</Badge>
          {isSalary && (
            <span className="text-xs text-green-700">CTC: {contract.currency} {contract.totalPackageValue || contract.rate}</span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-green-700" /> : <ChevronDown className="h-4 w-4 text-green-700" />}
      </button>

      {isOpen && (
        <div className="p-3 space-y-3 bg-white">
          {isSalary && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <strong>Total Package (CTC): {contract.currency} {(ctcValue).toLocaleString()}</strong>
              {remunLines.length > 0 && (
                <span className={`ml-2 font-medium ${ctcMatch ? 'text-green-700' : 'text-red-600'}`}>
                  Lines total: {contract.currency} {linesTotal.toLocaleString()} {ctcMatch ? 'Matches CTC' : `— ${(ctcValue - linesTotal).toLocaleString()} remaining`}
                </span>
              )}
            </div>
          )}
          {ctcMismatch && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
              Warning: Lines total {contract.currency} {linesTotal.toLocaleString()} — must equal CTC of {contract.currency} {ctcValue.toLocaleString()}
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-2">Loading...</p>
          ) : (
            <div className="space-y-2">
              {remunLines.map((line: any) => (
                editingLine?.id === line.id ? (
                  <LineForm key={line.id} line={editingLine} onSave={l => saveMutation.mutate(l)} onCancel={() => setEditingLine(null)} />
                ) : (
                  <div key={line.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{line.description}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                          {typeLabels[line.type] || (line.type || '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-medium text-green-700">
                          {contract.currency} {parseFloat(line.amount || '0').toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {freqLabels[line.frequency] || line.frequency}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {triggerLabels[line.paymentTrigger] || (line.paymentTrigger || 'scheduled').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingLine(line)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(line.id)} disabled={deleteMutation.isPending}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )
              ))}
              {newLine && (
                <LineForm line={newLine} onSave={l => saveMutation.mutate(l)} onCancel={() => setNewLine(null)} />
              )}
              {remunLines.length === 0 && !newLine && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No remuneration lines yet. {!isSalary && 'Use Auto-populate or add manually.'}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {!isSalary && !newLine && remunLines.length === 0 && (
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={autoPopulate} disabled={saveMutation.isPending}>
                <Plus className="h-3 w-3 mr-1" />
                Auto-populate from Rate{contract.rateStructure === 'multiple' ? ' Lines' : ''}
              </Button>
            )}
            {!newLine && (
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => setNewLine({ type: 'base_salary', description: '', amount: '', frequency: isSalary ? 'annual' : (contract.rateType || 'hourly'), paymentTrigger: 'scheduled' })}>
                <Plus className="h-3 w-3 mr-1" />
                Add Line
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContractsPage() {
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showContractDocument, setShowContractDocument] = useState(false);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [filterBusiness, setFilterBusiness] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [preselectedWorkerId, setPreselectedWorkerId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'worker' | 'role' | 'country' | 'status' | 'date'>('date');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  usePageHeader(
    "Contracts",
    (user as any)?.userType === 'worker' ? "View your employment contracts" : "Manage employment contracts and e-signatures"
  );
  
  // Only load data when on contracts page
  const isOnContractsPage = location === '/contracts';
  
  // Check for workerId URL parameter and open wizard if present
  useEffect(() => {
    if (isOnContractsPage) {
      const urlParams = new URLSearchParams(window.location.search);
      const workerId = urlParams.get('workerId');
      if (workerId) {
        setPreselectedWorkerId(workerId);
        setShowContractWizard(true);
        // Clear URL parameter after reading it
        window.history.replaceState({}, '', '/contracts');
      }
    }
  }, [isOnContractsPage]);

  // Fetch businesses for SDP internal filtering - only when on contracts page
  const { data: businesses = [] } = useQuery({
    queryKey: ["/api/businesses"],
    enabled: (user as any)?.userType === 'sdp_internal' && isOnContractsPage,
  });

  // Fetch contract instances - only when on contracts page
  const { data: allContracts, isLoading: isLoadingContracts } = useQuery({
    queryKey: filterBusiness && filterBusiness !== "all" ? ['/api/contracts/business', filterBusiness] : ['/api/contracts'],
    enabled: isAuthenticated && isOnContractsPage,
  });

  // Filter and sort contracts
  const filteredAndSortedContracts = useMemo(() => {
    // Filter contracts by status
    const filtered = allContracts?.filter((contract: any) => {
      if (filterStatus === "all") return true;
      
      const status = contract.status || contract.derivedSignatureStatus || 'draft';
      
      switch (filterStatus) {
        case "pending_sdp_review":
          return status === "pending_sdp_review";
        case "active":
          return status === "active" || (status === "signed" && !contract.termExpired);
        case "signed":
          return status === "signed" || contract.derivedSignatureStatus === "signed";
        case "pending_signature":
          return status === "pending" || contract.derivedSignatureStatus === "pending";
        default:
          return true;
      }
    }) || [];
    
    // Sort contracts
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'worker':
          const aWorkerName = `${a.worker?.firstName} ${a.worker?.lastName}`;
          const bWorkerName = `${b.worker?.firstName} ${b.worker?.lastName}`;
          return aWorkerName.localeCompare(bWorkerName);
        case 'role':
          const aRole = a.customRoleTitle || a.roleTitle?.name || '';
          const bRole = b.customRoleTitle || b.roleTitle?.name || '';
          return aRole.localeCompare(bRole);
        case 'country':
          return (a.country?.name || '').localeCompare(b.country?.name || '');
        case 'status':
          const aStatus = a.derivedSignatureStatus || a.status || 'draft';
          const bStatus = b.derivedSignatureStatus || b.status || 'draft';
          return aStatus.localeCompare(bStatus);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [allContracts, filterStatus, sortBy]);

  // Fetch workers and countries for contract wizard - only when on contracts page
  const { data: workers = [] } = useQuery({
    queryKey: ['/api/workers'],
    enabled: isAuthenticated && isOnContractsPage,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['/api/countries'],
    enabled: isAuthenticated && isOnContractsPage,
  });

  // Send contract for signing mutation
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [contractToRecall, setContractToRecall] = useState<any>(null);

  const sendForSigningMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("POST", `/api/contracts/${contractId}/send-for-signing`);
    },
    onSuccess: () => {
      toast({
        title: "Contract Sent",
        description: "The contract has been sent to the worker for signing via email.",
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith('/api/contracts');
        }
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const recallContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("POST", `/api/contracts/${contractId}/recall`);
    },
    onSuccess: () => {
      toast({
        title: "Contract Recalled",
        description: "The signature request has been cancelled. You can now edit and re-send the contract.",
      });
      setShowRecallDialog(false);
      setContractToRecall(null);
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith('/api/contracts');
        }
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Render login redirect without early return
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access contracts.</p>
            <button 
              onClick={() => window.location.href = '/test-login'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || isLoadingContracts) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold mb-4">Loading Contracts...</h1>
          <p className="text-muted-foreground">Please wait while we fetch your contracts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
          {/* Filters and Actions */}
          <div className="flex flex-col gap-4">
            {/* Top Row: Filters and Create Button */}
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                {(user as any)?.userType === 'sdp_internal' && (
                  <>
                    <Select value={filterBusiness} onValueChange={setFilterBusiness}>
                      <SelectTrigger className="w-48" data-testid="select-filter-client">
                        <SelectValue placeholder="Filter by client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {(businesses as any[]).map((business: any) => (
                          <SelectItem key={business.id} value={business.id}>
                            {business.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-48" data-testid="select-filter-status">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contracts</SelectItem>
                        <SelectItem value="pending_sdp_review">Pending Review</SelectItem>
                        <SelectItem value="active">Active Contracts</SelectItem>
                        <SelectItem value="signed">Signed</SelectItem>
                        <SelectItem value="pending_signature">Pending Signature</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              
              {/* Only show Create Contract button for business users and SDP internal */}
              {(user as any)?.userType !== 'worker' && (
                <Button onClick={() => setShowContractWizard(true)} data-testid="button-create-contract">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Contract
                </Button>
              )}
            </div>

            {/* Bottom Row: View Toggle and Sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">View:</span>
                <div className="flex border border-secondary-300 rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    className="rounded-none border-r border-secondary-300"
                    data-testid="button-view-card"
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Card
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none"
                    data-testid="button-view-list"
                  >
                    <ListIcon className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40" data-testid="select-sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Created</SelectItem>
                    <SelectItem value="worker">Worker Name</SelectItem>
                    <SelectItem value="role">Role/Title</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contracts Display - Card or List View */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow" data-testid={`card-contract-${contract.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg leading-none">
                        {contract.customRoleTitle || contract.roleTitle?.name || 'Contract'}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {contract.worker?.firstName} {contract.worker?.lastName}
                      </CardDescription>
                    </div>
                    <ContractStatusBadge contract={contract} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Building2 className="mr-2 h-4 w-4" />
                    {contract.employmentType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {contract.country?.name}
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <DollarSign className="mr-2 h-4 w-4" />
                    {contract.currency} {contract.rate} / {contract.rateType}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(contract.createdAt).toLocaleDateString()}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Start Date: {new Date(contract.startDate).toLocaleDateString()}
                  </div>

                  {contract.endDate && (
                    <div className="text-xs text-muted-foreground">
                      End Date: {new Date(contract.endDate).toLocaleDateString()}
                    </div>
                  )}

                  {(contract as any).thirdPartyBusinessName && (
                    <div className="flex items-center text-xs font-medium text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                      <Building2 className="mr-1.5 h-3 w-3 text-amber-600 flex-shrink-0" />
                      3rd Party Vendor: {(contract as any).thirdPartyBusinessName}
                    </div>
                  )}

                  {((user as any)?.userType === 'sdp_internal' || (user as any)?.userType === 'sdp_super_admin') && (
                    <div className={`flex items-center text-xs font-medium rounded px-2 py-1 border ${
                      (contract as any).billingLines?.length > 0
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-gray-500 bg-gray-50 border-gray-200'
                    }`}>
                      <DollarSign className={`mr-1.5 h-3 w-3 flex-shrink-0 ${
                        (contract as any).billingLines?.length > 0 ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      {(contract as any).billingLines?.length > 0
                        ? `${(contract as any).billingLines.length} Billing Line${(contract as any).billingLines.length > 1 ? 's' : ''}`
                        : 'No Billing Lines'}
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t border-secondary-200">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowContractDetails(true);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredAndSortedContracts.length === 0 && (
              <div className="col-span-full">
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No contracts yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {(user as any)?.userType === 'worker' ? 
                        "No contracts have been assigned to you yet." :
                        "Create your first contract to get started with managing employment agreements."
                      }
                    </p>
                    {(user as any)?.userType !== 'worker' && (
                      <Button onClick={() => setShowContractWizard(true)} data-testid="button-create-first-contract">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Contract
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-lg shadow">
              {filteredAndSortedContracts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Role/Title</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Employment Type</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedContracts.map((contract) => (
                      <TableRow key={contract.id} className="hover:bg-secondary-50">
                        <TableCell className="font-medium">
                          {contract.worker?.firstName} {contract.worker?.lastName}
                        </TableCell>
                        <TableCell>
                          {contract.customRoleTitle || contract.roleTitle?.name || 'Contract'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                            {contract.country?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contract.employmentType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="mr-1 h-3 w-3 text-muted-foreground" />
                            {contract.currency} {contract.rate}/{contract.rateType}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(contract.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <ContractStatusBadge contract={contract} />
                            {(contract as any).thirdPartyBusinessName && (
                              <span className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">
                                3rd Party: {(contract as any).thirdPartyBusinessName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowContractDetails(true);
                            }}
                            data-testid={`button-view-details-list-${contract.id}`}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No contracts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {(user as any)?.userType === 'worker' ? 
                      "No contracts have been assigned to you yet." :
                      "Create your first contract to get started with managing employment agreements."
                    }
                  </p>
                  {(user as any)?.userType !== 'worker' && (
                    <Button onClick={() => setShowContractWizard(true)} data-testid="button-create-first-contract">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Contract
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contract Wizard Modal - Same as Dashboard */}
          <ContractWizardModal
        open={showContractWizard}
        onOpenChange={(open) => {
          setShowContractWizard(open);
          if (!open) {
            setIsEditingContract(false);
            setSelectedContract(null);
            setPreselectedWorkerId(undefined);
          }
        }}
        workers={workers}
        countries={countries}
        editMode={isEditingContract}
        existingContract={isEditingContract ? selectedContract : null}
        preselectedWorkerId={preselectedWorkerId}
      />

      {/* Contract Details Modal - Simple Summary */}
      <Dialog open={showContractDetails} onOpenChange={setShowContractDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Summary
            </DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6">
              {/* Main Contract Info */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">
                  {selectedContract.customRoleTitle || selectedContract.roleTitle?.title || 'Contract Role'}
                </h3>
                <p className="text-lg text-muted-foreground">
                  {selectedContract.worker?.firstName} {selectedContract.worker?.lastName}
                </p>
                <ContractStatusBadge contract={selectedContract} />
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Employment Type</p>
                  <p className="font-semibold">{selectedContract.employmentType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-semibold">{selectedContract.country?.name}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="font-semibold">
                    {selectedContract.rateType === 'annual'
                      ? `${selectedContract.currency} ${selectedContract.totalPackageValue || selectedContract.rate} / year (CTC)`
                      : `${selectedContract.currency} ${selectedContract.rate} / ${selectedContract.rateType}`}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">
                    {new Date(selectedContract.startDate).toLocaleDateString()} - {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
              </div>

              {/* Remuneration Lines — Gating for business users viewing pending salary contracts */}
              {(user as any)?.userType === 'business_user' && selectedContract.rateType === 'annual' && selectedContract.status === 'pending_sdp_review' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Pay breakdown pending SDP confirmation. You will be notified once the breakdown has been reviewed and the contract is ready to issue.
                  </p>
                </div>
              )}

              {/* SDP Remuneration Lines Panel — SDP internal only */}
              {((user as any)?.userType === 'sdp_internal' || (user as any)?.userType === 'sdp_super_admin') && (
                <SdpRemunerationPanel contract={selectedContract} />
              )}

              {/* SDP Billing Lines Panel — SDP internal only */}
              {((user as any)?.userType === 'sdp_internal' || (user as any)?.userType === 'sdp_super_admin') && (
                <SdpBillingLinesPanel contractId={selectedContract.id} />
              )}

              {/* Actions - Different for workers vs business users */}
              <div className="flex justify-center gap-3 pt-4">
                {(user as any)?.userType === 'worker' ? (
                  // Worker view - read-only
                  <>
                    <Button 
                      variant="outline" 
                      data-testid="button-view-document"
                      onClick={() => {
                        if (!selectedContract?.contractDocument) {
                          toast({
                            title: "No Document",
                            description: "This contract document has not been generated yet.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setShowContractDocument(true);
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Document
                    </Button>
                    {selectedContract?.signedAt && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Signed</span>
                      </div>
                    )}
                    <Button variant="outline" onClick={() => setShowContractDetails(false)} data-testid="button-close-contract">
                      Close
                    </Button>
                  </>
                ) : (
                  // Business/SDP Internal view - full functionality with locking
                  (() => {
                    const sigStatus = selectedContract?.derivedSignatureStatus || selectedContract?.signatureStatus || '';
                    const isLocked = ['sent_for_signature', 'partially_signed'].includes(sigStatus);
                    const isFullySigned = sigStatus === 'fully_signed' || !!selectedContract?.signedAt;
                    return (
                      <>
                        {/* Edit or Recall based on lock state */}
                        {isFullySigned ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-md" data-testid="badge-signed-locked">
                            <Lock className="h-4 w-4" />
                            <span className="text-sm font-medium">Signed & Locked</span>
                          </div>
                        ) : isLocked ? (
                          <Button
                            variant="outline"
                            className="border-amber-400 text-amber-700 hover:bg-amber-50"
                            data-testid="button-recall-contract"
                            onClick={() => {
                              setContractToRecall(selectedContract);
                              setShowRecallDialog(true);
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Recall
                          </Button>
                        ) : (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setIsEditingContract(true);
                              setShowContractDetails(false);
                              setShowContractWizard(true);
                            }}
                            data-testid="button-edit-contract"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Contract
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          data-testid="button-view-document"
                          onClick={() => {
                            if (!selectedContract?.contractDocument) {
                              toast({
                                title: "No Document",
                                description: "This contract document has not been generated yet.",
                                variant: "destructive"
                              });
                              return;
                            }
                            setShowContractDocument(true);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Document
                        </Button>
                        {!isLocked && !isFullySigned && (
                          <Button 
                            variant="default"
                            onClick={() => sendForSigningMutation.mutate(selectedContract.id)}
                            disabled={sendForSigningMutation.isPending}
                            data-testid="button-send-for-signing"
                          >
                            {sendForSigningMutation.isPending ? (
                              <>
                                <Clock className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="mr-2 h-4 w-4" />
                                Send for Signing
                              </>
                            )}
                          </Button>
                        )}
                        {isLocked && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-md text-sm">
                            <Clock className="h-4 w-4" />
                            Awaiting Signature
                          </div>
                        )}
                        <Button variant="outline" onClick={() => setShowContractDetails(false)} data-testid="button-close-contract">
                          Close
                        </Button>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Document Viewer Modal */}
      <Dialog open={showContractDocument} onOpenChange={setShowContractDocument}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Document - {selectedContract?.customRoleTitle || selectedContract?.roleTitle?.title || 'Contract'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedContract?.contractDocument ? (
            <div className="space-y-4">
              {/* Contract metadata */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-secondary-50 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">Worker: </span>
                  <span className="font-medium">
                    {selectedContract.worker?.firstName} {selectedContract.worker?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Business: </span>
                  <span className="font-medium">{selectedContract.business?.name}</span>
                </div>
              </div>

              {/* Contract document content */}
              <div className="border rounded-lg p-6 bg-white max-h-[50vh] overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm leading-relaxed" data-testid="contract-document-content">
                  {selectedContract.contractDocument}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Contract - ${selectedContract.customRoleTitle || selectedContract.roleTitle?.title || 'Contract'}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
                              h1 { color: #333; }
                              .metadata { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                              .content { white-space: pre-wrap; }
                            </style>
                          </head>
                          <body>
                            <h1>${selectedContract.customRoleTitle || selectedContract.roleTitle?.title || 'Contract'}</h1>
                            <div class="metadata">
                              <p><strong>Worker:</strong> ${selectedContract.worker?.firstName} ${selectedContract.worker?.lastName}</p>
                              <p><strong>Business:</strong> ${selectedContract.business?.name}</p>
                              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>
                            <div class="content">${selectedContract.contractDocument}</div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  data-testid="button-print-document"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Print / Download
                </Button>
                <Button variant="outline" onClick={() => setShowContractDocument(false)} data-testid="button-close-document">
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-3" />
              <p>No contract document available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recall Confirmation Dialog */}
      <Dialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Recall Contract
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-secondary-600">
              Recalling this contract will cancel the signature request. The worker will need to sign again after edits are made.
            </p>
            <p className="text-sm font-medium text-secondary-800">
              Contract: {contractToRecall?.customRoleTitle || contractToRecall?.roleTitle?.title || 'Contract'} — {contractToRecall?.worker?.firstName} {contractToRecall?.worker?.lastName}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowRecallDialog(false); setContractToRecall(null); }}>
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={recallContractMutation.isPending}
                onClick={() => contractToRecall && recallContractMutation.mutate(contractToRecall.id)}
                data-testid="button-confirm-recall"
              >
                {recallContractMutation.isPending ? 'Recalling...' : 'Yes, Recall Contract'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}