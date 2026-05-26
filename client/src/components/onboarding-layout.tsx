import { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { BidLogo } from "@/components/brand/BidLogo";
import { OnboardingLeftPanelAnimation } from "@/components/OnboardingLeftPanelAnimation";

interface OnboardingLayoutProps {
  children: ReactNode;
  step?: number; // 0 = choice, 1 = basics, 2 = documents, 3 = profile, 4 = team
}

export default function OnboardingLayout({ children, step }: OnboardingLayoutProps) {
  const { t } = useI18n();

  const STEPS = [
    { labelKey: "stepBasics", num: 1 },
    { labelKey: "stepDocuments", num: 2 },
    { labelKey: "stepProfile", num: 3 },
    { labelKey: "stepTeam", num: 4 },
  ];

  const headline =
    step === 1 ? (t("onboardingPanel.stepBasicsHeadline") || "Tell us about your company")
    : step === 2 ? (t("onboardingPanel.stepDocsHeadline") || "Verify your documents")
    : step === 3 ? (t("onboardingPanel.stepProfileHeadline") || "Build your public profile")
    : step === 4 ? (t("onboardingPanel.stepTeamHeadline") || "Invite your team")
    : t("onboardingPanel.setupWorkspace");

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel — full-bleed animation on warm cream ─────────────────── */}
      <div
        className="hidden lg:flex lg:w-[440px] xl:w-[480px] relative overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(ellipse at 60% 25%, #FCE9DC 0%, #F4EDE1 68%)" }}
      >
        {/* Subtle orange blobs + dot grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 -left-20 w-96 h-96 bg-[#FE3C01]/[0.07] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-0   w-80 h-80 bg-[#FE3C01]/[0.05] rounded-full blur-3xl" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(11,9,7,0.45) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: 0.045,
            }}
          />
        </div>

        {/* Animation — centered, fills the panel */}
        <div className="relative z-10 flex items-center justify-center w-full h-full p-8 xl:p-10">
          <OnboardingLeftPanelAnimation />
        </div>
      </div>

      {/* ── Right Panel — logo + headline + step indicator + form ────────────── */}
      <div className="flex-1 flex flex-col min-h-screen bg-muted">
        <div className="p-6 pb-0">

          {/* Logo — always visible on both mobile and desktop */}
          <div className="flex items-center gap-2 mb-5">
            <BidLogo variant="orange" size={28} />
          </div>

          {/* Headline (moved from left panel) */}
          <div className="max-w-xl mx-auto w-full mb-5">
            <h2 className="text-xl font-black text-foreground tracking-[-0.03em] leading-tight">
              {headline}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("onboardingPanel.setupWorkspaceDesc")}
            </p>
          </div>

          {/* Step indicator — only for steps 1-4 */}
          {step && step >= 1 && (
            <div className="flex items-center justify-center gap-1 mb-2 max-w-xl mx-auto w-full">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-mono transition-colors ${
                        step > s.num
                          ? "bg-[var(--state-won)] text-white"
                          : step === s.num
                          ? "bg-[var(--bid-orange)] text-white"
                          : "bg-neutral-200 text-neutral-400"
                      }`}
                    >
                      {step > s.num ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        s.num
                      )}
                    </div>
                    <span
                      className={`text-sm hidden sm:inline ${
                        step === s.num ? "font-medium text-foreground" : "text-neutral-400"
                      }`}
                    >
                      {t(`onboardingPanel.${s.labelKey}`)}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-10 h-px mx-1 ${
                        step > s.num ? "bg-[var(--state-won)]/40" : "bg-neutral-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main form content */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
