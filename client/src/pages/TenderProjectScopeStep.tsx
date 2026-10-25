import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, X, Plus, Mic, ChevronDown, CalendarIcon, Video, Sparkles, Loader2 } from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";
import { useLocation } from "wouter";
import { useWizardNav } from "@/lib/wizard-nav";
import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import VoiceRecorder from "@/components/voice-recorder";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { getSuggestions } from "@/lib/tender-suggestions";
import { smartSuggestionEngine } from "@/lib/smart-suggestions";
import { SmartUnitDropdown, UNIT_LABELS_AR } from "@/components/ui/smart-unit-dropdown";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/usePlan";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { openUpgrade } from "@/lib/upgrade-store";
import { withViewTransition } from "@/lib/view-transition";
import { QuantityInput } from "@/components/ui/quantity-input";
import { parseQuantity, quantityErrorMessage } from "@shared/quantity";
import { BoqEditor } from "@/components/boq/BoqEditor";
import { flushSync } from "react-dom";
import { readBoq, type BoqDraft } from "@/lib/boq-draft";
import { validateItems } from "@shared/boq-items";

type InputMode = "text" | "voice";

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  unit: string;
  /** A number once validated; the raw text while it is being edited. */
  quantity: number | string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date | undefined;
}

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

function AutoGrowTextarea({ value, singleLine, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; singleLine?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onKeyDown={singleLine ? (e) => { if (e.key === "Enter") e.preventDefault(); } : undefined}
      {...props}
    />
  );
}

