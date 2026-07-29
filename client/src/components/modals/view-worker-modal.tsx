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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User, Mail, Phone, MapPin, Building2, Calendar, CheckCircle, Clock, Globe, Edit, Save, X, Send, ArrowLeftRight, AlertTriangle, History, Lock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ViewWorkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: any;
  currentUserType?: string;
}

type EditForm = Record<string, any>;

// Field keys that make sense to expose in the edit form. Grouping is used
// only to render sections; the API accepts any subset.
const EDITABLE_KEYS = [
  'firstName','lastName','email','phoneNumber','dateOfBirth','workerType',
  'streetAddress','suburb','state','postcode','countryId',
  'businessStructure','businessName','businessAddress','businessPhone','businessEmail',
  'taxFileNumber','abn','acn','irdNumber','ssn','ein','niNumber','utrNumber','sin','businessNumber','gstRegistered','gstNumber',
  'accountName','bankName','bsb','accountNumber','iban','swiftCode',
  'emergencyContactName','emergencyContactRelationship','emergencyContactPhone','emergencyContactEmail',
  'superFundName','superFundAbn','superMemberNumber','superFundAddress',
  'kiwiSaverProvider','kiwiSaverNumber',
  'plan401kProvider','plan401kNumber',
  'pensionProvider','pensionNumber',
  'cppNumber','qppNumber',
] as const;

