import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building2, User, Users, ArrowRight, ChevronDown, Loader2, Clock, Mail, KeyRound } from "lucide-react";
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
  const { toast } = useToast();

  const [joinExpanded, setJoinExpanded] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [acknowledgedRequests, setAcknowledgedRequests] = useState<Record<string, true>>({});
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

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
    if (activeCompany) { setLocation("/dashboard"); return; }
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
    enabled: !!user?.otpVerified && !activeCompany,
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

  // Invitations already sent to this user's email (e.g. before they signed up).
  const { data: pendingInvites = [] } = useQuery<PendingInvite[]>({
    queryKey: ["/api/onboarding/pending-invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding/pending-invitations");
      if (!res.ok) throw new Error("Failed to load invitations");
      return res.json();
    },
    enabled: !!user?.otpVerified && !activeCompany,
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
      toast({ title: "You're in!", description: `Joined ${data.activeCompany?.name || "the workspace"}.` });
      setLocation("/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't join",
        description: err.message || "Check the code and try again.",
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
        title: "You're in!",
        description: "Invitation accepted. Welcome to the team.",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      setAcceptingToken(null);
      toast({
        title: "Couldn't accept invitation",
        description: error.message || "Please try again.",
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
      title: "Create a Company",
      description: "Registered business looking to post tenders, manage vendors, and evaluate proposals.",
      onClick: () => setLocation("/onboarding/company-basics"),
      color: "text-[#FE3C01]",
      iconBg: "bg-[#FE3C01]/10",
      activeBorder: "border-[#FE3C01]/40",
      hoverBorder: "hover:border-[#FE3C01]/40",
    },
    {
      key: "join",
      icon: Users,
      title: "Join a Company",
      description: "Your company is already on Bid. Find your company's workspace and request access.",
      onClick: () => setJoinExpanded((v) => !v),
      color: "text-blue-600",
      iconBg: "bg-blue-50",
      activeBorder: "border-blue-300",
      hoverBorder: "hover:border-blue-300",
    },
    {
      key: "individual",
      icon: User,
      title: "Individual",
      description: "Solo professional. Build your profile, showcase your work, and respond to opportunities.",
      onClick: () => setLocation("/onboarding/individual-basics"),
      color: "text-[var(--state-won)]",
      iconBg: "bg-[var(--state-won)]/10",
      activeBorder: "border-[var(--state-won)]/40",
      hoverBorder: "hover:border-[var(--state-won)]/40",
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
                Already a member
              </div>
            ) : isPending ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                Request pending
              </div>
            ) : requestingId === w.id ? null : (
              <Button
                size="sm"
                onClick={() => { setRequestingId(w.id); setRequestMessage(""); }}
                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                data-testid={`button-request-join-${w.slug}`}
              >
                Request to join
              </Button>
            )}
          </div>
          {requestingId === w.id && (
            <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
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
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {requestJoinMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send request"
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
        <h1 className="font-display font-black text-3xl text-foreground mb-2 tracking-[-0.04em]">
          Welcome, {user.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground text-base">How are you joining Bid?</p>
      </div>

      <div className="space-y-3">
        {CHOICES.map(({ key, icon: Icon, title, description, onClick, color, iconBg, activeBorder, hoverBorder }) => {
          const isJoin = key === "join";
          const isActive = isJoin && joinExpanded;

          return (
            <div key={key}>
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

              {/* Inline join expansion */}
              {isJoin && joinExpanded && (
                <div className="mt-2 space-y-5">
                  {/* 1. Invitations already waiting for this user */}
                  {pendingInvites.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground px-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[var(--state-won)] flex-shrink-0" />
                        You've been invited to{" "}
                        <span className="font-semibold text-foreground">
                          {pendingInvites.length} {pendingInvites.length === 1 ? "company" : "companies"}
                        </span>
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
                                    Invited by {inv.inviterName} as {inv.role}
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
                                      Joining…
                                    </>
                                  ) : (
                                    "Accept & join"
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
                        From your email domain{" "}
                        <span className="font-semibold text-foreground">{domainMatch?.domain}</span>
                      </p>
                      {matches.map((w) =>
                        renderRequestCard(
                          w,
                          `${w.memberCount} ${w.memberCount === 1 ? "colleague" : "colleagues"} from your domain`,
                        ),
                      )}
                    </div>
                  )}

                  {/* 3. Join with a code (or invite link) */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground px-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      Have a join code?
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 16))}
                        placeholder="Enter code, e.g. AB12CD34"
                        className="uppercase tracking-widest font-mono"
                        data-testid="input-join-code"
                        onKeyDown={(e) => { if (e.key === "Enter" && joinCode.trim()) joinByCodeMutation.mutate(joinCode); }}
                      />
                      <Button
                        onClick={() => joinCode.trim() && joinByCodeMutation.mutate(joinCode)}
                        disabled={!joinCode.trim() || joinByCodeMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                        data-testid="button-join-code"
                      >
                        {joinByCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground px-1">
                      Ask a company admin for its join code or invite link.
                    </p>
                  </div>

                  {/* Fallback when nothing is waiting for them */}
                  {pendingInvites.length === 0 && !hasMatches && (
                    <div className="text-xs text-muted-foreground text-center px-4">
                      No invitations found for your email — use a join code above, or ask an admin to invite you.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </OnboardingLayout>
  );
}
