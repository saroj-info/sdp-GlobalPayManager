import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { personalDetailsSchema, businessStructureSchema, bankDetailsSchema, taxDetailsSchema, Worker } from "@shared/schema";
import { User, Building, CreditCard, FileText, Phone, Mail, MapPin, Calendar, Edit, Save, X, Shield, PiggyBank, Globe } from "lucide-react";

type PersonalDetailsData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
};

type BusinessStructureData = {
  businessStructure: 'sole_trader' | 'company' | 'partnership' | 'trust';
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  acn?: string;
  gstRegistered: boolean;
  gstNumber?: string;
};

type BankDetailsData = {
  accountName: string;
  bankName: string;
  bsb?: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  // Australia - Superannuation
  superFundName?: string;
  superFundAbn?: string;
  superMemberNumber?: string;
  superFundAddress?: string;
  // New Zealand - KiwiSaver
  kiwiSaverProvider?: string;
  kiwiSaverNumber?: string;
  // USA - 401k
  plan401kProvider?: string;
  plan401kNumber?: string;
  // UK - Pension
  pensionProvider?: string;
  pensionNumber?: string;
  // Canada - CPP/QPP
  cppNumber?: string;
  qppNumber?: string;
};

type TaxDetailsData = {
  taxFileNumber?: string;
  abn?: string;
  acn?: string;
  gstRegistered: boolean;
  gstNumber?: string;
  // New Zealand
  irdNumber?: string;
  // USA
  ssn?: string;
  ein?: string;
  // UK
  niNumber?: string;
  utrNumber?: string;
  // Canada
  sin?: string;
  businessNumber?: string;
  // Additional tax declaration fields
  taxFreeThreshold?: boolean;
  studentLoan?: boolean;
  seniorsTaxOffset?: boolean;
  residencyStatus?: string;
  taxCode?: string;
  kiwiSaverMember?: boolean;
  studentLoanDeduction?: boolean;
  filingStatus?: string;
  multipleJobs?: boolean;
  dependents?: number;
  additionalWithholding?: string;
  pensionContribution?: boolean;
  basicPersonalAmount?: boolean;
  spouseAmount?: boolean;
  dependentAmount?: number;
  additionalDeductions?: string;
};

// Country-specific field configurations
const getCountryTaxFields = (countryId: string) => {
  switch (countryId) {
    case 'au':
      return [
        { name: 'taxFileNumber', label: 'Tax File Number (TFN)', placeholder: '123 456 789', required: true },
        { name: 'abn', label: 'Australian Business Number (ABN)', placeholder: '12 345 678 901', required: false },
        { name: 'acn', label: 'Australian Company Number (ACN)', placeholder: '123 456 789', required: false },
        { name: 'gstRegistered', label: 'GST Registered', type: 'checkbox' },
        { name: 'gstNumber', label: 'GST Number', placeholder: '12 345 678 901', required: false }
      ];
    case 'nz':
      return [
        { name: 'irdNumber', label: 'IRD Number', placeholder: '123-456-789', required: true }
      ];
    case 'us':
      return [
        { name: 'ssn', label: 'Social Security Number (SSN)', placeholder: '123-45-6789', required: true },
        { name: 'ein', label: 'Employer Identification Number (EIN)', placeholder: '12-3456789', required: false }
      ];
    case 'uk':
      return [
        { name: 'niNumber', label: 'National Insurance Number', placeholder: 'AB123456C', required: true },
        { name: 'utrNumber', label: 'Unique Taxpayer Reference (UTR)', placeholder: '1234567890', required: false }
      ];
    case 'ca':
      return [
        { name: 'sin', label: 'Social Insurance Number (SIN)', placeholder: '123 456 789', required: true },
        { name: 'businessNumber', label: 'Business Number', placeholder: '123456789RP0001', required: false }
      ];
    default:
      return [
        { name: 'taxFileNumber', label: 'Tax Identification Number', placeholder: 'Enter tax ID', required: true }
      ];
  }
};

