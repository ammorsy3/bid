// Settings → Offerings: the organization's classification, editable by its
// owner/admin, readable by its members. Shows only the ACTIVE workspace's data.

import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfferingsEditor } from "@/components/offerings/OfferingsEditor";
import { RequesterOnlyButton } from "@/components/offerings/RequesterOnlyButton";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function SettingsOfferings() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { t, isRtl } = useI18n();

  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);
  if (!user || !activeCompany) return null;

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-4 md:p-8">
        <Button type="button" variant="ghost" className="min-h-11 -ms-2 mb-2" onClick={() => setLocation("/settings")} data-testid="button-back-settings">
          <ArrowLeft className={`h-4 w-4 me-2 ${isRtl ? "rotate-180" : ""}`} />{t("offerings.backToSettings")}
        </Button>
        <h1 className="font-display font-black text-2xl md:text-3xl tracking-[-0.04em]">{t("offerings.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-4 break-words">{activeCompany.name}</p>
        {/* Keyed by workspace: switching organizations never reuses another organization's editor state. */}
        <OfferingsEditor key={activeCompany.id} companyId={activeCompany.id} mode="settings"
          footerExtra={(activeCompany.accountType ?? "company") === "company" ? <RequesterOnlyButton companyId={activeCompany.id} /> : undefined} />
      </div>
    </div>
  );
}
