import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, X, Plus, Mic, ChevronDown, CalendarIcon } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import VoiceRecorder from "@/components/voice-recorder";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { getSuggestions } from "@/lib/tender-suggestions";
import { smartSuggestionEngine } from "@/lib/smart-suggestions";
import { SmartUnitDropdown } from "@/components/ui/smart-unit-dropdown";

type InputMode = "text" | "voice";

// Bill of Quantities Deliverable structure
export interface Deliverable {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
}

// Milestone structure
export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date | undefined;
}

// Helper to count words
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export default function TenderProjectScopeStep() {
  const [, navigate] = useLocation();
  const [keyDeliverables, setKeyDeliverables] = useState<Deliverable[]>([]);
  const [expandedDeliverableId, setExpandedDeliverableId] = useState<string | null>(null);
  const [projectDescription, setProjectDescription] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");

  // Timeline state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Validation errors for deliverables
  const [deliverableErrors, setDeliverableErrors] = useState<Record<string, Record<string, string>>>({});

  // Milestones state
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneErrors, setMilestoneErrors] = useState<Record<string, Record<string, string>>>({});

  const draft = useMemo(() => {
    try {
      const stored = localStorage.getItem("tenderDraft") || "{}";
      const parsed = JSON.parse(stored);

      // Initialize smart suggestion engine with project title
      if (parsed.title) {
        smartSuggestionEngine.updateContext("title", parsed.title);
      }

      // Load existing data if available
      if (parsed.keyDeliverables) {
        // Handle both old format (string[]) and new format (Deliverable[])
        if (Array.isArray(parsed.keyDeliverables)) {
          if (parsed.keyDeliverables.length > 0 && typeof parsed.keyDeliverables[0] === 'string') {
            // Migrate old format to new format
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
      if (parsed.startDate) setStartDate(new Date(parsed.startDate));
      if (parsed.endDate) setEndDate(new Date(parsed.endDate));

      // Load milestones
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

  // Get smart suggestions based on context
  const [deliverableSuggestions, setDeliverableSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Update smart suggestions when context changes
    const generalDeliverable = getSuggestions("deliverable");
    const generalDescription = getSuggestions("description");

    setDeliverableSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("deliverable", generalDeliverable)
    );
    setDescriptionSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("description", generalDescription)
    );
  }, [draft.title]);

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
    // Clear errors for removed deliverable
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
    // Clear specific field error when user starts typing
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

    // Name validation: required, max 10 words
    if (!deliverable.name.trim()) {
      errors.name = 'Deliverable name is required';
    } else if (countWords(deliverable.name) > 10) {
      errors.name = 'Name must be 10 words or less';
    }

    // Description validation: optional, max 50 words
    if (deliverable.description && countWords(deliverable.description) > 50) {
      errors.description = 'Description must be 50 words or less';
    }

    // Unit validation: required, max 5 words
    if (!deliverable.unit.trim()) {
      errors.unit = 'Unit of measurement is required';
    } else if (countWords(deliverable.unit) > 5) {
      errors.unit = 'Unit must be 5 words or less';
    }

    // Quantity validation: required, integer, min 1
    if (!deliverable.quantity || deliverable.quantity < 1) {
      errors.quantity = 'Quantity must be at least 1';
    } else if (!Number.isInteger(deliverable.quantity)) {
      errors.quantity = 'Quantity must be a whole number';
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

  // Milestone CRUD handlers
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
    // Clear errors for removed milestone
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
    // Clear specific field error when user makes changes
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

    // Name validation: required, max 10 words
    if (!milestone.name.trim()) {
      errors.name = 'Milestone name is required';
    } else if (countWords(milestone.name) > 10) {
      errors.name = 'Name must be 10 words or less';
    }

    // Description validation: optional, max 50 words
    if (milestone.description && countWords(milestone.description) > 50) {
      errors.description = 'Description must be 50 words or less';
    }

    // Due date validation: must be within project timeline if set
    if (milestone.dueDate && startDate && endDate) {
      if (milestone.dueDate < startDate) {
        errors.dueDate = 'Due date must be on or after project start date';
      } else if (milestone.dueDate > endDate) {
        errors.dueDate = 'Due date must be on or before project end date';
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
    // Validate all deliverables before proceeding
    const deliverablesValid = validateAllDeliverables();

    // Validate all milestones (only if there are any)
    let milestonesValid = true;
    if (milestones.length > 0) {
      milestonesValid = validateAllMilestones();
    }

    // Handle validation errors - deliverables first, then milestones
    if (!deliverablesValid) {
      // Get fresh error state after validation
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
      // Errors will be shown inline - no expansion needed
      return;
    }

    if (isFormValid) {
      // Serialize milestones with ISO date strings
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
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/ai-budget");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/title");
  };

  // Check if all deliverables are complete (have required fields)
  const areDeliverablesComplete = keyDeliverables.length > 0 && keyDeliverables.every(
    (d) => d.name.trim() && d.unit.trim() && d.quantity >= 1
  );

  // Check if at least one deliverable is complete (for progressive disclosure)
  const hasAtLeastOneCompleteDeliverable = keyDeliverables.some(
    (d) => d.name.trim() && d.unit.trim() && d.quantity >= 1
  );

  // Check if timeline is complete
  const isTimelineComplete = startDate !== undefined && endDate !== undefined;

  // Form is valid if we have timeline, at least one complete deliverable and description
  const descriptionWordCount = countWords(projectDescription);
  const isFormValid =
    isTimelineComplete &&
    areDeliverablesComplete &&
    (inputMode === "text" ? descriptionWordCount >= 50 : voiceNoteUrl.length > 0);

  const maxDescriptionChars = 5000;
  const descriptionCharCount = projectDescription.length;

  // Progressive disclosure logic
  const showTimeline = hasAtLeastOneCompleteDeliverable; // Show timeline when first deliverable is complete
  const showMilestones = isTimelineComplete; // Show milestones when timeline is complete
  const showDescription = isTimelineComplete; // Show description when timeline is complete

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
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                2 / 5
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Define your project scope.
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Help Vendors understand what you're looking for by clearly
                defining your key deliverables and additional project details.
              </p>
            </div>
          </div>

          {/* Right Section - Form */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Key Deliverables - Bill of Quantities */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      Key Deliverables (Bill of Quantities)
                    </label>
                    <Button
                      onClick={handleAddDeliverable}
                      size="sm"
                      className="bg-[#E25E45] hover:bg-[#d54d35]"
                      data-testid="button-add-deliverable"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Deliverable
                    </Button>
                  </div>

                  {/* Deliverable Cards */}
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
                            {/* Card Header - Collapsed View */}
                            <div
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                              onClick={() => setExpandedDeliverableId(isExpanded ? null : deliverable.id)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                  #{index + 1}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white truncate">
                                  {deliverable.name || 'New Deliverable'}
                                </span>
                                {deliverable.quantity > 0 && deliverable.unit && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                                    {deliverable.quantity} × {deliverable.unit}
                                  </span>
                                )}
                                {hasErrors && (
                                  <span className="text-xs text-red-500 font-medium">
                                    Incomplete
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

                            {/* Expanded Form */}
                            <div
                              className={`grid transition-all duration-300 ease-in-out ${
                                isExpanded
                                  ? 'grid-rows-[1fr] opacity-100'
                                  : 'grid-rows-[0fr] opacity-0'
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                {/* Deliverable Name */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Deliverable Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={deliverable.name}
                                    onChange={(e) => handleUpdateDeliverable(deliverable.id, 'name', e.target.value)}
                                    placeholder="e.g., Social Media Campaign Management"
                                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${
                                      errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    data-testid={`input-deliverable-name-${index}`}
                                  />
                                  <div className="flex justify-between items-center">
                                    {errors.name ? (
                                      <span className="text-xs text-red-500">{errors.name}</span>
                                    ) : (
                                      <span className="text-xs text-gray-400">Max 10 words</span>
                                    )}
                                    <span className={`text-xs ${countWords(deliverable.name) > 10 ? 'text-red-500' : 'text-gray-400'}`}>
                                      {countWords(deliverable.name)} / 10 words
                                    </span>
                                  </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                                  </label>
                                  <textarea
                                    value={deliverable.description}
                                    onChange={(e) => handleUpdateDeliverable(deliverable.id, 'description', e.target.value)}
                                    placeholder="Describe what this deliverable includes..."
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
                                      <span className="text-xs text-gray-400">Max 50 words</span>
                                    )}
                                    <span className={`text-xs ${countWords(deliverable.description) > 50 ? 'text-red-500' : 'text-gray-400'}`}>
                                      {countWords(deliverable.description)} / 50 words
                                    </span>
                                  </div>
                                </div>

                                {/* Unit and Quantity Row */}
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Unit of Measurement */}
                                  <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                      Unit of Measurement <span className="text-red-500">*</span>
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

                                  {/* Quantity */}
                                  <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                                      Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={deliverable.quantity}
                                      onChange={(e) => handleUpdateDeliverable(deliverable.id, 'quantity', parseInt(e.target.value) || 0)}
                                      placeholder="e.g., 3"
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
                        No deliverables added yet. Click "Add Deliverable" to get started.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Define what you expect to receive with quantities and units of measurement
                  </p>
                </div>

                {/* Project Timeline - Progressive Disclosure */}
                <div
                  className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showTimeline
                      ? "opacity-100 max-h-[300px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Project Timeline
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Start date</span>
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
                            {startDate ? format(startDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">End date</span>
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
                            {endDate ? format(endDate, "PPP") : "Select date"}
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Milestones - Progressive Disclosure */}
                <div
                  className={`space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showMilestones
                      ? "opacity-100 max-h-[1000px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      Milestones <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                  </div>

                  {/* Inline Milestone List */}
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
                          {/* Milestone marker */}
                          <div className="flex-shrink-0 mt-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                              milestone.name.trim()
                                ? 'bg-[#E25E45]'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Name input - always visible */}
                            <input
                              type="text"
                              value={milestone.name}
                              onChange={(e) => handleUpdateMilestone(milestone.id, 'name', e.target.value)}
                              placeholder="Milestone name..."
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

                            {/* Description - subtle textarea that appears on focus or if has content */}
                            <textarea
                              value={milestone.description}
                              onChange={(e) => handleUpdateMilestone(milestone.id, 'description', e.target.value)}
                              placeholder="Add description..."
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

                          {/* Date picker - compact */}
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
                                    {milestone.dueDate ? format(milestone.dueDate, "MMM d") : "Date"}
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
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {errors.dueDate && (
                              <span className="text-xs text-red-500 block mt-1">{errors.dueDate}</span>
                            )}
                          </div>

                          {/* Delete button - appears on hover */}
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

                    {/* Add milestone button - inline style */}
                    <button
                      onClick={handleAddMilestone}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-[#E25E45] hover:text-[#E25E45] transition-all duration-200 group"
                      data-testid="button-add-milestone"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-[#E25E45] transition-colors duration-200" />
                      </div>
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Add milestone</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Track key checkpoints throughout your project timeline
                  </p>
                </div>

                {/* Project Description - Progressive Disclosure */}
                <div
                  className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showDescription
                      ? "opacity-100 max-h-[800px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                      Project Description
                    </label>

                    {/* Toggle between Text and Voice */}
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
                        Text
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
                        Voice
                      </button>
                    </div>
                  </div>

                  {/* Text Input Mode with Autocomplete */}
                  {inputMode === "text" && (
                    <>
                      <AutocompleteInput
                        value={projectDescription}
                        onChange={setProjectDescription}
                        suggestions={descriptionSuggestions}
                        placeholder="A space to discuss additional project details..."
                        maxLength={maxDescriptionChars}
                        type="textarea"
                        rows={6}
                        data-testid="textarea-project-description"
                      />
                      <div className="flex justify-between items-center text-xs">
                        <p className={descriptionWordCount < 50 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                          {descriptionWordCount < 50 ? `${50 - descriptionWordCount} more words needed (min. 50)` : "Minimum word count met ✓"}
                        </p>
                        <p className="text-gray-400">{descriptionWordCount} words · {descriptionCharCount}/{maxDescriptionChars}</p>
                      </div>
                    </>
                  )}

                  {/* Voice Input Mode */}
                  {inputMode === "voice" && (
                    <div className="py-2">
                      <VoiceRecorder
                        onRecordingComplete={(url) => setVoiceNoteUrl(url)}
                        onRecordingDeleted={() => setVoiceNoteUrl("")}
                        existingUrl={voiceNoteUrl || undefined}
                        maxDurationSeconds={300}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Record a voice message to explain your project details (max 5 minutes)
                      </p>
                    </div>
                  )}
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
