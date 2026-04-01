import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, UserPlus, Shield, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  companyName: string;
  companyId: string;
  inviterName: string;
  expiresAt: string;
}

export default function TeamInvite() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, activeCompany, companies, checkAuth } = useAuthStore();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/team-invitations/${token}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.message || "Invalid invitation");
          return;
        }
        const data = await response.json();
        setInvitation(data);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to login with return URL
      localStorage.setItem('postOnboardingRedirect', `/team-invite/${token}`);
      setLocation(`/login?redirect=${encodeURIComponent(`/team-invite/${token}`)}`);
      return;
    }

    // If user has an existing company, show confirmation
    if (activeCompany && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    await acceptInvitation();
  };

  const acceptInvitation = async () => {
    setAccepting(true);
    setShowConfirm(false);
    try {
      const response = await apiRequest('POST', `/api/team-invitations/${token}/accept`, {});
      const data = await response.json();

      // Update auth store with new token and company
      const authStore = useAuthStore.getState();
      localStorage.setItem('token', data.token);
      await authStore.checkAuth();

      toast({
        title: "Invitation accepted",
        description: `You have joined ${invitation?.companyName}.`,
      });

      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Failed to accept invitation",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      member: "Member",
      viewer: "Viewer",
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="mx-auto w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Invalid Invitation</h2>
              <p className="text-neutral-500 mb-6">{error}</p>
              <Link href="/login">
                <Button variant="outline">Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">You've been invited!</h1>
          <p className="text-neutral-500">
            <span className="font-medium text-neutral-700">{invitation.inviterName}</span> invited you to join their team
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Company details */}
            <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Company</p>
                  <p className="font-semibold text-neutral-900">{invitation.companyName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Your role</p>
                  <p className="font-semibold text-neutral-900">{roleLabel(invitation.role)}</p>
                </div>
              </div>
            </div>

            {/* Email notice */}
            {user && user.email.toLowerCase() !== invitation.email.toLowerCase() && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  This invitation was sent to <span className="font-medium">{invitation.email}</span>.
                  You are logged in as <span className="font-medium">{user.email}</span>.
                  Please log in with the correct account.
                </p>
              </div>
            )}

            {/* Action buttons */}
            {user ? (
              <Button
                onClick={handleAccept}
                className="w-full"
                size="lg"
                disabled={accepting || user.email.toLowerCase() !== invitation.email.toLowerCase()}
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-neutral-500">
                  Sign in or create an account to accept this invitation
                </p>
                <div className="flex gap-3">
                  <Link href={`/login?redirect=${encodeURIComponent(`/team-invite/${token}`)}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="lg">
                      Sign In
                    </Button>
                  </Link>
                  <Link href={`/signup?redirect=${encodeURIComponent(`/team-invite/${token}`)}`} className="flex-1">
                    <Button className="w-full" size="lg">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation dialog when user already has an active company */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch company?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are currently active in <span className="font-semibold text-neutral-800">{activeCompany?.name}</span>.
              </p>
              <p>
                By accepting this invitation, you will join <span className="font-semibold text-neutral-800">{invitation.companyName}</span> as
                a <span className="font-semibold text-neutral-800">{roleLabel(invitation.role)}</span> and it will become your active company.
              </p>
              <p>
                You can switch between companies at any time from your dashboard.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={acceptInvitation} disabled={accepting}>
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Yes, join company"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
