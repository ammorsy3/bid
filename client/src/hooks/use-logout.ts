import { useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function useLogout() {
  const { logout } = useAuthStore();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  return async (redirectTo = "/login") => {
    logout();
    if (HAS_CLERK) {
      try {
        await signOut();
      } catch {
        // ignore — app session is already cleared
      }
    }
    if (redirectTo.startsWith("http")) {
      window.location.href = redirectTo;
    } else {
      setLocation(redirectTo);
    }
  };
}