const getCountryPensionFields = (countryId: string) => {
  switch (countryId) {
    case 'au':
      return [
        { name: 'superFundName', label: 'Superannuation Fund Name', placeholder: 'e.g., AustralianSuper', required: true },
        { name: 'superFundAbn', label: 'Super Fund ABN', placeholder: '12 345 678 901', required: true },
        { name: 'superMemberNumber', label: 'Member Number', placeholder: 'Your member number', required: true },
        { name: 'superFundAddress', label: 'Super Fund Address', placeholder: 'Fund postal address', required: false }
      ];
    case 'nz':
      return [
        { name: 'kiwiSaverProvider', label: 'KiwiSaver Provider', placeholder: 'e.g., ANZ KiwiSaver', required: false },
        { name: 'kiwiSaverNumber', label: 'KiwiSaver Number', placeholder: 'Your member number', required: false }
      ];
    case 'us':
      return [
        { name: 'plan401kProvider', label: '401(k) Plan Provider', placeholder: 'e.g., Fidelity', required: false },
        { name: 'plan401kNumber', label: '401(k) Account Number', placeholder: 'Your account number', required: false }
      ];
    case 'uk':
      return [
        { name: 'pensionProvider', label: 'Pension Provider', placeholder: 'e.g., NEST', required: false },
        { name: 'pensionNumber', label: 'Pension Number', placeholder: 'Your pension number', required: false }
      ];
    case 'ca':
      return [
        { name: 'cppNumber', label: 'Canada Pension Plan (CPP) Number', placeholder: 'Your CPP number', required: false },
        { name: 'qppNumber', label: 'Quebec Pension Plan (QPP) Number', placeholder: 'Your QPP number', required: false }
      ];
    default:
      return [];
  }
};

