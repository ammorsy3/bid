import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BidLogo } from "@/components/brand/BidLogo";
import { useI18n } from "@/lib/i18n";
import { usePlan } from "@/lib/usePlan";
import { openUpgrade } from "@/lib/upgrade-store";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { CompanyVerificationFlow } from "@/components/CompanyVerificationFlow";

export default function TenderCreateChoice() {
  const [, setLocation] = useLocation();
  const { activeCompany } = useAuthStore();
  const { t } = useI18n();

  const { toast } = useToast();

  const verificationStatus = activeCompany?.verificationStatus;
  const activeCompanyId = activeCompany?.id;

  // Only company workspaces may create tenders (POST /api/tenders is behind
  // requireAccountType('company')). Individual and team workspaces are
  // auto-verified at creation, so without this check they'd satisfy the
  // isVerified branch below and get pushed straight into the wizard.
  const isCompanyAccount = (activeCompany?.accountType ?? 'company') === 'company';
  useEffect(() => {
    if (activeCompany && !isCompanyAccount) {
      toast({
        title: t('dashboard.individualRestrictedTitle'),
        description: t('dashboard.individualRestrictedDesc'),
      });
      setLocation('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, isCompanyAccount, setLocation]);

  // The old create-choice screen offered "AI" vs "manual". With AI removed there
  // is only one path, so a verified company skips this page entirely and lands
  // straight in the wizard. This page now exists solely to host the verification
  // gate below for companies that aren't verified yet (RequireVerified bounces
  // unverified users back here). Only redirect when actually verified — never on
  // an undefined status — so we can't ping-pong with RequireVerified.
  const isVerified = isCompanyAccount && verificationStatus === 'verified';
  // The free-tender limit is checked here too, so a typed-in or bookmarked
  // /tenders/new shows the upgrade dialog up front instead of after the wizard.
  const { settled: planSettled, loaded: planLoaded, canCreateTender } = usePlan();
  useEffect(() => {
    if (!isVerified || !planSettled) return;
    if (planLoaded && !canCreateTender) {
      openUpgrade('tenders');
      setLocation('/dashboard', { replace: true });
      return;
    }
    setLocation('/tenders/new/manual', { replace: true });
  }, [isVerified, planSettled, planLoaded, canCreateTender, setLocation]);

  if (verificationStatus && verificationStatus !== 'verified' && activeCompanyId) {
    const canManage = ['owner', 'admin'].includes(activeCompany?.role || '');
    return (
      <div className="relative min-h-dvh bg-card flex flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <FlickeringGrid
            className="size-full"
            squareSize={4}
            gridGap={6}
            color="rgb(254, 60, 1)"
            maxOpacity={0.08}
            flickerChance={0.1}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center min-h-dvh px-4 sm:px-6 pt-10 pb-16">
          <header className="w-full pb-6">
            <button onClick={() => setLocation('/dashboard')} className="w-full flex justify-center cursor-pointer" aria-label={t('onboardingPanel.backToDashboard')}>
              <BidLogo variant="orange" size={48} className="hover:opacity-80 transition-opacity" />
            </button>
          </header>

          <div className="max-w-2xl w-full">
            <p className="text-center text-sm text-muted-foreground mb-4">{t('onboardingPanel.verifyToContinueDesc')}</p>
            <CompanyVerificationFlow companyId={activeCompanyId} canManage={canManage} />
            <Button
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              className="mt-6 w-full h-11 border-border text-muted-foreground text-sm font-medium rounded-lg"
            >
              {t('onboardingPanel.backToDashboard')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Verified: the effect above is redirecting to the wizard — render nothing so
  // the removed choice screen never flashes.
  return null;
}
