import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, X, Loader2, Rocket } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

interface Invitation {
  email: string;
  role: "member" | "viewer";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isInvalidEmailRow = (email: string) =>
  email.trim() !== "" && !EMAIL_RE.test(email.trim());

const getPostOnboardingRedirect = () => {
  const redirect = localStorage.getItem("postOnboardingRedirect");
  if (redirect) {
    localStorage.removeItem("postOnboardingRedirect");
    return redirect;
  }
  return "/dashboard";
};

export default function TeamInvite() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([
    { email: "", role: "member" },
  ]);

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    if (!activeCompany) { setLocation("/onboarding/team-basics"); return; }
  }, [user, activeCompany, setLocation]);

  const addRow = () => {
    if (invitations.length < 10) {
      setInvitations([...invitations, { email: "", role: "member" }]);
    }
  };

  const removeRow = (index: number) => {
    setInvitations(invitations.filter((_, i) => i !== index));
  };

  const updateInvitation = (
    index: number,
    field: keyof Invitation,
    value: string
  ) => {
    const updated = [...invitations];
    updated[index] = { ...updated[index], [field]: value as any };
    setInvitations(updated);
  };

  const finish = async (sendInvites: boolean) => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      if (sendInvites) {
        const valid = invitations.filter((inv) =>
          EMAIL_RE.test(inv.email.trim())
        );
        if (valid.length > 0) {
          await apiRequest(
            "POST",
            `/api/companies/${activeCompany.id}/invite-team`,
            { invitations: valid }
          ).catch((err) => console.error("Failed to send invitations:", err));
        }
      }
      toast({
        title: "Team ready!",
        description: sendInvites
          ? "Invites sent. Your teammates will get an email to join."
          : "You can invite teammates anytime from Settings → Members.",
      });
      setLocation(getPostOnboardingRedirect());
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasInvalidRow = invitations.some((inv) => isInvalidEmailRow(inv.email));

  const handleSubmit = async () => {
    if (hasInvalidRow) return;
    const filled = invitations.filter((inv) => inv.email.trim());
    await finish(filled.length > 0);
  };

  if (!user || !activeCompany) return null;

  return (
    <OnboardingLayout>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">
                Invite your team
              </h2>
              <p className="text-sm text-muted-foreground">
                Add teammates to <span className="font-medium">{activeCompany.name}</span>. You can always do this later.
              </p>
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
                        placeholder="teammate@example.com"
                        value={inv.email}
                        onChange={(e) =>
                          updateInvitation(index, "email", e.target.value)
                        }
                        className={`w-full ${invalid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        disabled={loading}
                        aria-invalid={invalid}
                      />
                    </div>
                    <Select
                      value={inv.role}
                      onValueChange={(v) =>
                        updateInvitation(index, "role", v)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Business Dev</SelectItem>
                        <SelectItem value="viewer">Member</SelectItem>
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
                    <p className="text-xs text-red-600 mt-1 ml-1">
                      Enter a valid email address
                    </p>
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
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Team roles
            </h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Business Dev</span>{" "}
                — Can respond to RFPs, manage proposals, and use all team features.
              </p>
              <p>
                <span className="font-medium text-foreground">Member</span>{" "}
                — Read-only access; can view tenders and team activity.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => finish(false)}
              disabled={loading}
              className="text-sm text-neutral-400 hover:text-muted-foreground transition-colors disabled:opacity-50"
            >
              Skip, I'll do this later
            </button>
            <Button
              onClick={handleSubmit}
              size="lg"
              disabled={loading || hasInvalidRow}
              className="bg-[#FE3C01] hover:bg-[#E83501]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up…
                </>
              ) : (
                <>
                  Launch team
                  <Rocket className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
