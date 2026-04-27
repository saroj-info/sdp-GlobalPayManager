import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Upload, Save, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePageHeader } from "@/contexts/AuthenticatedLayoutContext";
import sampleUserPhoto from "@assets/generated_images/Professional_business_headshot_8ca64f96.png";

export default function Settings() {
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    jobTitle: "",
    company: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
    country: ""
  });
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  usePageHeader("Settings", "Manage your account and profile information");

  const { data: user } = useQuery({
    queryKey: ["/api/profile"],
    retry: false,
  });

  useEffect(() => {
    if (user) {
      const userData = user as any;
      setProfileForm({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        phoneNumber: userData.phoneNumber || "",
        jobTitle: userData.jobTitle || "",
        company: userData.company || "",
        address: userData.address || "",
        city: userData.city || "",
        state: userData.state || "",
        postcode: userData.postcode || "",
        country: userData.country || ""
      });
    }
  }, [user]);

  const getProfilePictureUrl = () => {
    if (user && (user as any).profileImageUrl) {
      return (user as any).profileImageUrl;
    }
    return sampleUserPhoto;
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.refetchQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFormChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPicture(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await apiRequest("POST", "/api/profile/upload-picture", {
        imageData: base64Data
      });
      
      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Profile Picture Updated",
          description: "Your profile picture has been successfully updated.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        queryClient.refetchQueries({ queryKey: ["/api/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      } else {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPicture(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    const userData = user as any;
    
    if (userData.userType === 'sdp_internal') {
      switch (userData.sdpRole) {
        case 'sdp_super_admin':
          return "Super Admin";
        case 'sdp_admin':
          return "Admin";
        case 'sdp_agent':
          return "Agent";
        default:
          return userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : "SDP Internal";
      }
    } else if (userData.userType === 'worker') {
      return `${userData.firstName} ${userData.lastName}`;
    } else {
      return userData.firstName ? `${userData.firstName} ${userData.lastName}` : "Business User";
    }
  };

  const getUserRole = () => {
    if (!user) return "";
    const userData = user as any;
    
    if (userData.userType === 'sdp_internal') {
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
    } else if (userData.userType === 'worker') {
      return 'Worker';
    } else {
      return 'Business User';
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Picture
            </CardTitle>
            <CardDescription>
              Update your profile picture that appears throughout the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-200 shadow-lg">
                <img 
                  src={getProfilePictureUrl()} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{getUserDisplayName()}</h3>
                <p className="text-sm text-secondary-600">{getUserRole()}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  style={{ display: 'none' }}
                  id="profile-picture-input"
                  data-testid="input-profile-picture"
                />
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2" 
                  data-testid="button-upload-picture"
                  onClick={() => document.getElementById('profile-picture-input')?.click()}
                  disabled={isUploadingPicture}
                >
                  <Upload className="h-4 w-4" />
                  {isUploadingPicture ? 'Uploading...' : 'Change Picture'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-secondary-500">
              Recommended: Square image, at least 200x200 pixels. Max file size: 2MB.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your basic profile information and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) => handleFormChange('firstName', e.target.value)}
                  placeholder="Enter your first name"
                  data-testid="input-firstName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) => handleFormChange('lastName', e.target.value)}
                  placeholder="Enter your last name"
                  data-testid="input-lastName"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="Enter your email address"
                data-testid="input-email"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={profileForm.jobTitle}
                  onChange={(e) => handleFormChange('jobTitle', e.target.value)}
                  placeholder="Enter your job title"
                  data-testid="input-jobTitle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={profileForm.company}
                  onChange={(e) => handleFormChange('company', e.target.value)}
                  placeholder="Enter your company name"
                  data-testid="input-company"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Manage your contact details and address information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={profileForm.phoneNumber}
                onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
                placeholder="+1 (555) 123-4567"
                data-testid="input-phoneNumber"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Street Address
              </Label>
              <Textarea
                id="address"
                value={profileForm.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                placeholder="Enter your street address"
                rows={3}
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profileForm.city}
                  onChange={(e) => handleFormChange('city', e.target.value)}
                  placeholder="City"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={profileForm.state}
                  onChange={(e) => handleFormChange('state', e.target.value)}
                  placeholder="State/Province"
                  data-testid="input-state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postal Code</Label>
                <Input
                  id="postcode"
                  value={profileForm.postcode}
                  onChange={(e) => handleFormChange('postcode', e.target.value)}
                  placeholder="Postal Code"
                  data-testid="input-postcode"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profileForm.country}
                onChange={(e) => handleFormChange('country', e.target.value)}
                placeholder="Country"
                data-testid="input-country"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-save-profile"
          >
            <Save className="h-4 w-4" />
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

      </div>
    </div>
  );
}