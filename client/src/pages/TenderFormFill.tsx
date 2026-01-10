import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Send, AlertCircle, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FormCard, getCardDefinition } from "@/lib/form-builder-types";
import { CardInputRenderer } from "@/components/form-builder/CardInputRenderer";
import { apiRequest, queryClient } from "@/lib/queryClient";

const FORM_STRUCTURE_KEY = "tender_form_structure";

export default function TenderFormFill() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [cards, setCards] = useState<FormCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(FORM_STRUCTURE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const cardsWithEmptyValues = parsed.map((card: FormCard) => ({
          ...card,
          value: getEmptyValue(card.type),
        }));
        setCards(cardsWithEmptyValues);
      } catch (e) {
        toast({
          title: "Error loading form",
          description: "Could not load the form structure. Please try again.",
          variant: "destructive",
        });
        navigate("/tenders/new/form-builder");
      }
    } else {
      navigate("/tenders/new/form-builder");
    }
  }, [navigate, toast]);

  const getEmptyValue = (type: string): any => {
    switch (type) {
      case "project-title":
      case "project-objective":
      case "project-description":
      case "custom-text":
      case "custom-textarea":
        return "";
      case "project-type":
      case "supplier-response":
      case "submission-deadline":
      case "custom-date":
      case "custom-select":
        return null;
      case "project-dates":
        return { startDate: null, endDate: null, deliveryDate: null };
      case "budget":
        return { type: "exact", amount: "", min: "", max: "" };
      case "key-deliverables":
      case "attachments":
        return [];
      case "evaluation-criteria":
        return [];
      default:
        return "";
    }
  };

  const updateCard = (id: string, updates: Partial<FormCard>) => {
    setCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
    );
  };

  const validateRequiredFields = (): { valid: boolean; missing: string[] } => {
    const missing: string[] = [];
    cards.forEach((card) => {
      if (card.isRequired) {
        const isEmpty = isValueEmpty(card.value, card.type);
        if (isEmpty) {
          missing.push(card.label);
        }
      }
    });
    return { valid: missing.length === 0, missing };
  };

  const isValueEmpty = (value: any, type: string): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (type === "project-dates") {
      return !value.startDate && !value.endDate;
    }
    if (type === "budget") {
      if (value.type === "exact") return !value.amount;
      return !value.min && !value.max;
    }
    return false;
  };

  const buildTenderData = () => {
    const data: any = {};
    cards.forEach((card) => {
      switch (card.type) {
        case "project-title":
          data.title = card.value;
          break;
        case "project-type":
          data.projectType = card.value;
          break;
        case "supplier-response":
          data.submissionType = card.value;
          break;
        case "project-dates":
          if (card.value) {
            data.startDate = card.value.startDate;
            data.endDate = card.value.endDate;
          }
          break;
        case "budget":
          if (card.value) {
            data.budgetType = card.value.type;
            if (card.value.type === "exact") {
              data.budget = card.value.amount ? parseFloat(card.value.amount) : null;
            } else {
              data.budgetMin = card.value.min ? parseFloat(card.value.min) : null;
              data.budgetMax = card.value.max ? parseFloat(card.value.max) : null;
            }
          }
          break;
        case "project-objective":
          data.objective = card.value;
          break;
        case "project-description":
          data.description = card.value;
          break;
        case "key-deliverables":
          data.deliverables = card.value;
          break;
        case "submission-deadline":
          data.submissionDeadline = card.value;
          break;
        case "evaluation-criteria":
          data.evaluationCriteria = card.value;
          break;
      }
    });
    return data;
  };

  const handleSubmit = async () => {
    const validation = validateRequiredFields();
    if (!validation.valid) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${validation.missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tenderData = buildTenderData();
      await apiRequest("POST", "/api/tenders", tenderData);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      localStorage.removeItem(FORM_STRUCTURE_KEY);
      toast({
        title: "Tender created!",
        description: "Your tender has been published successfully.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create tender",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStructure = () => {
    navigate("/tenders/new/form-builder");
  };

  const getFieldStatus = (card: FormCard) => {
    if (!card.isRequired) return null;
    const isEmpty = isValueEmpty(card.value, card.type);
    return isEmpty ? "incomplete" : "complete";
  };

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#E25E45] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleEditStructure}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Fill in Tender Details
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Complete all required fields to submit your tender
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleEditStructure}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit Structure
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#E25E45] hover:bg-[#d54d35] gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Tender"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {cards.map((card) => {
            const definition = getCardDefinition(card.type);
            const Icon = definition?.icon;
            const status = getFieldStatus(card);

            return (
              <div
                key={card.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  {Icon && (
                    <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-700">
                      <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                  <span className="flex-1 font-medium text-gray-900 dark:text-white">
                    {card.label}
                  </span>
                  {card.isRequired && (
                    <span className="text-xs text-[#E25E45] font-medium">Required</span>
                  )}
                  {status === "complete" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {status === "incomplete" && (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="p-4">
                  <CardInputRenderer card={card} onUpdate={updateCard} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={handleEditStructure}>
            Back to Edit Structure
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="bg-[#E25E45] hover:bg-[#d54d35] gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Tender"}
          </Button>
        </div>
      </div>
    </div>
  );
}
