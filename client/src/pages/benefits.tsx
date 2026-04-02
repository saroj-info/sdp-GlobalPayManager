import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Gift, DollarSign, Heart, Shield, Plane, Car, Clock, MapPin, Phone, Mail, PiggyBank, Calendar, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// Country-specific benefit configurations
const getCountryBenefits = (countryId: string) => {
  switch (countryId) {
    case 'au':
      return {
        mandatoryBenefits: [
          { name: 'Superannuation', description: 'Minimum 11.5% employer contribution', icon: PiggyBank },
          { name: 'Annual Leave', description: '4 weeks paid annual leave', icon: Plane },
          { name: 'Sick Leave', description: '10 days paid sick leave per year', icon: Heart },
          { name: 'Public Holidays', description: 'Paid public holidays', icon: Calendar },
          { name: 'Long Service Leave', description: 'After 7-10 years of service', icon: Clock }
        ],
        optionalBenefits: [
          { name: 'Health Insurance', description: 'Private health insurance support', icon: Shield },
          { name: 'Car Allowance', description: 'Vehicle or travel allowance', icon: Car },
          { name: 'Professional Development', description: 'Training and development budget', icon: BookOpen }
        ]
      };
    case 'nz':
      return {
        mandatoryBenefits: [
          { name: 'KiwiSaver', description: 'Minimum 3% employer contribution', icon: PiggyBank },
          { name: 'Annual Leave', description: '4 weeks paid annual leave', icon: Plane },
          { name: 'Sick Leave', description: '10 days paid sick leave per year', icon: Heart },
          { name: 'Public Holidays', description: 'Paid public holidays', icon: Calendar }
        ],
        optionalBenefits: [
          { name: 'Health Insurance', description: 'Private health insurance', icon: Shield },
          { name: 'Professional Development', description: 'Skills development support', icon: BookOpen }
        ]
      };
    case 'us':
      return {
        mandatoryBenefits: [
          { name: 'Social Security', description: 'Federal retirement benefit', icon: Shield },
          { name: 'Medicare', description: 'Federal health insurance', icon: Heart },
          { name: 'Unemployment Insurance', description: 'State unemployment benefits', icon: DollarSign }
        ],
        optionalBenefits: [
          { name: '401(k) Match', description: 'Retirement savings matching', icon: PiggyBank },
          { name: 'Health Insurance', description: 'Medical, dental, vision coverage', icon: Shield },
          { name: 'Paid Time Off', description: 'Vacation and sick leave', icon: Plane },
          { name: 'Life Insurance', description: 'Term life insurance coverage', icon: Heart }
        ]
      };
    case 'uk':
      return {
        mandatoryBenefits: [
          { name: 'Workplace Pension', description: 'Minimum 3% employer contribution', icon: PiggyBank },
          { name: 'Statutory Holiday', description: '28 days paid annual leave', icon: Plane },
          { name: 'Sick Pay', description: 'Statutory sick pay', icon: Heart },
          { name: 'Maternity/Paternity', description: 'Statutory parental leave', icon: Heart }
        ],
        optionalBenefits: [
          { name: 'Private Healthcare', description: 'Private medical insurance', icon: Shield },
          { name: 'Life Insurance', description: 'Group life insurance', icon: Heart },
          { name: 'Cycle to Work', description: 'Bike purchase scheme', icon: Car }
        ]
      };
    case 'ca':
      return {
        mandatoryBenefits: [
          { name: 'CPP/QPP', description: 'Canada/Quebec Pension Plan', icon: PiggyBank },
          { name: 'Employment Insurance', description: 'Federal employment insurance', icon: DollarSign },
          { name: 'Vacation Pay', description: 'Minimum 2-3 weeks paid vacation', icon: Plane }
        ],
        optionalBenefits: [
          { name: 'Health Benefits', description: 'Extended health coverage', icon: Shield },
          { name: 'Dental Coverage', description: 'Dental insurance', icon: Heart },
          { name: 'RRSP Match', description: 'Retirement savings matching', icon: PiggyBank }
        ]
      };
    default:
      return {
        mandatoryBenefits: [
          { name: 'Statutory Benefits', description: 'Local legal requirements', icon: Shield }
        ],
        optionalBenefits: []
      };
  }
};

export default function BenefitsPage() {
  usePageHeader("Compensation & Benefits", "View your employment benefits and compensation package");
  
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect if not a worker
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user as any)?.userType !== 'worker') {
      window.location.href = '/';
      return;
    }
  }, [isAuthenticated, isLoading, user]);

  // Fetch worker profile
  const { data: workerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/workers/profile"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  // Fetch business benefits package
  const { data: benefitsPackage } = useQuery<any>({
    queryKey: ["/api/benefits/package"],
    enabled: isAuthenticated && (user as any)?.userType === 'worker',
  });

  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ["/api/countries"],
  });

  if (profileLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading benefits...</p>
          </div>
        </div>
      </div>
    );
  }

  const country = countries.find((c: any) => c.id === workerProfile?.countryId);
  const countryBenefits = getCountryBenefits(workerProfile?.countryId || 'au');

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-white min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Benefits Package Overview */}
            {benefitsPackage && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Gift className="h-6 w-6" />
                    Your Benefits Package
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Custom benefits provided by your employer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {benefitsPackage.benefits?.map((benefit: any, index: number) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800">{benefit.name}</h4>
                        <p className="text-sm text-green-700 mt-1">{benefit.description}</p>
                        {benefit.value && (
                          <Badge variant="secondary" className="mt-2">
                            {benefit.value}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mandatory Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  Mandatory Benefits ({country?.name})
                </CardTitle>
                <CardDescription>
                  Benefits required by law in {country?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {countryBenefits.mandatoryBenefits.map((benefit, index) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold">{benefit.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{benefit.description}</p>
                        <Badge variant="outline" className="mt-2">
                          Mandatory
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Optional Benefits */}
            {countryBenefits.optionalBenefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-6 w-6 text-purple-600" />
                    Common Optional Benefits
                  </CardTitle>
                  <CardDescription>
                    Additional benefits that may be offered by employers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {countryBenefits.optionalBenefits.map((benefit, index) => {
                      const IconComponent = benefit.icon;
                      return (
                        <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 mb-2">
                            <IconComponent className="h-5 w-5 text-purple-600" />
                            <h4 className="font-semibold">{benefit.name}</h4>
                          </div>
                          <p className="text-sm text-gray-600">{benefit.description}</p>
                          <Badge variant="secondary" className="mt-2">
                            Optional
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-6 w-6 text-gray-600" />
                  Benefits Support
                </CardTitle>
                <CardDescription>
                  Need help with your benefits? Contact our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-sm text-gray-600">benefits@sdpglobalpay.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Phone Support</p>
                        <p className="text-sm text-gray-600">
                          {country?.id === 'au' && '+61 1300 SDP PAY'}
                          {country?.id === 'nz' && '+64 9 xxx xxxx'}
                          {country?.id === 'us' && '+1 800 SDP PAYS'}
                          {country?.id === 'uk' && '+44 20 xxxx xxxx'}
                          {country?.id === 'ca' && '+1 800 SDP PAYS'}
                          {!['au', 'nz', 'us', 'uk', 'ca'].includes(country?.id) && 'Contact your local office'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Support Hours</p>
                        <p className="text-sm text-gray-600">Monday - Friday, 9 AM - 5 PM local time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Local Office</p>
                        <p className="text-sm text-gray-600">{country?.name} operations team</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}