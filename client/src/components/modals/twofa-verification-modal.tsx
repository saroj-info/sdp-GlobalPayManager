import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertCircle } from "lucide-react";

interface TwoFAVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  pendingToken?: string | null;
  onVerificationSuccess: (token: string) => void;
}

export function TwoFAVerificationModal({ 
  open, 
  onOpenChange, 
  userId,
  pendingToken,
  onVerificationSuccess 
}: TwoFAVerificationModalProps) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [trustThisDevice, setTrustThisDevice] = useState(false);
  const { toast } = useToast();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCode("");
      setUseBackupCode(false);
      setTrustThisDevice(false);
    }
  }, [open]);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/verify-login', {
        userId,
        code,
        useBackupCode,
        trustThisDevice,
        pendingToken, // SECURITY FIX: Include pending token for verification
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Verification Successful",
        description: "You have been logged in successfully.",
      });
      
      // SECURITY FIX: Pass auth token to callback (received after successful 2FA)
      if (data.token) {
        onVerificationSuccess(data.token);
      } else {
        // Fallback for legacy flow
        onVerificationSuccess('');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
      setCode(""); // Clear code on error
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate code length
    const expectedLength = useBackupCode ? 8 : 6;
    if (code.length !== expectedLength) {
      toast({
        title: "Invalid Code",
        description: useBackupCode 
          ? "Backup code must be 8 characters long."
          : "Verification code must be 6 digits.",
        variant: "destructive",
      });
      return;
    }

    verifyMutation.mutate();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits for TOTP codes, alphanumeric for backup codes
    if (useBackupCode) {
      setCode(value.slice(0, 8).toUpperCase());
    } else {
      const digits = value.replace(/\D/g, '');
      setCode(digits.slice(0, 6));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" data-testid="twofa-verification-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="modal-title">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription data-testid="modal-description">
            Enter the {useBackupCode ? "backup code" : "verification code from your authenticator app"} to continue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code" data-testid="label-code">
              {useBackupCode ? "Backup Code" : "Verification Code"}
            </Label>
            <Input
              id="verification-code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
              maxLength={useBackupCode ? 8 : 6}
              className="text-center text-2xl tracking-widest font-mono"
              autoComplete="off"
              autoFocus
              data-testid="input-verification-code"
              disabled={verifyMutation.isPending}
            />
            <p className="text-xs text-muted-foreground text-center" data-testid="code-hint">
              {useBackupCode 
                ? "Enter the 8-character backup code" 
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-backup-code"
              checked={useBackupCode}
              onCheckedChange={(checked) => {
                setUseBackupCode(checked === true);
                setCode(""); // Clear code when switching modes
              }}
              disabled={verifyMutation.isPending}
              data-testid="checkbox-use-backup-code"
            />
            <Label 
              htmlFor="use-backup-code" 
              className="text-sm font-normal cursor-pointer"
              data-testid="label-use-backup-code"
            >
              Use backup code instead
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trust-device"
              checked={trustThisDevice}
              onCheckedChange={(checked) => setTrustThisDevice(checked === true)}
              disabled={verifyMutation.isPending}
              data-testid="checkbox-trust-device"
            />
            <Label 
              htmlFor="trust-device" 
              className="text-sm font-normal cursor-pointer"
              data-testid="label-trust-device"
            >
              Trust this device for 30 days
            </Label>
          </div>

          {verifyMutation.isError && (
            <Alert variant="destructive" data-testid="error-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription data-testid="error-message">
                Verification failed. Please check your code and try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={verifyMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={verifyMutation.isPending || code.length === 0}
              data-testid="button-verify"
            >
              {verifyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                "Verify & Login"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
