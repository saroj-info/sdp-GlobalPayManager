import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TwoFAEnrollmentModal } from "@/components/modals/twofa-enrollment-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, Trash2, Download, Eye, Copy, Check, AlertTriangle, ChevronDown, History } from "lucide-react";
import { format } from "date-fns";

interface TwoFAStatus {
  enabled: boolean;
  method: string | null;
  enabledAt: string | null;
}

interface AuditLog {
  id: string;
  userId: string;
  eventType: string;
  eventDetails?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  success: boolean;
  createdAt: string;
}

const disableSchema = z.object({
  code: z.string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must contain only numbers"),
});

type DisableFormData = z.infer<typeof disableSchema>;

export default function SecuritySettings() {
  const { toast } = useToast();
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [backupCodesModalOpen, setBackupCodesModalOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);

  usePageHeader("Security Settings", "Manage your account security and two-factor authentication");

  const disableForm = useForm<DisableFormData>({
    resolver: zodResolver(disableSchema),
    defaultValues: {
      code: "",
    },
  });

  const { data: twoFAStatus, isLoading: statusLoading } = useQuery<TwoFAStatus>({
    queryKey: ['/api/2fa/status'],
  });

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ['/api/2fa/audit-logs'],
    enabled: twoFAStatus?.enabled === true,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/regenerate-backup-codes', {});
      return response.json();
    },
    onSuccess: (data) => {
      setRegeneratedCodes(data.backupCodes);
      setBackupCodesModalOpen(true);
      toast({
        title: "Success",
        description: "New backup codes have been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate backup codes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/2fa/disable', { code });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been successfully disabled.",
      });
      setDisableDialogOpen(false);
      disableForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Disable Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDisableSubmit = (data: DisableFormData) => {
    disableMutation.mutate(data.code);
  };

  const handleDownloadBackupCodes = () => {
    const text = `Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Save these codes in a secure location.
Each code can only be used once.

${regeneratedCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

These codes can be used to access your account if you lose access to your authenticator app.
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `2fa-backup-codes-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Backup codes have been downloaded successfully.",
    });
  };

  const handleCopyBackupCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "Copied",
        description: "Backup code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy backup code",
        variant: "destructive",
      });
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'enrollment_started': 'Enrollment Started',
      'enrollment_completed': 'Enrollment Completed',
      'enrollment_verification_failed': 'Enrollment Failed',
      'verification_success': 'Login Verified',
      'verification_failed': 'Login Failed',
      'backup_code_used': 'Backup Code Used',
      'disabled': '2FA Disabled',
      'backup_codes_regenerated': 'Backup Codes Regenerated',
      'disable_failed': 'Disable Failed',
    };
    return labels[eventType] || eventType;
  };

  const getEventIcon = (eventType: string, success: boolean) => {
    if (!success) {
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    }
    if (eventType.includes('disabled') || eventType.includes('failed')) {
      return <ShieldAlert className="h-4 w-4 text-orange-500" />;
    }
    return <ShieldCheck className="h-4 w-4 text-green-500" />;
  };

  if (statusLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const isEnabled = twoFAStatus?.enabled || false;

  return (
    <>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <Card data-testid="card-2fa-status">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary-600" />
                  <div>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={isEnabled ? "default" : "secondary"}
                  className={isEnabled ? "bg-green-500" : ""}
                  data-testid="badge-2fa-status"
                >
                  {isEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEnabled ? (
                <>
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription data-testid="text-2fa-explanation">
                      Two-factor authentication (2FA) adds an extra layer of security to your account. 
                      When enabled, you'll need to enter a code from your authenticator app in addition 
                      to your password when logging in.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => setEnrollmentModalOpen(true)}
                      className="flex items-center gap-2"
                      data-testid="button-enable-2fa"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Enable Two-Factor Authentication
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900" data-testid="text-2fa-active">
                        Two-Factor Authentication is Active
                      </p>
                      {twoFAStatus?.enabledAt && (
                        <p className="text-sm text-green-700" data-testid="text-2fa-enabled-at">
                          Enabled on {format(new Date(twoFAStatus.enabledAt), 'PPP')}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-secondary-700">Actions</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => regenerateMutation.mutate()}
                        disabled={regenerateMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-regenerate-codes"
                      >
                        <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                        {regenerateMutation.isPending ? 'Generating...' : 'Regenerate Backup Codes'}
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => setDisableDialogOpen(true)}
                        className="flex items-center gap-2"
                        data-testid="button-disable-2fa"
                      >
                        <Trash2 className="h-4 w-4" />
                        Disable 2FA
                      </Button>
                    </div>
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription data-testid="text-backup-codes-warning">
                        <strong>Important:</strong> Regenerating backup codes will invalidate all previous codes. 
                        Make sure to save the new codes in a secure location.
                      </AlertDescription>
                    </Alert>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {isEnabled && auditLogs && auditLogs.length > 0 && (
            <Card data-testid="card-audit-logs">
              <Collapsible open={auditLogsOpen} onOpenChange={setAuditLogsOpen}>
                <CardHeader>
                  <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity" data-testid="button-toggle-audit-logs">
                    <div className="flex items-center gap-3">
                      <History className="h-5 w-5 text-primary-600" />
                      <div className="text-left">
                        <CardTitle>Security Activity Log</CardTitle>
                        <CardDescription>
                          Recent two-factor authentication events
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${auditLogsOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-3">
                      {auditLogs.slice(0, 10).map((log: any) => (
                        <div 
                          key={log.id}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-secondary-50 transition-colors"
                          data-testid={`audit-log-${log.id}`}
                        >
                          <div className="mt-0.5">
                            {getEventIcon(log.eventType, log.success)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm" data-testid={`audit-log-type-${log.id}`}>
                                {getEventTypeLabel(log.eventType)}
                              </p>
                              <Badge variant={log.success ? "outline" : "destructive"} className="text-xs">
                                {log.success ? 'Success' : 'Failed'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-secondary-600">
                              <span data-testid={`audit-log-time-${log.id}`}>
                                {format(new Date(log.createdAt), 'PPp')}
                              </span>
                              {log.ipAddress && (
                                <span data-testid={`audit-log-ip-${log.id}`}>
                                  IP: {log.ipAddress}
                                </span>
                              )}
                            </div>
                            {log.eventDetails && (
                              <p className="text-xs text-secondary-500 mt-1" data-testid={`audit-log-details-${log.id}`}>
                                {log.eventDetails}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

        </div>
      </div>

      <TwoFAEnrollmentModal 
        open={enrollmentModalOpen} 
        onOpenChange={setEnrollmentModalOpen}
        onEnrollmentComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
        }}
      />

      <Dialog open={backupCodesModalOpen} onOpenChange={setBackupCodesModalOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="modal-backup-codes">
          <DialogHeader>
            <DialogTitle data-testid="modal-title-backup-codes">
              New Backup Codes Generated
            </DialogTitle>
            <DialogDescription data-testid="modal-description-backup-codes">
              Save these backup codes in a secure location. Each code can only be used once.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These codes replace all previous backup codes. Make sure to save them now.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2">
            {regeneratedCodes.map((code, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-secondary-50 border rounded font-mono text-sm"
                data-testid={`backup-code-${index}`}
              >
                <span>{code}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyBackupCode(code)}
                  data-testid={`button-copy-code-${index}`}
                >
                  {copiedCode === code ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={handleDownloadBackupCodes}
              className="flex items-center gap-2"
              data-testid="button-download-codes"
            >
              <Download className="h-4 w-4" />
              Download Codes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBackupCodesModalOpen(false);
                setRegeneratedCodes([]);
              }}
              data-testid="button-close-codes-modal"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent data-testid="dialog-disable-2fa">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="dialog-title-disable">
              Disable Two-Factor Authentication?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="dialog-description-disable">
              This will reduce the security of your account. You'll need to enter a verification code from your authenticator app to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Form {...disableForm}>
            <form onSubmit={disableForm.handleSubmit(handleDisableSubmit)} className="space-y-4">
              <FormField
                control={disableForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="000000"
                        maxLength={6}
                        data-testid="input-disable-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={() => disableForm.reset()}
                  data-testid="button-cancel-disable"
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={disableMutation.isPending}
                  data-testid="button-confirm-disable"
                >
                  {disableMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}