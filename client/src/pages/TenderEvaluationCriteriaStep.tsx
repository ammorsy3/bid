import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CRITERIA_OPTIONS = [
  {
    id: "financial_offer",
    label: "Price close to budget",
  },
  {
    id: "previous_work",
    label: "Similar previous work",
  },
  {
    id: "clear_timeline",
    label: "Clear timeline",
  },
  {
    id: "technical_approach",
    label: "Strong technical approach",
  },
  {
    id: "team_expertise",
    label: "Team expertise",
  },
];

export default function TenderEvaluationCriteriaStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  // Pre-fill from draft if available
  useEffect(() => {
    if (draft.evaluationCriteria && Array.isArray(draft.evaluationCriteria)) {
      setSelectedCriteria(draft.evaluationCriteria);
    }
  }, [draft.evaluationCriteria]);

  const submitTender = useMutation({
    mutationFn: async (tenderData: any) => {
      const response = await apiRequest("POST", "/api/tenders", tenderData);
      return await response.json();
    },
    onSuccess: (data) => {
      localStorage.removeItem("tenderDraft");
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Tender published!",
        description: "Your tender is now live. Suppliers can start submitting proposals.",
      });
      navigate("/dashboard?tab=tenders");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish tender",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleCriteria = (criteriaId: string) => {
    setSelectedCriteria((prev) => {
      if (prev.includes(criteriaId)) {
        return prev.filter((id) => id !== criteriaId);
      } else {
        if (prev.length < 3) {
          return [...prev, criteriaId];
        }
        return prev;
      }
    });
  };

  const handlePublish = (criteria?: string[]) => {
    const tenderData = {
      title: draft.title || "Untitled Tender",
      description: draft.description || draft.projectDescription || draft.title || "No description provided",
      category: draft.skills?.[0] || "Other",
      skills: draft.skills || [],
      scope: draft.scope || undefined,
      deadline: draft.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: draft.duration || "1-3 months",
      budget: draft.budget || "",
      projectSize: draft.projectSize || undefined,
      showPriceToVendors: draft.showPriceToVendors !== false,
      projectTimeline: draft.duration || "1-3 months",
      submissionType: draft.submissionType || undefined,
      videoRequired: draft.videoRequired || undefined,
      inquiryType: draft.inquiryType || undefined,
      whatsappContact: draft.whatsappContact || undefined,
      emailContact: draft.emailContact || undefined,
      evaluationCriteria: criteria && criteria.length > 0 ? criteria : undefined,
    };

    submitTender.mutate(tenderData);
  };

  const handlePublishWithCriteria = () => {
    handlePublish(selectedCriteria);
  };

  const handlePublishWithoutCriteria = () => {
    handlePublish();
  };

  const handleBack = () => {
    navigate("/tenders/new/submission-process");
  };

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
            disabled={submitTender.isPending}
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
                5 / 5 (Optional)
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                What matters most?
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Pick up to 3 things that matter most in the proposals you receive.
              </p>
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">Optional:</span> This helps suppliers understand your priorities and submit better proposals.
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Criteria Options */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Criteria Options */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Select up to 3 ({selectedCriteria.length}/3 selected)
                  </p>
                  {CRITERIA_OPTIONS.map((criteria) => {
                    const isSelected = selectedCriteria.includes(criteria.id);
                    const isDisabled = !isSelected && selectedCriteria.length >= 3;

                    return (
                      <button
                        key={criteria.id}
                        type="button"
                        onClick={() => handleToggleCriteria(criteria.id)}
                        disabled={isDisabled || submitTender.isPending}
                        className={`w-full flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all text-left ${
                          isSelected
                            ? "border-[#E25E45] bg-[#E25E45]/5"
                            : isDisabled
                            ? "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        data-testid={`button-criteria-${criteria.id}`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? "border-[#E25E45] bg-[#E25E45]"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-4 w-4 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {criteria.label}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handlePublishWithCriteria}
                    disabled={selectedCriteria.length === 0 || submitTender.isPending}
                    className="w-full bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-publish-with-criteria"
                  >
                    {submitTender.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      `Publish with ${selectedCriteria.length} ${selectedCriteria.length === 1 ? 'criterion' : 'criteria'}`
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePublishWithoutCriteria}
                    disabled={submitTender.isPending}
                    className="w-full"
                    data-testid="button-publish-without"
                  >
                    {submitTender.isPending ? "Publishing..." : "Publish without criteria"}
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
