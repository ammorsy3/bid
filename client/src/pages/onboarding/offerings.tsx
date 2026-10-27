// Onboarding step: classify what the new organization offers. Saving at least
// one offering completes vendor registration (enforced by the server). The
// organization already exists (a draft account), so leaving and coming back
// later resumes here; nothing marks registration complete except a save.

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";
import { OfferingsEditor } from "@/components/offerings/OfferingsEditor";
import { RequesterOnlyButton } from "@/components/offerings/RequesterOnlyButton";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

/** Where to go next. Only known in-app paths are honoured (no open redirects). */
export function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/dashboard";
  return /^\/(dashboard|onboarding\/(team-invite|individual-profile)|invite\/[\w-]+|settings(\/offerings)?)([?#].*)?$/.test(raw) ? raw : "/dashboard";
}

export default function OnboardingOfferings() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const next = safeNext(new URLSearchParams(window.location.search).get("next"));

  useEffect(() => {
    if (!user) setLocation("/signup");
    else if (!activeCompany) setLocation("/onboarding");
  }, [user, activeCompany, setLocation]);

  if (!user || !activeCompany) return null;
  const isCompany = (activeCompany.accountType ?? "company") === "company";
  const canManage = ["owner", "admin"].includes(activeCompany.role);

  return (
    <OnboardingLayout>
      <Card>
        <CardContent className="pt-6 sm:pt-8 pb-4 px-3 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FE3C01]/10 rounded-xl flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#FE3C01]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">{t("offerings.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("offerings.onboardingSubtitle")}</p>
            </div>
          </div>
          <OfferingsEditor
            companyId={activeCompany.id}
            mode="onboarding"
            onSaved={(_s, completed) => {
              if (completed) toast({ title: t("offerings.savedCompleted") });
              setLocation(next);
            }}
            footerExtra={
              <>
                {isCompany && canManage && <RequesterOnlyButton companyId={activeCompany.id} onDone={() => setLocation(next)} />}
                <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground" onClick={() => setLocation(next)} data-testid="button-finish-later">
                  {t("offerings.finishLater")}
                </Button>
              </>
            }
          />
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
