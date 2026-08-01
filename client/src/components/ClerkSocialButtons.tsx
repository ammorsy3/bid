import { useSignIn, useSignUp, useAuth, useClerk } from "@clerk/clerk-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { HAS_CLERK } from "@/lib/clerkConfig";
import { SiGoogle, SiLinkedin, SiSlack } from "react-icons/si";
import { useI18n } from "@/lib/i18n";

type Provider = "oauth_google" | "oauth_linkedin_oidc" | "oauth_slack";

interface ClerkSocialButtonsProps {
  mode?: "signin" | "signup";
  redirectPath?: string;
}

/**
 * When no Clerk key is configured, main.tsx renders the app *without* a
 * ClerkProvider — social sign-in is meant to degrade to nothing. This guard has
 * to sit outside the component that calls Clerk's hooks: hooks run before any
 * early return inside a component, so a `if (!HAS_CLERK) return null` placed
 * after them still executes useSignIn(), which throws "can only be used within
 * <ClerkProvider>" and takes the whole page down with a blank screen.
 *
 * That is exactly what happened on the first Vercel deploy, where the key was
 * not yet set: /login and /signup rendered white instead of simply hiding the
 * social buttons.
 */
export function ClerkSocialButtons(props: ClerkSocialButtonsProps) {
  if (!HAS_CLERK) return null;
  return <ClerkSocialButtonsInner {...props} />;
}

function ClerkSocialButtonsInner({ mode = "signin", redirectPath = "/auth/clerk-callback" }: ClerkSocialButtonsProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState<Provider | null>(null);

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
        title: mode === "signup" ? t('auth.socialSignUpFailed') : t('auth.socialSignInFailed'),
        description: err?.errors?.[0]?.longMessage || err?.message || t('auth.tryAgain'),
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const labels: Record<Provider, string> = {
    oauth_google: t('auth.continueWithGoogle'),
    oauth_linkedin_oidc: t('auth.continueWithLinkedIn'),
    oauth_slack: t('auth.continueWithSlack'),
  };

  const busyLabels: Record<Provider, string> = {
    oauth_google: t('auth.connecting'),
    oauth_linkedin_oidc: t('auth.connecting'),
    oauth_slack: t('auth.connecting'),
  };

  return (
    <div className="space-y-3">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
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
