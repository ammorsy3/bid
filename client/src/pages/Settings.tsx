import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, User, Building2, Loader2, Linkedin, Phone, Clock, Briefcase } from "lucide-react";
import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TIMEZONES = [
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
  { value: "Asia/Bahrain", label: "Bahrain (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
];

type SettingsTab = "account" | "company";

export default function Settings() {
  const { user, activeCompany, checkAuth } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [timezone, setTimezone] = useState(user?.timezone || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(user?.profilePictureUrl || null);

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
    mutationFn: async (data: { name: string; jobTitle?: string; timezone?: string; linkedinUrl?: string; phoneNumber?: string }) => {
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
    onSuccess: (data) => {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been saved.",
      });
      if (data.url) {
        setProfilePicturePreview(data.url);
      }
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
    onSuccess: (data) => {
      toast({
        title: "Company logo updated",
        description: "Your company logo has been saved.",
      });
      if (data.url) {
        setCompanyLogoPreview(data.url);
      }
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
      uploadProfilePictureMutation.mutate(file);
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
      uploadCompanyLogoMutation.mutate(file);
    }
  };

  const handleSavePersonalInfo = () => {
    const fullName = `${firstName} ${lastName}`.trim();
    updateUserMutation.mutate({ 
      name: fullName,
      jobTitle: jobTitle || undefined,
      timezone: timezone || undefined,
      linkedinUrl: linkedinUrl || undefined,
      phoneNumber: phoneNumber || undefined,
    });
  };

  const handleSaveCompanyInfo = () => {
    updateCompanyMutation.mutate({
      displayName: companyDisplayName,
      bio: companyBio,
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isPersonalSaving = updateUserMutation.isPending || uploadProfilePictureMutation.isPending;
  const isCompanySaving = updateCompanyMutation.isPending || uploadCompanyLogoMutation.isPending;

  const sidebarItems = [
    { id: "account" as const, label: user.name || user.username, icon: null, isUser: true },
    { id: "company" as const, label: activeCompany.name, icon: Building2, isCompany: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground">Account settings</h2>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-close-settings"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <nav className="flex-1 p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                activeTab === item.id 
                  ? 'bg-[#E25E45]/10 text-[#E25E45]' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              data-testid={`sidebar-${item.id}`}
            >
              {item.isUser ? (
                <div className="h-6 w-6 rounded-full bg-[#C96B7E] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {getInitials(user.name || user.username)}
                </div>
              ) : (
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Building2 className="h-3 w-3" />
                </div>
              )}
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl p-8">
          {activeTab === "account" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Account settings</h1>
                <p className="text-muted-foreground mt-1">Personal information</p>
              </div>

              {/* Profile Picture */}
              <Card>
                <CardContent className="pt-6">
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
                      {uploadProfilePictureMutation.isPending && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
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
                        disabled={uploadProfilePictureMutation.isPending}
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
                </CardContent>
              </Card>

              {/* Personal Info Form */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
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
                      <Label htmlFor="lastName">Last name</Label>
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
                    <Label htmlFor="email">Log in email</Label>
                    <p className="text-xs text-muted-foreground">
                      Your account email for connection, information & notifications
                    </p>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job title</Label>
                    <p className="text-xs text-muted-foreground">
                      Your job title, can be shared with vendors and partners.
                    </p>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. CEO, Sales, Product designer, etc."
                      data-testid="input-job-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone number</Label>
                    <p className="text-xs text-muted-foreground">
                      Your contact number for business communications.
                    </p>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +966 50 123 4567"
                      data-testid="input-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <p className="text-xs text-muted-foreground">
                      Your LinkedIn profile URL for networking.
                    </p>
                    <Input
                      id="linkedinUrl"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="e.g. https://linkedin.com/in/yourprofile"
                      data-testid="input-linkedin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <p className="text-xs text-muted-foreground">
                      Your timezone, can be used for scheduling meetings.
                    </p>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue placeholder="Choose your timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold">Team settings</h1>
                <p className="text-muted-foreground mt-1">{activeCompany.name}</p>
              </div>

              {/* Company Logo */}
              <Card>
                <CardContent className="pt-6">
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
                      {uploadCompanyLogoMutation.isPending && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
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
                        disabled={uploadCompanyLogoMutation.isPending}
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
                </CardContent>
              </Card>

              {/* Company Info Form */}
              <Card>
                <CardContent className="pt-6 space-y-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
