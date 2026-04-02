import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Building2, Key, ChevronDown, Shield } from "lucide-react";
import sampleUserPhoto from "@assets/generated_images/Professional_business_headshot_8ca64f96.png";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { handleLogout } from "@/lib/queryClient";

interface HeaderProps {
  title: string;
  description: string;
  accessibleCountries?: any[];
}

export function Header({ title, description, accessibleCountries = [] }: HeaderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const getUserDisplayName = () => {
    if (!user) return "User";
    const userData = user as any;
    
    // Always prioritize actual name if available
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    
    // Fallback to role-based names only if no actual name is available
    if (userData.userType === 'sdp_internal') {
      switch (userData.sdpRole) {
        case 'sdp_super_admin':
          return "Super Admin";
        case 'sdp_admin':
          return "Admin";
        case 'sdp_agent':
          return "Agent";
        default:
          return "SDP Internal";
      }
    } else if (userData.userType === 'business') {
      return userData.business?.name || "Business User";
    } else if (userData.userType === 'worker') {
      return "Worker";
    }
    return "User";
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const userData = user as any;
    
    // Always prioritize actual name initials if available
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName[0].toUpperCase()}${userData.lastName[0].toUpperCase()}`;
    }
    
    // Fallback to role-based initials only if no name is available
    if (userData.userType === 'sdp_internal') {
      switch (userData.sdpRole) {
        case 'sdp_super_admin':
          return "SA";
        case 'sdp_admin':
          return "AD";
        case 'sdp_agent':
          return "AG";
        default:
          return "SI";
      }
    } else if (userData.userType === 'business') {
      const businessName = userData.business?.name || "Business";
      return businessName.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserProfileImage = () => {
    const userData = user as any;
    return userData?.profileImageUrl || sampleUserPhoto;
  };

  return (
    <header className="bg-white border-b border-secondary-100 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-secondary-900">{title}</h2>
          <p className="text-sm text-secondary-600 mt-1">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Country Access Indicator - Clickable */}
          <Button 
            variant="ghost" 
            className="flex items-center bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-full transition-colors duration-200"
            onClick={() => setLocation('/country-management')}
            data-testid="button-countries-chip"
          >
            <i className="fas fa-globe text-primary-500 text-sm mr-2"></i>
            <span className="text-sm font-medium text-primary-700">
              {accessibleCountries.length} Countries
            </span>
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2" data-testid="button-user-menu">
                {(user as any)?.profileImageUrl ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden shadow-md border-2 border-primary-200" data-testid="avatar-user">
                    <img 
                      src={(user as any).profileImageUrl} 
                      alt="User Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 border-2 border-primary-200 flex items-center justify-center" data-testid="avatar-user">
                    <span className="text-sm font-semibold text-primary-700">{getUserInitials()}</span>
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-secondary-900">{getUserDisplayName()}</p>
                  <p className="text-xs text-primary-600">
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
                <ChevronDown className="h-4 w-4 text-secondary-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center space-x-2 p-2">
                {(user as any)?.profileImageUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-200">
                    <img 
                      src={(user as any).profileImageUrl} 
                      alt="User Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 border-2 border-primary-200 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-700">{getUserInitials()}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{getUserDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">
                    {(user as any)?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              
              {/* Business Profile - Only for business users */}
              {(user as any)?.userType === 'business' && (
                <DropdownMenuItem data-testid="menu-business-profile" onClick={() => window.location.href = '/business-setup'}>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Business Profile</span>
                </DropdownMenuItem>
              )}
              
              {/* Reset Password - For all users */}
              <DropdownMenuItem data-testid="menu-reset-password" onClick={() => alert('Password reset functionality coming soon!')}>
                <Key className="mr-2 h-4 w-4" />
                <span>Reset Password</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem data-testid="menu-settings" onClick={() => window.location.href = '/settings'}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem data-testid="menu-security-settings" onClick={() => window.location.href = '/security-settings'}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Security Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem data-testid="button-logout-header" onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
