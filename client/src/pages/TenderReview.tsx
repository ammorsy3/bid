import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, AlertCircle, CheckCircle2 } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { FormCard, getCardDefinition } from "@/lib/form-builder-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const TENDER_STATE_KEY = "tender_form_state";

export default function TenderReview() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [cards, setCards] = useState<FormCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const savedState = localStorage.getItem(TENDER_STATE_KEY);
    if (savedState) {
      try {
        const parsedCards = JSON.parse(savedState);
        setCards(parsedCards);
        validateCards(parsedCards);
      } catch (e) {
        navigate("/tenders/new/form-builder");
      }
    } else {
      navigate("/tenders/new/form-builder");
    }
  }, [navigate]);

  const validateCards = (cardsToValidate: FormCard[]) => {
    const errors: string[] = [];
    
    for (const card of cardsToValidate) {
      if (card.isRequired) {
        const isEmpty = 
          card.value === null || 
          card.value === undefined || 
          card.value === "" ||
          (Array.isArray(card.value) && card.value.length === 0);
        
        if (isEmpty) {
          errors.push(`${card.label} is required`);
        }
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleBackToEdit = () => {
    navigate("/tenders/new/form-builder");
  };

  const buildTenderData = (cards: FormCard[]): Record<string, any> => {
    const data: Record<string, any> = {};

    for (const card of cards) {
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
            data.deliveryDate = card.value.deliveryDate;
          }
          break;
        case "budget":
          if (card.value) {
            if (card.value.type === "exact") {
              data.budget = card.value.amount;
            } else {
              data.budgetMin = card.value.min;
              data.budgetMax = card.value.max;
            }
          }
          break;
        case "project-objective":
          data.projectObjective = card.value;
          break;
        case "key-deliverables":
          data.keyDeliverables = card.value;
          break;
        case "project-description":
          data.projectDescription = card.value;
          break;
        case "submission-deadline":
          data.submissionDeadline = card.value;
          break;
        case "evaluation-criteria":
          data.evaluationCriteria = card.value;
          break;
        case "attachments":
          data.attachments = card.value;
          break;
        default:
          if (card.type.startsWith("custom-")) {
            if (!data.customFields) data.customFields = [];
            data.customFields.push({
              label: card.label,
              type: card.type,
              value: card.value,
              options: card.options,
            });
          }
      }
    }

    return data;
  };

  const handleLaunchTender = async () => {
    if (!validateCards(cards)) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before launching",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const tenderData = buildTenderData(cards);
      
      await apiRequest("POST", "/api/tenders", tenderData);

      localStorage.removeItem(TENDER_STATE_KEY);
      
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });

      toast({
        title: "Tender launched!",
        description: "Your tender has been created successfully",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error launching tender",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayValue = (card: FormCard): string => {
    if (card.value === null || card.value === undefined || card.value === "") {
      return "Not set";
    }
    
    if (typeof card.value === "string") {
      return card.value;
    }
    
    if (Array.isArray(card.value)) {
      return card.value.length > 0 ? `${card.value.length} items` : "Not set";
    }
    
    if (typeof card.value === "object") {
      if (card.type === "budget") {
        if (card.value.type === "exact") {
          return `SAR ${card.value.amount?.toLocaleString() || 0}`;
        }
        return `SAR ${card.value.min?.toLocaleString() || 0} - ${card.value.max?.toLocaleString() || 0}`;
      }
      if (card.type === "project-dates") {
        const parts = [];
        if (card.value.startDate) parts.push(`Start: ${card.value.startDate}`);
        if (card.value.endDate) parts.push(`End: ${card.value.endDate}`);
        if (card.value.deliveryDate) parts.push(`Delivery: ${card.value.deliveryDate}`);
        return parts.length > 0 ? parts.join(" | ") : "Not set";
      }
      return JSON.stringify(card.value);
    }
    
    return String(card.value);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={logoPath}
              alt="Bid"
              className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/dashboard")}
            />
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Review Your Tender
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Check everything before launching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleBackToEdit}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
            <Button
              onClick={handleLaunchTender}
              disabled={isSubmitting || validationErrors.length > 0}
              className="bg-[#E25E45] hover:bg-[#d54d35]"
            >
              {isSubmitting ? "Launching..." : "Launch Tender"}
              <Rocket className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-200">
                  Please complete the following required fields:
                </h3>
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 dark:text-red-300">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {validationErrors.length === 0 && cards.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="font-medium text-green-800 dark:text-green-200">
                All required fields are complete. Ready to launch!
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {cards.map((card) => {
            const definition = getCardDefinition(card.type);
            const Icon = definition?.icon;
            const hasValue = card.value !== null && card.value !== undefined && card.value !== "" && 
              !(Array.isArray(card.value) && card.value.length === 0);
            
            return (
              <div
                key={card.id}
                className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-5 ${
                  card.isRequired && !hasValue
                    ? "border-red-300 dark:border-red-700"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  {Icon && (
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                      <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {card.label}
                      </h3>
                      {card.isRequired && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${hasValue ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500 italic"}`}>
                      {getDisplayValue(card)}
                    </div>
                  </div>
                  {hasValue ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : card.isRequired ? (
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
