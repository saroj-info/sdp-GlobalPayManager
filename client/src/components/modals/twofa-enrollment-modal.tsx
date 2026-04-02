import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Shield, Download, AlertTriangle, Copy, Check, Eye, EyeOff } from "lucide-react";

interface TwoFAEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollmentComplete?: () => void;
}

const verificationSchema = z.object({
  code: z.string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must contain only numbers"),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

export function TwoFAEnrollmentModal({ open, onOpenChange, onEnrollmentComplete }: TwoFAEnrollmentModalProps) {
  const [step, setStep] = useState(1);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const { toast } = useToast();

  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setQrCodeDataUrl("");
      setSecret("");
      setBackupCodes([]);
      setShowSecret(false);
      setCopiedSecret(false);
      form.reset();
      
      // Automatically trigger enrollment when modal opens
      enrollMutation.mutate();
    }
  }, [open]);

  // Enroll mutation - Step 1
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/enroll', {});
      return response.json();
    },
    onSuccess: (data) => {
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment Error",
        description: error.message || "Failed to start 2FA enrollment. Please try again.",
        variant: "destructive",
      });
      onOpenChange(false);
    },
  });

  // Verify enrollment mutation - Step 2
  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/2fa/verify-enrollment', { code });
      return response.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep(3);
      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled successfully.",
      });
      // Invalidate 2FA status query
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVerifySubmit = (data: VerificationFormData) => {
    verifyMutation.mutate(data.code);
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      toast({
        title: "Copied",
        description: "Secret key copied to clipboard",
      });
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy secret key",
        variant: "destructive",
      });
    }
  };

  const handleDownloadBackupCodes = () => {
    const text = `Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Save these codes in a secure location.
Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

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
      toast({
        title: "Copied",
        description: "Backup code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy backup code",
        variant: "destructive",
      });
    }
  };

  const handleDone = () => {
    onOpenChange(false);
    if (onEnrollmentComplete) {
      onEnrollmentComplete();
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-6" data-testid="step-indicator">
      <div className="flex items-center space-x-2">
        {[1, 2, 3].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
              data-testid={`step-${stepNum}-indicator`}
            >
              {stepNum}
            </div>
            {stepNum < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  step > stepNum ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" data-testid="twofa-enrollment-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {step === 1 && "Set Up Two-Factor Authentication"}
            {step === 2 && "Verify Your Authenticator"}
            {step === 3 && "Save Your Backup Codes"}
          </DialogTitle>
          <DialogDescription data-testid="modal-description">
            {step === 1 && "Scan the QR code with your authenticator app"}
            {step === 2 && "Enter the 6-digit code from your authenticator app"}
            {step === 3 && "Store these codes in a secure location"}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {/* Step 1: QR Code Display */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-1-content">
            {enrollMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4" data-testid="loading-qr">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Generating QR code...</p>
              </div>
            ) : qrCodeDataUrl ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center space-x-2 text-primary">
                        <Smartphone className="h-5 w-5" />
                        <span className="font-medium">Step 1: Scan QR Code</span>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <img
                          src={qrCodeDataUrl}
                          alt="2FA QR Code"
                          className="w-48 h-48"
                          data-testid="qr-code-image"
                        />
                      </div>
                      <p className="text-sm text-center text-muted-foreground">
                        Scan this QR code with your authenticator app such as Google Authenticator, Authy, or Microsoft Authenticator
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Manual Entry Key</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSecret(!showSecret)}
                          data-testid="button-toggle-secret"
                        >
                          {showSecret ? (
                            <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                          ) : (
                            <><Eye className="h-4 w-4 mr-1" /> Show</>
                          )}
                        </Button>
                      </div>
                      {showSecret && (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={secret}
                            readOnly
                            className="font-mono text-sm"
                            data-testid="input-secret-key"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCopySecret}
                            data-testid="button-copy-secret"
                          >
                            {copiedSecret ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Can't scan the QR code? Manually enter this key in your authenticator app
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    data-testid="button-next-to-verification"
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Step 2: Verification */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-2-content">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription data-testid="verification-instructions">
                Enter the 6-digit code from your authenticator app to verify the setup
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleVerifySubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000000"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest font-mono"
                          autoComplete="off"
                          autoFocus
                          data-testid="input-verification-code"
                          disabled={verifyMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage data-testid="verification-code-error" />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={verifyMutation.isPending}
                    data-testid="button-back-to-qr"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={verifyMutation.isPending}
                    data-testid="button-verify-code"
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      "Verify & Enable"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 3 && (
          <div className="space-y-4" data-testid="step-3-content">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription data-testid="backup-codes-warning">
                <strong>Important:</strong> Save these backup codes in a secure location. Each code can only be used once to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-2" data-testid="backup-codes-grid">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md group"
                      data-testid={`backup-code-${index}`}
                    >
                      <span className="font-mono text-sm" data-testid={`backup-code-value-${index}`}>
                        {code}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleCopyBackupCode(code)}
                        data-testid={`button-copy-backup-code-${index}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadBackupCodes}
                data-testid="button-download-backup-codes"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Codes
              </Button>
              <Button
                type="button"
                onClick={handleDone}
                data-testid="button-done"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
