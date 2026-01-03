import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, X, Plus, Mic } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import VoiceRecorder from "@/components/voice-recorder";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { getSuggestions } from "@/lib/tender-suggestions";
import { smartSuggestionEngine } from "@/lib/smart-suggestions";

type InputMode = "text" | "voice";

export default function TenderProjectScopeStep() {
  const [, navigate] = useLocation();
  const [projectObjective, setProjectObjective] = useState("");
  const [keyDeliverables, setKeyDeliverables] = useState<string[]>([]);
  const [newDeliverable, setNewDeliverable] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");

  const draft = useMemo(() => {
    try {
      const stored = localStorage.getItem("tenderDraft") || "{}";
      const parsed = JSON.parse(stored);

      // Initialize smart suggestion engine with project title
      if (parsed.title) {
        smartSuggestionEngine.updateContext("title", parsed.title);
      }

      // Load existing data if available
      if (parsed.projectObjective) setProjectObjective(parsed.projectObjective);
      if (parsed.keyDeliverables) setKeyDeliverables(parsed.keyDeliverables);
      if (parsed.projectDescription) setProjectDescription(parsed.projectDescription);
      if (parsed.voiceNoteUrl) setVoiceNoteUrl(parsed.voiceNoteUrl);

      return parsed;
    } catch {
      return {};
    }
  }, []);

  // Get smart suggestions based on context
  const [objectiveSuggestions, setObjectiveSuggestions] = useState<string[]>([]);
  const [deliverableSuggestions, setDeliverableSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Update smart suggestions when context changes
    const generalObjective = getSuggestions("objective");
    const generalDeliverable = getSuggestions("deliverable");
    const generalDescription = getSuggestions("description");

    setObjectiveSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("objective", generalObjective)
    );
    setDeliverableSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("deliverable", generalDeliverable)
    );
    setDescriptionSuggestions(
      smartSuggestionEngine.getCombinedSuggestions("description", generalDescription)
    );

    // Get top 3 suggestions for quick chips
    setQuickSuggestions(smartSuggestionEngine.getTopSuggestions("objective", 3));
  }, [draft.title]);

  const handleAddDeliverable = () => {
    const trimmed = newDeliverable.trim();
    if (trimmed && !keyDeliverables.includes(trimmed)) {
      setKeyDeliverables([...keyDeliverables, trimmed]);
      setNewDeliverable("");
    }
  };

  const handleRemoveDeliverable = (deliverable: string) => {
    setKeyDeliverables(keyDeliverables.filter((d) => d !== deliverable));
  };

  const handleNext = () => {
    if (isFormValid) {
      const updated = {
        ...draft,
        projectObjective: projectObjective.trim(),
        keyDeliverables,
        projectDescription: inputMode === "text" ? projectDescription.trim() : "",
        voiceNoteUrl: inputMode === "voice" ? voiceNoteUrl : "",
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/ai-budget");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new");
  };

  // Form is valid if we have objective and at least one deliverable
  const isFormValid =
    projectObjective.trim().length > 0 &&
    keyDeliverables.length > 0 &&
    (inputMode === "text" ? projectDescription.trim().length > 0 : voiceNoteUrl.length > 0);

  const maxDescriptionChars = 5000;
  const descriptionCharCount = projectDescription.length;

  // Progressive disclosure logic
  const showDeliverables = projectObjective.trim().length >= 10;
  const showDescription = keyDeliverables.length > 0;

  // Show quick suggestions only if user hasn't started typing (less than 10 chars)
  const showQuickSuggestions = projectObjective.trim().length < 10 && quickSuggestions.length > 0;

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
                Help candidates understand what you're looking for by clearly
                defining your project objective, key deliverables, and
                additional details.
              </p>
            </div>
          </div>

          {/* Right Section - Form */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Project Objective with Autocomplete */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Project Objective
                  </label>
                  <AutocompleteInput
                    value={projectObjective}
                    onChange={(value) => {
                      setProjectObjective(value);
                      smartSuggestionEngine.updateContext("objective", value);
                    }}
                    suggestions={objectiveSuggestions}
                    placeholder="What is the main goal of this project?"
                    data-testid="input-project-objective"
                  />

                  {/* Quick suggestion chips - only shown if user hasn't typed much */}
                  {showQuickSuggestions && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Quick suggestions based on your project:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {quickSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setProjectObjective(suggestion);
                              smartSuggestionEngine.updateContext("objective", suggestion);
                            }}
                            className="px-3 py-2 text-sm bg-[#E25E45]/5 hover:bg-[#E25E45]/10 border border-[#E25E45]/20 hover:border-[#E25E45]/40 rounded-lg text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105"
                            data-testid={`quick-suggestion-${index}`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!showQuickSuggestions && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Explain why you're posting this project
                    </p>
                  )}
                </div>

                {/* Key Deliverables - Progressive Disclosure */}
                <div
                  className={`space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 transition-all duration-300 ease-out ${
                    showDeliverables
                      ? "opacity-100 max-h-[600px] translate-y-0"
                      : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pt-0 border-t-0"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Key Deliverables
                  </label>

                  {/* Selected Deliverables */}
                  {keyDeliverables.length > 0 && (
                    <div className="space-y-2">
                      {keyDeliverables.map((deliverable, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <span className="flex-1 text-sm text-gray-900 dark:text-white">
                            {deliverable}
                          </span>
                          <button
                            onClick={() => handleRemoveDeliverable(deliverable)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            data-testid={`button-remove-deliverable-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Deliverable with Autocomplete */}
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <AutocompleteInput
                        value={newDeliverable}
                        onChange={setNewDeliverable}
                        suggestions={deliverableSuggestions}
                        placeholder="e.g., Ad campaign management, Creative strategy..."
                        onEnter={handleAddDeliverable}
                        data-testid="input-new-deliverable"
                      />
                    </div>
                    <Button
                      onClick={handleAddDeliverable}
                      disabled={!newDeliverable.trim()}
                      className="bg-[#E25E45] hover:bg-[#d54d35] mt-0"
                      data-testid="button-add-deliverable"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add items that describe what you expect to receive
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
                      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <p>Share any additional details about your project</p>
                        <p>
                          {descriptionCharCount} / {maxDescriptionChars}
                        </p>
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
