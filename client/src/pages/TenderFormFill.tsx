import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Star,
} from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useTheme } from "next-themes";
import { FormCard, getCardDefinition, FIELD_INSIGHTS } from "@/lib/form-builder-types";
import { CardInputRenderer } from "@/components/form-builder/CardInputRenderer";
import { StepIndicator } from "@/components/form-builder/StepIndicator";

const WIZARD_STEPS = [{ label: "Structure" }, { label: "Fill Details" }, { label: "Review" }];

const TENDER_STATE_KEY = "tender_form_state";

export default function TenderFormFill() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [cards, setCards] = useState<FormCard[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const dotColor =
    theme === "dark"
      ? "rgba(139, 92, 246, 0.15)"
      : "rgba(156, 163, 175, 0.3)";

  useEffect(() => {
    const savedState = localStorage.getItem(TENDER_STATE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(parsed);
          setIsLoaded(true);
        } else {
          navigate("/tenders/new/form-builder");
        }
      } catch {
        navigate("/tenders/new/form-builder");
      }
    } else {
      navigate("/tenders/new/form-builder");
    }
  }, [navigate]);

  const handleUpdateCard = useCallback((id: string, updates: Partial<FormCard>) => {
    setCards((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      localStorage.setItem(TENDER_STATE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const { isFormValid, missingFields, completedRequired, totalRequired } = useMemo(() => {
    const required = cards.filter((c) => c.isRequired);
    const missing: string[] = [];
    let completed = 0;
    for (const card of required) {
      let isEmpty =
        card.value === null ||
        card.value === undefined ||
        card.value === "" ||
        (Array.isArray(card.value) && card.value.length === 0);
      if (!isEmpty && card.type === "project-description" && typeof card.value === "object" && !Array.isArray(card.value)) {
        isEmpty = !card.value.text?.trim() && !card.value.voiceNoteUrl;
      }
      if (isEmpty) {
        missing.push(card.label);
      } else {
        completed++;
      }
    }
    return {
      isFormValid: missing.length === 0,
      missingFields: missing,
      completedRequired: completed,
      totalRequired: required.length,
    };
  }, [cards]);

  const progressPercent =
    totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  const handleBack = () => navigate("/tenders/new/form-builder");

  const handleContinue = () => {
    if (!isFormValid) return;
    localStorage.setItem(TENDER_STATE_KEY, JSON.stringify(cards));
    navigate("/tenders/new/review");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8614D] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your form…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4 bg-gray-50 dark:bg-gray-900"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}
    >
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <img
            src={logoPath}
            alt="Bid"
            className="h-14 cursor-pointer hover:opacity-80 transition-opacity duration-300"
            onClick={() => navigate("/dashboard")}
          />

          {/* Step indicator */}
          <StepIndicator steps={WIZARD_STEPS} currentStep={2} />

          {/* Animated back button — same style as the template page */}
          <Button
            onClick={handleBack}
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
            Fill in your RFP details
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Complete each field below. Your progress is saved automatically as you type.
          </p>
        </div>

        {/* ── Progress bar ───────────────────────────────────────── */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {completedRequired} of {totalRequired} required fields complete
            </span>
            <span className="text-sm font-bold text-[#E8614D]">{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Required fields completion"
            className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#E8614D] to-[#F19A8F]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {progressPercent === 100 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              All required fields complete — ready to review!
            </motion.p>
          )}
        </div>

        {/* ── Partial-fill alert ─────────────────────────────────── */}
        <AnimatePresence>
          {!isFormValid && missingFields.length > 0 && completedRequired > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Still needed:{" "}
                <span className="font-semibold">{missingFields.join(", ")}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Field cards ────────────────────────────────────────── */}
        <div className="space-y-6 mb-10">
          {cards.map((card, index) => {
            const definition = getCardDefinition(card.type);
            const Icon = definition?.icon;
            const insight = FIELD_INSIGHTS[card.type];
            const hasValue = (() => {
              if (card.value === null || card.value === undefined || card.value === "") return false;
              if (Array.isArray(card.value) && card.value.length === 0) return false;
              if (card.type === "project-description" && typeof card.value === "object" && !Array.isArray(card.value)) {
                return !!(card.value.text?.trim() || card.value.voiceNoteUrl);
              }
              return true;
            })();

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
                className={`bg-white dark:bg-gray-800 rounded-2xl border-2 shadow-lg transition-all duration-300 ease-in-out ${
                  hasValue
                    ? "border-[#E8614D] shadow-[#E8614D]/10"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {/* Gradient top strip — fills in when card has a value */}
                <div
                  className={`h-1 rounded-t-2xl bg-gradient-to-r from-[#E8614D] to-[#F19A8F] transition-opacity duration-300 ${
                    hasValue ? "opacity-100" : "opacity-0"
                  }`}
                />

                <div className="p-8">
                  {/* Card header */}
                  <div className="flex items-start gap-4 mb-5">
                    {/* Icon — turns brand-colored when complete */}
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
                      <div className="flex items-center gap-2 flex-wrap mb-1">
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
                      {insight?.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          {insight.description}
                        </p>
                      )}
                    </div>

                    {/* Completion indicator */}
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
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500" />
                      ) : null}
                    </div>
                  </div>

                  {/* Input */}
                  <CardInputRenderer card={card} onUpdate={handleUpdateCard} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Bottom navigation ──────────────────────────────────── */}
        <div className="flex justify-center gap-4 pb-12">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="min-w-[160px] h-12 text-base"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Structure
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!isFormValid}
            className="min-w-[160px] h-12 text-base bg-[#E8614D] hover:bg-[#D44D3A] disabled:opacity-50 disabled:cursor-not-allowed text-white"
            title={
              !isFormValid
                ? `Complete required fields: ${missingFields.join(", ")}`
                : ""
            }
          >
            Review & Launch
            <Rocket className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
