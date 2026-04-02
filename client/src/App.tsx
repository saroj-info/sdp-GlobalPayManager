import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import Landing from "@/pages/landing";
import Signup from "@/pages/signup";
import BusinessSetup from "@/pages/business-setup";
import Dashboard from "@/pages/dashboard";
import Workforce from "@/pages/workforce";
import Contracts from "@/pages/contracts";
import Timesheets from "@/pages/timesheets";
import LeaveRequests from "@/pages/leave-requests";
import Payslips from "@/pages/payslips";
import Invoices from "@/pages/invoices";
import SdpInvoices from "@/pages/sdp-invoices";
import WorkerOnboarding from "@/pages/worker-onboarding";
import MyDetails from "@/pages/my-details";
import Leave from "@/pages/leave";
import WorkerInvoices from "@/pages/worker-invoices";
import Benefits from "@/pages/benefits";
import Admin from "@/pages/admin";
import UserManagement from "@/pages/user-management";
import BusinessUsers from "@/pages/business-users";
import CountryManagement from "@/pages/country-management";
import Resources from "@/pages/resources";
import CountryGuides from "@/pages/country-guides";
import Solutions from "@/pages/solutions";
import SignContract from "@/pages/sign-contract";
import HowItWorks from "@/pages/how-it-works";
import Pricing from "@/pages/pricing";
import Contact from "@/pages/contact";
import Login from "@/pages/login";
import TestLogin from "@/pages/test-login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Reports from "@/pages/reports";
import AcceptBusinessInvitation from "@/pages/accept-business-invitation";
import AcceptSdpInvite from "@/pages/accept-sdp-invite";
import Settings from "@/pages/settings";
import SecuritySettings from "@/pages/security-settings";
import InviteBusiness from "@/pages/invite-business";
import NewClientInvoice from "@/pages/new-client-invoice";
import InvoiceView from "@/pages/invoice-view";
import PurchaseOrders from "@/pages/purchase-orders";
import NotFound from "@/pages/not-found";

// Loading skeleton component
function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 animate-pulse">
        <div className="p-6 space-y-4">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <main className="flex-1">
        <div className="p-6 space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, authReady } = useAuth();

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/signup" component={Signup} />
      <Route path="/solutions" component={Solutions} />
      <Route path="/country-guides" component={CountryGuides} />
      <Route path="/resources" component={Resources} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={Login} />
      <Route path="/test-login" component={TestLogin} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/sign/:token" component={SignContract} />
      <Route path="/invite/business/:token" component={AcceptBusinessInvitation} />
      <Route path="/invite/:token" component={AcceptSdpInvite} />
      <Route path="/invoice/view/:token" component={InvoiceView} />
      
      {/* Protected routes - require auth to be ready */}
      <Route path="/" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return isAuthenticated ? <AuthenticatedLayout><Dashboard /></AuthenticatedLayout> : <Landing />;
      }} />
      <Route path="/dashboard" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Dashboard /></AuthenticatedLayout>;
      }} />
      <Route path="/workforce" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Workforce /></AuthenticatedLayout>;
      }} />
      <Route path="/contracts" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Contracts /></AuthenticatedLayout>;
      }} />
      <Route path="/timesheets" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Timesheets /></AuthenticatedLayout>;
      }} />
      <Route path="/leave-requests" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><LeaveRequests /></AuthenticatedLayout>;
      }} />
      <Route path="/payslips" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Payslips /></AuthenticatedLayout>;
      }} />
      <Route path="/invoices/new-client" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><NewClientInvoice /></AuthenticatedLayout>;
      }} />
      <Route path="/invoices" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Invoices /></AuthenticatedLayout>;
      }} />
      <Route path="/sdp-invoices" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><SdpInvoices /></AuthenticatedLayout>;
      }} />
      <Route path="/reports" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Reports /></AuthenticatedLayout>;
      }} />
      <Route path="/onboarding" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><WorkerOnboarding /></AuthenticatedLayout>;
      }} />
      <Route path="/my-details" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><MyDetails /></AuthenticatedLayout>;
      }} />
      <Route path="/leave" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Leave /></AuthenticatedLayout>;
      }} />
      <Route path="/worker-invoices" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><WorkerInvoices /></AuthenticatedLayout>;
      }} />
      <Route path="/benefits" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Benefits /></AuthenticatedLayout>;
      }} />
      <Route path="/admin" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Admin /></AuthenticatedLayout>;
      }} />
      <Route path="/user-management" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><UserManagement /></AuthenticatedLayout>;
      }} />
      <Route path="/business-users" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><BusinessUsers /></AuthenticatedLayout>;
      }} />
      <Route path="/country-management" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><CountryManagement /></AuthenticatedLayout>;
      }} />
      <Route path="/settings" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><Settings /></AuthenticatedLayout>;
      }} />
      <Route path="/security-settings" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><SecuritySettings /></AuthenticatedLayout>;
      }} />
      <Route path="/invite-business" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><InviteBusiness /></AuthenticatedLayout>;
      }} />
      <Route path="/purchase-orders" component={() => {
        if (!authReady) return <AuthLoadingSkeleton />;
        return <AuthenticatedLayout><PurchaseOrders /></AuthenticatedLayout>;
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
