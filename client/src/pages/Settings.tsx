import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, User, Building2, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { user, activeCompany, checkAuth } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);

  const [companyDisplayName, setCompanyDisplayName] = useState(activeCompany?.profile?.displayName || activeCompany?.name || '');
  const [companyBio, setCompanyBio] = useState(activeCompany?.profile?.bio || '');
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(activeCompany?.profile?.logoUrl || null);

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!activeCompany) {
    setLocation("/company-onboarding");
    return null;
  }

  const updateUserMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your personal information has been saved.",
      });
      checkAuth();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string }) => {
      return apiRequest('PATCH', '/api/company/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Company updated",
        description: "Your company information has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      checkAuth();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update company",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been saved.",
      });
      checkAuth();
      setProfilePicture(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload picture",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const uploadCompanyLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/company/logo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload company logo');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Company logo updated",
        description: "Your company logo has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      checkAuth();
      setCompanyLogo(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload logo",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompanyLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePersonalInfo = () => {
    const fullName = `${firstName} ${lastName}`.trim();
    updateUserMutation.mutate({ name: fullName });
    
    if (profilePicture) {
      uploadProfilePictureMutation.mutate(profilePicture);
    }
  };

  const handleSaveCompanyInfo = () => {
    updateCompanyMutation.mutate({
      displayName: companyDisplayName,
      bio: companyBio,
    });

    if (companyLogo) {
      uploadCompanyLogoMutation.mutate(companyLogo);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isPersonalSaving = updateUserMutation.isPending || uploadProfilePictureMutation.isPending;
  const isCompanySaving = updateCompanyMutation.isPending || uploadCompanyLogoMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/dashboard')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="personal" className="flex items-center gap-2" data-testid="tab-personal">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2" data-testid="tab-company">
              <Building2 className="h-4 w-4" />
              Company Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profilePicturePreview ? (
                      <img 
                        src={profilePicturePreview} 
                        alt="Profile" 
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-[#C96B7E] flex items-center justify-center text-white text-2xl font-medium">
                        {getInitials(user.name || user.username)}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                      data-testid="input-profile-picture"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-picture"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload a picture
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max 5MB.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <p className="text-xs text-muted-foreground">
                      The name others in your team will see you as.
                    </p>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <p className="text-xs text-muted-foreground">
                      The name others in your team will see you as.
                    </p>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Your account email for login and notifications.
                  </p>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                    data-testid="input-email"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSavePersonalInfo}
                    disabled={isPersonalSaving}
                    data-testid="button-save-personal"
                  >
                    {isPersonalSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Update your company's public profile and details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {companyLogoPreview ? (
                      <img 
                        src={companyLogoPreview} 
                        alt="Company Logo" 
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-2xl font-medium border">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCompanyLogoChange}
                      data-testid="input-company-logo"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => companyLogoInputRef.current?.click()}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload company logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max 5MB. Square format recommended.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDisplayName">Display Name</Label>
                  <p className="text-xs text-muted-foreground">
                    The public name that vendors and partners will see.
                  </p>
                  <Input
                    id="companyDisplayName"
                    value={companyDisplayName}
                    onChange={(e) => setCompanyDisplayName(e.target.value)}
                    placeholder="Enter company display name"
                    data-testid="input-company-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyBio">Company Bio</Label>
                  <p className="text-xs text-muted-foreground">
                    A brief description of your company.
                  </p>
                  <Textarea
                    id="companyBio"
                    value={companyBio}
                    onChange={(e) => setCompanyBio(e.target.value)}
                    placeholder="Tell us about your company..."
                    rows={4}
                    data-testid="input-company-bio"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company Slug</Label>
                  <p className="text-xs text-muted-foreground">
                    Your company's unique identifier for URLs.
                  </p>
                  <Input
                    value={activeCompany.slug || ''}
                    disabled
                    className="bg-muted"
                    data-testid="input-company-slug"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveCompanyInfo}
                    disabled={isCompanySaving}
                    data-testid="button-save-company"
                  >
                    {isCompanySaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
