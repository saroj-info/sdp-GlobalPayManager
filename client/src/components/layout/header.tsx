import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Settings, LogOut, Building2, Key, ChevronDown, Shield, Eye, EyeOff } from "lucide-react";
import sampleUserPhoto from "@assets/generated_images/Professional_business_headshot_8ca64f96.png";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { handleLogout, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  description: string;
  accessibleCountries?: any[];
}

export function Header({ title, description, accessibleCountries = [] }: HeaderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Change Password dialog state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwVisible, setPwVisible] = useState({ current: false, next: false, confirm: false });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/account/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      setShowChangePassword(false);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      let msg = error?.message || "Failed to update password.";
      try {
        const jsonStart = msg.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(msg.substring(jsonStart));
          msg = parsed.message || msg;
        }
      } catch {}
      toast({ title: "Update Failed", description: msg, variant: "destructive" });
    },
  });

  const handleSubmitChangePassword = () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast({ title: "Missing Fields", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast({ title: "Weak Password", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: "Passwords Do Not Match", description: "New password and confirmation do not match.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

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
              
              {/* Change Password - For all users */}
              <DropdownMenuItem data-testid="menu-change-password" onClick={() => setShowChangePassword(true)}>
                <Key className="mr-2 h-4 w-4" />
                <span>Change Password</span>
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

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={(o) => { setShowChangePassword(o); if (!o) setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>Update your account password. Use at least 8 characters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="dropdown-currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="dropdown-currentPassword"
                  type={pwVisible.current ? "text" : "password"}
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  className="pr-10"
                  data-testid="input-dropdown-current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setPwVisible((v) => ({ ...v, current: !v.current }))}
                  aria-label={pwVisible.current ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {pwVisible.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="dropdown-newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="dropdown-newPassword"
                  type={pwVisible.next ? "text" : "password"}
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="pr-10"
                  data-testid="input-dropdown-new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setPwVisible((v) => ({ ...v, next: !v.next }))}
                  aria-label={pwVisible.next ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {pwVisible.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="dropdown-confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="dropdown-confirmPassword"
                  type={pwVisible.confirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="pr-10"
                  data-testid="input-dropdown-confirm-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setPwVisible((v) => ({ ...v, confirm: !v.confirm }))}
                  aria-label={pwVisible.confirm ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {pwVisible.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)}>Cancel</Button>
            <Button onClick={handleSubmitChangePassword} disabled={changePasswordMutation.isPending} data-testid="button-dropdown-change-password">
              <Key className="h-4 w-4 mr-2" />
              {changePasswordMutation.isPending ? 'Updating...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
