import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SDPLogo } from "@/components/ui/logo";
import sampleUserPhoto from "@assets/generated_images/Professional_business_headshot_8ca64f96.png";
import { handleLogout } from "@/lib/queryClient";

export function Sidebar() {
  const [location] = useLocation();
  
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Navigation for business users and SDP internal users
  const businessNavigation = [
    { name: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
    { name: 'Workforce', href: '/workforce', icon: 'fas fa-users' },
    { name: 'Contracts', href: '/contracts', icon: 'fas fa-file-contract' },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: 'fas fa-file-invoice-dollar' },
    { name: 'Timesheets', href: '/timesheets', icon: 'fas fa-clock' },
    { name: 'Leave Requests', href: '/leave-requests', icon: 'fas fa-calendar-day' },
    { name: 'Invoices', href: '/invoices', icon: 'fas fa-file-invoice' },
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

    // Templates (Admin) for Super Admin and Admin only
    if (userSdpRole && ['sdp_super_admin', 'sdp_admin'].includes(userSdpRole)) {
      navigation.push({ name: 'Templates', href: '/admin', icon: 'fas fa-file-contract' });
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
    <aside className="w-64 bg-white dark:bg-gray-900 shadow-lg border-r border-secondary-100 dark:border-gray-800">
      <div className="p-6">
        <div className="mb-8">
          <SDPLogo size="lg" variant="horizontal" theme="light" />
        </div>
        
        {/* User Info */}
        {user && (user as any) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-primary-100 dark:border-gray-600">
            <div>
              <p className="text-sm font-semibold text-secondary-900 dark:text-white">
                {(user as any)?.business?.name || (user as any)?.name || 'Personal Account'}
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                {(() => {
                  const userData = user as any;
                  if (userData?.userType === 'sdp_internal') {
                    // Map sdpRole to proper role descriptions
                    switch (userData.sdpRole) {
                      case 'sdp_super_admin':
                        return 'Super Admin';
                      case 'sdp_admin':
                        return 'Administrator';
                      case 'sdp_agent':
                        return 'Support Agent';
                      default:
                        return 'SDP Internal';
                    }
                  } else if (userData?.userType === 'worker') {
                    return 'Worker';
                  } else {
                    return 'Business User';
                  }
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-1">
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

        {/* Logout Section */}
        <div className="mt-auto pt-6 border-t border-secondary-100 dark:border-gray-700">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-secondary-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200"
            data-testid="button-logout-sidebar"
          >
            <i className="fas fa-sign-out-alt w-5 text-secondary-500 dark:text-gray-400"></i>
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
