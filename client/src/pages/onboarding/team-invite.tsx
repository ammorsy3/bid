import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, UsersRound, Plus, X, Loader2, Rocket } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";
import { useI18n } from "@/lib/i18n";

interface Invitation {
  email: string;
  role: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamInvite() {
  const [, setLocation] = useLocation();
  const { activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([{ email: "", role: "business_developer" }]);

  const addRow = () => {
    if (invitations.length < 10) {
      setInvitations([...invitations, { email: "", role: "business_developer" }]);
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

  const hasInvalidRow = invitations.some(inv => inv.email.trim() !== '' && !EMAIL_RE.test(inv.email.trim()));

  const handleSendInvites = async () => {
    if (!activeCompany || hasInvalidRow) return;
    const valid = invitations.filter(inv => EMAIL_RE.test(inv.email.trim()));
    if (valid.length === 0) {
      setLocation('/dashboard');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('POST', `/api/companies/${activeCompany.id}/invite-team`, { invitations: valid });
      toast({ title: t('onboardingPanel.invitationsSent'), description: t('onboardingPanel.invitationsSentDesc', { count: valid.length }) });
      setLocation('/dashboard');
    } catch (error: any) {
      toast({ title: t('onboardingPanel.invitationsFailed'), description: error.message || t('onboardingPanel.invitationsFailedDesc'), variant: "destructive" });
      setLocation('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t('onboardingPanel.inviteYourTeam')}</h2>
              <p className="text-sm text-neutral-500">{t('onboardingPanel.teamInviteEmailDesc', { company: activeCompany?.name || '' })}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {invitations.map((inv, index) => {
              const invalid = inv.email.trim() !== '' && !EMAIL_RE.test(inv.email.trim());
              return (
                <div key={index}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="teammate@email.com"
                        value={inv.email}
                        onChange={(e) => updateInvitation(index, 'email', e.target.value)}
                        className={`w-full ${invalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        disabled={loading}
                      />
                    </div>
                    <Select
                      value={inv.role}
                      onValueChange={(value) => updateInvitation(index, 'role', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('onboardingPanel.roleAdminLabel')}</SelectItem>
                        <SelectItem value="business_developer">{t('onboardingPanel.roleBusinessDeveloperLabel')}</SelectItem>
                        <SelectItem value="member">{t('onboardingPanel.roleMemberLabel')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {invitations.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)} disabled={loading}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {invalid && <p className="text-xs text-red-600 mt-1 ms-1">{t('onboardingPanel.invalidTeamEmail')}</p>}
                </div>
              );
            })}
          </div>

          {invitations.length < 10 && (
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={loading} className="mb-6">
              <Plus className="me-2 h-4 w-4" />
              {t('onboardingPanel.addAnotherInvite')}
            </Button>
          )}

          <div className="bg-sky-50 rounded-lg p-4 mb-6 text-xs text-sky-700 space-y-1">
            <p><span className="font-semibold">{t('onboardingPanel.roleAdminLabel')}</span> — {t('onboardingPanel.roleAdminTeamDesc')}</p>
            <p><span className="font-semibold">{t('onboardingPanel.roleBusinessDeveloperLabel')}</span> — {t('onboardingPanel.roleBusinessDeveloperDesc')}</p>
            <p><span className="font-semibold">{t('onboardingPanel.roleMemberLabel')}</span> — {t('onboardingPanel.roleMemberTeamDesc')}</p>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={() => setLocation("/onboarding/team-basics")} disabled={loading}>
              <ArrowLeft className={`me-2 h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
              {t('onboardingPanel.backBtn')}
            </Button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLocation('/dashboard')}
                disabled={loading}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50"
              >
                {t('onboardingPanel.skipForNow')}
              </button>
              <Button
                onClick={handleSendInvites}
                size="lg"
                disabled={loading || hasInvalidRow}
                className="bg-sky-600 hover:bg-sky-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('onboardingPanel.sendingInvites')}
                  </>
                ) : (
                  <>
                    {t('onboardingPanel.sendInvites')}
                    <Rocket className="ms-2 h-4 w-4" />
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
