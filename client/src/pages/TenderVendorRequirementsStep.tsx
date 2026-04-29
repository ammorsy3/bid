import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import VendorRequirementsEditor, { type VendorRequirement } from "@/components/VendorRequirementsEditor";

export default function TenderVendorRequirementsStep() {
  const [, navigate] = useLocation();
  const { t, isRtl } = useI18n();
  const [selected, setSelected] = useState<VendorRequirement[]>([]);

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (draft.vendorRequirements && Array.isArray(draft.vendorRequirements)) {
      setSelected(draft.vendorRequirements);
    }
  }, []);

  const handleNext = () => {
    const updated = { ...draft, vendorRequirements: selected.length > 0 ? selected : undefined };
    localStorage.setItem("tenderDraft", JSON.stringify(updated));
    navigate("/tenders/new/brief");
  };

  const handleBack = () => {
    navigate("/tenders/new/evaluation-criteria");
  };

  const handleSkip = () => {
    const updated = { ...draft, vendorRequirements: undefined };
    localStorage.setItem("tenderDraft", JSON.stringify(updated));
    navigate("/tenders/new/brief");
  };

  const mandatoryCount = selected.filter(r => r.type === 'mandatory').length;
  const preferredCount = selected.filter(r => r.type === 'preferred').length;

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <Button variant="outline" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {t('tenderSteps.back')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">

          {/* Left: Title + explanation */}
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500">6 / 7</div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                {t('tenderSteps.submissionRequirements')}
              </h1>
              <p className="text-gray-600 text-lg">
                {t('tenderSteps.vendorReqDesc')}
              </p>

              {selected.length > 0 && (
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  {mandatoryCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm font-medium text-red-700">{t('tenderSteps.mandatoryCount', { count: mandatoryCount })}</span>
                    </div>
                  )}
                  {preferredCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm font-medium text-amber-700">{t('tenderSteps.preferredCount', { count: preferredCount })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Card */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-6 space-y-5">

                <VendorRequirementsEditor
                  value={selected}
                  onChange={setSelected}
                  isRtl={isRtl}
                />

                {/* Navigation */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-gray-400 hover:text-gray-600"
                    data-testid="button-skip"
                  >
                    {t('tenderSteps.skip')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    {selected.length > 0
                      ? (selected.length === 1
                          ? t('tenderSteps.continueWithRequirements', { count: selected.length })
                          : t('tenderSteps.continueWithRequirementsPlural', { count: selected.length }))
                      : t('tenderSteps.continueBtn')}
                    <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                  </Button>
                </div>

              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
