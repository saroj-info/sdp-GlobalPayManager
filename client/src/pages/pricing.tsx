import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/layout/navigation";
import { CheckCircle, X, Star, Shield, Clock, DollarSign, Users, Building2, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const FEATURES = {
  sdp: {
    eor: [
      "Legal employment in 17 countries",
      "Local tax & payroll compliance", 
      "Multi-currency payments (50+ currencies)",
      "Benefits administration",
      "Automated contract generation",
      "24/7 customer support",
      "No setup or onboarding fees",
      "Employee onboarding in 48 hours",
      "Expense & leave management",
      "GDPR & SOC 2 compliance",
      "Local HR expertise",
      "Seamless contractor-to-employee conversion"
    ],
    contractor: [
      "Automated contract generation",
      "Multi-currency payments", 
      "Tax document management",
      "Compliance verification",
      "Invoice approvals",
      "Worker classification protection",
      "No hidden fees",
      "Global payment processing",
      "Real-time compliance monitoring",
      "Dedicated support team"
    ],
    contractorRecord: [
      "Full contractor classification compliance",
      "Legal risk mitigation",
      "Local law adherence",
      "Automated payment processing",
      "Contract management",
      "Worker status compliance",
      "Seamless FTE conversion pathway",
      "Expert legal guidance",
      "Multi-jurisdiction support",
      "Comprehensive insurance coverage"
    ]
  },
  competitors: {
    multiplier: {
      eor: ["Employment in 150+ countries", "Multi-country payroll", "Multi-currency payments", "Benefits administration", "24/5 support", "Employee payslips"],
      contractor: ["Instant contracts", "Worker classification", "Multi-currency payments", "Benefits administration", "24/5 support"],
      pricing: { eor: 400, contractor: 40, contractorRecord: "N/A" }
    },
    deel: {
      eor: ["Employment in 150+ countries", "Local compliance", "Automated payroll", "Benefits administration", "Contract generation", "HR support"],
      contractor: ["Localized contracts", "150+ currencies", "Tax documents", "Compliance checks", "Invoice tracking"],
      contractorRecord: ["Compliance protection", "Tax & labor law", "Misclassification protection", "Automated payments", "Contract management"],
      pricing: { eor: 599, contractor: 49, contractorRecord: 325 }
    },
    velocity: {
      eor: ["Employment in 185+ countries", "24/7 support", "240+ experts", "GDPR compliance", "SOC 2 certified", "Indemnity protection"],
      contractor: ["Limited contractor services"],
      pricing: { eor: 599, contractor: "N/A", contractorRecord: "N/A" }
    }
  }
};

export default function Pricing() {
  const [activeTab, setActiveTab] = useState("our-pricing");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-8">
            <DollarSign className="w-4 h-4 mr-2 text-primary-600" />
            Transparent & Competitive Pricing
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6 leading-tight">
            Simple, <span className="text-primary-600">Transparent</span>
            <span className="block">Pricing</span>
          </h1>
          <p className="text-xl text-secondary-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            No hidden fees, no setup costs, no surprises. Pay only for what you need with 
            the most competitive rates in the industry.
          </p>
        </div>

        {/* Pricing Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="our-pricing">Our Pricing</TabsTrigger>
            <TabsTrigger value="comparison">vs Others</TabsTrigger>
          </TabsList>

          {/* Our Pricing Tab */}
          <TabsContent value="our-pricing" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contractor Management */}
              <Card className="border-2 border-accent-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="text-center p-8">
                  <div className="w-16 h-16 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-accent-600" />
                  </div>
                  <CardTitle className="text-2xl text-accent-600 mb-2">Contractor Management</CardTitle>
                  <CardDescription className="text-lg text-secondary-600 mb-6">
                    Manage independent contractors globally with full compliance
                  </CardDescription>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-accent-600 mb-2">$49</div>
                    <div className="text-secondary-600">per contractor/month</div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="space-y-3 mb-8">
                    {FEATURES.sdp.contractor.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-accent-600 flex-shrink-0" />
                        <span className="text-secondary-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/signup">
                    <Button className="w-full bg-accent-600 hover:bg-accent-700 text-white">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Contractor of Record - Featured */}
              <Card className="border-2 border-primary-200 shadow-xl hover:shadow-2xl transition-all duration-300 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
                <CardHeader className="text-center p-8">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary-600" />
                  </div>
                  <CardTitle className="text-2xl text-primary-600 mb-2">Contractor of Record</CardTitle>
                  <CardDescription className="text-lg text-secondary-600 mb-6">
                    Full legal protection for contractor relationships
                  </CardDescription>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary-600 mb-2">$349</div>
                    <div className="text-secondary-600">per contractor/month</div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="space-y-3 mb-8">
                    {FEATURES.sdp.contractorRecord.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                        <span className="text-secondary-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/signup">
                    <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Employer of Record */}
              <Card className="border-2 border-secondary-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="text-center p-8">
                  <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-secondary-600" />
                  </div>
                  <CardTitle className="text-2xl text-secondary-600 mb-2">Employer of Record</CardTitle>
                  <CardDescription className="text-lg text-secondary-600 mb-6">
                    Hire full-time employees globally without local entities
                  </CardDescription>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-secondary-600 mb-2">$399</div>
                    <div className="text-secondary-600">per employee/month</div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="space-y-3 mb-8">
                    {FEATURES.sdp.eor.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-secondary-600 flex-shrink-0" />
                        <span className="text-secondary-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/signup">
                    <Button className="w-full bg-secondary-600 hover:bg-secondary-700 text-white">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Value Props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-secondary-900 mb-2">No Hidden Fees</h3>
                <p className="text-secondary-600">What you see is what you pay. No setup costs, no surprise charges.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-accent-600" />
                </div>
                <h3 className="text-xl font-bold text-secondary-900 mb-2">Fast Setup</h3>
                <p className="text-secondary-600">Get started in minutes, not weeks. Onboard your first worker in 48 hours.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-secondary-600" />
                </div>
                <h3 className="text-xl font-bold text-secondary-900 mb-2">Best Value</h3>
                <p className="text-secondary-600">Premium features at competitive prices. Save up to 40% vs competitors.</p>
              </div>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-secondary-900 mb-4">How We Compare</h2>
              <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
                See why SDP Global Pay offers the best value in the market with competitive pricing and superior features.
              </p>
            </div>

            {/* Comparison Tables */}
            <div className="space-y-12">
              {/* EOR Comparison */}
              <div>
                <h3 className="text-2xl font-bold text-primary-600 mb-6 text-center">Employer of Record Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-xl shadow-lg overflow-hidden">
                    <thead>
                      <tr className="bg-primary-50">
                        <th className="p-4 text-left font-semibold text-secondary-900">Provider</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Monthly Cost</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Countries</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Setup Fees</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-secondary-100 bg-primary-25">
                        <td className="p-4 font-semibold text-primary-600">SDP Global Pay</td>
                        <td className="p-4 text-center text-2xl font-bold text-primary-600">$399</td>
                        <td className="p-4 text-center">17</td>
                        <td className="p-4 text-center text-green-600 font-semibold">$0</td>
                        <td className="p-4 text-center">24/7</td>
                      </tr>
                      <tr className="border-b border-secondary-100">
                        <td className="p-4">Multiplier</td>
                        <td className="p-4 text-center text-xl font-semibold">$400</td>
                        <td className="p-4 text-center">150+</td>
                        <td className="p-4 text-center text-green-600">$0</td>
                        <td className="p-4 text-center">24/5</td>
                      </tr>
                      <tr className="border-b border-secondary-100">
                        <td className="p-4">Deel</td>
                        <td className="p-4 text-center text-xl font-semibold text-red-600">$599</td>
                        <td className="p-4 text-center">150+</td>
                        <td className="p-4 text-center text-amber-600">Varies</td>
                        <td className="p-4 text-center">Business hours</td>
                      </tr>
                      <tr>
                        <td className="p-4">Velocity Global</td>
                        <td className="p-4 text-center text-xl font-semibold text-red-600">$599</td>
                        <td className="p-4 text-center">185+</td>
                        <td className="p-4 text-center text-amber-600">Varies</td>
                        <td className="p-4 text-center">24/7</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Contractor Management Comparison */}
              <div>
                <h3 className="text-2xl font-bold text-accent-600 mb-6 text-center">Contractor Management Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-xl shadow-lg overflow-hidden">
                    <thead>
                      <tr className="bg-accent-50">
                        <th className="p-4 text-left font-semibold text-secondary-900">Provider</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Monthly Cost</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Currencies</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Compliance</th>
                        <th className="p-4 text-center font-semibold text-secondary-900">Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-secondary-100 bg-accent-25">
                        <td className="p-4 font-semibold text-accent-600">SDP Global Pay</td>
                        <td className="p-4 text-center text-2xl font-bold text-accent-600">$49</td>
                        <td className="p-4 text-center">50+</td>
                        <td className="p-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        </td>
                        <td className="p-4 text-center">24/7</td>
                      </tr>
                      <tr className="border-b border-secondary-100">
                        <td className="p-4">Multiplier</td>
                        <td className="p-4 text-center text-xl font-semibold">$40</td>
                        <td className="p-4 text-center">Multi-currency</td>
                        <td className="p-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        </td>
                        <td className="p-4 text-center">24/5</td>
                      </tr>
                      <tr>
                        <td className="p-4">Deel</td>
                        <td className="p-4 text-center text-xl font-semibold">$49</td>
                        <td className="p-4 text-center">150+</td>
                        <td className="p-4 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        </td>
                        <td className="p-4 text-center">Business hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key Advantages */}
              <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-secondary-900 mb-6 text-center">Why Choose SDP Global Pay?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-2">$200</div>
                    <div className="text-sm text-secondary-600">Monthly savings vs Deel/Velocity EOR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent-600 mb-2">$0</div>
                    <div className="text-sm text-secondary-600">Setup fees (others charge $500-2000)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary-600 mb-2">48hrs</div>
                    <div className="text-sm text-secondary-600">Average onboarding time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                    <div className="text-sm text-secondary-600">Customer support availability</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <div className="text-center mt-16 bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of companies saving thousands with SDP Global Pay's transparent pricing and premium service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-primary-300 text-primary-600 hover:bg-primary-50">
              Talk to Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}