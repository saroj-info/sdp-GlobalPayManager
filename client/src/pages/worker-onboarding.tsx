import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SDPLogo } from "@/components/ui/logo";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, User, Building, CreditCard, FileText, Phone, Mail, MapPin, Calendar } from "lucide-react";

// Step schemas
const personalDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  suburb: z.string().min(1, "Suburb/City is required"),
  state: z.string().min(1, "State/Province is required"),
  postcode: z.string().min(1, "Postcode/Zip code is required"),
});

const businessStructureSchema = z.object({
  businessStructure: z.enum(['sole_trader', 'company', 'partnership', 'trust']),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  abn: z.string().optional(),
  acn: z.string().optional(),
  gstRegistered: z.boolean().default(false),
  gstNumber: z.string().optional(),
});

const bankDetailsSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bsb: z.string().optional(),
  accountNumber: z.string().min(1, "Account number is required"),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
});

const taxDetailsSchema = z.object({
  taxFileNumber: z.string().min(1, "Tax file number is required"),
});

type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;
type BusinessStructureForm = z.infer<typeof businessStructureSchema>;
type BankDetailsForm = z.infer<typeof bankDetailsSchema>;
type TaxDetailsForm = z.infer<typeof taxDetailsSchema>;

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

export default function WorkerOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isContractor, setIsContractor] = useState<boolean | null>(null);
  const [businessStructureType, setBusinessStructureType] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get worker profile to pre-populate forms
  const { data: worker } = useQuery({
    queryKey: ["/api/worker-profile"],
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/countries"],
  });

  // Update worker profile mutation
  const updateWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("/api/worker-profile", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worker-profile"] });
      toast({
        title: "Progress Saved",
        description: "Your information has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save information.",
        variant: "destructive",
      });
    },
  });

  // Personal details form
  const personalForm = useForm<PersonalDetailsForm>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      firstName: worker?.firstName || "",
      lastName: worker?.lastName || "",
      email: worker?.email || "",
      phoneNumber: worker?.phoneNumber || "",
      dateOfBirth: worker?.dateOfBirth ? new Date(worker.dateOfBirth).toISOString().split('T')[0] : "",
      streetAddress: worker?.streetAddress || "",
      suburb: worker?.suburb || "",
      state: worker?.state || "",
      postcode: worker?.postcode || "",
    },
  });

  // Business structure form
  const businessForm = useForm<BusinessStructureForm>({
    resolver: zodResolver(businessStructureSchema),
    defaultValues: {
      businessStructure: worker?.businessStructure as any || 'sole_trader',
      businessName: worker?.businessName || "",
      businessAddress: worker?.businessAddress || "",
      businessPhone: worker?.businessPhone || "",
      businessEmail: worker?.businessEmail || "",
      abn: worker?.abn || "",
      acn: worker?.acn || "",
      gstRegistered: worker?.gstRegistered || false,
      gstNumber: worker?.gstNumber || "",
    },
  });

  // Bank details form
  const bankForm = useForm<BankDetailsForm>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountName: worker?.accountName || "",
      bankName: worker?.bankName || "",
      bsb: worker?.bsb || "",
      accountNumber: worker?.accountNumber || "",
      iban: worker?.iban || "",
      swiftCode: worker?.swiftCode || "",
    },
  });

  // Tax details form
  const taxForm = useForm<TaxDetailsForm>({
    resolver: zodResolver(taxDetailsSchema),
    defaultValues: {
      taxFileNumber: worker?.taxFileNumber || "",
    },
  });

  // Determine steps based on worker type and structure
  const getSteps = (): OnboardingStep[] => {
    const baseSteps = [
      {
        id: 1,
        title: "Personal Details",
        description: "Basic personal information and contact details",
        icon: User,
        completed: worker?.personalDetailsCompleted || false,
      },
    ];

    if (isContractor) {
      if (businessStructureType === 'company') {
        baseSteps.push({
          id: 2,
          title: "Company Details",
          description: "Company registration and business information",
          icon: Building,
          completed: worker?.businessDetailsCompleted || false,
        });
      } else if (businessStructureType === 'sole_trader') {
        baseSteps.push({
          id: 2,
          title: "Sole Trader Details",
          description: "Business structure and tax registration",
          icon: FileText,
          completed: worker?.businessDetailsCompleted || false,
        });
      }
    }

    baseSteps.push({
      id: baseSteps.length + 1,
      title: "Bank Details",
      description: "Payment and banking information",
      icon: CreditCard,
      completed: worker?.bankDetailsCompleted || false,
    });

    return baseSteps;
  };

  const steps = getSteps();
  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  // Handle personal details submission
  const handlePersonalDetailsSubmit = async (data: PersonalDetailsForm) => {
    await updateWorkerMutation.mutateAsync({
      ...data,
      personalDetailsCompleted: true,
    });
    
    // Ask about contractor status after personal details
    if (isContractor === null) {
      setIsContractor(worker?.workerType === 'contractor');
      if (worker?.workerType === 'contractor') {
        setBusinessStructureType(worker?.businessStructure || 'sole_trader');
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  // Handle business structure submission
  const handleBusinessStructureSubmit = async (data: BusinessStructureForm) => {
    await updateWorkerMutation.mutateAsync({
      ...data,
      businessDetailsCompleted: true,
    });
    setCurrentStep(currentStep + 1);
  };

  // Handle bank details submission
  const handleBankDetailsSubmit = async (data: BankDetailsForm) => {
    await updateWorkerMutation.mutateAsync({
      ...data,
      bankDetailsCompleted: true,
      onboardingCompleted: true,
    });
    
    toast({
      title: "Onboarding Complete!",
      description: "Welcome to SDP Global Pay. Your profile is now complete.",
    });
    
    // Redirect to dashboard or worker portal
    window.location.href = "/";
  };

  // Handle tax details submission
  const handleTaxDetailsSubmit = async (data: TaxDetailsForm) => {
    await updateWorkerMutation.mutateAsync({
      ...data,
    });
    setCurrentStep(currentStep + 1);
  };

  const getCurrentStepTitle = () => {
    const step = steps.find(s => s.id === currentStep);
    return step?.title || "Getting Started";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <SDPLogo size="lg" variant="horizontal" theme="light" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              Welcome to SDP Global Pay
            </h1>
            <p className="text-secondary-600">
              Let's get your profile set up so you can start working with our platform
            </p>
          </div>

          {/* Progress */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Onboarding Progress</CardTitle>
                <Badge variant="outline">
                  {steps.filter(s => s.completed).length} of {steps.length} completed
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center p-3 rounded-lg border ${
                        currentStep === step.id
                          ? "bg-primary-50 border-primary-200 text-primary-900"
                          : step.completed
                          ? "bg-green-50 border-green-200 text-green-900"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      <div className="mr-3">
                        {step.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Icon className={`h-5 w-5 ${
                            currentStep === step.id ? "text-primary-600" : "text-gray-400"
                          }`} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{step.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {getCurrentStepTitle()}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Please provide your personal information and contact details"}
                {currentStep === 2 && isContractor && businessStructureType === 'company' && "Enter your company registration details"}
                {currentStep === 2 && isContractor && businessStructureType === 'sole_trader' && "Provide your sole trader business information"}
                {currentStep === steps.length && "Finally, add your banking details for payments"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Details Step */}
              {currentStep === 1 && (
                <Form {...personalForm}>
                  <form onSubmit={personalForm.handleSubmit(handlePersonalDetailsSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={personalForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              First Name
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your first name" />
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
                              <Input {...field} placeholder="Enter your last name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={personalForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="Enter your email" />
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
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your phone number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={personalForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date of Birth
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address Details
                      </h3>
                      
                      <FormField
                        control={personalForm.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your street address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={personalForm.control}
                          name="suburb"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Suburb/City</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter suburb or city" />
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
                                <Input {...field} placeholder="Enter state or province" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={personalForm.control}
                        name="postcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postcode/Zip Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter postcode or zip code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateWorkerMutation.isPending}
                        className="bg-primary-600 hover:bg-primary-700"
                      >
                        {updateWorkerMutation.isPending ? "Saving..." : "Continue"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Business Structure Step */}
              {currentStep === 2 && isContractor && (
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(handleBusinessStructureSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Business Structure
                      </h3>

                      <FormField
                        control={businessForm.control}
                        name="businessStructure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Structure Type</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setBusinessStructureType(value);
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
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

                      {businessStructureType === 'company' && (
                        <>
                          <FormField
                            control={businessForm.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter company name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="businessAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Address</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Enter business address" rows={3} />
                                </FormControl>
                                <FormDescription>
                                  Leave blank if same as personal address
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={businessForm.control}
                              name="businessPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Business Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Business phone number" />
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
                                  <FormLabel>Business Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" placeholder="Business email address" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={businessForm.control}
                            name="acn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ACN (Australian Company Number)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter ACN" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <FormField
                        control={businessForm.control}
                        name="abn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              ABN (Australian Business Number)
                              {businessStructureType === 'sole_trader' && " - Tax Number"}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter ABN" />
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
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Registered for GST/VAT
                                </FormLabel>
                                <FormDescription>
                                  Check this if you are registered for Goods and Services Tax
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        {businessForm.watch("gstRegistered") && (
                          <FormField
                            control={businessForm.control}
                            name="gstNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GST Registration Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter GST number" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCurrentStep(currentStep - 1)}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateWorkerMutation.isPending}
                        className="bg-primary-600 hover:bg-primary-700"
                      >
                        {updateWorkerMutation.isPending ? "Saving..." : "Continue"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}

              {/* Bank Details Step */}
              {currentStep === steps.length && (
                <Form {...bankForm}>
                  <form onSubmit={bankForm.handleSubmit(handleBankDetailsSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Banking Information
                      </h3>
                      <p className="text-secondary-600 text-sm">
                        {businessStructureType === 'company' 
                          ? "Enter your company banking details for payments"
                          : "Enter your personal banking details for payments"
                        }
                      </p>

                      <FormField
                        control={bankForm.control}
                        name="accountName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Name on the bank account" />
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
                              <Input {...field} placeholder="Name of your bank" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bankForm.control}
                          name="bsb"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>BSB (Bank State Branch)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="000-000" />
                              </FormControl>
                              <FormDescription>For Australian banks</FormDescription>
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
                                <Input {...field} placeholder="Account number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bankForm.control}
                          name="iban"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IBAN</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="International bank account number" />
                              </FormControl>
                              <FormDescription>For international banks</FormDescription>
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
                                <Input {...field} placeholder="Bank SWIFT code" />
                              </FormControl>
                              <FormDescription>For international transfers</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setCurrentStep(currentStep - 1)}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateWorkerMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {updateWorkerMutation.isPending ? "Completing..." : "Complete Onboarding"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}