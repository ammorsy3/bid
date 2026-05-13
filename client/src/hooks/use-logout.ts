import { useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function useLogout() {
  const { logout } = useAuthStore();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  return (redirectTo = "/login") => {
    // 1. Clear app state immediately
    logout();

    // 2. Navigate away immediately — this unmounts the current component
    //    before any async re-renders can cause hook count mismatches
    if (redirectTo.startsWith("http")) {
      window.location.href = redirectTo;
    } else {
      setLocation(redirectTo);
    }

    // 3. Sign out of Clerk in the background (fire-and-forget)
    //    The user is already gone from this page so no re-render issues
    if (HAS_CLERK) {
      signOut().catch(() => {});
    }
  };
}
