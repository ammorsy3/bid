import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

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

export default function TenderScopeStep() {
  const [, navigate] = useLocation();
  const [scope, setScope] = useState("");

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  const handleNext = () => {
    if (scope) {
      const updated = {
        ...draft,
        scope,
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/budget");
    }
  };

  const handleBack = () => {
    navigate("/tenders/skills");
  };

  const isFormValid = scope.length > 0;

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

        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Left Section - Headline and Explanation */}
          <div className="col-span-1">
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

          {/* Right Section - Scope Options */}
          <div className="col-span-2">
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8">
                {/* Scope Options */}
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
              </div>
            </Card>
          </div>
        </div>

        {/* Navigation Buttons - Bottom */}
        <div className="flex gap-3">
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
    </div>
  );
}
