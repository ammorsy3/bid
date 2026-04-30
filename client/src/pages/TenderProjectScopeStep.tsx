import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, X, Plus, Mic, ChevronDown, CalendarIcon, Video } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import VoiceRecorder from "@/components/voice-recorder";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { getSuggestions } from "@/lib/tender-suggestions";
import { smartSuggestionEngine } from "@/lib/smart-suggestions";
import { SmartUnitDropdown, UNIT_LABELS_AR } from "@/components/ui/smart-unit-dropdown";
import { useI18n } from "@/lib/i18n";

type InputMode = "text" | "voice";

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
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

export default function TenderProjectScopeStep() {
  const [, navigate] = useLocation();
  const { t, language, isRtl } = useI18n();
  const dateLocale = language === 'ar' ? arLocale : undefined;
  const [keyDeliverables, setKeyDeliverables] = useState<Deliverable[]>([]);
  const [expandedDeliverableId, setExpandedDeliverableId] = useState<string | null>(null);
  const [projectDescription, setProjectDescription] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoRequired, setVideoRequired] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [deliverableErrors, setDeliverableErrors] = useState<Record<string, Record<string, string>>>({});

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, Record<string, string>>>({});

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
      if (typeof parsed.videoRequired === "boolean") setVideoRequired(parsed.videoRequired);
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

  const handleAddDeliverable = () => {
    const newDeliverableItem: Deliverable = {
      id: `deliverable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      description: '',
      unit: '',
      quantity: 1,
    };
    setKeyDeliverables([...keyDeliverables, newDeliverableItem]);
    setExpandedDeliverableId(newDeliverableItem.id);
  };

  const handleRemoveDeliverable = (id: string) => {
    setKeyDeliverables(keyDeliverables.filter((d) => d.id !== id));
    setDeliverableErrors((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (expandedDeliverableId === id) {
      setExpandedDeliverableId(null);
    }
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

    if (!deliverable.quantity || deliverable.quantity < 1) {
      errors.quantity = t('tenderFlow.quantityMin');
    } else if (!Number.isInteger(deliverable.quantity)) {
      errors.quantity = t('tenderFlow.quantityWhole');
    }

    return errors;
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
    const deliverablesValid = validateAllDeliverables();

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

      const updated = {
        ...draft,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        keyDeliverables,
        milestones: serializedMilestones,
        projectDescription: inputMode === "text" ? projectDescription.trim() : "",
        voiceNoteUrl: inputMode === "voice" ? voiceNoteUrl : "",
        videoUrl: videoUrl.trim() || "",
        videoRequired,
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/ai-budget");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/title");
  };

  const areDeliverablesComplete = keyDeliverables.length > 0 && keyDeliverables.every(
    (d) => d.name.trim() && d.unit.trim() && d.quantity >= 1
  );

  const hasAtLeastOneCompleteDeliverable = keyDeliverables.some(
    (d) => d.name.trim() && d.unit.trim() && d.quantity >= 1
  );

  const isTimelineComplete = startDate !== undefined && endDate !== undefined;

  const descriptionWordCount = countWords(projectDescription);
  const isFormValid =
    isTimelineComplete &&
    areDeliverablesComplete &&
    (inputMode === "text" ? descriptionWordCount >= 50 : voiceNoteUrl.length > 0);

  const maxDescriptionChars = 5000;
  const descriptionCharCount = projectDescription.length;

  const showTimeline = hasAtLeastOneCompleteDeliverable;
  const showMilestones = isTimelineComplete;
  const showDescription = isTimelineComplete;

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

        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                2 / 5
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {t('tenderFlow.step2Title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('tenderFlow.step2Desc')}
              </p>
            </div>
          </div>

          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t('tenderFlow.keyDeliverables')}
                    </label>
                    <Button
                      onClick={handleAddDeliverable}
                      size="sm"
                      className="bg-[#E25E45] hover:bg-[#d54d35]"
                      data-testid="button-add-deliverable"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('tenderFlow.addDeliverable')}
                    </Button>
                  </div>

                  {keyDeliverables.length > 0 ? (
                    <div className="space-y-3">
                      {keyDeliverables.map((deliverable, index) => {
                        const isExpanded = expandedDeliverableId === deliverable.id;
                        const errors = deliverableErrors[deliverable.id] || {};
                        const hasErrors = Object.keys(errors).length > 0;

                        return (
                          <div
                            key={deliverable.id}
                            className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                              hasErrors
                                ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                            }`}
                            data-testid={`deliverable-card-${index}`}
                          >
                            <div
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                              onClick={() => setExpandedDeliverableId(isExpanded ? null : deliverable.id)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  #{index + 1}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white truncate">
                                  {deliverable.name || t('tenderFlow.newDeliverable')}
                                </span>
                                {deliverable.quantity > 0 && deliverable.unit && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                                    {deliverable.quantity} × {isRtl ? (UNIT_LABELS_AR[deliverable.unit] ?? deliverable.unit) : deliverable.unit}
                                  </span>
                                )}
                                {hasErrors && (
                                  <span className="text-xs text-red-500 font-medium">
                                    {t('tenderFlow.incomplete')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveDeliverable(deliverable.id);
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                                  data-testid={`button-remove-deliverable-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </div>

                            <div
                              className={`grid transition-all duration-300 ease-in-out ${
                                isExpanded
                                  ? 'grid-rows-[1fr] opacity-100'
                                  : 'grid-rows-[0fr] opacity-0'
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {t('tenderFlow.deliverableName')} <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={deliverable.name}
                                    onChange={(e) => handleUpdateDeliverable(deliverable.id, 'name', e.target.value)}
                                    placeholder={t('tenderFlow.deliverableNamePlaceholder')}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${
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
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {t('tenderFlow.description')} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
                                  </label>
                                  <textarea
                                    value={deliverable.description}
                                    onChange={(e) => handleUpdateDeliverable(deliverable.id, 'description', e.target.value)}
                                    placeholder={t('tenderFlow.describeDeliverable')}
                                    rows={2}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none ${
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
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
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
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                      {t('tenderFlow.quantity')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={deliverable.quantity}
                                      onChange={(e) => handleUpdateDeliverable(deliverable.id, 'quantity', parseInt(e.target.value) || 0)}
                                      placeholder={t('tenderFlow.quantityPlaceholder')}
                                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${
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
                            </div>
                          </div>
                        </div>
                        );

                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('tenderFlow.noDeliverablesYet')}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('tenderFlow.defineDeliverables')}
                  </p>
                </div>

                <div
                  className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showTimeline
                      ? "opacity-100 max-h-[300px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
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
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP", { locale: dateLocale }) : t('tenderFlow.selectDate')}
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
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP", { locale: dateLocale }) : t('tenderFlow.selectDate')}
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
                  className={`space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showMilestones
                      ? "opacity-100 max-h-[1000px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
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
                          className={`group flex items-start gap-3 p-3 rounded-lg transition-all duration-200 ${
                            hasErrors
                              ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800'
                              : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          data-testid={`milestone-row-${index}`}
                        >
                          <div className="flex-shrink-0 mt-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                              milestone.name.trim()
                                ? 'bg-[#E25E45]'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <input
                              type="text"
                              value={milestone.name}
                              onChange={(e) => handleUpdateMilestone(milestone.id, 'name', e.target.value)}
                              placeholder={t('tenderFlow.milestoneName')}
                              className={`w-full bg-transparent border-0 border-b text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0 transition-colors duration-200 pb-1 ${
                                errors.name
                                  ? 'border-red-300 dark:border-red-600 focus:border-red-500'
                                  : 'border-transparent focus:border-[#E25E45]'
                              }`}
                              data-testid={`input-milestone-name-${index}`}
                            />
                            {errors.name && (
                              <span className="text-xs text-red-500">{errors.name}</span>
                            )}

                            <textarea
                              value={milestone.description}
                              onChange={(e) => handleUpdateMilestone(milestone.id, 'description', e.target.value)}
                              placeholder={t('tenderFlow.addDescription')}
                              rows={1}
                              className={`w-full bg-transparent border-0 text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:outline-none focus:ring-0 resize-none transition-all duration-200 ${
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
                                    "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-all duration-200",
                                    milestone.dueDate
                                      ? "bg-[#E25E45]/10 text-[#E25E45] hover:bg-[#E25E45]/20"
                                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700",
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
                      className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[#E25E45] hover:text-[#E25E45] transition-all duration-200 group"
                      data-testid="button-add-milestone"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[#E25E45] transition-colors duration-200" />
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
                  className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showDescription
                      ? "opacity-100 max-h-[800px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t('tenderFlow.projectDescription')}
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setInputMode("text")}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          inputMode === "text"
                            ? "bg-[#E25E45] text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                        data-testid="button-text-mode"
                      >
                        {t('tenderFlow.text')}
                      </button>
                      <button
                        onClick={() => setInputMode("voice")}
                        className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                          inputMode === "voice"
                            ? "bg-[#E25E45] text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
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
                        <p className={descriptionWordCount < 50 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                          {descriptionWordCount < 50 ? `${50 - descriptionWordCount} ${t('tenderFlow.moreWordsNeeded')}` : `${t('tenderFlow.minWordCountMet')} ✓`}
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
                  className={`space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showDescription
                      ? "opacity-100 max-h-[600px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-[#E25E45]" />
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t('tenderFlow.videoUrlLabel') || 'Video URL'} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/..."
                      data-testid="input-video-url"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('tenderFlow.videoUrlHint') || 'Optionally share a video that explains the project scope to vendors.'}
                    </p>
                  </div>

                  <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor="switch-video-required"
                        className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                      >
                        {t('tenderFlow.requireVideoLabel') || 'Require vendors to submit a video pitch'}
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('tenderFlow.requireVideoHint') || 'Vendors will be required to provide a video link when submitting their offer.'}
                      </p>
                    </div>
                    <Switch
                      id="switch-video-required"
                      checked={videoRequired}
                      onCheckedChange={setVideoRequired}
                      data-testid="switch-video-required"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    disabled={!isFormValid}
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    {t('tenderFlow.next')}
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
