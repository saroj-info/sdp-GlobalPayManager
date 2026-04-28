import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, MapPin, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";

const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  sdpRole: z.enum(["sdp_super_admin", "sdp_admin", "sdp_agent"], {
    required_error: "Please select a role",
  }),
  accessibleCountries: z.array(z.string()).optional(),
  accessibleBusinessIds: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  isActive: z.boolean(),
  accessibleCountries: z.array(z.string()).min(0, "Please select at least one country or leave empty for all countries").optional(),
  accessibleBusinessIds: z.array(z.string()).min(0, "Please select at least one business or leave empty for all businesses").optional(),
});

type InviteUserData = z.infer<typeof inviteUserSchema>;
type UpdateUserData = z.infer<typeof updateUserSchema>;

export default function UserManagement() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Check if accessed from Business Users analytics (has country parameter)
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const countryFilter = urlParams.get('country');
  const isBusinessUsersView = !!countryFilter;

  // Fetch current user to check permissions
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch SDP users (default view)
  const { data: sdpUsersData, isLoading: sdpUsersLoading, error: sdpUsersError } = useQuery({
    queryKey: ["/api/sdp-users"],
    enabled: !!(currentUser as any)?.sdpRole && !isBusinessUsersView,
  });

  // Fetch pending SDP user invitations
  const { data: pendingInvitesData, isLoading: pendingInvitesLoading } = useQuery({
    queryKey: ["/api/sdp-users/invites/pending"],
    enabled: !!(currentUser as any)?.sdpRole && !isBusinessUsersView,
  });

  // Fetch business users (country-filtered view)
  const { data: businessUsersData, isLoading: businessUsersLoading, error: businessUsersError } = useQuery({
    queryKey: ["/api/business-users", countryFilter],
    queryFn: async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token from localStorage (same as default fetcher)
      const token = localStorage.getItem('authToken');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/business-users?country=${countryFilter}`, {
        method: 'GET',
        headers,
        cache: 'no-store', // Prevent browser caching
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(currentUser as any)?.sdpRole && isBusinessUsersView && !!countryFilter,
  });

  // Combine users and pending invites for SDP view
  const activeUsers = Array.isArray(sdpUsersData) ? sdpUsersData : [];
  const pendingInvites = Array.isArray(pendingInvitesData) ? pendingInvitesData : [];
  
  // Transform pending invites to match user structure
  const pendingInvitesAsUsers = pendingInvites.map((invite: any) => ({
    id: invite.id,
    email: invite.email,
    firstName: invite.firstName,
    lastName: invite.lastName,
    phoneNumber: invite.phoneNumber,
    sdpRole: invite.sdpRole,
    accessibleCountries: invite.accessibleCountries,
    accessibleBusinessIds: invite.accessibleBusinessIds,
    isActive: true,
    isPending: true,
    inviteToken: invite.token,
    expiresAt: invite.expiresAt,
  }));
  
  // Combine active users and pending invites
  const combinedSdpUsers = [...activeUsers, ...pendingInvitesAsUsers];
  
  // Combine the query results
  const users = isBusinessUsersView ? businessUsersData : combinedSdpUsers;
  const usersLoading = isBusinessUsersView ? businessUsersLoading : (sdpUsersLoading || pendingInvitesLoading);
  const usersError = isBusinessUsersView ? businessUsersError : sdpUsersError;
  
  // Legacy alias for compatibility
  const sdpUsers = !isBusinessUsersView ? users : undefined;

  // Fetch countries for scope selection
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ["/api/countries"],
    enabled: !!(currentUser as any)?.sdpRole,
  });
  
  // Ensure countries is always an array
  const countries = Array.isArray(countriesData) ? countriesData : [];

  // Fetch businesses for scope selection
  const { data: businesses, isLoading: businessesLoading } = useQuery<any[]>({
    queryKey: ["/api/businesses"],
    enabled: !!(currentUser as any)?.sdpRole,
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: (data: InviteUserData) => 
      apiRequest('POST', '/api/sdp-users/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-users/invites/pending"] });
      inviteForm.reset();
      setInviteDialogOpen(false);
      toast({
        title: "Invitation sent",
        description: "The user invitation has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      apiRequest('PATCH', `/api/sdp-users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdp-users"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Resend invitation mutation
  const resendInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest('POST', `/api/sdp-users/invites/${inviteId}/resend`, {}),
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "The invitation email has been resent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    },
  });

  const inviteForm = useForm<InviteUserData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      sdpRole: undefined as any,
      accessibleCountries: [],
      accessibleBusinessIds: [],
    },
  });

  const updateForm = useForm<UpdateUserData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      isActive: true,
      accessibleCountries: [],
      accessibleBusinessIds: [],
    },
  });

  const onInviteSubmit = (data: InviteUserData) => {
    inviteUserMutation.mutate(data);
  };

  const onUpdateSubmit = (data: UpdateUserData) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    updateForm.reset({
      isActive: user.isActive,
      accessibleCountries: user.accessibleCountries || [],
      accessibleBusinessIds: user.accessibleBusinessIds || [],
    });
    setEditDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'sdp_super_admin':
        return 'destructive';
      case 'sdp_admin':
        return 'default';
      case 'sdp_agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sdp_super_admin':
        return 'Super Admin';
      case 'sdp_admin':
        return 'Admin';
      case 'sdp_agent':
        return 'Agent';
      default:
        return role;
    }
  };

  // Helper function to get business names from IDs
  const getBusinessNames = (businessIds: string[] | null | undefined) => {
    if (!businessIds || businessIds.length === 0 || !businesses || !Array.isArray(businesses)) return [];
    return businessIds
      .map(id => businesses.find((b: any) => b.id === id))
      .filter(Boolean)
      .map((b: any) => b.name);
  };

  // Helper function to get country names from IDs
  const getCountryNames = (countryIds: string[] | null | undefined) => {
    if (!countryIds || countryIds.length === 0 || !countries || !Array.isArray(countries)) return [];
    return countryIds
      .map(id => countries.find((c: any) => c.id === id))
      .filter(Boolean)
      .map((c: any) => c.name);
  };

  const userSdpRole = (currentUser as any)?.sdpRole;
  const canInviteUsers = userSdpRole === 'sdp_super_admin' || userSdpRole === 'sdp_admin';

  usePageHeader(
    isBusinessUsersView ? "Business Users" : "User Management",
    isBusinessUsersView ? 
      `Business users, contractors, and agencies${countryFilter ? ` in ${countries.find((c: any) => c.id === countryFilter)?.name || countryFilter}` : ''}` :
      "Manage SDP admin users, their roles, and access permissions"
  );

  // Access control check
  if (!userSdpRole) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: You need an SDP role to access user management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error handling for API failures
  if (usersError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load user data. Please check your permissions and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (usersLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-user-management">
            {isBusinessUsersView ? "Business Users" : "User Management"}
          </h1>
              <p className="text-gray-600 mt-1">
                {isBusinessUsersView ? 
                  `Business users, contractors, and agencies${countryFilter ? ` in ${countries.find((c: any) => c.id === countryFilter)?.name || countryFilter}` : ''}` :
                  "Manage SDP admin users, their roles, and access permissions"}
              </p>
              {isBusinessUsersView && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.history.back()}
                    data-testid="button-back-to-analytics"
                  >
                    ← Back to Analytics
                  </Button>
                </div>
              )}
            </div>
        
        {canInviteUsers && !isBusinessUsersView && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-user">
                <i className="fas fa-user-plus mr-2"></i>
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New SDP User</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new SDP admin user to the platform.
                </DialogDescription>
              </DialogHeader>
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                  <FormField
                    control={inviteForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="user@example.com" 
                            data-testid="input-invite-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={inviteForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John" 
                              data-testid="input-invite-firstName"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={inviteForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Smith" 
                              data-testid="input-invite-lastName"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={inviteForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel"
                            placeholder="+1 234 567 8900" 
                            data-testid="input-invite-phoneNumber"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={inviteForm.control}
                    name="sdpRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invite-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sdp_agent">Agent</SelectItem>
                            {userSdpRole === 'sdp_super_admin' && (
                              <SelectItem value="sdp_admin">Admin</SelectItem>
                            )}
                            {userSdpRole === 'sdp_super_admin' && (
                              <SelectItem value="sdp_super_admin">Super Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={inviteForm.control}
                    name="accessibleCountries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accessible Countries (Optional)</FormLabel>
                        <FormControl>
                          <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-2">
                            {countries.map((country: any) => (
                              <div key={country.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`country-${country.id}`}
                                  checked={field.value?.includes(country.id)}
                                  onChange={(e) => {
                                    const value = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...value, country.id]);
                                    } else {
                                      field.onChange(value.filter((id: string) => id !== country.id));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                  data-testid={`checkbox-country-${country.id}`}
                                />
                                <label htmlFor={`country-${country.id}`} className="text-sm cursor-pointer">
                                  {country.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <p className="text-xs text-gray-500 mt-1">Leave empty to grant access to all countries</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {businesses && Array.isArray(businesses) && businesses.length > 0 && (
                    <FormField
                      control={inviteForm.control}
                      name="accessibleBusinessIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accessible Businesses (Optional)</FormLabel>
                          <FormControl>
                            <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-2">
                              {businesses.map((business: any) => (
                                <div key={business.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`business-${business.id}`}
                                    checked={field.value?.includes(business.id)}
                                    onChange={(e) => {
                                      const value = field.value || [];
                                      if (e.target.checked) {
                                        field.onChange([...value, business.id]);
                                      } else {
                                        field.onChange(value.filter((id: string) => id !== business.id));
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                    data-testid={`checkbox-business-${business.id}`}
                                  />
                                  <label htmlFor={`business-${business.id}`} className="text-sm cursor-pointer">
                                    {business.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500 mt-1">Leave empty to grant access to all businesses</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setInviteDialogOpen(false)}
                      data-testid="button-cancel-invite"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={inviteUserMutation.isPending}
                      data-testid="button-send-invite"
                    >
                      {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isBusinessUsersView ? 
              `Business Users${countryFilter ? ` in ${countries?.find(c => c.id === countryFilter)?.name || countryFilter}` : ''}` :
              "SDP Admin Users"}
          </CardTitle>
          <CardDescription>
            {isBusinessUsersView ?
              "View all business users, contractors, and agencies registered on the platform" :
              "View and manage all SDP admin users in the system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(users) && users.length > 0 ? (
              users.map((user: any) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  data-testid={`user-card-${user.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900" data-testid={`text-user-name-${user.id}`}>
                        {user.isPending ? 
                          user.email : 
                          (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || user.email)}
                      </h3>
                      {!user.isPending && (
                        <p className="text-sm text-gray-600" data-testid={`text-user-email-${user.id}`}>
                          {user.email}
                        </p>
                      )}
                      {user.isPending && (
                        <p className="text-sm text-amber-600" data-testid={`text-pending-invite-${user.id}`}>
                          Pending Invitation
                        </p>
                      )}
                      {isBusinessUsersView ? (
                        <>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.userType === 'business_user' ? 'Business User' : 
                               user.userType === 'worker' ? 'Worker' :
                               user.userType === 'third_party_business' ? 'Third Party' : user.userType}
                            </span>
                          </div>
                          {user.country && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>Country: {user.country.name}</span>
                            </div>
                          )}
                          {user.business && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Building2 className="h-3 w-3" />
                              <span>Business: {user.business.name}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {user.accessibleCountries && user.accessibleCountries.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>Countries: {getCountryNames(user.accessibleCountries).join(', ')}</span>
                            </div>
                          )}
                          {user.accessibleBusinessIds && user.accessibleBusinessIds.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Building2 className="h-3 w-3" />
                              <span>Businesses: {getBusinessNames(user.accessibleBusinessIds).join(', ')}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {!isBusinessUsersView ? (
                      <>
                        <Badge 
                          variant={getRoleBadgeVariant(user.sdpRole)}
                          data-testid={`badge-user-role-${user.id}`}
                        >
                          {getRoleDisplayName(user.sdpRole)}
                        </Badge>
                        
                        <Badge 
                          variant={user.isPending ? "outline" : (user.isActive ? "default" : "secondary")}
                          className={user.isPending ? "border-amber-500 text-amber-700 bg-amber-50" : ""}
                          data-testid={`badge-user-status-${user.id}`}
                        >
                          {user.isPending ? "Pending" : (user.isActive ? "Active" : "Inactive")}
                        </Badge>
                        
                        {canInviteUsers && user.isPending && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resendInviteMutation.mutate(user.id)}
                            disabled={resendInviteMutation.isPending}
                            data-testid={`button-resend-invite-${user.id}`}
                          >
                            {resendInviteMutation.isPending ? "Sending..." : "Resend Invitation"}
                          </Button>
                        )}
                        
                        {canInviteUsers && !user.isPending && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <i className="fas fa-edit mr-2"></i>
                            Edit
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" data-testid={`badge-join-date-${user.id}`}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8" data-testid="text-no-users">
                <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-600">
                  {isBusinessUsersView ? 
                    `No business users found${countryFilter ? ` in ${countries?.find(c => c.id === countryFilter)?.name || countryFilter}` : ''}` :
                    "No SDP users found"}
                </p>
                {canInviteUsers && !isBusinessUsersView && (
                  <p className="text-sm text-gray-500 mt-2">
                    Click "Invite User" to add the first admin user
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user status and access permissions for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-6">
              <FormField
                control={updateForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <p className="text-sm text-gray-600">
                        Allow this user to access the platform
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-user-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="accessibleCountries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accessible Countries</FormLabel>
                    <FormControl>
                      <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                        {countriesLoading ? (
                          <p className="text-sm text-gray-500">Loading countries...</p>
                        ) : countries && Array.isArray(countries) && countries.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 mb-2">
                              <Checkbox
                                id="all-countries"
                                checked={!field.value || field.value.length === 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([]);
                                  }
                                }}
                                data-testid="checkbox-all-countries"
                              />
                              <label htmlFor="all-countries" className="text-sm font-medium cursor-pointer">
                                All Countries (Default)
                              </label>
                            </div>
                            {countries.map((country: any) => (
                              <div key={country.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`country-${country.id}`}
                                  checked={field.value?.includes(country.id) || false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, country.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== country.id));
                                    }
                                  }}
                                  data-testid={`checkbox-country-${country.id}`}
                                />
                                <label htmlFor={`country-${country.id}`} className="text-sm cursor-pointer">
                                  {country.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No countries available</p>
                        )}
                      </div>
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Leave empty to grant access to all countries
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="accessibleBusinessIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accessible Businesses</FormLabel>
                    <FormControl>
                      <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                        {businessesLoading ? (
                          <p className="text-sm text-gray-500">Loading businesses...</p>
                        ) : businesses && Array.isArray(businesses) && businesses.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 mb-2">
                              <Checkbox
                                id="all-businesses"
                                checked={!field.value || field.value.length === 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([]);
                                  }
                                }}
                                data-testid="checkbox-all-businesses"
                              />
                              <label htmlFor="all-businesses" className="text-sm font-medium cursor-pointer">
                                All Businesses (Default)
                              </label>
                            </div>
                            {businesses.map((business: any) => (
                              <div key={business.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`business-${business.id}`}
                                  checked={field.value?.includes(business.id) || false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, business.id]);
                                    } else {
                                      field.onChange(current.filter(id => id !== business.id));
                                    }
                                  }}
                                  data-testid={`checkbox-business-${business.id}`}
                                />
                                <label htmlFor={`business-${business.id}`} className="text-sm cursor-pointer">
                                  {business.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No businesses available</p>
                        )}
                      </div>
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Leave empty to grant access to all businesses
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  data-testid="button-save-user"
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}