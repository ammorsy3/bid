import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useTheme } from "next-themes";
import { FormCard, getCardDefinition } from "@/lib/form-builder-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";

const TENDER_STATE_KEY = "tender_form_state";

export default function TenderReview() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [cards, setCards] = useState<FormCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Template saving state
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateExpanded, setTemplateExpanded] = useState(false);

  const dotColor =
    theme === "dark"
      ? "rgba(139, 92, 246, 0.15)"
      : "rgba(156, 163, 175, 0.3)";

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
        let isEmpty =
          card.value === null ||
          card.value === undefined ||
          card.value === "" ||
          (Array.isArray(card.value) && card.value.length === 0);

        // Special case: project-description is an object — empty when no text AND no voice note
        if (!isEmpty && card.type === "project-description" && typeof card.value === "object" && !Array.isArray(card.value)) {
          isEmpty = !card.value.text?.trim() && !card.value.voiceNoteUrl;
        }

        if (isEmpty) {
          errors.push(card.label);
        }
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleBackToEdit = () => {
    navigate("/tenders/new/fill");
  };

  const buildTenderData = (cards: FormCard[]): Record<string, any> => {
    const data: Record<string, any> = {};

    for (const card of cards) {
      switch (card.type) {
        case "project-title":
          data.title = card.value;
          break;
        case "supplier-response":
          data.submissionType = card.value;
          break;
        case "project-dates":
          if (card.value) {
            data.startDate = card.value.startDate;
            data.endDate = card.value.endDate;
            data.deliveryDate = card.value.deliveryDate;
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
          if (!data.description && card.value) {
            data.description = card.value;
          }
          break;
        case "key-deliverables":
          data.keyDeliverables = card.value;
          break;
        case "project-description":
          if (card.value && typeof card.value === "object" && "text" in card.value) {
            data.description = card.value.text || undefined;
            data.voiceNoteUrl = card.value.voiceNoteUrl || undefined;
            data.videoUrl = card.value.videoUrl || undefined;
          } else {
            data.description = card.value;
          }
          break;
        case "submission-deadline":
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

    if (!data.description) {
      data.description = data.title || "No description provided";
    }
    if (!data.deadline) {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 30);
      data.deadline = defaultDeadline.toISOString().split("T")[0];
    }

    return data;
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      return false;
    }

    try {
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

        if (card.placeholder) templateCard.placeholder = card.placeholder;
        if (card.options && card.options.length > 0) templateCard.options = card.options;
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
      if (saveAsTemplate) {
        const templateSaved = await handleSaveTemplate();
        if (!templateSaved) {
          toast({
            title: "Error saving template",
            description: "Failed to save template, but continuing with RFP launch",
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
        title: "RFP launched!",
        description: "Your RFP has been created successfully",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error launching tender:", error);
      toast({
        title: "Error launching RFP",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SUPPLIER_RESPONSE_LABELS: Record<string, string> = {
    "quote_only": "Price Only",
    "tech_fin_proposal": "Full Proposal",
    "video_only": "Video Pitch",
    "tech_fin_with_video": "Proposal + Video",
  };

  const getDisplayValue = (card: FormCard): string => {
    if (card.value === null || card.value === undefined || card.value === "") {
      return "Not provided";
    }

    if (card.type === "supplier-response" && typeof card.value === "string") {
      return SUPPLIER_RESPONSE_LABELS[card.value] || card.value;
    }

    if (typeof card.value === "string") return card.value;

    if (Array.isArray(card.value)) {
      if (card.value.length === 0) return "Not provided";
      if (card.type === "key-deliverables") {
        return card.value.map((item: any) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && item.name) return item.name;
          return String(item);
        }).join(", ");
      }
      return card.value.join(", ");
    }

    if (typeof card.value === "object") {
      if (card.type === "evaluation-criteria") {
        // New structure: { requirements, weights, customCriteria }
        const v = card.value as any;
        if (v.weights) {
          const weightParts = (v.weights as any[])
            .filter(w => w.weight > 0)
            .map(w => {
              const labels: Record<string, string> = { experience: "Experience", financial: "Financial", technical: "Technical" };
              return `${labels[w.categoryId] || w.categoryId} ${w.weight}%`;
            });
          const custom = (v.customCriteria as any[] || []).map(c => `${c.text} ${c.weight}%`);
          const all = [...weightParts, ...custom];
          return all.length > 0 ? all.join(", ") : "Configured";
        }
        return "Configured";
      }
      if (card.type === "budget") {
        if (card.value.type === "exact") {
          return `SAR ${card.value.amount?.toLocaleString() || 0}`;
        }
        return `SAR ${card.value.min?.toLocaleString() || 0} – ${card.value.max?.toLocaleString() || 0}`;
      }
      if (card.type === "project-dates") {
        const parts = [];
        if (card.value.startDate) parts.push(`Start: ${card.value.startDate}`);
        if (card.value.endDate) parts.push(`End: ${card.value.endDate}`);
        if (card.value.deliveryDate) parts.push(`Delivery: ${card.value.deliveryDate}`);
        return parts.length > 0 ? parts.join("  ·  ") : "Not provided";
      }
      return JSON.stringify(card.value);
    }

    return String(card.value);
  };

  return (
    <div
      className="min-h-screen py-8 px-4 bg-gray-50 dark:bg-gray-900"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}
    >
      <div className="max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <img
            src={logoPath}
            alt="Bid"
            className="h-14 cursor-pointer hover:opacity-80 transition-opacity duration-300"
            onClick={() => navigate("/dashboard")}
          />

          {/* Step pills */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="text-gray-400 font-medium">Structure</span>
            </div>
            <div className="w-8 h-px bg-green-500" />
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="text-gray-400 font-medium">Fill Details</span>
            </div>
            <div className="w-8 h-px bg-[#E8614D]" />
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-[#E8614D] text-white flex items-center justify-center font-bold">
                3
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">Review</span>
            </div>
          </div>

          {/* Animated back button */}
          <Button
            onClick={handleBackToEdit}
            variant="outline"
            className="group relative overflow-hidden min-w-[120px] h-10"
          >
            <span className="translate-x-1 transition-opacity duration-300 group-hover:opacity-0">
              Back
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-300 group-hover:w-full rounded-md">
              <ArrowLeft className="opacity-60 h-4 w-4" aria-hidden="true" />
            </i>
          </Button>
        </div>

        {/* ── Headline ───────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
            Review your RFP
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Everything looks good? Go back to edit, or launch when you're ready.
          </p>
        </div>

        {/* ── Status banner ──────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {validationErrors.length > 0 ? (
            <motion.div
              key="errors"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Still missing:{" "}
                <span className="font-semibold">{validationErrors.join(", ")}</span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                All fields complete — ready to launch!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Field review cards ──────────────────────────────────── */}
        <div className="space-y-6 mb-8">
          {cards.map((card, index) => {
            const definition = getCardDefinition(card.type);
            const Icon = definition?.icon;
            const hasValue =
              card.value !== null &&
              card.value !== undefined &&
              card.value !== "" &&
              !(Array.isArray(card.value) && card.value.length === 0);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
                className={`bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-lg transition-all duration-300 ease-in-out ${
                  hasValue
                    ? "border-[#E8614D] shadow-[#E8614D]/10"
                    : card.isRequired
                    ? "border-red-300 dark:border-red-700"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {/* Gradient top strip */}
                <div
                  className={`h-1 rounded-t-2xl bg-gradient-to-r from-[#E8614D] to-[#F19A8F] transition-opacity duration-300 ${
                    hasValue ? "opacity-100" : "opacity-0"
                  }`}
                />

                <div className="p-8">
                  {/* Card header */}
                  <div className="flex items-start gap-4 mb-5">
                    {Icon && (
                      <div
                        className={`p-3 rounded-xl flex-shrink-0 transition-all duration-300 ease-in-out ${
                          hasValue
                            ? "bg-[#E8614D] text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-xl font-bold transition-colors duration-300 ${
                            hasValue
                              ? "text-[#E8614D]"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {card.label}
                        </h3>
                        {card.isRequired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Star className="h-3 w-3" />
                            Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {hasValue ? (
                        <motion.div
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        >
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        </motion.div>
                      ) : card.isRequired ? (
                        <AlertCircle className="h-6 w-6 text-red-400" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Value display */}
                  <div
                    className={`ml-[3.25rem] text-sm leading-relaxed whitespace-pre-wrap ${
                      hasValue
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500 italic"
                    }`}
                  >
                    {getDisplayValue(card)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Save as Template ────────────────────────────────────── */}
        <div className="mb-10 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setTemplateExpanded(!templateExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#E8614D]/10 flex-shrink-0">
                <Save className="h-6 w-6 text-[#E8614D]" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Save as Template
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reuse this RFP structure for future projects
                </p>
              </div>
            </div>
            {templateExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
            )}
          </button>

          <AnimatePresence>
            {templateExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          Save this RFP as a template
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Templates can be reused when creating new RFPs
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Template Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="e.g., Marketing Campaign RFP"
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8614D] focus:border-transparent"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Description
                          </label>
                          <textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder="Describe what this template is for and when to use it..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8614D] focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom navigation ──────────────────────────────────── */}
        <div className="flex justify-center gap-4 pb-12">
          <Button
            type="button"
            variant="outline"
            onClick={handleBackToEdit}
            className="min-w-[160px] h-12 text-base"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Edit
          </Button>
          <Button
            onClick={handleLaunchTender}
            disabled={isSubmitting || validationErrors.length > 0}
            className="min-w-[160px] h-12 text-base bg-[#E8614D] hover:bg-[#D44D3A] disabled:opacity-50 disabled:cursor-not-allowed text-white"
            title={
              validationErrors.length > 0
                ? `Complete required fields: ${validationErrors.join(", ")}`
                : ""
            }
          >
            {isSubmitting ? "Launching…" : "Launch RFP"}
            <Rocket className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
