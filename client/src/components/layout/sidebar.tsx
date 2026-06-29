import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SDPLogo } from "@/components/ui/logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Briefcase, Check, ChevronsUpDown } from "lucide-react";
import sampleUserPhoto from "@assets/generated_images/Professional_business_headshot_8ca64f96.png";
import { handleLogout } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function Sidebar() {
  const [location] = useLocation();
  const { toast } = useToast();

  const { user, activeRole, availableRoles, canSwitchRole, switchRole } = useAuth();

  // Dual-role: Slack-style workspace switcher lives in the sidebar header.
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const roleWorkspaceName = (role?: string) => {
    if (role === "worker") {
      const u = user as any;
      const personName = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.name;
      return personName ? `${personName} (Worker)` : "Worker Profile";
    }
    return (user as any)?.business?.name || (user as any)?.name || "Business";
  };
  const roleLabel = (role?: string) => (role === "worker" ? "Worker" : role === "business_user" ? "Business" : role);
  const roleIcon = (role?: string) => (role === "worker" ? Briefcase : Building2);

  const handleSwitchTo = async (role: string) => {
    if (role === activeRole || switchingTo) return;
    setSwitchingTo(role);
    try {
      await switchRole(role);
      window.location.href = "/";
    } catch (error: any) {
      setSwitchingTo(null);
      toast({ title: "Switch failed", description: error?.message || "Could not switch view.", variant: "destructive" });
    }
  };

  // Navigation for business users and SDP internal users
  const businessNavigation = [
    { name: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
    { name: 'Workforce', href: '/workforce', icon: 'fas fa-users' },
    { name: 'Contracts', href: '/contracts', icon: 'fas fa-file-contract' },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: 'fas fa-file-invoice-dollar' },
    { name: 'Timesheets', href: '/timesheets', icon: 'fas fa-clock' },
    { name: 'Leave Requests', href: '/leave-requests', icon: 'fas fa-calendar-day' },
    { name: 'Invoices', href: '/invoices', icon: 'fas fa-file-invoice' },
    { name: 'Pay Items', href: '/pay-items', icon: 'fas fa-coins' },
    { name: 'Team Members', href: '/team-members', icon: 'fas fa-user-friends' },
    { name: 'Resources', href: '/resources', icon: 'fas fa-calculator' },
  ];

  // Fetch worker profile to determine navigation options
  const { data: workerProfile } = useQuery({
    queryKey: ["/api/workers/profile"],
    enabled: (user as any)?.userType === 'worker',
  });

  // Navigation for workers (conditional based on worker type)
  const getWorkerNavigation = () => {
    const baseNavigation = [
      { name: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
      { name: 'My Details', href: '/my-details', icon: 'fas fa-user' },
      { name: 'Contracts', href: '/contracts', icon: 'fas fa-file-contract' },
      { name: 'Timesheets', href: '/timesheets', icon: 'fas fa-clock' },
    ];

    // Add Leave for employees and contractors of record
    const isEligibleForLeave = (workerProfile as any)?.workerType === 'employee' || 
      ((workerProfile as any)?.workerType === 'contractor' && (workerProfile as any)?.businessStructure === 'contractor_of_record');
    
    if (isEligibleForLeave) {
      baseNavigation.push({ name: 'Leave', href: '/leave', icon: 'fas fa-calendar-day' });
    }

    // Add Invoices for contractors (but not contractor of record)
    const isContractorNotOfRecord = (workerProfile as any)?.workerType === 'contractor' && 
      (workerProfile as any)?.businessStructure !== 'contractor_of_record';
    
    if (isContractorNotOfRecord) {
      baseNavigation.push({ name: 'Contractor Invoices', href: '/worker-invoices', icon: 'fas fa-file-invoice' });
    }

    // Payslips visible to every worker. The /payslips page detects role and
    // calls GET /api/payslips which scopes to the worker's own rows.
    baseNavigation.push({ name: 'Payslips', href: '/payslips', icon: 'fas fa-receipt' });

    // Add Benefits and Compensation for all workers
    baseNavigation.push({ name: 'Benefits & Compensation', href: '/benefits', icon: 'fas fa-gift' });

    return baseNavigation;
  };

  const sdpInternalNavigation = [
    { name: 'Payslips', href: '/payslips', icon: 'fas fa-receipt' },
    { name: 'Invoices', href: '/sdp-invoices', icon: 'fas fa-file-invoice-dollar' },
    { name: 'Reports', href: '/reports', icon: 'fas fa-chart-bar' },
  ];
  
  // Navigation for SDP admin users only
  const getSdpAdminNavigation = () => {
    const userSdpRole = (user as any)?.sdpRole;
    const navigation = [];
    
    // User Management for all SDP admin roles
    if (userSdpRole && ['sdp_super_admin', 'sdp_admin', 'sdp_agent'].includes(userSdpRole)) {
      navigation.push({ name: 'User Management', href: '/user-management', icon: 'fas fa-users-cog' });
    }
    
    // Country Management for super admin and admin
    if (userSdpRole && ['sdp_super_admin', 'sdp_admin'].includes(userSdpRole)) {
      navigation.push({ name: 'Country Management', href: '/country-management', icon: 'fas fa-globe' });
    }

    // Templates — accessible to all SDP-internal users
    if (userSdpRole && ['sdp_super_admin', 'sdp_admin', 'sdp_agent'].includes(userSdpRole)) {
      navigation.push({ name: 'Templates', href: '/platform-config', icon: 'fas fa-file-contract' });
    }

    return navigation;
  };

  // Build navigation based on user role
  const getNavigation = () => {
    const userType = (user as any)?.userType;
    
    if (userType === 'worker') {
      return getWorkerNavigation();
    }
    
    // For SDP internal users, rename "Invoices" to "Contractor Invoices" since that
    // page shows worker→business contractor invoices (not their own invoices)
    const baseNav = userType === 'sdp_internal'
      ? businessNavigation.map(item =>
          item.href === '/invoices' ? { ...item, name: 'Contractor Invoices' } : item
        )
      : businessNavigation;

    return [
      ...baseNav,
      ...(userType === 'sdp_internal' ? sdpInternalNavigation : []),
      ...(userType === 'sdp_internal' ? getSdpAdminNavigation() : []),
    ];
  };

  const navigation = getNavigation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  return (
    <aside className="w-64 h-screen flex flex-col bg-white dark:bg-gray-900 shadow-lg border-r border-secondary-100 dark:border-gray-800">
      {/* Top: logo + user info — does not scroll */}
      <div className="px-6 pt-6 pb-4">
        <div className="mb-6">
          <SDPLogo size="lg" variant="horizontal" theme="light" />
        </div>

        {user && (user as any) && (() => {
          const userData = user as any;
          const sdpLabel = (() => {
            switch (userData.sdpRole) {
              case 'sdp_super_admin': return 'Super Admin';
              case 'sdp_admin': return 'Administrator';
              case 'sdp_agent': return 'Support Agent';
              default: return 'SDP Internal';
            }
          })();
          const isSdp = userData?.userType === 'sdp_internal';
          const ActiveIcon = roleIcon(activeRole);
          // Title line: workspace name; subtitle: role label.
          const title = isSdp
            ? (userData?.name || 'SDP Internal')
            : roleWorkspaceName(activeRole);
          const subtitle = isSdp ? sdpLabel : `${roleLabel(activeRole)} View`;

          const card = (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-primary-100 dark:border-gray-600">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-secondary-900 dark:text-white">{title}</p>
                <p className="truncate text-xs text-primary-600 dark:text-primary-400 font-medium">{subtitle}</p>
              </div>
              {canSwitchRole && <ChevronsUpDown className="h-4 w-4 shrink-0 text-secondary-400" />}
            </div>
          );

          // SDP / single-role users: plain card, no switcher.
          if (!canSwitchRole) return card;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full focus:outline-none" data-testid="button-workspace-switcher">{card}</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Switch workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableRoles.map((role) => {
                  const Icon = roleIcon(role);
                  const isActive = role === activeRole;
                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleSwitchTo(role)}
                      disabled={!!switchingTo}
                      className="gap-3 py-2"
                      data-testid={`menu-workspace-${role}`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700 dark:bg-gray-700 dark:text-primary-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{roleWorkspaceName(role)}</p>
                        <p className="truncate text-xs text-muted-foreground">{roleLabel(role)} View</p>
                      </div>
                      {isActive
                        ? <Check className="h-4 w-4 shrink-0 text-primary-600" />
                        : switchingTo === role ? <span className="text-xs text-muted-foreground">…</span> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}
      </div>

      {/* Middle: scrollable nav — takes the remaining height so the footer stays pinned */}
      <nav className="flex-1 overflow-y-auto px-6 pb-2 space-y-1">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}>
            <div className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
              isActive(item.href)
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-secondary-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-800 hover:text-primary-700 dark:hover:text-primary-400'
            }`}>
              <i className={`${item.icon} w-5 ${isActive(item.href) ? 'text-white' : 'text-secondary-500 dark:text-gray-400'}`}></i>
              <span className={`ml-3 ${isActive(item.href) ? 'text-white font-bold' : ''}`}>{item.name}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* Bottom: logout — pinned, on the same white sidebar background */}
      <div className="px-6 py-4 border-t border-secondary-100 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-sm font-medium text-secondary-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200"
          data-testid="button-logout-sidebar"
        >
          <i className="fas fa-sign-out-alt w-5 text-secondary-500 dark:text-gray-400"></i>
          <span className="ml-3">Logout</span>
        </button>
      </div>
    </aside>
  );
}
