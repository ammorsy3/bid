import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { BidLogo } from "@/components/brand/BidLogo";
import { Loader2 } from "lucide-react";
import { HAS_CLERK } from "@/lib/clerkConfig";
import { markJustSignedIn } from "@/components/desktop-recommendation-modal";
import { attributionForSignup } from "@/lib/attribution";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

// Translation keys, so the message follows the language even after it shows.
type Failure = { title: string; description: string; noAccount?: boolean };

function ClerkCallbackInner() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const { toast } = useToast();
  const { t } = useI18n();
  const exchangedRef = useRef(false);
  const [status, setStatus] = useState<"ssoCompleting" | "ssoCreatingAccount" | "ssoLinking">("ssoCompleting");
  // Failures are shown on this screen (not as a toast after jumping to
  // /login): on phones the toast covered the login page's header, and it
  // vanished after 5 seconds.
  const [failure, setFailure] = useState<Failure | null>(null);

  const isLoaded = authLoaded && signInLoaded && signUpLoaded;

  // Fallback timeout — if nothing resolves in 12s, show a helpful error
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      if (!isSignedIn && !exchangedRef.current) {
        // Check if this looks like a "no account" case from signIn flow
        const noAccount =
          signIn?.status === "needs_identifier" ||
          (signIn?.firstFactorVerification?.status === "unverified" &&
            signIn?.firstFactorVerification?.error?.code === "external_account_not_found");

        setFailure({
          title: "auth.ssoDidNotComplete",
          description: noAccount ? "auth.ssoNoAccount" : "auth.ssoTryAgain",
          noAccount,
        });
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, signIn]);

  // Handle pending sign-up (new user via OAuth signUp flow)
  useEffect(() => {
    if (!isLoaded || exchangedRef.current) return;
    if (signUp?.status === "missing_requirements" || signUp?.status === "complete") {
      // Sign-up is in progress or complete — wait for isSignedIn to flip
      setStatus("ssoCreatingAccount");
    }
  }, [isLoaded, signUp?.status, exchangedRef]);

  // Once Clerk reports the user is signed in, exchange the token with our backend
  useEffect(() => {
    if (!isLoaded || !isSignedIn || exchangedRef.current) return;
    exchangedRef.current = true;

    (async () => {
      try {
        setStatus("ssoLinking");
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error("No Clerk session token");

        const currentLanguage = localStorage.getItem("language");
        const res = await fetch("/api/auth/clerk-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // attribution credits the influencer whose link first brought this
          // visitor in; the server ignores it for an existing account, so only
          // a genuinely new social sign-up is ever attributed. language works
          // like password sign-in: without it a Google sign-up in Arabic was
          // saved as English and the app switched language right after joining.
          body: JSON.stringify({
            token: clerkToken,
            attribution: attributionForSignup(),
            language: currentLanguage === "ar" || currentLanguage === "en" ? currentLanguage : undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw Object.assign(new Error(data.message || "Failed to sign in"), { status: res.status });
        }
        const data = await res.json();

        // 1. Set the raw API token
        localStorage.setItem("token", data.token);

        // 2. Pre-write zustand persist storage so Dashboard guard doesn't
        //    fire before the store re-hydrates from localStorage
        const persistPayload = {
          state: {
            token: data.token,
            user: data.user,
            activeCompany: data.activeCompany || null,
            companies: data.companies || [],
          },
          version: 0,
        };
        localStorage.setItem("auth-storage", JSON.stringify(persistPayload));

        // 3. Sync in-memory store
        useAuthStore.getState().loginWithClerk({
          user: data.user,
          token: data.token,
          activeCompany: data.activeCompany || null,
          companies: data.companies || [],
        });

        toast({ title: t("auth.ssoSignedIn"), description: t("auth.ssoWelcome", { name: data.user.name }) });

        // 4. Hard navigate — full page reload picks up the pre-written state
        markJustSignedIn();
        const dest = data.activeCompany ? "/dashboard" : "/onboarding";
        window.location.assign(dest);
      } catch (err: any) {
        console.error("[Clerk] Exchange failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
        useAuthStore.setState({
          user: null,
          token: null,
          activeCompany: null,
          companies: [],
          isLoading: false,
        });
        // Known server answers (English) mapped to the user's language.
        const httpStatus: number | undefined = err?.status;
        const message: string = err?.message ?? "";
        setFailure({
          title: "auth.socialSignInFailed",
          description:
            httpStatus === 429 ? "auth.tooManyAttempts"
            : httpStatus === 403 ? "auth.ssoEmailNotVerified"
            : /no email/i.test(message) ? "auth.ssoNoEmail"
            : "auth.ssoTryAgain",
        });
      }
    })();
    // t is left out on purpose: a language change must not re-run the exchange.
  }, [isLoaded, isSignedIn, getToken, toast]);

  if (failure) {
    return (
      <div className="min-h-dvh bg-card flex flex-col items-center justify-center px-4 py-10">
        <BidLogo variant="orange" size={48} className="mb-8" />
        <div role="alert" className="w-full max-w-sm text-center">
          <h1 className="font-display font-black text-2xl text-foreground">{t(failure.title)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(failure.description)}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={failure.noAccount ? "/signup" : "/login"}>
                {failure.noAccount ? t("auth.createAccount") : t("auth.backToLogin")}
              </Link>
            </Button>
            {failure.noAccount && (
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">{t("auth.backToLogin")}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-card flex flex-col items-center justify-center px-4">
      <BidLogo variant="orange" size={48} className="mb-6" />
      <div role="status" className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        <span className="text-sm">{t(`auth.${status}`)}</span>
      </div>
    </div>
  );
}

export default function ClerkCallback() {
  useForceLightMode();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!HAS_CLERK) setLocation("/login");
  }, [setLocation]);

  if (!HAS_CLERK) {
    return (
      <div className="min-h-dvh bg-card flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <ClerkCallbackInner />;
}
