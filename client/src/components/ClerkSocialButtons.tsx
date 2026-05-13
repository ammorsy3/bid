import { useSignIn, useSignUp, useAuth, useClerk } from "@clerk/clerk-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle, SiLinkedin, SiSlack } from "react-icons/si";

type Provider = "oauth_google" | "oauth_linkedin_oidc" | "oauth_slack";

interface ClerkSocialButtonsProps {
  mode?: "signin" | "signup";
  redirectPath?: string;
}

export function ClerkSocialButtons({ mode = "signin", redirectPath = "/auth/clerk-callback" }: ClerkSocialButtonsProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Provider | null>(null);

  const hasClerk = !!(import.meta.env.PROD
    ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY_PROD
    : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  if (!hasClerk) return null;

  const isLoaded = mode === "signup" ? signUpLoaded : signInLoaded;

  const handleOAuth = async (strategy: Provider) => {
    if (!isLoaded) return;
    if (mode === "signup" && !signUp) return;
    if (mode === "signin" && !signIn) return;
    setBusy(strategy);

    try {
      // Clear any existing Clerk session first so the user gets a fresh
      // OAuth flow and can pick a different account.
      if (isSignedIn) {
        await signOut();
        await new Promise((r) => setTimeout(r, 500));
      }

      const callbackUrl = window.location.origin + redirectPath;

      if (mode === "signup") {
        // New users: use signUp so Clerk creates the account via OAuth
        await signUp!.authenticateWithRedirect({
          strategy,
          redirectUrl: callbackUrl,
          redirectUrlComplete: callbackUrl,
        });
      } else {
        // Existing users: use signIn
        await signIn!.authenticateWithRedirect({
          strategy,
          redirectUrl: callbackUrl,
          redirectUrlComplete: callbackUrl,
        });
      }
    } catch (err: any) {
      console.error("[Clerk] OAuth error:", err);
      toast({
        title: mode === "signup" ? "Sign-up failed" : "Sign-in failed",
        description: err?.errors?.[0]?.longMessage || err?.message || "Please try again.",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const labels: Record<Provider, string> = {
    oauth_google: "Continue with Google",
    oauth_linkedin_oidc: "Continue with LinkedIn",
    oauth_slack: "Continue with Slack",
  };

  const busyLabels: Record<Provider, string> = {
    oauth_google: "Connecting…",
    oauth_linkedin_oidc: "Connecting…",
    oauth_slack: "Connecting…",
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
        {busy === "oauth_google" ? busyLabels["oauth_google"] : labels["oauth_google"]}
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("oauth_linkedin_oidc")}
        disabled={!isLoaded || busy !== null}
        data-testid="button-clerk-linkedin"
        className="w-full inline-flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SiLinkedin className="h-4 w-4 text-[#0A66C2]" />
        {busy === "oauth_linkedin_oidc" ? busyLabels["oauth_linkedin_oidc"] : labels["oauth_linkedin_oidc"]}
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("oauth_slack")}
        disabled={!isLoaded || busy !== null}
        data-testid="button-clerk-slack"
        className="w-full inline-flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SiSlack className="h-4 w-4 text-[#4A154B]" />
        {busy === "oauth_slack" ? busyLabels["oauth_slack"] : labels["oauth_slack"]}
      </button>
    </div>
  );
}
