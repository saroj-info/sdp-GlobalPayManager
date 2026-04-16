import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TimesheetEntryTable, type TimesheetEntryValue } from "@/components/TimesheetEntryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Clock, CheckCircle, XCircle, Calendar, User, Plus, Edit, Save, X,
  CalendarDays, DollarSign, Info, Upload, FileText, Trash2, Building2,
  LayoutGrid, List as ListIcon, ChevronDown, ChevronUp, Receipt, Search,
  Filter, Globe, X as XIcon
} from 'lucide-react';
import { useAuth } from "@/hooks/useAuth";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  calculatePeriod,
  formatPeriod,
  formatPaymentDate,
  type TimesheetPeriodConfig
} from '../../../shared/timesheetPeriodCalculator';

// ─── Schema ────────────────────────────────────────────────────────────────

const timesheetSchema = z.object({
  periodStart: z.string().min(1, "Start date is required"),
  periodEnd: z.string().min(1, "End date is required"),
  notes: z.string().optional(),
  entries: z.array(z.any()).min(1, "At least one entry is required"),
});
type TimesheetFormData = z.infer<typeof timesheetSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePeriodDates(start: string, end: string): { dates: Date[]; isCapped: boolean } {
  const dates: Date[] = [];
  let cur = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  while (cur <= endDate && count < 31) {
    dates.push(new Date(cur));
    cur = addDays(cur, 1);
    count++;
  }
  return { dates, isCapped: count >= 31 && cur <= endDate };
}

