import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/layout/navigation";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
        toast({
          title: "Reset Link Sent",
          description: "If an account exists with this email, you will receive password reset instructions shortly.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Request Failed",
          description: error.message || "Unable to process request. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-secondary-900 mb-4">Forgot Password</h1>
            <p className="text-xl text-secondary-600">
              Reset your SDP Global Pay account password
            </p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary-600">Reset Password</CardTitle>
                  <CardDescription>
                    {submitted 
                      ? "Check your email for reset instructions"
                      : "Enter your email address to receive a password reset link"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                          If an account exists with the email address <strong>{email}</strong>, you will receive password reset instructions shortly.
                        </p>
                        <p className="text-sm text-green-700 mt-2">
                          The link will expire in 1 hour for security reasons.
                        </p>
                      </div>
                      
                      <div className="pt-4 space-y-2">
                        <Button
                          onClick={() => setSubmitted(false)}
                          variant="outline"
                          className="w-full"
                          data-testid="button-try-another-email"
                        >
                          Try Another Email
                        </Button>
                        
                        <Link href="/login">
                          <Button
                            variant="ghost"
                            className="w-full"
                            data-testid="link-back-to-login"
                          >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                          data-testid="input-email"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="button-send-reset-link"
                      >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                      </Button>

                      <div className="text-center pt-2">
                        <Link href="/login">
                          <Button
                            variant="ghost"
                            className="text-sm"
                            data-testid="link-back-to-login-form"
                          >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                          </Button>
                        </Link>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
