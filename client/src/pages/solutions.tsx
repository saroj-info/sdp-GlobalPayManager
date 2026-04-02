import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/layout/navigation";
import { GlobalScenariosStrips } from "@/components/ui/global-scenarios-strips";
import { Users, Building2, Globe, Shield, Clock, CheckCircle, ArrowRight, FileText, CreditCard, UserCheck, Briefcase, Target, Award, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import globalOfficeImage from "@assets/generated_images/Minimal_global_office_collaboration_3dae76cf.png";
import remoteContractorsImage from "@assets/generated_images/Minimal_remote_contractor_workspace_fca13084.png";
import secureComplianceImage from "@assets/generated_images/Minimal_compliance_management_workspace_1938f808.png";

export default function Solutions() {
  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ["/api/countries"],
  });

  const countryCount = countries.length || 10; // fallback to 10

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-8">
            <Target className="w-4 h-4 mr-2 text-primary-600" />
            Comprehensive Global Employment Solutions
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6 leading-tight">
            <span className="text-primary-600">Hire</span> Talent Globally,
            <span className="block">Manage Locally</span>
          </h1>
          <p className="text-xl text-secondary-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            SDP Global Pay provides end-to-end solutions for hiring employees and contractors across {countryCount} countries. 
            From compliance to payroll, we handle the complexity so you can focus on growing your business.
          </p>
        </div>

        {/* Main Solutions Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 mb-20">
          {/* Hire Employees Solution */}
          <Card className="border-2 border-primary-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-primary-50">
            <CardHeader className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                  <Users className="text-primary-600 w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-primary-600 mb-2">Hire Employees</CardTitle>
                  <div className="inline-flex px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    Employer of Record (EOR)
                  </div>
                </div>
              </div>
              <CardDescription className="text-lg text-secondary-600 leading-relaxed mb-6">
                Expand your team globally without establishing local entities. We become the legal employer while you maintain full operational control over your workforce.
              </CardDescription>
              
              {/* Employee Photo */}
              <div className="mb-8">
                <img 
                  src={globalOfficeImage} 
                  alt="Professional office workers collaborating in global corporate environment" 
                  className="w-full aspect-[4/3] object-cover rounded-xl shadow-lg"
                />
              </div>
              
              <div className="space-y-4 mb-8">
                <h4 className="font-semibold text-secondary-900 text-lg">Key Features:</h4>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    `Legal employment in ${countryCount} countries`,
                    "Full compliance with local labor laws",
                    "Payroll processing and tax management",
                    "Benefits administration and enrollment",
                    "Employee onboarding and offboarding",
                    "HR support and documentation"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-secondary-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary-50 p-6 rounded-xl mb-6">
                <h5 className="font-semibold text-primary-700 mb-3">Perfect For:</h5>
                <ul className="space-y-2 text-sm text-primary-600">
                  <li>• Companies expanding into new markets</li>
                  <li>• Remote-first organizations</li>
                  <li>• Businesses hiring specialized talent abroad</li>
                  <li>• Startups testing international markets</li>
                </ul>
              </div>

              <Button 
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 text-lg"
                onClick={() => window.location.href = '/signup'}
                data-testid="button-start-hiring-employees"
              >
                Start Hiring Employees
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardHeader>
          </Card>

          {/* Hire Contractors Solution */}
          <Card className="border-2 border-accent-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-accent-50">
            <CardHeader className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-accent-100 rounded-xl flex items-center justify-center mr-4">
                  <Briefcase className="text-accent-600 w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-accent-600 mb-2">Hire Contractors</CardTitle>
                  <div className="inline-flex px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm font-medium">
                    Independent Contractor Management
                  </div>
                </div>
              </div>
              <CardDescription className="text-lg text-secondary-600 leading-relaxed mb-6">
                Engage independent contractors compliantly across multiple jurisdictions. We handle contracts, payments, and compliance while you focus on project delivery.
              </CardDescription>
              
              {/* Contractor Photo */}
              <div className="mb-8">
                <img 
                  src={remoteContractorsImage} 
                  alt="Independent contractors and freelancers working remotely from various locations" 
                  className="w-full aspect-[4/3] object-cover rounded-xl shadow-lg"
                />
              </div>
              
              <div className="space-y-4 mb-8">
                <h4 className="font-semibold text-secondary-900 text-lg">Key Features:</h4>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    "Compliant contractor agreements",
                    "Global payment processing",
                    "Tax documentation and reporting",
                    "Invoice management and approval",
                    "Contractor onboarding and verification",
                    "Misclassification risk protection"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-secondary-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-accent-50 p-6 rounded-xl mb-6">
                <h5 className="font-semibold text-accent-700 mb-3">Perfect For:</h5>
                <ul className="space-y-2 text-sm text-accent-600">
                  <li>• Project-based work engagements</li>
                  <li>• Seasonal or temporary workforce needs</li>
                  <li>• Specialized skills and expertise</li>
                  <li>• Flexible workforce management</li>
                </ul>
              </div>

              <Button 
                className="w-full bg-accent-600 hover:bg-accent-700 text-white font-semibold py-3 text-lg"
                onClick={() => window.location.href = '/signup'}
                data-testid="button-start-hiring-contractors"
              >
                Start Hiring Contractors
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardHeader>
          </Card>

          {/* Avoid Misclassification Solution */}
          <Card className="border-2 border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-green-50">
            <CardHeader className="p-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <Shield className="text-green-600 w-8 h-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-green-600 mb-2">Avoid Misclassification</CardTitle>
                  <div className="inline-flex px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Contractor of Record
                  </div>
                </div>
              </div>
              <CardDescription className="text-lg text-secondary-600 leading-relaxed mb-6">
                Reduce the risk of worker misclassification, no matter where you source talent. As your agent of record, we take on liability so you can focus on growing your global workforce.
              </CardDescription>
              
              {/* Protection Photo */}
              <div className="mb-8">
                <img 
                  src={secureComplianceImage} 
                  alt="Secure workforce compliance management with legal protection and regulatory oversight" 
                  className="w-full aspect-[4/3] object-cover rounded-xl shadow-lg"
                />
              </div>
              
              <div className="space-y-4 mb-8">
                <h4 className="font-semibold text-secondary-900 text-lg">Key Features:</h4>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    "Seamless contractor onboarding with global compliance",
                    "Manage everything—from localized contracts to global payments",
                    "Background checks and equipment management",
                    "Better protection with the same flexibility",
                    "Quick to implement and easy to use",
                    "Reduced admin work with faster onboarding"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-secondary-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-xl mb-6">
                <h5 className="font-semibold text-green-700 mb-3">Perfect For:</h5>
                <ul className="space-y-2 text-sm text-green-600">
                  <li>• Companies concerned about misclassification risks</li>
                  <li>• Businesses sourcing talent from multiple countries</li>
                  <li>• Organizations needing liability protection</li>
                  <li>• Companies wanting to focus on growth, not compliance</li>
                </ul>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
                onClick={() => window.location.href = '/signup'}
                data-testid="button-get-protected-today"
              >
                Get Protected Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardHeader>
          </Card>
        </div>

        {/* Process Section */}
        <div className="bg-white rounded-3xl p-12 shadow-xl mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary-900 mb-6">How It Works</h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Our streamlined process gets you hiring globally in as little as 24 hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Choose Your Solution",
                description: "Select employee or contractor hiring based on your needs",
                icon: Target,
                color: "primary"
              },
              {
                step: "2", 
                title: "Complete Setup",
                description: "Provide business details and hiring requirements",
                icon: FileText,
                color: "accent"
              },
              {
                step: "3",
                title: "Onboard Talent",
                description: "We handle contracts, compliance, and documentation",
                icon: UserCheck,
                color: "green"
              },
              {
                step: "4",
                title: "Manage & Pay",
                description: "Ongoing payroll, benefits, and HR support",
                icon: CreditCard,
                color: "blue"
              }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-${item.color}-100 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-10 h-10 text-${item.color}-600`} />
                </div>
                <div className={`inline-flex items-center justify-center w-8 h-8 bg-${item.color}-600 text-white rounded-full font-bold mb-4`}>
                  {item.step}
                </div>
                <h3 className="font-bold text-lg text-secondary-900 mb-3">{item.title}</h3>
                <p className="text-secondary-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Global Scenarios Strips */}
        <GlobalScenariosStrips />

        {/* Benefits Comparison */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary-900 mb-6">Why Choose SDP Global Pay?</h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Compare our comprehensive solutions with traditional approaches
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border border-secondary-200 shadow-lg">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Building2 className="text-red-600 w-8 h-8" />
                </div>
                <CardTitle className="text-red-600 text-xl font-bold mb-4">Traditional Approach</CardTitle>
                <div className="space-y-3 text-left">
                  <div className="flex items-center text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Establish local entities
                  </div>
                  <div className="flex items-center text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    6-12 months setup time
                  </div>
                  <div className="flex items-center text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    High upfront costs
                  </div>
                  <div className="flex items-center text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Complex compliance management
                  </div>
                  <div className="flex items-center text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                    Multiple vendor relationships
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-green-200 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Award className="text-green-600 w-8 h-8" />
                </div>
                <CardTitle className="text-green-600 text-xl font-bold mb-4">SDP Global Pay</CardTitle>
                <div className="space-y-3 text-left">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-3" />
                    No entity establishment needed
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-3" />
                    24-hour setup
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-3" />
                    Transparent pricing
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-3" />
                    100% compliance guaranteed
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-3" />
                    Single point of contact
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border border-secondary-200 shadow-lg">
              <CardHeader className="text-center p-8">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="text-orange-600 w-8 h-8" />
                </div>
                <CardTitle className="text-orange-600 text-xl font-bold mb-4">Other EOR Providers</CardTitle>
                <div className="space-y-3 text-left">
                  <div className="flex items-center text-orange-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Limited country coverage
                  </div>
                  <div className="flex items-center text-orange-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    2-4 weeks setup
                  </div>
                  <div className="flex items-center text-orange-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Hidden fees
                  </div>
                  <div className="flex items-center text-orange-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Basic compliance support
                  </div>
                  <div className="flex items-center text-orange-600">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Limited local expertise
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-3xl p-12 text-white text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Go Global?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto">
            Join thousands of companies who trust SDP Global Pay for their international hiring needs. 
            Get started today with our expert team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <Button size="xl" className="bg-white text-primary-600 hover:bg-gray-100 font-bold px-8 py-4">
              Start Hiring Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="xl" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-4">
              Schedule Consultation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}