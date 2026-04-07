import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { calculatePeriod } from '@shared/timesheetPeriodCalculator';
import type { TimesheetPeriodConfig } from '@shared/timesheetPeriodCalculator';
import { calculateFirstTimesheetStartDate } from '@shared/contractHelpers';
import { HelpCircle, InfoIcon, Building2, DollarSign, CheckCircle, FileText, Clock, Plus, Trash2, Search, LayoutGrid, List as ListIcon, UserCheck, UserX, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface ContractWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: any[];
  countries: any[];
  editMode?: boolean;
  existingContract?: any;
  preselectedWorkerId?: string;
}

export function ContractWizardModal({ open, onOpenChange, workers, countries, editMode = false, existingContract = null, preselectedWorkerId }: ContractWizardModalProps) {
  const [step, setStep] = useState(1);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerViewMode, setWorkerViewMode] = useState<'list' | 'card'>('list');
  const [showPeriodPreview, setShowPeriodPreview] = useState(false);
  const [showMultipleRates, setShowMultipleRates] = useState(false);
  const [projectRateLines, setProjectRateLines] = useState<any[]>([]);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [purchaseOrderLines, setPurchaseOrderLines] = useState<any[]>([]);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Check if user is SDP Internal for on-behalf functionality
  const isSDPInternal = (user as any)?.userType === 'sdp_internal';

  // Fetch host clients for customer work selection
  const { data: hostClients = [], isLoading: hostClientsLoading, refetch: refetchHostClients } = useQuery<any[]>({
    queryKey: ['/api/businesses/host-clients'],
    enabled: open,
  });

  // Fetch all businesses (for SDP users who need to see registered businesses too)
  const { data: businesses = [], isLoading: businessesLoading } = useQuery<any[]>({
    queryKey: ['/api/businesses'],
    enabled: open,
  });

  // Build customer business options for the dropdown
  const customerBusinessOptions = useMemo(() => {
    if (isSDPInternal) {
      const registered = (businesses || [])
        .filter((b: any) => b.isRegistered !== false)
        .map((b: any) => ({
          ...b,
          label: b.name,
          isHostClient: false,
          group: 'Registered Businesses',
        }));
      const unregistered = (businesses || [])
        .filter((b: any) => b.isRegistered === false)
        .map((b: any) => ({
          ...b,
          label: `${b.name} (Host Client)`,
          isHostClient: true,
          group: 'Host Clients',
        }));
      return [...unregistered, ...registered];
    }
    return (hostClients || []).map((b: any) => ({
      ...b,
      label: b.name,
      isHostClient: true,
      group: 'Host Clients',
    }));
  }, [businesses, hostClients, isSDPInternal]);

  // State for creating new host client inline
  const [showCreateHostClient, setShowCreateHostClient] = useState(false);
  const [newHostClientName, setNewHostClientName] = useState('');
  const [newHostClientEmail, setNewHostClientEmail] = useState('');
  const [newHostClientContact, setNewHostClientContact] = useState('');

  const createHostClientMutation = useMutation({
    mutationFn: async (data: { name: string; contactEmail?: string; contactName?: string; parentBusinessId?: string }) => {
      const response = await apiRequest("POST", "/api/businesses/host-clients", data);
      return await response.json();
    },
    onSuccess: (newClient: any) => {
      toast({
        title: "Host Client Created",
        description: `${newClient.name} has been added as a host client.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses/host-clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses'] });
      setFormData({
        ...formData,
        customerBusinessId: newClient.id,
        clientName: newClient.name,
        clientContactEmail: newClient.contactEmail || '',
      });
      setShowCreateHostClient(false);
      setNewHostClientName('');
      setNewHostClientEmail('');
      setNewHostClientContact('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create host client",
        variant: "destructive",
      });
    },
  });
  
  // Initialize form data with existing contract when in edit mode
  const getInitialFormData = () => {
    if (editMode && existingContract) {
      return {
        workerId: existingContract.workerId || '',
        countryId: existingContract.countryId || '',
        employmentType: existingContract.employmentType || 'contractor',
        roleTitleId: existingContract.roleTitleId || '',
        customRoleTitle: existingContract.customRoleTitle || '',
        roleDescription: existingContract.jobDescription || '',
        templateId: existingContract.templateId || '',
        contractorCompliance: existingContract.contractorCompliance || false,
        startDate: existingContract.startDate ? existingContract.startDate.split('T')[0] : '',
        endDate: existingContract.endDate ? existingContract.endDate.split('T')[0] : '',
        rateType: existingContract.rateType || 'annual',
        rate: existingContract.rate?.toString() || '',
        currency: existingContract.currency || 'USD',
        requiresTimesheet: existingContract.requiresTimesheet || false,
        timesheetFrequency: existingContract.timesheetFrequency || 'weekly',
        timesheetCalculationMethod: existingContract.timesheetCalculationMethod || '',
        paymentScheduleType: existingContract.paymentScheduleType || 'days_after',
        paymentDay: existingContract.paymentDay || '',
        paymentDaysAfterPeriod: existingContract.paymentDaysAfterPeriod || 3,
        paymentHolidayRule: existingContract.paymentHolidayRule !== undefined ? existingContract.paymentHolidayRule : true,
        noticePeriodDays: existingContract.noticePeriodDays || 30,
        remunerationLines: existingContract.remunerationLines || [{ type: 'base_salary', description: 'Base Salary', amount: '', frequency: 'annual' }],
        // Client details
        isForClient: existingContract.isForClient || false,
        clientName: existingContract.clientName || '',
        clientAddress: existingContract.clientAddress || '',
        clientCity: existingContract.clientCity || '',
        clientCountry: existingContract.clientCountry || '',
        clientContactEmail: existingContract.clientContactEmail || '',
        clientContactPhone: existingContract.clientContactPhone || '',
        // Customer invoicing
        billingMode: (existingContract as any).billingMode || (existingContract.invoiceCustomer ? 'invoice_through_platform' : 'invoice_separately'),
        invoiceCustomer: existingContract.invoiceCustomer || false,
        customerBusinessId: existingContract.customerBusinessId || '',
        customerBillingRate: existingContract.customerBillingRate?.toString() || '',
        customerBillingRateType: existingContract.customerBillingRateType || 'hourly',
        customerCurrency: existingContract.customerCurrency || 'USD',
        invoicingFrequency: existingContract.invoicingFrequency || 'monthly',
        paymentTerms: existingContract.paymentTerms || '30',
        // 3rd party vendor
        thirdPartyBusinessId: existingContract.thirdPartyBusinessId || '',
        // Pay rate structure
        rateStructure: (existingContract as any).rateStructure || 'single',
        totalPackageValue: (existingContract as any).totalPackageValue?.toString() || '',
        // Client billing type
        clientBillingType: (existingContract as any).clientBillingType || 'rate_based',
        fixedBillingAmount: (existingContract as any).fixedBillingAmount?.toString() || '',
        fixedBillingFrequency: (existingContract as any).fixedBillingFrequency || 'monthly',
        // On-behalf fields for SDP Internal users
        onBehalf: existingContract.onBehalf || false,
        selectedBusinessId: existingContract.selectedBusinessId || '',
        // SDP Entity
        sdpEntityId: existingContract.sdpEntityId || '',
      };
    }
    return {
      workerId: preselectedWorkerId || '',
      countryId: '',
      employmentType: 'contractor',
      roleTitleId: '',
      customRoleTitle: '',
      roleDescription: '',
      templateId: '',
      contractorCompliance: false,
      startDate: '',
      endDate: '',
      rateType: 'annual',
      rate: '',
      currency: 'USD',
      requiresTimesheet: false,
      timesheetFrequency: 'weekly',
      timesheetCalculationMethod: '',
      paymentScheduleType: 'days_after',
      paymentDay: '',
      paymentDaysAfterPeriod: 3,
      paymentHolidayRule: true,
      noticePeriodDays: 30,
      remunerationLines: [{ type: 'base_salary', description: 'Base Salary', amount: '', frequency: 'annual' }],
      // Client details
      isForClient: false,
      clientName: '',
      clientAddress: '',
      clientCity: '',
      clientCountry: '',
      clientContactEmail: '',
      clientContactPhone: '',
      // Customer invoicing
      billingMode: 'invoice_separately' as string,
      invoiceCustomer: false,
      customerBusinessId: '',
      customerBillingRate: '',
      customerBillingRateType: 'hourly',
      customerCurrency: 'USD',
      invoicingFrequency: 'monthly',
      paymentTerms: '30',
      // 3rd party vendor
      thirdPartyBusinessId: '',
      // Pay rate structure
      rateStructure: 'single' as string, // 'single' | 'multiple'
      totalPackageValue: '', // for Fixed Salary contracts
      // Client billing type
      clientBillingType: 'rate_based' as string, // 'rate_based' | 'fixed_price'
      fixedBillingAmount: '',
      fixedBillingFrequency: 'monthly' as string,
      // On-behalf fields for SDP Internal users
      onBehalf: false,
      selectedBusinessId: '',
      // SDP Entity
      sdpEntityId: '',
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData);

  // Refs to track previous country and employment type for template clearing logic
  const prevCountryRef = useRef(formData.countryId);
  const prevEmploymentTypeRef = useRef(formData.employmentType);

  // Update form data when edit mode changes
  useEffect(() => {
    if (editMode && existingContract) {
      setFormData(getInitialFormData());
    } else if (!editMode) {
      setFormData(getInitialFormData());
    }
  }, [editMode, existingContract]);

  // Reset template selection when country or employment type actually changes
  useEffect(() => {
    const countryChanged = formData.countryId !== prevCountryRef.current;
    const employmentTypeChanged = formData.employmentType !== prevEmploymentTypeRef.current;
    
    if ((countryChanged || employmentTypeChanged) && formData.templateId) {
      setFormData(prev => ({ ...prev, templateId: '' }));
    }
    
    prevCountryRef.current = formData.countryId;
    prevEmploymentTypeRef.current = formData.employmentType;
  }, [formData.countryId, formData.employmentType, formData.templateId]);

  // Auto-set semi-monthly calculation method to 1st_15th
  useEffect(() => {
    if (formData.timesheetFrequency === 'semi_monthly' && formData.timesheetCalculationMethod !== '1st_15th') {
      setFormData(prev => ({ ...prev, timesheetCalculationMethod: '1st_15th' }));
    }
  }, [formData.timesheetFrequency]);

  // Filter and search workers
  const filteredWorkers = useMemo(() => {
    let filtered = workers.filter((worker: any) => worker.id && worker.id.trim() !== '');
    
    // Filter by business if SDP user is creating on behalf
    if (isSDPInternal && formData.onBehalf && formData.selectedBusinessId) {
      filtered = filtered.filter((worker: any) => worker.businessId === formData.selectedBusinessId);
    }
    
    // Filter by search term
    if (workerSearch.trim()) {
      const searchLower = workerSearch.toLowerCase();
      filtered = filtered.filter((worker: any) => 
        worker.firstName?.toLowerCase().includes(searchLower) ||
        worker.lastName?.toLowerCase().includes(searchLower) ||
        worker.email?.toLowerCase().includes(searchLower) ||
        worker.country?.name?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [workers, formData.onBehalf, formData.selectedBusinessId, workerSearch, isSDPInternal]);

  // Sort countries alphabetically
  const sortedCountries = useMemo(() => {
    return [...countries]
      .filter((country: any) => country.id && country.id.trim() !== '')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  // Track the selected worker's type to avoid unnecessary resets
  const selectedWorkerType = useMemo(() => {
    if (!formData.workerId) return null;
    return workers.find(w => w.id === formData.workerId)?.workerType || null;
  }, [formData.workerId, workers]);

  // Reset employment type if it's no longer valid for the selected worker
  useEffect(() => {
    if (!formData.workerId || !selectedWorkerType) return;

    if (selectedWorkerType === 'third_party_worker') {
      if (formData.employmentType !== 'third_party_worker') {
        setFormData(prev => ({ ...prev, employmentType: 'third_party_worker' }));
      }
    } else if (selectedWorkerType === 'contractor') {
      const contractorTypes = ['contractor', 'gig_worker'];
      if (!contractorTypes.includes(formData.employmentType)) {
        setFormData(prev => ({ ...prev, employmentType: 'contractor' }));
      }
    } else if (selectedWorkerType === 'employee') {
      const employeeTypes = ['permanent', 'fixed_term', 'casual', 'zero_hours', 'at_will', 'on_call', 'seasonal', 'part_time'];
      if (!employeeTypes.includes(formData.employmentType)) {
        setFormData(prev => ({ ...prev, employmentType: 'permanent' }));
      }
    }
  }, [formData.workerId, selectedWorkerType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-populate thirdPartyBusinessId from the selected worker (depends only on workerId, not full formData)
  const selectedWorkerForVendor = useMemo(() =>
    workers.find(w => w.id === formData.workerId),
    [formData.workerId, workers]
  );
  useEffect(() => {
    if (selectedWorkerForVendor && selectedWorkerForVendor.workerType === 'third_party_worker' && selectedWorkerForVendor.thirdPartyBusinessId) {
      setFormData(prev => {
        if (prev.thirdPartyBusinessId === selectedWorkerForVendor.thirdPartyBusinessId) return prev;
        return { ...prev, thirdPartyBusinessId: selectedWorkerForVendor.thirdPartyBusinessId };
      });
    } else if (selectedWorkerForVendor && selectedWorkerForVendor.workerType !== 'third_party_worker') {
      setFormData(prev => {
        if (prev.thirdPartyBusinessId === '') return prev;
        return { ...prev, thirdPartyBusinessId: '' };
      });
    }
  }, [selectedWorkerForVendor]);

  // Reset step when modal opens
  useEffect(() => {
    if (open && !editMode) {
      setStep(1);
    }
  }, [open, editMode]);

  const { toast } = useToast();

  const { data: roleTitles = [] } = useQuery<any[]>({
    queryKey: ["/api/role-titles"],
  });

  // Fetch filtered contract templates based on selected country and employment type
  const { data: contractTemplates = [], isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: [`/api/contract-templates/country/${formData.countryId}?employmentType=${formData.employmentType}`],
    enabled: !!formData.countryId && !!formData.employmentType,
  });

  // Contract preview mutation
  const previewContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/contracts/universal/preview', data);
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Preview Error",
        description: "Failed to generate contract preview. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      let contractId: string;
      if (editMode && existingContract) {
        const resp = await apiRequest('PUT', `/api/contracts/${existingContract.id}`, data);
        contractId = existingContract.id;
      } else {
        const resp = await apiRequest('POST', '/api/contracts', data);
        const created = await resp.json();
        contractId = created?.id;
      }
      // Save project rate lines if any (multiple rate structure)
      if (contractId && formData.rateStructure === 'multiple' && projectRateLines.length > 0) {
        const validLines = projectRateLines.filter((l: any) => l.projectName && l.rate && l.rateType);
        if (validLines.length > 0) {
          await apiRequest('POST', `/api/contracts/${contractId}/rate-lines/replace`, { lines: validLines });
        }
      }
      // Save purchase orders if any
      if (contractId && showPurchaseOrders && purchaseOrderLines.length > 0) {
        const validPOs = purchaseOrderLines.filter((p: any) => p.poNumber && p.projectName && p.authorisedValue);
        for (const po of validPOs) {
          await apiRequest('POST', '/api/purchase-orders', { ...po, contractId });
        }
      }
      console.log('Contract data from frontend:', data);
      // Generate contract document from template and save it to the contract
      if (contractId && (data.templateId || formData.templateId) && (data.workerId || formData.workerId)) {
        try {
          const wId = data.workerId || formData.workerId;
          const tId = data.templateId || formData.templateId;
          const selectedWorker = workers.find((w: any) => w.id === wId);
          const businessId = data.selectedBusinessId || data.businessId || selectedWorker?.businessId;
          if (businessId) {
            const genResp = await apiRequest('POST', '/api/contracts/universal/preview', {
              templateId: tId,
              businessId,
              workerId: wId,
              contractData: {
                contractId,
                agreementDate: new Date().toLocaleDateString(),
                serviceDescription: data.roleDescription || data.jobDescription || formData.roleDescription || '',
                startDate: data.startDate || formData.startDate || '',
                endDate: data.endDate || formData.endDate || '',
                rateAmount: data.rate || formData.rate || '',
                rateCurrency: data.currency || formData.currency || 'USD',
                rateType: data.rateType || formData.rateType || 'hourly',
                noticePeriodDays: data.noticePeriodDays || formData.noticePeriodDays || '30',
              },
            });
            const genResult = await genResp.json();
            if (genResult.content) {
              await apiRequest('PUT', `/api/contracts/${contractId}`, {
                contractDocument: genResult.content,
              });
            }
          }
        } catch (docError) {
          console.error('Failed to generate contract document:', docError);
          // Don't fail contract creation if document generation fails
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contract-instances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      // Invalidate role titles to show newly created custom role titles immediately
      queryClient.invalidateQueries({ queryKey: ['/api/role-titles'] });
      onOpenChange(false);
      setStep(1);
      setFormData(getInitialFormData());
      setProjectRateLines([]);
      setPurchaseOrderLines([]);
      setShowMultipleRates(false);
      setShowPurchaseOrders(false);
      toast({
        title: "Success",
        description: editMode ? "Contract updated successfully." : "Contract created successfully.",
      });
    },
    onError: (error) => {
      let errorMessage = editMode ? "Failed to update contract. Please try again." : "Failed to create contract. Please try again.";
      
      try {
        const errorText = error.message || '';
        const jsonStart = errorText.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(errorText.substring(jsonStart));
          if (parsed.details) {
            errorMessage = parsed.details;
          } else if (parsed.message) {
            errorMessage = parsed.message;
          }
        }
      } catch (e) {
        // Use default message if parsing fails
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < 4) return; // Only handle submission on final steps
    
    if (!formData.workerId || !formData.countryId || !formData.startDate || !formData.rate || !formData.templateId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including contract template.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.roleTitleId && !formData.customRoleTitle) {
      toast({
        title: "Error",
        description: "Please select a role title or enter a custom one.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.roleDescription || formData.roleDescription.trim() === '') {
      toast({
        title: "Error",
        description: "Please provide a role description.",
        variant: "destructive",
      });
      return;
    }

    // Validate end date for engagement types that require it
    if (['casual', 'fixed_term'].includes(formData.employmentType) && !formData.endDate) {
      toast({
        title: "Error",
        description: "End date is required for this engagement type.",
        variant: "destructive",
      });
      return;
    }

    // Validate on-behalf requirements for SDP internal users
    if (isSDPInternal && formData.onBehalf && !formData.selectedBusinessId) {
      toast({
        title: "Error",
        description: "Please select a business when creating contracts on behalf.",
        variant: "destructive",
      });
      return;
    }

    // Check if should go to Step 5 (contract generation) or submit directly
    const shouldGoToStep5 = (user as any)?.userType === 'sdp_internal' || 
                           (formData.employmentType === 'contractor' && !formData.contractorCompliance) || 
                           formData.employmentType === 'third_party_worker';
    
    if (shouldGoToStep5 && step === 4) {
      setStep(5); // Go to contract generation step
      return;
    }

    // Determine contract status based on engagement type, compliance selection, and user type
    let contractStatus = 'draft';
    
    // For SDP internal users, always set to ready_to_issue
    if ((user as any)?.userType === 'sdp_internal') {
      contractStatus = 'ready_to_issue';
    }
    // For contractor with standard contractor compliance only, set to ready_to_issue  
    else if (formData.employmentType === 'contractor' && formData.contractorCompliance === 'standard_contractor') {
      contractStatus = 'ready_to_issue';
    }
    // All other engagement types require SDP internal review
    else {
      contractStatus = 'pending_sdp_review';
    }

    // Calculate firstTimesheetStartDate using the alignment helper
    let firstTimesheetStartDate: string | undefined = undefined;
    if (formData.requiresTimesheet && formData.startDate && formData.timesheetFrequency) {
      const calculatedDate = calculateFirstTimesheetStartDate(
        new Date(formData.startDate),
        formData.timesheetFrequency as any,
        formData.timesheetCalculationMethod
      );
      firstTimesheetStartDate = calculatedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }

    const contractData = {
      ...formData,
      rate: formData.rate,
      // Include on-behalf fields for SDP internal users
      onBehalf: isSDPInternal ? formData.onBehalf : false,
      selectedBusinessId: isSDPInternal && formData.onBehalf ? formData.selectedBusinessId : undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      firstTimesheetStartDate: firstTimesheetStartDate, // Use calculated value
      jobDescription: formData.roleDescription, // Map roleDescription to jobDescription for backend
      templateId: formData.templateId, // Include template ID for contract generation
      // Handle custom role titles properly
      roleTitleId: formData.roleTitleId === 'custom' ? null : formData.roleTitleId,
      status: contractStatus, // Set the appropriate workflow status
    };

    // Handle role title data properly
    if (formData.roleTitleId === 'custom') {
      contractData.roleTitleId = null;
      contractData.customRoleTitle = formData.customRoleTitle;
    } else if (formData.roleTitleId && formData.roleTitleId !== 'custom') {
      contractData.roleTitleId = formData.roleTitleId;
      contractData.customRoleTitle = null;
    }
    
    // Remove empty fields (but preserve customRoleTitle even if empty when custom role is selected)
    if (!contractData.roleTitleId) delete contractData.roleTitleId;
    if (!contractData.customRoleTitle && formData.roleTitleId !== 'custom') {
      delete contractData.customRoleTitle;
    }

    createContractMutation.mutate(contractData);
  };

  const estimatedCost = formData.rate ? 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(formData.rate) * 1.15) // 15% markup for demonstration
    : '$0';

  const selectedCountry = countries.find(c => c.id === formData.countryId);

  // Get country-specific engagement types
  const getEngagementTypes = (countryId: string) => {
    const selectedWorker = workers.find(w => w.id === formData.workerId);
    const wType = selectedWorker?.workerType;

    // Third-party worker — only one option
    if (wType === 'third_party_worker') {
      return [{ value: 'third_party_worker', label: '3rd Party Business Worker', description: 'Worker from another business' }];
    }

    // Contractor — only contractor-category types
    if (wType === 'contractor') {
      const contractorTypes = [
        { value: 'contractor', label: 'Contractor', description: 'Independent services' },
      ];
      if (countryId === 'us') {
        contractorTypes.push({ value: 'gig_worker', label: 'Gig Worker', description: 'Independent contractor for specific tasks' });
      }
      return contractorTypes;
    }

    // Employee — only employment-category types
    if (wType === 'employee') {
      const employeeTypes = [
        { value: 'permanent', label: 'Permanent', description: 'Ongoing employment' },
        { value: 'fixed_term', label: 'Fixed Term', description: 'Time-limited contract' },
      ];
      switch (countryId) {
        case 'au':
          employeeTypes.push({ value: 'casual', label: 'Casual Employee', description: 'Flexible hours with casual loading' });
          break;
        case 'nz':
          employeeTypes.push({ value: 'casual', label: 'Casual Employee', description: 'Flexible employment' });
          break;
        case 'uk':
        case 'gb':
          employeeTypes.push({ value: 'zero_hours', label: 'Zero-Hours Contract', description: 'No guaranteed hours' });
          break;
        case 'ph':
          employeeTypes.push({ value: 'casual', label: 'Casual Employee', description: 'Flexible engagement' });
          break;
        case 'us':
          employeeTypes.push({ value: 'at_will', label: 'At-Will Employment', description: 'Employment at will of either party' });
          break;
        case 'ca':
          employeeTypes.push({ value: 'on_call', label: 'On-Call Employee', description: 'Called to work as needed' });
          employeeTypes.push({ value: 'seasonal', label: 'Seasonal Worker', description: 'Temporary seasonal employment' });
          break;
        case 'hk':
        case 'sg':
          employeeTypes.push({ value: 'part_time', label: 'Part-Time Employee', description: 'Reduced hours employment' });
          break;
        case 'jp':
          employeeTypes.push({ value: 'part_time', label: 'Part-Time (パートタイム)', description: 'Reduced hours employment' });
          break;
      }
      return employeeTypes;
    }

    // No worker selected yet — show all types so the list isn't empty
    const allTypes = [
      { value: 'contractor', label: 'Contractor', description: 'Independent services' },
      { value: 'permanent', label: 'Permanent', description: 'Ongoing employment' },
      { value: 'fixed_term', label: 'Fixed Term', description: 'Time-limited contract' },
    ];
    switch (countryId) {
      case 'au':
      case 'nz':
      case 'ph':
        allTypes.push({ value: 'casual', label: 'Casual Employee', description: 'Flexible hours' });
        break;
      case 'uk':
      case 'gb':
        allTypes.push({ value: 'zero_hours', label: 'Zero-Hours Contract', description: 'No guaranteed hours' });
        break;
      case 'us':
        allTypes.push({ value: 'at_will', label: 'At-Will Employment', description: 'Employment at will' });
        allTypes.push({ value: 'gig_worker', label: 'Gig Worker', description: 'Independent contractor for specific tasks' });
        break;
      case 'ca':
        allTypes.push({ value: 'on_call', label: 'On-Call Employee', description: 'Called to work as needed' });
        allTypes.push({ value: 'seasonal', label: 'Seasonal Worker', description: 'Temporary seasonal employment' });
        break;
      case 'hk':
      case 'sg':
      case 'jp':
        allTypes.push({ value: 'part_time', label: 'Part-Time Employee', description: 'Reduced hours employment' });
        break;
    }
    return allTypes;
  };

  const engagementTypes = getEngagementTypes(formData.countryId);

  // Enhanced job description suggestions based on role titles
  const getJobDescriptionSuggestion = (roleTitle: string) => {
    if (!roleTitle || roleTitle.trim() === '') {
      return 'Define the key responsibilities, duties, and requirements for this role including required skills, experience level, and specific tasks to be performed.';
    }

    const normalizedTitle = roleTitle.toLowerCase().trim();
    
    // Comprehensive role description suggestions
    const suggestions: Record<string, string> = {
      // Software Development
      'software developer': 'Develop and maintain software applications, write clean and efficient code, participate in code reviews, collaborate with cross-functional teams, troubleshoot and debug applications, and stay updated with emerging technologies.',
      'web developer': 'Design and develop responsive websites and web applications, implement frontend and backend functionality, optimize website performance, ensure cross-browser compatibility, and maintain web security standards.',
      'frontend developer': 'Create user-facing web interfaces using modern frameworks, implement responsive designs, optimize user experience, collaborate with designers and backend developers, and ensure browser compatibility.',
      'backend developer': 'Design and implement server-side logic, develop APIs and databases, ensure system security and scalability, integrate third-party services, and optimize application performance.',
      'full stack developer': 'Develop both frontend and backend components of web applications, manage databases, create APIs, implement user interfaces, and ensure seamless integration between all system components.',
      'mobile developer': 'Design and develop mobile applications for iOS and Android platforms, optimize app performance, implement user-friendly interfaces, integrate with backend services, and ensure app store compliance.',
      'devops engineer': 'Manage deployment pipelines, automate infrastructure provisioning, monitor system performance, implement security measures, troubleshoot production issues, and optimize development workflows.',
      'qa engineer': 'Design and execute test plans, identify and report software defects, perform automated and manual testing, collaborate with development teams, and ensure software quality standards.',
      
      // Management & Leadership
      'project manager': 'Plan, execute, and oversee project deliverables, manage project timelines and budgets, coordinate with stakeholders and team members, identify and mitigate risks, conduct regular progress meetings, and ensure project objectives are met.',
      'product manager': 'Define product strategy and roadmap, gather and prioritize product requirements, work with engineering and design teams, analyze market trends, manage product lifecycle, and ensure successful product launches.',
      'team lead': 'Lead and mentor team members, coordinate project activities, make technical decisions, facilitate communication between stakeholders, conduct performance reviews, and ensure team productivity.',
      'engineering manager': 'Manage engineering teams and technical projects, make strategic technical decisions, mentor developers, coordinate with other departments, and ensure delivery of high-quality software products.',
      
      // Design & Creative
      'ux designer': 'Research user needs and behaviors, create wireframes and prototypes, design user-friendly interfaces, conduct usability testing, collaborate with developers and stakeholders, and iterate on designs based on feedback.',
      'ui designer': 'Design visually appealing user interfaces, create design systems and style guides, ensure consistent branding, collaborate with UX designers and developers, and optimize designs for various devices.',
      'graphic designer': 'Create visual designs for digital and print media, develop brand identity materials, design marketing collateral, collaborate with marketing teams, and ensure brand consistency across all materials.',
      'web designer': 'Design website layouts and user interfaces, create responsive designs, collaborate with developers, ensure brand consistency, and optimize designs for user experience and conversion.',
      'designer': 'Create visual designs for digital and print media, develop brand guidelines, collaborate with clients and teams, present design concepts, revise designs based on feedback, stay current with design trends, and manage multiple design projects.',
      
      // Marketing & Sales
      'marketing specialist': 'Develop and implement marketing strategies, create content for various marketing channels, conduct market research, analyze campaign performance, manage social media accounts, and collaborate with sales teams.',
      'digital marketer': 'Plan and execute digital marketing campaigns, manage social media accounts, analyze online marketing metrics, optimize SEO and SEM strategies, create content for digital platforms, and track ROI.',
      'sales representative': 'Identify and pursue new business opportunities, maintain client relationships, prepare sales presentations, negotiate contracts, meet sales targets, provide customer support, and report on sales activities.',
      'account manager': 'Manage existing client relationships, identify upselling opportunities, ensure client satisfaction, coordinate with internal teams, resolve client issues, and maintain account documentation.',
      
      // Data & Analytics
      'data analyst': 'Collect and analyze data, create reports and dashboards, identify trends and insights, develop data visualization, maintain databases, collaborate with teams to support data-driven decisions, and ensure data quality and accuracy.',
      'data scientist': 'Apply statistical and machine learning techniques to analyze complex datasets, build predictive models, extract actionable insights from data, collaborate with business teams, and communicate findings to stakeholders.',
      'business analyst': 'Analyze business processes and requirements, document functional specifications, liaise between stakeholders and development teams, conduct system testing, prepare reports and presentations, and recommend process improvements.',
      
      // Consulting & Professional Services
      'consultant': 'Provide expert advice and recommendations, analyze client requirements, develop solutions and strategies, conduct research and assessments, present findings to stakeholders, manage client relationships, and deliver project outcomes.',
      'business consultant': 'Analyze business operations and strategies, identify improvement opportunities, develop recommendations, implement solutions, facilitate change management, and help clients achieve business objectives.',
      
      // Content & Communication
      'content writer': 'Create engaging and informative content for various platforms, research topics thoroughly, optimize content for SEO, collaborate with marketing teams, maintain brand voice, and meet publication deadlines.',
      'copywriter': 'Write compelling marketing copy for advertisements, websites, and promotional materials, develop brand messaging, collaborate with design teams, and optimize copy for target audiences.',
      'technical writer': 'Create clear and comprehensive technical documentation, develop user guides and manuals, collaborate with development teams, ensure documentation accuracy, and maintain information architecture.',
      
      // Finance & Operations
      'accountant': 'Maintain financial records, prepare financial statements, manage accounts payable and receivable, conduct reconciliations, ensure compliance with accounting standards, prepare tax documents, and assist with budgeting processes.',
      'operations manager': 'Oversee daily operations, optimize business processes, manage resources and budgets, coordinate with different departments, ensure operational efficiency, and implement improvement initiatives.',
      
      // Customer Service & Support
      'customer support': 'Provide excellent customer service via multiple channels, resolve customer issues and inquiries, maintain customer satisfaction, document interactions, collaborate with other teams, and contribute to process improvements.',
      'technical support': 'Provide technical assistance to customers, troubleshoot software and hardware issues, create support documentation, escalate complex issues, and maintain customer satisfaction through effective problem resolution.'
    };

    // Try exact match first
    let suggestion = suggestions[normalizedTitle];
    
    // If no exact match, try partial matching for flexibility
    if (!suggestion) {
      for (const [key, value] of Object.entries(suggestions)) {
        if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
          suggestion = value;
          break;
        }
      }
    }
    
    // If still no match, try to match by common keywords
    if (!suggestion) {
      const keywords = normalizedTitle.split(/[\s\-_]+/);
      for (const keyword of keywords) {
        for (const [key, value] of Object.entries(suggestions)) {
          if (key.includes(keyword) && keyword.length > 2) {
            suggestion = value;
            break;
          }
        }
        if (suggestion) break;
      }
    }
    
    return suggestion || 'Define the key responsibilities, duties, and requirements for this role including required skills, experience level, and specific tasks to be performed.';
  };

  // Helper function to provide detailed help for engagement types
  const getEngagementTypeHelp = (type: string, countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    const countryName = country?.name || 'selected country';
    
    switch (type) {
      case 'employee':
        return `Direct employment with full benefits and protections. In ${countryName}, this includes mandatory employer contributions, leave entitlements, and comprehensive worker protections. Best for ongoing, core business roles.`;
      case 'contractor':
        return `Independent contractor relationship where the worker operates their own business. They're responsible for their own taxes, insurance, and business expenses. Offers flexibility but requires business structure and compliance.`;
      case 'casual':
        if (countryId === 'au') {
          return 'Australian casual employment with 25% loading instead of leave benefits. No guaranteed hours, can decline shifts. Strong legislative framework with conversion rights to permanent after 12 months if working regular hours.';
        } else if (countryId === 'nz') {
          return 'New Zealand casual employment agreements with higher hourly rates. 8% holiday pay added on top of wages. No guaranteed hours, work on as-needed basis.';
        }
        return 'Flexible employment arrangement with no guaranteed hours. Pay rates and entitlements vary by jurisdiction.';
      case 'zero_hours':
        return 'UK zero-hours contracts where no work hours are guaranteed. Employer calls when needed. Workers entitled to annual leave and minimum wage but limited job security. Controversial but legal arrangement.';
      case 'part_time':
        return 'Regular employment with reduced hours compared to full-time. Pro-rata benefits and entitlements based on hours worked. Provides work-life balance while maintaining employment protections.';
      case 'fixed_term':
        return 'Employment for a specific period or project with defined end date. Full employment rights during the term. Automatic termination on expiry unless renewed.';
      case 'third_party_worker':
        return 'Worker provided by another business entity for specific projects or services. The providing business handles employment obligations while your business manages the work output.';
      default:
        return 'Select an engagement type to see detailed information about its characteristics and obligations.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Edit Contract' : 'Create New Contract'}</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-secondary-500'}`}>
              <div className={`w-8 h-8 ${step >= 1 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'} rounded-full flex items-center justify-center text-sm font-medium`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Worker & Location</span>
            </div>
            <div className="flex-1 h-1 bg-secondary-200 mx-2">
              <div className={`h-1 bg-primary-500 ${step > 1 ? 'w-full' : 'w-0'} transition-all`}></div>
            </div>
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-secondary-500'}`}>
              <div className={`w-8 h-8 ${step >= 2 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'} rounded-full flex items-center justify-center text-sm font-medium`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Customer Details</span>
            </div>
            <div className="flex-1 h-1 bg-secondary-200 mx-2">
              <div className={`h-1 bg-primary-500 ${step > 2 ? 'w-full' : 'w-0'} transition-all`}></div>
            </div>
            <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-secondary-500'}`}>
              <div className={`w-8 h-8 ${step >= 3 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'} rounded-full flex items-center justify-center text-sm font-medium`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Billing Setup</span>
            </div>
            <div className="flex-1 h-1 bg-secondary-200 mx-2">
              <div className={`h-1 bg-primary-500 ${step > 3 ? 'w-full' : 'w-0'} transition-all`}></div>
            </div>
            <div className={`flex items-center ${step >= 4 ? 'text-primary-600' : 'text-secondary-500'}`}>
              <div className={`w-8 h-8 ${step >= 4 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'} rounded-full flex items-center justify-center text-sm font-medium`}>
                4
              </div>
              <span className="ml-2 text-sm font-medium">Contract Details</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <>
              {/* On-behalf section for SDP Internal users */}
              {isSDPInternal && (
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="contractOnBehalf"
                      checked={formData.onBehalf}
                      onCheckedChange={(checked) => {
                        setFormData({ 
                          ...formData, 
                          onBehalf: !!checked,
                          selectedBusinessId: !!checked ? formData.selectedBusinessId : ''
                        });
                      }}
                      data-testid="checkbox-onbehalf-contract"
                    />
                    <Label htmlFor="contractOnBehalf" className="text-sm font-medium text-primary-900 cursor-pointer">
                      Creating contract on behalf of a business
                    </Label>
                  </div>
                  
                  {formData.onBehalf && (
                    <div>
                      <Label htmlFor="selectedBusinessContract" className="text-sm font-medium text-secondary-900">
                        Select Business <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={formData.selectedBusinessId} 
                        onValueChange={(value) => setFormData({ ...formData, selectedBusinessId: value })}
                        disabled={businessesLoading || !Array.isArray(businesses) || businesses.length === 0}
                        data-testid="select-business-contract"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            businessesLoading 
                              ? "Loading businesses..." 
                              : !Array.isArray(businesses) || businesses.length === 0
                              ? "No businesses available"
                              : "Select a business"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const registered = (businesses || []).filter((b: any) => b.isRegistered !== false);
                            const hostClients = (businesses || []).filter((b: any) => b.isRegistered === false);
                            return (
                              <>
                                {registered.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1">
                                      Registered Businesses
                                    </SelectLabel>
                                    {registered.map((business: any) => (
                                      <SelectItem key={business.id} value={business.id}>
                                        <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                          <span>{business.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                                {hostClients.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1">
                                      Host Clients
                                    </SelectLabel>
                                    {hostClients.map((business: any) => (
                                      <SelectItem key={business.id} value={business.id}>
                                        <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                          <span>{business.name}</span>
                                          <span className="text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-1">Host Client</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                              </>
                            );
                          })()}
                        </SelectContent>
                      </Select>
                      {businessesLoading && (
                        <p className="text-xs text-secondary-500 mt-1">Loading available businesses...</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Worker Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-secondary-700">
                    Select Worker
                  </Label>
                  <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        type="button"
                        variant={workerViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setWorkerViewMode('list')}
                        className="h-7 px-2"
                      >
                        <ListIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={workerViewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setWorkerViewMode('card')}
                        className="h-7 px-2"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <Input
                    type="text"
                    placeholder="Search workers by name, email, or country..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-worker"
                  />
                </div>

                {/* Worker List */}
                <RadioGroup
                  value={formData.workerId}
                  onValueChange={(value) => setFormData({ ...formData, workerId: value })}
                  className={workerViewMode === 'list' 
                    ? "space-y-2 max-h-96 overflow-y-auto border border-secondary-200 rounded-lg p-4" 
                    : "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-secondary-200 rounded-lg p-4"}
                >
                  {filteredWorkers && filteredWorkers.length > 0 ? filteredWorkers.map((worker: any, _wi: number) => (
                    workerViewMode === 'list' ? (
                      <div key={worker.id} className="flex items-center space-x-3 p-3 border border-secondary-200 rounded-lg hover:border-primary-300 transition-colors">
                        <RadioGroupItem value={worker.id} id={worker.id} />
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 text-sm font-medium">
                            {worker.firstName[0]}{worker.lastName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={worker.id} className="font-medium text-secondary-900 cursor-pointer block">
                            {worker.firstName} {worker.lastName}
                          </Label>
                          <div className="text-sm text-secondary-600 truncate">{worker.email}</div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3 text-secondary-400" />
                            <span className="text-secondary-600">{worker.country?.name}</span>
                          </div>
                          {worker.invitationStatus === 'invited' ? (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <UserX className="h-3 w-3" />
                              <span>Invited</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <UserCheck className="h-3 w-3" />
                              <span>Active</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={worker.id} className="relative">
                        <RadioGroupItem value={worker.id} id={`card-${worker.id}`} className="absolute top-3 left-3 z-10" />
                        <Label htmlFor={`card-${worker.id}`} className="block p-4 pl-10 border border-secondary-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-primary-700 text-sm font-medium">
                                {worker.firstName[0]}{worker.lastName[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-secondary-900 truncate">
                                {worker.firstName} {worker.lastName}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-secondary-600 truncate mb-2">{worker.email}</div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-secondary-600">
                              <MapPin className="h-3 w-3" />
                              <span>{worker.country?.name}</span>
                            </div>
                            {worker.invitationStatus === 'invited' ? (
                              <div className="flex items-center gap-1 text-blue-600">
                                <UserX className="h-3 w-3" />
                                <span>Invited</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-600">
                                <UserCheck className="h-3 w-3" />
                                <span>Active</span>
                              </div>
                            )}
                          </div>
                        </Label>
                      </div>
                    )
                  )) : (
                    <div className="text-center py-8 text-secondary-500 col-span-full">
                      {workerSearch.trim() ? 'No workers found matching your search.' : 'No workers available. Please add workers first.'}
                    </div>
                  )}
                </RadioGroup>

                {/* Add New Worker link */}
                <div className="mt-2 text-sm text-secondary-500">
                  Can't find the worker?{' '}
                  <button
                    type="button"
                    className="text-primary-600 hover:text-primary-700 underline inline-flex items-center gap-1"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/workforce?addWorker=true');
                    }}
                  >
                    Add a new worker
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Country Selection */}
              <div>
                <Label className="block text-sm font-medium text-secondary-700 mb-3">
                  Work Location
                </Label>
                <RadioGroup
                  value={formData.countryId}
                  onValueChange={(value) => setFormData({ ...formData, countryId: value })}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                  data-testid="radiogroup-country"
                >
                  {sortedCountries.map((country: any) => (
                    <div key={country.id} className="flex flex-col items-center p-4 border border-secondary-300 rounded-lg">
                      <RadioGroupItem value={country.id} id={`country-${country.id}`} className="mb-2" />
                      <Label htmlFor={`country-${country.id}`} className="text-center cursor-pointer">
                        <i className="fas fa-flag text-primary-500 mb-2 block"></i>
                        <span className="text-sm font-medium text-secondary-900 block">{country.name}</span>
                        <span className="text-xs text-secondary-600">{country.sdpEntity}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Engagement Type */}
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
                  Engagement Type
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        <HelpCircle className="h-4 w-4 text-secondary-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-secondary-900">Engagement Types Guide</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Employee:</strong> Direct employment with full benefits, leave entitlements, and employer obligations.</div>
                          <div><strong>Contractor:</strong> Independent contractor relationship with business autonomy and responsibility for own taxes.</div>
                          <div><strong>Casual (AU/NZ):</strong> Flexible hours with 25% loading instead of leave benefits. No guaranteed hours.</div>
                          <div><strong>Zero-Hours (UK):</strong> No guaranteed work hours, called when needed. Controversial but legal arrangement.</div>
                          <div><strong>3rd Party Worker:</strong> Worker provided by another business entity for specific projects or services.</div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Label>
                <RadioGroup
                  value={formData.employmentType}
                  onValueChange={(value) => setFormData({ ...formData, employmentType: value })}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {engagementTypes.map((type) => (
                    <div key={type.value} className="relative flex items-start space-x-3 p-4 border border-secondary-300 rounded-lg hover:border-primary-300 transition-colors">
                      <RadioGroupItem value={type.value} id={`${type.value}-type`} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={`${type.value}-type`} className="cursor-pointer">
                          <div className="font-medium text-secondary-900">{type.label}</div>
                          <div className="text-sm text-secondary-600 mt-1">{type.description}</div>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="absolute top-2 right-2 p-1 h-auto opacity-60 hover:opacity-100">
                              <InfoIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="end">
                            <div className="space-y-2">
                              <h5 className="font-semibold text-secondary-900">{type.label}</h5>
                              <p className="text-sm text-secondary-700">{getEngagementTypeHelp(type.value, formData.countryId)}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                {!formData.countryId && (
                  <div className="text-sm text-secondary-500 mt-2">
                    Please select a work location first to see available engagement types.
                  </div>
                )}
              </div>

              {/* Contractor Compliance Question - only show if contractor is selected */}
              {formData.employmentType === 'contractor' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <Label className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
                    Contractor Compliance Service
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          <HelpCircle className="h-4 w-4 text-secondary-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-secondary-900">What is a Contractor?</h4>
                          <div className="space-y-2 text-sm">
                            <div><strong>Legal Definition:</strong> An independent business entity that provides services under a commercial contract, not an employment relationship.</div>
                            <div><strong>Key Characteristics:</strong> Controls how work is done, uses own equipment, bears financial risk, can work for multiple clients, invoices for services.</div>
                            <div><strong>Compliance Service:</strong> SDP ensures the arrangement meets legal contractor requirements, reducing risk of reclassification as an employee.</div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </Label>
                  <div className="space-y-4">
                    <p className="text-sm text-secondary-600 mb-4">
                      Do you want our fully compliant contractor service? This ensures the contractor relationship meets all legal requirements.
                    </p>
                    <RadioGroup
                      value={formData.contractorCompliance ? 'yes' : 'no'}
                      onValueChange={(value) => setFormData({ ...formData, contractorCompliance: value === 'yes' })}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-3 p-4 border border-secondary-300 rounded-lg">
                        <RadioGroupItem value="no" id="no-compliance" />
                        <Label htmlFor="no-compliance" className="cursor-pointer flex-1">
                          <div className="font-medium text-secondary-900">Standard Contractor</div>
                          <div className="text-sm text-secondary-600">Basic contractor arrangement without compliance review</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border border-blue-300 bg-blue-50 rounded-lg">
                        <RadioGroupItem value="yes" id="yes-compliance" />
                        <Label htmlFor="yes-compliance" className="cursor-pointer flex-1">
                          <div className="font-medium text-secondary-900">Contractor of Record Service</div>
                          <div className="text-sm text-secondary-600">Full compliance review and legal protection</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* 3rd Party Vendor Info Card — shown when a third_party_worker is selected */}
              {(() => {
                const selWorker = workers.find((w: any) => w.id === formData.workerId);
                if (selWorker && selWorker.workerType === 'third_party_worker' && selWorker.thirdPartyBusinessId) {
                  return (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-800">3rd Party Vendor</span>
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">B2B Arrangement</span>
                      </div>
                      <p className="text-xs text-amber-700 mb-2">
                        This worker is provided by an external vendor company. The vendor details below will be captured on the contract for payment and compliance purposes.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-amber-600 font-medium">Company:</span>
                          <span className="ml-1 text-amber-900">{selWorker.thirdPartyBusinessName || 'Unknown'}</span>
                        </div>
                        {selWorker.thirdPartyContactPerson && (
                          <div>
                            <span className="text-amber-600 font-medium">Contact:</span>
                            <span className="ml-1 text-amber-900">{selWorker.thirdPartyContactPerson}</span>
                          </div>
                        )}
                        {selWorker.thirdPartyEmail && (
                          <div className="col-span-2">
                            <span className="text-amber-600 font-medium">Email:</span>
                            <span className="ml-1 text-amber-900">{selWorker.thirdPartyEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex justify-end mt-6">
                <Button
                  type="button"
                  data-testid="button-continue-step1"
                  onClick={() => setStep(2)}
                  disabled={!formData.workerId || !formData.countryId}
                  className="w-auto"
                >
                  Continue to Client Details
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Customer Work Question */}
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
                  Work Arrangement
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        <HelpCircle className="h-4 w-4 text-secondary-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-secondary-900">Work Arrangement</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Internal Work:</strong> Worker provides services directly to your business for your own operations and projects.</div>
                          <div><strong>Customer Work:</strong> Worker provides services that you're delivering to one of your customers. This includes subcontracting, consulting, or project-based work for your customers.</div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Label>
                <RadioGroup
                  value={formData.isForClient ? 'customer' : 'internal'}
                  onValueChange={(value) => setFormData({ ...formData, isForClient: value === 'customer' })}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-3 p-4 border border-secondary-300 rounded-lg">
                    <RadioGroupItem value="internal" id="internal-work" />
                    <Label htmlFor="internal-work" className="cursor-pointer flex-1">
                      <div className="font-medium text-secondary-900">Internal Work</div>
                      <div className="text-sm text-secondary-600">Worker provides services directly to your business</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-secondary-300 rounded-lg">
                    <RadioGroupItem value="customer" id="customer-work" />
                    <Label htmlFor="customer-work" className="cursor-pointer flex-1">
                      <div className="font-medium text-secondary-900 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Customer Work
                      </div>
                      <div className="text-sm text-secondary-600">Worker provides services for one of your customers</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Customer Details - only show if customer work is selected */}
              {formData.isForClient && (
                <Card className="border-primary-200 bg-primary-50">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      Host Client Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customerBusinessId">Host Client *</Label>
                        <Select
                          value={formData.customerBusinessId}
                          onValueChange={(value) => {
                            if (value === '__create_new__') {
                              setShowCreateHostClient(true);
                              return;
                            }
                            const selectedBusiness = customerBusinessOptions.find((b: any) => b.id === value);
                            if (selectedBusiness) {
                              setFormData({ 
                                ...formData, 
                                customerBusinessId: value,
                                clientName: selectedBusiness.name,
                                clientContactEmail: selectedBusiness.contactEmail || selectedBusiness.email || '',
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select or create a host client" />
                          </SelectTrigger>
                          <SelectContent>
                            {customerBusinessOptions
                              .sort((a: any, b: any) => {
                                if (a.isHostClient !== b.isHostClient) return a.isHostClient ? 1 : -1;
                                return a.name.localeCompare(b.name);
                              })
                              .map((business: any) => (
                                <SelectItem key={business.id} value={business.id}>
                                  <span className="flex items-center gap-2">
                                    {business.name}
                                    {business.isHostClient ? (
                                      <span className="text-xs font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Host Client</span>
                                    ) : (
                                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Business</span>
                                    )}
                                  </span>
                                </SelectItem>
                              ))}
                            <SelectItem value="__create_new__">
                              <span className="flex items-center gap-2 text-primary-600 font-medium">
                                <Plus className="h-4 w-4" />
                                Add New Host Client
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-secondary-500 mt-1">
                          Select an existing host client or create a new one for billing purposes.
                        </p>
                      </div>

                      {/* Inline Create Host Client Form */}
                      {showCreateHostClient && (
                        <Card className="border-primary-300 bg-white">
                          <CardContent className="p-4">
                            <h4 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                              <Plus className="h-4 w-4 text-primary-600" />
                              New Host Client
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="newHostClientName">Business Name *</Label>
                                <Input
                                  id="newHostClientName"
                                  value={newHostClientName}
                                  onChange={(e) => setNewHostClientName(e.target.value)}
                                  placeholder="e.g. CX Technology"
                                  className="bg-white"
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="newHostClientContact">Contact Name</Label>
                                  <Input
                                    id="newHostClientContact"
                                    value={newHostClientContact}
                                    onChange={(e) => setNewHostClientContact(e.target.value)}
                                    placeholder="e.g. John Smith"
                                    className="bg-white"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="newHostClientEmail">Contact Email</Label>
                                  <Input
                                    id="newHostClientEmail"
                                    type="email"
                                    value={newHostClientEmail}
                                    onChange={(e) => setNewHostClientEmail(e.target.value)}
                                    placeholder="e.g. billing@cxtech.com"
                                    className="bg-white"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowCreateHostClient(false);
                                    setNewHostClientName('');
                                    setNewHostClientEmail('');
                                    setNewHostClientContact('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!newHostClientName.trim() || createHostClientMutation.isPending}
                                  onClick={() => {
                                    createHostClientMutation.mutate({
                                      name: newHostClientName.trim(),
                                      contactEmail: newHostClientEmail.trim() || undefined,
                                      contactName: newHostClientContact.trim() || undefined,
                                    });
                                  }}
                                >
                                  {createHostClientMutation.isPending ? 'Creating...' : 'Create Host Client'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clientName">Host Client Name (Auto-filled)</Label>
                          <Input
                            id="clientName"
                            value={formData.clientName}
                            readOnly
                            placeholder="Select host client above"
                            className="bg-secondary-100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="clientContactEmail">Contact Email (Auto-filled)</Label>
                          <Input
                            id="clientContactEmail"
                            type="email"
                            value={formData.clientContactEmail}
                            readOnly
                            placeholder="Select host client above"
                            className="bg-secondary-100"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back to Worker Selection
                </Button>
                <Button
                  type="button"
                  data-testid="button-continue-step2"
                  onClick={() => setStep(3)}
                  disabled={formData.isForClient && !formData.customerBusinessId}
                >
                  Continue to Billing Setup
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* Customer Invoicing Question - only show if customer work is selected */}
              {formData.isForClient ? (
                <>
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-medium text-secondary-700 mb-3">
                      Customer Invoicing
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-1 h-auto">
                            <HelpCircle className="h-4 w-4 text-secondary-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-secondary-900">Customer Invoicing</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Invoice through Platform:</strong> SDP Global Pay acts as the billing entity to your customer. We handle invoicing, payment collection, worker payments, and transfer your margin when customer pays.</div>
                              <div><strong>Invoice Separately:</strong> Your business handles customer invoicing outside the platform. You manage the customer relationship and billing directly.</div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </Label>
                    <RadioGroup
                      value={formData.billingMode || 'invoice_separately'}
                      onValueChange={(value) => {
                        const isThruPlatform = value === 'invoice_through_platform';
                        setFormData({ ...formData, billingMode: value, invoiceCustomer: isThruPlatform });
                      }}
                      className="grid grid-cols-1 gap-3"
                    >
                      <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer ${formData.billingMode === 'invoice_separately' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300'}`}>
                        <RadioGroupItem value="invoice_separately" id="billing-separate" className="mt-0.5" />
                        <Label htmlFor="billing-separate" className="cursor-pointer flex-1">
                          <div className="font-medium text-secondary-900">Invoice Separately</div>
                          <div className="text-sm text-secondary-600">Your business invoices the host client. Platform auto-generates the invoice for you on timesheet approval.</div>
                        </Label>
                      </div>
                      <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer ${formData.billingMode === 'invoice_through_platform' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300'}`}>
                        <RadioGroupItem value="invoice_through_platform" id="billing-platform" className="mt-0.5" />
                        <Label htmlFor="billing-platform" className="cursor-pointer flex-1">
                          <div className="font-medium text-secondary-900">SDP Global Pay as Billing Agent</div>
                          <div className="text-sm text-secondary-600">SDP Global Pay acts as the billing entity and invoices your host client directly on timesheet approval.</div>
                        </Label>
                      </div>
                      <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer ${formData.billingMode === 'auto_invoice' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300'}`}>
                        <RadioGroupItem value="auto_invoice" id="billing-auto" className="mt-0.5" />
                        <Label htmlFor="billing-auto" className="cursor-pointer flex-1">
                          <div className="font-medium text-secondary-900">Auto Invoice upon Approval</div>
                          <div className="text-sm text-secondary-600">On timesheet approval, SDP invoices your business (to fund worker payment) and also auto-generates a Business → Host Client invoice for you to collect from your client.</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Customer Billing Details - show for all billing modes when isForClient */}
                  {formData.billingMode && formData.billingMode !== 'direct' && (
                    <Card className="border-accent-200 bg-accent-50">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-accent-600" />
                          Client Billing Setup
                        </h3>

                        {/* Client Billing Type toggle */}
                        <div>
                          <Label className="text-sm font-medium text-secondary-700 mb-2 block">Billing Type</Label>
                          <RadioGroup
                            value={formData.clientBillingType || 'rate_based'}
                            onValueChange={(value) => {
                              const updates: any = { clientBillingType: value };
                              if (value === 'fixed_price') {
                                updates.customerBillingRate = '';
                              } else {
                                updates.fixedBillingAmount = '';
                              }
                              setFormData({ ...formData, ...updates });
                            }}
                            className="grid grid-cols-2 gap-3"
                          >
                            <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${(formData.clientBillingType || 'rate_based') === 'rate_based' ? 'border-accent-500 bg-white' : 'border-secondary-300 bg-white'}`}>
                              <RadioGroupItem value="rate_based" id="billing-rate-based" className="mt-0.5" />
                              <Label htmlFor="billing-rate-based" className="cursor-pointer">
                                <div className="font-medium text-secondary-900">Rate-Based</div>
                                <div className="text-xs text-secondary-500">Client billed per hour or day × rate</div>
                              </Label>
                            </div>
                            <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${formData.clientBillingType === 'fixed_price' ? 'border-accent-500 bg-white' : 'border-secondary-300 bg-white'}`}>
                              <RadioGroupItem value="fixed_price" id="billing-fixed-price" className="mt-0.5" />
                              <Label htmlFor="billing-fixed-price" className="cursor-pointer">
                                <div className="font-medium text-secondary-900">Fixed Price</div>
                                <div className="text-xs text-secondary-500">Client billed a set amount per period</div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Rate-Based: info note — rates set in Step 4 */}
                        {(formData.clientBillingType || 'rate_based') === 'rate_based' && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                            <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>Client billing rates will be configured alongside worker rates in the next step, ensuring you can set the correct margin per rate line.</span>
                          </div>
                        )}

                        {/* Fixed Price fields */}
                        {formData.clientBillingType === 'fixed_price' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="fixedBillingAmount">Fixed Billing Amount *</Label>
                                <Input
                                  id="fixedBillingAmount"
                                  type="number"
                                  step="0.01"
                                  value={formData.fixedBillingAmount}
                                  onChange={(e) => setFormData({ ...formData, fixedBillingAmount: e.target.value })}
                                  placeholder="5000.00"
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label htmlFor="customerCurrency">Client Currency</Label>
                                <Select
                                  value={formData.customerCurrency}
                                  onValueChange={(value) => setFormData({ ...formData, customerCurrency: value })}
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="fixedBillingFrequency">Billing Frequency</Label>
                                <Select
                                  value={formData.fixedBillingFrequency || 'monthly'}
                                  onValueChange={(value) => setFormData({ ...formData, fixedBillingFrequency: value })}
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="fortnightly">Fortnightly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="per_project">Per Project</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                                <Select
                                  value={formData.paymentTerms}
                                  onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">Payment on Receipt</SelectItem>
                                    <SelectItem value="7">7 Days</SelectItem>
                                    <SelectItem value="14">14 Days</SelectItem>
                                    <SelectItem value="30">30 Days</SelectItem>
                                    <SelectItem value="45">45 Days</SelectItem>
                                    <SelectItem value="60">60 Days</SelectItem>
                                    <SelectItem value="90">90 Days</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="text-xs text-secondary-600 bg-white p-2 rounded border border-secondary-200">
                              The client will be invoiced this fixed amount per period regardless of hours worked.
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-secondary-200 bg-secondary-50">
                  <CardContent className="p-6 text-center">
                    <div className="text-secondary-600">
                      <p className="text-lg font-medium mb-2">Internal Work Selected</p>
                      <p>No customer billing setup required for internal work arrangements.</p>
                      <p className="mt-2 text-sm text-secondary-500">SDP billing to your business will be covered in the next step.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  Back to Customer Details
                </Button>
                <Button
                  type="button"
                  data-testid="button-continue-step3"
                  onClick={() => setStep(4)}
                  disabled={formData.isForClient && formData.billingMode && formData.billingMode !== 'direct' && formData.clientBillingType === 'fixed_price' && !formData.fixedBillingAmount}
                >
                  Continue to Contract Details
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              {/* Role Information */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roleTitle">Role Title</Label>
                    <Select
                      value={formData.roleTitleId}
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setFormData({ ...formData, roleTitleId: value, customRoleTitle: '', roleDescription: '' });
                        } else {
                          const selectedRole = roleTitles.find((role: any) => role.id === value);
                          setFormData({ 
                            ...formData, 
                            roleTitleId: value, 
                            customRoleTitle: '',
                            roleDescription: selectedRole?.description || getJobDescriptionSuggestion(selectedRole?.title || '')
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role title..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roleTitles.filter((role: any) => role.id && role.id.trim() !== '').map((role: any) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.title}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add Custom Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    {formData.roleTitleId === 'custom' && (
                    <div>
                      <Label htmlFor="customRoleTitle">Custom Role Title</Label>
                      <Input
                        id="customRoleTitle"
                        value={formData.customRoleTitle}
                        onChange={(e) => {
                          const title = e.target.value;
                          setFormData({ 
                            ...formData, 
                            customRoleTitle: title,
                          });
                        }}
                        placeholder="Enter custom role title"
                      />
                    </div>
                  )}
                </div>

                {/* Role Description */}
                <div>
                  <Label htmlFor="roleDescription" className="flex items-center gap-2">
                    Role Description
                    {formData.roleTitleId && formData.roleTitleId !== 'custom' && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
                        onClick={() => {
                          const currentTitle = roleTitles.find((role: any) => role.id === formData.roleTitleId)?.title || '';
                          setFormData({ ...formData, roleDescription: getJobDescriptionSuggestion(currentTitle) });
                        }}
                      >
                        Use Suggested Description
                      </Button>
                    )}
                  </Label>
                  <textarea
                    id="roleDescription"
                    value={formData.roleDescription}
                    onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                    placeholder={formData.roleTitleId === 'custom' 
                      ? "Describe the responsibilities for this role…" 
                      : "Describe the key responsibilities, duties, and requirements for this role..."}
                    className="w-full min-h-[120px] p-3 border border-secondary-300 rounded-md resize-vertical"
                    required
                  />
                </div>

                {/* Contract Template Selection */}
                <div>
                  <Label htmlFor="templateId" className="flex items-center gap-2">
                    Contract Template
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          <HelpCircle className="h-4 w-4 text-secondary-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-secondary-900">Contract Templates</h4>
                          <div className="space-y-2 text-sm">
                            <div><strong>Global Templates:</strong> Templates that can be used across all countries with standard terms.</div>
                            <div><strong>Country-Specific Templates:</strong> Templates tailored for specific country regulations and requirements.</div>
                            <div className="text-xs text-secondary-600">Templates are automatically filtered based on your selected country and employment type.</div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </Label>
                  <Select
                    value={formData.templateId}
                    onValueChange={(value) => setFormData({ ...formData, templateId: value })}
                    disabled={!formData.countryId || !formData.employmentType || templatesLoading}
                  >
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder={
                        !formData.countryId || !formData.employmentType 
                          ? "Select country and employment type first"
                          : templatesLoading 
                          ? "Loading templates..."
                          : contractTemplates.length > 0 
                          ? "Select contract template..."
                          : "No templates available for this combination"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTemplates.map((template: any) => (
                        <SelectItem 
                          key={template.id} 
                          value={template.id}
                          data-testid={`template-option-${template.id}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            <span className="text-xs text-secondary-500 ml-2">
                              {template.countryId ? `${template.country?.name}` : 'Global'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.countryId && formData.employmentType && contractTemplates.length === 0 && !templatesLoading && (
                    <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                      <InfoIcon className="h-4 w-4" />
                      No templates available for {formData.employmentType.replace(/_/g, ' ')} in {countries.find(c => c.id === formData.countryId)?.name}. 
                      Contact your SDP administrator to add appropriate templates.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  {/* End Date - required for contract, casual, fixed term, and 3rd party */}
                  {['contractor', 'casual', 'fixed_term', 'third_party_worker'].includes(formData.employmentType) && (
                    <div>
                      <Label htmlFor="endDate" className="flex items-center gap-2">
                        End Date
                        {formData.employmentType !== 'employee' && (
                          <span className="text-xs text-red-600">*</span>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                              <HelpCircle className="h-3 w-3 text-secondary-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" align="end">
                            <div className="space-y-2">
                              <h5 className="font-semibold text-secondary-900">End Date Required</h5>
                              <p className="text-sm text-secondary-700">
                                {formData.employmentType === 'contractor' && 'Contractor arrangements require defined project or engagement periods.'}
                                {formData.employmentType === 'casual' && 'Casual employment requires maximum engagement periods.'}
                                {formData.employmentType === 'fixed_term' && 'Fixed term contracts must have a specific end date by definition.'}
                                {formData.employmentType === 'third_party_worker' && 'Third party arrangements are typically project-based with defined timelines.'}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required={['contractor', 'casual', 'fixed_term', 'third_party_worker'].includes(formData.employmentType)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pay Rate Structure */}
              <Card className="bg-secondary-50 border border-secondary-200">
                <CardContent className="p-4 space-y-5">
                  <h4 className="font-semibold text-secondary-900">Pay Structure</h4>

                  {/* Pay Mode: Hourly / Daily / Fixed Salary */}
                  <div>
                    <Label className="text-sm font-medium text-secondary-700 mb-2 block">Pay Mode</Label>
                    <RadioGroup
                      value={formData.rateType}
                      onValueChange={(value) => {
                        const updates: any = { rateType: value };
                        if (value === 'annual') {
                          updates.rateStructure = 'single';
                        }
                        setFormData({ ...formData, ...updates });
                      }}
                      className="grid grid-cols-3 gap-3"
                    >
                      <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${formData.rateType === 'hourly' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-white'}`}>
                        <RadioGroupItem value="hourly" id="pay-hourly" className="mt-0.5" />
                        <Label htmlFor="pay-hourly" className="cursor-pointer">
                          <div className="font-medium text-secondary-900">Hourly</div>
                          <div className="text-xs text-secondary-500">Paid per hour worked</div>
                        </Label>
                      </div>
                      <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${formData.rateType === 'daily' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-white'}`}>
                        <RadioGroupItem value="daily" id="pay-daily" className="mt-0.5" />
                        <Label htmlFor="pay-daily" className="cursor-pointer">
                          <div className="font-medium text-secondary-900">Daily</div>
                          <div className="text-xs text-secondary-500">Paid per day worked</div>
                        </Label>
                      </div>
                      <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${formData.rateType === 'annual' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-white'}`}>
                        <RadioGroupItem value="annual" id="pay-salary" className="mt-0.5" />
                        <Label htmlFor="pay-salary" className="cursor-pointer">
                          <div className="font-medium text-secondary-900">Fixed Salary</div>
                          <div className="text-xs text-secondary-500">Fixed amount per period</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Rate Structure (Hourly/Daily only) — shown ABOVE rates */}
                  {(formData.rateType === 'hourly' || formData.rateType === 'daily') && (
                    <div>
                      <Label className="text-sm font-medium text-secondary-700 mb-2 block">Rate Structure</Label>
                      <RadioGroup
                        value={formData.rateStructure}
                        onValueChange={(value) => {
                          const updates: any = { rateStructure: value };
                          if (value === 'multiple' && projectRateLines.length === 0) {
                            setProjectRateLines([{ projectName: 'Standard Rate', projectCode: '', rateType: formData.rateType, rate: formData.rate || '', clientRate: '', currency: formData.currency || 'AUD', isDefault: true }]);
                          }
                          if (value === 'single') {
                            setProjectRateLines([]);
                          }
                          setFormData({ ...formData, ...updates });
                        }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${formData.rateStructure !== 'multiple' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-white'}`}>
                          <RadioGroupItem value="single" id="rate-single" className="mt-0.5" />
                          <Label htmlFor="rate-single" className="cursor-pointer">
                            <div className="font-medium text-secondary-900">Single Rate</div>
                            <div className="text-xs text-secondary-500">One rate applies to all work</div>
                          </Label>
                        </div>
                        <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer ${formData.rateStructure === 'multiple' ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 bg-white'}`}>
                          <RadioGroupItem value="multiple" id="rate-multiple" className="mt-0.5" />
                          <Label htmlFor="rate-multiple" className="cursor-pointer">
                            <div className="font-medium text-secondary-900">Multiple Rates / Penalty Rates</div>
                            <div className="text-xs text-secondary-500">Different rates per project or rate type</div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {/* Fixed Salary: CTC + currency + optional client rate */}
                  {formData.rateType === 'annual' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="totalPackageValue" className="text-sm font-medium">Total Annual Package (CTC) *</Label>
                          <Input
                            id="totalPackageValue"
                            type="number"
                            step="0.01"
                            value={formData.totalPackageValue}
                            onChange={(e) => setFormData({ ...formData, totalPackageValue: e.target.value, rate: e.target.value })}
                            placeholder="e.g. 85000"
                            className="mt-1 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                            <SelectTrigger className="mt-1 bg-white" data-testid="select-currency"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                              <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                              <SelectItem value="GBP">GBP - British Pound</SelectItem>
                              <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                              <SelectItem value="EUR">EUR - Euro</SelectItem>
                              <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                              <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        SDP will review and allocate this across base salary, allowances and statutory deductions. The full pay breakdown will be confirmed before the contract is issued.
                      </div>
                      {/* Salary + Rate-Based: client billing rate */}
                      {formData.isForClient && (formData.clientBillingType || 'rate_based') === 'rate_based' && (
                        <div className="space-y-3 p-3 bg-white rounded-lg border border-secondary-200">
                          <h5 className="text-sm font-semibold text-secondary-900">Client Billing Rate</h5>
                          <p className="text-xs text-secondary-600">This worker is on a fixed salary, but the client will be billed based on time logged. Set the rate you charge the client per unit.</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs font-medium">Billing Basis</Label>
                              <Select value={formData.customerBillingRateType || 'daily'} onValueChange={(value) => setFormData({ ...formData, customerBillingRateType: value })}>
                                <SelectTrigger className="mt-1 bg-white h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Client Rate *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.customerBillingRate}
                                onChange={(e) => setFormData({ ...formData, customerBillingRate: e.target.value })}
                                placeholder="0.00"
                                className="mt-1 bg-white h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Currency</Label>
                              <Select value={formData.customerCurrency || formData.currency} onValueChange={(value) => setFormData({ ...formData, customerCurrency: value })}>
                                <SelectTrigger className="mt-1 bg-white h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AUD">AUD</SelectItem>
                                  <SelectItem value="NZD">NZD</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SGD">SGD</SelectItem>
                                  <SelectItem value="CAD">CAD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="INR">INR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hourly / Daily: Single Rate fields or Multiple Rate Lines table */}
                  {(formData.rateType === 'hourly' || formData.rateType === 'daily') && (
                    <div className="space-y-4">
                      {/* Single Rate: worker rate + optional client rate */}
                      {formData.rateStructure !== 'multiple' && (
                        <div className="space-y-3 p-3 bg-white rounded-lg border border-secondary-200">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <Label className="text-sm font-medium">{formData.rateType === 'hourly' ? 'Worker Hourly Rate' : 'Worker Daily Rate'} *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                placeholder="0.00"
                                className="mt-1 bg-white"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Currency</Label>
                              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                                <SelectTrigger className="mt-1 bg-white" data-testid="select-currency"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AUD">AUD</SelectItem>
                                  <SelectItem value="NZD">NZD</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SGD">SGD</SelectItem>
                                  <SelectItem value="CAD">CAD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="INR">INR</SelectItem>
                                  <SelectItem value="PHP">PHP</SelectItem>
                                  <SelectItem value="JPY">JPY</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {/* Client Rate for single rate + rate-based billing */}
                          {formData.isForClient && (formData.clientBillingType || 'rate_based') === 'rate_based' && (
                            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-secondary-100">
                              <div className="col-span-2">
                                <Label className="text-sm font-medium text-accent-700">{formData.rateType === 'hourly' ? 'Client Billing Rate (per hour)' : 'Client Billing Rate (per day)'} *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={formData.customerBillingRate}
                                  onChange={(e) => setFormData({ ...formData, customerBillingRate: e.target.value, customerBillingRateType: formData.rateType })}
                                  placeholder="0.00"
                                  className="mt-1 bg-white border-accent-300"
                                />
                              </div>
                              <div className="flex items-end pb-0.5">
                                {formData.rate && formData.customerBillingRate && parseFloat(formData.customerBillingRate) > parseFloat(formData.rate) && (
                                  <span className="text-xs text-green-700 font-medium">Margin: {formData.currency} {(parseFloat(formData.customerBillingRate) - parseFloat(formData.rate)).toFixed(2)}/{formData.rateType === 'hourly' ? 'hr' : 'day'}</span>
                                )}
                                {formData.rate && formData.customerBillingRate && parseFloat(formData.customerBillingRate) <= parseFloat(formData.rate) && (
                                  <span className="text-xs text-red-600 font-medium">Warning: client rate ≤ worker rate</span>
                                )}
                              </div>
                            </div>
                          )}
                          {formData.isForClient && formData.clientBillingType === 'fixed_price' && (
                            <p className="text-xs text-secondary-500 pt-2 border-t border-secondary-100">Client billing is fixed price — set in Step 3.</p>
                          )}
                        </div>
                      )}

                      {/* Multiple Rate Lines table */}
                      {formData.rateStructure === 'multiple' && (
                        <div className="space-y-3 p-3 bg-white rounded-lg border border-secondary-200">
                          <p className="text-xs text-secondary-600">Define all rates that apply — including penalty rates such as overtime, weekend and public holiday rates. Workers will select the applicable rate on each timesheet entry.</p>
                          {projectRateLines.map((prl, idx) => (
                            <div key={idx} className={`grid gap-2 items-end bg-secondary-50 p-2 rounded border border-secondary-100 ${formData.isForClient && (formData.clientBillingType || 'rate_based') === 'rate_based' ? 'grid-cols-12' : 'grid-cols-10'}`}>
                              <div className="col-span-3">
                                <Label className="text-xs">Rate Name</Label>
                                <Input className="h-8" value={prl.projectName} onChange={(e) => {
                                  const u = [...projectRateLines]; u[idx].projectName = e.target.value; setProjectRateLines(u);
                                }} placeholder="e.g. Normal, Overtime, Sunday" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Worker Rate</Label>
                                <Input className="h-8" type="number" step="0.01" value={prl.rate} onChange={(e) => {
                                  const u = [...projectRateLines]; u[idx].rate = e.target.value; setProjectRateLines(u);
                                }} placeholder="0.00" />
                              </div>
                              {formData.isForClient && (formData.clientBillingType || 'rate_based') === 'rate_based' && (
                                <div className="col-span-2">
                                  <Label className="text-xs text-accent-700">Client Rate</Label>
                                  <Input className="h-8 border-accent-300" type="number" step="0.01" value={prl.clientRate || ''} onChange={(e) => {
                                    const u = [...projectRateLines]; u[idx].clientRate = e.target.value; setProjectRateLines(u);
                                  }} placeholder="0.00" />
                                </div>
                              )}
                              <div className="col-span-2">
                                <Label className="text-xs">Currency</Label>
                                <Select value={prl.currency} onValueChange={(v) => {
                                  const u = [...projectRateLines]; u[idx].currency = v; setProjectRateLines(u);
                                }}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AUD">AUD</SelectItem>
                                    <SelectItem value="NZD">NZD</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="SGD">SGD</SelectItem>
                                    <SelectItem value="CAD">CAD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="INR">INR</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-1 flex items-end justify-end">
                                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setProjectRateLines(projectRateLines.filter((_: any, i: number) => i !== idx))}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => setProjectRateLines([...projectRateLines, { projectName: '', projectCode: '', rateType: formData.rateType, rate: '', clientRate: '', currency: formData.currency || 'AUD', isDefault: false }])}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Rate Line
                          </Button>
                          {formData.isForClient && (formData.clientBillingType || 'rate_based') === 'rate_based' && (
                            <p className="text-xs text-secondary-500 mt-1">Set a client rate per line to charge the correct amount for each rate type (e.g. higher client rate for Sunday work).</p>
                          )}
                        </div>
                      )}

                      {/* Remuneration note — SDP will configure after submission */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                        <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Remuneration breakdown (base pay, allowances, superannuation) will be configured by SDP after contract submission and before the contract is issued to the worker.</span>
                      </div>
                    </div>
                  )}

                  {/* Salary remuneration note */}
                  {formData.rateType === 'annual' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                      <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>SDP will split the CTC into remuneration lines (base salary, superannuation, allowances) and confirm the breakdown before issuing the contract.</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Purchase Orders / SOW */}
              <Card className="bg-secondary-50 border border-secondary-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-secondary-900">Purchase Orders / SOW</h4>
                      <span className="text-xs text-secondary-500">(optional)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPurchaseOrders(!showPurchaseOrders)}
                      className="text-xs"
                    >
                      {showPurchaseOrders ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {showPurchaseOrders ? 'Collapse' : 'This contract has PO / SOW references'}
                    </Button>
                  </div>
                  {showPurchaseOrders && (
                    <div className="mt-4 space-y-3">
                      {purchaseOrderLines.map((po, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-secondary-200 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-secondary-700">PO #{idx + 1}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPurchaseOrderLines(purchaseOrderLines.filter((_: any, i: number) => i !== idx))}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">PO Number *</Label>
                              <Input className="h-9" value={po.poNumber} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].poNumber = e.target.value; setPurchaseOrderLines(u);
                              }} placeholder="e.g. PO-2025-001" />
                            </div>
                            <div>
                              <Label className="text-xs">SOW Number</Label>
                              <Input className="h-9" value={po.sowNumber || ''} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].sowNumber = e.target.value; setPurchaseOrderLines(u);
                              }} placeholder="e.g. SOW-2025-001" />
                            </div>
                            <div>
                              <Label className="text-xs">Project Name *</Label>
                              <Input className="h-9" value={po.projectName} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].projectName = e.target.value; setPurchaseOrderLines(u);
                              }} placeholder="Project name" />
                            </div>
                            <div>
                              <Label className="text-xs">Authorised Value *</Label>
                              <Input className="h-9" type="number" step="0.01" value={po.authorisedValue} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].authorisedValue = e.target.value; setPurchaseOrderLines(u);
                              }} placeholder="0.00" />
                            </div>
                            <div>
                              <Label className="text-xs">Currency</Label>
                              <Select value={po.currency} onValueChange={(v) => {
                                const u = [...purchaseOrderLines]; u[idx].currency = v; setPurchaseOrderLines(u);
                              }}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="AUD">AUD</SelectItem>
                                  <SelectItem value="NZD">NZD</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="SGD">SGD</SelectItem>
                                  <SelectItem value="CAD">CAD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="INR">INR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Start Date</Label>
                              <Input className="h-9" type="date" value={po.startDate || ''} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].startDate = e.target.value; setPurchaseOrderLines(u);
                              }} />
                            </div>
                            <div>
                              <Label className="text-xs">End Date</Label>
                              <Input className="h-9" type="date" value={po.endDate || ''} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].endDate = e.target.value; setPurchaseOrderLines(u);
                              }} />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs">Notes</Label>
                              <Input className="h-9" value={po.notes || ''} onChange={(e) => {
                                const u = [...purchaseOrderLines]; u[idx].notes = e.target.value; setPurchaseOrderLines(u);
                              }} placeholder="Additional notes" />
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setPurchaseOrderLines([...purchaseOrderLines, { poNumber: '', sowNumber: '', projectName: '', authorisedValue: '', currency: formData.currency || 'AUD', startDate: '', endDate: '', notes: '' }])}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add PO / SOW
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SDP Entity Selection */}
              <Card className="bg-secondary-50 border border-secondary-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-secondary-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-secondary-600" />
                    SDP Entity
                  </h4>
                  {formData.countryId ? (
                    (() => {
                      const selectedCountryObj = countries.find((c: any) => c.id === formData.countryId);
                      return (
                        <div>
                          <p className="text-sm text-secondary-600 mb-2">The SDP entity that will handle billing and compliance for this contract:</p>
                          <div className="p-3 bg-white rounded border border-secondary-200 text-sm font-medium text-secondary-900">
                            {selectedCountryObj?.sdpEntity || `SDP ${selectedCountryObj?.name || 'Entity'}`}
                          </div>
                          <p className="text-xs text-secondary-500 mt-1">The selected entity will be used as the billing entity on all invoices for this contract.</p>
                          <input type="hidden" value={formData.countryId} onChange={() => {}} />
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-sm text-secondary-400">Select a work location in step 1 to determine the SDP entity.</p>
                  )}
                </CardContent>
              </Card>

              {/* Timesheet Requirements */}
              <Card className="bg-secondary-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-secondary-900 mb-4">Timesheet Requirements</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="requiresTimesheet"
                        data-testid="checkbox-requires-timesheet"
                        checked={formData.requiresTimesheet}
                        onChange={(e) => setFormData({ ...formData, requiresTimesheet: e.target.checked })}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <Label htmlFor="requiresTimesheet" className="text-sm font-medium text-secondary-900">
                        Worker must submit timesheets
                      </Label>
                    </div>
                    
                    {formData.requiresTimesheet && (
                      <>
                        <div>
                          <Label htmlFor="timesheetFrequency">Timesheet Frequency</Label>
                          <Select
                            value={formData.timesheetFrequency}
                            onValueChange={(value) => setFormData({ ...formData, timesheetFrequency: value })}
                          >
                            <SelectTrigger data-testid="select-timesheet-frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="fortnightly">Fortnightly</SelectItem>
                              <SelectItem value="semi_monthly">Semi-monthly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="timesheetCalculationMethod" className="flex items-center gap-2">
                            Period Calculation Method
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 h-auto">
                                  <HelpCircle className="h-4 w-4 text-secondary-500" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-secondary-900">How Period Calculation Works</h4>
                                  <p className="text-sm text-secondary-700">
                                    This determines how timesheet periods are calculated:
                                  </p>
                                  <ul className="text-sm text-secondary-700 space-y-1 list-disc list-inside">
                                    <li><strong>Weekly:</strong> Select the week cycle (e.g., Monday-Sunday, Tuesday-Monday). First period starts from contract start date and ends on the last day of that week cycle.</li>
                                    <li><strong>Fortnightly Week 1:</strong> Fortnight ends in the week when contract started. First period is partial, second is full fortnight.</li>
                                    <li><strong>Fortnightly Week 2:</strong> Fortnight continues into the following week. First period is longer, next is full fortnight.</li>
                                    <li><strong>Semi-monthly:</strong> Periods are 1st-15th and 16th-end of month.</li>
                                    <li><strong>Monthly:</strong> Specify which day of month the period starts (1-28). Period runs from this day to the day before in the next month.</li>
                                  </ul>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </Label>
                          {formData.timesheetFrequency === 'weekly' && (
                            <Select
                              value={formData.timesheetCalculationMethod}
                              onValueChange={(value) => setFormData({ ...formData, timesheetCalculationMethod: value })}
                            >
                              <SelectTrigger data-testid="select-calculation-method">
                                <SelectValue placeholder="Select week cycle..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monday_sunday">Monday to Sunday</SelectItem>
                                <SelectItem value="tuesday_monday">Tuesday to Monday</SelectItem>
                                <SelectItem value="wednesday_tuesday">Wednesday to Tuesday</SelectItem>
                                <SelectItem value="thursday_wednesday">Thursday to Wednesday</SelectItem>
                                <SelectItem value="friday_thursday">Friday to Thursday</SelectItem>
                                <SelectItem value="saturday_friday">Saturday to Friday</SelectItem>
                                <SelectItem value="sunday_saturday">Sunday to Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {formData.timesheetFrequency === 'fortnightly' && (
                            <Select
                              value={formData.timesheetCalculationMethod}
                              onValueChange={(value) => setFormData({ ...formData, timesheetCalculationMethod: value })}
                            >
                              <SelectTrigger data-testid="select-calculation-method">
                                <SelectValue placeholder="Select fortnight cycle..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="week_1">Week 1 (Fortnight ends in start week)</SelectItem>
                                <SelectItem value="week_2">Week 2 (Fortnight continues to next week)</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {formData.timesheetFrequency === 'monthly' && (
                            <Input
                              id="timesheetCalculationMethod"
                              data-testid="input-calculation-method"
                              type="number"
                              min="1"
                              max="28"
                              value={formData.timesheetCalculationMethod}
                              onChange={(e) => setFormData({ ...formData, timesheetCalculationMethod: e.target.value })}
                              placeholder="Period start day (1-28)"
                            />
                          )}
                          {formData.timesheetFrequency === 'semi_monthly' && (
                            <div className="p-3 bg-secondary-50 rounded-md border border-secondary-200">
                              <p className="text-sm text-secondary-700">
                                Semi-monthly periods: <strong>1st-15th</strong> and <strong>16th-end of month</strong>
                              </p>
                              <input type="hidden" value="1st_15th" onChange={(e) => setFormData({ ...formData, timesheetCalculationMethod: '1st_15th' })} />
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="mb-3 block">Payment Schedule</Label>
                          <RadioGroup
                            value={formData.paymentScheduleType}
                            onValueChange={(value) => setFormData({ ...formData, paymentScheduleType: value })}
                            className="space-y-3"
                          >
                            <div className="flex items-start space-x-3 p-4 border border-secondary-300 rounded-lg">
                              <RadioGroupItem value="days_after" id="days_after" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="days_after" className="cursor-pointer">
                                  <div className="font-medium text-secondary-900">Days After Period End</div>
                                  <div className="text-sm text-secondary-600 mt-1">Pay is calculated as number of days after the period ends</div>
                                </Label>
                                {formData.paymentScheduleType === 'days_after' && (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formData.paymentDaysAfterPeriod}
                                    onChange={(e) => setFormData({ ...formData, paymentDaysAfterPeriod: parseInt(e.target.value) || 0 })}
                                    placeholder="Number of days"
                                    className="mt-2"
                                    data-testid="input-payment-days-after-period"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-4 border border-secondary-300 rounded-lg">
                              <RadioGroupItem value="specific_day" id="specific_day" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="specific_day" className="cursor-pointer">
                                  <div className="font-medium text-secondary-900">Specific Payment Day</div>
                                  <div className="text-sm text-secondary-600 mt-1">Pay on the first occurrence of this day after period end</div>
                                </Label>
                                {formData.paymentScheduleType === 'specific_day' && (
                                  <Select
                                    value={formData.paymentDay}
                                    onValueChange={(value) => setFormData({ ...formData, paymentDay: value })}
                                  >
                                    <SelectTrigger className="mt-2" data-testid="select-payment-day">
                                      <SelectValue placeholder="Select payment day..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="monday">Monday</SelectItem>
                                      <SelectItem value="tuesday">Tuesday</SelectItem>
                                      <SelectItem value="wednesday">Wednesday</SelectItem>
                                      <SelectItem value="thursday">Thursday</SelectItem>
                                      <SelectItem value="friday">Friday</SelectItem>
                                      <SelectItem value="saturday">Saturday</SelectItem>
                                      <SelectItem value="sunday">Sunday</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="paymentHolidayRule"
                            data-testid="checkbox-payment-holiday-rule"
                            checked={formData.paymentHolidayRule}
                            onCheckedChange={(checked) => setFormData({ ...formData, paymentHolidayRule: checked as boolean })}
                          />
                          <Label htmlFor="paymentHolidayRule" className="text-sm font-medium text-secondary-900">
                            Pay on previous working day if holiday
                          </Label>
                        </div>

                        {formData.startDate && formData.timesheetCalculationMethod && (
                          <div className="pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowPeriodPreview(true)}
                              className="w-full"
                              data-testid="button-preview-periods"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Preview Timesheet Periods & Pay Dates
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notice Period */}
              <Card className="bg-secondary-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-secondary-900 mb-4">Notice Period</h4>
                  <div>
                    <Label htmlFor="noticePeriodDays">Notice Period (Days)</Label>
                    <Input
                      id="noticePeriodDays"
                      data-testid="input-notice-period-days"
                      type="number"
                      min="0"
                      value={formData.noticePeriodDays}
                      onChange={(e) => setFormData({ ...formData, noticePeriodDays: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-sm text-secondary-600 mt-2">
                      Either party may terminate this agreement by giving this many days notice
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                >
                  Back to Billing Setup
                </Button>
                <div className="space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type={
                      (user as any)?.userType === 'sdp_internal' || 
                      (formData.employmentType === 'contractor' && !formData.contractorCompliance)
                        ? 'button' 
                        : 'submit'
                    }
                    disabled={createContractMutation.isPending}
                    onClick={
                      (user as any)?.userType === 'sdp_internal' || 
                      (formData.employmentType === 'contractor' && !formData.contractorCompliance)
                        ? (e) => {
                            e.preventDefault();
                            setStep(5);
                          }
                        : undefined
                    }
                  >
                    {createContractMutation.isPending ? 'Creating...' : 
                     (user as any)?.userType === 'sdp_internal' || 
                     (formData.employmentType === 'contractor' && !formData.contractorCompliance)
                       ? 'Continue to Contract Generation' 
                       : 'Submit Contract Request'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              {/* Contract Generation and E-Signature */}
              <div className="space-y-6">
                {formData.rateType === 'annual' ? (
                  <Card className="bg-amber-50 border border-amber-300">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                        <InfoIcon className="h-5 w-5 text-amber-700" />
                        Contract Submitted for SDP Review
                      </h4>
                      <p className="text-sm text-amber-800">
                        SDP Global Pay will review this contract, confirm the pay breakdown across base salary, allowances, and superannuation/pension, and begin onboarding within 24 hours. You will be notified by email once the contract is ready to issue to the worker.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-green-50 border border-green-200">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Ready to Issue Contract
                      </h4>
                      <p className="text-sm text-green-700">
                        {(user as any)?.userType === 'sdp_internal' 
                          ? `This ${formData.employmentType.replace(/_/g, ' ')} contract is ready for generation and can be issued directly.`
                          : `Your ${formData.employmentType === 'contractor' ? 'independent contractor' : 'third party company'} engagement can be issued directly.`}
                        {' '}Review the contract details below and send for e-signature.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Contract Summary */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-secondary-900 mb-4">Contract Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Worker:</span> {workers.find((w: any) => w.id === formData.workerId)?.firstName} {workers.find((w: any) => w.id === formData.workerId)?.lastName}
                      </div>
                      <div>
                        <span className="font-medium">Role:</span> {formData.customRoleTitle || roleTitles.find((r: any) => r.id === formData.roleTitleId)?.title}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {formData.employmentType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                      <div>
                        <span className="font-medium">Country:</span> {countries.find((c: any) => c.id === formData.countryId)?.name}
                      </div>
                      <div>
                        {formData.rateType === 'annual'
                          ? <><span className="font-medium">Total Package (CTC):</span> {formData.currency} {formData.totalPackageValue} per year</>
                          : <><span className="font-medium">Rate:</span> {formData.currency} {formData.rate} / {formData.rateType}{formData.rateStructure === 'multiple' ? ' (multiple rates)' : ''}</>
                        }
                      </div>
                      <div>
                        <span className="font-medium">Period:</span> {formData.startDate} to {formData.endDate || 'Ongoing'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview and Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={previewContractMutation.isPending}
                    onClick={async () => {
                      if (!formData.templateId || !formData.workerId) {
                        toast({
                          title: "Missing Information",
                          description: "Please select a template and worker before previewing.",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Prepare contract data for preview
                      const contractData = {
                        agreementDate: new Date().toLocaleDateString(),
                        serviceDescription: formData.roleDescription,
                        startDate: formData.startDate,
                        endDate: formData.endDate,
                        rateAmount: formData.rate,
                        rateCurrency: formData.currency,
                        rateType: formData.rateType,
                      };

                      try {
                        // For super admin users, get the business from the selected worker
                        const selectedWorker = workers.find((w: any) => w.id === formData.workerId);
                        const businessId = selectedWorker?.businessId || (user as any)?.business?.id;
                        
                        if (!businessId) {
                          toast({
                            title: "Business Not Found",
                            description: "Unable to determine business for contract preview. Please ensure the worker is associated with a business.",
                            variant: "destructive",
                          });
                          return;
                        }

                        const result = await previewContractMutation.mutateAsync({
                          templateId: formData.templateId,
                          businessId: businessId,
                          workerId: formData.workerId,
                          contractData
                        });

                        // Try to open contract in new window, with fallback for popup blockers
                        console.log('Opening contract preview with content length:', result.content?.length);
                        
                        const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
                        
                        if (newWindow) {
                          console.log('New window opened successfully');
                          newWindow.document.write(`
                            <html>
                              <head>
                                <title>Contract Preview - ${result.templateName || 'Contract'}</title>
                                <style>
                                  body {
                                    font-family: 'Times New Roman', Times, serif;
                                    line-height: 1.6;
                                    max-width: 800px;
                                    margin: 0 auto;
                                    padding: 40px 20px;
                                    background: #fff;
                                    color: #333;
                                  }
                                  h1, h2, h3 { color: #2c3e50; }
                                  .header { text-align: center; margin-bottom: 30px; }
                                  .contract-body { 
                                    white-space: pre-line;
                                    word-wrap: break-word;
                                  }
                                  @media print {
                                    body { padding: 20px; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <h1>CONTRACT PREVIEW</h1>
                                  <p><em>This is a preview of the fully merged contract template</em></p>
                                </div>
                                <div class="contract-body">${result.content || 'No content available'}</div>
                                <script>
                                  console.log('Contract preview loaded');
                                </script>
                              </body>
                            </html>
                          `);
                          newWindow.document.close();
                          newWindow.focus();
                        } else {
                          console.warn('Popup blocked - showing fallback toast');
                          toast({
                            title: "Popup Blocked",
                            description: "Your browser blocked the popup window. Please disable popup blocker for this site or try again.",
                            variant: "destructive",
                          });
                          
                          // Fallback: Show content in current tab
                          const blob = new Blob([`
                            <html>
                              <head><title>Contract Preview</title></head>
                              <body style="font-family: Arial; max-width: 800px; margin: 20px auto; padding: 20px;">
                                <h1>Contract Preview</h1>
                                <pre style="white-space: pre-wrap; word-wrap: break-word;">${result.content || 'No content available'}</pre>
                              </body>
                            </html>
                          `], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                        }
                      } catch (error) {
                        console.error('Contract preview error:', error);
                      }
                    }}
                  >
                    {previewContractMutation.isPending ? (
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    {previewContractMutation.isPending ? 'Generating Preview...' : 'Preview Contract'}
                  </Button>
                  
                  <Button
                    type="submit"
                    className={`flex-1 ${formData.rateType === 'annual' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                    disabled={createContractMutation.isPending}
                  >
                    {createContractMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        {formData.rateType === 'annual' ? 'Submitting to SDP...' : 'Generating Contract...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {formData.rateType === 'annual' ? 'Submit to SDP' : 'Generate Contract'}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(4)}
                >
                  Back to Contract Details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>

      {/* Period Preview Dialog */}
      <Dialog open={showPeriodPreview} onOpenChange={setShowPeriodPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timesheet Periods & Pay Dates Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary-100 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Frequency:</strong> {formData.timesheetFrequency}</div>
                <div><strong>Contract Start Date:</strong> {formData.startDate}</div>
                <div><strong>Calculation Method:</strong> {formData.timesheetCalculationMethod}</div>
                <div><strong>Payment Schedule:</strong> {formData.paymentScheduleType === 'days_after' ? `${formData.paymentDaysAfterPeriod} days after period end` : `Every ${formData.paymentDay}`}</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary-100">
                  <tr>
                    <th className="p-3 text-left font-semibold">Period #</th>
                    <th className="p-3 text-left font-semibold">Period Start</th>
                    <th className="p-3 text-left font-semibold">Period End</th>
                    <th className="p-3 text-left font-semibold">Pay Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const periods = [];
                    // Parse dates as local dates to avoid timezone issues
                    const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
                    const contractStartDate = new Date(startYear, startMonth - 1, startDay);
                    const contractEndDate = formData.endDate ? (() => {
                      const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
                      return new Date(endYear, endMonth - 1, endDay);
                    })() : null;
                    const maxPeriods = contractEndDate ? 100 : 8; // Show 6-8 periods if no end date, or all periods if end date exists
                    
                    let currentPeriodStart = new Date(contractStartDate);
                    
                    // Helper function to get day of week from calculation method
                    const getDayOfWeek = (method: string) => {
                      const dayMap: { [key: string]: number } = {
                        'monday_sunday': 1, // Monday
                        'tuesday_monday': 2,
                        'wednesday_tuesday': 3,
                        'thursday_wednesday': 4,
                        'friday_thursday': 5,
                        'saturday_friday': 6,
                        'sunday_saturday': 0
                      };
                      return dayMap[method] ?? 1;
                    };
                    
                    for (let i = 0; i < maxPeriods; i++) {
                      // Check if period start is already past contract end date
                      if (contractEndDate && currentPeriodStart > contractEndDate) {
                        break;
                      }
                      
                      let periodEnd = new Date(currentPeriodStart);
                      
                      // Calculate period end based on frequency
                      switch (formData.timesheetFrequency) {
                        case 'weekly': {
                          // Get the target end day (last day of the week cycle)
                          const weekStartDay = getDayOfWeek(formData.timesheetCalculationMethod);
                          const weekEndDay = weekStartDay === 0 ? 6 : weekStartDay - 1; // Day before the start day
                          
                          // Find the next occurrence of the week end day
                          let daysToAdd = weekEndDay - currentPeriodStart.getDay();
                          if (daysToAdd < 0) daysToAdd += 7;
                          if (i > 0 && daysToAdd === 0) daysToAdd = 7; // For subsequent periods, ensure full week
                          
                          periodEnd.setDate(periodEnd.getDate() + daysToAdd);
                          break;
                        }
                        case 'fortnightly': {
                          // Calculate based on Week 1 or Week 2
                          const startDay = currentPeriodStart.getDay();
                          
                          if (formData.timesheetCalculationMethod === 'week_1') {
                            // Week 1: Fortnight ends in the week when contract started
                            if (i === 0) {
                              // First period: partial week until end of current week (Sunday)
                              const daysUntilSunday = 7 - startDay;
                              periodEnd.setDate(periodEnd.getDate() + daysUntilSunday);
                            } else {
                              // Subsequent periods: full 14 days
                              periodEnd.setDate(periodEnd.getDate() + 13);
                            }
                          } else {
                            // Week 2: Fortnight continues to next week
                            if (i === 0) {
                              // First period: goes into next week (to Sunday of next week)
                              const daysUntilSunday = 7 - startDay;
                              periodEnd.setDate(periodEnd.getDate() + daysUntilSunday + 7);
                            } else {
                              // Subsequent periods: full 14 days
                              periodEnd.setDate(periodEnd.getDate() + 13);
                            }
                          }
                          break;
                        }
                        case 'semi_monthly': {
                          // Simple: 1st-15th and 16th-end of month
                          const currentDay = currentPeriodStart.getDate();
                          const currentMonth = currentPeriodStart.getMonth();
                          const currentYear = currentPeriodStart.getFullYear();
                          
                          if (currentDay <= 15) {
                            // Period ends on 15th
                            periodEnd = new Date(currentYear, currentMonth, 15);
                          } else {
                            // Period ends on last day of month
                            periodEnd = new Date(currentYear, currentMonth + 1, 0);
                          }
                          break;
                        }
                        case 'monthly': {
                          // Monthly with custom start day
                          const periodStartDay = parseInt(formData.timesheetCalculationMethod) || 1;
                          const currentDay = currentPeriodStart.getDate();
                          const currentMonth = currentPeriodStart.getMonth();
                          const currentYear = currentPeriodStart.getFullYear();
                          
                          if (currentDay < periodStartDay) {
                            // Period ends day before the start day in same month
                            periodEnd = new Date(currentYear, currentMonth, periodStartDay - 1);
                          } else {
                            // Period ends day before the start day in next month
                            periodEnd = new Date(currentYear, currentMonth + 1, periodStartDay - 1);
                          }
                          break;
                        }
                      }
                      
                      // Adjust if we've passed the contract end date
                      if (contractEndDate && periodEnd > contractEndDate) {
                        periodEnd = new Date(contractEndDate);
                        periods.push({ 
                          number: i + 1, 
                          start: new Date(currentPeriodStart), 
                          end: periodEnd,
                          payDate: calculatePayDate(periodEnd, formData.paymentScheduleType, formData.paymentDay, formData.paymentDaysAfterPeriod)
                        });
                        break;
                      }
                      
                      periods.push({ 
                        number: i + 1, 
                        start: new Date(currentPeriodStart), 
                        end: periodEnd,
                        payDate: calculatePayDate(periodEnd, formData.paymentScheduleType, formData.paymentDay, formData.paymentDaysAfterPeriod)
                      });
                      
                      // Set next period start (day after period end)
                      currentPeriodStart = new Date(periodEnd);
                      currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
                    }
                    
                    return periods.map(period => (
                      <tr key={period.number} className="border-t">
                        <td className="p-3">{period.number}</td>
                        <td className="p-3">{period.start.toLocaleDateString()}</td>
                        <td className="p-3">{period.end.toLocaleDateString()}</td>
                        <td className="p-3 font-semibold text-accent-600">{period.payDate.toLocaleDateString()}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            
            <p className="text-sm text-secondary-600">
              {formData.endDate ? 'Showing periods until contract end date' : 'Showing first 8 periods (contract has no end date)'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// Helper function to calculate pay date based on payment schedule
function calculatePayDate(periodEnd: Date, scheduleType: string, paymentDay: string, daysAfter: number): Date {
  const payDate = new Date(periodEnd);
  
  if (scheduleType === 'days_after') {
    payDate.setDate(payDate.getDate() + daysAfter);
    return payDate;
  }
  
  // For specific day, find the next occurrence of that day
  const dayMap: { [key: string]: number } = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };
  
  const targetDay = dayMap[paymentDay] || 0;
  const currentDay = payDate.getDay();
  let daysToAdd = targetDay - currentDay;
  
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  
  payDate.setDate(payDate.getDate() + daysToAdd);
  return payDate;
}
