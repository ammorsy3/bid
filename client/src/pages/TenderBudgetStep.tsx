import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

interface Milestone {
  id: string;
  name: string;
  amount: string;
}

export default function TenderBudgetStep() {
  const [, navigate] = useLocation();
  const [budgetType, setBudgetType] = useState<"fixed" | "milestone">("fixed");
  const [fixedPrice, setFixedPrice] = useState("");
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
    if (budgetType === "fixed" && fixedPrice) {
      const updated = {
        ...draft,
        budgetType: "fixed",
        budget: fixedPrice,
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/description");
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
      navigate("/tenders/description");
    }
  };

  const handleBack = () => {
    navigate("/tenders/scope");
  };

  const isFormValid =
    (budgetType === "fixed" && fixedPrice) ||
    (budgetType === "milestone" && milestones.length > 0);

  return (
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
              Back
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
                4 / 5
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Tell us about your budget.
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                This will help us match you to talent within your range.
              </p>
            </div>
          </div>

          {/* Right Section - Budget Options */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Budget Type Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      budgetType === "fixed"
                        ? "border-[#E25E45] bg-[#E25E45]/5"
                        : "border-gray-200 dark:border-gray-700"
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
                      className="h-5 w-5 text-[#E25E45] cursor-pointer"
                      data-testid="input-budget-fixed"
                    />
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Fixed price
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pay once
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      budgetType === "milestone"
                        ? "border-[#E25E45] bg-[#E25E45]/5"
                        : "border-gray-200 dark:border-gray-700"
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
                      className="h-5 w-5 text-[#E25E45] cursor-pointer"
                      data-testid="input-budget-milestone"
                    />
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Milestones
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pay as you go
                      </p>
                    </div>
                  </label>
                </div>

                {/* Fixed Price Input */}
                {budgetType === "fixed" && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                        What is the estimated budget for your project?
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Set a price for the project and pay at the end. You can
                        negotiate this cost when you chat with freelancers.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={fixedPrice}
                        onChange={(e) => setFixedPrice(e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                        data-testid="input-fixed-price"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Popular budgets: $100-$500 (small), $500-$2,000 (medium),
                      $2,000-$10,000 (large), $10,000+ (very large)
                    </p>
                  </div>
                )}

                {/* Milestone Input */}
                {budgetType === "milestone" && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Create project milestones
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Divide the project into milestones and pay as each one
                        is completed.
                      </p>
                    </div>

                    {/* Add Milestone Form */}
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <input
                        type="text"
                        placeholder="Milestone name (e.g., Design mockups)"
                        value={milestoneName}
                        onChange={(e) => setMilestoneName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
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
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                            data-testid="input-milestone-amount"
                          />
                        </div>
                        <Button
                          onClick={handleAddMilestone}
                          className="bg-[#E25E45] hover:bg-[#d54d35]"
                          data-testid="button-add-milestone"
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Milestones List */}
                    {milestones.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Milestones ({milestones.length})
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Total: ${totalMilestoneAmount}
                          </p>
                        </div>
                        {milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                            data-testid={`milestone-item-${milestone.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isFormValid}
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    Next
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