function blankEntry(date: Date): TimesheetEntryValue {
  return {
    date: format(date, 'yyyy-MM-dd'),
    hoursWorked: '', startTime: '', endTime: '', breakHours: '',
    daysWorked: '0', description: '', projectRateLineId: '', isPresent: false,
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LEFT: Record<string, string> = {
  draft: 'border-l-gray-400',
  submitted: 'border-l-blue-500',
  approved: 'border-l-green-500',
  rejected: 'border-l-red-500',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'approved') return <CheckCircle className="h-3.5 w-3.5" />;
  if (status === 'rejected') return <XCircle className="h-3.5 w-3.5" />;
  if (status === 'submitted') return <Clock className="h-3.5 w-3.5" />;
  return <Edit className="h-3.5 w-3.5" />;
}

interface ExpenseLine {
  date: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  notes: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

// ─── Main component ─────────────────────────────────────────────────────────

export default function Timesheets() {
  const [showCreateTimesheet, setShowCreateTimesheet] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<any>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [workerSelectedContractId, setWorkerSelectedContractId] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'rejected'>('all');
  const [expandedTimesheetId, setExpandedTimesheetId] = useState<string | null>(null);
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([]);
  const [showExpenses, setShowExpenses] = useState(false);
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [hostClientFilter, setHostClientFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isWorker = (user as any)?.userType === 'worker';
  const isSDP = (user as any)?.userType === 'sdp_internal';
  const isBusiness = (user as any)?.userType === 'business_user';

  usePageHeader(
    "Timesheets",
    isWorker ? "Submit and track your work hours" : "Review and approve worker timesheets"
  );

  const { data: timesheets = [], isLoading: isLoadingTimesheets } = useQuery<any[]>({
    queryKey: ['/api/timesheets'],
    enabled: isAuthenticated,
  });

  const { data: workerContracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts'],
    enabled: isAuthenticated && isWorker,
  });

  const { data: workers = [] } = useQuery<any[]>({
    queryKey: ['/api/workers'],
    enabled: isAuthenticated && (isSDP || isBusiness),
  });

  const { data: countriesList = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
    enabled: isAuthenticated && !isWorker,
  });

  const { data: selectedWorkerContracts = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts/worker', selectedWorkerId],
    enabled: Boolean(selectedWorkerId) && (isSDP || isBusiness),
  });

  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: { periodStart: '', periodEnd: '', notes: '', entries: [] },
  });

  const periodStart = form.watch('periodStart');
  const periodEnd = form.watch('periodEnd');

  useEffect(() => {
    if (periodStart && periodEnd) {
      const { dates, isCapped } = generatePeriodDates(periodStart, periodEnd);
      const currentEntries = form.getValues('entries');
      const newEntries = dates.map((d) => blankEntry(d));
      if (
        currentEntries.length !== newEntries.length ||
        currentEntries[0]?.date !== newEntries[0]?.date
      ) {
        form.setValue('entries', newEntries);
        if (isCapped) toast({ title: "Period capped at 31 days", variant: "destructive" });
      }
    }
  }, [periodStart, periodEnd]);

  // Worker's eligible timesheet contracts
  const workerTimesheetContracts = useMemo(() => {
    if (!isWorker) return [];
    return workerContracts.filter((c: any) =>
      c.requiresTimesheet && c.status === 'active' &&
      c.firstTimesheetStartDate && c.timesheetFrequency
    );
  }, [isWorker, workerContracts]);

  // Auto-select if worker has exactly one eligible contract
  useEffect(() => {
    if (isWorker && workerTimesheetContracts.length === 1 && !workerSelectedContractId) {
      setWorkerSelectedContractId(workerTimesheetContracts[0].id);
    }
  }, [isWorker, workerTimesheetContracts, workerSelectedContractId]);

  // Active contract for worker
  const activeTimesheetContract = useMemo(() => {
    if (isWorker) {
      if (workerSelectedContractId) {
        return workerTimesheetContracts.find((c: any) => c.id === workerSelectedContractId) || null;
      }
      return null;
    }
    if (selectedContractId) {
      return selectedWorkerContracts.find((c: any) => c.id === selectedContractId);
    }
    return null;
  }, [isWorker, workerTimesheetContracts, workerSelectedContractId, selectedContractId, selectedWorkerContracts]);

  // Suggested periods — filtered to exclude already-submitted ones
  const suggestedPeriods = useMemo(() => {
    if (!activeTimesheetContract?.timesheetFrequency) return [];
    const startDate = activeTimesheetContract.firstTimesheetStartDate || activeTimesheetContract.startDate;
    if (!startDate) return [];

    const config: TimesheetPeriodConfig = {
      frequency: activeTimesheetContract.timesheetFrequency,
      firstTimesheetStartDate: new Date(startDate),
      calculationMethod: activeTimesheetContract.timesheetCalculationMethod,
      paymentDay: activeTimesheetContract.paymentDay,
      paymentDaysAfterPeriod: activeTimesheetContract.paymentDaysAfterPeriod,
      paymentHolidayRule: activeTimesheetContract.paymentHolidayRule,
    };

    const existingPeriodKeys = new Set(
      (timesheets as any[])
        .filter((t) => t.status !== 'draft')
        .map((t) => `${format(new Date(t.periodStart), 'yyyy-MM-dd')}_${format(new Date(t.periodEnd), 'yyyy-MM-dd')}`)
    );

    const periods: any[] = [];
    let ref = new Date();
    for (let i = 0; i < 6 && periods.length < 3; i++) {
      try {
        const period = calculatePeriod(config, ref);
        const key = `${format(period.startDate, 'yyyy-MM-dd')}_${format(period.endDate, 'yyyy-MM-dd')}`;
        if (!existingPeriodKeys.has(key)) {
          periods.push({ ...period, key });
        }
        ref = addDays(period.endDate, 1);
      } catch {}
    }
    return periods;
  }, [activeTimesheetContract, timesheets]);

  const contractRateType = activeTimesheetContract?.rateType as 'hourly' | 'daily' | 'annual' | undefined;
  const contractRateStructure = (activeTimesheetContract?.rateStructure as 'single' | 'multiple') || 'single';

  const { data: contractRateLines = [] } = useQuery<any[]>({
    queryKey: ['/api/contracts', activeTimesheetContract?.id, 'rate-lines'],
    enabled: Boolean(activeTimesheetContract?.id) && contractRateStructure === 'multiple',
  });

  const periodDates = useMemo(() => {
    if (!periodStart || !periodEnd) return [];
    return generatePeriodDates(periodStart, periodEnd).dates;
  }, [periodStart, periodEnd]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createTimesheetMutation = useMutation({
    mutationFn: async ({ data, attachments, expenses }: { data: any; attachments: File[]; expenses: ExpenseLine[] }) => {
      const timesheet: any = await apiRequest('POST', '/api/timesheets', data).then(r => r.json());
      if (attachments.length > 0 && timesheet?.id) {
        for (const file of attachments) {
          await apiRequest('POST', `/api/timesheets/${timesheet.id}/attachments`, {
            fileName: file.name,
            fileUrl: `local://${file.name}`,
            fileSize: file.size,
            mimeType: file.type,
          });
        }
      }
      if (expenses.length > 0 && timesheet?.id) {
        for (const exp of expenses) {
          if (exp.description && exp.amount) {
            await apiRequest('POST', `/api/timesheets/${timesheet.id}/expenses`, exp).then(r => r.json());
          }
        }
      }
      return timesheet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      setShowCreateTimesheet(false);
      setSelectedWorkerId('');
      setSelectedContractId('');
      setAttachments([]);
      setExpenseLines([]);
      setShowExpenses(false);
      form.reset();
      toast({ title: "Timesheet created", description: "Timesheet saved as draft." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create timesheet.", variant: "destructive" });
    },
  });

  const submitTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PATCH', `/api/timesheets/${id}/submit`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      toast({ title: "Submitted", description: "Timesheet submitted for approval." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit.", variant: "destructive" });
    },
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PATCH', `/api/timesheets/${id}/status`, { status: 'approved' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      toast({ title: "Approved", description: "Timesheet approved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const reason = prompt('Reason for rejection:');
      if (!reason) throw new Error('Rejection reason required');
      const res = await apiRequest('PATCH', `/api/timesheets/${id}/status`, { status: 'rejected', rejectionReason: reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      toast({ title: "Rejected", description: "Timesheet rejected." });
    },
    onError: (error: any) => {
      if (error.message !== 'Rejection reason required') {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const deleteTimesheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/timesheets/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      toast({ title: "Deleted", description: "Timesheet deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ── Submit handler ─────────────────────────────────────────────────────────

  const usePeriod = (period: any) => {
    const start = format(period.startDate, 'yyyy-MM-dd');
    const end = format(period.endDate, 'yyyy-MM-dd');
    form.setValue('periodStart', start);
    form.setValue('periodEnd', end);
    const { dates } = generatePeriodDates(start, end);
    form.setValue('entries', dates.map(blankEntry));
    toast({ title: "Period selected", description: formatPeriod(period) });
  };

  const onSubmit = async (data: TimesheetFormData) => {
    const rateType = contractRateType || 'hourly';
    const normalizedEntries = (data.entries as any[])
      .map((entry) => {
        if (rateType === 'hourly') {
          const h = parseFloat(entry.hoursWorked || '0');
          return {
            date: entry.date,
            hoursWorked: h > 0 ? h : null,
            daysWorked: null,
            startTime: entry.startTime || null,
            endTime: entry.endTime || null,
            breakHours: entry.breakHours ? parseFloat(entry.breakHours) : null,
            description: entry.description || null,
            projectRateLineId: entry.projectRateLineId || null,
          };
        } else if (rateType === 'daily') {
          const d = parseFloat(entry.daysWorked || '0');
          return {
            date: entry.date,
            daysWorked: d > 0 ? d : null,
            hoursWorked: null,
            startTime: null, endTime: null, breakHours: null,
            description: entry.description || null,
            projectRateLineId: entry.projectRateLineId || null,
          };
        } else {
          return {
            date: entry.date,
            isPresent: entry.isPresent || false,
            hoursWorked: null, daysWorked: null,
            startTime: null, endTime: null, breakHours: null,
            description: entry.description || null,
          };
        }
      })
      .filter((e) => {
        if (rateType === 'hourly') return e.hoursWorked && e.hoursWorked > 0;
        if (rateType === 'daily') return e.daysWorked && e.daysWorked > 0;
        return e.isPresent;
      });

    if (normalizedEntries.length === 0) {
      toast({
        title: "No entries",
        description: rateType === 'annual' ? "Mark at least one day as present." : "Log at least one entry with hours/days.",
        variant: "destructive",
      });
      return;
    }

    const processedData: any = { ...data, entries: normalizedEntries };
    if (!isWorker && selectedContractId && selectedWorkerId) {
      processedData.contractId = selectedContractId;
      processedData.workerId = selectedWorkerId;
      const w = workers.find((w: any) => w.id === selectedWorkerId);
      if (w) processedData.businessId = w.businessId;
    }

    createTimesheetMutation.mutate({ data: processedData, attachments, expenses: expenseLines });
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const ownTimesheets = (timesheets as any[]).filter((t) => !t.isProvided);
  const providedTimesheets = (timesheets as any[]).filter((t) => t.isProvided);

  // Derive unique filter option values from all own timesheets
  const filterOptions = useMemo(() => {
    const countries = new Map<string, string>();
    const hostClients = new Set<string>();
    const businesses = new Map<string, string>();

    ownTimesheets.forEach((t) => {
      if (t.countryId && t.countryName) countries.set(t.countryId, t.countryName);
      if (t.customerBusinessName) hostClients.add(t.customerBusinessName);
      if (t.business?.name) businesses.set(t.business.id || t.businessId, t.business.name);
    });

    return {
      countries: Array.from(countries.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      hostClients: Array.from(hostClients).sort(),
      businesses: Array.from(businesses.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [ownTimesheets]);

  const activeFilterCount = [searchQuery, countryFilter, hostClientFilter, businessFilter].filter(Boolean).length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 };
    ownTimesheets.forEach((t) => {
      counts.all++;
      if (counts[t.status] !== undefined) counts[t.status]++;
    });
    return counts;
  }, [ownTimesheets]);

  const filteredTimesheets = useMemo(() => {
    let result = statusFilter === 'all' ? ownTimesheets : ownTimesheets.filter((t) => t.status === statusFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        const workerName = `${t.worker?.firstName ?? ''} ${t.worker?.lastName ?? ''}`.toLowerCase();
        return workerName.includes(q);
      });
    }

    if (countryFilter) {
      result = result.filter((t) => t.countryId === countryFilter || t.countryName === countryFilter);
    }

    if (hostClientFilter) {
      result = result.filter((t) => t.customerBusinessName === hostClientFilter);
    }

    if (businessFilter && isSDP) {
      result = result.filter((t) => t.business?.name === businessFilter || t.businessId === businessFilter);
    }

    return result;
  }, [ownTimesheets, statusFilter, searchQuery, countryFilter, hostClientFilter, businessFilter, isSDP]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setCountryFilter('');
    setHostClientFilter('');
    setBusinessFilter('');
  };

  const addExpenseLine = () => {
    const defaultDate = periodStart || format(new Date(), 'yyyy-MM-dd');
    setExpenseLines([...expenseLines, { date: defaultDate, category: 'other', description: '', amount: '', currency: activeTimesheetContract?.currency || 'AUD', notes: '' }]);
  };

  const updateExpenseLine = (idx: number, patch: Partial<ExpenseLine>) => {
    setExpenseLines(expenseLines.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const removeExpenseLine = (idx: number) => {
    setExpenseLines(expenseLines.filter((_, i) => i !== idx));
  };

  const totalExpenses = expenseLines.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading || isLoadingTimesheets) {
    return <div className="p-6 text-center py-16 text-muted-foreground">Loading timesheets...</div>;
  }

  // ── Shared create form content (used in both dialogs) ─────────────────────

  const CreateFormContent = () => (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
          }
        }}
        className="space-y-5"
      >
        {/* Period */}
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="periodStart" render={({ field }) => (
            <FormItem>
              <FormLabel>Period Start</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="periodEnd" render={({ field }) => (
            <FormItem>
              <FormLabel>Period End</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Entry Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Time Entries</h3>
          <TimesheetEntryTable
            rateType={contractRateType || 'hourly'}
            rateStructure={contractRateStructure}
            rateLines={contractRateLines}
            periodDates={periodDates}
            entries={form.watch('entries') as TimesheetEntryValue[]}
            onChange={(entries) => form.setValue('entries', entries)}
            currency={activeTimesheetContract?.currency}
          />
        </div>

        {/* Expenses */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowExpenses(!showExpenses)}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Reimbursable Expenses
                {expenseLines.length > 0 && (
                  <span className="ml-2 text-amber-600">({expenseLines.length} item{expenseLines.length !== 1 ? 's' : ''} · {activeTimesheetContract?.currency || 'AUD'} {totalExpenses.toFixed(2)})</span>
                )}
              </span>
            </div>
            {showExpenses ? <ChevronUp className="h-4 w-4 text-amber-600" /> : <ChevronDown className="h-4 w-4 text-amber-600" />}
          </button>

          {showExpenses && (
            <div className="p-4 space-y-3 bg-white">
              {expenseLines.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No expenses added yet. Click below to add one.</p>
              ) : (
                <div className="space-y-2">
                  {expenseLines.map((exp, idx) => (
                    <div key={idx} className="grid grid-cols-[100px_130px_1fr_90px_auto] gap-2 items-center">
                      <Input
                        type="date"
                        value={exp.date}
                        onChange={(e) => updateExpenseLine(idx, { date: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <Select value={exp.category} onValueChange={(v) => updateExpenseLine(idx, { category: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Description *"
                        value={exp.description}
                        onChange={(e) => updateExpenseLine(idx, { description: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Amount"
                        value={exp.amount}
                        onChange={(e) => updateExpenseLine(idx, { amount: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => removeExpenseLine(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {expenseLines.length > 0 && (
                    <div className="flex justify-end pt-1 border-t text-xs font-medium text-amber-700">
                      Total: {activeTimesheetContract?.currency || 'AUD'} {totalExpenses.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addExpenseLine} className="text-xs">
                <Plus className="h-3 w-3 mr-1" />Add Expense
              </Button>
            </div>
          )}
        </div>

        {/* Notes */}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Additional notes about this timesheet..." {...field} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setShowCreateTimesheet(false)}>Cancel</Button>
          <Button type="submit" disabled={createTimesheetMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createTimesheetMutation.isPending ? 'Saving...' : 'Save as Draft'}
          </Button>
        </div>
      </form>
    </Form>
  );

  // ── Timesheet Card (grid mode) ─────────────────────────────────────────────

  const TimesheetCard = ({ timesheet, provided = false }: { timesheet: any; provided?: boolean }) => {
    const expanded = expandedTimesheetId === timesheet.id;
    const s = timesheet.status;
    const pStart = new Date(timesheet.periodStart).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    const pEnd = new Date(timesheet.periodEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
      <Card className={`border-l-4 ${STATUS_LEFT[s] || 'border-l-gray-300'} ${provided ? 'bg-blue-50/30' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {isWorker ? `${pStart} – ${pEnd}` : `${timesheet.worker?.firstName} ${timesheet.worker?.lastName}`}
              </CardTitle>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {!isWorker && (
                  <span className="text-xs text-muted-foreground">{pStart} – {pEnd}</span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timesheet.totalHours || 0}h
                </span>
                {!isWorker && timesheet.business?.name && (
                  <span className="text-xs text-muted-foreground">{timesheet.business.name}</span>
                )}
                {provided && timesheet.providedByBusinessName && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />via {timesheet.providedByBusinessName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-xs border ${STATUS_COLORS[s] || STATUS_COLORS.draft} flex items-center gap-1`}>
                <StatusIcon status={s} />
                <span className="capitalize">{s}</span>
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setExpandedTimesheetId(expanded ? null : timesheet.id)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 space-y-4">
            {/* Entries summary */}
            {timesheet.entries && timesheet.entries.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Time Entries ({timesheet.entries.length})
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {timesheet.entries.map((entry: any, i: number) => (
                    <div key={entry.id || i} className="flex justify-between items-center py-1 px-2 bg-muted/40 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-muted-foreground w-20">
                          {new Date(entry.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        {entry.description && <span className="text-xs text-muted-foreground truncate max-w-32">{entry.description}</span>}
                      </div>
                      <span className="text-xs font-medium text-foreground ml-2">
                        {entry.hoursWorked ? `${entry.hoursWorked}h` : entry.daysWorked ? `${entry.daysWorked}d` : entry.isPresent ? 'Present' : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses summary */}
            <TimesheetExpensesView timesheetId={timesheet.id} />

            {/* Notes */}
            {timesheet.notes && (
              <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded border border-blue-100">
                <span className="font-medium text-blue-700">Notes: </span>{timesheet.notes}
              </div>
            )}

            {/* Rejection reason */}
            {s === 'rejected' && timesheet.rejectionReason && (
              <div className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                <span className="font-medium">Rejection reason: </span>{timesheet.rejectionReason}
              </div>
            )}

            {/* Timestamps */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              {timesheet.submittedAt && <span>Submitted: {new Date(timesheet.submittedAt).toLocaleDateString()}</span>}
              {timesheet.approvedAt && <span>Approved: {new Date(timesheet.approvedAt).toLocaleDateString()}</span>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1 border-t">
              {isWorker && s === 'draft' && (
                <>
                  <Button size="sm" onClick={() => submitTimesheetMutation.mutate(timesheet.id)} disabled={submitTimesheetMutation.isPending}>
                    {submitTimesheetMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                </>
              )}
              {!isWorker && s === 'submitted' && !provided && (
                <>
                  <Button size="sm" onClick={() => approveTimesheetMutation.mutate(timesheet.id)} disabled={approveTimesheetMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-1" />{approveTimesheetMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectTimesheetMutation.mutate(timesheet.id)} disabled={rejectTimesheetMutation.isPending} className="border-red-200 text-red-600 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-1" />{rejectTimesheetMutation.isPending ? 'Rejecting...' : 'Reject'}
                  </Button>
                </>
              )}
              {provided && s === 'submitted' && (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700"
                    onClick={() => fetch(`/api/timesheets/${timesheet.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) }).then(() => queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] }))}>
                    <CheckCircle className="h-4 w-4 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => fetch(`/api/timesheets/${timesheet.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) }).then(() => queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] }))}>
                    <XCircle className="h-4 w-4 mr-1" />Reject
                  </Button>
                </>
              )}
              {isSDP && s === 'draft' && (
                <>
                  <Button size="sm" onClick={() => submitTimesheetMutation.mutate(timesheet.id)} disabled={submitTimesheetMutation.isPending}>
                    {submitTimesheetMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteTimesheetMutation.mutate(timesheet.id)} disabled={deleteTimesheetMutation.isPending}>
                    <Trash2 className="h-4 w-4 mr-1" />{deleteTimesheetMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // ── List row (list mode) ───────────────────────────────────────────────────

  const TimesheetRow = ({ timesheet }: { timesheet: any }) => {
    const s = timesheet.status;
    const pStart = new Date(timesheet.periodStart).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    const pEnd = new Date(timesheet.periodEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
      <div className={`flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/30 transition-colors ${STATUS_LEFT[s] ? `border-l-4 ${STATUS_LEFT[s]}` : ''}`}>
        <div className="flex-1 min-w-0">
          {!isWorker && <span className="text-sm font-medium">{timesheet.worker?.firstName} {timesheet.worker?.lastName} · </span>}
          <span className="text-sm text-muted-foreground">{pStart} – {pEnd}</span>
        </div>
        <div className="text-sm text-muted-foreground w-20 text-right">{timesheet.totalHours || 0}h</div>
        {!isWorker && <div className="text-xs text-muted-foreground w-32 truncate">{timesheet.business?.name}</div>}
        <Badge className={`text-xs border ${STATUS_COLORS[s] || STATUS_COLORS.draft} flex items-center gap-1 w-24 justify-center`}>
          <StatusIcon status={s} />
          <span className="capitalize">{s}</span>
        </Badge>
        <div className="flex gap-1">
          {isWorker && s === 'draft' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => submitTimesheetMutation.mutate(timesheet.id)} disabled={submitTimesheetMutation.isPending}>
              Submit
            </Button>
          )}
          {!isWorker && s === 'submitted' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => approveTimesheetMutation.mutate(timesheet.id)} disabled={approveTimesheetMutation.isPending}>Approve</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => rejectTimesheetMutation.mutate(timesheet.id)} disabled={rejectTimesheetMutation.isPending}>Reject</Button>
            </>
          )}
          {isSDP && s === 'draft' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => deleteTimesheetMutation.mutate(timesheet.id)} disabled={deleteTimesheetMutation.isPending}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Contract selector for workers with multiple contracts */}
        {isWorker && workerTimesheetContracts.length > 1 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <FileText className="w-4 h-4" />
                  Select Contract
                </div>
                <Select value={workerSelectedContractId} onValueChange={setWorkerSelectedContractId}>
                  <SelectTrigger className="w-[400px]">
                    <SelectValue placeholder="Choose a contract..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workerTimesheetContracts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.customRoleTitle || c.employmentType} · {c.country?.name || c.countryId} · {c.rateType} · {c.startDate ? format(new Date(c.startDate), 'MMM yyyy') : 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No eligible contracts */}
        {isWorker && workerTimesheetContracts.length === 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="py-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900">No Active Timesheet Contract</h3>
                <p className="text-sm text-yellow-700 mt-1">You don't have an active contract requiring timesheets. Contact SDP if this is an error.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment schedule for workers */}
        {isWorker && activeTimesheetContract && (
          <Card className="bg-primary-50 border-primary-200">
            <CardHeader>
              <CardTitle className="flex items-center text-primary-900 text-base">
                <CalendarDays className="w-5 h-5 mr-2" />
                Timesheet & Payment Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-primary-600 font-medium">Frequency</div>
                  <div className="font-semibold text-primary-900 capitalize">{activeTimesheetContract.timesheetFrequency}</div>
                </div>
                {activeTimesheetContract.paymentDay && (
                  <div>
                    <div className="text-xs text-primary-600 font-medium">Payment Day</div>
                    <div className="font-semibold text-primary-900">{activeTimesheetContract.paymentDay}s</div>
                  </div>
                )}
                {activeTimesheetContract.paymentDaysAfterPeriod !== null && (
                  <div>
                    <div className="text-xs text-primary-600 font-medium">Payment Timing</div>
                    <div className="font-semibold text-primary-900">{activeTimesheetContract.paymentDaysAfterPeriod} days after period</div>
                  </div>
                )}
                {activeTimesheetContract.paymentHolidayRule && (
                  <div>
                    <div className="text-xs text-primary-600 font-medium">Holiday Rule</div>
                    <div className="text-sm text-primary-800">Prior working day</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No active contract notice — shown when worker has contracts but hasn't selected one */}
        {isWorker && workerTimesheetContracts.length > 0 && !activeTimesheetContract && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="py-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900">Select a Contract</h3>
                <p className="text-sm text-yellow-700 mt-1">Please select a contract above to view timesheet schedule and submit timesheets.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top bar: Create button + view/filter controls */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter tabs */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                {(['all', 'draft', 'submitted', 'approved', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    {statusCounts[s] > 0 && (
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${statusFilter === s ? 'bg-white/20' : 'bg-muted'}`}>
                        {statusCounts[s]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-7 px-2" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 px-2" onClick={() => setViewMode('list')}>
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Search + Filter toggle (non-worker only) */}
              {!isWorker && (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search worker name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 w-52 text-sm"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant={showFilters ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${showFilters ? 'bg-white/20' : 'bg-primary text-white'}`}>
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </>
              )}
            </div>

          {/* Create button */}
          {isWorker && activeTimesheetContract && (
            <Dialog open={showCreateTimesheet} onOpenChange={setShowCreateTimesheet}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-timesheet">
                  <Plus className="mr-2 h-4 w-4" />New Timesheet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Timesheet</DialogTitle>
                  <DialogDescription>Select a suggested period or enter dates manually, then log your time entries below.</DialogDescription>
                </DialogHeader>

                {suggestedPeriods.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested Periods</p>
                    <div className="grid gap-2">
                      {suggestedPeriods.map((period, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <CalendarDays className="h-4 w-4 text-primary" />
                              {formatPeriod(period)}
                            </div>
                            {period.paymentDate && (
                              <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                <DollarSign className="h-3 w-3" />Payment: {formatPaymentDate(period.paymentDate)}
                              </div>
                            )}
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={() => usePeriod(period)}>Use This Period</Button>
                        </div>
                      ))}
                    </div>
                    {timesheets.some((t: any) => t.status !== 'draft') && (
                      <p className="text-xs text-muted-foreground">Already-submitted periods are hidden from suggestions.</p>
                    )}
                  </div>
                )}

                <CreateFormContent />
              </DialogContent>
            </Dialog>
          )}

          {(isSDP || isBusiness) && (
            <Dialog open={showCreateTimesheet} onOpenChange={(open) => {
              setShowCreateTimesheet(open);
              if (!open) { setSelectedWorkerId(''); setSelectedContractId(''); setAttachments([]); setExpenseLines([]); setShowExpenses(false); }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-timesheet-sdp">
                  <Plus className="mr-2 h-4 w-4" />Create Timesheet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Timesheet on Behalf of Worker</DialogTitle>
                  <DialogDescription>Select a worker and contract, then enter timesheet details.</DialogDescription>
                </DialogHeader>

                {/* Worker + contract selectors */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Worker</label>
                    <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                      <SelectTrigger><SelectValue placeholder="Choose a worker..." /></SelectTrigger>
                      <SelectContent>
                        {workers.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>{w.firstName} {w.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedWorkerId && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Contract</label>
                      <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                        <SelectTrigger><SelectValue placeholder="Choose a contract..." /></SelectTrigger>
                        <SelectContent>
                          {selectedWorkerContracts.filter((c: any) => c.requiresTimesheet).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.country?.name} · {c.rateType} · {c.startDate ? format(new Date(c.startDate), 'MMM yyyy') : 'N/A'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {selectedWorkerId && selectedContractId && activeTimesheetContract && (
                  <>
                    {suggestedPeriods.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested Periods</p>
                        <div className="grid gap-2">
                          {suggestedPeriods.map((period, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition-colors">
                              <div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <CalendarDays className="h-4 w-4 text-primary" />
                                  {formatPeriod(period)}
                                </div>
                                {period.paymentDate && (
                                  <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                    <DollarSign className="h-3 w-3" />Payment: {formatPaymentDate(period.paymentDate)}
                                  </div>
                                )}
                              </div>
                              <Button type="button" size="sm" variant="outline" onClick={() => usePeriod(period)}>Use This Period</Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <CreateFormContent />
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}
          </div>

          {/* Expandable filter panel */}
          {!isWorker && showFilters && (
            <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/30 border rounded-lg">
              {/* Country filter */}
              {filterOptions.countries.length > 0 && (
                <div className="space-y-1 min-w-[180px]">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />Country
                  </label>
                  <Select value={countryFilter || '__all__'} onValueChange={(v) => setCountryFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All countries</SelectItem>
                      {filterOptions.countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Host client filter */}
              {filterOptions.hostClients.length > 0 && (
                <div className="space-y-1 min-w-[180px]">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />Host Client
                  </label>
                  <Select value={hostClientFilter || '__all__'} onValueChange={(v) => setHostClientFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All host clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All host clients</SelectItem>
                      {filterOptions.hostClients.map((hc) => (
                        <SelectItem key={hc} value={hc}>{hc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Business filter (SDP only) */}
              {isSDP && filterOptions.businesses.length > 0 && (
                <div className="space-y-1 min-w-[180px]">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />Business
                  </label>
                  <Select value={businessFilter || '__all__'} onValueChange={(v) => setBusinessFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All businesses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All businesses</SelectItem>
                      {filterOptions.businesses.map((b) => (
                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Clear filters button */}
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearAllFilters}>
                  <XIcon className="h-3.5 w-3.5 mr-1" />Clear all
                </Button>
              )}

              {/* Empty state when no filter options yet */}
              {filterOptions.countries.length === 0 && filterOptions.hostClients.length === 0 && filterOptions.businesses.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-1">No filter options available — filters will appear once timesheets are loaded.</p>
              )}
            </div>
          )}

          {/* Active filter pills summary */}
          {!isWorker && !showFilters && activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">Filtered by:</span>
              {countryFilter && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Globe className="h-3 w-3" />
                  {filterOptions.countries.find(c => c.id === countryFilter)?.name || countryFilter}
                  <button onClick={() => setCountryFilter('')}><XIcon className="h-3 w-3" /></button>
                </span>
              )}
              {hostClientFilter && (
                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <Building2 className="h-3 w-3" />{hostClientFilter}
                  <button onClick={() => setHostClientFilter('')}><XIcon className="h-3 w-3" /></button>
                </span>
              )}
              {businessFilter && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Building2 className="h-3 w-3" />{businessFilter}
                  <button onClick={() => setBusinessFilter('')}><XIcon className="h-3 w-3" /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground underline hover:text-foreground">Clear all</button>
            </div>
          )}
        </div>

        {/* Timesheet list */}
        {filteredTimesheets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-medium text-foreground mb-1">
                {statusFilter === 'all'
                  ? isWorker ? "No timesheets yet" : "No timesheets submitted"
                  : `No ${statusFilter} timesheets`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'all' && isWorker ? "Create your first timesheet to start tracking your work hours." : ""}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="overflow-hidden">
            {/* List header */}
            <div className={`flex items-center gap-3 px-4 py-2 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide`}>
              <div className="flex-1">Period{!isWorker && ' / Worker'}</div>
              <div className="w-20 text-right">Hours</div>
              {!isWorker && <div className="w-32">Business</div>}
              <div className="w-24 text-center">Status</div>
              <div className="w-28 text-right">Actions</div>
            </div>
            {filteredTimesheets.map((t: any) => <TimesheetRow key={t.id} timesheet={t} />)}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTimesheets.map((t: any) => <TimesheetCard key={t.id} timesheet={t} />)}
          </div>
        )}

        {/* Provided timesheets section for business host clients */}
        {isBusiness && providedTimesheets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pt-2 border-t">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Workers Provided to You</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Timesheets from workers placed at your organisation by a business partner. Approve to confirm hours worked at your site.
            </p>
            {providedTimesheets.map((t: any) => <TimesheetCard key={`provided-${t.id}`} timesheet={t} provided />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Expenses viewer (shown in expanded card) ──────────────────────────────────

function TimesheetExpensesView({ timesheetId }: { timesheetId: string }) {
  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/timesheets', timesheetId, 'expenses'],
    queryFn: async () => {
      const res = await fetch(`/api/timesheets/${timesheetId}/expenses`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  if (isLoading || expenses.length === 0) return null;

  const total = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || '0'), 0);

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
        <Receipt className="h-3.5 w-3.5 text-amber-600" />
        Expenses ({expenses.length})
      </h4>
      <div className="space-y-1">
        {expenses.map((e: any) => (
          <div key={e.id} className="flex justify-between items-center py-1 px-2 bg-amber-50 rounded text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20">
                {new Date(e.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">{e.category}</Badge>
              <span className="text-foreground">{e.description}</span>
            </div>
            <span className="font-medium text-amber-700">{e.currency} {parseFloat(e.amount).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-end pt-1 border-t border-amber-100 text-xs font-semibold text-amber-700">
          Total: {expenses[0]?.currency || 'AUD'} {total.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
