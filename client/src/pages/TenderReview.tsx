import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, AlertCircle, CheckCircle2, Save, ChevronDown, ChevronUp } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { FormCard, getCardDefinition } from "@/lib/form-builder-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";

const TENDER_STATE_KEY = "tender_form_state";

export default function TenderReview() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [cards, setCards] = useState<FormCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Template saving state
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateExpanded, setTemplateExpanded] = useState(false);

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
            // Use end date as deadline if no explicit deadline is set
            if (!data.deadline && card.value.endDate) {
              data.deadline = card.value.endDate;
            }
          }
          break;
        case "budget":
          if (card.value) {
            if (card.value.type === "exact") {
              data.budget = String(card.value.amount);
            } else {
              data.budgetMin = card.value.min;
              data.budgetMax = card.value.max;
            }
          }
          break;
        case "project-objective":
          data.projectObjective = card.value;
          // Use objective as description fallback if no explicit description
          if (!data.description && card.value) {
            data.description = card.value;
          }
          break;
        case "key-deliverables":
          data.keyDeliverables = card.value;
          break;
        case "project-description":
          // Server schema expects 'description' field
          data.description = card.value;
          break;
        case "submission-deadline":
          // Server schema expects 'deadline' field
          data.deadline = card.value;
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

    // Ensure required fields have values (use title as fallback for description)
    if (!data.description) {
      data.description = data.title || "No description provided";
    }
    if (!data.deadline) {
      // Default to 30 days from now if no deadline specified
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 30);
      data.deadline = defaultDeadline.toISOString().split('T')[0];
    }

    return data;
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      return false;
    }

    try {
      // Build template structure WITH values - so users can reuse filled data
      const templateStructure = cards.map((card) => {
        const templateCard: {
          id: string;
          type: string;
          label: string;
          isRequired: boolean;
          placeholder?: string;
          options?: string[];
          value?: any;
        } = {
          id: card.id,
          type: card.type,
          label: card.label,
          isRequired: card.isRequired,
        };

        if (card.placeholder) {
          templateCard.placeholder = card.placeholder;
        }
        if (card.options && card.options.length > 0) {
          templateCard.options = card.options;
        }
        // Include the value so templates can be reused with pre-filled data
        if (card.value !== null && card.value !== undefined && card.value !== "") {
          templateCard.value = card.value;
        }

        return templateCard;
      });

      await apiRequest("POST", "/api/templates", {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        cards: templateStructure,
      });

      return true;
    } catch (error: any) {
      console.error("Error saving template:", error?.message || error);
      return false;
    }
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

    // Validate template name if saving as template
    if (saveAsTemplate && !templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your template",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save template first if requested
      if (saveAsTemplate) {
        const templateSaved = await handleSaveTemplate();
        if (!templateSaved) {
          toast({
            title: "Error saving template",
            description: "Failed to save template, but continuing with tender launch",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Template saved",
            description: "Your template has been saved successfully",
          });
        }
      }

      const tenderData = buildTenderData(cards);

      await apiRequest("POST", "/api/tenders", tenderData);

      localStorage.removeItem(TENDER_STATE_KEY);

      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });

      toast({
        title: "Tender launched!",
        description: "Your tender has been created successfully",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error launching tender:", error);
      toast({
        title: "Error launching tender",
        description: error?.message || "Please try again later",
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

        {/* Save as Template Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setTemplateExpanded(!templateExpanded)}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#E25E45]/10">
                <Save className="h-5 w-5 text-[#E25E45]" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Save as Template
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reuse this tender structure for future projects
                </p>
              </div>
            </div>
            {templateExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {templateExpanded && (
            <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700">
              <div className="pt-5 space-y-4">
                {/* Toggle Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Save this tender as a template
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Templates can be reused when creating new tenders
                    </p>
                  </div>
                  <Switch
                    checked={saveAsTemplate}
                    onCheckedChange={(checked) => {
                      setSaveAsTemplate(checked);
                      if (!checked) {
                        setTemplateName("");
                        setTemplateDescription("");
                      }
                    }}
                  />
                </div>

                {saveAsTemplate && (
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {/* Template Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Template Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Marketing Campaign Tender"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                      />
                    </div>

                    {/* Template Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Description
                      </label>
                      <textarea
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Describe what this template is for and when to use it..."
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none"
                      />
                    </div>

                    {/* Template Info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        The template will save the form structure (fields and their settings) without the actual values you've entered.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
