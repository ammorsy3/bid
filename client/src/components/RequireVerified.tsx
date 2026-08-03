import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

/**
 * Client-side mirror of the two server rules that together decide who may
 * create a tender:
 *
 *   1. the workspace must be a `company` account — `requireAccountType('company')`
 *      on POST /api/tenders (server/routes.ts:3155), and
 *   2. that company must be verified — `requireVerifiedCompany`.
 *
 * Both matter, and checking only the second is not enough. Individual and team
 * workspaces are auto-verified at creation (server/routes.ts:1963-1965), so a
 * verification-only gate let them walk all twelve wizard steps and compose an
 * entire RFP before the final POST rejected them with a 403.
 *
 * Non-company accounts are bounced to the dashboard with the same "not for your
 * workspace type" toast DashboardGuard uses. Unverified companies are bounced to
 * `/tenders/new`, which renders the proper verification gate.
 */
export function RequireVerified({ children }: { children: React.ReactNode }) {
  const { user, activeCompany } = useAuthStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();

  const isCompanyAccount = (activeCompany?.accountType ?? "company") === "company";
  const verified = activeCompany?.verificationStatus === "verified";
  const blocked = !!user && (!isCompanyAccount || !verified);

  useEffect(() => {
    if (!user) return;
    if (!isCompanyAccount) {
      toast({
        title: t("dashboard.individualRestrictedTitle"),
        description: t("dashboard.individualRestrictedDesc"),
      });
      setLocation("/dashboard");
      return;
    }
    if (!verified) setLocation("/tenders/new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isCompanyAccount, verified, setLocation]);

  // Don't flash wizard content while the redirect is in flight.
  if (blocked) return null;
  return <>{children}</>;
}
