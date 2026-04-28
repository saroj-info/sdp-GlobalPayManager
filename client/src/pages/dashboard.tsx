import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { AddWorkerModal } from "@/components/modals/add-worker-modal";
import { ContractWizardModal } from "@/components/modals/contract-wizard-modal";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Users, Clock, DollarSign, Globe, AlertCircle, TrendingUp, FileText, Building2, Receipt, CheckCircle2, Clock4, XCircle, Calendar, Target, BarChart3, Mail, ExternalLink, User, Shield, PiggyBank, CreditCard, Plus, Send } from "lucide-react";
import worldMapImage from "@assets/generated_images/Uniform_blue_world_map_b8ed3f3b.png";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import type {
  AuthUser,
  Worker,
  ContractWithDerived,
  TimesheetWithContract,
  LeaveRequest,
  InvoiceWithContext,
  Payslip,
  BusinessInvitation,
  DashboardStats,
} from "@/types/api";

// Worker Dashboard Component
function WorkerDashboard() {
  const [, setLocation] = useLocation();
  
  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: workerProfile } = useQuery<Worker>({
    queryKey: ["/api/workers/profile"],
    enabled: user?.userType === 'worker',
  });

  const { data: contracts = [] } = useQuery<ContractWithDerived[]>({
    queryKey: ["/api/contracts"],
    enabled: user?.userType === 'worker',
  });

  const { data: timesheets = [] } = useQuery<TimesheetWithContract[]>({
    queryKey: ["/api/timesheets"],
    enabled: user?.userType === 'worker',
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    enabled: user?.userType === 'worker' &&
      workerProfile?.workerType === 'employee',
  });

  const { data: invoices = [] } = useQuery<InvoiceWithContext[]>({
    queryKey: ["/api/invoices"],
    enabled: user?.userType === 'worker' &&
      workerProfile?.workerType === 'contractor',
  });

  const { data: payslips = [] } = useQuery<Payslip[]>({
    queryKey: ["/api/payslips/worker", workerProfile?.id],
    enabled: user?.userType === 'worker' &&
      workerProfile?.workerType === 'employee' &&
      Boolean(workerProfile?.id),
  });

  // Fetch business invitations for all workers
  const { data: businessInvitations = [] } = useQuery<BusinessInvitation[]>({
    queryKey: ["/api/business-invitations"],
    enabled: user?.userType === 'worker',
  });

  // Check eligibility for features
  const isEligibleForLeave = workerProfile?.workerType === 'employee';

  const isEligibleForInvoices = workerProfile?.workerType === 'contractor';

  const isEligibleForPayslips = workerProfile?.workerType === 'employee';

  const activeContracts = contracts.filter((c) => c.status === 'active');
  const pendingTimesheets = timesheets.filter((t) => t.status === 'draft' || t.status === 'submitted');
  const pendingLeave = leaveRequests.filter((l) => l.status === 'pending');
  const pendingInvoices = invoices.filter((i) => (i.status as string) === 'pending');
  const recentPayslips = payslips.slice(0, 3);
  const sentInvitations = businessInvitations.filter((i) => i.status === 'sent');
  const registeredInvitations = businessInvitations.filter((i) => i.status === 'registered');

  const getWelcomeMessage = () => {
    const firstName = workerProfile?.firstName || user?.firstName || 'Worker';
    return `Welcome back, ${firstName}!`;
  };

  usePageHeader(
    getWelcomeMessage(), 
    "Your personal workspace for contracts, timesheets, and more"
  );

  return (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-white min-h-full">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{getWelcomeMessage()}</h2>
                    <p className="text-blue-100 text-lg">
                      {workerProfile?.workerType === 'employee' ? 'Employee' : 'Contractor'} • 
                      {workerProfile?.businessStructure?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Worker'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-100 text-sm">Active Contracts</div>
                    <div className="text-3xl font-bold">{activeContracts.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/my-details')}>
                <CardContent className="p-6 text-center">
                  <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">My Details</h3>
                  <p className="text-gray-600 text-sm">Update personal information</p>
                  <div className="mt-4">
                    <Badge variant={workerProfile?.personalDetailsCompleted ? "default" : "outline"}>
                      {workerProfile?.personalDetailsCompleted ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/contracts')}>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Contracts</h3>
                  <p className="text-gray-600 text-sm">View your contracts</p>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-green-600">{activeContracts.length}</div>
                    <div className="text-xs text-gray-500">Active</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/timesheets')}>
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Timesheets</h3>
                  <p className="text-gray-600 text-sm">Track your hours</p>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-orange-600">{pendingTimesheets.length}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                </CardContent>
              </Card>

              {isEligibleForLeave && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/leave')}>
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Leave</h3>
                    <p className="text-gray-600 text-sm">Request time off</p>
                    <div className="mt-4">
                      <div className="text-2xl font-bold text-purple-600">{pendingLeave.length}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isEligibleForInvoices && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/worker-invoices')}>
                  <CardContent className="p-6 text-center">
                    <Receipt className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Contractor Invoices</h3>
                    <p className="text-gray-600 text-sm">Create and submit invoices</p>
                    <div className="mt-4">
                      <div className="text-2xl font-bold text-indigo-600">{pendingInvoices.length}</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isEligibleForPayslips && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/payslips')}>
                  <CardContent className="p-6 text-center">
                    <CreditCard className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Payslips</h3>
                    <p className="text-gray-600 text-sm">View your payslips</p>
                    <div className="mt-4">
                      <div className="text-2xl font-bold text-green-600">{recentPayslips.length}</div>
                      <div className="text-xs text-gray-500">Recent</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Business Invitations - Available to all workers */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/invite-business')}>
                <CardContent className="p-6 text-center">
                  <Send className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Invite Business</h3>
                  <p className="text-gray-600 text-sm">Invite new businesses to join</p>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-blue-600">{sentInvitations.length}</div>
                    <div className="text-xs text-gray-500">Sent</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Profile Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Profile Completion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Profile Completion
                  </CardTitle>
                  <CardDescription>
                    Complete your profile to ensure smooth payroll processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Personal Details</span>
                      </div>
                      <Badge variant={(workerProfile as any)?.personalDetailsCompleted ? "default" : "outline"}>
                        {(workerProfile as any)?.personalDetailsCompleted ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    
                    {(workerProfile as any)?.workerType === 'contractor' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>Business Details</span>
                        </div>
                        <Badge variant={(workerProfile as any)?.businessDetailsCompleted ? "default" : "outline"}>
                          {(workerProfile as any)?.businessDetailsCompleted ? 'Complete' : 'Pending'}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Banking Details</span>
                      </div>
                      <Badge variant={(workerProfile as any)?.bankDetailsCompleted ? "default" : "outline"}>
                        {(workerProfile as any)?.bankDetailsCompleted ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                    
                    {!(workerProfile as any)?.onboardingCompleted && (
                      <Button 
                        onClick={() => setLocation('/my-details')} 
                        className="w-full mt-4"
                        data-testid="button-complete-profile"
                      >
                        Complete Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Timesheets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Recent Timesheets
                  </CardTitle>
                  <CardDescription>
                    Your latest timesheet submissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timesheets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No timesheets yet</p>
                      <Button 
                        onClick={() => setLocation('/timesheets')} 
                        className="mt-4"
                        data-testid="button-create-timesheet"
                      >
                        Create First Timesheet
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {timesheets.slice(0, 3).map((timesheet: any) => (
                        <div key={timesheet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">
                              {new Date(timesheet.periodStart).toLocaleDateString()} - {new Date(timesheet.periodEnd).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600">{timesheet.totalHours} hours</div>
                          </div>
                          <Badge variant={timesheet.status === 'approved' ? 'default' : 'outline'}>
                            {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        onClick={() => setLocation('/timesheets')} 
                        className="w-full"
                        data-testid="button-view-all-timesheets"
                      >
                        View All Timesheets
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
  );
}

// Business Dashboard Component (original)
function BusinessDashboard() {
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Get personalized dashboard title based on user type
  const getDashboardTitle = () => {
    if (!user) return "Dashboard";
    const userData = user as any;

    if (userData.userType === 'sdp_internal') {
      return "SDP Global Pay Management";
    } else if (userData.userType === 'business') {
      return userData.business?.name || "Business Dashboard";
    } else if (userData.userType === 'worker') {
      return `${userData.firstName} ${userData.lastName} Dashboard`;
    }
    return "Dashboard";
  };

  const getDashboardDescription = () => {
    if (!user) return "Manage your workforce";
    const userData = user as any;
    
    if (userData.userType === 'sdp_internal') {
      return "Global workforce analytics and operations management";
    } else if (userData.userType === 'business') {
      return "Manage your global workforce and contracts";
    } else if (userData.userType === 'worker') {
      return "View your contracts, timesheets, and payslips";
    }
    return "Manage your workforce";
  };

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/countries"],
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers"],
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
  });

  // Provided workers for host client summary card (business users only)
  const { data: providedWorkers = [] } = useQuery<any[]>({
    queryKey: ["/api/workers/provided"],
    enabled: (user as any)?.userType === 'business_user',
  });

  const { data: analytics = {
    workersByCountry: [],
    pendingTimesheets: 0,
    spendByCountryAndYear: [],
    totalActiveWorkers: 0,
    totalActiveContracts: 0
  } } = useQuery<{
    workersByCountry: Array<{ countryId: string; countryName: string; employees: number; contractors: number; total: number }>;
    pendingTimesheets: number;
    spendByCountryAndYear: Array<{ countryId: string; countryName: string; year: number; totalSpend: number }>;
    totalActiveWorkers: number;
    totalActiveContracts: number;
  }>({
    queryKey: ["/api/dashboard/analytics"],
  });

  // Fetch pending signature requests for workers
  const { data: pendingSignatures = [] } = useQuery<any[]>({
    queryKey: ["/api/contracts/pending-signatures"],
    enabled: (user as any)?.userType === 'worker',
  });

  const { data: contractHistory = {
    contracts: [],
    totalRecords: 0,
    insights: {
      userType: 'business',
      totalActiveWorkers: 0,
      totalActiveContracts: 0,
      pendingTimesheets: 0,
    } as DashboardStats,
  } } = useQuery<{
    contracts: Array<any>;
    totalRecords: number;
    insights: DashboardStats;
  }>({
    queryKey: ["/api/dashboard/contract-history"],
  });

  // SDP Global Pay specific analytics for internal users
  const { data: sdpAnalytics } = useQuery<{
    contractsByCountry: { countryId: string; countryName: string; pending: number; signed: number; expired: number; total: number }[];
    businessUsersByCountry: { countryId: string; countryName: string; activeUsers: number; totalBusinesses: number }[];
    approvedTimesheets: { id: string; workerName: string; businessName: string; countryName: string; totalHours: number; amount: number; approvedDate: string }[];
    paymentsToProcess: { id: string; type: string; workerName: string; businessName: string; countryName: string; amount: number; dueDate: string; status: string }[];
    totalPaymentsValue: number;
    totalApprovedHours: number;
  }>({
    queryKey: ["/api/dashboard/sdp-analytics"],
    enabled: (user as any)?.userType === 'sdp_internal',
  });

  const accessibleCountries = countries as any[];

  const recentContracts = (contracts as any[]).slice(0, 3);
  
  const totalEmployees = (workers as any[]).filter((w: any) => w.workerType === 'employee').length;
  const totalContractors = (workers as any[]).filter((w: any) => w.workerType === 'contractor').length;

  const currentYear = new Date().getFullYear();
  const totalSpendThisYear = (analytics as any)?.spendByCountryAndYear
    ?.filter?.((spend: any) => spend.year === currentYear)
    ?.reduce?.((sum: number, spend: any) => sum + spend.totalSpend, 0) || 0;

  const isSdpInternal = (user as any)?.userType === 'sdp_internal';

  usePageHeader(getDashboardTitle(), getDashboardDescription());

  if (isSdpInternal) {
    return (
      <div className="p-6 bg-gray-50 min-h-full">

            {/* SDP Internal Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Contracts</p>
                      <p className="text-2xl font-bold text-gray-900">{sdpAnalytics?.contractsByCountry?.reduce((sum, c) => sum + c.total, 0) || 0}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {sdpAnalytics?.contractsByCountry?.reduce((sum, c) => sum + c.signed, 0) || 0} signed, {sdpAnalytics?.contractsByCountry?.reduce((sum, c) => sum + c.pending, 0) || 0} pending
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Business Users</p>
                      <p className="text-2xl font-bold text-gray-900">{sdpAnalytics?.businessUsersByCountry?.reduce((sum, b) => sum + b.activeUsers, 0) || 0}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    Across {sdpAnalytics?.businessUsersByCountry?.reduce((sum, b) => sum + b.totalBusinesses, 0) || 0} businesses
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved Hours</p>
                      <p className="text-2xl font-bold text-gray-900">{sdpAnalytics?.totalApprovedHours?.toLocaleString() || 0}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {sdpAnalytics?.approvedTimesheets?.length || 0} timesheet entries
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Payments Due</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${sdpAnalytics?.totalPaymentsValue?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 0}
                      </p>
                    </div>
                    <Receipt className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {sdpAnalytics?.paymentsToProcess?.length || 0} payments to process
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SDP Internal Detailed Analytics */}
            <Tabs defaultValue="contracts" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="contracts">Contracts by Country</TabsTrigger>
                <TabsTrigger value="users">Business Users</TabsTrigger>
                <TabsTrigger value="timesheets">Approved Timesheets</TabsTrigger>
                <TabsTrigger value="payments">Payments to Process</TabsTrigger>
              </TabsList>

              <TabsContent value="contracts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contracts by Country</CardTitle>
                    <CardDescription>Contract status and distribution across countries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sdpAnalytics?.contractsByCountry && sdpAnalytics.contractsByCountry.length > 0 ? (
                        sdpAnalytics.contractsByCountry.map((country) => (
                          <div key={country.countryId} className="border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                               onClick={() => setLocation(`/contracts?country=${country.countryId}`)}>
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                {country.countryName}
                                <ExternalLink className="w-4 h-4 ml-2 text-gray-400" />
                              </h3>
                              <div className="text-sm font-medium text-gray-600">Total: {country.total}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="flex items-center justify-center mb-1">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-1" />
                                  <span className="text-sm font-medium">Signed</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600 hover:text-green-700">{country.signed}</div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center mb-1">
                                  <Clock className="w-4 h-4 text-orange-600 mr-1" />
                                  <span className="text-sm font-medium">Pending</span>
                                </div>
                                <div className="text-2xl font-bold text-orange-600 hover:text-orange-700">{country.pending}</div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center mb-1">
                                  <XCircle className="w-4 h-4 text-red-600 mr-1" />
                                  <span className="text-sm font-medium">Expired</span>
                                </div>
                                <div className="text-2xl font-bold text-red-600 hover:text-red-700">{country.expired}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No contract data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Users by Country</CardTitle>
                    <CardDescription>Active business users and companies per country</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sdpAnalytics?.businessUsersByCountry && sdpAnalytics.businessUsersByCountry.length > 0 ? (
                        sdpAnalytics.businessUsersByCountry.map((country) => (
                          <div key={country.countryId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                               onClick={() => setLocation(`/business-users`)}>
                            <div className="flex items-center">
                              <Building2 className="w-5 h-5 text-blue-600 mr-3" />
                              <div>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  {country.countryName}
                                  <ExternalLink className="w-4 h-4 ml-2 text-gray-400" />
                                </div>
                                <div className="text-sm text-gray-600">{country.totalBusinesses} businesses</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600 hover:text-blue-700">{country.activeUsers}</div>
                              <div className="text-sm text-gray-600">active users</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No business user data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timesheets" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recently Approved Timesheets</CardTitle>
                    <CardDescription>Timesheets approved and ready for processing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sdpAnalytics?.approvedTimesheets && sdpAnalytics.approvedTimesheets.length > 0 ? (
                        sdpAnalytics.approvedTimesheets.slice(0, 10).map((timesheet) => (
                          <div key={timesheet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 cursor-pointer transition-colors"
                               onClick={() => setLocation('/timesheets')}>
                            <div className="flex items-center">
                              <CheckCircle2 className="w-5 h-5 text-green-600 mr-3" />
                              <div>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  {timesheet.workerName}
                                  <ExternalLink className="w-4 h-4 ml-2 text-gray-400" />
                                </div>
                                <div className="text-sm text-gray-600">{timesheet.businessName} • {timesheet.countryName}</div>
                                <div className="text-xs text-gray-500">Approved: {new Date(timesheet.approvedDate).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">${timesheet.amount.toLocaleString()}</div>
                              <div className="text-sm text-gray-600">{timesheet.totalHours}h</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No approved timesheets available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payments to Process</CardTitle>
                    <CardDescription>Outstanding payments requiring processing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sdpAnalytics?.paymentsToProcess && sdpAnalytics.paymentsToProcess.length > 0 ? (
                        sdpAnalytics.paymentsToProcess.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 cursor-pointer transition-colors"
                               onClick={() => setLocation('/sdp-invoices')}>
                            <div className="flex items-center">
                              <Receipt className="w-5 h-5 text-purple-600 mr-3" />
                              <div>
                                <div className="font-semibold text-gray-900 flex items-center">
                                  {payment.workerName}
                                  <ExternalLink className="w-4 h-4 ml-2 text-gray-400" />
                                </div>
                                <div className="text-sm text-gray-600">{payment.businessName} • {payment.countryName}</div>
                                <div className="text-xs text-gray-500">
                                  {payment.type} • Due: {new Date(payment.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">${payment.amount.toLocaleString()}</div>
                              <Badge variant={payment.status === 'overdue' ? 'destructive' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No payments to process
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
          {/* Pending Signature Requests for Workers */}
          {(user as any)?.userType === 'worker' && pendingSignatures && pendingSignatures.length > 0 && (
            <div className="mb-6">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <Mail className="h-6 w-6 text-orange-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-orange-900">
                          Contract{pendingSignatures.length > 1 ? 's' : ''} Awaiting Your Signature
                        </h3>
                        <p className="text-orange-700 text-sm">
                          {pendingSignatures.length} contract{pendingSignatures.length > 1 ? 's' : ''} require{pendingSignatures.length === 1 ? 's' : ''} your digital signature
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {pendingSignatures.slice(0, 3).map((contract: any) => (
                      <div key={contract.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-orange-600 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {contract.customRoleTitle || contract.roleTitle?.title || 'Contract'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {contract.business?.name} • {contract.country?.name}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (contract.signingToken) {
                              window.location.href = `/sign/${contract.signingToken}`;
                            }
                          }}
                          data-testid={`button-sign-contract-${contract.id}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Sign Now
                        </Button>
                      </div>
                    ))}
                    {pendingSignatures.length > 3 && (
                      <div className="text-center">
                        <Button variant="outline" size="sm" onClick={() => setLocation('/contracts')}>
                          View All {pendingSignatures.length} Contracts
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Host Client Summary Card — shown only when this business has workers provided by partners */}
          {(user as any)?.userType === 'business_user' && providedWorkers.length > 0 && (() => {
            const uniqueProviders = [...new Set(providedWorkers.map((w: any) => w.providedByBusinessName).filter(Boolean))];
            return (
              <div className="mb-6">
                <Card className="border-indigo-200 bg-indigo-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/workforce')}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <Users className="h-6 w-6 text-indigo-600 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-indigo-900">Workers Provided to You</h3>
                          <p className="text-indigo-700 text-sm mt-0.5">
                            {providedWorkers.length} active worker{providedWorkers.length !== 1 ? 's' : ''} via {uniqueProviders.length} business partner{uniqueProviders.length !== 1 ? 's' : ''}
                          </p>
                          {uniqueProviders.length > 0 && (
                            <p className="text-indigo-600 text-xs mt-1">
                              Provided by: {uniqueProviders.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">Host Client</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/workforce')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Workers</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalActiveWorkers || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  {totalEmployees} employees, {totalContractors} contractors
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/contracts')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Contracts</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalActiveContracts || 0}</p>
                  </div>
                  <Globe className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Across {analytics?.workersByCountry?.length || 0} countries
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation('/timesheets')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Timesheets</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.pendingTimesheets || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  {analytics?.pendingTimesheets ? 'Require approval' : 'All up to date'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{currentYear} Spend</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${totalSpendThisYear.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Annual projected spend
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Workers by Country */}
            <Card>
              <CardHeader>
                <CardTitle>Workers by Country</CardTitle>
                <CardDescription>Breakdown of your global workforce</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.workersByCountry && analytics.workersByCountry.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.workersByCountry.map((country, index) => (
                        <div key={country.countryId} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-3 ${
                              index === 0 ? 'bg-blue-500' :
                              index === 1 ? 'bg-green-500' :
                              index === 2 ? 'bg-purple-500' :
                              index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                            }`}></span>
                            <span className="text-sm font-medium text-gray-900">{country.countryName}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{country.total}</div>
                            <div className="text-xs text-gray-600">
                              {country.employees}E / {country.contractors}C
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Sample Data Header */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs mr-2">
                            SAMPLE DATA
                          </Badge>
                          <span className="text-sm text-blue-700">
                            Preview of your workforce analytics - real data will appear here once you add workers
                          </span>
                        </div>
                      </div>
                      
                      {/* Sample Workers Chart */}
                      <div className="h-64 opacity-75">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { country: "Australia", workers: 15, employees: 8, contractors: 7, fill: "#3B82F6" },
                                { country: "United States", workers: 12, employees: 6, contractors: 6, fill: "#10B981" },
                                { country: "United Kingdom", workers: 8, employees: 5, contractors: 3, fill: "#F59E0B" },
                                { country: "Singapore", workers: 5, employees: 2, contractors: 3, fill: "#EF4444" }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="workers"
                            >
                              {[
                                { country: "Australia", workers: 15, employees: 8, contractors: 7, fill: "#3B82F6" },
                                { country: "United States", workers: 12, employees: 6, contractors: 6, fill: "#10B981" },
                                { country: "United Kingdom", workers: 8, employees: 5, contractors: 3, fill: "#F59E0B" },
                                { country: "Singapore", workers: 5, employees: 2, contractors: 3, fill: "#EF4444" }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: any, name: any, props: any) => [
                                `${value} workers (${props.payload.employees}E / ${props.payload.contractors}C)`, 
                                'Total Workers'
                              ]}
                              labelFormatter={(label) => label}
                              contentStyle={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-2 text-sm opacity-75">
                        {[
                          { country: "Australia", workers: 15, color: "#3B82F6" },
                          { country: "United States", workers: 12, color: "#10B981" },
                          { country: "United Kingdom", workers: 8, color: "#F59E0B" },
                          { country: "Singapore", workers: 5, color: "#EF4444" }
                        ].map((item) => (
                          <div key={item.country} className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-gray-600">{item.country}: {item.workers}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-center pt-4 border-t border-gray-200">
                        <Button variant="outline" size="sm" onClick={() => setLocation('/workforce')}>
                          Add Your First Worker
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Annual Spend by Country */}
            <Card>
              <CardHeader>
                <CardTitle>{currentYear} Spend by Country</CardTitle>
                <CardDescription>Projected annual spend across locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(analytics as any)?.spendByCountryAndYear && (analytics as any)?.spendByCountryAndYear?.length > 0 ? (
                    (analytics as any).spendByCountryAndYear
                      ?.filter?.((spend: any) => spend.year === currentYear)
                      ?.sort?.((a: any, b: any) => b.totalSpend - a.totalSpend)
                      ?.map?.((spend: any, index: number) => (
                        <div key={`${spend.countryId}-${spend.year}`} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-900">{spend.countryName}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">
                              ${spend.totalSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-gray-600">
                              {((spend.totalSpend / totalSpendThisYear) * 100).toFixed(1)}% of total
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="space-y-4">
                      {/* Sample Data Header */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs mr-2">
                            SAMPLE DATA
                          </Badge>
                          <span className="text-sm text-blue-700">
                            Preview of your spend analytics - real data will appear here once you have active contracts
                          </span>
                        </div>
                      </div>
                      
                      {/* Sample World Map Visualization */}
                      <div className="relative h-64 opacity-75">
                        <div 
                          className="w-full h-full bg-cover bg-center bg-no-repeat rounded-lg border border-gray-200"
                          style={{ backgroundImage: `url(${worldMapImage})` }}
                        >
                          {/* Overlay spending indicators on map */}
                          <div className="relative w-full h-full">
                            {/* Australia indicator */}
                            <div className="absolute" style={{ right: '15%', bottom: '25%' }}>
                              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                AU: $180K
                              </div>
                            </div>
                            
                            {/* United States indicator */}
                            <div className="absolute" style={{ left: '20%', top: '35%' }}>
                              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                US: $120K
                              </div>
                            </div>
                            
                            {/* United Kingdom indicator */}
                            <div className="absolute" style={{ left: '48%', top: '25%' }}>
                              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                UK: $60K
                              </div>
                            </div>
                            
                            {/* Singapore indicator */}
                            <div className="absolute" style={{ right: '25%', bottom: '40%' }}>
                              <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                                SG: $40K
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Legend below map */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {[
                            { country: "Australia", amount: "$180K", percentage: "45%" },
                            { country: "United States", amount: "$120K", percentage: "30%" },
                            { country: "United Kingdom", amount: "$60K", percentage: "15%" },
                            { country: "Singapore", amount: "$40K", percentage: "10%" }
                          ].map((item) => (
                            <div key={item.country} className="flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                              <div className="text-center">
                                <div className="font-bold text-gray-900">{item.amount}</div>
                                <div className="text-gray-700 font-medium">{item.country}</div>
                                <div className="text-blue-600 font-semibold">{item.percentage}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Actions & Quick Access */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Actions</CardTitle>
                <CardDescription>Items requiring your attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.pendingTimesheets && analytics.pendingTimesheets > 0 ? (
                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-orange-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-orange-900">Timesheet Approvals</p>
                          <p className="text-xs text-orange-700">{analytics.pendingTimesheets} timesheets waiting for review</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setLocation('/timesheets')}>
                        Review
                      </Button>
                    </div>
                  ) : null}
                  
                  {analytics?.totalActiveWorkers === 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Add Your First Worker</p>
                          <p className="text-xs text-blue-700">Start building your global workforce</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setShowAddWorker(true)}>
                        Add Worker
                      </Button>
                    </div>
                  )}

                  {analytics?.totalActiveContracts === 0 && analytics?.totalActiveWorkers > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <Globe className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-green-900">Create Your First Contract</p>
                          <p className="text-xs text-green-700">Generate agreements for your workers</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setShowContractWizard(true)}>
                        Create Contract
                      </Button>
                    </div>
                  )}

                  {analytics?.pendingTimesheets === 0 && analytics?.totalActiveWorkers > 0 && analytics?.totalActiveContracts > 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm">All caught up! No pending actions.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and navigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col" onClick={() => setShowAddWorker(true)}>
                    <Users className="w-5 h-5 mb-2" />
                    <span className="text-sm">Add Worker</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col" onClick={() => setShowContractWizard(true)}>
                    <Globe className="w-5 h-5 mb-2" />
                    <span className="text-sm">Create Contract</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col" onClick={() => setLocation('/timesheets')}>
                    <Clock className="w-5 h-5 mb-2" />
                    <span className="text-sm">View Timesheets</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col" onClick={() => setLocation('/leave-requests')}>
                    <TrendingUp className="w-5 h-5 mb-2" />
                    <span className="text-sm">Leave Requests</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contract History and Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Insights</CardTitle>
                <CardDescription>Your contract creation history and performance</CardDescription>
              </CardHeader>
              <CardContent>
                {contractHistory?.insights ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{contractHistory.insights.totalContracts || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Contracts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{contractHistory.insights.activeContracts || 0}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    {user?.userType !== 'worker' && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{contractHistory.insights.pendingContracts || 0}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    )}
                    {contractHistory.insights.successRate !== undefined && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{contractHistory.insights.successRate}%</div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                    )}
                    {user?.userType === 'worker' && contractHistory.insights.totalEarnings !== undefined && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">${contractHistory.insights.totalEarnings?.toLocaleString() || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Earnings</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Sample Data Header */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs mr-2">
                          SAMPLE DATA
                        </Badge>
                        <span className="text-sm text-blue-700">
                          Preview of your contract insights - real data will appear here once you create contracts
                        </span>
                      </div>
                    </div>
                    
                    {/* Sample Contract Insights */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 opacity-75">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">8</div>
                        <div className="text-xs text-muted-foreground">Total Contracts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">6</div>
                        <div className="text-xs text-muted-foreground">Active</div>
                      </div>
                      {(user as any)?.userType !== 'worker' && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">2</div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">75%</div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                    </div>
                    
                    {/* Sample Contract Status Chart */}
                    <div className="mt-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-4">Contract Status Distribution</h4>
                      <div className="h-48 opacity-75">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Active', value: 6, color: '#10b981' },
                                { name: 'Pending', value: 2, color: '#f59e0b' },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {[
                                { name: 'Active', value: 6, color: '#10b981' },
                                { name: 'Pending', value: 2, color: '#f59e0b' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center space-x-4 mt-2">
                        {[
                          { name: 'Active', value: 6, color: '#10b981' },
                          { name: 'Pending', value: 2, color: '#f59e0b' },
                        ].map((item) => (
                          <div key={item.name} className="flex items-center opacity-75">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-center pt-4">
                      <Button variant="outline" size="sm" onClick={() => setLocation('/contracts')}>
                        Create Your First Contract
                      </Button>
                    </div>
                  </div>
                )}

                {/* Charts for SDP Internal Users */}
                {user?.userType === 'sdp_internal' && contractHistory?.insights?.monthlyTrends && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-4">Monthly Contract Trends</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={contractHistory.insights.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="contracts" fill="#3b82f6" name="Total Contracts" />
                          <Bar dataKey="active" fill="#10b981" name="Active Contracts" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Contract Status Distribution Chart */}
                {contractHistory?.insights && ((contractHistory.insights.totalContracts ?? 0) > 0) && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-4">Contract Status Distribution</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active', value: contractHistory.insights.activeContracts || 0, color: '#10b981' },
                              { name: 'Pending', value: contractHistory.insights.pendingContracts || 0, color: '#f59e0b' },
                              { name: 'Draft', value: contractHistory.insights.draftContracts || 0, color: '#6b7280' },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { name: 'Active', value: contractHistory.insights.activeContracts || 0, color: '#10b981' },
                              { name: 'Pending', value: contractHistory.insights.pendingContracts || 0, color: '#f59e0b' },
                              { name: 'Draft', value: contractHistory.insights.draftContracts || 0, color: '#6b7280' },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center space-x-4 mt-2">
                      {[
                        { name: 'Active', value: contractHistory.insights.activeContracts || 0, color: '#10b981' },
                        { name: 'Pending', value: contractHistory.insights.pendingContracts || 0, color: '#f59e0b' },
                        { name: 'Draft', value: contractHistory.insights.draftContracts || 0, color: '#6b7280' },
                      ].filter(item => item.value > 0).map((item) => (
                        <div key={item.name} className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-xs text-gray-600">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Contracts */}
                {contractHistory?.contracts && contractHistory.contracts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700 mt-2">Recent Contracts</h4>
                    {contractHistory.contracts.slice(0, 5).map((contract: any) => (
                      <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{contract.workerName}</div>
                            <div className="text-xs text-gray-600">{contract.countryName} • {contract.employmentType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              contract.status === 'active' || contract.status === 'signed' ? 'default' :
                              contract.status === 'pending_signature' || contract.status === 'sent' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {contract.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {contractHistory.totalRecords > 5 && (
                      <div className="text-center pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation('/contracts')}
                          data-testid="button-view-all-contracts"
                        >
                          View All {contractHistory.totalRecords} Contracts
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <AddWorkerModal 
            open={showAddWorker} 
            onOpenChange={setShowAddWorker}
            countries={accessibleCountries}
          />
          
          <ContractWizardModal 
            open={showContractWizard} 
            onOpenChange={setShowContractWizard}
            workers={workers as any[]}
            countries={accessibleCountries}
          />
        </div>
    );
  }

// Main Dashboard Component
export default function Dashboard() {
  const { user, isLoading, isAuthenticated, authReady, error } = useAuth();

  // Show loading skeleton while determining auth state
  if (!authReady || (isAuthenticated && isLoading)) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Render the appropriate dashboard based on user type
  if ((user as any)?.userType === 'worker') {
    return <WorkerDashboard />;
  }
  
  // SDP internal users get the business dashboard with SDP analytics
  if ((user as any)?.userType === 'sdp_internal') {
    return <BusinessDashboard />;
  }
  
  return <BusinessDashboard />;
}
