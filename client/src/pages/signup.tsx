import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Navigation } from "@/components/layout/navigation";
import { ChevronLeft, Building2, Users, Globe, CheckCircle, Mail, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Signup() {
  const [, setLocation] = useLocation();
  
  const { data: rawCountries = [] } = useQuery<any[]>({
    queryKey: ["/api/countries"],
  });

  // Deduplicate countries by code (case-insensitive) to avoid showing the same country twice
  const countries = (() => {
    const seen = new Set<string>();
    return rawCountries.filter((c: any) => {
      const key = (c?.code || c?.name || '').toString().toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const countryCount = countries.length || 10; // fallback to 10
  
  // Set document title and meta for SEO
  useEffect(() => {
    document.title = "Get Started Free - SDP Global Pay | Global Employment Made Easy";
    
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    metaDescription.setAttribute('content', `Join thousands of companies using SDP Global Pay for compliant global employment across ${countryCount} countries. Start your free account today.`);
    
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDescription);
    }
  }, [countryCount]);
  
  const getCountryFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'AU': '🇦🇺',
      'NZ': '🇳🇿', 
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'SG': '🇸🇬',
      'IE': '🇮🇪',
      'IN': '🇮🇳',
      'PH': '🇵🇭',
      'CA': '🇨🇦',
      'JP': '🇯🇵'
    };
    return flags[code] || '🌍';
  };
  const [formData, setFormData] = useState({
    accountType: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
    country: "",
    phoneNumber: "",
    teamSize: "",
    agreedToTerms: false,
    marketingEmails: false,
  });

  const [formErrors, setFormErrors] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    company: "",
    phoneNumber: ""
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupData, setSignupData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Pre-fill form from URL parameters (e.g., from invitation email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const accountType = params.get('accountType');

    // Handle invite token — fetch pre-fill data from the server
    if (token) {
      setInviteToken(token);
      fetch(`/api/worker-invite/${encodeURIComponent(token)}`)
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setInviteError(body.message || 'Invalid or expired invitation link.');
            return;
          }
          const prefill = await res.json();
          setFormData(prev => ({
            ...prev,
            accountType: accountType || 'contractor',
            firstName: prefill.firstName || prev.firstName,
            lastName: prefill.lastName || prev.lastName,
            email: prefill.email || prev.email,
            phoneNumber: prefill.phoneNumber || prev.phoneNumber,
          }));
          // Jump straight to password step (step 2) since personal info is pre-filled
          setCurrentStep(2);
        })
        .catch(() => setInviteError('Could not load invitation details. Please try again.'));
      return;
    }

    // Fallback: read individual query params (legacy)
    const firstName = params.get('firstName');
    const lastName = params.get('lastName');
    const email = params.get('email');
    const phoneNumber = params.get('phoneNumber');

    if (firstName || lastName || email || phoneNumber || accountType) {
      setFormData(prev => ({
        ...prev,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        ...(accountType && { accountType }),
      }));
    }
  }, []);

  // Real-time validation functions
  const validateEmail = (email: string): string => {
    if (!email) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address (e.g., name@example.com)";
    }
    return "";
  };

  const validateRequired = (value: string, fieldName: string): string => {
    if (!value.trim()) {
      return `${fieldName} is required`;
    }
    return "";
  };

  const validatePhoneNumber = (phone: string): string => {
    if (!phone) return "";
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return "Please enter a valid phone number (e.g., +1234567890)";
    }
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "";
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return "";
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string => {
    if (!confirmPassword) return "";
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return "";
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    if (typeof value === 'string') {
      let error = "";
      
      switch (field) {
        case 'email':
          error = validateEmail(value);
          break;
        case 'firstName':
          error = validateRequired(value, 'First name');
          break;
        case 'lastName':
          error = validateRequired(value, 'Last name');
          break;
        case 'password':
          error = validatePassword(value);
          // Also validate confirm password if it's been entered
          if (formData.confirmPassword) {
            const confirmError = validateConfirmPassword(value, formData.confirmPassword);
            setFormErrors(prev => ({ ...prev, confirmPassword: confirmError }));
          }
          break;
        case 'confirmPassword':
          error = validateConfirmPassword(formData.password, value);
          break;
        case 'company':
          if (currentStep === 3 && value) {
            error = validateRequired(value, 'Company name');
          }
          break;
        case 'phoneNumber':
          error = validatePhoneNumber(value);
          break;
      }
      
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleNext = () => {
    // Contractors skip step 3 (company information)
    if (formData.accountType === 'contractor' && currentStep === 2) {
      handleSubmit();
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...formData, ...(inviteToken ? { inviteToken } : {}) }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Signup failed:', result);
        
        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map((error: any) => {
            if (error.path && error.path.includes('email')) {
              return 'Please enter a valid email address (e.g., name@example.com)';
            }
            return error.message;
          });
          alert(`Please fix the following:\n• ${errorMessages.join('\n• ')}`);
        } else {
          alert(result.message || 'Signup failed. Please try again.');
        }
        return;
      }

      setSignupData(result);
      setSignupSuccess(true);
    } catch (error) {
      console.error('Signup error:', error);
      alert('An error occurred during signup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (inviteError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium mb-4">{inviteError}</p>
          <p className="text-secondary-600 text-sm">Please contact the person who invited you to request a new invitation link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Marketing Content */}
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold text-secondary-900 mb-4">
                  Join thousands of companies making 
                  <span className="text-primary-600"> global employment easy</span>
                </h1>
                <p className="text-lg text-secondary-600 mb-8">
                  Start hiring and managing your global workforce in minutes. 
                  Trusted by enterprises, agencies, and contractors across {countryCount} countries.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-secondary-700">Compliant employment in {countryCount} countries</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-secondary-700">Automated contract generation & e-signatures</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-secondary-700">Streamlined payroll & invoice management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-secondary-700">24/7 support from our global team</span>
                </div>
              </div>

              {/* Supported Countries */}
              <div className="bg-white/60 backdrop-blur rounded-lg p-6 border">
                <h3 className="font-semibold text-secondary-900 mb-4">Available in {countryCount} Countries</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-secondary-600">
                  {countries.slice(0, 10).map((country: any, index: number) => (
                    <div key={country.id || index}>
                      {getCountryFlag(country.code)} {country.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Signup Form or Success Message */}
            <div>
              {signupSuccess ? (
                /* Success Message */
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-secondary-900 mb-4">
                      Check Your Email!
                    </h2>
                    
                    <p className="text-secondary-600 mb-6">
                      We've sent a verification email to <strong>{formData.email}</strong>
                    </p>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-left">
                          <p className="font-semibold text-blue-900 mb-1">Next Steps:</p>
                          <ol className="text-sm text-blue-800 space-y-1">
                            <li>1. Check your email inbox (and spam folder)</li>
                            <li>2. Click the verification link in the email</li>
                            <li>3. Return here to log in and access your dashboard</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-3">
                      <Button 
                        onClick={() => setLocation('/login')}
                        className="bg-primary-600 hover:bg-primary-700 text-white"
                        data-testid="button-go-to-login"
                      >
                        Go to Login Page
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/resend-verification', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: formData.email }),
                            });
                            
                            if (response.ok) {
                              alert('Verification email resent! Please check your inbox.');
                            } else {
                              alert('Unable to resend email. Please try again later.');
                            }
                          } catch (error) {
                            alert('Unable to resend email. Please try again later.');
                          }
                        }}
                        data-testid="button-resend-email"
                      >
                        Resend Verification Email
                      </Button>
                    </div>
                    
                    <p className="text-xs text-secondary-500 mt-4">
                      Email sent from: onboard@sdpglobalpay.com
                    </p>
                  </CardContent>
                </Card>
              ) : (
                /* Regular Signup Form */
              <Card className="shadow-xl border-0">
                <CardHeader className="space-y-4">
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      1
                    </div>
                    <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      2
                    </div>
                    <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      3
                    </div>
                  </div>

                  <div className="text-center">
                    <CardTitle className="text-2xl font-bold text-secondary-900">
                      {currentStep === 1 && "Choose your account type"}
                      {currentStep === 2 && "Tell us about yourself"}
                      {currentStep === 3 && "Company information"}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {currentStep === 1 && "Select the option that best describes you"}
                      {currentStep === 2 && "We'll use this to personalize your experience"}
                      {currentStep === 3 && "Help us understand your business needs"}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Step 1: Account Type Selection */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid gap-3">
                        <div 
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            formData.accountType === 'enterprise' 
                              ? 'border-primary-600 bg-primary-50' 
                              : 'border-gray-200 hover:border-primary-300'
                          }`}
                          onClick={() => handleInputChange('accountType', 'enterprise')}
                        >
                          <div className="flex items-center space-x-3">
                            <Building2 className="w-6 h-6 text-primary-600" />
                            <div>
                              <div className="font-semibold text-secondary-900">Business / Enterprise</div>
                              <div className="text-sm text-secondary-600">
                                Company looking to hire globally
                              </div>
                            </div>
                          </div>
                        </div>

                        <div 
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            formData.accountType === 'agency' 
                              ? 'border-primary-600 bg-primary-50' 
                              : 'border-gray-200 hover:border-primary-300'
                          }`}
                          onClick={() => handleInputChange('accountType', 'agency')}
                        >
                          <div className="flex items-center space-x-3">
                            <Users className="w-6 h-6 text-accent-600" />
                            <div>
                              <div className="font-semibold text-secondary-900">Agency / Recruiter</div>
                              <div className="text-sm text-secondary-600">
                                Recruitment agency or talent provider
                              </div>
                            </div>
                          </div>
                        </div>

                        <div 
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            formData.accountType === 'contractor' 
                              ? 'border-primary-600 bg-primary-50' 
                              : 'border-gray-200 hover:border-primary-300'
                          }`}
                          onClick={() => handleInputChange('accountType', 'contractor')}
                        >
                          <div className="flex items-center space-x-3">
                            <Globe className="w-6 h-6 text-green-600" />
                            <div>
                              <div className="font-semibold text-secondary-900">Contractor</div>
                              <div className="text-sm text-secondary-600">
                                Individual contractor seeking opportunities
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Personal Information */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            className={formErrors.firstName ? 'border-red-500 focus:border-red-500' : ''}
                            data-testid="input-firstName"
                          />
                          {formErrors.firstName && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Smith"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            className={formErrors.lastName ? 'border-red-500 focus:border-red-500' : ''}
                            data-testid="input-lastName"
                          />
                          {formErrors.lastName && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={formErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                          data-testid="input-email"
                        />
                        {formErrors.email && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className={formErrors.password ? 'border-red-500 focus:border-red-500' : ''}
                          data-testid="input-password"
                        />
                        {formErrors.password && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                        )}
                        <div className="text-xs text-secondary-600 mt-1">
                          Password must be at least 8 characters with uppercase, lowercase, and numbers
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className={formErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}
                          data-testid="input-confirmPassword"
                        />
                        {formErrors.confirmPassword && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          className={formErrors.phoneNumber ? 'border-red-500 focus:border-red-500' : ''}
                          data-testid="input-phoneNumber"
                        />
                        {formErrors.phoneNumber && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.phoneNumber}</p>
                        )}
                      </div>

                      {/* Terms and Conditions - Show for contractors who skip step 3 */}
                      {formData.accountType === 'contractor' && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-start space-x-2">
                            <Checkbox
                              id="terms"
                              checked={formData.agreedToTerms}
                              onCheckedChange={(checked) => handleInputChange('agreedToTerms', checked as boolean)}
                              data-testid="checkbox-terms"
                            />
                            <Label htmlFor="terms" className="text-sm text-secondary-600 leading-relaxed">
                              I agree to the{" "}
                              <a href="/terms-of-service" target="_blank" className="text-primary-600 hover:underline">Terms of Service</a>
                              {" "}and{" "}
                              <a href="/privacy-policy" target="_blank" className="text-primary-600 hover:underline">Privacy Policy</a>
                            </Label>
                          </div>

                          <div className="flex items-start space-x-2">
                            <Checkbox
                              id="marketing"
                              checked={formData.marketingEmails}
                              onCheckedChange={(checked) => handleInputChange('marketingEmails', checked as boolean)}
                            />
                            <Label htmlFor="marketing" className="text-sm text-secondary-600 leading-relaxed">
                              I'd like to receive product updates and marketing emails from SDP Global Pay
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Company Information */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Acme Corporation"
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          className={formErrors.company ? 'border-red-500 focus:border-red-500' : ''}
                          data-testid="input-company"
                        />
                        {formErrors.company && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.company}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={formData.country || undefined} onValueChange={(value) => handleInputChange('country', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country: any) => (
                              <SelectItem key={country.id} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="teamSize">Team Size</Label>
                        <Select value={formData.teamSize || undefined} onValueChange={(value) => handleInputChange('teamSize', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 people</SelectItem>
                            <SelectItem value="11-50">11-50 people</SelectItem>
                            <SelectItem value="51-200">51-200 people</SelectItem>
                            <SelectItem value="201-1000">201-1000 people</SelectItem>
                            <SelectItem value="1000+">1000+ people</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Terms and Marketing */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="terms"
                            checked={formData.agreedToTerms}
                            onCheckedChange={(checked) => handleInputChange('agreedToTerms', checked as boolean)}
                          />
                          <Label htmlFor="terms" className="text-sm text-secondary-600 leading-relaxed">
                            I agree to the{" "}
                            <a href="/terms-of-service" target="_blank" className="text-primary-600 hover:underline">Terms of Service</a>
                            {" "}and{" "}
                            <a href="/privacy-policy" target="_blank" className="text-primary-600 hover:underline">Privacy Policy</a>
                          </Label>
                        </div>

                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="marketing"
                            checked={formData.marketingEmails}
                            onCheckedChange={(checked) => handleInputChange('marketingEmails', checked as boolean)}
                          />
                          <Label htmlFor="marketing" className="text-sm text-secondary-600 leading-relaxed">
                            I'd like to receive product updates and marketing emails from SDP Global Pay
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6">
                    <div>
                      {currentStep > 1 && (
                        <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2">
                          <ChevronLeft className="w-4 h-4" />
                          <span>Back</span>
                        </Button>
                      )}
                    </div>

                    <div>
                      {(currentStep < 3 || (currentStep === 2 && formData.accountType === 'contractor')) ? (
                        <Button 
                          onClick={handleNext}
                          disabled={
                            isSubmitting ||
                            (currentStep === 1 && !formData.accountType) ||
                            (currentStep === 2 && (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword || !!formErrors.password || !!formErrors.confirmPassword || (formData.accountType === 'contractor' && !formData.agreedToTerms)))
                          }
                          className="px-8"
                          data-testid="button-next"
                        >
                          {currentStep === 2 && formData.accountType === 'contractor' ? (isSubmitting ? 'Creating Account...' : 'Create Account') : 'Next'}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleSubmit}
                          disabled={isSubmitting || !formData.company || !formData.country || !formData.agreedToTerms}
                          className="px-8"
                        >
                          {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}