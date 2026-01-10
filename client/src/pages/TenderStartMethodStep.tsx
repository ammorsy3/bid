import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, FileText, PenLine, Star, Check } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState } from "react";

type StartMethod = "template" | "scratch" | null;

interface Template {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: "bid-recommended",
    name: "Bid Recommended Template",
    description: "Our recommended structure for creating effective tenders with all essential sections",
    recommended: true,
  },
];

export default function TenderStartMethodStep() {
  const [, navigate] = useLocation();
  const [startMethod, setStartMethod] = useState<StartMethod>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleNext = () => {
    if (startMethod === "template" && selectedTemplate) {
      // Clear any existing draft and set template flag
      localStorage.setItem("tenderDraft", JSON.stringify({ template: selectedTemplate }));
      navigate("/tenders/new/title");
    } else if (startMethod === "scratch") {
      // Clear any existing draft for fresh start
      localStorage.removeItem("tenderDraft");
      // Navigate to the drag-and-drop form builder
      navigate("/tenders/new/form-builder");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new");
  };

  const isFormValid =
    startMethod === "scratch" ||
    (startMethod === "template" && selectedTemplate !== null);

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
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                How would you like to start?
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Choose to start with a pre-built template for faster setup, or
                start from scratch for complete customization.
              </p>
            </div>
          </div>

          {/* Right Section - Options */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Start Method Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStartMethod("template");
                      // Auto-select recommended template
                      const recommended = TEMPLATES.find(t => t.recommended);
                      if (recommended) setSelectedTemplate(recommended.id);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      startMethod === "template"
                        ? "border-[#E25E45] bg-[#E25E45]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    data-testid="button-template"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      startMethod === "template"
                        ? "bg-[#E25E45]"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <FileText className={`h-6 w-6 ${
                        startMethod === "template" ? "text-white" : "text-gray-600 dark:text-gray-400"
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Start with a template
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Pre-built structure
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStartMethod("scratch");
                      setSelectedTemplate(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      startMethod === "scratch"
                        ? "border-[#E25E45] bg-[#E25E45]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    data-testid="button-scratch"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      startMethod === "scratch"
                        ? "bg-[#E25E45]"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <PenLine className={`h-6 w-6 ${
                        startMethod === "scratch" ? "text-white" : "text-gray-600 dark:text-gray-400"
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Start from scratch
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Full customization
                      </p>
                    </div>
                  </button>
                </div>

                {/* Template Selection - Progressive Disclosure */}
                <div
                  className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    startMethod === "template"
                      ? "opacity-100 max-h-[500px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Choose a template
                  </label>
                  <div className="space-y-3">
                    {TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                          selectedTemplate === template.id
                            ? "border-[#E25E45] bg-[#E25E45]/5"
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                        data-testid={`template-${template.id}`}
                      >
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            selectedTemplate === template.id
                              ? "bg-[#E25E45] text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              selectedTemplate === template.id
                                ? "text-[#E25E45]"
                                : "text-gray-900 dark:text-white"
                            }`}>
                              {template.name}
                            </span>
                            {template.recommended && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <Star className="h-3 w-3" />
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {template.description}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedTemplate === template.id
                              ? "border-[#E25E45] bg-[#E25E45]"
                              : "border-gray-300 dark:border-gray-500"
                          }`}
                        >
                          {selectedTemplate === template.id && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

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
