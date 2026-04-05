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
  Copy,
  Languages,
} from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useTheme } from "next-themes";
import { FormCard, getCardDefinition, FIELD_INSIGHTS } from "@/lib/form-builder-types";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { StepIndicator } from "@/components/form-builder/StepIndicator";
import { useI18n, type Language } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import { TourBanner } from "@/lib/tour";
import { TOUR_BANNERS } from "@/lib/tour-steps";

const TENDER_STATE_KEY = "tender_form_state";

export default function TenderReview() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { t, language, isRtl } = useI18n();
  const { user } = useAuthStore();
  const [cards, setCards] = useState<FormCard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // RFP language & translation settings (required before launch)
  const [rfpLanguage, setRfpLanguage] = useState<Language>("en");
  const [allowTranslation, setAllowTranslation] = useState(false);

  // Template saving state
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateExpanded, setTemplateExpanded] = useState(true);

  const translatedInsightDescriptions: Record<string, string> = {
    'project-title': t('formBuilder.insightProjectTitleDesc'),
    'supplier-response': t('formBuilder.insightVendorResponseDesc'),
    'project-dates': t('formBuilder.insightTimelineDesc'),
    'budget': t('formBuilder.insightBudgetDesc'),
    'key-deliverables': t('formBuilder.insightDeliverablesDesc'),
    'milestones': t('formBuilder.insightMilestonesDesc'),
    'project-description': t('formBuilder.insightDescriptionDesc'),
    'submission-deadline': t('formBuilder.insightDeadlineDesc'),
    'evaluation-criteria': t('formBuilder.insightEvalDesc'),
    'attachments': t('formBuilder.insightAttachmentsDesc'),
  };

  const translatedCardLabels: Record<string, string> = {
    'project-title': t('formBuilder.cardProjectTitleLabel'),
    'supplier-response': t('formBuilder.cardVendorResponseLabel'),
    'project-dates': t('formBuilder.cardTimelineLabel'),
    'budget': t('formBuilder.cardBudgetLabel'),
    'key-deliverables': t('formBuilder.cardDeliverablesLabel'),
    'milestones': t('formBuilder.cardMilestonesLabel'),
    'project-description': t('formBuilder.cardDescriptionLabel'),
    'submission-deadline': t('formBuilder.cardDeadlineLabel'),
    'evaluation-criteria': t('formBuilder.cardEvalLabel'),
    'attachments': t('formBuilder.cardAttachmentsLabel'),
  };

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
          errors.push(translatedCardLabels[card.type] ?? card.label);
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
          data.title = card.value || undefined;
          break;

        case "supplier-response":
          if (card.value && typeof card.value === "object") {
            data.submissionType = card.value.submissionType || undefined;
            data.inquiryType = card.value.inquiryType || undefined;
            data.whatsappContact = card.value.whatsappContact || undefined;
            data.emailContact = card.value.emailContact || undefined;
          } else if (typeof card.value === "string") {
            data.submissionType = card.value; // backwards compat
          }
          break;

        case "project-dates":
          if (card.value) {
            data.startDate = card.value.startDate || undefined;
            data.endDate = card.value.endDate || undefined;
            // endDate as fallback deadline
            if (!data.deadline && card.value.endDate) {
              data.deadline = card.value.endDate;
            }
          }
          break;

        case "budget":
          if (card.value) {
            // Correct DB column name: showPriceToVendors
            data.showPriceToVendors = card.value.showToVendors !== false;
            if (card.value.type === "exact" && card.value.amount) {
              data.budget = String(card.value.amount);
            } else if (card.value.type === "range") {
              // DB expects integers — parse from input strings
              const min = parseInt(card.value.min);
              const max = parseInt(card.value.max);
              if (!isNaN(min)) data.budgetMin = min;
              if (!isNaN(max)) data.budgetMax = max;
            }
          }
          break;

        case "key-deliverables":
          // DB column is `deliverables`, expects {id, name, description, unit, quantity}[]
          if (Array.isArray(card.value) && card.value.length > 0) {
            data.deliverables = card.value.map((item: any) =>
              typeof item === "string"
                ? { id: `del-${Date.now()}`, name: item, description: "", unit: "", quantity: 1 }
                : { id: item.id || `del-${Date.now()}`, name: item.name || "", description: item.description || "", unit: item.unit || "", quantity: item.quantity ?? 1 }
            );
          }
          break;

        case "milestones":
          // Store project milestones in the milestones jsonb column
          if (Array.isArray(card.value) && card.value.length > 0) {
            data.milestones = card.value;
          }
          break;

        case "project-description":
          if (card.value && typeof card.value === "object" && "text" in card.value) {
            data.description = card.value.text || undefined;
            data.voiceNoteUrl = card.value.voiceNoteUrl || undefined;
            data.videoUrl = card.value.videoUrl || undefined;
          } else if (typeof card.value === "string" && card.value) {
            data.description = card.value;
          }
          break;

        case "submission-deadline":
          if (card.value) data.deadline = card.value;
          break;

        case "evaluation-criteria":
          if (card.value) data.evaluationCriteria = card.value;
          break;

        case "attachments":
          if (Array.isArray(card.value) && card.value.length > 0) {
            data.attachments = card.value;
          }
          break;

        default:
          // custom-* fields have no DB column — omitted to avoid Zod stripping noise
          break;
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

    const customCards = cards
      .filter(c => ['custom-text', 'custom-textarea', 'custom-date', 'custom-select'].includes(c.type))
      .map(c => ({ id: c.id, type: c.type, label: c.label, isRequired: c.isRequired, options: c.options, value: c.value }));
    if (customCards.length > 0) {
      data.formCards = customCards;
    }

    // Include the RFP language and translation settings
    data.language = rfpLanguage;
    data.allowTranslation = allowTranslation;

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
        title: t('tenderFlow.missingRequiredFields'),
        description: t('tenderFlow.fillRequiredBeforeLaunch'),
        variant: "destructive",
      });
      return;
    }

    if (saveAsTemplate && !templateName.trim()) {
      toast({
        title: t('tenderFlow.templateNameRequired'),
        description: t('tenderFlow.enterTemplateName'),
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
            title: t('tenderFlow.errorSavingTemplate'),
            description: t('tenderFlow.failedSaveTemplateContinuing'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('tenderFlow.templateSaved'),
            description: t('tenderFlow.templateSavedDesc'),
          });
        }
      }

      const tenderData = buildTenderData(cards);
      const response = await apiRequest("POST", "/api/tenders", tenderData);
      const createdTender = await response.json();
      localStorage.removeItem(TENDER_STATE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });

      const inviteLink = `${window.location.origin}/invite/${createdTender.invitationToken}`;
      toast({
        title: t('tenderFlow.rfpLaunchedTitle'),
        description: t('tenderFlow.rfpCreatedSuccess'),
        action: (
          <ToastAction altText={t('tenderFlow.copyInviteLink')} onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: t('tenderFlow.linkCopied') }); }}>
            <Copy className="h-3 w-3 mr-1" /> {t('tenderFlow.copyLink')}
          </ToastAction>
        ),
        duration: 10000,
      });

      setIsSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (error: any) {
      console.error("Error launching tender:", error);
      toast({
        title: t('tenderFlow.errorLaunchingRfp'),
        description: error?.message || t('tenderFlow.tryAgainLater'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SUPPLIER_RESPONSE_LABELS: Record<string, string> = {
    "quote_only": t('tenderFlow.priceOnly'),
    "tech_fin_proposal": t('tenderFlow.fullProposal'),
    "video_only": t('tenderFlow.videoPitch'),
    "tech_fin_with_video": t('tenderFlow.proposalVideo'),
  };

  const getDisplayValue = (card: FormCard): string => {
    if (card.value === null || card.value === undefined || card.value === "") {
      return t('tenderFlow.notProvided');
    }

    if (card.type === "supplier-response") {
      if (typeof card.value === "string") return SUPPLIER_RESPONSE_LABELS[card.value] || card.value;
      if (typeof card.value === "object" && card.value.submissionType) {
        const submission = SUPPLIER_RESPONSE_LABELS[card.value.submissionType] || card.value.submissionType;
        const inquiry = card.value.inquiryType === "inside_bid" ? t('tenderFlow.insideBidQA')
          : card.value.inquiryType === "email_whatsapp" ? t('tenderFlow.whatsappEmailQA')
          : null;
        return inquiry ? `${submission} · ${inquiry}` : submission;
      }
    }

    if (typeof card.value === "string") return card.value;

    if (Array.isArray(card.value)) {
      if (card.value.length === 0) return t('tenderFlow.notProvided');
      if (card.type === "key-deliverables" || card.type === "milestones") {
        return card.value.map((item: any) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && item.name) return item.name;
          return String(item);
        }).join(", ");
      }
      return card.value.join(", ");
    }

    if (typeof card.value === "object") {
      if (card.type === "project-description") {
        const v = card.value as any;
        const parts: string[] = [];
        if (v.text?.trim()) parts.push(v.text.trim());
        if (v.voiceNoteUrl) parts.push("🎙 " + t('formBuilder.voiceNoteAttached'));
        if (v.videoUrl) parts.push(`🎬 ${v.videoUrl}`);
        return parts.length > 0 ? parts.join("\n") : t('tenderFlow.notProvided');
      }
      if (card.type === "evaluation-criteria") {
        const v = card.value as any;
        if (v.weights) {
          const categoryLabels: Record<string, string> = {
            experience: t('tenderFlow.evalExperienceLabel'),
            financial: t('tenderFlow.evalFinancialLabel'),
            technical: t('tenderFlow.evalTechnicalLabel'),
          };
          const weightParts = (v.weights as any[])
            .filter(w => w.weight > 0)
            .map(w => `${categoryLabels[w.categoryId] || w.categoryId} ${w.weight}%`);
          const custom = (v.customCriteria as any[] || []).map(c => `${c.text} ${c.weight}%`);
          const all = [...weightParts, ...custom];
          return all.length > 0 ? all.join(", ") : t('tenderFlow.configured');
        }
        return t('tenderFlow.configured');
      }
      if (card.type === "budget") {
        const visibilityNote = card.value.showToVendors === false ? ` ${t('tenderFlow.hiddenFromVendorsNote')}` : "";
        if (card.value.type === "exact") {
          return `SAR ${card.value.amount?.toLocaleString() || 0}${visibilityNote}`;
        }
        return `SAR ${card.value.min?.toLocaleString() || 0} – ${card.value.max?.toLocaleString() || 0}${visibilityNote}`;
      }
      if (card.type === "milestones") {
        const count = card.value.length || 0;
        if (count === 0) return t('tenderFlow.noMilestonesAdded');
        return card.value.map((m: any) => m.name).join(", ");
      }
      if (card.type === "project-dates") {
        const parts = [];
        if (card.value.startDate) parts.push(`${t('tenderFlow.startLabelColon')} ${card.value.startDate}`);
        if (card.value.endDate) parts.push(`${t('tenderFlow.endLabelColon')} ${card.value.endDate}`);
        if (card.value.deliveryDate) parts.push(`${t('tenderFlow.deliveryLabel')} ${card.value.deliveryDate}`);
        return parts.length > 0 ? parts.join("  ·  ") : t('tenderFlow.notProvided');
      }
      if (card.type === "attachments") {
        const files = card.value as any[];
        return `${files.length} ${files.length !== 1 ? t('tenderFlow.filesLabel') : t('tenderFlow.fileLabel')}: ${files.map((f: any) => f.name).join(', ')}`;
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

          <StepIndicator
            steps={[
              { label: t('tenderFlow.stepStructure') },
              { label: t('tenderFlow.stepFillDetails') },
              { label: t('tenderFlow.stepReview') },
            ]}
            currentStep={3}
          />

          {/* Animated back button */}
          <Button
            onClick={handleBackToEdit}
            variant="outline"
            className="group relative overflow-hidden min-w-[120px] h-10"
          >
            <span className="translate-x-1 transition-opacity duration-300 group-hover:opacity-0">
              {t('tenderFlow.back')}
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-300 group-hover:w-full rounded-md">
              <ArrowLeft className="opacity-60 h-4 w-4" aria-hidden="true" />
            </i>
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
        {/* ── Headline ───────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
            {t('tenderFlow.reviewRfpTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            {t('tenderFlow.reviewRfpSubtitle')}
          </p>
        </div>

        {/* ── Onboarding hint ────────────────────────────────── */}
        {user && (
          <TourBanner
            tourId="hint-tender-review"
            userId={user.id}
            title={TOUR_BANNERS.tenderReview[language === 'ar' ? 'ar' : 'en'].title}
            body={TOUR_BANNERS.tenderReview[language === 'ar' ? 'ar' : 'en'].body}
            isRtl={isRtl}
          />
        )}

        {/* ── RFP Language & Translation Settings ────────────── */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg p-6 space-y-5">
          {/* RFP Language (required) */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Languages className="h-5 w-5 text-[#E8614D]" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {t('tenderFlow.rfpLanguageLabel')} <span className="text-red-500">*</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('tenderFlow.rfpLanguageDesc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRfpLanguage('en')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                  rfpLanguage === 'en'
                    ? 'border-[#E8614D] bg-[#E8614D]/10 text-[#E8614D]'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setRfpLanguage('ar')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                  rfpLanguage === 'ar'
                    ? 'border-[#E8614D] bg-[#E8614D]/10 text-[#E8614D]'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
              >
                العربية
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Allow Translation toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Languages className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('tenderFlow.allowTranslationLabel')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('tenderFlow.allowTranslationDesc')}
                </p>
              </div>
            </div>
            <Switch
              checked={allowTranslation}
              onCheckedChange={setAllowTranslation}
            />
          </div>
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
                {t('tenderFlow.stillMissing')}{" "}
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
                {t('tenderFlow.allFieldsReadyToLaunch')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Field review cards ──────────────────────────────────── */}
        <div className="space-y-6 mb-8">
          {cards.map((card, index) => {
            const definition = getCardDefinition(card.type);
            const Icon = definition?.icon;
            const hasValue = (() => {
              if (card.value === null || card.value === undefined || card.value === "") return false;
              if (Array.isArray(card.value) && card.value.length === 0) return false;
              if (card.type === "project-description" && typeof card.value === "object" && !Array.isArray(card.value)) {
                return !!(card.value.text?.trim() || card.value.voiceNoteUrl);
              }
              return true;
            })();

            const displayLabel = definition?.isCustom
              ? card.label
              : (translatedCardLabels[card.type] ?? card.label);
            const insight = FIELD_INSIGHTS[card.type];
            const insightDesc = translatedInsightDescriptions[card.type] || insight?.description;

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
                          {displayLabel}
                        </h3>
                        {card.isRequired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Star className="h-3 w-3" />
                            {t('tenderFlow.requiredBadge')}
                          </span>
                        )}
                      </div>
                      {insightDesc && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                          {insightDesc}
                        </p>
                      )}
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
            aria-expanded={templateExpanded}
            aria-controls="template-section"
            onClick={() => setTemplateExpanded(!templateExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#E8614D]/10 flex-shrink-0">
                <Save className="h-6 w-6 text-[#E8614D]" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('tenderFlow.saveAsTemplate')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('tenderFlow.reuseRfpStructure')}
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
                id="template-section"
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
                          {t('tenderFlow.saveRfpAsTemplate')}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t('tenderFlow.templatesCanBeReused')}
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
                            {t('tenderFlow.templateNameLabel')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder={t('tenderFlow.templateNamePlaceholder')}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E8614D] focus:border-transparent"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('tenderFlow.descriptionLabel')}
                          </label>
                          <textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder={t('tenderFlow.templateDescPlaceholder')}
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
        <div className="flex justify-center pb-12">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('tenderFlow.rfpLaunchedSuccess')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('tenderFlow.redirectingToDashboard')}</p>
              </motion.div>
            ) : (
              <motion.div key="buttons" className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEdit}
                  className="min-w-[160px] h-12 text-base"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  {t('tenderFlow.backToEdit')}
                </Button>
                <Button
                  onClick={handleLaunchTender}
                  disabled={isSubmitting || validationErrors.length > 0}
                  className="min-w-[160px] h-12 text-base bg-[#E8614D] hover:bg-[#D44D3A] disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  title={
                    validationErrors.length > 0
                      ? `${t('tenderFlow.completeRequiredFields')} ${validationErrors.join(", ")}`
                      : ""
                  }
                >
                  {isSubmitting ? t('tenderFlow.launching') : t('tenderFlow.launchRfp')}
                  <Rocket className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
      </div>
    </div>
  );
}
