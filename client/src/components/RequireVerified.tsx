import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";

/**
 * Client-side mirror of the server rule that only a verified company may create
 * tenders. The `/tenders/new` gate handles this, but the individual wizard step
 * routes were reachable by direct URL. Wrapping them here bounces an unverified
 * user back to `/tenders/new`, which renders the proper verification gate — so
 * the client can no longer skip past the server's 403.
 */
export function RequireVerified({ children }: { children: React.ReactNode }) {
  const { user, activeCompany } = useAuthStore();
  const [, setLocation] = useLocation();
  const verified = activeCompany?.verificationStatus === "verified";

  useEffect(() => {
    if (user && !verified) {
      setLocation("/tenders/new");
    }
  }, [user, verified, setLocation]);

  // Don't flash wizard content while the redirect is in flight.
  if (user && !verified) return null;
  return <>{children}</>;
}
