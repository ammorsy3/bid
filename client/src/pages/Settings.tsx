import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, User, Users, Building2, Loader2, Linkedin, Phone, Clock, Briefcase, Check, Sun, Moon, Monitor, ArrowLeft, UserPlus, Trash2, Mail, Shield, Crown, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type Language } from "@/lib/i18n";
import { usePageTour } from "@/lib/tour";
import { SETTINGS_TOUR_STEPS, getSteps } from "@/lib/tour-steps";

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

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

type ThemeOption = "light" | "dark" | "system";

type SettingsTab = "account" | "company";

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  profilePictureUrl: string | null;
  role: string;
  joinedAt: string;
}

function TeamMembersSection({ companyId, canManage, currentUserId, isRtl }: { companyId: string; canManage: boolean; currentUserId: string; isRtl: boolean }) {
  const { toast } = useToast();

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/companies', companyId, 'members'],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest('PATCH', `/api/companies/${companyId}/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'members'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/companies/${companyId}/members/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'members'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    member: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    viewer: 'bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Team Members
        {!isLoading && <span className="text-sm font-normal text-muted-foreground">({members.length})</span>}
      </h2>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No team members found</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.userId} className={`flex items-center gap-3 p-3 rounded-lg border ${member.userId === currentUserId ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'} ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {member.profilePictureUrl ? (
                    <img src={member.profilePictureUrl} alt={member.name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{member.name}</span>
                      {member.userId === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge className={`${roleColors[member.role] || roleColors.member} capitalize flex-shrink-0`}>
                    {member.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                    {member.role}
                  </Badge>
                  {canManage && member.userId !== currentUserId && member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRtl ? 'start' : 'end'}>
                        {['admin', 'member', 'viewer'].filter(r => r !== member.role).map(role => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => updateRoleMutation.mutate({ userId: member.userId, role })}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make {role.charAt(0).toUpperCase() + role.slice(1)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const { user, activeCompany, checkAuth } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage, isRtl } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  const { overlay: tourOverlay, tourDismissed, retake: retakeTour } = usePageTour({
    tourId: 'settings',
    userId: user?.id ?? '',
    steps: getSteps(SETTINGS_TOUR_STEPS, language),
    isRtl,
    autoStart: !!user,
    autoStartDelay: 900,
  });

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

  // Team invite state
  const [inviteRows, setInviteRows] = useState<{ email: string; role: string }[]>([
    { email: '', role: 'member' },
  ]);
  const [inviteResults, setInviteResults] = useState<{ email: string; status: string }[] | null>(null);

  const [theme, setTheme] = useState<ThemeOption>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as ThemeOption) || "light";
  });
  const [gdprCompliant, setGdprCompliant] = useState(false);

  // Log settings visit for onboarding task tracking
  useEffect(() => {
    const logSettingsVisit = async () => {
      try {
        await apiRequest('POST', '/api/onboarding-tasks/settings-visited');
      } catch (error) {
        // Silently fail - this is just for tracking
      }
    };
    logSettingsVisit();
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add('dark');
    } else if (theme === "light") {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Auto-save personal info with debounce
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const autoSavePersonalInfo = useCallback(() => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    autoSaveTimeout.current = setTimeout(() => {
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        updateUserMutation.mutate({ 
          name: fullName,
          jobTitle: jobTitle || undefined,
          timezone: timezone || undefined,
          linkedinUrl: linkedinUrl || undefined,
          phoneNumber: phoneNumber || undefined,
        });
      }
    }, 1000);
  }, [firstName, lastName, jobTitle, timezone, linkedinUrl, phoneNumber]);

  useEffect(() => {
    autoSavePersonalInfo();
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [firstName, lastName, jobTitle, timezone, linkedinUrl, phoneNumber]);

  const canManageCompany = activeCompany && ['owner', 'admin'].includes(activeCompany.role || '');

  const autoSaveCompanyTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const autoSaveCompanyInfo = useCallback(() => {
    if (!canManageCompany) return;
    if (autoSaveCompanyTimeout.current) {
      clearTimeout(autoSaveCompanyTimeout.current);
    }
    autoSaveCompanyTimeout.current = setTimeout(() => {
      if (companyDisplayName) {
        updateCompanyMutation.mutate({
          displayName: companyDisplayName,
          bio: companyBio,
        });
      }
    }, 1000);
  }, [companyDisplayName, companyBio, canManageCompany]);

  useEffect(() => {
    autoSaveCompanyInfo();
    return () => {
      if (autoSaveCompanyTimeout.current) {
        clearTimeout(autoSaveCompanyTimeout.current);
      }
    };
  }, [companyDisplayName, companyBio]);

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

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

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

  const inviteTeamMutation = useMutation({
    mutationFn: async (invitations: { email: string; role: string }[]) => {
      const response = await apiRequest('POST', `/api/companies/${activeCompany!.id}/invite-team`, { invitations });
      return response.json();
    },
    onSuccess: (data) => {
      setInviteResults(data.results);
      const sentCount = data.results.filter((r: any) => r.status === 'sent').length;
      if (sentCount > 0) {
        toast({
          title: "Invitations sent",
          description: `${sentCount} invitation(s) sent successfully.`,
        });
      }
      // Reset rows after sending
      setInviteRows([{ email: '', role: 'member' }]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendInvites = () => {
    const validInvites = inviteRows.filter(r => r.email.trim() && r.email.includes('@'));
    if (validInvites.length === 0) {
      toast({
        title: "No valid emails",
        description: "Please enter at least one valid email address.",
        variant: "destructive",
      });
      return;
    }
    setInviteResults(null);
    inviteTeamMutation.mutate(validInvites);
  };

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
    <>
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex ${isRtl ? 'flex-row-reverse' : ''}`}>
      {/* Sidebar - Left for LTR, Right for RTL */}
      <div className={`w-64 bg-white dark:bg-gray-800 flex flex-col ${isRtl ? 'border-l' : 'border-r'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground">{t('settings.accountSettings')}</h2>
            <Button 
              className="group relative overflow-hidden h-8"
              onClick={() => setLocation('/dashboard')}
              data-testid="button-close-settings"
            >
              <span className="w-12 translate-x-2 transition-opacity duration-500 group-hover:opacity-0 text-sm">
                Back
              </span>
              <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
                <ArrowLeft
                  className="opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </i>
            </Button>
          </div>
        </div>
        
        <nav className="flex-1 p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isRtl ? 'text-right' : 'text-left'} ${
                activeTab === item.id
                  ? 'bg-[#E25E45]/10 text-[#E25E45]'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              data-testid={`sidebar-${item.id}`}
              data-tour={item.id === 'account' ? 'settings-account-tab' : item.id === 'company' ? 'settings-company-tab' : undefined}
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
                <h1 className="text-2xl font-bold">{t('settings.accountSettings')}</h1>
                <p className="text-muted-foreground mt-1">{t('settings.personalInfo')}</p>
              </div>

              {/* Profile Picture */}
              <Card>
                <CardContent className="pt-6">
                  <div className={`flex items-center gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                    <div className={isRtl ? 'text-right' : ''}>
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
                        <Upload className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('settings.uploadPicture')}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('settings.pictureHelper')}
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
                      <Label htmlFor="firstName">{t('settings.firstName')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.firstNameHelper')}
                      </p>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('settings.lastName')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.lastNameHelper')}
                      </p>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.loginEmail')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.emailHelper')}
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
                    <Label htmlFor="jobTitle">{t('settings.jobTitle')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.jobTitleHelper')}
                    </p>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={t('settings.jobTitlePlaceholder')}
                      data-testid="input-job-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">{t('settings.phoneNumber')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.phoneHelper')}
                    </p>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+966 50 123 4567"
                      data-testid="input-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">{t('settings.linkedinUrl')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.linkedinHelper')}
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
                    <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.timezoneHelper')}
                    </p>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue placeholder={t('settings.chooseTimezone')} />
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

                </CardContent>
              </Card>

              {/* Appearance Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">{t('settings.appearance')}</h2>
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div className={`flex items-start justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={isRtl ? 'text-right' : ''}>
                        <Label>{t('settings.theme')}</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.themeHelper')}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setTheme("light")}
                          className={`relative flex flex-col items-center gap-2 p-1 rounded-lg transition-all ${
                            theme === "light" 
                              ? "ring-2 ring-[#E25E45]" 
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          data-testid="theme-light"
                        >
                          {theme === "light" && (
                            <div className={`absolute -top-1 ${isRtl ? '-left-1' : '-right-1'} bg-green-500 rounded-full p-0.5`}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div className="w-14 h-10 bg-white border-2 border-gray-200 rounded-md flex items-center justify-center text-gray-700 font-semibold">
                            Aa
                          </div>
                          <span className="text-xs text-muted-foreground">{t('settings.light')}</span>
                        </button>
                        <button
                          onClick={() => setTheme("dark")}
                          className={`relative flex flex-col items-center gap-2 p-1 rounded-lg transition-all ${
                            theme === "dark" 
                              ? "ring-2 ring-[#E25E45]" 
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          data-testid="theme-dark"
                        >
                          {theme === "dark" && (
                            <div className={`absolute -top-1 ${isRtl ? '-left-1' : '-right-1'} bg-green-500 rounded-full p-0.5`}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div className="w-14 h-10 bg-gray-800 border-2 border-gray-600 rounded-md flex items-center justify-center text-white font-semibold">
                            Aa
                          </div>
                          <span className="text-xs text-muted-foreground">{t('settings.dark')}</span>
                        </button>
                        <button
                          onClick={() => setTheme("system")}
                          className={`relative flex flex-col items-center gap-2 p-1 rounded-lg transition-all ${
                            theme === "system" 
                              ? "ring-2 ring-[#E25E45]" 
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          data-testid="theme-system"
                        >
                          {theme === "system" && (
                            <div className={`absolute -top-1 ${isRtl ? '-left-1' : '-right-1'} bg-green-500 rounded-full p-0.5`}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div className="w-14 h-10 bg-gradient-to-r from-white to-gray-800 border-2 border-gray-300 rounded-md flex items-center justify-center">
                            <span className="text-gray-700 font-semibold text-xs">Aa</span>
                            <span className="text-white font-semibold text-xs">Aa</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{t('settings.system')}</span>
                        </button>
                      </div>
                    </div>

                    <div className={`flex items-start justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={isRtl ? 'text-right' : ''}>
                        <Label>{t('settings.language')}</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('settings.languageHelper')}
                        </p>
                      </div>
                      <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-40" data-testid="select-language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* GDPR Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">{t('settings.gdpr')}</h2>
                <Card>
                  <CardContent className="pt-6">
                    <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <Checkbox 
                        id="gdpr" 
                        checked={gdprCompliant}
                        onCheckedChange={(checked) => setGdprCompliant(checked as boolean)}
                        data-testid="checkbox-gdpr"
                      />
                      <Label htmlFor="gdpr" className={`text-sm font-normal cursor-pointer leading-relaxed ${isRtl ? 'text-right' : ''}`}>
                        {t('settings.gdprCheckbox')}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold">{t('settings.teamSettings')}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-muted-foreground">{activeCompany.name}</p>
                  {activeCompany.verificationStatus === 'verified' ? (
                    <div 
                      className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center"
                      title={t('dashboard.verified')}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div 
                      className="h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center"
                      title={t('dashboard.verificationPending')}
                    >
                      <Clock className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Company Logo */}
              <Card>
                <CardContent className="pt-6">
                  <div className={`flex items-center gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                    <div className={isRtl ? 'text-right' : ''}>
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
                        disabled={uploadCompanyLogoMutation.isPending || !canManageCompany}
                        data-testid="button-upload-logo"
                      >
                        <Upload className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('settings.companyLogo')}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('settings.companyLogoHelper')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Info Form */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyDisplayName">{t('settings.displayName')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.displayNameHelper')}
                    </p>
                    <Input
                      id="companyDisplayName"
                      value={companyDisplayName}
                      onChange={(e) => setCompanyDisplayName(e.target.value)}
                      disabled={!canManageCompany}
                      data-testid="input-company-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyBio">{t('settings.companyBio')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.companyBioHelper')}
                    </p>
                    <Textarea
                      id="companyBio"
                      value={companyBio}
                      onChange={(e) => setCompanyBio(e.target.value)}
                      placeholder={t('settings.companyBioPlaceholder')}
                      rows={4}
                      disabled={!canManageCompany}
                      data-testid="input-company-bio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('settings.companySlug')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.companySlugHelper')}
                    </p>
                    <Input
                      value={activeCompany.slug || ''}
                      disabled
                      className="bg-muted"
                      data-testid="input-company-slug"
                    />
                  </div>

                </CardContent>
              </Card>

              {/* Team Members */}
              <div data-tour="settings-team-section">
                <TeamMembersSection companyId={activeCompany.id} canManage={!!canManageCompany} currentUserId={user.id} isRtl={isRtl} />
              </div>

              {/* Invite Team Members (owners/admins only) */}
              {canManageCompany && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Team Members
                </h2>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Invite people to join <span className="font-medium text-neutral-700">{activeCompany.name}</span>. They'll receive an email with a link to accept the invitation.
                    </p>

                    {/* Invite rows */}
                    <div className="space-y-3">
                      {inviteRows.map((row, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input
                              type="email"
                              placeholder="colleague@company.com"
                              value={row.email}
                              onChange={(e) => {
                                const updated = [...inviteRows];
                                updated[index].email = e.target.value;
                                setInviteRows(updated);
                              }}
                              data-testid={`input-invite-email-${index}`}
                            />
                          </div>
                          <Select
                            value={row.role}
                            onValueChange={(value) => {
                              const updated = [...inviteRows];
                              updated[index].role = value;
                              setInviteRows(updated);
                            }}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-invite-role-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          {inviteRows.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setInviteRows(inviteRows.filter((_, i) => i !== index))}
                              className="text-muted-foreground hover:text-red-500"
                              data-testid={`button-remove-invite-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add another row */}
                    {inviteRows.length < 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInviteRows([...inviteRows, { email: '', role: 'member' }])}
                        data-testid="button-add-invite-row"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add another
                      </Button>
                    )}

                    {/* Results */}
                    {inviteResults && (
                      <div className="border rounded-lg p-3 space-y-2 bg-neutral-50">
                        {inviteResults.map((result, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {result.status === 'sent' ? (
                              <Mail className="h-4 w-4 text-green-500" />
                            ) : result.status === 'already_member' ? (
                              <Shield className="h-4 w-4 text-blue-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{result.email}</span>
                            <span className="text-muted-foreground">
                              {result.status === 'sent' && '— Invitation sent'}
                              {result.status === 'already_member' && '— Already a member'}
                              {result.status === 'invalid' && '— Invalid'}
                              {result.status === 'email_failed' && '— Email delivery failed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Send button */}
                    <Button
                      onClick={handleSendInvites}
                      disabled={inviteTeamMutation.isPending || inviteRows.every(r => !r.email.trim())}
                      data-testid="button-send-invites"
                    >
                      {inviteTeamMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitations
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    {tourOverlay}
    </>
  );
}