// Country-specific tax declaration configurations
const getCountryTaxDeclaration = (countryId: string) => {
  switch (countryId) {
    case 'au':
      return {
        title: 'Tax File Number Declaration',
        description: 'Complete your TFN declaration for payroll purposes',
        fields: [
          { name: 'taxFileNumber', label: 'Tax File Number (TFN)', placeholder: '123 456 789', required: true, type: 'text' },
          { name: 'taxFreeThreshold', label: 'Claim Tax-Free Threshold', type: 'checkbox', description: 'Tick if this is your main job and you want to claim the tax-free threshold' },
          { name: 'studentLoan', label: 'HELP/Student Loan Debt', type: 'checkbox', description: 'Tick if you have a Higher Education Loan Program (HELP) debt' },
          { name: 'seniorsTaxOffset', label: 'Seniors Tax Offset', type: 'checkbox', description: 'Tick if you are eligible for seniors tax offset' },
          { name: 'residencyStatus', label: 'Tax Residency Status', type: 'select', options: [
            { value: 'resident', label: 'Australian Resident for Tax Purposes' },
            { value: 'foreign_resident', label: 'Foreign Resident' },
            { value: 'working_holiday', label: 'Working Holiday Maker' }
          ]}
        ]
      };
    case 'nz':
      return {
        title: 'Tax Code Declaration', 
        description: 'Complete your tax code declaration for PAYE purposes',
        fields: [
          { name: 'irdNumber', label: 'IRD Number', placeholder: '123-456-789', required: true, type: 'text' },
          { name: 'taxCode', label: 'Tax Code', type: 'select', options: [
            { value: 'M', label: 'M - Main source of income' },
            { value: 'S', label: 'S - Secondary source of income' },
            { value: 'SB', label: 'SB - Secondary source with benefit' },
            { value: 'SH', label: 'SH - Secondary source higher rate' }
          ]},
          { name: 'kiwiSaverMember', label: 'KiwiSaver Member', type: 'checkbox', description: 'Tick if you are a KiwiSaver member' },
          { name: 'studentLoanDeduction', label: 'Student Loan Deduction', type: 'checkbox', description: 'Tick if you have a student loan requiring deductions' }
        ]
      };
    case 'us':
      return {
        title: 'Form W-4 (Employee\'s Withholding Certificate)',
        description: 'Complete your federal tax withholding information',
        fields: [
          { name: 'ssn', label: 'Social Security Number', placeholder: '123-45-6789', required: true, type: 'text' },
          { name: 'filingStatus', label: 'Filing Status', type: 'select', options: [
            { value: 'single', label: 'Single or Married filing separately' },
            { value: 'married_joint', label: 'Married filing jointly' },
            { value: 'head_household', label: 'Head of household' }
          ]},
          { name: 'multipleJobs', label: 'Multiple Jobs or Spouse Works', type: 'checkbox', description: 'Check if you have multiple jobs or are married filing jointly and spouse also works' },
          { name: 'dependents', label: 'Number of Dependents', type: 'number', placeholder: '0' },
          { name: 'additionalWithholding', label: 'Additional Withholding Amount', type: 'text', placeholder: '$0' }
        ]
      };
    case 'uk':
      return {
        title: 'PAYE Tax Declaration',
        description: 'Complete your PAYE tax and National Insurance information',
        fields: [
          { name: 'niNumber', label: 'National Insurance Number', placeholder: 'AB123456C', required: true, type: 'text' },
          { name: 'taxCode', label: 'Tax Code', placeholder: '1257L', type: 'text', description: 'Your current tax code (if known)' },
          { name: 'studentLoan', label: 'Student Loan Plan', type: 'select', options: [
            { value: 'none', label: 'No student loan' },
            { value: 'plan1', label: 'Plan 1' },
            { value: 'plan2', label: 'Plan 2' },
            { value: 'postgrad', label: 'Postgraduate loan' }
          ]},
          { name: 'pensionContribution', label: 'Pension Auto-Enrolment', type: 'checkbox', description: 'Opt into workplace pension auto-enrolment' }
        ]
      };
    case 'ca':
      return {
        title: 'TD1 Tax Declaration',
        description: 'Complete your personal tax credits and deductions',
        fields: [
          { name: 'sin', label: 'Social Insurance Number (SIN)', placeholder: '123 456 789', required: true, type: 'text' },
          { name: 'basicPersonalAmount', label: 'Basic Personal Amount', type: 'checkbox', description: 'Claim basic personal amount' },
          { name: 'spouseAmount', label: 'Spouse or Common-law Partner Amount', type: 'checkbox', description: 'Claim spouse amount if applicable' },
          { name: 'dependentAmount', label: 'Amount for Eligible Dependents', type: 'number', placeholder: '0' },
          { name: 'additionalDeductions', label: 'Additional Tax Deductions', type: 'text', placeholder: '$0' }
        ]
      };
    default:
      return {
        title: 'Tax Declaration',
        description: 'Complete your tax information for payroll purposes',
        fields: [
          { name: 'taxFileNumber', label: 'Tax Identification Number', placeholder: 'Enter tax ID', required: true, type: 'text' }
        ]
      };
  }
};

