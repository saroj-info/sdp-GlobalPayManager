import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AddWorkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: any[];
}

export function AddWorkerModal({ open, onOpenChange, countries }: AddWorkerModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const userType = (user as any)?.userType;
  const isSDPInternal = userType === 'sdp_internal';

  const [formData, setFormData] = useState({
    workerType: 'employee',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    countryId: '',
    // Third-party business fields
    thirdPartyBusinessName: '',
    thirdPartyContactPerson: '',
    thirdPartyEmail: '',
    thirdPartyPhone: '',
    thirdPartyCountryId: '',
    // On-behalf fields for SDP internal users
    onBehalf: isSDPInternal, // SDP users always create on behalf of business
    selectedBusinessId: '',
  });

  // Fetch businesses for SDP internal users
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses'],
    enabled: isSDPInternal && open, // Only fetch when modal is open and user is SDP internal
  });

  const createWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/workers', data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      onOpenChange(false);
      setFormData({
        workerType: 'employee',
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        countryId: '',
        thirdPartyBusinessName: '',
        thirdPartyContactPerson: '',
        thirdPartyEmail: '',
        thirdPartyPhone: '',
        thirdPartyCountryId: '',
        onBehalf: false,
        selectedBusinessId: '',
      });
      
      const sendInvitation = variables.sendInvitation;
      toast({
        title: "Success",
        description: sendInvitation
          ? (formData.workerType === 'third_party_worker' 
              ? "Worker added successfully. Invitation sent to the business contact." 
              : "Worker added successfully. Invitation email sent.")
          : "Worker saved successfully. No invitation sent - you can send it later or when creating a contract.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to add worker. Please try again.";
      try {
        const errorText = error?.message || '';
        const jsonMatch = errorText.match(/\d+: (.*)/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          errorMessage = parsed.message || parsed.details || errorMessage;
        }
      } catch {}
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent, sendInvitation: boolean = true) => {
    e.preventDefault();
    
    // Validate business selection for SDP internal users (always required)
    if (isSDPInternal && !formData.selectedBusinessId) {
      toast({
        title: "Error",
        description: "Please select a business to create this worker for.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation based on worker type
    if (formData.workerType === 'third_party_worker') {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || 
          !formData.countryId || !formData.thirdPartyBusinessName || !formData.thirdPartyContactPerson || 
          !formData.thirdPartyEmail || !formData.thirdPartyPhone || !formData.thirdPartyCountryId) {
        toast({
          title: "Error",
          description: "Please fill in all required fields for worker and third-party business.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.countryId) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    }

    createWorkerMutation.mutate({ ...formData, sendInvitation });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Worker</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
          {/* Invitation Information Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>About Invitations:</strong> You can choose to save this worker without sending an invitation now. 
              No information will be sent to the worker until you either:
              <ul className="list-disc ml-5 mt-2">
                <li>Manually send the invitation from the worker list</li>
                <li>Create a contract for this worker (invitation sent automatically)</li>
              </ul>
            </p>
          </div>
          {/* Worker Type Selection */}
          <div>
            <Label className="text-sm font-medium text-secondary-900 mb-3 block">
              Worker Type
            </Label>
            <RadioGroup
              value={formData.workerType}
              onValueChange={(value) => setFormData({ ...formData, workerType: value })}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-2 p-4 border border-secondary-300 rounded-lg">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="cursor-pointer">
                  <div className="font-medium text-secondary-900">Employee</div>
                  <div className="text-sm text-secondary-600">Permanent or fixed-term employment</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border border-secondary-300 rounded-lg">
                <RadioGroupItem value="contractor" id="contractor" />
                <Label htmlFor="contractor" className="cursor-pointer">
                  <div className="font-medium text-secondary-900">Contractor</div>
                  <div className="text-sm text-secondary-600">Independent contractor services</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border border-secondary-300 rounded-lg">
                <RadioGroupItem value="third_party_worker" id="third_party_worker" />
                <Label htmlFor="third_party_worker" className="cursor-pointer">
                  <div className="font-medium text-secondary-900">Worker from another business</div>
                  <div className="text-sm text-secondary-600">Worker provided by a third-party business</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* On-behalf section for SDP Internal users */}
          {isSDPInternal && (
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="onBehalf"
                  checked={formData.onBehalf}
                  onCheckedChange={(checked) => {
                    setFormData({ 
                      ...formData, 
                      onBehalf: !!checked,
                      selectedBusinessId: !!checked ? formData.selectedBusinessId : '' // Clear selection if unchecked
                    });
                  }}
                  data-testid="checkbox-onbehalf-worker"
                />
                <Label htmlFor="onBehalf" className="text-sm font-medium text-primary-900 cursor-pointer">
                  Creating worker on behalf of a business
                </Label>
              </div>
              
              {formData.onBehalf && (
                <div>
                  <Label htmlFor="selectedBusiness" className="text-sm font-medium text-secondary-900">
                    Select Business <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.selectedBusinessId} 
                    onValueChange={(value) => setFormData({ ...formData, selectedBusinessId: value })}
                    disabled={businessesLoading || !Array.isArray(businesses) || businesses.length === 0}
                    data-testid="select-business-worker"
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
                      {Array.isArray(businesses) && businesses?.map((business: any) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {businessesLoading && (
                    <p className="text-xs text-secondary-500 mt-1">Loading available businesses...</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
                required
                data-testid="input-worker-first-name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
                required
                data-testid="input-worker-last-name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                required
                data-testid="input-worker-email"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
                required={formData.workerType === 'third_party_worker'}
                data-testid="input-worker-phone"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.countryId}
                onValueChange={(value) => setFormData({ ...formData, countryId: value })}
                required
              >
                <SelectTrigger data-testid="select-worker-country">
                  <SelectValue placeholder="Select country..." />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Third-Party Business Details (only shown for third-party workers) */}
          {formData.workerType === 'third_party_worker' && (
            <div className="border border-secondary-300 rounded-lg p-6 bg-secondary-50">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Third-Party Business Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="thirdPartyBusinessName">Business Name</Label>
                  <Input
                    id="thirdPartyBusinessName"
                    value={formData.thirdPartyBusinessName}
                    onChange={(e) => setFormData({ ...formData, thirdPartyBusinessName: e.target.value })}
                    placeholder="Enter business name"
                    required
                    data-testid="input-third-party-business-name"
                  />
                </div>
                <div>
                  <Label htmlFor="thirdPartyContactPerson">Contact Person</Label>
                  <Input
                    id="thirdPartyContactPerson"
                    value={formData.thirdPartyContactPerson}
                    onChange={(e) => setFormData({ ...formData, thirdPartyContactPerson: e.target.value })}
                    placeholder="Enter contact person name"
                    required
                    data-testid="input-third-party-contact-person"
                  />
                </div>
                <div>
                  <Label htmlFor="thirdPartyEmail">Business Email</Label>
                  <Input
                    id="thirdPartyEmail"
                    type="email"
                    value={formData.thirdPartyEmail}
                    onChange={(e) => setFormData({ ...formData, thirdPartyEmail: e.target.value })}
                    placeholder="Enter business email"
                    required
                    data-testid="input-third-party-email"
                  />
                </div>
                <div>
                  <Label htmlFor="thirdPartyPhone">Business Phone</Label>
                  <Input
                    id="thirdPartyPhone"
                    type="tel"
                    value={formData.thirdPartyPhone}
                    onChange={(e) => setFormData({ ...formData, thirdPartyPhone: e.target.value })}
                    placeholder="+1234567890"
                    required
                    data-testid="input-third-party-phone"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="thirdPartyCountry">Business Country</Label>
                  <Select
                    value={formData.thirdPartyCountryId}
                    onValueChange={(value) => setFormData({ ...formData, thirdPartyCountryId: value })}
                    required
                  >
                    <SelectTrigger data-testid="select-third-party-country">
                      <SelectValue placeholder="Select business country..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The invitation will be sent to the third-party business contact, 
                  not the individual worker. The business will manage their worker's assignment.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-add-worker"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e, false)}
              disabled={createWorkerMutation.isPending}
              data-testid="button-save-worker-no-invitation"
            >
              {createWorkerMutation.isPending ? 'Saving...' : 'Save Without Invitation'}
            </Button>
            <Button
              type="submit"
              disabled={createWorkerMutation.isPending}
              data-testid="button-add-worker"
            >
              {createWorkerMutation.isPending ? 'Adding...' : 'Save & Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
