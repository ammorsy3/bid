import { useClerk } from "@clerk/clerk-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { HAS_CLERK } from "@/lib/clerkConfig";

export function useLogout() {
  const { logout } = useAuthStore();
  // Called conditionally, which is safe here and necessary: HAS_CLERK is a
  // build-time constant, so the hook order is identical on every render of this
  // component. Calling useClerk() unconditionally would throw "can only be used
  // within <ClerkProvider>" when no Clerk key is configured — and since the
  // navbar, Dashboard and AdminLayout all use this hook, that blanks the entire
  // app rather than merely disabling social sign-in.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const signOut = HAS_CLERK ? useClerk().signOut : null;
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
    signOut?.().catch(() => {});
  };
}
