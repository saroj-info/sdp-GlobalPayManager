import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import QRCode from "qrcode";
import * as OTPAuth from "otpauth";

export default function AcceptBusinessInvitation() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 2FA fields
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [setup2FA, setSetup2FA] = useState(false);

  const [formErrors, setFormErrors] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
  });

  // Fetch invite details
  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/business-users/invite/${token}`);
        if (!response.ok) {
          throw new Error("Invalid or expired invitation");
        }
        const data = await response.json();
        setInviteData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  // Setup 2FA when user clicks setup button
  const handleSetup2FA = async () => {
    const secret = OTPAuth.Secret.fromBase32(
      OTPAuth.Secret.fromUTF8(crypto.randomUUID()).base32
    );
    
    const totp = new OTPAuth.TOTP({
      issuer: 'SDP Global Pay',
      label: inviteData?.email || '',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    setTotpSecret(secret.base32);

    try {
      const qrUrl = await QRCode.toDataURL(totp.toString());
      setQrCodeUrl(qrUrl);
      setSetup2FA(true);
    } catch (err) {
      setError("Failed to generate QR code");
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      verificationCode: "",
    };

    if (!firstName || firstName.length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    }

    if (!lastName || lastName.length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!setup2FA) {
      errors.verificationCode = "Please set up two-factor authentication";
    } else if (!verificationCode) {
      errors.verificationCode = "Verification code is required";
    } else if (!/^\d{6}$/.test(verificationCode)) {
      errors.verificationCode = "Verification code must be 6 digits";
    }

    setFormErrors(errors);
    return !errors.firstName && !errors.lastName && !errors.password && !errors.confirmPassword && !errors.verificationCode;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const data = await apiRequest("POST", "/api/business-users/accept", {
        token,
        firstName,
        lastName,
        password,
        totpSecret,
        totpVerificationCode: verificationCode,
      });

      setBackupCodes(data.backupCodes || []);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation("/")} 
              className="w-full"
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-center">Account Created Successfully!</CardTitle>
            <CardDescription className="text-center">
              Save your backup codes in a secure location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">⚠️ Important: Backup Codes</h3>
              <p className="text-sm text-amber-800 mb-3">
                These backup codes can be used if you lose access to your authenticator app. 
                Each code can only be used once. Store them securely!
              </p>
              <div className="bg-white rounded p-4 font-mono text-sm space-y-1 max-h-48 overflow-y-auto">
                {backupCodes.map((code, index) => (
                  <div key={index} className="text-gray-700">{code}</div>
                ))}
              </div>
              <Button
                onClick={copyBackupCodes}
                variant="outline"
                className="w-full mt-3"
                data-testid="button-copy-backup-codes"
              >
                {copiedBackupCodes ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Backup Codes
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full"
              data-testid="button-proceed-to-login"
            >
              Proceed to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Join Your Business Team</CardTitle>
          <CardDescription>
            Set up your account with password and two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-gray-900">Account Information</h3>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData?.email || ""}
                  disabled
                  className="bg-gray-100"
                  data-testid="input-email"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (formErrors.firstName) {
                        setFormErrors({ ...formErrors, firstName: "" });
                      }
                    }}
                    placeholder="Enter your first name"
                    data-testid="input-firstName"
                  />
                  {formErrors.firstName && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (formErrors.lastName) {
                        setFormErrors({ ...formErrors, lastName: "" });
                      }
                    }}
                    placeholder="Enter your last name"
                    data-testid="input-lastName"
                  />
                  {formErrors.lastName && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Password Setup */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="font-semibold text-gray-900">Set Your Password</h3>
              <div>
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formErrors.password) {
                        setFormErrors({ ...formErrors, password: "" });
                      }
                    }}
                    placeholder="Enter password (min. 8 characters)"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (formErrors.confirmPassword) {
                        setFormErrors({ ...formErrors, confirmPassword: "" });
                      }
                    }}
                    placeholder="Re-enter your password"
                    data-testid="input-confirmPassword"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    data-testid="button-toggle-confirmPassword"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* 2FA Setup */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Two-Factor Authentication (Required)</h3>
              
              {!setup2FA ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-3">
                    Two-factor authentication adds an extra layer of security to your account. 
                    You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                  </p>
                  <Button
                    type="button"
                    onClick={handleSetup2FA}
                    variant="outline"
                    className="w-full"
                    data-testid="button-setup-2fa"
                  >
                    Set Up Two-Factor Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Scan QR Code</h4>
                    <div className="flex justify-center mb-4">
                      {qrCodeUrl && (
                        <img 
                          src={qrCodeUrl} 
                          alt="2FA QR Code" 
                          className="w-48 h-48"
                          data-testid="img-qr-code"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 text-center mb-2">
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="bg-white rounded p-2 mt-3">
                      <p className="text-xs text-gray-500 text-center mb-1">
                        Or enter this code manually:
                      </p>
                      <p className="font-mono text-sm text-center break-all" data-testid="text-totp-secret">
                        {totpSecret}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="verificationCode">
                      Verification Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value.replace(/\D/g, ''));
                        if (formErrors.verificationCode) {
                          setFormErrors({ ...formErrors, verificationCode: "" });
                        }
                      }}
                      placeholder="Enter 6-digit code from your app"
                      data-testid="input-verificationCode"
                    />
                    {formErrors.verificationCode && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.verificationCode}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" data-testid="error-message">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={accepting || !setup2FA}
              data-testid="button-create-account"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <p className="text-sm text-gray-600 text-center">
              After creating your account, you'll receive backup codes for account recovery.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}