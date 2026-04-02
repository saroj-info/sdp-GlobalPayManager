import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, MapPin, Building2, Calendar, CheckCircle, Clock, Globe, Edit, Save, X, Send, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ViewWorkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: any;
  currentUserType?: string;
}

export function ViewWorkerModal({ open, onOpenChange, worker, currentUserType }: ViewWorkerModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  const [showChangeTypeDialog, setShowChangeTypeDialog] = useState(false);
  const [targetWorkerType, setTargetWorkerType] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (worker) {
      setEditForm({
        firstName: worker.firstName || '',
        lastName: worker.lastName || '',
        email: worker.email || '',
        phoneNumber: worker.phoneNumber || '',
      });
    }
  }, [worker]);

  useEffect(() => {
    if (worker && showChangeTypeDialog) {
      setTargetWorkerType(worker.workerType === 'employee' ? 'contractor' : 'employee');
    }
  }, [showChangeTypeDialog, worker]);

  const updateWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/workers/${worker.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Worker details updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update worker details.",
        variant: "destructive",
      });
    },
  });

  const changeTypeMutation = useMutation({
    mutationFn: async (newType: string) => {
      const response = await apiRequest('PATCH', `/api/workers/${worker.id}`, { workerType: newType });
      return response;
    },
    onSuccess: (_, newType) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      setShowChangeTypeDialog(false);
      const label = newType === 'employee' ? 'Employee' : 'Contractor';
      toast({
        title: "Engagement type updated",
        description: `This worker is now classified as a ${label}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update engagement type.",
        variant: "destructive",
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/workers/${worker.id}/resend-invitation`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workers'] });
      toast({
        title: "Success",
        description: "Invitation email sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation email.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateWorkerMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      firstName: worker.firstName || '',
      lastName: worker.lastName || '',
      email: worker.email || '',
      phoneNumber: worker.phoneNumber || '',
    });
    setIsEditing(false);
  };

  if (!worker) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not provided';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatPhone = (phone: string) => {
    if (!phone) return 'Not provided';
    return phone;
  };

  const getInvitationStatus = () => {
    if (worker.invitationSent) {
      return { label: 'Invitation Sent', color: 'text-green-600', icon: CheckCircle };
    } else {
      return { label: 'Pending Invitation', color: 'text-yellow-600', icon: Clock };
    }
  };

  const canChangeEngagementType =
    currentUserType === 'sdp_super_admin' ||
    currentUserType === 'sdp_internal' ||
    currentUserType === 'business_admin';

  const isThirdParty = worker.workerType === 'third_party_worker';

  const status = getInvitationStatus();
  const StatusIcon = status.icon;

  const workerTypeLabel = (type: string) => {
    if (type === 'employee') return 'Employee';
    if (type === 'contractor') return 'Contractor';
    if (type === 'third_party_worker') return 'Third Party';
    return type;
  };

  const getImplications = (from: string, to: string) => {
    if (from === 'contractor' && to === 'employee') {
      return [
        'Future contracts for this worker will only offer employment agreement types (Permanent, Fixed Term, Casual etc.)',
        'This worker will no longer be able to raise invoices from timesheets',
        'All existing contracts, timesheets and invoices remain visible and unchanged',
      ];
    }
    if (from === 'employee' && to === 'contractor') {
      return [
        'Future contracts for this worker will only offer contractor agreement types',
        'This worker will be able to raise invoices from approved timesheets',
        'All existing contracts, timesheets and invoices remain visible and unchanged',
      ];
    }
    return [];
  };

  const showBusinessDetailsWarning =
    worker.workerType === 'employee' &&
    targetWorkerType === 'contractor' &&
    !worker.businessDetailsCompleted;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-worker-details">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-lg">
                    {isEditing ? editForm.firstName[0]?.toUpperCase() || 'W' : worker.firstName[0]}{isEditing ? editForm.lastName[0]?.toUpperCase() || 'W' : worker.lastName[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-secondary-900">
                    {isEditing ? `${editForm.firstName} ${editForm.lastName}` : `${worker.firstName} ${worker.lastName}`}
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={worker.workerType === 'employee' ? 'default' : 'secondary'}>
                      {workerTypeLabel(worker.workerType)}
                    </Badge>
                    {canChangeEngagementType && !isThirdParty && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowChangeTypeDialog(true)}
                        data-testid="button-change-engagement-type"
                      >
                        <ArrowLeftRight className="w-3 h-3 mr-1" />
                        Change Engagement Type
                      </Button>
                    )}
                    <div className={`flex items-center space-x-1 ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{status.label}</span>
                    </div>
                  </div>
                </div>
              </DialogTitle>

              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvitationMutation.mutate()}
                      disabled={resendInvitationMutation.isPending}
                      data-testid="button-resend-invitation"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {resendInvitationMutation.isPending ? 'Sending...' : 'Resend Invitation'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-worker"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateWorkerMutation.isPending}
                      data-testid="button-save-worker"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateWorkerMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogDescription>
              {isEditing ? 'Edit worker information — you can modify name, email and contact details' : 'Comprehensive worker information and details'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Information</span>
                  {isEditing && <Badge variant="outline">Editable</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm text-muted-foreground">{worker.firstName} {worker.lastName}</p>
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{worker.email}</p>
                    </div>
                  </div>
                )}

                {/* Worker Type — read-only display only, changed via dedicated dialog */}
                <div className="flex items-center space-x-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Worker Type</p>
                    <p className="text-sm text-muted-foreground">{workerTypeLabel(worker.workerType)}</p>
                  </div>
                </div>

                {isEditing ? (
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                      placeholder="+1234567890"
                      data-testid="input-phone"
                    />
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{formatPhone(worker.phoneNumber)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date of Birth</p>
                    <p className="text-sm text-muted-foreground">{formatDate(worker.dateOfBirth)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Location & Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Country</p>
                    <p className="text-sm text-muted-foreground">{worker.country?.name || 'Not specified'}</p>
                  </div>
                </div>

                {worker.streetAddress && (
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {worker.streetAddress}
                      {worker.suburb && `, ${worker.suburb}`}
                      {worker.state && `, ${worker.state}`}
                      {worker.postcode && ` ${worker.postcode}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Information (for contractors) */}
            {worker.workerType === 'contractor' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>Business Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {worker.businessName && (
                    <div>
                      <p className="text-sm font-medium">Business Name</p>
                      <p className="text-sm text-muted-foreground">{worker.businessName}</p>
                    </div>
                  )}

                  {worker.businessStructure && (
                    <div>
                      <p className="text-sm font-medium">Business Structure</p>
                      <p className="text-sm text-muted-foreground">
                        {worker.businessStructure.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                    </div>
                  )}

                  {worker.abn && (
                    <div>
                      <p className="text-sm font-medium">ABN</p>
                      <p className="text-sm text-muted-foreground">{worker.abn}</p>
                    </div>
                  )}

                  {worker.acn && (
                    <div>
                      <p className="text-sm font-medium">ACN</p>
                      <p className="text-sm text-muted-foreground">{worker.acn}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Banking Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Banking Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {worker.bankName && (
                  <div>
                    <p className="text-sm font-medium">Bank Name</p>
                    <p className="text-sm text-muted-foreground">{worker.bankName}</p>
                  </div>
                )}

                {worker.accountName && (
                  <div>
                    <p className="text-sm font-medium">Account Name</p>
                    <p className="text-sm text-muted-foreground">{worker.accountName}</p>
                  </div>
                )}

                {worker.bsb && (
                  <div>
                    <p className="text-sm font-medium">BSB</p>
                    <p className="text-sm text-muted-foreground">{worker.bsb}</p>
                  </div>
                )}

                {worker.accountNumber && (
                  <div>
                    <p className="text-sm font-medium">Account Number</p>
                    <p className="text-sm text-muted-foreground">
                      {'*'.repeat(Math.max(0, worker.accountNumber.length - 4))}
                      {worker.accountNumber.slice(-4)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Onboarding Status */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Onboarding Status</CardTitle>
                <CardDescription>Worker's completion status for required onboarding steps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${worker.personalDetailsCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">Personal Details</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${worker.taxDetailsCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">Tax Details</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${worker.bankDetailsCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">Bank Details</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Completion</span>
                  <span className={`text-sm font-bold ${
                    worker.personalDetailsCompleted && worker.taxDetailsCompleted && worker.bankDetailsCompleted
                      ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {worker.personalDetailsCompleted && worker.taxDetailsCompleted && worker.bankDetailsCompleted
                      ? 'Complete' : 'Incomplete'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Engagement Type Dialog */}
      <AlertDialog open={showChangeTypeDialog} onOpenChange={setShowChangeTypeDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Change Engagement Type
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select the new engagement type for {worker.firstName} {worker.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="font-medium">Current type:</span>{' '}
                <Badge variant="secondary">{workerTypeLabel(worker.workerType)}</Badge>
              </div>
              <ArrowLeftRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <Select value={targetWorkerType} onValueChange={setTargetWorkerType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new type" />
                  </SelectTrigger>
                  <SelectContent>
                    {worker.workerType !== 'employee' && (
                      <SelectItem value="employee">Employee</SelectItem>
                    )}
                    {worker.workerType !== 'contractor' && (
                      <SelectItem value="contractor">Contractor</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {targetWorkerType && targetWorkerType !== worker.workerType && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-secondary-900">What this means:</p>
                <ul className="space-y-2">
                  {getImplications(worker.workerType, targetWorkerType).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                {showBusinessDetailsWarning && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
                      This worker has not completed their business details (business name, ABN/registration number, structure etc.). They will need to complete these before a contractor agreement can be finalised.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowChangeTypeDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={() => changeTypeMutation.mutate(targetWorkerType)}
              disabled={
                !targetWorkerType ||
                targetWorkerType === worker.workerType ||
                changeTypeMutation.isPending
              }
              data-testid="button-confirm-change-type"
            >
              {changeTypeMutation.isPending
                ? 'Updating...'
                : `Change to ${workerTypeLabel(targetWorkerType)}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