function toInputDate(v: any): string {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function ViewWorkerModal({ open, onOpenChange, worker, currentUserType }: ViewWorkerModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({});
  const [showChangeTypeDialog, setShowChangeTypeDialog] = useState(false);
  const [targetWorkerType, setTargetWorkerType] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSdpInternal = currentUserType === 'sdp_super_admin' || currentUserType === 'sdp_internal';

  const seedForm = (w: any): EditForm => {
    const seed: EditForm = {};
    for (const k of EDITABLE_KEYS) {
      const v = w?.[k];
      seed[k] = k === 'dateOfBirth' ? toInputDate(v) : (v ?? (typeof v === 'boolean' ? false : ''));
    }
    return seed;
  };

  useEffect(() => {
    if (worker) setEditForm(seedForm(worker));
  }, [worker]);

  useEffect(() => {
    if (worker && showChangeTypeDialog) {
      setTargetWorkerType(worker.workerType === 'employee' ? 'contractor' : 'employee');
    }
  }, [showChangeTypeDialog, worker]);

  // Country list (for the country select in the address section).
  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['/api/countries'],
    enabled: open,
  });

  // Whether workerType can be changed at all — blocked while any active
  // contract exists for this worker.
  const { data: lockStatus } = useQuery<{ hasLiveContracts: boolean }>({
    queryKey: [`/api/workers/${worker?.id}/lock-status`],
    enabled: open && !!worker?.id,
  });
  const hasLiveContracts = !!lockStatus?.hasLiveContracts;

  // Change history — lazy-loaded on section open.
  const { data: changeLog = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: [`/api/workers/${worker?.id}/change-log`],
    enabled: open && showHistory && !!worker?.id,
  });

  const invalidateWorkerFamily = () => {
    queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith('/api/workers'),
    });
  };

  const updateWorkerMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('PATCH', `/api/workers/${worker.id}`, data),
    onSuccess: () => {
      invalidateWorkerFamily();
      setIsEditing(false);
      toast({ title: 'Saved', description: 'Worker details updated.' });
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to update worker details.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const changeTypeMutation = useMutation({
    mutationFn: async (newType: string) => apiRequest('PATCH', `/api/workers/${worker.id}`, { workerType: newType }),
    onSuccess: (_, newType) => {
      invalidateWorkerFamily();
      setShowChangeTypeDialog(false);
      const label = newType === 'employee' ? 'Employee' : 'Contractor';
      toast({ title: 'Engagement type updated', description: `This worker is now classified as a ${label}.` });
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to update engagement type.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/workers/${worker.id}/resend-invitation`, {}),
    onSuccess: () => {
      invalidateWorkerFamily();
      toast({ title: 'Success', description: 'Invitation email sent successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error?.message || 'Failed to send invitation email.', variant: 'destructive' });
    },
  });

  const handleField = (key: string, value: any) => setEditForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (!String(editForm.firstName ?? '').trim() || !String(editForm.lastName ?? '').trim() || !String(editForm.email ?? '').trim()) {
      toast({ title: 'Error', description: 'First name, last name and email are required.', variant: 'destructive' });
      return;
    }
    // Build payload:
    //   - Drop empty strings on optional fields (they mean "no value" in the
    //     UI but "" is invalid for enum-typed columns like `businessStructure`
    //     and `workerType`). Required fields (firstName/lastName/email) are
    //     already validated non-empty above.
    //   - Drop unchanged workerType so the server-side "no engagement change
    //     while active contracts" guard isn't triggered unless the operator
    //     actually flipped it.
    //   - "" → null on optional date fields.
    const REQUIRED_KEYS = new Set(['firstName', 'lastName', 'email']);
    const payload: EditForm = {};
    for (const [k, v] of Object.entries(editForm)) {
      if (v === '' && !REQUIRED_KEYS.has(k)) continue; // strip empties
      payload[k] = v;
    }
    if (payload.workerType === worker.workerType) delete payload.workerType;
    if (editForm.dateOfBirth === '') payload.dateOfBirth = null;
    updateWorkerMutation.mutate(payload);
  };

  const handleCancel = () => {
    setEditForm(seedForm(worker));
    setIsEditing(false);
  };

  if (!worker) return null;

  const formatDate = (v: any) => (v ? new Date(v).toLocaleDateString() : 'Not provided');
  const workerTypeLabel = (type: string) => {
    if (type === 'employee') return 'Employee';
    if (type === 'contractor') return 'Contractor';
    if (type === 'third_party_worker') return 'Third Party';
    return type;
  };

  const canChangeEngagementType =
    currentUserType === 'sdp_super_admin' ||
    currentUserType === 'sdp_internal' ||
    currentUserType === 'business_admin';
  const engagementTypeButtonDisabled = hasLiveContracts;

  const isThirdParty = worker.workerType === 'third_party_worker';

  const getInvitationStatus = () => {
    if (worker.onboardingCompleted) return { label: 'Active', color: 'text-green-600', icon: CheckCircle };
    if (worker.userId) return { label: 'Accepted', color: 'text-blue-600', icon: CheckCircle };
    if (worker.invitationSent) return { label: 'Invited', color: 'text-yellow-600', icon: Send };
    return { label: 'Pending Invitation', color: 'text-gray-500', icon: Clock };
  };
  const status = getInvitationStatus();
  const StatusIcon = status.icon;

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

  // Worker's country code, used to filter which per-country tax + pension
  // sections we show. Falls back to showing all sections if unknown.
  const workerCountryCode: string | undefined = (worker.country?.code ?? '').toUpperCase() || undefined;
  const showFor = (codes: string[]) => !workerCountryCode || codes.includes(workerCountryCode);

  // Plain helper *functions* (not components) — returning JSX inline so React
  // reconciles the underlying <Input> across renders instead of remounting it
  // on every keystroke. Using them as components (<TextRow />) caused focus
  // loss because a new component reference is created each render.
  const textRow = (k: string, label: string, type: string = 'text', placeholder?: string) => (
    <div key={k}>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={editForm[k] ?? ''} placeholder={placeholder} onChange={(e) => handleField(k, e.target.value)} />
    </div>
  );
  const textAreaRow = (k: string, label: string) => (
    <div key={k}>
      <Label htmlFor={k}>{label}</Label>
      <Textarea id={k} value={editForm[k] ?? ''} onChange={(e) => handleField(k, e.target.value)} rows={2} />
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-worker-details">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-lg">
                    {(worker.firstName?.[0] ?? 'W')}{(worker.lastName?.[0] ?? 'W')}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-secondary-900">
                    {worker.firstName} {worker.lastName}
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
                        disabled={engagementTypeButtonDisabled}
                        title={engagementTypeButtonDisabled ? 'Locked — this worker has active contracts. End or terminate them first.' : undefined}
                        data-testid="button-change-engagement-type"
                      >
                        {engagementTypeButtonDisabled
                          ? <Lock className="w-3 h-3 mr-1" />
                          : <ArrowLeftRight className="w-3 h-3 mr-1" />}
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
                    {/* Only expose Resend while the worker hasn't accepted the
                        invitation yet. Once `userId` is set the invitation
                        flow is over — the backend also 400s in that case. */}
                    {!worker.userId && (
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
                    )}
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
                    <Button variant="outline" size="sm" onClick={handleCancel} data-testid="button-cancel-edit">
                      <X className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateWorkerMutation.isPending} data-testid="button-save-worker">
                      <Save className="w-4 h-4 mr-2" />
                      {updateWorkerMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogDescription>
              {isEditing
                ? isSdpInternal
                  ? 'Editing full profile. Sensitive changes will notify the worker by email.'
                  : 'Editing worker profile.'
                : 'Comprehensive worker information and details'}
            </DialogDescription>
          </DialogHeader>

          {/* -------------------- EDIT MODE -------------------- */}
          {isEditing ? (
            <div className="mt-6">
              <Accordion type="multiple" defaultValue={["identity","employment","address"]} className="w-full">
                <AccordionItem value="identity">
                  <AccordionTrigger>Identity</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {textRow('firstName', 'First Name *')}
                      {textRow('lastName', 'Last Name *')}
                      {textRow('email', 'Email *', 'email')}
                      {textRow('phoneNumber', 'Phone Number', 'tel', '+1234567890')}
                      {textRow('dateOfBirth', 'Date of Birth', 'date')}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="employment">
                  <AccordionTrigger>Employment</AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 space-y-3">
                      <div>
                        <Label htmlFor="workerType">Engagement Type</Label>
                        <Select
                          value={editForm.workerType || worker.workerType}
                          onValueChange={(v) => handleField('workerType', v)}
                          disabled={hasLiveContracts || isThirdParty}
                        >
                          <SelectTrigger id="workerType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            {isThirdParty && <SelectItem value="third_party_worker">Third Party</SelectItem>}
                          </SelectContent>
                        </Select>
                        {hasLiveContracts && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Locked — this worker has active contracts. End or terminate them first.
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="address">
                  <AccordionTrigger>Address</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="col-span-2">
                        <Label htmlFor="streetAddress">Street Address</Label>
                        <Input id="streetAddress" value={editForm.streetAddress ?? ''} onChange={(e) => handleField('streetAddress', e.target.value)} />
                      </div>
                      {textRow('suburb', 'Suburb / City')}
                      {textRow('state', 'State / Region')}
                      {textRow('postcode', 'Postcode')}
                      <div>
                        <Label htmlFor="countryId">Country</Label>
                        <Select value={editForm.countryId || ''} onValueChange={(v) => handleField('countryId', v)}>
                          <SelectTrigger id="countryId"><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>
                            {countries.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {(editForm.workerType === 'contractor' || worker.workerType === 'contractor') && (
                  <AccordionItem value="business">
                    <AccordionTrigger>Contractor Business</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        {textRow('businessName', 'Business Name')}
                        <div>
                          <Label htmlFor="businessStructure">Business Structure</Label>
                          <Select value={editForm.businessStructure || ''} onValueChange={(v) => handleField('businessStructure', v)}>
                            <SelectTrigger id="businessStructure"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sole_trader">Sole Trader</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="trust">Trust</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">{textAreaRow('businessAddress', 'Business Address')}</div>
                        {textRow('businessPhone', 'Business Phone')}
                        {textRow('businessEmail', 'Business Email', 'email')}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="tax">
                  <AccordionTrigger>Tax IDs</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {showFor(['AU']) && textRow('taxFileNumber', 'Tax File Number (AU)')}
                      {showFor(['AU']) && textRow('abn', 'ABN')}
                      {showFor(['AU']) && textRow('acn', 'ACN')}
                      {showFor(['NZ']) && textRow('irdNumber', 'IRD Number (NZ)')}
                      {showFor(['US']) && textRow('ssn', 'SSN (US)')}
                      {showFor(['US']) && textRow('ein', 'EIN (US)')}
                      {showFor(['GB','UK']) && textRow('niNumber', 'NI Number (UK)')}
                      {showFor(['GB','UK']) && textRow('utrNumber', 'UTR (UK)')}
                      {showFor(['CA']) && textRow('sin', 'SIN (CA)')}
                      {showFor(['CA']) && textRow('businessNumber', 'Business Number (CA)')}
                      <div className="flex items-center gap-3 col-span-2">
                        <Switch id="gstRegistered" checked={!!editForm.gstRegistered} onCheckedChange={(v) => handleField('gstRegistered', v)} />
                        <Label htmlFor="gstRegistered">GST / VAT Registered</Label>
                      </div>
                      {editForm.gstRegistered && textRow('gstNumber', 'GST / VAT Number')}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bank">
                  <AccordionTrigger>Bank</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {textRow('accountName', 'Account Name')}
                      {textRow('bankName', 'Bank Name')}
                      {showFor(['AU']) && textRow('bsb', 'BSB')}
                      {textRow('accountNumber', 'Account Number')}
                      {showFor(['GB','UK','FR','DE','ES','IT','NL','IE']) && textRow('iban', 'IBAN')}
                      {textRow('swiftCode', 'SWIFT Code')}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="emergency">
                  <AccordionTrigger>Emergency Contact</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {textRow('emergencyContactName', 'Name')}
                      {textRow('emergencyContactRelationship', 'Relationship')}
                      {textRow('emergencyContactPhone', 'Phone', 'tel')}
                      {textRow('emergencyContactEmail', 'Email', 'email')}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pension">
                  <AccordionTrigger>Pension / Retirement</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {showFor(['AU']) && textRow('superFundName', 'Super Fund Name')}
                      {showFor(['AU']) && textRow('superFundAbn', 'Super Fund ABN')}
                      {showFor(['AU']) && textRow('superMemberNumber', 'Super Member Number')}
                      {showFor(['AU']) && <div className="col-span-2">{textAreaRow('superFundAddress', 'Super Fund Address')}</div>}
                      {showFor(['NZ']) && textRow('kiwiSaverProvider', 'KiwiSaver Provider')}
                      {showFor(['NZ']) && textRow('kiwiSaverNumber', 'KiwiSaver Number')}
                      {showFor(['US']) && textRow('plan401kProvider', '401(k) Provider')}
                      {showFor(['US']) && textRow('plan401kNumber', '401(k) Account Number')}
                      {showFor(['GB','UK']) && textRow('pensionProvider', 'Pension Provider')}
                      {showFor(['GB','UK']) && textRow('pensionNumber', 'Pension Number')}
                      {showFor(['CA']) && textRow('cppNumber', 'CPP Number')}
                      {showFor(['CA']) && textRow('qppNumber', 'QPP Number')}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ) : (
            /* -------------------- READ-ONLY VIEW -------------------- */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Full Name</p>
                      <p className="text-sm text-muted-foreground">{worker.firstName} {worker.lastName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{worker.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Worker Type</p>
                      <p className="text-sm text-muted-foreground">{workerTypeLabel(worker.workerType)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{worker.phoneNumber || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Date of Birth</p>
                      <p className="text-sm text-muted-foreground">{formatDate(worker.dateOfBirth)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

              {worker.workerType === 'contractor' && (() => {
                const hasAny = !!(worker.businessName || worker.businessStructure || worker.abn || worker.acn);
                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Building2 className="w-5 h-5" />
                        <span>Business Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!hasAny && (
                        <p className="text-sm text-muted-foreground italic">
                          Not provided yet — the contractor will fill this in during onboarding.
                        </p>
                      )}
                      <div>
                        <p className="text-sm font-medium">Business Name</p>
                        <p className="text-sm text-muted-foreground">{worker.businessName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Business Structure</p>
                        <p className="text-sm text-muted-foreground">
                          {worker.businessStructure
                            ? worker.businessStructure.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">ABN</p>
                        <p className="text-sm text-muted-foreground">{worker.abn || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">ACN</p>
                        <p className="text-sm text-muted-foreground">{worker.acn || '—'}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

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
                        {'•'.repeat(Math.max(0, worker.accountNumber.length - 4))}
                        {worker.accountNumber.slice(-4)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

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

              {/* -------------------- CHANGE HISTORY -------------------- */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <History className="w-5 h-5" />
                      <span>Change History</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory((s) => !s)}>
                      {showHistory ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  <CardDescription>Recent edits made to this worker's profile.</CardDescription>
                </CardHeader>
                {showHistory && (
                  <CardContent>
                    {historyLoading ? (
                      <p className="text-sm text-muted-foreground">Loading history…</p>
                    ) : changeLog.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No changes recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-muted-foreground border-b">
                            <tr>
                              <th className="py-2 pr-3">When</th>
                              <th className="py-2 pr-3">Who</th>
                              <th className="py-2 pr-3">Field</th>
                              <th className="py-2 pr-3">From</th>
                              <th className="py-2 pr-3">To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changeLog.map((row: any) => (
                              <tr key={row.id} className="border-b last:border-0">
                                <td className="py-2 pr-3 whitespace-nowrap">{new Date(row.changedAt).toLocaleString()}</td>
                                <td className="py-2 pr-3">{row.changedByName}</td>
                                <td className="py-2 pr-3 font-medium">{row.label}</td>
                                <td className="py-2 pr-3 text-muted-foreground">{row.oldValueDisplay}</td>
                                <td className="py-2 pr-3">{row.newValueDisplay}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          )}
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
