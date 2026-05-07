import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useDebouncedSave } from "@/lib/autosave";
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

function saveDraft(data: Record<string, any>) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isInvalidEmailRow = (email: string) => email.trim() !== '' && !EMAIL_RE.test(email.trim());

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
  const draft = getDraft();
  const initialInvitations = useMemo<Invitation[]>(() => {
    const saved = Array.isArray(draft.invitations) ? draft.invitations : null;
    return saved && saved.length > 0 ? saved : [{ email: "", role: "member" }];
  }, []);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);

  const autosave = useCallback((values: Invitation[]) => {
    saveDraft({ invitations: values });
  }, []);
  useDebouncedSave(invitations, autosave);

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
      // Validate required draft fields before hitting the API
      if (!draft.name || !draft.legalName || !draft.crNumber) {
        throw new Error(t('onboardingSetup.missingRequiredInfo'));
      }

      // Create company from draft data — include profile + documents inline so the
      // company row, profile, and verification-document rows are persisted in a single
      // request (no cross-request gap that could leave files orphaned in object storage).
      const savedDocs: Record<string, string> = draft.documents || {};
      const savedDocNames: Record<string, string> = draft.documentNames || {};
      const documentsPayload = Object.entries(savedDocs).map(([documentType, fileUrl]) => ({
        documentType,
        fileUrl,
        originalName: savedDocNames[documentType] || undefined,
      }));

      const companyData: Record<string, any> = {
        name: draft.name,
        legalName: draft.legalName,
        crNumber: draft.crNumber,
      };
      if (draft.vatNumber) companyData.vatNumber = draft.vatNumber;
      if (draft.city) companyData.city = draft.city;
      if (draft.category) companyData.category = draft.category;
      if (draft.logoUrl) companyData.logoUrl = draft.logoUrl;
      if (draft.bio) companyData.bio = draft.bio;
      if (draft.websiteUrl) companyData.websiteUrl = draft.websiteUrl;
      if (documentsPayload.length > 0) companyData.documents = documentsPayload;

      const companyResponse = await apiRequest('POST', '/api/companies', companyData);
      if (!companyResponse.ok) {
        const error = await companyResponse.json();
        throw new Error(error.message || "Failed to create company");
      }

      const companyResult = await companyResponse.json();

      // Update auth token
      localStorage.setItem('token', companyResult.token);
      await checkAuth();

      // Save user's LinkedIn URL to their profile if provided
      if (draft.linkedinUrl) {
        try {
          await apiRequest('PATCH', '/api/user/profile', {
            name: user?.name || user?.username || 'User',
            linkedinUrl: draft.linkedinUrl,
          });
        } catch (err) {
          console.error('Failed to save LinkedIn URL:', err);
        }
      }

      const failedDocuments: Array<{ documentType: string; error: string }> = companyResult.failedDocuments || [];
      if (failedDocuments.length > 0) {
        toast({
          title: "Some documents didn't save",
          description: `Couldn't save: ${failedDocuments.map(f => f.documentType).join(', ')}. You can re-upload them from settings.`,
          variant: "destructive",
        });
      }

      // Send team invitations if requested
      if (sendInvites) {
        const validInvitations = invitations.filter(inv => EMAIL_RE.test(inv.email.trim()));
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
        title: t('onboardingSetup.setupComplete'),
        description: t('onboardingSetup.workspaceReady'),
      });

      setLocation(getPostOnboardingRedirect());
    } catch (error: any) {
      toast({
        title: t('onboardingSetup.somethingWentWrong'),
        description: error.message || t('onboardingSetup.failedToComplete'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasInvalidRow = invitations.some(inv => isInvalidEmailRow(inv.email));

  const handleSubmitWithInvites = async () => {
    if (hasInvalidRow) return;
    const filledRows = invitations.filter(inv => inv.email.trim());
    await createCompanyAndFinish(filledRows.length > 0);
  };

  const handleSkip = () => createCompanyAndFinish(false);

  if (!user) return null;

  return (
    <OnboardingLayout step={4}>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--state-won)]/5 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--state-won)]" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">{t('onboardingPanel.inviteYourTeam')}</h2>
              <p className="text-sm text-muted-foreground">{t('onboardingPanel.inviteYourTeamDesc')}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {invitations.map((inv, index) => {
              const invalid = isInvalidEmailRow(inv.email);
              return (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="colleague@company.com"
                        value={inv.email}
                        onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                        className={`w-full ${invalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        disabled={loading}
                        aria-invalid={invalid}
                      />
                    </div>
                    <Select
                      value={inv.role}
                      onValueChange={(value) => updateInvitation(index, 'role', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('onboardingPanel.roleAdminLabel')}</SelectItem>
                        <SelectItem value="member">{t('onboardingPanel.roleMemberLabel')}</SelectItem>
                        <SelectItem value="viewer">{t('onboardingPanel.roleViewerLabel')}</SelectItem>
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
                  {invalid && (
                    <p className="text-xs text-red-600 mt-1 ml-1">Enter a valid email address</p>
                  )}
                </div>
              );
            })}
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

          <div className="bg-muted rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('onboardingPanel.rolesExplained')}</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium text-muted-foreground">{t('onboardingPanel.roleAdminExplain')}</span> — {t('onboardingPanel.roleAdminExplainDesc')}</p>
              <p><span className="font-medium text-muted-foreground">{t('onboardingPanel.roleMemberExplain')}</span> — {t('onboardingPanel.roleMemberExplainDesc')}</p>
              <p><span className="font-medium text-muted-foreground">{t('onboardingPanel.roleViewerExplain')}</span> — {t('onboardingPanel.roleViewerExplainDesc')}</p>
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
                className="text-sm text-neutral-400 hover:text-muted-foreground transition-colors disabled:opacity-50"
              >
                Skip, I'll do this later
              </button>
              <Button
                onClick={handleSubmitWithInvites}
                size="lg"
                disabled={loading || hasInvalidRow}
                className="bg-[#FE3C01] hover:bg-[#E83501]"
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
