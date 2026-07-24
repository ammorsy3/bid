import { useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Handles an invite link (/join/:code). Logged-in users join instantly and
// switch into the workspace; logged-out users get the code stashed and are sent
// to signup, where onboarding pre-fills it. Reinforces the "one account" model.
export default function JoinByCode() {
  const [, params] = useRoute("/join/:code");
  const code = (params?.code || "").toUpperCase();
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      if (!code) { setLocation("/"); return; }
      if (!user) {
        localStorage.setItem("pendingJoinCode", code);
        setLocation("/signup");
        return;
      }
      try {
        const res = await apiRequest("POST", "/api/companies/join-by-code", { code });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || "That invite link isn't valid.");
        if (body.token) localStorage.setItem("token", body.token);
        await useAuthStore.getState().checkAuth();
        toast({ title: "You're in!", description: `Joined ${body.activeCompany?.name || "the workspace"}.` });
        setLocation("/dashboard");
      } catch (e: any) {
        toast({ title: "Couldn't join", description: e.message, variant: "destructive" });
        setLocation("/dashboard");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Joining…
      </div>
    </div>
  );
}
