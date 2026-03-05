import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Sparkles, Edit3, Loader2, AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";

type BudgetMode = "manual" | "ai" | null;

interface AIBudgetEstimate {
  estimatedBudget: number;
  budgetRange: { min: number; max: number };
  breakdown: { item: string; amount: number }[];
  reasoning: string;
}

type ProjectSize = "small" | "medium" | "large";

const getProjectSize = (budget: number): ProjectSize => {
  if (budget < 50000) return "small";
  if (budget <= 250000) return "medium";
  return "large";
};

export default function TenderAIBudgetStep() {
  const [, navigate] = useLocation();
  const { t, isRtl } = useI18n();
  const rfpLanguage = localStorage.getItem("rfp_creation_language") || "en";
  const isRfpRtl = rfpLanguage === "ar";
  const [budgetMode, setBudgetMode] = useState<BudgetMode>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<AIBudgetEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [budget, setBudget] = useState("");
  const [priceType, setPriceType] = useState<"exact" | "range">("exact");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showPriceToVendors, setShowPriceToVendors] = useState(true);

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (draft.budgetMin && draft.budgetMax) {
      setPriceType("range");
      setMinPrice(draft.budgetMin.toString());
      setMaxPrice(draft.budgetMax.toString());
    } else if (draft.budget) {
      setPriceType("exact");
      setBudget(draft.budget);
    }
  }, []);

  const budgetNumber = priceType === "exact"
    ? (parseFloat(budget) || 0)
    : (parseFloat(maxPrice) || 0);
  const projectSize = budgetNumber > 0 ? getProjectSize(budgetNumber) : null;

  const getProjectSizeLabel = (size: ProjectSize): string => {
    switch (size) {
      case "small": return t('tenderFlow.smallProject');
      case "medium": return t('tenderFlow.mediumProject');
      case "large": return t('tenderFlow.largeProject');
    }
  };

  const handleAIEstimate = async () => {
    setIsLoading(true);
    setError(null);
    setAiEstimate(null);

    try {
      const response = await apiRequest("POST", "/api/ai/estimate-budget", {
        title: draft.title || "",
        projectType: draft.projectType || "",
        projectObjective: draft.projectObjective || "",
        keyDeliverables: draft.keyDeliverables || [],
        projectDescription: draft.projectDescription || "",
        voiceNoteUrl: draft.voiceNoteUrl || null,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to get budget estimate");
      }

      const data = await response.json();
      setAiEstimate(data);
      setBudget(data.estimatedBudget.toString());
    } catch (err: any) {
      setError(err.message || "Failed to get AI budget estimate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (isFormValid) {
      const updated = {
        ...draft,
        budget: priceType === "exact" ? budget : `${minPrice} - ${maxPrice}`,
        budgetMin: priceType === "range" ? parseFloat(minPrice) : undefined,
        budgetMax: priceType === "range" ? parseFloat(maxPrice) : undefined,
        projectSize: projectSize,
        showPriceToVendors: showPriceToVendors,
        aiEstimate: aiEstimate || undefined,
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/submission-process");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/project-scope");
  };

  const isFormValid = budgetMode !== null && (
    (priceType === "exact" && budgetNumber > 0) ||
    (priceType === "range" && parseFloat(minPrice) > 0 && parseFloat(maxPrice) > 0 && parseFloat(minPrice) < parseFloat(maxPrice))
  );

  const formatSAR = (amount: number) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="py-8 px-4" dir={isRfpRtl ? "rtl" : "ltr"}>
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
                3 / 5
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {t('tenderFlow.step3Title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('tenderFlow.step3Desc')}
              </p>
            </div>
          </div>

          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetMode("ai");
                      setError(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      budgetMode === "ai"
                        ? "border-[#E25E45] bg-[#E25E45]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    data-testid="button-ai-mode"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E25E45] to-[#FF8A6B] flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('tenderFlow.aiEstimate')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('tenderFlow.getSmartSuggestion')}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBudgetMode("manual");
                      setError(null);
                      setAiEstimate(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      budgetMode === "manual"
                        ? "border-[#E25E45] bg-[#E25E45]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    data-testid="button-manual-mode"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Edit3 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('tenderFlow.setManually')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('tenderFlow.enterOwnBudget')}
                      </p>
                    </div>
                  </button>
                </div>

                {budgetMode === "ai" && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {!aiEstimate && !isLoading && !error && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {t('tenderFlow.aiAnalyzeDesc')}
                        </p>
                        <Button
                          onClick={handleAIEstimate}
                          className="bg-gradient-to-r from-[#E25E45] to-[#FF8A6B] hover:opacity-90"
                          data-testid="button-get-estimate"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {t('tenderFlow.getAIEstimate')}
                        </Button>
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#E25E45]" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                          {t('tenderFlow.analyzingProject')}
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              {error}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleAIEstimate}
                              className="mt-2 text-red-600 hover:text-red-700"
                            >
                              {t('tenderFlow.tryAgain')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {aiEstimate && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-[#E25E45]/5 to-[#FF8A6B]/5 border border-[#E25E45]/20 rounded-lg p-6">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {t('tenderFlow.suggestedBudget')}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatSAR(aiEstimate.estimatedBudget)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('tenderFlow.range')} {formatSAR(aiEstimate.budgetRange.min)} -{" "}
                            {formatSAR(aiEstimate.budgetRange.max)}
                          </p>
                        </div>

                        {aiEstimate.breakdown.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {t('tenderFlow.estimatedBreakdown')}
                            </p>
                            <div className="space-y-2">
                              {aiEstimate.breakdown.map((item, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {item.item}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatSAR(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiEstimate.reasoning && (
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {t('tenderFlow.aiReasoning')}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {aiEstimate.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {budgetMode !== null && (budgetMode === "manual" || aiEstimate) && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                        {budgetMode === "ai" ? t('tenderFlow.adjustBudget') : t('tenderFlow.enterBudget')}
                      </label>

                      {budgetMode === "manual" && (
                        <div className="flex gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() => setPriceType("exact")}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                              priceType === "exact"
                                ? "bg-[#E25E45] text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                            data-testid="button-exact-price"
                          >
                            {t('tenderFlow.exactBudget')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPriceType("range")}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                              priceType === "range"
                                ? "bg-[#E25E45] text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                            data-testid="button-range-price"
                          >
                            {t('tenderFlow.budgetRange')}
                          </button>
                        </div>
                      )}

                      {(budgetMode === "ai" || priceType === "exact") && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            SAR
                          </span>
                          <input
                            type="number"
                            placeholder="0"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                            data-testid="input-budget"
                          />
                        </div>
                      )}

                      {budgetMode === "manual" && priceType === "range" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                {t('tenderFlow.minimum')}
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                  SAR
                                </span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={minPrice}
                                  onChange={(e) => setMinPrice(e.target.value)}
                                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                                  data-testid="input-min-price"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                {t('tenderFlow.maximum')}
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                  SAR
                                </span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={maxPrice}
                                  onChange={(e) => setMaxPrice(e.target.value)}
                                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                                  data-testid="input-max-price"
                                />
                              </div>
                            </div>
                          </div>
                          {minPrice && maxPrice && parseFloat(minPrice) >= parseFloat(maxPrice) && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {t('tenderFlow.maxGreaterThanMin')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {(budgetMode === "ai" || priceType === "exact") && (
                      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between" dir={isRtl ? "rtl" : "ltr"}>
                          <div className="flex items-center gap-2">
                            {showPriceToVendors ? (
                              <Eye className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <EyeOff className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {t('tenderFlow.showPriceToVendors')}
                            </span>
                          </div>
                          <button
                            type="button"
                            dir="ltr"
                            onClick={() => setShowPriceToVendors(!showPriceToVendors)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ms-3 ${
                              showPriceToVendors ? "bg-[#E25E45]" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            data-testid="toggle-show-price"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                showPriceToVendors ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {showPriceToVendors
                              ? t('tenderFlow.priceVisibleInfo')
                              : t('tenderFlow.priceHiddenInfo')
                            }
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    {t('tenderFlow.back')}
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
  );
}