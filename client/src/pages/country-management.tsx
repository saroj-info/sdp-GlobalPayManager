import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, MapPin, Building2, Plus, Search, Filter, Eye, Edit, Trash2, RotateCcw, Globe, Phone, Mail, CreditCard, Clock, FileText, Users, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Import the country schema and types from shared
import { 
  insertCountrySchema, 
  insertCountryPartySchema,
  insertCountryPartyContactSchema,
  insertCountryAdvisorFeeSchema,
  insertCountryDocumentSchema,
  type Country, 
  type InsertCountryType,
  type SelectCountryPartyType,
  type SelectCountryPartyContactType,
  type SelectCountryAdvisorFeeType,
  type SelectCountryDocumentType,
  type InsertCountryPartyType,
  type InsertCountryPartyContactType,
  type InsertCountryAdvisorFeeType,
  type InsertCountryDocumentType
} from "@shared/schema";

type CountryFormData = InsertCountryType;

const legalEntityTypes = [
  { value: "company", label: "Company" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_liability_company", label: "Limited Liability Company" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "trust", label: "Trust" },
  { value: "other", label: "Other" },
];

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "NZD", label: "NZD - New Zealand Dollar" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "PHP", label: "PHP - Philippine Peso" },
];

const commonTimezones = [
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Europe/Dublin (GMT/IST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST/AEDT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
  { value: "America/Toronto", label: "America/Toronto (EST/EDT)" },
  { value: "Asia/Manila", label: "Asia/Manila (PHT)" },
];

export default function CountryManagement() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Fetch current user to check permissions
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch all countries (for SDP admin and super admin users)
  const { data: countries = [], isLoading, error } = useQuery<Country[]>({
    queryKey: ["/api/admin/countries"],
    enabled: (currentUser as any)?.sdpRole === 'sdp_super_admin' || (currentUser as any)?.sdpRole === 'sdp_admin',
  });

  // Create country mutation
  const createCountryMutation = useMutation({
    mutationFn: (data: CountryFormData & { entities?: any }) => 
      apiRequest('POST', '/api/admin/countries', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/countries"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Country created",
        description: "The country has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create country",
        variant: "destructive",
      });
    },
  });

  // Update country mutation
  const updateCountryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<CountryFormData, 'id'> }) =>
      apiRequest('PUT', `/api/admin/countries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/countries"] });
      setEditDialogOpen(false);
      setSelectedCountry(null);
      toast({
        title: "Country updated",
        description: "The country has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update country",
        variant: "destructive",
      });
    },
  });

  // Delete (deactivate) country mutation
  const deleteCountryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/admin/countries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/countries"] });
      toast({
        title: "Country deactivated",
        description: "The country has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate country",
        variant: "destructive",
      });
    },
  });

  // Activate country mutation
  const activateCountryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('PUT', `/api/admin/countries/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/countries"] });
      toast({
        title: "Country activated",
        description: "The country has been activated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate country",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<CountryFormData>({
    resolver: zodResolver(insertCountrySchema),
    defaultValues: {
      id: "",
      name: "",
      code: "",
      currency: "",
      isActive: true,
      companyName: "",
      companyRegistrationNumber: "",
      legalEntityType: "company",
      streetAddress: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
      taxIdentificationNumber: "",
      vatGstRegistrationNumber: "",
      swiftBicCode: "",
      iban: "",
      phoneNumber: "",
      email: "",
      website: "",
      timezone: "",
      businessHours: "",
      invoiceFormat: "",
      bankName: "",
      bankAccountNumber: "",
      otherTaxDetails: "",
    },
  });

  const editForm = useForm<CountryFormData>({
    resolver: zodResolver(insertCountrySchema),
    defaultValues: {
      id: "",
      name: "",
      code: "",
      currency: "",
      isActive: true,
      companyName: "",
      companyRegistrationNumber: "",
      legalEntityType: "company",
      streetAddress: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
      taxIdentificationNumber: "",
      vatGstRegistrationNumber: "",
      swiftBicCode: "",
      iban: "",
      phoneNumber: "",
      email: "",
      website: "",
      timezone: "",
      businessHours: "",
      invoiceFormat: "",
      bankName: "",
      bankAccountNumber: "",
      otherTaxDetails: "",
    },
  });

  const onCreateSubmit = (data: CountryFormData) => {
    createCountryMutation.mutate(data);
  };

  const onEditSubmit = (data: CountryFormData) => {
    if (selectedCountry) {
      const { id, ...updateData } = data;
      updateCountryMutation.mutate({ id: selectedCountry.id, data: updateData });
    }
  };

  const openEditDialog = (country: Country) => {
    setSelectedCountry(country);
    editForm.reset({
      id: country.id,
      name: country.name || "",
      code: country.code || "",
      currency: country.currency || "",
      isActive: country.isActive,
      companyName: country.companyName || "",
      companyRegistrationNumber: country.companyRegistrationNumber || "",
      legalEntityType: country.legalEntityType || "company",
      streetAddress: country.streetAddress || "",
      city: country.city || "",
      stateProvince: country.stateProvince || "",
      postalCode: country.postalCode || "",
      country: country.country || "",
      taxIdentificationNumber: country.taxIdentificationNumber || "",
      vatGstRegistrationNumber: country.vatGstRegistrationNumber || "",
      swiftBicCode: country.swiftBicCode || "",
      iban: country.iban || "",
      phoneNumber: country.phoneNumber || "",
      email: country.email || "",
      website: country.website || "",
      timezone: country.timezone || "",
      businessHours: country.businessHours || "",
      invoiceFormat: country.invoiceFormat || "",
      bankName: country.bankName || "",
      bankAccountNumber: country.bankAccountNumber || "",
      otherTaxDetails: country.otherTaxDetails || "",
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (country: Country) => {
    setSelectedCountry(country);
    setViewDialogOpen(true);
  };

  const handleDeleteCountry = (countryId: string) => {
    if (confirm("Are you sure you want to deactivate this country? This action can be reversed.")) {
      deleteCountryMutation.mutate(countryId);
    }
  };

  const handleActivateCountry = (countryId: string) => {
    activateCountryMutation.mutate(countryId);
  };

  // Filter and sort countries based on search and status
  const filteredCountries = countries
    .filter((country: Country) => {
      const matchesSearch = 
        country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && country.isActive) ||
        (statusFilter === "inactive" && !country.isActive);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const userSdpRole = (currentUser as any)?.sdpRole;

  usePageHeader("Country Management", "Manage countries and their SDP entity details for invoice generation and compliance");

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Access control check - only show after user data is loaded
  if (userSdpRole !== 'sdp_super_admin' && userSdpRole !== 'sdp_admin') {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: You need Admin privileges to access country management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error handling for API failures
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load country data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading countries...</p>
          </div>
        </div>
      </div>
    );
  }

  // Entity Management View Component
  const EntityManagementView = ({ countryId }: { countryId: string }) => {
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const [emailForm, setEmailForm] = useState({ recipientEmail: '', recipientName: '', message: '' });
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const { toast } = useToast();
    
    // Modal states for entity management
    const [showShareholderModal, setShowShareholderModal] = useState(false);
    const [showDirectorModal, setShowDirectorModal] = useState(false);
    const [showTaxAdvisorModal, setShowTaxAdvisorModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);

    // Fetch entity data for the country
    const { data: countryEntities, isLoading: entitiesLoading } = useQuery({
      queryKey: ['/api/admin/countries', countryId, 'entities'],
      enabled: !!countryId
    });

    // Fetch parties data
    const { data: parties, isLoading: partiesLoading } = useQuery({
      queryKey: ['/api/admin/countries', countryId, 'parties'],
      enabled: !!countryId
    });

    // Fetch documents data  
    const { data: documents, isLoading: documentsLoading } = useQuery({
      queryKey: ['/api/admin/countries', countryId, 'documents'],
      enabled: !!countryId
    });

    const handleSendEntityInfo = async () => {
      if (!emailForm.recipientEmail || !emailForm.recipientName) {
        toast({
          title: "Missing Information",
          description: "Please provide recipient email and name",
          variant: "destructive",
        });
        return;
      }

      setIsEmailLoading(true);
      try {
        await apiRequest('POST', `/api/countries/${countryId}/send-entity-info`, emailForm);
        toast({
          title: "Email Sent Successfully",
          description: `Entity information sent to ${emailForm.recipientEmail}`,
        });
        setShowEmailDialog(false);
        setEmailForm({ recipientEmail: '', recipientName: '', message: '' });
      } catch (error) {
        toast({
          title: "Failed to Send Email",
          description: "Please try again later",
          variant: "destructive",
        });
      } finally {
        setIsEmailLoading(false);
      }
    };

    const shareholders = Array.isArray(parties) ? parties.filter((p: any) => p.type === 'shareholder') : [];
    const directors = Array.isArray(parties) ? parties.filter((p: any) => p.type === 'director') : [];
    const taxAdvisors = Array.isArray(parties) ? parties.filter((p: any) => p.type === 'tax_advisor') : [];

    return (
      <div className="space-y-6">
        {/* Entity Notes Section */}
        <div>
          <Label className="text-sm font-medium text-gray-500">Entity Notes</Label>
          <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]">
            {selectedCountry?.entityNotes || (
              <span className="text-gray-400 italic">No entity notes recorded</span>
            )}
          </div>
        </div>

        {/* Entity Information Header with Email Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Entity Information</h3>
          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-send-entity-info">
                <Mail className="w-4 h-4 mr-2" />
                Email Entity Info
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send Entity Information</DialogTitle>
                <DialogDescription>
                  Send a summary of entity information for {selectedCountry?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={emailForm.recipientEmail}
                    onChange={(e) => setEmailForm({...emailForm, recipientEmail: e.target.value})}
                    placeholder="recipient@example.com"
                    data-testid="input-recipient-email"
                  />
                </div>
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={emailForm.recipientName}
                    onChange={(e) => setEmailForm({...emailForm, recipientName: e.target.value})}
                    placeholder="Recipient Name"
                    data-testid="input-recipient-name"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Additional Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={emailForm.message}
                    onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                    placeholder="Additional message..."
                    data-testid="textarea-email-message"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendEntityInfo} disabled={isEmailLoading} data-testid="button-confirm-send-email">
                    {isEmailLoading ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {entitiesLoading || partiesLoading || documentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading entity data...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shareholders */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Shareholders ({shareholders.length})</h4>
              </div>
              {shareholders.length > 0 ? (
                <div className="space-y-3">
                  {shareholders.map((shareholder: any) => (
                    <div key={shareholder.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="font-medium text-sm">{shareholder.name}</div>
                      <div className="text-xs text-gray-600">{shareholder.email || 'No email'}</div>
                      {shareholder.equity && (
                        <div className="text-xs text-blue-600 font-medium">{shareholder.equity}% equity</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No shareholders recorded</p>
              )}
            </div>

            {/* Directors */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Directors ({directors.length})</h4>
              </div>
              {directors.length > 0 ? (
                <div className="space-y-3">
                  {directors.map((director: any) => (
                    <div key={director.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="font-medium text-sm">{director.name}</div>
                      <div className="text-xs text-gray-600">{director.email || 'No email'}</div>
                      {director.role && (
                        <div className="text-xs text-green-600 font-medium">{director.role}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No directors recorded</p>
              )}
            </div>

            {/* Tax Advisors */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-orange-600" />
                <h4 className="font-semibold text-gray-900">Tax Advisors ({taxAdvisors.length})</h4>
              </div>
              {taxAdvisors.length > 0 ? (
                <div className="space-y-3">
                  {taxAdvisors.map((advisor: any) => (
                    <div key={advisor.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="font-medium text-sm">{advisor.name}</div>
                      <div className="text-xs text-gray-600">{advisor.email || 'No email'}</div>
                      {advisor.specialization && (
                        <div className="text-xs text-orange-600 font-medium">{advisor.specialization}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No tax advisors recorded</p>
              )}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Documents ({Array.isArray(documents) ? documents.length : 0})</h4>
          </div>
          {Array.isArray(documents) && documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{doc.title}</div>
                    <div className="text-xs text-gray-600">{doc.category}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No documents uploaded</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-500 mb-3">Entity Management Actions</div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowShareholderModal(true)}
              data-testid="button-add-shareholder"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Shareholder
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDirectorModal(true)}
              data-testid="button-add-director"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Director
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTaxAdvisorModal(true)}
              data-testid="button-add-tax-advisor"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Tax Advisor
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDocumentModal(true)}
              data-testid="button-upload-document"
            >
              <Plus className="w-4 h-4 mr-1" />
              Upload Document
            </Button>
          </div>
        </div>
        
        {/* Modal Dialogs for Entity Management in View Mode */}
        
        {/* Add Shareholder Modal */}
        <Dialog open={showShareholderModal} onOpenChange={setShowShareholderModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Shareholder</DialogTitle>
              <DialogDescription>
                Add a new shareholder to {(countryEntities as any)?.name || 'this country'}'s entity structure
              </DialogDescription>
            </DialogHeader>
            <ShareholderFormView 
              countryId={countryId}
              onSuccess={() => setShowShareholderModal(false)}
              onCancel={() => setShowShareholderModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Add Director Modal */}
        <Dialog open={showDirectorModal} onOpenChange={setShowDirectorModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Director</DialogTitle>
              <DialogDescription>
                Add a new director to {(countryEntities as any)?.name || 'this country'}'s entity structure
              </DialogDescription>
            </DialogHeader>
            <DirectorFormView 
              countryId={countryId}
              onSuccess={() => setShowDirectorModal(false)}
              onCancel={() => setShowDirectorModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Add Tax Advisor Modal */}
        <Dialog open={showTaxAdvisorModal} onOpenChange={setShowTaxAdvisorModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Tax Advisor</DialogTitle>
              <DialogDescription>
                Add a new tax advisor to {(countryEntities as any)?.name || 'this country'}'s entity structure
              </DialogDescription>
            </DialogHeader>
            <TaxAdvisorFormView 
              countryId={countryId}
              onSuccess={() => setShowTaxAdvisorModal(false)}
              onCancel={() => setShowTaxAdvisorModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Add Document Modal */}
        <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a compliance document for {(countryEntities as any)?.name || 'this country'}
              </DialogDescription>
            </DialogHeader>
            <DocumentFormView 
              countryId={countryId}
              onSuccess={() => setShowDocumentModal(false)}
              onCancel={() => setShowDocumentModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Form Components for View Mode (with backend integration)
  const ShareholderFormView = ({ countryId, onSuccess, onCancel }: { 
    countryId: string; 
    onSuccess: () => void; 
    onCancel: () => void; 
  }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const shareholderSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email").optional().or(z.literal("")),
      phone: z.string().optional(),
      equity: z.string().optional(),
      address: z.string().optional()
    });

    const form = useForm({
      resolver: zodResolver(shareholderSchema),
      defaultValues: { name: "", email: "", phone: "", equity: "", address: "" }
    });

    const addShareholderMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await apiRequest('POST', `/api/admin/countries/${countryId}/parties`, {
          ...data,
          type: 'shareholder'
        });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/countries', countryId, 'parties'] });
        toast({
          title: "Success",
          description: "Shareholder added successfully",
        });
        onSuccess();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add shareholder",
          variant: "destructive",
        });
      }
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => addShareholderMutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Shareholder name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="equity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equity Percentage</FormLabel>
                <FormControl>
                  <Input placeholder="25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={addShareholderMutation.isPending}>
              {addShareholderMutation.isPending ? "Adding..." : "Add Shareholder"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  const DirectorFormView = ({ countryId, onSuccess, onCancel }: { 
    countryId: string; 
    onSuccess: () => void; 
    onCancel: () => void; 
  }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const directorSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email").optional().or(z.literal("")),
      phone: z.string().optional(),
      role: z.string().optional(),
      address: z.string().optional()
    });

    const form = useForm({
      resolver: zodResolver(directorSchema),
      defaultValues: { name: "", email: "", phone: "", role: "", address: "" }
    });

    const addDirectorMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await apiRequest('POST', `/api/admin/countries/${countryId}/parties`, {
          ...data,
          type: 'director',
          titleOrRole: data.role
        });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/countries', countryId, 'parties'] });
        toast({
          title: "Success",
          description: "Director added successfully",
        });
        onSuccess();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add director",
          variant: "destructive",
        });
      }
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => addDirectorMutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Director name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role/Title</FormLabel>
                <FormControl>
                  <Input placeholder="Managing Director" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={addDirectorMutation.isPending}>
              {addDirectorMutation.isPending ? "Adding..." : "Add Director"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  const TaxAdvisorFormView = ({ countryId, onSuccess, onCancel }: { 
    countryId: string; 
    onSuccess: () => void; 
    onCancel: () => void; 
  }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    const taxAdvisorSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email").optional().or(z.literal("")),
      phone: z.string().optional(),
      specialization: z.string().optional(),
      address: z.string().optional()
    });

    const form = useForm({
      resolver: zodResolver(taxAdvisorSchema),
      defaultValues: { name: "", email: "", phone: "", specialization: "", address: "" }
    });

    const addTaxAdvisorMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await apiRequest('POST', `/api/admin/countries/${countryId}/parties`, {
          ...data,
          type: 'tax_advisor',
          titleOrRole: data.specialization
        });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/countries', countryId, 'parties'] });
        toast({
          title: "Success",
          description: "Tax advisor added successfully",
        });
        onSuccess();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add tax advisor",
          variant: "destructive",
        });
      }
    });

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => addTaxAdvisorMutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Tax advisor name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="specialization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialization</FormLabel>
                <FormControl>
                  <Input placeholder="Corporate Tax" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={addTaxAdvisorMutation.isPending}>
              {addTaxAdvisorMutation.isPending ? "Adding..." : "Add Tax Advisor"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  const DocumentFormView = ({ countryId, onSuccess, onCancel }: { 
    countryId: string; 
    onSuccess: () => void; 
    onCancel: () => void; 
  }) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [uploadedFile, setUploadedFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const documentSchema = z.object({
      name: z.string().min(1, "Document name is required"),
      category: z.string().min(1, "Category is required"),
      description: z.string().optional()
    });

    const form = useForm({
      resolver: zodResolver(documentSchema),
      defaultValues: { name: "", category: "", description: "" }
    });

    const addDocumentMutation = useMutation({
      mutationFn: async (data: any) => {
        if (!uploadedFile) {
          throw new Error("Please upload a file before submitting");
        }

        const response = await apiRequest('POST', `/api/admin/countries/${countryId}/documents`, {
          name: data.name,
          category: data.category,
          description: data.description,
          objectKey: uploadedFile.objectKey,
          size: uploadedFile.size,
          contentType: uploadedFile.contentType
        });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/countries', countryId, 'documents'] });
        toast({
          title: "Success",
          description: "Document uploaded successfully",
        });
        onSuccess();
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add document",
          variant: "destructive",
        });
      }
    });

    const handleFileUpload = async (file: File) => {
      setIsUploading(true);
      try {
        // Get category for the upload URL
        const category = form.getValues("category") || "other";
        
        // Get upload URL from backend
        const response = await apiRequest('GET', `/api/countries/${countryId}/documents/upload-url?documentType=${category}`);
        const { url } = await response.json();
        
        // Upload file directly to object storage
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }

        // Extract object key from the signed URL
        const urlObj = new URL(url);
        const objectKey = urlObj.pathname.slice(1); // Remove leading slash

        setUploadedFile({
          name: file.name,
          size: file.size,
          contentType: file.type,
          objectKey: objectKey
        });

        // Auto-fill document name if not set
        if (!form.getValues("name")) {
          form.setValue("name", file.name);
        }

        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to upload file",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => addDocumentMutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Certificate of Incorporation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incorporation">Incorporation</SelectItem>
                      <SelectItem value="tax">Tax Documents</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* File Upload Section */}
          <div>
            <Label>Document File *</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
              {uploadedFile ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-medium text-sm">{uploadedFile.name}</div>
                    <div className="text-xs text-gray-600">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <div className="text-sm text-gray-600">
                        {isUploading ? "Uploading..." : "Click to upload document"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        PDF, DOC, DOCX, JPG, PNG, TXT (max 10MB)
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Document description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addDocumentMutation.isPending || isUploading || !uploadedFile}
            >
              {addDocumentMutation.isPending ? "Adding..." : "Add Document"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  const CountryFormFields = ({ form }: { form: any }) => {
    const [activeTab, setActiveTab] = useState("basic");
    
    return (
      <div className="space-y-6">
        {/* Custom Tab Navigation */}
        <div className="w-full">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "basic"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                data-testid="tab-basic"
              >
                Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("company")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "company"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                data-testid="tab-company"
              >
                Company
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("contact")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "contact"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                data-testid="tab-contact"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("operational")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "operational"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                data-testid="tab-operational"
              >
                Operational
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("entities")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "entities"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                data-testid="tab-entities"
              >
                Entity & Compliance
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content with Conditional Rendering */}
        {activeTab === "basic" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="us, au, uk..." 
                      data-testid="input-country-id"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="United States" 
                      data-testid="input-country-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="US" 
                      maxLength={2}
                      data-testid="input-country-code"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        )}
        
        {activeTab === "company" && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="SDP US LLC" 
                    data-testid="input-company-name"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="companyRegistrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123456789" 
                      data-testid="input-registration-number"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="legalEntityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Entity Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-legal-entity-type">
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {legalEntityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="streetAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123 Main Street" 
                    data-testid="input-street-address"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="New York" 
                      data-testid="input-city"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="stateProvince"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Province</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="NY" 
                      data-testid="input-state-province"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="10001" 
                      data-testid="input-postal-code"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="taxIdentificationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="12-3456789" 
                      data-testid="input-tax-id"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vatGstRegistrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT/GST Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="GB123456789" 
                      data-testid="input-vat-gst"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Bank of America" 
                      data-testid="input-bank-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="1234567890" 
                      data-testid="input-bank-account"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="swiftBicCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SWIFT/BIC Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="BOFAUS3N" 
                      data-testid="input-swift-bic"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="GB33BUKB20201555555555" 
                      data-testid="input-iban"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="otherTaxDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Tax Details</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional tax registration details..." 
                    data-testid="textarea-other-tax-details"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        )}
        
        {activeTab === "contact" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+1-555-123-4567" 
                      data-testid="input-phone-number"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="contact@sdpglobalpay.com" 
                      data-testid="input-email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://www.sdpglobalpay.com" 
                    data-testid="input-website"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        )}
        
        {activeTab === "operational" && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {commonTimezones.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="businessHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Hours</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="9:00 AM - 5:00 PM" 
                    data-testid="input-business-hours"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="invoiceFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Format</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="SDP-{COUNTRY}-{YEAR}-{NUMBER}" 
                    data-testid="input-invoice-format"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        )}
        
        {activeTab === "entities" && (
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900" data-testid="text-entity-compliance-header">Entity & Compliance Setup</h3>
            <p className="text-sm text-gray-600 mt-2">
              Entity management (shareholders, directors, tax advisors, documents) can be configured after creating the country.
            </p>
            
            <FormField
              control={form.control}
              name="entityNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add notes about entity structure, compliance requirements, etc..." 
                      data-testid="textarea-entity-notes"
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        )}
    </div>
    );
  };

  // Form Components for Entity Modals
  const ShareholderForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
    const shareholderSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email").optional().or(z.literal("")),
      phone: z.string().optional(),
      equity: z.string().optional(),
      address: z.string().optional()
    });

    const shareholderForm = useForm({
      resolver: zodResolver(shareholderSchema),
      defaultValues: { name: "", email: "", phone: "", equity: "", address: "" }
    });

    return (
      <Form {...shareholderForm}>
        <form onSubmit={shareholderForm.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={shareholderForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Shareholder name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={shareholderForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={shareholderForm.control}
            name="equity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equity Percentage</FormLabel>
                <FormControl>
                  <Input placeholder="25" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Add Shareholder</Button>
          </div>
        </form>
      </Form>
    );
  };

  const DirectorForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
    const directorSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email").optional().or(z.literal("")),
      phone: z.string().optional(),
      role: z.string().optional(),
      address: z.string().optional()
    });

    const directorForm = useForm({
      resolver: zodResolver(directorSchema),
      defaultValues: { name: "", email: "", phone: "", role: "", address: "" }
    });

    return (
      <Form {...directorForm}>
        <form onSubmit={directorForm.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={directorForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Director name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={directorForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={directorForm.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role/Title</FormLabel>
                <FormControl>
                  <Input placeholder="Managing Director" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Add Director</Button>
          </div>
        </form>
      </Form>
    );
  };

  const TaxAdvisorForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
    const taxAdvisorSchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email").optional().or(z.literal("")),
      phone: z.string().optional(),
      specialization: z.string().optional(),
      address: z.string().optional()
    });

    const taxAdvisorForm = useForm({
      resolver: zodResolver(taxAdvisorSchema),
      defaultValues: { name: "", email: "", phone: "", specialization: "", address: "" }
    });

    return (
      <Form {...taxAdvisorForm}>
        <form onSubmit={taxAdvisorForm.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={taxAdvisorForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Tax advisor name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={taxAdvisorForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={taxAdvisorForm.control}
            name="specialization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialization</FormLabel>
                <FormControl>
                  <Input placeholder="Corporate Tax" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Add Tax Advisor</Button>
          </div>
        </form>
      </Form>
    );
  };

  const DocumentForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
    const documentSchema = z.object({
      name: z.string().min(1, "Document name is required"),
      category: z.string().min(1, "Category is required"),
      description: z.string().optional()
    });

    const documentForm = useForm({
      resolver: zodResolver(documentSchema),
      defaultValues: { name: "", category: "", description: "" }
    });

    return (
      <Form {...documentForm}>
        <form onSubmit={documentForm.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={documentForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Certificate of Incorporation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={documentForm.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incorporation">Incorporation</SelectItem>
                      <SelectItem value="tax">Tax Documents</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={documentForm.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Document description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Add Document</Button>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-country-management">
            Country Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage countries and their SDP entity details for invoice generation and compliance
          </p>
        </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-country">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Country
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Country</DialogTitle>
                  <DialogDescription>
                    Create a new country with complete SDP entity details for invoice generation.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <CountryFormFields form={createForm} />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCountryMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createCountryMutation.isPending ? "Creating..." : "Create Country"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search countries by name, company, or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-countries"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger data-testid="select-status-filter">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Countries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Countries ({filteredCountries.length})
              </CardTitle>
              <CardDescription>
                Manage all countries and their SDP entity information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountries.map((country: any) => (
                      <TableRow key={country.id} data-testid={`row-country-${country.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid={`text-country-name-${country.id}`}>
                              {country.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {country.code} • {country.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{country.companyName}</div>
                            <div className="text-sm text-gray-500">
                              {country.legalEntityType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{country.currency}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={country.isActive ? "default" : "secondary"}
                            data-testid={`badge-status-${country.id}`}
                          >
                            {country.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {country.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {country.email}
                              </div>
                            )}
                            {country.phoneNumber && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {country.phoneNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewDialog(country)}
                              data-testid={`button-view-${country.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(country)}
                              data-testid={`button-edit-${country.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {country.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCountry(country.id)}
                                data-testid={`button-deactivate-${country.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivateCountry(country.id)}
                                data-testid={`button-activate-${country.id}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredCountries.length === 0 && (
                  <div className="text-center py-8">
                    <Globe className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No countries found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || statusFilter !== "all" 
                        ? "Try adjusting your search or filters" 
                        : "Get started by adding your first country"
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

      {/* Edit Country Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Country</DialogTitle>
            <DialogDescription>
              Update country details and SDP entity information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <CountryFormFields form={editForm} />
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateCountryMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateCountryMutation.isPending ? "Updating..." : "Update Country"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Country Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {selectedCountry?.name} ({selectedCountry?.code})
            </DialogTitle>
            <DialogDescription>
              Complete country and SDP entity information
            </DialogDescription>
          </DialogHeader>
          
          {selectedCountry && (
            <div className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 sticky top-0 bg-background z-10">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="operational">Operational</TabsTrigger>
                    <TabsTrigger value="entities">Entity & Compliance</TabsTrigger>
                  </TabsList>
                  
                  <div className="max-h-[70vh] overflow-y-auto">
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Country ID</Label>
                        <p className="mt-1">{selectedCountry.id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Country Name</Label>
                        <p className="mt-1">{selectedCountry.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Country Code</Label>
                        <p className="mt-1">{selectedCountry.code}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Currency</Label>
                        <p className="mt-1">
                          <Badge variant="outline">{selectedCountry.currency}</Badge>
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Status</Label>
                        <p className="mt-1">
                          <Badge variant={selectedCountry.isActive ? "default" : "secondary"}>
                            {selectedCountry.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="company" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Company Name</Label>
                        <p className="mt-1">{selectedCountry.companyName || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Registration Number</Label>
                        <p className="mt-1">{selectedCountry.companyRegistrationNumber || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Legal Entity Type</Label>
                        <p className="mt-1">{selectedCountry.legalEntityType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Tax ID Number</Label>
                        <p className="mt-1">{selectedCountry.taxIdentificationNumber || "—"}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Address</Label>
                      <div className="mt-1 space-y-1">
                        {selectedCountry.streetAddress && <p>{selectedCountry.streetAddress}</p>}
                        <p>
                          {[selectedCountry.city, selectedCountry.stateProvince, selectedCountry.postalCode]
                            .filter(Boolean).join(', ')}
                        </p>
                        {selectedCountry.country && <p>{selectedCountry.country}</p>}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Bank Name</Label>
                        <p className="mt-1">{selectedCountry.bankName || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Bank Account Number</Label>
                        <p className="mt-1">{selectedCountry.bankAccountNumber || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">SWIFT/BIC Code</Label>
                        <p className="mt-1">{selectedCountry.swiftBicCode || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">IBAN</Label>
                        <p className="mt-1">{selectedCountry.iban || "—"}</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Phone Number</Label>
                        <p className="mt-1 flex items-center gap-2">
                          {selectedCountry.phoneNumber ? (
                            <>
                              <Phone className="h-4 w-4" />
                              {selectedCountry.phoneNumber}
                            </>
                          ) : "—"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="mt-1 flex items-center gap-2">
                          {selectedCountry.email ? (
                            <>
                              <Mail className="h-4 w-4" />
                              {selectedCountry.email}
                            </>
                          ) : "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Website</Label>
                      <p className="mt-1">{selectedCountry.website || "—"}</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="operational" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Timezone</Label>
                        <p className="mt-1 flex items-center gap-2">
                          {selectedCountry.timezone ? (
                            <>
                              <Clock className="h-4 w-4" />
                              {selectedCountry.timezone}
                            </>
                          ) : "—"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Business Hours</Label>
                        <p className="mt-1">{selectedCountry.businessHours || "—"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Invoice Format</Label>
                      <p className="mt-1 flex items-center gap-2">
                        {selectedCountry.invoiceFormat ? (
                          <>
                            <FileText className="h-4 w-4" />
                            {selectedCountry.invoiceFormat}
                          </>
                        ) : "—"}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="entities" className="space-y-4">
                    <EntityManagementView countryId={selectedCountry.id} />
                  </TabsContent>
                  
                  </div>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}