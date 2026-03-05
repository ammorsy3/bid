import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingPathsBackground } from "@/components/ui/floating-paths-bg";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState } from "react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { getSuggestions } from "@/lib/tender-suggestions";
import { useI18n } from "@/lib/i18n";

const MAX_WORDS = 10;

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export default function TenderTitleStep() {
  const [, navigate] = useLocation();
  const { t, language } = useI18n();

  const draft = (() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  })();

  const [title, setTitle] = useState(draft.title || "");

  const wordCount = countWords(title);
  const isOverLimit = wordCount > MAX_WORDS;

  const handleNext = () => {
    if (title.trim() && !isOverLimit) {
      const draftData = {
        ...draft,
        title: title.trim(),
      };
      localStorage.setItem("tenderDraft", JSON.stringify(draftData));
      navigate("/tenders/new/project-scope");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/manual");
  };

  const isFormValid = title.trim().length > 0 && !isOverLimit;

  return (
    <FloatingPathsBackground>
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <img
              src={logoPath}
              alt="Bid"
              className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/dashboard")}
            />
            <Button
              onClick={handleBack}
              className="group relative overflow-hidden"
              data-testid="button-back"
            >
              <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
                {t('tenderFlow.back')}
              </span>
              <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
                <ArrowLeft
                  className="opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </i>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  1 / 5
                </div>
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  {t('tenderFlow.step1Title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {t('tenderFlow.step1Desc')}
                </p>
              </div>
            </div>

            <div>
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t('tenderFlow.writeProjectTitle')}
                    </label>
                    <AutocompleteInput
                      value={title}
                      onChange={setTitle}
                      suggestions={getSuggestions("title", language)}
                      placeholder={t('tenderFlow.titlePlaceholder')}
                      data-testid="input-title"
                      className={isOverLimit ? "border-red-300 dark:border-red-600 focus:ring-red-500" : ""}
                    />
                    <div className="flex justify-between items-center">
                      <p className={`text-xs ${isOverLimit ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                        {isOverLimit ? t('tenderFlow.titleTooLong') : t('tenderFlow.keepClearSpecific')}
                      </p>
                      <p className={`text-xs ${isOverLimit ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                        {wordCount} / {MAX_WORDS} {t('tenderFlow.words')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      {t('tenderFlow.cancel')}
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!isFormValid}
                      className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                      data-testid="button-next"
                    >
                      {t('tenderFlow.next')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </FloatingPathsBackground>
  );
}
