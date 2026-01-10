import { FormCard } from "@/lib/form-builder-types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Clock, ShoppingBag, FileText, Video, MessageSquare, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CardInputRendererProps {
  card: FormCard;
  onUpdate?: (id: string, updates: Partial<FormCard>) => void;
}

export function CardInputRenderer({ card, onUpdate }: CardInputRendererProps) {
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
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
        />
      );

    case "project-type":
      return <ProjectTypeInput value={card.value} onChange={updateValue} />;

    case "supplier-response":
      return <SupplierResponseInput value={card.value} onChange={updateValue} />;

    case "project-dates":
      return <ProjectDatesInput value={card.value} onChange={updateValue} />;

    case "budget":
      return <BudgetInput value={card.value} onChange={updateValue} />;

    case "project-objective":
      return (
        <input
          type="text"
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
        />
      );

    case "key-deliverables":
      return <DeliverablesInput value={card.value || []} onChange={updateValue} />;

    case "project-description":
      return (
        <textarea
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none"
        />
      );

    case "submission-deadline":
      return <DatePickerInput value={card.value} onChange={updateValue} label="Submission deadline" />;

    case "evaluation-criteria":
      return <EvaluationCriteriaInput value={card.value || []} onChange={updateValue} />;

    case "attachments":
      return <AttachmentsInput value={card.value || []} onChange={updateValue} />;

    case "custom-text":
      return (
        <input
          type="text"
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
        />
      );

    case "custom-textarea":
      return (
        <textarea
          placeholder={card.placeholder}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none"
        />
      );

    case "custom-date":
      return <DatePickerInput value={card.value} onChange={updateValue} />;

    case "custom-select":
      return (
        <CustomSelectInput
          value={card.value}
          options={card.options || []}
          onChange={updateValue}
          onOptionsChange={(options) => onUpdate?.(card.id, { options })}
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

// Project Type Input Component
function ProjectTypeInput({
  value,
  onChange,
}: {
  value: { type: string | null; startDate?: string | null; endDate?: string | null; deliveryDate?: string | null } | string | null;
  onChange: (value: any) => void;
}) {
  // Handle both old string format and new object format
  const projectValue = typeof value === 'string' 
    ? { type: value, startDate: null, endDate: null, deliveryDate: null }
    : value || { type: null, startDate: null, endDate: null, deliveryDate: null };

  const selectedType = projectValue.type;

  const options = [
    {
      id: "time-bound",
      label: "Ongoing & time-bound",
      description: "A project with a start and end date",
      icon: Clock,
    },
    {
      id: "deliverable",
      label: "Purchase of a service or product",
      description: "A project that ends when the work is delivered",
      icon: ShoppingBag,
    },
  ];

  const handleTypeSelect = (typeId: string) => {
    onChange({ ...projectValue, type: typeId });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleTypeSelect(option.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-[#E25E45] bg-[#E25E45]/5"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected
                    ? "bg-[#E25E45] text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                <Icon className="h-5 w-5" />
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
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? "border-[#E25E45] bg-[#E25E45]"
                    : "border-gray-300 dark:border-gray-500"
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Date pickers based on selected type */}
      {selectedType === "time-bound" && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Project timeline</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Start date</span>
              <DatePickerInput
                value={projectValue.startDate || null}
                onChange={(date) => onChange({ ...projectValue, startDate: date })}
                label="Select start date"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">End date</span>
              <DatePickerInput
                value={projectValue.endDate || null}
                onChange={(date) => onChange({ ...projectValue, endDate: date })}
                label="Select end date"
              />
            </div>
          </div>
        </div>
      )}

      {selectedType === "deliverable" && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected delivery date</p>
          <DatePickerInput
            value={projectValue.deliveryDate || null}
            onChange={(date) => onChange({ ...projectValue, deliveryDate: date })}
            label="Select delivery date"
          />
        </div>
      )}
    </div>
  );
}

// Supplier Response Input Component
function SupplierResponseInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string) => void;
}) {
  const options = [
    {
      id: "price_only",
      label: "Price Only",
      description: "Just need a price quote",
      icon: FileText,
      color: "bg-indigo-500",
    },
    {
      id: "full_proposal",
      label: "Full Proposal",
      description: "Technical plan + pricing details",
      icon: FileText,
      color: "bg-pink-500",
    },
    {
      id: "video_pitch",
      label: "Video Pitch",
      description: "A short video explaining their approach",
      icon: Video,
      color: "bg-pink-500",
    },
    {
      id: "proposal_video",
      label: "Proposal + Video",
      description: "Written proposal and a video pitch",
      icon: FileText,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="grid gap-3">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
              isSelected
                ? "border-[#E25E45] bg-[#E25E45]/5"
                : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${option.color} text-white`}>
              <Icon className="h-5 w-5" />
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
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected
                  ? "border-[#E25E45] bg-[#E25E45]"
                  : "border-gray-300 dark:border-gray-500"
              }`}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Project Dates Input Component
function ProjectDatesInput({
  value,
  onChange,
}: {
  value: { startDate: string | null; endDate: string | null; deliveryDate: string | null };
  onChange: (value: any) => void;
}) {
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
}: {
  value: { type: string; amount: string; min: string; max: string };
  onChange: (value: any) => void;
}) {
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
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
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

// Date Picker Input Component
function DatePickerInput({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}) {
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

// Evaluation Criteria Input Component
function EvaluationCriteriaInput({
  value,
  onChange,
}: {
  value: { name: string; weight: number }[];
  onChange: (value: { name: string; weight: number }[]) => void;
}) {
  const [newCriteria, setNewCriteria] = useState("");

  const handleAdd = () => {
    if (newCriteria.trim()) {
      onChange([...value, { name: newCriteria.trim(), weight: 0 }]);
      setNewCriteria("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleWeightChange = (index: number, weight: number) => {
    const updated = [...value];
    updated[index].weight = weight;
    onChange(updated);
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
              <span className="flex-1 text-sm text-gray-900 dark:text-white">{item.name}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={item.weight}
                onChange={(e) => handleWeightChange(index, parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
              />
              <span className="text-xs text-gray-500">%</span>
              <button
                onClick={() => handleRemove(index)}
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
          placeholder="Add evaluation criteria..."
          value={newCriteria}
          onChange={(e) => setNewCriteria(e.target.value)}
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

// Attachments Input Component
function AttachmentsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
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
}: {
  value: string | null;
  options: string[];
  onChange: (value: string) => void;
  onOptionsChange: (options: string[]) => void;
}) {
  const [newOption, setNewOption] = useState("");
  const [isEditingOptions, setIsEditingOptions] = useState(false);

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
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
      >
        <option value="">Select an option...</option>
        {options.map((opt, index) => (
          <option key={index} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setIsEditingOptions(!isEditingOptions)}
        className="text-xs text-[#E25E45] hover:underline"
      >
        {isEditingOptions ? "Done editing options" : "Edit options"}
      </button>

      {isEditingOptions && (
        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{opt}</span>
              <button
                onClick={() => handleRemoveOption(opt)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Add option..."
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
            <Button size="sm" onClick={handleAddOption} className="bg-[#E25E45] hover:bg-[#d54d35]">
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
