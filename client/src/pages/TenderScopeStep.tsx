import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Edit2 } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { JollyDatePicker } from "@/components/ui/date-picker";
import { CalendarDate } from "@internationalized/date";

const SCOPE_OPTIONS = [
  {
    id: "large",
    label: "Large",
    description:
      "Longer term or complex initiatives (ex. develop and execute a brand strategy (i.e., graphics, positioning))",
  },
  {
    id: "medium",
    label: "Medium",
    description:
      "Well-defined projects (ex. design business rebrand package (i.e., logos, icons))",
  },
  {
    id: "small",
    label: "Small",
    description:
      "Quick and straightforward tasks (ex. create logo for a new product)",
  },
];

const DURATION_OPTIONS = [
  {
    id: "6plus",
    label: "More than 6 months",
  },
  {
    id: "3to6",
    label: "3 to 6 months",
  },
  {
    id: "1to3",
    label: "1 to 3 months",
  },
];

export default function TenderScopeStep() {
  const [, navigate] = useLocation();
  const [scope, setScope] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState<CalendarDate | null>(null);

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  const selectedScopeOption = SCOPE_OPTIONS.find((opt) => opt.id === scope);

  const handleNext = () => {
    if (scope && duration && deadline) {
      const deadlineDate = new Date(deadline.toString());
      const updated = {
        ...draft,
        scope,
        duration,
        deadline: deadlineDate.toISOString(),
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/budget");
    }
  };

  const handleBack = () => {
    navigate("/tenders/skills");
  };

  const isFormValid = scope && duration && deadline;

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
                3 / 5
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Next, estimate the scope of your work.
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Consider the size of your project and the time it will take.
              </p>
            </div>
          </div>

          {/* Right Section - Scope and Duration Options */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Scope Options - Only show if not selected */}
                {!scope ? (
                  <div className="space-y-4">
                    {SCOPE_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-[#E25E45] transition-colors"
                        data-testid={`label-scope-${option.id}`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          value={option.id}
                          checked={scope === option.id}
                          onChange={(e) => setScope(e.target.value)}
                          className="mt-1 h-5 w-5 text-[#E25E45] cursor-pointer"
                          data-testid={`input-scope-${option.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {option.label}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Selected Scope with Edit Button */}
                    <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedScopeOption?.label}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {selectedScopeOption?.description}
                        </p>
                      </div>
                      <button
                        onClick={() => setScope("")}
                        className="flex-shrink-0 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        data-testid="button-edit-scope"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Duration Question */}
                    <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        How long will your work take?
                      </h3>
                      <div className="space-y-3">
                        {DURATION_OPTIONS.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-[#E25E45] transition-colors"
                            data-testid={`label-duration-${option.id}`}
                          >
                            <input
                              type="radio"
                              name="duration"
                              value={option.id}
                              checked={duration === option.id}
                              onChange={(e) => setDuration(e.target.value)}
                              className="h-4 w-4 text-[#E25E45] cursor-pointer"
                              data-testid={`input-duration-${option.id}`}
                            />
                            <span className="text-gray-900 dark:text-white">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Deadline Date Picker */}
                    {duration && (
                      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                        <label className="block font-medium text-gray-900 dark:text-white">
                          When is your submission deadline?
                        </label>
                        <JollyDatePicker
                          value={deadline}
                          onChange={setDeadline}
                          label=""
                          data-testid="input-deadline"
                        />
                      </div>
                    )}
                  </>
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
