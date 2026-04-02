import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import { Building2, Users, ExternalLink, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BusinessUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  isActive: boolean;
  business?: {
    id: string;
    name: string;
    countryId: string;
    ownerId: string;
  } | null;
  country?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface BusinessUsersByCountry {
  country?: {
    id: string;
    name: string;
    code: string;
  } | null;
  users: BusinessUser[];
  businessCount: number;
  activeUserCount: number;
}

export default function BusinessUsersPage() {
  const [, setLocation] = useLocation();
  
  usePageHeader("Business Users Overview", "Business users, contractors, and agencies by country");

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: businessUsersByCountry = [], isLoading: loading, error } = useQuery({
    queryKey: ["/api/business-users-overview"],
    queryFn: async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = localStorage.getItem('authToken');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/business-users-overview', {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(currentUser as any)?.sdpRole,
  });

  if (!(currentUser as any)?.sdpRole) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You need SDP admin permissions to view business users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading business users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Failed to load business users data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsers = businessUsersByCountry.reduce((sum: number, country: BusinessUsersByCountry) => sum + country.activeUserCount, 0);
  const totalBusinesses = businessUsersByCountry.reduce((sum: number, country: BusinessUsersByCountry) => sum + country.businessCount, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-business-users">
              Business Users Overview
            </h1>
          </div>
          <p className="text-gray-600">
            Manage and view all business users, contractors, and agencies registered in the platform
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Businesses</p>
                <p className="text-2xl font-bold text-green-600">{totalBusinesses}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-purple-600">{businessUsersByCountry.length}</p>
              </div>
              <ExternalLink className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {businessUsersByCountry.length > 0 ? (
          businessUsersByCountry.map((countryData: BusinessUsersByCountry) => (
            <Card key={countryData.country?.id || 'unknown'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  {countryData.country?.name || 'Unknown Country'} ({countryData.country?.code || 'N/A'})
                </CardTitle>
                <CardDescription>
                  {countryData.activeUserCount} active users across {countryData.businessCount} businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {countryData.users.length > 0 ? (
                    countryData.users.map((user: BusinessUser) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                            <div className="text-sm font-medium text-blue-600">
                              {user.business?.name || 'No Business Name'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={user.isActive ? "default" : "secondary"}
                            data-testid={`badge-status-${user.id}`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge 
                            variant="outline"
                            data-testid={`badge-type-${user.id}`}
                          >
                            {user.userType === 'business_user' ? 'Business User' : 
                             user.userType === 'worker' ? 'Worker' : 
                             user.userType === 'third_party_business' ? 'Third Party' : user.userType}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLocation(`/user-management?country=${countryData.country?.id || 'unknown'}`)}
                            data-testid={`button-view-details-${user.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No business users found in {countryData.country.name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium">No Business Users Found</p>
                <p className="text-sm">No business users have been registered yet.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}