import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building2, User, Users, ArrowRight, ArrowLeft, ChevronDown, Loader2, Clock, Mail, KeyRound } from "lucide-react";
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

interface PendingInvite {
  token: string;
  role: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  inviterName: string;
  expiresAt: string;
}

export default function OnboardingChoice() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { t } = useI18n();
  const { toast } = useToast();

  // ?join=1 means the user already chose "Join organization" (from the
  // dashboard account menu). They aren't picking an account type — they're
  // joining an existing workspace — so this page drops the signup framing and
  // the other choices, and shows only the join options, already open.
  const joinOnlyMode = new URLSearchParams(window.location.search).get("join") === "1";
  const [joinExpanded, setJoinExpanded] = useState(joinOnlyMode);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [acknowledgedRequests, setAcknowledgedRequests] = useState<Record<string, true>>({});
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const addAccountMode = new URLSearchParams(window.location.search).get("addAccount") === "1";

  // Prefill a join code arriving from an invite link (/join/:code stashes it).
  useEffect(() => {
    const pending = localStorage.getItem("pendingJoinCode");
    if (pending) {
      setJoinCode(pending);
      setJoinExpanded(true);
      localStorage.removeItem("pendingJoinCode");
    }
  }, []);

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    if (activeCompany && !addAccountMode) { setLocation("/dashboard"); return; }
    const redirect = localStorage.getItem("postOnboardingRedirect");
    if (redirect && redirect.startsWith("/invite/")) {
      setLocation(redirect);
      localStorage.removeItem("postOnboardingRedirect");
    }
  }, [user, activeCompany, setLocation]);

  const { data: domainMatch, refetch: refetchDomainMatch } = useQuery<DomainMatchResponse>({
    queryKey: ["/api/onboarding/domain-match"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding/domain-match");
      if (!res.ok) throw new Error("Failed to load domain match");
      return res.json();
    },
    enabled: !!user?.otpVerified,
  });

  const requestJoinMutation = useMutation({
    mutationFn: async ({ companyId, message }: { companyId: string; message?: string }) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/membership-requests`, {
        message: message || undefined,
      });
      if (!res.ok) {
        const err = await res.json();
        const error = new Error(err.message || "Failed to send request");
        (error as any).code = err.code;
        throw error;
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      setAcknowledgedRequests((prev) => ({ ...prev, [vars.companyId]: true }));
      setRequestingId(null);
      setRequestMessage("");
      refetchDomainMatch();
      toast({
        title: t('onbJoin.requestSent'),
        description: t('onbJoin.requestSentDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('onbJoin.couldntJoin'),
        description: error.message || t('profEditor.tryAgain'),
        variant: "destructive",
      });
    },
  });

  // Invitations already sent to this user's email (e.g. before they signed up).
  const { data: pendingInvites = [] } = useQuery<PendingInvite[]>({
    queryKey: ["/api/onboarding/pending-invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding/pending-invitations");
      if (!res.ok) throw new Error("Failed to load invitations");
      return res.json();
    },
    enabled: !!user?.otpVerified,
  });

  // Join a company/team instantly with its code.
  const joinByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/companies/join-by-code", { code: code.trim() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(body.message || "Failed to join");
        (err as any).code = body.code;
        throw err;
      }
      return body;
    },
    onSuccess: async (data) => {
      if (data?.token) localStorage.setItem("token", data.token);
      await useAuthStore.getState().checkAuth();
      toast({ title: t('onbJoin.joinedTitle'), description: t('onbJoin.joinedDesc', { name: data.activeCompany?.name || "" }) });
      setLocation("/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: t('onbJoin.couldntJoin'),
        description: err.message || t('onbJoin.checkCode'),
        variant: "destructive",
      });
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", `/api/team-invitations/${token}/accept`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      if (data?.token) localStorage.setItem("token", data.token);
      await useAuthStore.getState().checkAuth();
      toast({
        title: t('onbJoin.joinedTitle'),
        description: t('onbJoin.inviteAcceptedDesc'),
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      setAcceptingToken(null);
      toast({
        title: t('onbJoin.couldntJoin'),
        description: error.message || t('profEditor.tryAgain'),
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const matches = domainMatch?.workspaces || [];
  const hasMatches = !domainMatch?.isPublic && matches.length > 0;

  const CHOICES = [
    {
      key: "company",
      icon: Building2,
      title: t('onbJoin.createCompany'),
      description: t('onbJoin.createCompanyDesc'),
      onClick: () => setLocation("/onboarding/company-basics?addAccount=1"),
      color: "text-[#FE3C01]",
      iconBg: "bg-[#FE3C01]/10",
      activeBorder: "border-[#FE3C01]/40",
      hoverBorder: "hover:border-[#FE3C01]/40",
    },
    {
      key: "join",
      icon: Users,
      title: t('onbJoin.joinCompany'),
      description: t('onbJoin.joinCompanyDesc'),
      onClick: () => setJoinExpanded((v) => !v),
      color: "text-blue-600",
      iconBg: "bg-blue-50",
      activeBorder: "border-blue-300",
      hoverBorder: "hover:border-blue-300",
    },
    {
      key: "individual",
      icon: User,
      title: t('onbJoin.individual'),
      description: t('onbJoin.individualDesc'),
      onClick: () => setLocation("/onboarding/individual-basics"),
      color: "text-[#FE3C01]",
      iconBg: "bg-[#FE3C01]/10",
      activeBorder: "border-[#FE3C01]/40",
      hoverBorder: "hover:border-[#FE3C01]/40",
    },
  ] as const;

  const joinBadgeCount = pendingInvites.length + (hasMatches ? matches.length : 0);

  // Shared card for "request to join" targets (domain matches + search results).
  const renderRequestCard = (
    w: { id: string; name: string; slug: string; memberCount: number; alreadyRequested: boolean; alreadyMember?: boolean },
    subtitle: string,
  ) => {
    const isPending = w.alreadyRequested || acknowledgedRequests[w.id];
    return (
      <Card key={w.id} className="border-blue-200 bg-blue-50/40">
        <CardContent className="pt-4 pb-4 px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">{w.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
            {w.alreadyMember ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--state-won)] whitespace-nowrap">
                {t('onbJoin.alreadyMember')}
              </div>
            ) : isPending ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                {t('onbJoin.requestPending')}
              </div>
            ) : requestingId === w.id ? null : (
              <Button
                size="sm"
                onClick={() => { setRequestingId(w.id); setRequestMessage(""); }}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                data-testid={`button-request-join-${w.slug}`}
              >
                {t('onbJoin.requestToJoin')}
              </Button>
            )}
          </div>
          {requestingId === w.id && (
            <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value.slice(0, 500))}
                placeholder={t('onbJoin.requestPlaceholder', { name: w.name })}
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
                  {t('onbJoin.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => requestJoinMutation.mutate({ companyId: w.id, message: requestMessage })}
                  disabled={requestJoinMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {requestJoinMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      {t('onbJoin.sending')}
                    </>
                  ) : (
                    t('onbJoin.sendRequest')
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <OnboardingLayout>
      <div className="text-center mb-8">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground mb-2 tracking-[-0.04em]">
          {joinOnlyMode
            ? t('settings.joinOrganization')
            : t('onbJoin.welcome', { name: user.name.split(" ")[0] })}
        </h1>
        <p className="text-muted-foreground text-base">
          {joinOnlyMode ? t('onbJoin.joinCompanyDesc') : t('onbJoin.howJoining')}
        </p>
      </div>

      <div className="space-y-3">
        {CHOICES.filter(({ key }) => joinOnlyMode ? key === "join" : (!addAccountMode || key !== "individual")).map(({ key, icon: Icon, title, description, onClick, color, iconBg, activeBorder, hoverBorder }) => {
          const isJoin = key === "join";
          const isActive = isJoin && joinExpanded;

          return (
            <div key={key}>
              {/* In join-only mode the page heading already says this, and the
                  card would collapse the one section on screen — so skip it. */}
              {!joinOnlyMode && (
              <Card
                className={`cursor-pointer group transition-all duration-200 border-2 ${
                  isActive
                    ? `${activeBorder} shadow-md`
                    : `border-transparent ${hoverBorder} hover:shadow-md`
                }`}
                onClick={onClick}
              >
                <CardContent className="pt-5 pb-5 px-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform relative`}>
                      <Icon className={`w-6 h-6 ${color}`} />
                      {isJoin && joinBadgeCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {joinBadgeCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground">{title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
                    </div>
                    {isJoin ? (
                      <ChevronDown
                        className={`w-5 h-5 ${color} opacity-50 transition-transform flex-shrink-0 ${joinExpanded ? "rotate-180" : ""}`}
                      />
                    ) : (
                      <ArrowRight className={`w-5 h-5 ${color} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`} />
                    )}
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Inline join expansion */}
              {isJoin && joinExpanded && (
                <div className="mt-2 space-y-5">
                  {/* 1. Invitations already waiting for this user */}
                  {pendingInvites.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground px-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[var(--state-won)] flex-shrink-0" />
                        {pendingInvites.length === 1
                          ? t('onbJoin.invitedHeading', { count: pendingInvites.length })
                          : t('onbJoin.invitedHeadingPlural', { count: pendingInvites.length })}
                      </p>
                      {pendingInvites.map((inv) => {
                        const isAccepting = acceptingToken === inv.token && acceptInviteMutation.isPending;
                        return (
                          <Card key={inv.token} className="border-[var(--state-won)]/30 bg-[var(--state-won)]/[0.06]">
                            <CardContent className="pt-4 pb-4 px-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-semibold text-foreground truncate">{inv.companyName}</h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('onbJoin.invitedBy', { inviter: inv.inviterName, role: inv.role })}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => { setAcceptingToken(inv.token); acceptInviteMutation.mutate(inv.token); }}
                                  disabled={acceptInviteMutation.isPending}
                                  className="bg-[var(--state-won)] hover:opacity-90 text-white whitespace-nowrap"
                                  data-testid={`button-accept-invite-${inv.companySlug}`}
                                >
                                  {isAccepting ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                      {t('onbJoin.joining')}
                                    </>
                                  ) : (
                                    t('onbJoin.acceptJoin')
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Companies matching the user's email domain */}
                  {hasMatches && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground px-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        {t('onbJoin.fromDomain')}{" "}
                        <span className="font-semibold text-foreground">{domainMatch?.domain}</span>
                      </p>
                      {matches.map((w) =>
                        renderRequestCard(
                          w,
                          w.memberCount === 1
                            ? t('onbJoin.colleague', { count: w.memberCount })
                            : t('onbJoin.colleagues', { count: w.memberCount }),
                        ),
                      )}
                    </div>
                  )}

                  {/* 3. Join with a code (or invite link) */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground px-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      {t('onbJoin.haveCode')}
                    </p>
                    {/* Stacks on phones: a 16-char widely-tracked code needs the
                        full width, and the button shouldn't squeeze it. */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 16))}
                        placeholder={t('onbJoin.codePlaceholder')}
                        className="uppercase tracking-widest font-mono min-w-0 flex-1"
                        dir="ltr"
                        data-testid="input-join-code"
                        onKeyDown={(e) => { if (e.key === "Enter" && joinCode.trim()) joinByCodeMutation.mutate(joinCode); }}
                      />
                      <Button
                        onClick={() => joinCode.trim() && joinByCodeMutation.mutate(joinCode)}
                        disabled={!joinCode.trim() || joinByCodeMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap w-full sm:w-auto"
                        data-testid="button-join-code"
                      >
                        {joinByCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('onbJoin.join')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground px-1">
                      {t('onbJoin.askAdmin')}
                    </p>
                  </div>

                  {/* Fallback when nothing is waiting for them */}
                  {pendingInvites.length === 0 && !hasMatches && (
                    <div className="text-xs text-muted-foreground text-center px-4">
                      {t('onbJoin.noInvites')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Same placement and styling as the Back button on the other
            onboarding steps. Join-only mode is entered from the dashboard, so
            that's where Back returns; first-run signup has no dashboard yet. */}
        {joinOnlyMode && (
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-join-back"
            >
              <ArrowLeft className="me-2 h-4 w-4" />
              {t('onboardingPanel.backBtn')}
            </Button>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