export default function MyDetailsPage() {
  usePageHeader("My Details", "Manage your personal information, business structure, bank details, and tax information");
  
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect if not a worker
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.userType !== 'worker') {
      window.location.href = '/';
      return;
    }
  }, [isAuthenticated, isLoading, user]);

  // Fetch worker profile
  const { data: workerProfile, isLoading: profileLoading } = useQuery<Worker>({
    queryKey: ["/api/workers/profile"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/countries"],
  });

  const personalForm = useForm<PersonalDetailsData>({
    resolver: zodResolver(personalDetailsSchema),
    mode: "onChange",
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      streetAddress: '',
      suburb: '',
      state: '',
      postcode: '',
    }
  });

  const businessForm = useForm<BusinessStructureData>({
    resolver: zodResolver(businessStructureSchema),
    mode: "onChange",
    defaultValues: {
      businessStructure: 'sole_trader',
      businessName: '',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      abn: '',
      acn: '',
      gstRegistered: false,
      gstNumber: '',
    }
  });

  const bankForm = useForm<BankDetailsData>({
    resolver: zodResolver(bankDetailsSchema),
    mode: "onChange",
    defaultValues: {
      accountName: '',
      bankName: '',
      bsb: '',
      accountNumber: '',
      iban: '',
      swiftCode: '',
      superFundName: '',
      superFundAbn: '',
      superMemberNumber: '',
      superFundAddress: '',
      kiwiSaverProvider: '',
      kiwiSaverNumber: '',
      plan401kProvider: '',
      plan401kNumber: '',
      pensionProvider: '',
      pensionNumber: '',
      cppNumber: '',
      qppNumber: '',
    }
  });

  const taxForm = useForm<TaxDetailsData>({
    resolver: zodResolver(taxDetailsSchema),
    mode: "onChange",
    defaultValues: {
      taxFileNumber: '',
      abn: '',
      acn: '',
      gstRegistered: false,
      gstNumber: '',
      irdNumber: '',
      ssn: '',
      ein: '',
      niNumber: '',
      utrNumber: '',
      sin: '',
      businessNumber: '',
      taxFreeThreshold: false,
      studentLoan: false,
      seniorsTaxOffset: false,
      residencyStatus: '',
      taxCode: '',
      kiwiSaverMember: false,
      studentLoanDeduction: false,
      filingStatus: '',
      multipleJobs: false,
      dependents: 0,
      additionalWithholding: '',
      pensionContribution: false,
      basicPersonalAmount: false,
      spouseAmount: false,
      dependentAmount: 0,
      additionalDeductions: '',
    }
  });

  // Update forms when worker profile loads
  useEffect(() => {
    if (workerProfile) {
      personalForm.reset({
        firstName: workerProfile.firstName || '',
        lastName: workerProfile.lastName || '',
        email: workerProfile.email || '',
        phoneNumber: workerProfile.phoneNumber || '',
        dateOfBirth: workerProfile.dateOfBirth ? new Date(workerProfile.dateOfBirth).toISOString().split('T')[0] : '',
        streetAddress: workerProfile.streetAddress || '',
        suburb: workerProfile.suburb || '',
        state: workerProfile.state || '',
        postcode: workerProfile.postcode || '',
        emergencyContactName: workerProfile.emergencyContactName || '',
        emergencyContactRelationship: workerProfile.emergencyContactRelationship || '',
        emergencyContactPhone: workerProfile.emergencyContactPhone || '',
        emergencyContactEmail: workerProfile.emergencyContactEmail || '',
      });

      businessForm.reset({
        businessStructure: workerProfile.businessStructure || 'sole_trader',
        businessName: workerProfile.businessName || '',
        businessAddress: workerProfile.businessAddress || '',
        businessPhone: workerProfile.businessPhone || '',
        businessEmail: workerProfile.businessEmail || '',
        abn: workerProfile.abn || '',
        acn: workerProfile.acn || '',
        gstRegistered: workerProfile.gstRegistered || false,
        gstNumber: workerProfile.gstNumber || '',
      });

      bankForm.reset({
        accountName: workerProfile.accountName || '',
        bankName: workerProfile.bankName || '',
        bsb: workerProfile.bsb || '',
        accountNumber: workerProfile.accountNumber || '',
        iban: workerProfile.iban || '',
        swiftCode: workerProfile.swiftCode || '',
        superFundName: workerProfile.superFundName || '',
        superFundAbn: workerProfile.superFundAbn || '',
        superMemberNumber: workerProfile.superMemberNumber || '',
        superFundAddress: workerProfile.superFundAddress || '',
        kiwiSaverProvider: workerProfile.kiwiSaverProvider || '',
        kiwiSaverNumber: workerProfile.kiwiSaverNumber || '',
        plan401kProvider: workerProfile.plan401kProvider || '',
        plan401kNumber: workerProfile.plan401kNumber || '',
        pensionProvider: workerProfile.pensionProvider || '',
        pensionNumber: workerProfile.pensionNumber || '',
        cppNumber: workerProfile.cppNumber || '',
        qppNumber: workerProfile.qppNumber || '',
      });

      taxForm.reset({
        taxFileNumber: workerProfile.taxFileNumber || '',
        abn: workerProfile.abn || '',
        acn: workerProfile.acn || '',
        gstRegistered: workerProfile.gstRegistered || false,
        gstNumber: workerProfile.gstNumber || '',
        irdNumber: workerProfile.irdNumber || '',
        ssn: workerProfile.ssn || '',
        ein: workerProfile.ein || '',
        niNumber: workerProfile.niNumber || '',
        utrNumber: workerProfile.utrNumber || '',
        sin: workerProfile.sin || '',
        businessNumber: workerProfile.businessNumber || '',
      });
    }
  }, [workerProfile, personalForm, businessForm, bankForm, taxForm]);

  const updateWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', `/api/workers/profile`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers/profile'] });
      setEditingSection(null);
      toast({
        title: "Success",
        description: "Details updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update details.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSection = async (section: string) => {
    let data: any = {};
    let isValid = false;
    
    switch (section) {
      case 'personal':
        isValid = await personalForm.trigger();
        if (!isValid) {
          toast({
            title: "Error",
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
          });
          return;
        }
        data = personalForm.getValues();
        if (data.dateOfBirth) {
          data.dateOfBirth = new Date(data.dateOfBirth).toISOString();
        }
        break;
      case 'business':
        isValid = await businessForm.trigger();
        if (!isValid) {
          toast({
            title: "Error", 
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
          });
          return;
        }
        data = businessForm.getValues();
        break;
      case 'bank':
        isValid = await bankForm.trigger();
        if (!isValid) {
          toast({
            title: "Error",
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
          });
          return;
        }
        data = bankForm.getValues();
        break;
      case 'tax':
        isValid = await taxForm.trigger();
        if (!isValid) {
          toast({
            title: "Error",
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
          });
          return;
        }
        data = taxForm.getValues();
        break;
    }

    updateWorkerMutation.mutate(data);
  };

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.userType !== 'worker') {
    return null;
  }

  const isContractor = workerProfile?.workerType === 'contractor';
  const isEmployee = workerProfile?.workerType === 'employee';

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Worker Type Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant={isEmployee ? "default" : "secondary"} className="text-sm">
                  {workerProfile?.workerType === 'employee' ? 'Employee' : 'Contractor'}
                </Badge>
                {isContractor && (
                  <Badge variant="outline" className="text-sm">
                    {workerProfile?.businessStructure?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
              </div>
            </div>

            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal
                </TabsTrigger>
                {isContractor && (
                  <TabsTrigger value="business" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Business
                  </TabsTrigger>
                )}
                <TabsTrigger value="bank" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Banking
                </TabsTrigger>
                {isEmployee && (
                  <TabsTrigger value="tax" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Tax Details
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Personal Details */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Details
                      </CardTitle>
                      <CardDescription>
                        Your personal information and contact details
                      </CardDescription>
                    </div>
                    <Button
                      variant={editingSection === 'personal' ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setEditingSection(editingSection === 'personal' ? null : 'personal')}
                      data-testid="button-edit-personal"
                    >
                      {editingSection === 'personal' ? (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Form {...personalForm}>
                      <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={personalForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'personal'}
                                    data-testid="input-first-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={personalForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'personal'}
                                    data-testid="input-last-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={personalForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email"
                                    disabled={editingSection !== 'personal'}
                                    data-testid="input-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={personalForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'personal'}
                                    data-testid="input-phone"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={personalForm.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="date"
                                    disabled={editingSection !== 'personal'}
                                    data-testid="input-date-of-birth"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <FormField
                            control={personalForm.control}
                            name="streetAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'personal'}
                                    data-testid="input-street-address"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={personalForm.control}
                              name="suburb"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Suburb/City</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      data-testid="input-suburb"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={personalForm.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State/Province</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      data-testid="input-state"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={personalForm.control}
                              name="postcode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Postcode/Zip</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      data-testid="input-postcode"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Emergency Contact Section */}
                        <div className="border-t pt-6 mt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">Emergency Contact</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={personalForm.control}
                              name="emergencyContactName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Emergency Contact Name</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      data-testid="input-emergency-contact-name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={personalForm.control}
                              name="emergencyContactRelationship"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Relationship</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      placeholder="e.g., Spouse, Parent, Sibling"
                                      data-testid="input-emergency-contact-relationship"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={personalForm.control}
                              name="emergencyContactPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Emergency Contact Phone</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      data-testid="input-emergency-contact-phone"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={personalForm.control}
                              name="emergencyContactEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Emergency Contact Email</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'personal'}
                                      type="email"
                                      data-testid="input-emergency-contact-email"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {editingSection === 'personal' && (
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingSection(null)}
                              data-testid="button-cancel-personal"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleSaveSection('personal')}
                              disabled={updateWorkerMutation.isPending || !personalForm.formState.isValid}
                              data-testid="button-save-personal"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {updateWorkerMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Business Details (Contractors only) */}
              {isContractor && (
                <TabsContent value="business">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Business Details
                        </CardTitle>
                        <CardDescription>
                          Business registration and tax information for contractors
                        </CardDescription>
                      </div>
                      <Button
                        variant={editingSection === 'business' ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setEditingSection(editingSection === 'business' ? null : 'business')}
                        data-testid="button-edit-business"
                      >
                        {editingSection === 'business' ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Form {...businessForm}>
                        <form className="space-y-4">
                          <FormField
                            control={businessForm.control}
                            name="businessStructure"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Structure</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                  disabled={editingSection !== 'business'}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-business-structure">
                                      <SelectValue placeholder="Select business structure" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="sole_trader">Sole Trader</SelectItem>
                                    <SelectItem value="company">Company</SelectItem>
                                    <SelectItem value="partnership">Partnership</SelectItem>
                                    <SelectItem value="trust">Trust</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={businessForm.control}
                              name="businessName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Business Name</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'business'}
                                      data-testid="input-business-name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={businessForm.control}
                              name="businessEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel>Business Email</FormLabel>
                                    {editingSection === 'business' && (
                                      <button
                                        type="button"
                                        className="text-xs text-primary hover:underline"
                                        onClick={() => businessForm.setValue('businessEmail', personalForm.getValues('email') || '', { shouldValidate: true, shouldDirty: true })}
                                        data-testid="button-same-email"
                                      >
                                        Same as personal
                                      </button>
                                    )}
                                  </div>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="email"
                                      disabled={editingSection !== 'business'}
                                      data-testid="input-business-email"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={businessForm.control}
                              name="abn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ABN (Australian Business Number)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'business'}
                                      data-testid="input-abn"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={businessForm.control}
                              name="acn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ACN (Australian Company Number)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={editingSection !== 'business'}
                                      data-testid="input-acn"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={businessForm.control}
                            name="businessAddress"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel>Business Address</FormLabel>
                                  {editingSection === 'business' && (
                                    <button
                                      type="button"
                                      className="text-xs text-primary hover:underline"
                                      onClick={() => {
                                        const p = personalForm.getValues();
                                        const parts = [p.streetAddress, p.suburb, p.state, p.postcode].filter(Boolean);
                                        businessForm.setValue('businessAddress', parts.join(', '), { shouldValidate: true, shouldDirty: true });
                                      }}
                                      data-testid="button-same-address"
                                    >
                                      Same as personal
                                    </button>
                                  )}
                                </div>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    disabled={editingSection !== 'business'}
                                    data-testid="input-business-address"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="space-y-4">
                            <FormField
                              control={businessForm.control}
                              name="gstRegistered"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={editingSection !== 'business'}
                                      data-testid="checkbox-gst-registered"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>GST/VAT Registered</FormLabel>
                                    <FormDescription>
                                      Check if your business is registered for GST/VAT
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            {businessForm.watch('gstRegistered') && (
                              <FormField
                                control={businessForm.control}
                                name="gstNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>GST/VAT Number</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        disabled={editingSection !== 'business'}
                                        data-testid="input-gst-number"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>

                          {editingSection === 'business' && (
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingSection(null)}
                                data-testid="button-cancel-business"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleSaveSection('business')}
                                disabled={updateWorkerMutation.isPending || !businessForm.formState.isValid}
                                data-testid="button-save-business"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                {updateWorkerMutation.isPending ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          )}
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Bank Details */}
              <TabsContent value="bank">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Banking Details
                      </CardTitle>
                      <CardDescription>
                        {isContractor ? 'Business banking information' : 'Personal banking information for payroll'}
                      </CardDescription>
                    </div>
                    <Button
                      variant={editingSection === 'bank' ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setEditingSection(editingSection === 'bank' ? null : 'bank')}
                      data-testid="button-edit-bank"
                    >
                      {editingSection === 'bank' ? (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Form {...bankForm}>
                      <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={bankForm.control}
                            name="accountName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'bank'}
                                    data-testid="input-account-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={bankForm.control}
                            name="bankName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bank Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'bank'}
                                    data-testid="input-bank-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={bankForm.control}
                            name="bsb"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>BSB (Bank State Branch)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'bank'}
                                    placeholder="For Australian accounts"
                                    data-testid="input-bsb"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={bankForm.control}
                            name="accountNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'bank'}
                                    data-testid="input-account-number"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={bankForm.control}
                            name="iban"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IBAN</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'bank'}
                                    placeholder="For international accounts"
                                    data-testid="input-iban"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={bankForm.control}
                            name="swiftCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SWIFT Code</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    disabled={editingSection !== 'bank'}
                                    placeholder="For international transfers"
                                    data-testid="input-swift-code"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Superannuation/Pension Section (for employees) */}
                        {isEmployee && (
                          <div className="border-t pt-6 mt-6">
                            <div className="flex items-center gap-2 mb-4">
                              <PiggyBank className="h-5 w-5 text-green-600" />
                              <h3 className="text-lg font-semibold">Superannuation Details</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={bankForm.control}
                                name="superFundName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Super Fund Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        disabled={editingSection !== 'bank'}
                                        data-testid="input-super-fund-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={bankForm.control}
                                name="superFundAbn"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Super Fund ABN</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        disabled={editingSection !== 'bank'}
                                        data-testid="input-super-fund-abn"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={bankForm.control}
                                name="superMemberNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Member Number</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        disabled={editingSection !== 'bank'}
                                        data-testid="input-super-member-number"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={bankForm.control}
                                name="superFundAddress"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Super Fund Address</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        {...field} 
                                        disabled={editingSection !== 'bank'}
                                        rows={3}
                                        data-testid="input-super-fund-address"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {editingSection === 'bank' && (
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingSection(null)}
                              data-testid="button-cancel-bank"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleSaveSection('bank')}
                              disabled={updateWorkerMutation.isPending || !bankForm.formState.isValid}
                              data-testid="button-save-bank"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {updateWorkerMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tax Details (Employees only) */}
              {isEmployee && (
                <TabsContent value="tax">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Tax Details
                        </CardTitle>
                        <CardDescription>
                          Tax file declaration and payroll information
                        </CardDescription>
                      </div>
                      <Button
                        variant={editingSection === 'tax' ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setEditingSection(editingSection === 'tax' ? null : 'tax')}
                        data-testid="button-edit-tax"
                      >
                        {editingSection === 'tax' ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const taxDeclaration = getCountryTaxDeclaration(workerProfile?.countryId || 'au');
                        return (
                          <div className="space-y-6">
                            {/* Tax Declaration Form Header */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h3 className="font-semibold text-blue-900 mb-2">{taxDeclaration.title}</h3>
                              <p className="text-sm text-blue-700">{taxDeclaration.description}</p>
                            </div>
                            
                            <Form {...taxForm}>
                              <form className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {taxDeclaration.fields.map((field, index) => {
                                    if (field.type === 'checkbox') {
                                      return (
                                        <FormField
                                          key={field.name}
                                          control={taxForm.control}
                                          name={field.name as any}
                                          render={({ field: formField }) => (
                                            <FormItem className="md:col-span-2 flex flex-row items-start space-x-3 space-y-0">
                                              <FormControl>
                                                <Checkbox
                                                  checked={formField.value}
                                                  onCheckedChange={formField.onChange}
                                                  disabled={editingSection !== 'tax'}
                                                  data-testid={`checkbox-${field.name}`}
                                                />
                                              </FormControl>
                                              <div className="space-y-1 leading-none">
                                                <FormLabel className="text-sm font-medium">
                                                  {field.label}
                                                </FormLabel>
                                                {field.description && (
                                                  <FormDescription>
                                                    {field.description}
                                                  </FormDescription>
                                                )}
                                              </div>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      );
                                    }
                                    
                                    if (field.type === 'select') {
                                      return (
                                        <FormField
                                          key={field.name}
                                          control={taxForm.control}
                                          name={field.name as any}
                                          render={({ field: formField }) => (
                                            <FormItem>
                                              <FormLabel>{field.label}</FormLabel>
                                              <Select 
                                                onValueChange={formField.onChange} 
                                                defaultValue={formField.value}
                                                disabled={editingSection !== 'tax'}
                                              >
                                                <FormControl>
                                                  <SelectTrigger data-testid={`select-${field.name}`}>
                                                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                                  </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                  {field.options?.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                      {option.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              {field.description && (
                                                <FormDescription>
                                                  {field.description}
                                                </FormDescription>
                                              )}
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      );
                                    }
                                    
                                    // Default to text/number input
                                    return (
                                      <FormField
                                        key={field.name}
                                        control={taxForm.control}
                                        name={field.name as any}
                                        render={({ field: formField }) => (
                                          <FormItem>
                                            <FormLabel>
                                              {field.label}
                                              {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </FormLabel>
                                            <FormControl>
                                              <Input 
                                                {...formField}
                                                type={field.type === 'number' ? 'number' : 'text'}
                                                disabled={editingSection !== 'tax'}
                                                placeholder={field.placeholder}
                                                data-testid={`input-${field.name}`}
                                              />
                                            </FormControl>
                                            {field.description && (
                                              <FormDescription>
                                                {field.description}
                                              </FormDescription>
                                            )}
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    );
                                  })}
                                </div>

                                {editingSection === 'tax' && (
                                  <div className="flex justify-end space-x-2 pt-4">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setEditingSection(null)}
                                      data-testid="button-cancel-tax"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => handleSaveSection('tax')}
                                      disabled={updateWorkerMutation.isPending || !taxForm.formState.isValid}
                                      data-testid="button-save-tax"
                                    >
                                      <Save className="h-4 w-4 mr-1" />
                                      {updateWorkerMutation.isPending ? 'Saving...' : 'Save Tax Declaration'}
                                    </Button>
                                  </div>
                                )}
                              </form>
                            </Form>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
    </div>
  );
}