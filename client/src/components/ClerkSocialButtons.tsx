import { useSignIn, useAuth, useClerk } from "@clerk/clerk-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle, SiLinkedin, SiSlack } from "react-icons/si";

type Provider = "oauth_google" | "oauth_linkedin_oidc" | "oauth_slack";

interface ClerkSocialButtonsProps {
  mode?: "signin" | "signup";
  redirectPath?: string;
}

export function ClerkSocialButtons({ redirectPath = "/auth/clerk-callback" }: ClerkSocialButtonsProps) {
  const { signIn, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Provider | null>(null);

  const hasClerk = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!hasClerk) return null;

  const handleOAuth = async (strategy: Provider) => {
    if (!isLoaded || !signIn) return;
    setBusy(strategy);

    const startOAuth = () =>
      signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: redirectPath,
        redirectUrlComplete: redirectPath,
      });

    try {
      // Always sign out of any existing Clerk session first, so the user
      // gets a fresh provider account picker (and can choose a different
      // Google/LinkedIn/Slack account than the one previously used).
      if (isSignedIn) {
        await signOut();
        // signOut() resolves before the session cookie is fully cleared on
        // the Clerk side. Give it a brief moment so the next OAuth call
        // doesn't immediately fail with "session_exists".
        await new Promise((r) => setTimeout(r, 400));
      }

      try {
        await startOAuth();
      } catch (err: any) {
        const code = err?.errors?.[0]?.code;
        // Race fallback: if Clerk still thinks we're signed in, force another
        // signOut, wait a bit longer, and retry once.
        if (code === "session_exists" || /already signed in/i.test(err?.message || "")) {
          await signOut();
          await new Promise((r) => setTimeout(r, 800));
          await startOAuth();
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error("[Clerk] OAuth error:", err);
      toast({
        title: "Sign-in failed",
        description: err?.errors?.[0]?.longMessage || err?.message || "Please try again.",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleOAuth("oauth_google")}
        disabled={!isLoaded || busy !== null}
        data-testid="button-clerk-google"
        className="w-full inline-flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SiGoogle className="h-4 w-4" />
        {busy === "oauth_google" ? "Connecting…" : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("oauth_linkedin_oidc")}
        disabled={!isLoaded || busy !== null}
        data-testid="button-clerk-linkedin"
        className="w-full inline-flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SiLinkedin className="h-4 w-4 text-[#0A66C2]" />
        {busy === "oauth_linkedin_oidc" ? "Connecting…" : "Continue with LinkedIn"}
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("oauth_slack")}
        disabled={!isLoaded || busy !== null}
        data-testid="button-clerk-slack"
        className="w-full inline-flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SiSlack className="h-4 w-4 text-[#4A154B]" />
        {busy === "oauth_slack" ? "Connecting…" : "Continue with Slack"}
      </button>
    </div>
  );
}
