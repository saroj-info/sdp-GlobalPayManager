import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/layout/navigation";
import { ArrowRight, CheckCircle, Users, Building2, Shield, Globe, Clock, FileText, CreditCard, UserCheck, Search, MousePointer, Zap } from "lucide-react";
import { ContractIcon, PayrollIcon, ComplianceIcon, TeamManagementIcon, TimeTrackingIcon, GlobalCoverageIcon } from "@/components/ui/custom-icons";
import { Link } from "wouter";
import solutionSelectionImage from "@assets/generated_images/Solution_selection_process_illustration_13a32c74.png";
import onboardingWorkflowImage from "@assets/generated_images/Digital_onboarding_workflow_illustration_2f39295e.png";
import payrollManagementImage from "@assets/generated_images/Clean_multi-currency_payroll_illustration_04f2a4c8.png";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-8">
            <Globe className="w-4 h-4 mr-2 text-primary-600" />
            Simple Global Employment Process
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6 leading-tight">
            How <span className="text-primary-600">SDP Global Pay</span>
            <span className="block">Works</span>
          </h1>
          <p className="text-xl text-secondary-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            Our streamlined process makes global hiring simple, compliant, and fast. From onboarding to payroll, 
            we handle the complexity so you can focus on building your team.
          </p>
        </div>

        {/* Detailed Process Steps */}
        <div className="space-y-16 mb-20">
          {/* Step 1 - Choose Your Solution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-primary-600">1</span>
                </div>
                <h2 className="text-3xl font-bold text-primary-600">Choose Your Solution</h2>
              </div>
              <p className="text-xl text-secondary-600 mb-8 leading-relaxed">
                Start by selecting the employment solution that best fits your business needs. 
                Our platform guides you through the decision process with clear comparisons and recommendations.
              </p>
              
              <div className="space-y-6">
                <div className="bg-primary-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-700 mb-2">Employee of Record (EOR)</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Hire full-time employees in 17 countries without setting up local entities. 
                        We become the legal employer while you maintain operational control.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-accent-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-accent-700 mb-2">Contractor of Record</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Engage independent contractors compliantly across multiple jurisdictions 
                        with proper classification and risk mitigation.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Search className="w-5 h-5 text-secondary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-700 mb-2">Needs Assessment</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Our experts analyze your requirements, timeline, and budget to recommend 
                        the optimal solution for your global expansion goals.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <img 
                src={solutionSelectionImage} 
                alt="Team selecting global employment solutions" 
                className="w-full rounded-2xl shadow-xl"
              />
            </div>
          </div>

          {/* Step 2 - Onboard Your Team */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={onboardingWorkflowImage} 
                alt="Digital onboarding workflow process" 
                className="w-full rounded-2xl shadow-xl"
              />
            </div>
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-accent-600">2</span>
                </div>
                <h2 className="text-3xl font-bold text-accent-600">Onboard Your Team</h2>
              </div>
              <p className="text-xl text-secondary-600 mb-8 leading-relaxed">
                Experience our streamlined digital onboarding process that handles all legal and 
                compliance requirements while providing a smooth experience for your new hires.
              </p>
              
              <div className="space-y-6">
                <div className="bg-accent-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-accent-700 mb-2">Smart Contract Generation</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Automatically generate compliant employment contracts based on local laws, 
                        your requirements, and the worker's location and role type.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-700 mb-2">Identity & Documentation</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Secure identity verification, document collection, and background checks 
                        tailored to each country's specific requirements and standards.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-secondary-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-secondary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-700 mb-2">Compliance Verification</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Real-time compliance checks ensure all registrations, tax numbers, 
                        and local requirements are properly configured before work begins.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 - Manage & Pay */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-xl font-bold text-secondary-600">3</span>
                </div>
                <h2 className="text-3xl font-bold text-secondary-600">Manage & Pay</h2>
              </div>
              <p className="text-xl text-secondary-600 mb-8 leading-relaxed">
                Ongoing workforce management made simple with automated payroll, benefits administration, 
                and continuous compliance monitoring across all your global locations.
              </p>
              
              <div className="space-y-6">
                <div className="bg-secondary-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-secondary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-700 mb-2">Pay in Any Currency</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Pay your global team in their preferred currency or yours. We support 50+ currencies with 
                        real-time exchange rates, automatic currency conversion, and local banking options. 
                        Workers receive payments in AUD, USD, EUR, GBP, CAD, SGD, JPY, INR, PHP, and more.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">USD</span>
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">EUR</span>
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">GBP</span>
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">AUD</span>
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">CAD</span>
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">SGD</span>
                        <span className="px-2 py-1 bg-secondary-100 text-secondary-700 text-xs rounded-full">+44 more</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-700 mb-2">Time & Leave Management</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Integrated timesheet tracking, leave management, and approval workflows 
                        with country-specific holiday calendars and entitlements.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-accent-50 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-accent-700 mb-2">Real-time Monitoring</h3>
                      <p className="text-secondary-600 text-sm leading-relaxed">
                        Continuous compliance monitoring with automatic alerts for regulatory changes, 
                        renewal deadlines, and action items requiring attention.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <img 
                src={payrollManagementImage} 
                alt="Multi-currency payroll with contractors and employees receiving digital payslips" 
                className="w-full rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
              Everything You Need for <span className="text-primary-600">Global Teams</span>
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Our comprehensive platform handles every aspect of global employment and contractor management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <Card className="border-primary-200 hover:shadow-lg transition-shadow">
              <CardHeader className="p-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <ContractIcon className="w-6 h-6 text-primary-600" />
                </div>
                <CardTitle className="text-primary-600">Contract Management</CardTitle>
                <CardDescription>
                  Automated contract generation with local compliance and legal requirements built-in
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-accent-200 hover:shadow-lg transition-shadow">
              <CardHeader className="p-6">
                <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mb-4">
                  <PayrollIcon className="w-6 h-6 text-accent-600" />
                </div>
                <CardTitle className="text-accent-600">Payroll Processing</CardTitle>
                <CardDescription>
                  Multi-currency payroll with local tax calculations, deductions, and benefits administration
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-secondary-200 hover:shadow-lg transition-shadow">
              <CardHeader className="p-6">
                <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mb-4">
                  <ComplianceIcon className="w-6 h-6 text-secondary-600" />
                </div>
                <CardTitle className="text-secondary-600">Compliance Monitoring</CardTitle>
                <CardDescription>
                  Real-time compliance tracking with automatic updates for changing regulations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary-200 hover:shadow-lg transition-shadow">
              <CardHeader className="p-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <TeamManagementIcon className="w-6 h-6 text-primary-600" />
                </div>
                <CardTitle className="text-primary-600">Team Management</CardTitle>
                <CardDescription>
                  Centralized dashboard for managing all your global employees and contractors
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-accent-200 hover:shadow-lg transition-shadow">
              <CardHeader className="p-6">
                <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mb-4">
                  <TimeTrackingIcon className="w-6 h-6 text-accent-600" />
                </div>
                <CardTitle className="text-accent-600">Time Tracking</CardTitle>
                <CardDescription>
                  Integrated timesheet and leave management with automated approval workflows
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-secondary-200 hover:shadow-lg transition-shadow">
              <CardHeader className="p-6">
                <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mb-4">
                  <GlobalCoverageIcon className="w-6 h-6 text-secondary-600" />
                </div>
                <CardTitle className="text-secondary-600">Global Coverage</CardTitle>
                <CardDescription>
                  Support for 17 countries with plans to expand to more regions based on demand
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of companies who trust SDP Global Pay for their international workforce needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-lg">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/solutions">
              <Button variant="outline" size="lg" className="border-primary-300 text-primary-600 hover:bg-primary-50">
                View Solutions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}