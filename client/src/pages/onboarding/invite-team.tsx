import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Users, Plus, X, Loader2, Rocket } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const DRAFT_KEY = "onboarding-draft";

interface Invitation {
  email: string;
  role: string;
}

function getDraft(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

const getPostOnboardingRedirect = () => {
  const redirect = localStorage.getItem('postOnboardingRedirect');
  if (redirect) {
    localStorage.removeItem('postOnboardingRedirect');
    return redirect;
  }
  return '/dashboard';
};

export default function InviteTeam() {
  const [, setLocation] = useLocation();
  const { user, token, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([
    { email: "", role: "member" },
  ]);

  const draft = getDraft();

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    if (!draft.step1Complete) { setLocation("/onboarding/company-basics"); return; }
  }, [user, setLocation]);

  const addRow = () => {
    if (invitations.length < 10) {
      setInvitations([...invitations, { email: "", role: "member" }]);
    }
  };

  const removeRow = (index: number) => {
    setInvitations(invitations.filter((_, i) => i !== index));
  };

  const updateInvitation = (index: number, field: keyof Invitation, value: string) => {
    const updated = [...invitations];
    updated[index] = { ...updated[index], [field]: value };
    setInvitations(updated);
  };

  const createCompanyAndFinish = async (sendInvites: boolean) => {
    setLoading(true);
    try {
      // Create company from draft data
      const companyData = {
        name: draft.name,
        legalName: draft.legalName,
        crNumber: draft.crNumber,
        vatNumber: draft.vatNumber || undefined,
        city: draft.city,
        category: draft.category,
      };

      const companyResponse = await apiRequest('POST', '/api/companies', companyData);
      if (!companyResponse.ok) {
        const error = await companyResponse.json();
        throw new Error(error.message || "Failed to create company");
      }

      const companyResult = await companyResponse.json();

      // Update auth token
      localStorage.setItem('token', companyResult.token);
      await checkAuth();

      // Update company profile if we have profile data
      if (draft.logoUrl || draft.bio || draft.websiteUrl || draft.linkedinUrl) {
        const profileData: Record<string, any> = {
          displayName: draft.name,
        };
        if (draft.bio) profileData.bio = draft.bio;
        if (draft.logoUrl) profileData.logoUrl = draft.logoUrl;
        if (draft.websiteUrl || draft.linkedinUrl) {
          profileData.socialLinks = {};
          if (draft.websiteUrl) profileData.socialLinks.website = draft.websiteUrl;
          if (draft.linkedinUrl) profileData.socialLinks.linkedin = draft.linkedinUrl;
        }

        await apiRequest('PUT', `/api/companies/${companyResult.company.id}/profile`, profileData).catch(err =>
          console.error('Failed to update profile:', err)
        );
      }

      // Send team invitations if requested
      if (sendInvites) {
        const validInvitations = invitations.filter(inv => inv.email.trim() && inv.email.includes('@'));
        if (validInvitations.length > 0) {
          await apiRequest('POST', `/api/companies/${companyResult.company.id}/invite-team`, {
            invitations: validInvitations,
          }).catch(err => console.error('Failed to send invitations:', err));
        }
      }

      // Clear draft
      localStorage.removeItem(DRAFT_KEY);

      // Refresh auth state
      await checkAuth();

      toast({
        title: "Company created!",
        description: "Almost done — upload your verification documents.",
      });

      setLocation('/onboarding/company-documents');
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithInvites = async () => {
    const validInvitations = invitations.filter(inv => inv.email.trim());
    if (validInvitations.length === 0) {
      await createCompanyAndFinish(false);
    } else {
      await createCompanyAndFinish(true);
    }
  };

  const handleSkip = () => createCompanyAndFinish(false);

  if (!user) return null;

  return (
    <OnboardingLayout step={3}>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Invite your team</h2>
              <p className="text-sm text-neutral-500">Add colleagues to your workspace</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {invitations.map((inv, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inv.email}
                  onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                  className="flex-1"
                  disabled={loading}
                />
                <Select
                  value={inv.role}
                  onValueChange={(value) => updateInvitation(index, 'role', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                {invitations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    disabled={loading}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {invitations.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={loading}
              className="mb-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add another
            </Button>
          )}

          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Roles explained</h4>
            <div className="space-y-1 text-xs text-neutral-500">
              <p><span className="font-medium text-neutral-600">Admin</span> — Can manage tenders, vendors, and company settings</p>
              <p><span className="font-medium text-neutral-600">Member</span> — Can view and participate in tenders</p>
              <p><span className="font-medium text-neutral-600">Viewer</span> — Read-only access to tenders and reports</p>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLocation("/onboarding/company-profile")}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
              >
                Skip, I'll do this later
              </button>
              <Button
                onClick={handleSubmitWithInvites}
                size="lg"
                disabled={loading}
                className="bg-[#E25E45] hover:bg-[#d04a32]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Rocket className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
