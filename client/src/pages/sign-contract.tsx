import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, User, Building, Calendar, DollarSign, MapPin, Mail, Phone, Globe, Briefcase, Users as UsersIcon, CalendarClock, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { ContractWithDerived } from "@/types/api";

export default function SignContract() {
  const [, params] = useRoute("/sign/:token");
  const [signature, setSignature] = useState("");
  const [isViewed, setIsViewed] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  const token = params?.token;

  // Redirect to login if not authenticated, with a clear message first
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (token) {
        sessionStorage.setItem('pendingSigningToken', token);
      }
      toast({
        title: "Please log in first",
        description: "You need to log in before signing the contract. Redirecting to login...",
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  }, [isAuthenticated, isLoading, token, toast]);

  // Fetch contract details using the token
  const { data: contract, isLoading: contractLoading, error } = useQuery<ContractWithDerived>({
    queryKey: ["/api/contracts/sign", token],
    enabled: !!token && isAuthenticated,
  });

  // Track when the contract is viewed
  useEffect(() => {
    if (contract && !isViewed) {
      setIsViewed(true);
      // Record contract view
      apiRequest("POST", `/api/contracts/${contract.id}/viewed`).catch(console.error);
    }
  }, [contract, isViewed]);

  // Sign contract mutation
  const signContractMutation = useMutation({
    mutationFn: async () => {
      if (!signature.trim()) {
        throw new Error("Please enter your full name as signature");
      }

      return await apiRequest("POST", `/api/contracts/${contract!.id}/sign`, {
        signature: signature.trim(),
        token
      });
    },
    onSuccess: () => {
      toast({
        title: "Contract Signed Successfully",
        description: "Your contract has been signed and recorded. Redirecting to home...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/sign", token] });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error Signing Contract",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || contractLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Loading contract...</p>
        </div>
      </div>
    );
  }

  // User not authenticated — show login-required screen (redirect is already queued via the effect above)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-blue-600">Login Required</CardTitle>
            <CardDescription>
              Please log in before signing your contract. Redirecting to the login page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Contract Not Found</CardTitle>
            <CardDescription>
              The contract link is invalid or has expired. Please contact your employer for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAlreadySigned = contract.signedAt;

  const formatDateLong = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  const titleCase = (s?: string | null) =>
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

  const c: any = contract;
  const headerLabel = c.contractName || c.customRoleTitle || c.roleTitle?.title || 'Contract';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Review & Signature</h1>
          <p className="text-gray-600">Please review the contract details below and sign if you agree to the terms</p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700 bg-white border rounded-full px-4 py-1.5 shadow-sm">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-semibold">{headerLabel}</span>
            {c.country?.name && (
              <>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1 text-gray-600"><Globe className="h-3.5 w-3.5" />{c.country.name}</span>
              </>
            )}
            {c.emailSentAt && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">Sent {formatDateLong(c.emailSentAt)}</span>
              </>
            )}
          </div>
        </div>

        {isAlreadySigned && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-semibold text-green-800">Contract Already Signed</p>
                <p className="text-green-700 text-sm">
                  This contract was signed on {new Date(contract.signedAt!).toLocaleDateString()} at {new Date(contract.signedAt!).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contract Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ── Parties ───────────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <UsersIcon className="h-3.5 w-3.5" /> Parties
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Worker</Label>
                      <div className="flex items-center mt-1">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{c.worker?.firstName} {c.worker?.lastName}</span>
                      </div>
                      {c.worker?.email && (
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 mr-2 text-gray-400" />{c.worker.email}
                        </div>
                      )}
                      {c.worker?.phoneNumber && (
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5 mr-2 text-gray-400" />{c.worker.phoneNumber}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Employing Company</Label>
                      <div className="flex items-center mt-1">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{c.business?.name}</span>
                      </div>
                      {c.country?.name && (
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 mr-2 text-gray-400" />{c.country.name}{c.country.code ? ` (${c.country.code})` : ''}
                        </div>
                      )}
                    </div>
                    {c.customerBusiness?.name && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Host / Customer Business</Label>
                        <div className="flex items-center mt-1">
                          <Building className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{c.customerBusiness.name}</span>
                        </div>
                      </div>
                    )}
                    {c.thirdPartyBusiness?.name && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Third-party Vendor</Label>
                        <div className="flex items-center mt-1">
                          <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{c.thirdPartyBusiness.name}</span>
                        </div>
                      </div>
                    )}
                    {c.sdpEntity?.name && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">SDP Entity</Label>
                        <div className="flex items-center mt-1">
                          <Globe className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">{c.sdpEntity.companyName || `SDP ${c.sdpEntity.name}`}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* ── Engagement ────────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> Engagement
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Position</Label>
                      <p className="font-medium mt-1">{c.roleTitle?.title || c.customRoleTitle || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Employment Type</Label>
                      <Badge variant="outline" className="mt-1">{titleCase(c.employmentType)}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Start Date</Label>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{formatDateLong(c.startDate)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">End Date</Label>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{c.endDate ? formatDateLong(c.endDate) : 'Ongoing'}</span>
                      </div>
                    </div>
                    {c.noticePeriodDays != null && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Notice Period</Label>
                        <p className="font-medium mt-1">{c.noticePeriodDays} day{c.noticePeriodDays === 1 ? '' : 's'}</p>
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                {/* ── Compensation ──────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Compensation
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {c.rateStructure !== 'multiple' ? (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Worker Rate</Label>
                        <div className="flex items-center mt-1">
                          <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium">
                            {c.currency} {parseFloat(c.rate || '0').toLocaleString()} per {c.rateType}
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Multi-rate contract — show the worker-pay summary as a range across rate lines.
                      Array.isArray(c.rateLines) && c.rateLines.length > 0 && (() => {
                        const amounts = c.rateLines
                          .map((rl: any) => parseFloat(rl.rate || '0'))
                          .filter((n: number) => !isNaN(n) && n > 0);
                        if (amounts.length === 0) return null;
                        const min = Math.min(...amounts);
                        const max = Math.max(...amounts);
                        const sample = c.rateLines[0];
                        const cur = sample.currency || c.currency;
                        const unit = (sample.rateType || c.rateType) === 'daily' ? 'day' : (sample.rateType || c.rateType) === 'hourly' ? 'hr' : (sample.rateType || c.rateType);
                        return (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Worker Rate</Label>
                            <div className="flex items-center mt-1">
                              <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="font-medium">
                                {min === max
                                  ? `${cur} ${min.toLocaleString()} / ${unit}`
                                  : `${cur} ${min.toLocaleString()} – ${max.toLocaleString()} / ${unit}`}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Varies by project — see full breakdown below.
                            </p>
                          </div>
                        );
                      })()
                    )}
                    {c.totalPackageValue && parseFloat(c.totalPackageValue) > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Total Package (CTC)</Label>
                        <p className="font-medium mt-1">
                          {c.currency} {parseFloat(c.totalPackageValue).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {c.rateStructure && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Rate Structure</Label>
                        <Badge variant="outline" className="mt-1">{titleCase(c.rateStructure)}</Badge>
                      </div>
                    )}
                    {c.rateStructure !== 'multiple' && c.rateType && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Rate Type</Label>
                        <Badge variant="outline" className="mt-1">{titleCase(c.rateType)}</Badge>
                      </div>
                    )}
                  </div>

                  {/* Multi-rate breakdown — shown whenever the contract uses multiple rates,
                      OR whenever rate lines are present even on a single-rate contract. */}
                  {(c.rateStructure === 'multiple' || (Array.isArray(c.rateLines) && c.rateLines.length > 0)) && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-gray-500">
                        Project / Rate Lines{Array.isArray(c.rateLines) && c.rateLines.length > 0 ? ` (${c.rateLines.length})` : ''}
                      </Label>
                      {Array.isArray(c.rateLines) && c.rateLines.length > 0 ? (
                        <div className="mt-2 border rounded-md overflow-hidden">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 border-b text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            <div className="col-span-5">Project</div>
                            <div className="col-span-3">Type</div>
                            <div className="col-span-4 text-right">Worker Rate</div>
                          </div>
                          <div className="divide-y">
                            {c.rateLines.map((rl: any) => (
                              <div key={rl.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                                <div className="col-span-5 flex flex-col min-w-0">
                                  <span className="font-medium truncate flex items-center gap-1">
                                    {rl.projectName || rl.description || 'Rate line'}
                                    {rl.isDefault && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Default</Badge>
                                    )}
                                  </span>
                                  {rl.projectCode && <span className="text-xs text-gray-500 truncate">{rl.projectCode}</span>}
                                </div>
                                <div className="col-span-3">
                                  <Badge variant="outline" className="capitalize">{rl.rateType || c.rateType}</Badge>
                                </div>
                                <div className="col-span-4 text-right font-medium tabular-nums">
                                  {rl.currency || c.currency} {parseFloat(rl.rate || '0').toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 border border-dashed rounded-md p-3 text-sm text-gray-500 italic">
                          Multiple rate structure selected, but no project rate lines have been added yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remuneration breakdown */}
                  {Array.isArray(c.remunerationLines) && c.remunerationLines.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-gray-500">Remuneration Breakdown</Label>
                      <div className="mt-2 border rounded-md divide-y">
                        {c.remunerationLines.map((rl: any) => (
                          <div key={rl.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium">{rl.description || titleCase(rl.type)}</span>
                              <span className="text-xs text-gray-500">{titleCase(rl.type)} · {titleCase(rl.frequency)}</span>
                            </div>
                            <span className="font-medium tabular-nums">
                              {c.currency} {parseFloat(rl.amount || '0').toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* ── Timesheets & Payment Schedule ─────────────────────── */}
                {c.requiresTimesheet && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" /> Timesheet & Payment
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {c.timesheetFrequency && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Timesheet Frequency</Label>
                            <Badge variant="outline" className="mt-1">{titleCase(c.timesheetFrequency)}</Badge>
                          </div>
                        )}
                        {c.timesheetCalculationMethod && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Calculation Method</Label>
                            <p className="font-medium mt-1">{titleCase(c.timesheetCalculationMethod)}</p>
                          </div>
                        )}
                        {c.timesheetApproverRole && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Approved By</Label>
                            <Badge variant="outline" className="mt-1">{titleCase(c.timesheetApproverRole)}</Badge>
                          </div>
                        )}
                        {c.paymentScheduleType && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Payment Schedule</Label>
                            <p className="font-medium mt-1">
                              {c.paymentScheduleType === 'days_after'
                                ? `${c.paymentDaysAfterPeriod ?? '—'} day${c.paymentDaysAfterPeriod === 1 ? '' : 's'} after period end`
                                : c.paymentDay
                                  ? `Specific day: ${c.paymentDay}`
                                  : titleCase(c.paymentScheduleType)}
                            </p>
                            {c.paymentHolidayRule && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                If a payment falls on a holiday, paid on the previous working day.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {/* ── Workplace / Client (only when work is for a host client) ──
                    NOTE: customer billing rate, fixed billing amount, and customer currency are
                    deliberately NOT shown — workers should not see what the client is charged. */}
                {c.isForClient && (c.clientName || c.clientCity || c.clientCountry) && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5" /> Workplace / Client
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {c.clientName && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Client</Label>
                            <p className="font-medium mt-1">{c.clientName}</p>
                          </div>
                        )}
                        {(c.clientCity || c.clientCountry) && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Location</Label>
                            <p className="font-medium mt-1">
                              {[c.clientCity, c.clientCountry].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}
                        {c.clientAddress && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-gray-500">Address</Label>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{c.clientAddress}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {c.jobDescription && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Job Description</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        <p className="whitespace-pre-wrap">{c.jobDescription}</p>
                      </div>
                    </div>
                  </>
                )}

                {c.contractDocument && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5" />Full Contract Terms
                      </Label>
                      <div className="mt-1 p-4 bg-gray-50 rounded-md max-h-96 overflow-y-auto">
                        <div className="whitespace-pre-wrap text-sm">{c.contractDocument}</div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Signing Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  {isAlreadySigned 
                    ? "This contract has been signed" 
                    : "Type your full name to sign this contract"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAlreadySigned ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="font-medium text-green-800">Signed by:</p>
                      <p className="text-green-700">{contract.signatureText}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Signed: {new Date(contract.signedAt!).toLocaleString()}</p>
                      {contract.signingLocation && (
                        <p>Location: {JSON.parse(contract.signingLocation).city}, {JSON.parse(contract.signingLocation).country}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="signature">Full Name *</Label>
                      <Input
                        id="signature"
                        type="text"
                        placeholder="Type your full legal name"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="mt-1"
                        data-testid="input-signature"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        By typing your name, you agree to the terms and conditions of this contract
                      </p>
                    </div>

                    <Button
                      onClick={() => signContractMutation.mutate()}
                      disabled={signContractMutation.isPending || !signature.trim()}
                      className="w-full"
                      data-testid="button-sign-contract"
                    >
                      {signContractMutation.isPending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Signing Contract...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Sign Contract
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Your IP address and location will be recorded</p>
                      <p>• This signature is legally binding</p>
                      <p>• You will receive a confirmation email</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}