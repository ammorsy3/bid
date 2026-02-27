import { FormCard } from "@/lib/form-builder-types";
import { ENTERPRISE_CRITERIA_CATEGORIES } from "@/lib/evaluation-criteria-data";
import type { EvaluationCriteriaValue, EvalRequirement, EvalCategoryWeight, EvalCustomCriterion } from "@/lib/form-builder-types";
import { DEFAULT_EVAL_WEIGHTS } from "@/lib/form-builder-types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, X, FileText, Video, FileCheck, FileVideo, ChevronDown, Check, Scale, Briefcase, Clock, Mic, Type, Sparkles, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import VoiceRecorder from "@/components/voice-recorder";

interface CardInputRendererProps {
  card: FormCard;
  onUpdate?: (id: string, updates: Partial<FormCard>) => void;
  readOnly?: boolean;
}

export function CardInputRenderer({ card, onUpdate, readOnly = false }: CardInputRendererProps) {
  const updateValue = (newValue: any) => {
    if (onUpdate) {
      onUpdate(card.id, { value: newValue });
    }
  };

  switch (card.type) {
    case "project-title":
      return (
        <input
          type="text"
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${readOnly ? "cursor-default opacity-60" : ""}`}
        />
      );

    case "supplier-response":
      return <SupplierResponseInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "project-dates":
      return <ProjectDatesInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "budget":
      return <BudgetInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "project-objective":
      return (
        <input
          type="text"
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${readOnly ? "cursor-default opacity-60" : ""}`}
        />
      );

    case "key-deliverables":
      return <DeliverablesInput value={card.value || []} onChange={updateValue} readOnly={readOnly} />;

    case "project-description":
      return <ProjectDescriptionInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "submission-deadline":
      return <DatePickerInput value={card.value} onChange={updateValue} label="Submission deadline" readOnly={readOnly} />;

    case "evaluation-criteria":
      return <EvaluationCriteriaInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "attachments":
      return <AttachmentsInput value={card.value || []} onChange={updateValue} readOnly={readOnly} />;

    case "custom-text":
      return (
        <input
          type="text"
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${readOnly ? "cursor-default opacity-60" : ""}`}
        />
      );

    case "custom-textarea":
      return (
        <textarea
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          disabled={readOnly}
          rows={3}
          className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none ${readOnly ? "cursor-default opacity-60" : ""}`}
        />
      );

    case "custom-date":
      return <DatePickerInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "custom-select":
      return (
        <CustomSelectInput
          value={card.value}
          options={card.options || []}
          onChange={updateValue}
          onOptionsChange={(options) => onUpdate?.(card.id, { options })}
          readOnly={readOnly}
        />
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          Unknown card type: {card.type}
        </div>
      );
  }
}

// Supplier Response Input — matches Bid Recommended submission types
function SupplierResponseInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string | null;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const options = [
    {
      id: "quote_only",
      label: "Price Only",
      description: "Just need a price figure from vendors",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "tech_fin_proposal",
      label: "Full Proposal",
      description: "Technical and Financial Proposal",
      icon: FileCheck,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "video_only",
      label: "Video Pitch",
      description: "A short video explaining their approach",
      icon: Video,
      color: "from-pink-500 to-pink-600",
    },
    {
      id: "tech_fin_with_video",
      label: "Proposal + Video",
      description: "Written proposal and a video pitch",
      icon: FileVideo,
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.id;
        return (
          <div
            key={option.id}
            onClick={readOnly ? undefined : () => onChange(option.id)}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
              readOnly ? "opacity-60 cursor-default" : "cursor-pointer"
            } ${
              isSelected
                ? "border-[#E25E45] bg-[#E25E45]/5"
                : "border-gray-200 dark:border-gray-600"
            } ${!readOnly && !isSelected ? "hover:border-gray-300" : ""}`}
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className={`font-medium ${isSelected ? "text-[#E25E45]" : "text-gray-900 dark:text-white"}`}>
                {option.label}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {option.description}
              </div>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                isSelected
                  ? "border-[#E25E45] bg-[#E25E45]"
                  : "border-gray-300 dark:border-gray-500"
              }`}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Project Dates Input Component
function ProjectDatesInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: { startDate: string | null; endDate: string | null; deliveryDate: string | null };
  onChange: (value: any) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        Set dates in the next step
      </div>
    );
  }
  const dateValue = value || { startDate: null, endDate: null, deliveryDate: null };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Start date</span>
        <DatePickerInput
          value={dateValue.startDate}
          onChange={(date) => onChange({ ...dateValue, startDate: date })}
        />
      </div>
      <div className="space-y-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">End date</span>
        <DatePickerInput
          value={dateValue.endDate}
          onChange={(date) => onChange({ ...dateValue, endDate: date })}
        />
      </div>
    </div>
  );
}

