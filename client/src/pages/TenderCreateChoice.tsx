import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AILoader } from "@/components/ui/ai-loader";
import { useAuthStore } from "@/lib/auth";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { useI18n } from "@/lib/i18n";
import { usePageTour } from "@/lib/tour";
import { TENDER_CREATE_TOUR_STEPS, getSteps } from "@/lib/tour-steps";

export default function TenderCreateChoice() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { t, isRtl, language } = useI18n();
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';

  const { overlay: tourOverlay } = usePageTour({
    tourId: 'tender-create',
    userId: user?.id ?? '',
    steps: getSteps(TENDER_CREATE_TOUR_STEPS, language),
    isRtl,
    autoStart: !!user,
    autoStartDelay: 800,
  });

  return (
    <>
    <div className="relative min-h-screen bg-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          className="size-full"
          squareSize={4}
          gridGap={6}
          color="rgb(226, 94, 69)"
          maxOpacity={0.15}
          flickerChance={0.1}
        />
      </div>

      <div className="relative z-10">
        <header className="pt-12 pb-8">
          <button
            onClick={() => setLocation('/dashboard')}
            className="w-full cursor-pointer"
            data-testid="button-logo-bid"
          >
            <h1 className="text-center text-4xl font-bold text-[#E25E45] tracking-tight hover:opacity-80 transition-opacity">
              Bid
            </h1>
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-8">
            <AILoader size={100} />
          </div>

          <div className="text-center max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 drop-shadow-lg">
              {t('tenderFlow.welcome')} {firstName}!
            </h2>
            <p className="text-lg text-gray-700 mb-2 drop-shadow-md">
              {t('tenderFlow.letsCreateRfp')}
            </p>
            <p className="text-sm text-gray-600 mb-10 drop-shadow-md">
              {t('tenderFlow.postRfpDesc')}
            </p>

            <div className="space-y-3 max-w-sm mx-auto">
              <Button
                onClick={() => setLocation("/tenders/new/ai")}
                className="w-full h-12 bg-[#E25E45] hover:bg-[#d54d35] text-white text-base font-medium rounded-lg"
                data-testid="button-create-with-ai"
                data-tour="ai-choice"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {t('tenderFlow.getStartedWithAI')}
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation("/tenders/new/manual")}
                className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium rounded-lg"
                data-testid="button-create-manually"
                data-tour="manual-choice"
              >
                {t('tenderFlow.createMyself')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
    {tourOverlay}
    </>
  );
}
