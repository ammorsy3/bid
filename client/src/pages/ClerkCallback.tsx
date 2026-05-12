import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { BidLogo } from "@/components/brand/BidLogo";
import { Loader2 } from "lucide-react";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ClerkCallbackInner() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { handleRedirectCallback } = useClerk();
  const { toast } = useToast();
  const exchangedRef = useRef(false);
  const [status, setStatus] = useState("Completing sign-in…");

  // Process Clerk's OAuth redirect on mount
  useEffect(() => {
    if (!isLoaded) return;
    handleRedirectCallback({
      redirectUrl: "/auth/clerk-callback",
      afterSignInUrl: "/auth/clerk-callback",
      afterSignUpUrl: "/auth/clerk-callback",
    }).catch((err: any) => {
      console.warn("[Clerk] handleRedirectCallback:", err);
    });
  }, [isLoaded, handleRedirectCallback]);

  // Fallback: if Clerk loads but never reports a signed-in user, bail out
  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => {
      if (!isSignedIn && !exchangedRef.current) {
        toast({
          title: "Sign-in did not complete",
          description: "Please try again.",
          variant: "destructive",
        });
        setLocation("/login");
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, setLocation, toast]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || exchangedRef.current) return;
    exchangedRef.current = true;
    (async () => {
      try {
        setStatus("Linking your account…");
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error("No Clerk session token");

        const res = await fetch("/api/auth/clerk-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: clerkToken }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to sign in");
        }
        const data = await res.json();

        // 1. Set the API token (used for Authorization headers)
        localStorage.setItem("token", data.token);

        // 2. Manually pre-write the zustand persist storage BEFORE navigating.
        //    This guarantees that when /dashboard loads after the hard nav,
        //    the auth store hydrates from localStorage with `user` already set,
        //    so Dashboard's `if (!user) setLocation("/login")` guard never fires.
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

        // 3. Also update the in-memory store (no-op for the soon-to-be-discarded
        //    page, but keeps things consistent if something subscribes before nav).
        useAuthStore.getState().loginWithClerk({
          user: data.user,
          token: data.token,
          activeCompany: data.activeCompany || null,
          companies: data.companies || [],
        });

        toast({ title: "Signed in", description: `Welcome, ${data.user.name}!` });

        // 4. Hard navigation — full reload picks up the pre-written persist state.
        const dest = data.activeCompany ? "/dashboard" : "/onboarding";
        window.location.assign(dest);
      } catch (err: any) {
        console.error("[Clerk] Exchange failed:", err);
        // Clear any stale auth state so /login doesn't auto-redirect to dashboard
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
        useAuthStore.setState({
          user: null,
          token: null,
          activeCompany: null,
          companies: [],
          isLoading: false,
        });
        toast({
          title: "Sign-in failed",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
        setLocation("/login");
      }
    })();
  }, [isLoaded, isSignedIn, getToken, setLocation, toast]);

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center px-4">
      <BidLogo size={48} className="mb-6" />
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{status}</span>
      </div>
    </div>
  );
}

export default function ClerkCallback() {
  const [, setLocation] = useLocation();

  // Guard: if Clerk isn't configured, don't try to use Clerk hooks (would throw)
  useEffect(() => {
    if (!HAS_CLERK) setLocation("/login");
  }, [setLocation]);

  if (!HAS_CLERK) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <ClerkCallbackInner />;
}