// Budget Input Component
function BudgetInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: { type: string; amount: string; min: string; max: string };
  onChange: (value: any) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        Set budget in the next step
      </div>
    );
  }
  const budgetValue = value || { type: "exact", amount: "", min: "", max: "" };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...budgetValue, type: "exact" })}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            budgetValue.type === "exact"
              ? "bg-[#E25E45] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
        >
          Exact Budget
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...budgetValue, type: "range" })}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            budgetValue.type === "range"
              ? "bg-[#E25E45] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          }`}
        >
          Budget Range
        </button>
      </div>

      {budgetValue.type === "exact" ? (
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400 font-medium">SAR</span>
          <input
            type="number"
            placeholder="0"
            value={budgetValue.amount}
            onChange={(e) => onChange({ ...budgetValue, amount: e.target.value })}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Min</span>
            <input
              type="number"
              placeholder="0"
              value={budgetValue.min}
              onChange={(e) => onChange({ ...budgetValue, min: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Max</span>
            <input
              type="number"
              placeholder="0"
              value={budgetValue.max}
              onChange={(e) => onChange({ ...budgetValue, max: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Deliverables Input Component
function DeliverablesInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        Add deliverables in the next step
      </div>
    );
  }
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (newItem.trim() && !value.includes(newItem.trim())) {
      onChange([...value, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemove = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="flex-1 text-sm text-gray-900 dark:text-white">{item}</span>
              <button
                onClick={() => handleRemove(item)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a deliverable..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
        />
        <Button onClick={handleAdd} className="bg-[#E25E45] hover:bg-[#d54d35]">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Project Description Input — matches Bid Recommended template (text OR voice note + optional video)
type DescriptionValue = { text: string; voiceNoteUrl: string; videoUrl: string };

function ProjectDescriptionInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: DescriptionValue | null;
  onChange: (value: DescriptionValue) => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"text" | "voice">("text");
  const val: DescriptionValue = value && typeof value === "object" && "text" in value
    ? value
    : { text: typeof value === "string" ? (value as string) : "", voiceNoteUrl: "", videoUrl: "" };

  const update = (patch: Partial<DescriptionValue>) => onChange({ ...val, ...patch });

  const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = countWords(val.text);
  const charCount = val.text.length;

  if (readOnly) {
    return (
      <div className="space-y-2">
        {val.text && <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{val.text}</p>}
        {val.voiceNoteUrl && (
          <div className="flex items-center gap-2 text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg w-fit">
            <Mic className="h-3.5 w-3.5" /> Voice note attached
          </div>
        )}
        {val.videoUrl && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
            <Video className="h-3.5 w-3.5" /> Video link attached
          </div>
        )}
        {!val.text && !val.voiceNoteUrl && (
          <p className="text-sm text-gray-400 italic">No description yet</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab("text")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "text"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
          }`}
        >
          <Type className="h-3.5 w-3.5" />
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab("voice")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "voice"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          Voice Note
          {val.voiceNoteUrl && (
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 ml-0.5" />
          )}
        </button>
      </div>

      {/* Write tab */}
      {tab === "text" && (
        <div className="space-y-2">
          <textarea
            placeholder="Strong understanding of passing, dribbling, and visual aesthetics. Ability to work independently and as part of a team. Excellent communication and time-management skills..."
            value={val.text}
            onChange={(e) => update({ text: e.target.value })}
            maxLength={5000}
            rows={7}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center text-xs">
            <p className={wordCount > 0 && wordCount < 50 ? "text-amber-600 font-medium" : wordCount >= 50 ? "text-green-600 font-medium" : "text-gray-400"}>
              {wordCount < 50 ? `${Math.max(0, 50 - wordCount)} more words needed (min. 50)` : "Minimum word count met ✓"}
            </p>
            <p className="text-gray-400">{wordCount} words · {charCount}/5000</p>
          </div>
        </div>
      )}

      {/* Voice note tab */}
      {tab === "voice" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Sparkles className="h-4 w-4 text-[#E25E45]" />
            Record a message to describe your project (max 5 minutes)
          </div>
          <VoiceRecorder
            onRecordingComplete={(url) => update({ voiceNoteUrl: url })}
            onRecordingDeleted={() => update({ voiceNoteUrl: "" })}
            existingUrl={val.voiceNoteUrl || undefined}
            maxDurationSeconds={300}
          />
        </div>
      )}

      {/* Video URL — always visible below tabs */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Video className="h-4 w-4 text-[#E25E45]" />
          Video Link <span className="font-normal text-gray-400">(Optional)</span>
        </label>
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          value={val.videoUrl}
          onChange={(e) => update({ videoUrl: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent text-sm"
        />
        <p className="text-xs text-gray-400">Add a YouTube or Vimeo link to show examples of your project</p>
      </div>
    </div>
  );
}

// Date Picker Input Component
function DatePickerInput({
  value,
  onChange,
  label,
  readOnly = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {label || "Select date"} in the next step
      </div>
    );
  }
  const date = value ? new Date(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : label || "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d?.toISOString() || null)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Evaluation Criteria Input — full weighted category system matching Bid Recommended
function EvaluationCriteriaInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: EvaluationCriteriaValue | null;
  onChange: (value: EvaluationCriteriaValue) => void;
  readOnly?: boolean;
}) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["experience"]);
  const [newCriterionText, setNewCriterionText] = useState("");
  const [newCriterionWeight, setNewCriterionWeight] = useState(5);

  // Ensure value has the expected shape
  const evalValue: EvaluationCriteriaValue = value && typeof value === "object" && !Array.isArray(value) && "weights" in value
    ? value
    : { requirements: [], weights: DEFAULT_EVAL_WEIGHTS.map(w => ({ ...w })), customCriteria: [] };

  const { requirements, weights, customCriteria } = evalValue;

  const update = (patch: Partial<EvaluationCriteriaValue>) => {
    onChange({ ...evalValue, ...patch });
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const getWeight = (categoryId: string) =>
    weights.find(w => w.categoryId === categoryId)?.weight ?? 0;

  const handleWeightChange = (categoryId: string, weight: number) => {
    update({ weights: weights.map(w => w.categoryId === categoryId ? { ...w, weight } : w) });
  };

  const getReqValue = (categoryId: string, requirementId: string): string | boolean => {
    const req = requirements.find(r => r.categoryId === categoryId && r.requirementId === requirementId);
    return req?.value ?? false;
  };

  const handleReqChange = (categoryId: string, requirementId: string, val: string | boolean) => {
    let updated: EvalRequirement[];
    const idx = requirements.findIndex(r => r.categoryId === categoryId && r.requirementId === requirementId);
    if (idx >= 0) {
      if (val === false || val === "") {
        updated = requirements.filter((_, i) => i !== idx);
      } else {
        updated = [...requirements];
        updated[idx] = { categoryId, requirementId, value: val };
      }
    } else if (val !== false && val !== "") {
      updated = [...requirements, { categoryId, requirementId, value: val }];
    } else {
      updated = requirements;
    }
    update({ requirements: updated });
  };

  const addCustomCriterion = () => {
    if (newCriterionText.trim()) {
      update({
        customCriteria: [...customCriteria, { id: `custom-${Date.now()}`, text: newCriterionText.trim(), weight: newCriterionWeight }],
      });
      setNewCriterionText("");
      setNewCriterionWeight(5);
    }
  };

  const removeCustomCriterion = (id: string) => {
    update({ customCriteria: customCriteria.filter(c => c.id !== id) });
  };

  const updateCustomWeight = (id: string, weight: number) => {
    update({ customCriteria: customCriteria.map(c => c.id === id ? { ...c, weight } : c) });
  };

  const customWeight = customCriteria.reduce((s, c) => s + c.weight, 0);
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0) + customWeight;

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        Configure evaluation criteria in the next step
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Weight ring */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200 dark:text-gray-600" />
            <circle
              cx="32" cy="32" r="28"
              stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round"
              className={`transition-all duration-500 ${totalWeight === 100 ? "text-green-500" : totalWeight > 100 ? "text-red-500" : "text-amber-500"}`}
              style={{ strokeDasharray: `${Math.min(totalWeight, 100) * 1.76} 176` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600"}`}>
              {totalWeight}%
            </span>
          </div>
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {totalWeight === 100 ? "Perfect Balance!" : "Weight Distribution"}
          </p>
          <p className={`text-xs mt-0.5 ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-500" : "text-amber-600"}`}>
            {totalWeight === 100 ? "Weights add up to 100%" : totalWeight > 100 ? `Remove ${totalWeight - 100}% to balance` : `Add ${100 - totalWeight}% more weight`}
          </p>
        </div>
      </div>

      {/* Category accordions */}
      {ENTERPRISE_CRITERIA_CATEGORIES.map((category) => {
        const isExpanded = expandedCategories.includes(category.id);
        const currentWeight = getWeight(category.id);
        const hasSelections = requirements.some(r => r.categoryId === category.id);

        const CategoryIcon = category.id === "experience" ? Briefcase : category.id === "financial" ? Scale : Clock;

        return (
          <div key={category.id} className={`border rounded-lg overflow-hidden transition-all ${hasSelections ? "border-[#E25E45]/50 bg-[#E25E45]/5" : "border-gray-200 dark:border-gray-600"}`}>
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${hasSelections ? "bg-[#E25E45]/10 text-[#E25E45]" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-white">{category.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{currentWeight}%</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className="border-t border-gray-200 dark:border-gray-600 p-3 space-y-3 bg-white dark:bg-gray-800">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Weight: {currentWeight}%</label>
                    <input
                      type="range" min="0" max="100" step="5" value={currentWeight}
                      onChange={(e) => handleWeightChange(category.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#E25E45]"
                    />
                  </div>

                  {category.requirements.map((req) => {
                    const currentValue = getReqValue(category.id, req.id);
                    return (
                      <div key={req.id} className="flex items-start gap-2">
                        {req.type === "checkbox" && (
                          <button
                            type="button"
                            onClick={() => handleReqChange(category.id, req.id, !currentValue)}
                            className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${currentValue ? "border-[#E25E45] bg-[#E25E45]" : "border-gray-300 dark:border-gray-500"}`}
                          >
                            {currentValue && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </button>
                        )}
                        <div className="flex-1">
                          <label className="text-sm text-gray-900 dark:text-white">{req.label}</label>
                          {req.type === "select" && req.options && (
                            <Select
                              value={(currentValue as string) || "none"}
                              onValueChange={(val) => handleReqChange(category.id, req.id, val === "none" ? "" : val)}
                            >
                              <SelectTrigger className="mt-1 w-full text-sm">
                                <SelectValue placeholder="Not required" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not required</SelectItem>
                                {req.options.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Custom criteria */}
      <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Custom criteria <span className="text-gray-400 font-normal">(optional)</span>
        </label>

        {customCriteria.length > 0 && (
          <div className="space-y-2">
            {customCriteria.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="flex-1 text-sm text-gray-900 dark:text-white">{item.text}</span>
                <input
                  type="number" min="0" max="100"
                  value={item.weight}
                  onChange={(e) => updateCustomWeight(item.id, parseInt(e.target.value) || 0)}
                  className="w-14 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                />
                <span className="text-xs text-gray-500">%</span>
                <button onClick={() => removeCustomCriterion(item.id)} className="text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Add custom criterion..."
            value={newCriterionText}
            onChange={(e) => setNewCriterionText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomCriterion()}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
          />
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max="100"
              value={newCriterionWeight}
              onChange={(e) => setNewCriterionWeight(parseInt(e.target.value) || 0)}
              className="w-14 px-2 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
          <Button onClick={addCustomCriterion} size="sm" className="bg-[#E25E45] hover:bg-[#d54d35]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Attachments Input Component
function AttachmentsInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        Upload attachments in the next step
      </div>
    );
  }
  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Drag and drop files here, or click to browse
      </p>
      <p className="text-xs text-gray-400 mt-1">
        PDF, DOC, DOCX, XLS, XLSX up to 10MB each
      </p>
    </div>
  );
}

// Custom Select Input Component
function CustomSelectInput({
  value,
  options,
  onChange,
  onOptionsChange,
  readOnly = false,
}: {
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  onOptionsChange: (options: string[]) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        Select option in the next step
      </div>
    );
  }
  const [newOption, setNewOption] = useState("");

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      onOptionsChange([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (opt: string) => {
    onOptionsChange(options.filter((o) => o !== opt));
    if (value === opt) onChange("");
  };

  return (
    <div className="space-y-3">
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt} className="flex items-center gap-3">
              <label
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  value === opt
                    ? "border-[#E25E45] bg-[#E25E45]/5"
                    : "border-gray-200 dark:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name={`select-${opt}`}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="text-[#E25E45]"
                />
                <span className="text-sm text-gray-900 dark:text-white">{opt}</span>
              </label>
              <button
                onClick={() => handleRemoveOption(opt)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add an option..."
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
        />
        <Button onClick={handleAddOption} size="sm" className="bg-[#E25E45] hover:bg-[#d54d35]">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
