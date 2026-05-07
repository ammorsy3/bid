import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building2, UserPlus, ArrowRight, Users, KeyRound, CheckCircle2, Loader2, Clock } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

interface DomainMatchWorkspace {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  alreadyRequested: boolean;
}

interface DomainMatchResponse {
  domain: string;
  isPublic: boolean;
  workspaces: DomainMatchWorkspace[];
}

export default function OnboardingChoice() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { t } = useI18n();
  const { toast } = useToast();

  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string>("");
  const [inviteToken, setInviteToken] = useState<string>("");
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [acknowledgedRequests, setAcknowledgedRequests] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!user) {
      setLocation("/signup");
      return;
    }
    if (!user.otpVerified) {
      setLocation("/verify-email");
      return;
    }
    if (activeCompany) {
      setLocation("/dashboard");
      return;
    }
    const redirect = localStorage.getItem('postOnboardingRedirect');
    if (redirect && redirect.startsWith('/invite/')) {
      setLocation(redirect);
      localStorage.removeItem('postOnboardingRedirect');
      return;
    }
  }, [user, activeCompany, setLocation]);

  const { data: domainMatch, refetch: refetchDomainMatch } = useQuery<DomainMatchResponse>({
    queryKey: ['/api/onboarding/domain-match'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/onboarding/domain-match');
      if (!res.ok) throw new Error('Failed to load domain match');
      return res.json();
    },
    enabled: !!user?.otpVerified && !activeCompany,
  });

  const requestJoinMutation = useMutation({
    mutationFn: async ({ companyId, message }: { companyId: string; message?: string }) => {
      const res = await apiRequest('POST', `/api/companies/${companyId}/membership-requests`, { message: message || undefined });
      if (!res.ok) {
        const err = await res.json();
        const error = new Error(err.message || 'Failed to send request');
        (error as any).code = err.code;
        throw error;
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      setAcknowledgedRequests(prev => ({ ...prev, [vars.companyId]: true }));
      setRequestingId(null);
      setRequestMessage("");
      refetchDomainMatch();
      toast({
        title: "Request sent",
        description: "Your join request was sent to the workspace admins. You'll get an email once they decide.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't send request",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvite = () => {
    const token = inviteToken.trim();
    if (!token) return;
    setLocation(`/team-invite/${encodeURIComponent(token)}`);
  };

  if (!user) return null;

  const matches = domainMatch?.workspaces || [];
  const showSuggestions = !domainMatch?.isPublic && matches.length > 0;

  return (
    <OnboardingLayout step={0}>
      <div className="text-center mb-8">
        <h1 className="font-display font-black text-3xl text-foreground mb-2 tracking-[-0.04em]">
          Welcome, {user.name.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground text-lg">
          How would you like to get started?
        </p>
      </div>

      {showSuggestions && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="w-4 h-4 text-[var(--state-won)]" />
            We found teammates from <span className="font-semibold">{domainMatch?.domain}</span> already on Bid
          </div>
          {matches.map(w => {
            const isPending = w.alreadyRequested || acknowledgedRequests[w.id];
            return (
              <Card key={w.id} className="border-emerald-200 bg-[var(--state-won)]/5/30">
                <CardContent className="pt-5 pb-5 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">{w.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {w.memberCount} {w.memberCount === 1 ? 'colleague' : 'colleagues'} from your domain
                      </p>
                    </div>
                    {isPending ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5" />
                        Request pending
                      </div>
                    ) : requestingId === w.id ? null : (
                      <Button
                        size="sm"
                        onClick={() => { setRequestingId(w.id); setRequestMessage(""); }}
                        className="bg-[var(--state-won)] hover:bg-[var(--state-won)]/90 whitespace-nowrap"
                        data-testid={`button-request-join-${w.slug}`}
                      >
                        Request to join
                      </Button>
                    )}
                  </div>
                  {requestingId === w.id && (
                    <div className="mt-3 space-y-2 border-t border-emerald-200 pt-3">
                      <Textarea
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value.slice(0, 500))}
                        placeholder={`Optional: tell the admins of ${w.name} who you are`}
                        rows={2}
                        className="text-sm"
                        disabled={requestJoinMutation.isPending}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRequestingId(null)}
                          disabled={requestJoinMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => requestJoinMutation.mutate({ companyId: w.id, message: requestMessage })}
                          disabled={requestJoinMutation.isPending}
                          className="bg-[var(--state-won)] hover:bg-[var(--state-won)]/90"
                        >
                          {requestJoinMutation.isPending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Sending…
                            </>
                          ) : (
                            'Send request'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Create Company */}
        <Card
          className="cursor-pointer group hover:border-[#FE3C01]/40 hover:shadow-lg transition-all duration-200 border-2 border-transparent"
          onClick={() => setLocation("/onboarding/company-basics")}
        >
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="mx-auto w-14 h-14 bg-[#FE3C01]/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#FE3C01]/15 transition-colors">
              <Building2 className="w-7 h-7 text-[#FE3C01]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {showSuggestions ? 'Create my own workspace instead' : 'Create a new company'}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {showSuggestions
                ? "Start fresh — you can invite teammates later from settings."
                : "Set up your company workspace, add your team, and start managing tenders."}
            </p>
            <div className="flex items-center justify-center text-sm font-medium text-[#FE3C01] group-hover:gap-2 transition-all">
              <span>{t('onboarding.getStarted')}</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>

        {/* I have an invitation code */}
        <Card className="border-2 border-transparent">
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="mx-auto w-14 h-14 bg-[var(--state-won)]/5 rounded-2xl flex items-center justify-center mb-5">
              <KeyRound className="w-7 h-7 text-[var(--state-won)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              I have an invitation code
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Paste the code from your invitation email to join your team's workspace.
            </p>
            {showInviteInput ? (
              <div className="space-y-2 text-left">
                <Input
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Paste your invitation code"
                  className="font-mono text-sm"
                  data-testid="input-invite-token"
                  onKeyDown={(e) => e.key === 'Enter' && handleAcceptInvite()}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowInviteInput(false); setInviteToken(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAcceptInvite}
                    disabled={!inviteToken.trim()}
                    className="bg-[var(--state-won)] hover:bg-[var(--state-won)]/90"
                    data-testid="button-accept-invite-token"
                  >
                    Continue
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowInviteInput(true)}
                className="inline-flex items-center justify-center text-sm font-medium text-[var(--state-won)] hover:text-[var(--state-won)]"
                data-testid="button-show-invite-input"
              >
                <span>Enter code</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </OnboardingLayout>
  );
}