export default function TenderProjectScopeStep() {
  const [, navigate] = useLocation();
  const { goNext, goBack } = useWizardNav();
  const { t, language, isRtl } = useI18n();
  const { toast } = useToast();
  const { can: planCan } = usePlan();
  const dateLocale = language === 'ar' ? arLocale : undefined;
  const [keyDeliverables, setKeyDeliverables] = useState<Deliverable[]>([]);
  const [expandedDeliverableId, setExpandedDeliverableId] = useState<string | null>(null);
  const [projectDescription, setProjectDescription] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isSuggestingDescription, setIsSuggestingDescription] = useState(false);
  const [preAiDescription, setPreAiDescription] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [deliverableErrors, setDeliverableErrors] = useState<Record<string, Record<string, string>>>({});

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, Record<string, string>>>({});

  // Itemized requests (RFQ, or an RFP with itemized pricing) list their items in
  // the bill-of-quantities editor instead of deliverables (RFQ brief §4).
  const itemized = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("tenderDraft") || "{}").itemizedPricing === true; } catch { return false; }
  }, []);
  const [boq, setBoq] = useState<BoqDraft>(() => {
    try { return readBoq(JSON.parse(localStorage.getItem("tenderDraft") || "{}")); } catch { return readBoq(null); }
  });
  const [boqShowErrors, setBoqShowErrors] = useState(false);
  const boqValid = useMemo(() => validateItems(boq.items, boq.columns).ok, [boq]);

  const draft = useMemo(() => {
    try {
      const stored = localStorage.getItem("tenderDraft") || "{}";
      const parsed = JSON.parse(stored);

      if (parsed.title) {
        smartSuggestionEngine.updateContext("title", parsed.title);
      }

      if (parsed.keyDeliverables) {
        if (Array.isArray(parsed.keyDeliverables)) {
          if (parsed.keyDeliverables.length > 0 && typeof parsed.keyDeliverables[0] === 'string') {
            const migrated: Deliverable[] = parsed.keyDeliverables.map((name: string, index: number) => ({
              id: `migrated-${index}-${Date.now()}`,
              name,
              description: '',
              unit: '',
              quantity: 1,
            }));
            setKeyDeliverables(migrated);
          } else {
            setKeyDeliverables(parsed.keyDeliverables);
          }
        }
      }
      if (parsed.projectDescription) setProjectDescription(parsed.projectDescription);
      if (parsed.voiceNoteUrl) setVoiceNoteUrl(parsed.voiceNoteUrl);
      if (typeof parsed.videoUrl === "string") setVideoUrl(parsed.videoUrl);
      if (parsed.startDate) setStartDate(new Date(parsed.startDate));
      if (parsed.endDate) setEndDate(new Date(parsed.endDate));

      if (parsed.milestones && Array.isArray(parsed.milestones)) {
        const loadedMilestones: Milestone[] = parsed.milestones.map((m: { id: string; name: string; description: string; dueDate?: string }) => ({
          ...m,
          dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
        }));
        setMilestones(loadedMilestones);
      }

      return parsed;
    } catch {
      return {};
    }
  }, []);

  const [deliverableSuggestions, setDeliverableSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);

  // Persist every change as it happens (not just on "Next") so navigating
  // away mid-edit never drops deliverables, dates, or description text.
  // Skips the very first render, since that render still holds the pre-hydration
  // defaults set before the draft-loading effect above has populated them.
  const didHydrate = useRef(false);
  useEffect(() => {
    if (!didHydrate.current) {
      didHydrate.current = true;
      return;
    }
    try {
      const current = JSON.parse(localStorage.getItem("tenderDraft") || "{}");
      const serializedMilestones = milestones.map((m) => ({
        ...m,
        dueDate: m.dueDate?.toISOString(),
      }));
      localStorage.setItem(
        "tenderDraft",
        JSON.stringify({
          ...current,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          keyDeliverables,
          ...(itemized ? { boq } : {}),
          milestones: serializedMilestones,
          projectDescription: inputMode === "text" ? projectDescription : "",
          voiceNoteUrl: inputMode === "voice" ? voiceNoteUrl : "",
          videoUrl: videoUrl.trim() || "",
        })
      );
    } catch {
      // localStorage may be full / disabled — UI state still updates.
    }
  }, [startDate, endDate, keyDeliverables, boq, milestones, projectDescription, voiceNoteUrl, videoUrl, inputMode]);

  useEffect(() => {
    const generalDeliverable = getSuggestions("deliverable", language);
    const generalDescription = getSuggestions("description", language);

    setDeliverableSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("deliverable", generalDeliverable)
    );
    setDescriptionSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("description", generalDescription)
    );
  }, [draft.title, language]);

  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Focus to move after the list re-renders: a deliverable's name field, or the add button.
  const pendingFocus = useRef<string | "add" | null>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = target === "add" ? addButtonRef.current : nameInputRefs.current[target];
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [keyDeliverables, expandedDeliverableId]);

  // "Add another" (BID-UX-BUGFIX item 3): the deliverable being edited must be
  // complete first — if it is not, its errors are shown in place (it stays
  // open) and focus moves to the first problem. Otherwise it collapses into its
  // summary card and a new deliverable opens below it with focus in its name.
  const handleAddDeliverable = () => {
    const current = keyDeliverables.find((d) => d.id === expandedDeliverableId) ?? keyDeliverables[keyDeliverables.length - 1];
    if (current) {
      const errors = validateDeliverable(current);
      if (Object.keys(errors).length > 0) {
        setDeliverableErrors((prev) => ({ ...prev, [current.id]: errors }));
        setExpandedDeliverableId(current.id);
        const firstField = (["name", "unit", "quantity", "description"] as const).find((f) => errors[f]);
        requestAnimationFrame(() => {
          const id = firstField === "name" ? `deliverable-name-${current.id}`
            : firstField === "quantity" ? `deliverable-quantity-${current.id}`
            : firstField === "description" ? `deliverable-description-${current.id}` : null;
          const el = id ? document.getElementById(id) : document.querySelector<HTMLElement>(`#deliverable-panel-${current.id} [role="combobox"]`);
          el?.focus();
        });
        return;
      }
    }
    const newDeliverableItem: Deliverable = {
      id: `deliverable-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: '',
      description: '',
      unit: '',
      quantity: 1,
    };
    pendingFocus.current = newDeliverableItem.id;
    withViewTransition(() => {
      setKeyDeliverables((prev) => [...prev, newDeliverableItem]);
      setExpandedDeliverableId(newDeliverableItem.id);
    });
  };

  const handleRemoveDeliverable = (id: string) => {
    setKeyDeliverables((prev) => prev.filter((d) => d.id !== id));
    setDeliverableErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (expandedDeliverableId === id) {
      setExpandedDeliverableId(null);
    }
    pendingFocus.current = "add";
  };

  const handleUpdateDeliverable = (id: string, field: keyof Deliverable, value: string | number) => {
    setKeyDeliverables((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
    setDeliverableErrors((prev) => {
      if (prev[id]?.[field]) {
        const updated = { ...prev };
        delete updated[id][field];
        if (Object.keys(updated[id]).length === 0) {
          delete updated[id];
        }
        return updated;
      }
      return prev;
    });
  };

  const validateDeliverable = (deliverable: Deliverable): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!deliverable.name.trim()) {
      errors.name = t('tenderFlow.deliverableNameRequired');
    } else if (countWords(deliverable.name) > 10) {
      errors.name = t('tenderFlow.nameTooLong');
    }

    if (deliverable.description && countWords(deliverable.description) > 50) {
      errors.description = t('tenderFlow.descTooLong');
    }

    if (!deliverable.unit.trim()) {
      errors.unit = t('tenderFlow.unitRequired');
    } else if (countWords(deliverable.unit) > 5) {
      errors.unit = t('tenderFlow.unitTooLong');
    }

    const quantity = parseQuantity(deliverable.quantity);
    if (!quantity.ok) {
      const message = quantityErrorMessage(quantity.error);
      errors.quantity = t(message.key, message.vars);
    }

    return errors;
  };

  // A typed quantity that cannot be used is explained as soon as the field is
  // left (Next stays disabled until it is fixed); an empty field is only
  // flagged when the user tries to move on.
  const handleQuantityBlur = (deliverable: Deliverable) => {
    if (String(deliverable.quantity ?? "").trim() === "") return;
    const quantity = parseQuantity(deliverable.quantity);
    if (quantity.ok) return;
    const message = quantityErrorMessage(quantity.error);
    setDeliverableErrors((prev) => ({ ...prev, [deliverable.id]: { ...(prev[deliverable.id] ?? {}), quantity: t(message.key, message.vars) } }));
  };

  const validateAllDeliverables = (): boolean => {
    const allErrors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    keyDeliverables.forEach((deliverable) => {
      const errors = validateDeliverable(deliverable);
      if (Object.keys(errors).length > 0) {
        allErrors[deliverable.id] = errors;
        hasErrors = true;
      }
    });

    setDeliverableErrors(allErrors);
    return !hasErrors;
  };

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      description: '',
      dueDate: undefined,
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
    setMilestoneErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleUpdateMilestone = (id: string, field: keyof Milestone, value: string | Date | undefined) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
    setMilestoneErrors((prev) => {
      if (prev[id]?.[field]) {
        const updated = { ...prev };
        delete updated[id][field];
        if (Object.keys(updated[id]).length === 0) {
          delete updated[id];
        }
        return updated;
      }
      return prev;
    });
  };

  const validateMilestone = (milestone: Milestone): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!milestone.name.trim()) {
      errors.name = t('tenderFlow.milestoneNameRequired');
    } else if (countWords(milestone.name) > 10) {
      errors.name = t('tenderFlow.nameTooLong');
    }

    if (milestone.description && countWords(milestone.description) > 50) {
      errors.description = t('tenderFlow.descTooLong');
    }

    if (milestone.dueDate && startDate && endDate) {
      if (milestone.dueDate < startDate) {
        errors.dueDate = t('tenderFlow.dueDateAfterStart');
      } else if (milestone.dueDate > endDate) {
        errors.dueDate = t('tenderFlow.dueDateBeforeEnd');
      }
    }

    return errors;
  };

  const validateAllMilestones = (): boolean => {
    const allErrors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    milestones.forEach((milestone) => {
      const errors = validateMilestone(milestone);
      if (Object.keys(errors).length > 0) {
        allErrors[milestone.id] = errors;
        hasErrors = true;
      }
    });

    setMilestoneErrors(allErrors);
    return !hasErrors;
  };

  const handleNext = () => {
    if (itemized && !boqValid) {
      // Render the errors now, then take the user to the first one.
      flushSync(() => setBoqShowErrors(true));
      document.querySelector<HTMLElement>('[data-testid="boq-editor"] [aria-invalid="true"], [data-testid="boq-add-item"]')?.focus();
      return;
    }
    const deliverablesValid = itemized || validateAllDeliverables();

    let milestonesValid = true;
    if (milestones.length > 0) {
      milestonesValid = validateAllMilestones();
    }

    if (!deliverablesValid) {
      const freshDeliverableErrors: Record<string, Record<string, string>> = {};
      keyDeliverables.forEach((deliverable) => {
        const errors = validateDeliverable(deliverable);
        if (Object.keys(errors).length > 0) {
          freshDeliverableErrors[deliverable.id] = errors;
        }
      });
      const errorIds = Object.keys(freshDeliverableErrors);
      if (errorIds.length > 0) {
        setExpandedDeliverableId(errorIds[0]);
      }
      return;
    }

    if (!milestonesValid) {
      return;
    }

    if (isFormValid) {
      const serializedMilestones = milestones.map((m) => ({
        ...m,
        dueDate: m.dueDate?.toISOString(),
      }));

      // Validated above: store each quantity as its exact number.
      const normalizedDeliverables = keyDeliverables.map((d) => {
        const quantity = parseQuantity(d.quantity);
        return quantity.ok ? { ...d, quantity: quantity.value } : d;
      });
      const updated = {
        ...draft,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        keyDeliverables: itemized ? [] : normalizedDeliverables,
        ...(itemized ? { boq } : {}),
        milestones: serializedMilestones,
        projectDescription: inputMode === "text" ? projectDescription.trim() : "",
        voiceNoteUrl: inputMode === "voice" ? voiceNoteUrl : "",
        videoUrl: videoUrl.trim() || "",
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      goNext("/tenders/new/ai-budget");
    }
  };

  const handleBack = () => {
    goBack("/tenders/new/title");
  };

  const isDeliverableComplete = (d: Deliverable) => !!d.name.trim() && !!d.unit.trim() && parseQuantity(d.quantity).ok;

  const areDeliverablesComplete = keyDeliverables.length > 0 && keyDeliverables.every(isDeliverableComplete);

  const hasAtLeastOneCompleteDeliverable = keyDeliverables.some(isDeliverableComplete);

  const isTimelineComplete = startDate !== undefined && endDate !== undefined;

  const descriptionWordCount = countWords(projectDescription);
  const restOfStepValid = isTimelineComplete && (inputMode === "text" ? descriptionWordCount >= 10 : voiceNoteUrl.length > 0);
  const isFormValid = restOfStepValid && (itemized ? boqValid : areDeliverablesComplete);
  // Itemized: Next stays available once the rest is complete, so pressing it can
  // show (and focus) what is wrong with the items instead of a silent disabled button.
  const nextEnabled = itemized ? restOfStepValid : isFormValid;

  const maxDescriptionChars = 5000;
  const descriptionCharCount = projectDescription.length;

  const namedDeliverables = keyDeliverables.filter((d) => d.name.trim());

  const handleSuggestDescription = async () => {
    if (!planCan('aiBuilder')) { openUpgrade('aiBuilder'); return; }
    if (namedDeliverables.length === 0 || isSuggestingDescription) return;
    const previousDescription = projectDescription;
    setIsSuggestingDescription(true);
    try {
      const res = await apiRequest("POST", "/api/tenders/suggest-description", {
        title: draft.title,
        deliverables: namedDeliverables.map((d) => {
          const quantity = parseQuantity(d.quantity);
          return { name: d.name, description: d.description, unit: d.unit, quantity: quantity.ok ? quantity.value : undefined };
        }),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        milestones: milestones
          .filter((m) => m.name.trim())
          .map((m) => ({ name: m.name, description: m.description, dueDate: m.dueDate?.toISOString() })),
        language,
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => null);
        toast({
          title: t('common.error'),
          description: data?.retryAfterSeconds
            ? t('tenderFlow.suggestDescriptionRateLimited').replace('{seconds}', String(data.retryAfterSeconds))
            : t('tenderFlow.suggestDescriptionFailed'),
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) throw new Error("Failed to generate description");
      const data = await res.json();
      setProjectDescription(data.description);
      setPreAiDescription(previousDescription);
      toast({ title: t('tenderFlow.descriptionGenerated') });
    } catch {
      toast({
        title: t('common.error'),
        description: t('tenderFlow.suggestDescriptionFailed'),
        variant: "destructive",
      });
    } finally {
      setIsSuggestingDescription(false);
    }
  };

  const handleUndoAiDescription = () => {
    if (preAiDescription === null) return;
    setProjectDescription(preAiDescription);
    setPreAiDescription(null);
  };

  const showTimeline = itemized ? boq.items.length > 0 : hasAtLeastOneCompleteDeliverable;
  const showMilestones = isTimelineComplete;
  const showDescription = isTimelineComplete;

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 max-sm:mb-5">
          <BidLogo variant="orange" size={64} className="cursor-pointer hover:opacity-80 transition-opacity max-sm:!text-[40px]" onClick={() => navigate("/dashboard")} />
          <Button
            onClick={handleBack}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              {t('tenderFlow.back')}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-sm:gap-5">
          <div>
            <div className="space-y-4 max-sm:space-y-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400" dir="ltr">
                2 / 5
              </div>
              <h1 className="font-display font-black text-5xl max-sm:text-3xl text-gray-900 dark:text-foreground leading-[0.92] tracking-[-0.045em]">
                {t('tenderFlow.step2Title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-sm:text-base">
                {t('tenderFlow.step2Desc')}
              </p>
            </div>
          </div>

          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />

              <div className="p-8 max-sm:p-5 space-y-6">
                {itemized ? (
                  <BoqEditor value={boq} onChange={setBoq} showAllErrors={boqShowErrors} />
                ) : (
                <div className="space-y-4">
                  <div>
                    <h2 id="deliverables-heading" className="block text-sm font-medium text-gray-900 dark:text-foreground">
                      {t('tenderFlow.keyDeliverables')}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('tenderFlow.defineDeliverables')}
                    </p>
                  </div>

                  {keyDeliverables.length > 0 && (
                    <ol className="space-y-3" aria-labelledby="deliverables-heading">
                      {keyDeliverables.map((deliverable, index) => {
                        const isExpanded = expandedDeliverableId === deliverable.id;
                        const errors = deliverableErrors[deliverable.id] || {};
                        const hasErrors = Object.keys(errors).length > 0;
                        const quantity = parseQuantity(deliverable.quantity);
                        const unitLabel = isRtl ? (UNIT_LABELS_AR[deliverable.unit] ?? deliverable.unit) : deliverable.unit;
                        const panelId = `deliverable-panel-${deliverable.id}`;

                        return (
                          <li
                            key={deliverable.id}
                            className={`border rounded-lg overflow-hidden transition-colors duration-200 motion-reduce:transition-none ${
                              hasErrors
                                ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                                : isExpanded
                                  ? 'border-[#FE3C01]/40 bg-white dark:bg-card'
                                  : 'border-border dark:border-border bg-gray-50 dark:bg-card'
                            }`}
                            data-testid={`deliverable-card-${index}`}
                          >
                            <div className="flex items-stretch">
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                aria-controls={panelId}
                                onClick={() => withViewTransition(() => setExpandedDeliverableId(isExpanded ? null : deliverable.id))}
                                className="active:opacity-70 flex-1 min-w-0 min-h-[44px] flex items-start gap-3 px-4 py-3 text-start hover:bg-muted dark:hover:bg-gray-700/50 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FE3C01]"
                                data-testid={`button-toggle-deliverable-${index}`}
                              >
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0" dir="ltr">
                                  #{index + 1}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-gray-900 dark:text-foreground line-clamp-2 break-words">
                                      {deliverable.name || t('tenderFlow.newDeliverable')}
                                    </span>
                                    {quantity.ok && deliverable.unit && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                                        <bdi>{quantity.text}</bdi> × {unitLabel}
                                      </span>
                                    )}
                                    {hasErrors && (
                                      <span className="text-xs text-red-500 font-medium">
                                        {t('tenderFlow.incomplete')}
                                      </span>
                                    )}
                                  </span>
                                  {!isExpanded && deliverable.description.trim() && (
                                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                      {deliverable.description}
                                    </span>
                                  )}
                                </span>
                                <ChevronDown aria-hidden="true" className={`h-4 w-4 mt-0.5 shrink-0 text-gray-400 transition-transform duration-300 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDeliverable(deliverable.id)}
                                aria-label={t('tenderFlow.removeDeliverable', { number: index + 1 })}
                                className="active:opacity-70 min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FE3C01]"
                                data-testid={`button-remove-deliverable-${index}`}
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>

                            <div
                              id={panelId}
                              hidden={!isExpanded}
                              className="px-4 pb-4 space-y-4 border-t border-border dark:border-border pt-4"
                            >
                              <div className="space-y-1">
                                <label htmlFor={`deliverable-name-${deliverable.id}`} className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                  {t('tenderFlow.deliverableName')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                  id={`deliverable-name-${deliverable.id}`}
                                  ref={(el) => { nameInputRefs.current[deliverable.id] = el; }}
                                  type="text"
                                  value={deliverable.name}
                                  onChange={(e) => handleUpdateDeliverable(deliverable.id, 'name', e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                  placeholder={t('tenderFlow.deliverableNamePlaceholder')}
                                  aria-invalid={!!errors.name || undefined}
                                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-background text-gray-900 dark:text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent ${
                                    errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                  data-testid={`input-deliverable-name-${index}`}
                                />
                                <div className="flex justify-between items-center">
                                  {errors.name ? (
                                    <span className="text-xs text-red-500">{errors.name}</span>
                                  ) : (
                                    <span className="text-xs text-gray-400">{t('tenderFlow.max10Words')}</span>
                                  )}
                                  <span className={`text-xs ${countWords(deliverable.name) > 10 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {countWords(deliverable.name)} / 10 {t('tenderFlow.words')}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label htmlFor={`deliverable-description-${deliverable.id}`} className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                  {t('tenderFlow.description')} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
                                </label>
                                <textarea
                                  id={`deliverable-description-${deliverable.id}`}
                                  value={deliverable.description}
                                  onChange={(e) => handleUpdateDeliverable(deliverable.id, 'description', e.target.value)}
                                  placeholder={t('tenderFlow.describeDeliverable')}
                                  rows={2}
                                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-background text-gray-900 dark:text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent resize-none ${
                                    errors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                  data-testid={`input-deliverable-description-${index}`}
                                />
                                <div className="flex justify-between items-center">
                                  {errors.description ? (
                                    <span className="text-xs text-red-500">{errors.description}</span>
                                  ) : (
                                    <span className="text-xs text-gray-400">{t('tenderFlow.max50Words')}</span>
                                  )}
                                  <span className={`text-xs ${countWords(deliverable.description) > 50 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {countWords(deliverable.description)} / 50 {t('tenderFlow.words')}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                    {t('tenderFlow.unitOfMeasurement')} <span className="text-red-500">*</span>
                                  </label>
                                  <SmartUnitDropdown
                                    value={deliverable.unit}
                                    onChange={(value) => handleUpdateDeliverable(deliverable.id, 'unit', value)}
                                    deliverableName={deliverable.name}
                                    deliverableDescription={deliverable.description}
                                    projectTitle={draft.title || ''}
                                    error={errors.unit}
                                    data-testid={`input-deliverable-unit-${index}`}
                                  />
                                  {errors.unit && (
                                    <span className="text-xs text-red-500">{errors.unit}</span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <label htmlFor={`deliverable-quantity-${deliverable.id}`} className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                    {t('tenderFlow.quantity')} <span className="text-red-500">*</span>
                                  </label>
                                  <QuantityInput
                                    id={`deliverable-quantity-${deliverable.id}`}
                                    value={deliverable.quantity}
                                    onValueChange={(raw) => handleUpdateDeliverable(deliverable.id, 'quantity', raw)}
                                    onBlur={() => handleQuantityBlur(deliverable)}
                                    invalid={!!errors.quantity}
                                    placeholder={t('tenderFlow.quantityPlaceholder')}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-background text-gray-900 dark:text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent ${
                                      errors.quantity ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    data-testid={`input-deliverable-quantity-${index}`}
                                  />
                                  {errors.quantity && (
                                    <span className="text-xs text-red-500">{errors.quantity}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {keyDeliverables.length === 0 && (
                    <div className="text-center py-6 bg-gray-50 dark:bg-card rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('tenderFlow.noDeliverablesYet')}
                      </p>
                    </div>
                  )}

                  <Button
                    ref={addButtonRef}
                    type="button"
                    variant="outline"
                    onClick={handleAddDeliverable}
                    className="w-full h-11 border-dashed border-[#FE3C01]/50 text-[#FE3C01] hover:bg-[#FE3C01]/5 hover:text-[#FE3C01]"
                    data-testid="button-add-deliverable"
                  >
                    <Plus className="h-4 w-4 me-1" aria-hidden="true" />
                    {keyDeliverables.length === 0 ? t('tenderFlow.addDeliverable') : t('tenderFlow.addAnotherDeliverable')}
                  </Button>
                </div>
                )}

                <div
                  className={`space-y-3 border-t border-border dark:border-border pt-6 transition-all duration-300 ease-out ${
                    showTimeline
                      ? "opacity-100 max-h-[10000px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-900 dark:text-foreground">
                    {t('tenderFlow.projectTimeline')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t('tenderFlow.startDate')}</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-start font-normal overflow-hidden",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="me-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{startDate ? format(startDate, "PPP", { locale: dateLocale }) : t('tenderFlow.selectDate')}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={(date) => date < new Date()}
                            locale={dateLocale}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t('tenderFlow.endDate')}</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-start font-normal overflow-hidden",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="me-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{endDate ? format(endDate, "PPP", { locale: dateLocale }) : t('tenderFlow.selectDate')}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={(date) =>
                              date < new Date() || (startDate ? date < startDate : false)
                            }
                            locale={dateLocale}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div
                  className={`space-y-4 border-t border-border dark:border-border pt-6 transition-all duration-300 ease-out ${
                    showMilestones
                      ? "opacity-100 max-h-[10000px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-foreground">
                      {t('tenderFlow.milestones')} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    {milestones.map((milestone, index) => {
                      const errors = milestoneErrors[milestone.id] || {};
                      const hasErrors = Object.keys(errors).length > 0;

                      return (
                        <div
                          key={milestone.id}
                          className={`group flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg transition-all duration-200 ${
                            hasErrors
                              ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800'
                              : 'bg-gray-50 dark:bg-card/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          data-testid={`milestone-row-${index}`}
                        >
                          <div className="flex-shrink-0 mt-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                              milestone.name.trim()
                                ? 'bg-[#FE3C01]'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <AutoGrowTextarea
                              singleLine
                              value={milestone.name}
                              onChange={(e) => handleUpdateMilestone(milestone.id, 'name', e.target.value)}
                              placeholder={t('tenderFlow.milestoneName')}
                              className={`w-full bg-transparent border-0 border-b text-base md:text-sm font-medium text-gray-900 dark:text-foreground placeholder-gray-400 focus:outline-none focus:ring-0 transition-colors duration-200 py-2 md:py-0 md:pb-1 resize-none overflow-hidden block ${
                                errors.name
                                  ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                                  : 'border-transparent focus:border-[#FE3C01]'
                              }`}
                              data-testid={`input-milestone-name-${index}`}
                            />
                            {errors.name && (
                              <span className="text-xs text-red-500">{errors.name}</span>
                            )}

                            <AutoGrowTextarea
                              value={milestone.description}
                              onChange={(e) => handleUpdateMilestone(milestone.id, 'description', e.target.value)}
                              placeholder={t('tenderFlow.addDescription')}
                              rows={1}
                              className={`w-full bg-transparent border-0 text-base md:text-xs py-1.5 md:py-0 text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:outline-none focus:ring-0 resize-none overflow-hidden block transition-all duration-200 ${
                                milestone.description ? 'opacity-100' : 'opacity-60 focus:opacity-100'
                              }`}
                              onFocus={(e) => {
                                if (!milestone.description) {
                                  e.target.rows = 2;
                                }
                              }}
                              onBlur={(e) => {
                                if (!milestone.description) {
                                  e.target.rows = 1;
                                }
                              }}
                              data-testid={`input-milestone-description-${index}`}
                            />
                            {errors.description && (
                              <span className="text-xs text-red-500">{errors.description}</span>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 px-2 py-1 min-h-11 min-w-11 md:min-h-0 md:min-w-0 text-xs rounded-md transition-all duration-200",
                                    milestone.dueDate
                                      ? "bg-[#FE3C01]/10 text-[#FE3C01] hover:bg-[#FE3C01]/20"
                                      : "text-gray-400 hover:text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700",
                                    errors.dueDate && "ring-1 ring-red-300"
                                  )}
                                >
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">
                                    {milestone.dueDate ? format(milestone.dueDate, "MMM d", { locale: dateLocale }) : t('tenderFlow.date')}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  selected={milestone.dueDate}
                                  onSelect={(date) => handleUpdateMilestone(milestone.id, 'dueDate', date)}
                                  disabled={(date) =>
                                    (startDate ? date < startDate : false) ||
                                    (endDate ? date > endDate : false)
                                  }
                                  locale={dateLocale}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {errors.dueDate && (
                              <span className="text-xs text-red-500 block mt-1">{errors.dueDate}</span>
                            )}
                          </div>

                          <button
                            onClick={() => handleRemoveMilestone(milestone.id)}
                            className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            data-testid={`button-remove-milestone-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      onClick={handleAddMilestone}
                      className="active:scale-[0.98] w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border dark:border-border text-gray-400 hover:border-[#FE3C01] hover:text-[#FE3C01] transition-all duration-200 group"
                      data-testid="button-add-milestone"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[#FE3C01] transition-colors duration-200" />
                      </div>
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">{t('tenderFlow.addMilestone')}</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('tenderFlow.trackMilestones')}
                  </p>
                </div>

                <div
                  className={`space-y-3 border-t border-border dark:border-border pt-6 transition-all duration-300 ease-out ${
                    showDescription
                      ? "opacity-100 max-h-[10000px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-foreground">
                      {t('tenderFlow.projectDescription')}
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={() => withViewTransition(() => setInputMode("text"))}
                        className={`active:opacity-70 px-3 py-3 md:py-1 text-xs rounded-md transition-colors ${
                          inputMode === "text"
                            ? "bg-[#FE3C01] text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-muted-foreground dark:text-muted-foreground"
                        }`}
                        data-testid="button-text-mode"
                      >
                        {t('tenderFlow.text')}
                      </button>
                      <button
                        onClick={() => withViewTransition(() => setInputMode("voice"))}
                        className={`active:opacity-70 px-3 py-3 md:py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                          inputMode === "voice"
                            ? "bg-[#FE3C01] text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-muted-foreground dark:text-muted-foreground"
                        }`}
                        data-testid="button-voice-mode"
                      >
                        <Mic className="h-3 w-3" />
                        {t('tenderFlow.voice')}
                      </button>
                    </div>
                  </div>

                  {inputMode === "text" && (
                    <>
                      <div className="flex justify-end items-center gap-3">
                        {preAiDescription !== null && (
                          <button
                            type="button"
                            onClick={handleUndoAiDescription}
                            className="active:opacity-70 text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                            data-testid="button-undo-ai-description"
                          >
                            {t('tenderFlow.undo')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSuggestDescription}
                          disabled={namedDeliverables.length === 0 || isSuggestingDescription}
                          className="enabled:active:opacity-70 flex items-center gap-1.5 min-h-11 md:min-h-0 text-xs font-medium text-[#FE3C01] hover:text-[#d54d35] disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                          data-testid="button-suggest-description"
                          title={namedDeliverables.length === 0 ? t('tenderFlow.suggestDescriptionNeedsDeliverables') : undefined}
                        >
                          {isSuggestingDescription ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {isSuggestingDescription ? t('tenderFlow.suggestingDescription') : t('tenderFlow.suggestDescriptionWithAi')}
                          {!planCan('aiBuilder') && <PlanBadge feature="aiBuilder" />}
                        </button>
                      </div>
                      <AutocompleteInput
                        value={projectDescription}
                        onChange={setProjectDescription}
                        suggestions={descriptionSuggestions}
                        placeholder={t('tenderFlow.descriptionPlaceholder')}
                        maxLength={maxDescriptionChars}
                        type="textarea"
                        rows={6}
                        data-testid="textarea-project-description"
                      />
                      <div className="flex justify-between items-center text-xs">
                        <p className={descriptionWordCount < 10 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                          {descriptionWordCount < 10 ? `${10 - descriptionWordCount} ${t('tenderFlow.moreWordsNeeded')}` : `${t('tenderFlow.minWordCountMet')} ✓`}
                        </p>
                        <p className="text-gray-400">{descriptionWordCount} {t('tenderFlow.words')} · {descriptionCharCount}/{maxDescriptionChars}</p>
                      </div>
                    </>
                  )}

                  {inputMode === "voice" && (
                    <div className="py-2">
                      <VoiceRecorder
                        onRecordingComplete={(url) => setVoiceNoteUrl(url)}
                        onRecordingDeleted={() => setVoiceNoteUrl("")}
                        existingUrl={voiceNoteUrl || undefined}
                        maxDurationSeconds={300}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t('tenderFlow.recordVoice')}
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className={`space-y-4 border-t border-border dark:border-border pt-6 transition-all duration-300 ease-out ${
                    showDescription
                      ? "opacity-100 max-h-[10000px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-[#FE3C01]" />
                    <label className="block text-sm font-medium text-gray-900 dark:text-foreground">
                      {t('tenderFlow.videoUrlLabel') || 'Video URL'} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="url"
                      dir="ltr"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/..."
                      data-testid="input-video-url"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('tenderFlow.videoUrlHint') || 'Optionally share a video that explains the project scope to vendors.'}
                    </p>
                  </div>

                </div>

                <div className="flex gap-3 pt-6 border-t border-border dark:border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    {t('tenderFlow.back')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    // Keep focus where it is on press: blurring a field first would show its
                    // error, shift the layout and make the click miss this button.
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!nextEnabled}
                    className="flex-1 bg-[#FE3C01] hover:bg-[#d54d35] disabled:opacity-100 disabled:bg-[#E9E4DC] disabled:text-[var(--bid-stone)] disabled:shadow-none"
                    data-testid="button-next"
                  >
                    {t('tenderFlow.next')}
                    <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
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
