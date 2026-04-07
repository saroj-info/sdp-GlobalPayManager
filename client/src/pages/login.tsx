import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/layout/navigation";
import { TwoFAVerificationModal } from "@/components/modals";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const verificationError = params.get('verification_error');
    const emailParam = params.get('email');

    if (verified === 'true') {
      setVerificationMessage({ type: 'success', text: 'Your email has been verified successfully. You can now log in.' });
    } else if (verified === 'already') {
      setVerificationMessage({ type: 'info', text: 'Your email address is already verified. Please log in below.' });
    } else if (verificationError === 'invalid') {
      setVerificationMessage({ type: 'error', text: 'This verification link is invalid or has already been used. If you already verified your email, please log in below.' });
    } else if (verificationError === 'expired') {
      setVerificationMessage({ type: 'error', text: 'This verification link has expired. Please request a new verification email.' });
      if (emailParam) setEmail(emailParam);
    } else if (verificationError === 'error') {
      setVerificationMessage({ type: 'error', text: 'Something went wrong while verifying your email. Please try again or request a new verification email.' });
    }

    if (verified || verificationError) {
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if 2FA is required
        if (data.requiresTwoFactor) {
          // User has 2FA enabled - show verification modal
          console.log('2FA required for user, showing verification modal');
          setUserId(data.userId);
          setPendingToken(data.pendingToken);
          setShow2FAModal(true);
          setIsLoading(false);
          return;
        }
        
        // No 2FA required - login successful (token-based auth)
        // Store the auth token
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        
        toast({
          title: "Login Successful",
          description: `Welcome, ${data.user.firstName} ${data.user.lastName}!`,
        });
        
        // Use window.location for full page reload to ensure auth is loaded
        const pendingSigningToken = sessionStorage.getItem('pendingSigningToken');
        if (pendingSigningToken) {
          sessionStorage.removeItem('pendingSigningToken');
          window.location.href = `/sign/${pendingSigningToken}`;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        const error = await response.json();
        if (response.status === 403 && error.requiresEmailVerification) {
          toast({
            title: "Account unverified",
            description: "Please verify your email address before logging in. Check your inbox for the verification link.",
            variant: "destructive",
          });
          setVerificationMessage({
            type: 'error',
            text: 'Account unverified. Please check your inbox for the verification email, or request a new one.'
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message || "Invalid credentials",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive", 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerificationSuccess = (token: string) => {
    setShow2FAModal(false);
    
    // SECURITY FIX: Store auth token only after successful 2FA verification
    localStorage.setItem('authToken', token);
    console.log('Auth token saved after 2FA verification');
    
    toast({
      title: "Login Successful",
      description: "Welcome back!",
    });
    
    // Check if there's a pending signing token from email link
    const pendingSigningToken = sessionStorage.getItem('pendingSigningToken');
    if (pendingSigningToken) {
      sessionStorage.removeItem('pendingSigningToken');
      setLocation(`/sign/${pendingSigningToken}`);
    } else {
      setLocation('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Login</h1>
            <p className="text-xl text-secondary-600">
              Access your SDP Global Pay account
            </p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md">
              {verificationMessage && (
                <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
                  verificationMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                  verificationMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                  'bg-blue-50 border border-blue-200 text-blue-800'
                }`}>
                  {verificationMessage.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" /> :
                   verificationMessage.type === 'error' ? <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" /> :
                   <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                  <p className="text-sm">{verificationMessage.text}</p>
                </div>
              )}
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary-600">Sign In</CardTitle>
                  <CardDescription>
                    Enter your email or username and password to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email or Username</Label>
                      <Input
                        id="email"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email or username"
                        required
                        data-testid="input-email"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password">
                          <span className="text-sm text-primary-600 hover:text-primary-700 hover:underline cursor-pointer" data-testid="link-forgot-password">
                            Forgot Password?
                          </span>
                        </Link>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        data-testid="input-password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700"
                      disabled={isLoading}
                      data-testid="button-login"
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {userId && (
        <TwoFAVerificationModal
          open={show2FAModal}
          onOpenChange={setShow2FAModal}
          userId={userId}
          pendingToken={pendingToken}
          onVerificationSuccess={handle2FAVerificationSuccess}
        />
      )}
    </div>
  );
}