import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface Milestone {
  id: string;
  name: string;
  amount: string;
}

export default function TenderBudgetStep() {
  const [, navigate] = useLocation();
  const { t, isRtl } = useI18n();
  const [budgetType, setBudgetType] = useState<"fixed" | "milestone">("fixed");
  const [fixedPrice, setFixedPrice] = useState("");
  const [priceType, setPriceType] = useState<"exact" | "range">("exact");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  // Pre-fill with AI suggested budget if available
  useEffect(() => {
    if (draft.suggestedBudget && !fixedPrice) {
      setFixedPrice(draft.suggestedBudget.toString());
    }
    if (draft.budgetMin && draft.budgetMax) {
      setPriceType("range");
      setMinPrice(draft.budgetMin.toString());
      setMaxPrice(draft.budgetMax.toString());
    } else if (draft.budget) {
      setPriceType("exact");
      setFixedPrice(draft.budget);
    }
  }, [draft.suggestedBudget, draft.budget, draft.budgetMin, draft.budgetMax]);

  const handleAddMilestone = () => {
    if (milestoneName.trim() && milestoneAmount.trim()) {
      const newMilestone: Milestone = {
        id: Date.now().toString(),
        name: milestoneName,
        amount: milestoneAmount,
      };
      setMilestones([...milestones, newMilestone]);
      setMilestoneName("");
      setMilestoneAmount("");
    }
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const totalMilestoneAmount = milestones
    .reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)
    .toFixed(2);

  const handleNext = () => {
    if (budgetType === "fixed") {
      if (priceType === "exact" && fixedPrice) {
        const updated = {
          ...draft,
          budgetType: "fixed",
          budget: fixedPrice,
          budgetMin: undefined,
          budgetMax: undefined,
        };
        localStorage.setItem("tenderDraft", JSON.stringify(updated));
        navigate("/tenders/new/description");
      } else if (priceType === "range" && minPrice && maxPrice) {
        const updated = {
          ...draft,
          budgetType: "fixed",
          budget: `${minPrice} - ${maxPrice}`,
          budgetMin: parseFloat(minPrice),
          budgetMax: parseFloat(maxPrice),
        };
        localStorage.setItem("tenderDraft", JSON.stringify(updated));
        navigate("/tenders/new/description");
      }
    } else if (budgetType === "milestone" && milestones.length > 0) {
      const updated = {
        ...draft,
        budgetType: "milestone",
        milestones: milestones.map((m) => ({
          name: m.name,
          amount: m.amount,
        })),
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/description");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/scope");
  };

  const isFormValid =
    (budgetType === "fixed" && (
      (priceType === "exact" && fixedPrice) ||
      (priceType === "range" && minPrice && maxPrice && parseFloat(minPrice) < parseFloat(maxPrice))
    )) ||
    (budgetType === "milestone" && milestones.length > 0);

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <BidLogo size={64} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/dashboard")} />
          <Button
            onClick={handleBack}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              {t('tenderSteps.back')}
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
          {/* Left Section - Headline and Explanation */}
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                6 / 7
              </div>
              <h1 className="font-display font-black text-5xl text-gray-900 dark:text-foreground leading-[0.92] tracking-[-0.045em]">
                {t('tenderSteps.budgetStepTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('tenderSteps.budgetStepDesc')}
              </p>
            </div>
          </div>

          {/* Right Section - Budget Options */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Budget Type Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      budgetType === "fixed"
                        ? "border-[#FE3C01] bg-[#FE3C01]/5"
                        : "border-border dark:border-border"
                    }`}
                    data-testid="label-budget-fixed"
                  >
                    <input
                      type="radio"
                      name="budgetType"
                      value="fixed"
                      checked={budgetType === "fixed"}
                      onChange={(e) =>
                        setBudgetType(e.target.value as "fixed" | "milestone")
                      }
                      className="h-5 w-5 text-[#FE3C01] cursor-pointer"
                      data-testid="input-budget-fixed"
                    />
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-foreground">
                        {t('tenderSteps.fixedPrice')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('tenderSteps.payOnce')}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      budgetType === "milestone"
                        ? "border-[#FE3C01] bg-[#FE3C01]/5"
                        : "border-border dark:border-border"
                    }`}
                    data-testid="label-budget-milestone"
                  >
                    <input
                      type="radio"
                      name="budgetType"
                      value="milestone"
                      checked={budgetType === "milestone"}
                      onChange={(e) =>
                        setBudgetType(e.target.value as "fixed" | "milestone")
                      }
                      className="h-5 w-5 text-[#FE3C01] cursor-pointer"
                      data-testid="input-budget-milestone"
                    />
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-foreground">
                        {t('tenderSteps.milestonesLabel')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('tenderSteps.payAsYouGo')}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Fixed Price Input */}
                {budgetType === "fixed" && (
                  <div className="space-y-4 border-t border-border dark:border-border pt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-foreground mb-3">
                        {t('tenderSteps.estimatedBudgetQuestion')}
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {t('tenderSteps.estimatedBudgetHelper')}
                      </p>
                    </div>

                    {/* Price Type Toggle */}
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setPriceType("exact")}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          priceType === "exact"
                            ? "bg-[#FE3C01] text-white"
                            : "bg-gray-100 dark:bg-card text-muted-foreground dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                        data-testid="button-exact-price"
                      >
                        {t('tenderSteps.exactBudgetBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceType("range")}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          priceType === "range"
                            ? "bg-[#FE3C01] text-white"
                            : "bg-gray-100 dark:bg-card text-muted-foreground dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                        data-testid="button-range-price"
                      >
                        {t('tenderSteps.budgetRangeBtn')}
                      </button>
                    </div>

                    {/* Exact Price Input */}
                    {priceType === "exact" && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            $
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={fixedPrice}
                            onChange={(e) => setFixedPrice(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent"
                            data-testid="input-fixed-price"
                          />
                        </div>
                      </div>
                    )}

                    {/* Range Price Inputs */}
                    {priceType === "range" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              {t('tenderSteps.minimumLabel')}
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">
                                $
                              </span>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent"
                                data-testid="input-min-price"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              {t('tenderSteps.maximumLabel')}
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">
                                $
                              </span>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-card text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent"
                                data-testid="input-max-price"
                              />
                            </div>
                          </div>
                        </div>
                        {minPrice && maxPrice && parseFloat(minPrice) >= parseFloat(maxPrice) && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {t('tenderSteps.maxMustBeGreater')}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('tenderSteps.popularBudgets')}
                    </p>
                  </div>
                )}

                {/* Milestone Input */}
                {budgetType === "milestone" && (
                  <div className="space-y-4 border-t border-border dark:border-border pt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-foreground mb-3">
                        {t('tenderSteps.createMilestones')}
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {t('tenderSteps.createMilestonesDesc')}
                      </p>
                    </div>

                    {/* Add Milestone Form */}
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-card rounded-lg">
                      <input
                        type="text"
                        placeholder={t('tenderSteps.milestoneNamePlaceholder')}
                        value={milestoneName}
                        onChange={(e) => setMilestoneName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent"
                        data-testid="input-milestone-name"
                      />
                      <div className="flex gap-2">
                        <div className="flex items-center flex-1 gap-2">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            $
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={milestoneAmount}
                            onChange={(e) => setMilestoneAmount(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent"
                            data-testid="input-milestone-amount"
                          />
                        </div>
                        <Button
                          onClick={handleAddMilestone}
                          className="bg-[#FE3C01] hover:bg-[#d54d35]"
                          data-testid="button-add-milestone"
                        >
                          {t('tenderSteps.addBtn')}
                        </Button>
                      </div>
                    </div>

                    {/* Milestones List */}
                    {milestones.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                            {t('tenderSteps.milestonesCount', { count: milestones.length })}
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                            {t('tenderSteps.totalAmount', { amount: totalMilestoneAmount })}
                          </p>
                        </div>
                        {milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-card rounded-lg"
                            data-testid={`milestone-item-${milestone.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                                {milestone.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                ${milestone.amount}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveMilestone(milestone.id)}
                              className="flex-shrink-0 p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                              data-testid={`button-delete-milestone-${milestone.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6 border-t border-border dark:border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    {t('tenderSteps.back')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isFormValid}
                    className="flex-1 bg-[#FE3C01] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    {t('tenderSteps.next')}
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
