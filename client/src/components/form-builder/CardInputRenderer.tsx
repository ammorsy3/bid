import { FormCard } from "@/lib/form-builder-types";
import { ENTERPRISE_CRITERIA_CATEGORIES, CRITERIA_TRANSLATIONS_AR } from "@/lib/evaluation-criteria-data";
import type { EvaluationCriteriaValue, EvalRequirement, EvalCategoryWeight, EvalCustomCriterion, DeliverableItem, BudgetMilestone, ProjectMilestone } from "@/lib/form-builder-types";
import { DEFAULT_EVAL_WEIGHTS } from "@/lib/form-builder-types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, X, FileText, Video, FileCheck, FileVideo, ChevronDown, Check, Scale, Briefcase, Clock, Mic, Type, Sparkles, ExternalLink, MessageSquare, Mail, Upload, Paperclip, Loader2, Trash2, FileSpreadsheet, FileImage } from "lucide-react";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";
import VoiceRecorder from "@/components/voice-recorder";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";

interface CardInputRendererProps {
  card: FormCard;
  onUpdate?: (id: string, updates: Partial<FormCard>) => void;
  readOnly?: boolean;
}

export function CardInputRenderer({ card, onUpdate, readOnly = false }: CardInputRendererProps) {
  const { t, language } = useI18n();
  const dateLocale = language === 'ar' ? arLocale : undefined;

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
          placeholder={t('formBuilder.projectTitleInputPlaceholder')}
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

    case "key-deliverables":
      return <DeliverablesInput value={card.value || []} onChange={updateValue} readOnly={readOnly} />;

    case "milestones":
      return <MilestonesInput value={card.value || []} onChange={updateValue} readOnly={readOnly} />;

    case "project-description":
      return <ProjectDescriptionInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "submission-deadline":
      return <DatePickerInput value={card.value} onChange={updateValue} label={t('formBuilder.submissionDeadlineLabel')} readOnly={readOnly} />;

    case "evaluation-criteria":
      return <EvaluationCriteriaInput value={card.value} onChange={updateValue} readOnly={readOnly} />;

    case "attachments":
      return <AttachmentsInput value={card.value || []} onChange={updateValue} readOnly={readOnly} />;

    case "custom-text":
      return (
        <input
          type="text"
          placeholder={card.placeholder || t('formBuilder.customTextPlaceholder')}
          value={card.value || ""}
          onChange={(e) => updateValue(e.target.value)}
          disabled={readOnly}
          className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${readOnly ? "cursor-default opacity-60" : ""}`}
        />
      );

    case "custom-textarea":
      return (
        <textarea
          placeholder={card.placeholder || t('formBuilder.customTextareaPlaceholder')}
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

// Supplier Response Input — submission type + how vendors ask questions
function SupplierResponseInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
}) {
  const { t } = useI18n();

  const submissionOptions = [
    {
      id: "quote_only",
      label: t('tenderFlow.priceOnly'),
      description: t('tenderFlow.priceOnlyDesc'),
      icon: FileText,
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "tech_fin_proposal",
      label: t('tenderFlow.fullProposal'),
      description: t('tenderFlow.fullProposalDesc'),
      icon: FileCheck,
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "video_only",
      label: t('tenderFlow.videoPitch'),
      description: t('tenderFlow.videoPitchDesc'),
      icon: Video,
      color: "from-pink-500 to-pink-600",
    },
    {
      id: "tech_fin_with_video",
      label: t('tenderFlow.proposalVideo'),
      description: t('tenderFlow.proposalVideoDesc'),
      icon: FileVideo,
      color: "from-orange-500 to-orange-600",
    },
  ];

  const inquiryOptions = [
    {
      id: "inside_bid",
      label: t('tenderFlow.insideBid'),
      description: t('tenderFlow.insideBidDesc'),
      icon: MessageSquare,
      color: "from-green-500 to-green-600",
    },
    {
      id: "email_whatsapp",
      label: t('tenderFlow.emailWhatsapp'),
      description: t('tenderFlow.emailWhatsappDesc'),
      icon: Mail,
      color: "from-amber-500 to-amber-600",
    },
  ];

  // Normalize: backwards compat where value was just a string
  const val = typeof value === "string"
    ? { submissionType: value, inquiryType: null, whatsappContact: "", emailContact: "" }
    : value || { submissionType: null, inquiryType: null, whatsappContact: "", emailContact: "" };

  const update = (patch: any) => onChange({ ...val, ...patch });

  const renderOptions = (
    options: typeof submissionOptions,
    selectedId: string | null,
    onSelect: (id: string) => void,
  ) =>
    options.map((option) => {
      const Icon = option.icon;
      const isSelected = selectedId === option.id;
      return (
        <div
          key={option.id}
          onClick={readOnly ? undefined : () => onSelect(option.id)}
          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
            readOnly ? "cursor-default" : "cursor-pointer"
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
              isSelected ? "border-[#E25E45] bg-[#E25E45]" : "border-gray-300 dark:border-gray-500"
            }`}
          >
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>
      );
    });

  return (
    <div className="space-y-6">
      {/* Submission type */}
      <div className="grid gap-3">
        {renderOptions(submissionOptions, val.submissionType, (id) => update({ submissionType: id }))}
      </div>

      {/* How vendors ask questions */}
      <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {t('tenderFlow.howAskQuestions')}
        </p>
        <div className="grid gap-3">
          {renderOptions(inquiryOptions, val.inquiryType, (id) => update({ inquiryType: id }))}
        </div>

        {/* Inside Bid info note */}
        {val.inquiryType === "inside_bid" && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('tenderFlow.insideBidInfo')}
            </p>
          </div>
        )}

        {/* WhatsApp & Email contact inputs */}
        {val.inquiryType === "email_whatsapp" && !readOnly && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('tenderFlow.whatsappNumber')}
              </label>
              <input
                type="text"
                placeholder="+966 50 123 4567"
                value={val.whatsappContact}
                onChange={(e) => update({ whatsappContact: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('tenderFlow.emailAddress')}
              </label>
              <input
                type="email"
                placeholder="contact@company.com"
                value={val.emailContact}
                onChange={(e) => update({ emailContact: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
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
  const { t } = useI18n();

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {t('formBuilder.setDatesNextStep')}
      </div>
    );
  }
  const dateValue = value || { startDate: null, endDate: null, deliveryDate: null };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('tenderFlow.startDate')}</span>
        <DatePickerInput
          value={dateValue.startDate}
          onChange={(date) => onChange({ ...dateValue, startDate: date })}
        />
      </div>
      <div className="space-y-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('tenderFlow.endDate')}</span>
        <DatePickerInput
          value={dateValue.endDate}
          onChange={(date) => onChange({ ...dateValue, endDate: date })}
        />
      </div>
    </div>
  );
}

// Budget Input Component — matches Bid Recommended (exact / range / milestone + vendor visibility)
function BudgetInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
}) {
  const { t } = useI18n();

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {t('formBuilder.setBudgetNextStep')}
      </div>
    );
  }

  const budgetValue = {
    type: "exact",
    amount: "",
    min: "",
    max: "",
    showToVendors: true,
    ...(value || {}),
  };

  return (
    <div className="space-y-3">
      {/* Type toggle: Exact / Range */}
      <div className="flex gap-2">
        {(["exact", "range"] as const).map((budgetType) => (
          <button
            key={budgetType}
            type="button"
            onClick={() => onChange({ ...budgetValue, type: budgetType })}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              budgetValue.type === budgetType
                ? "bg-[#E25E45] text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {budgetType === "exact" ? t('tenderFlow.exactBudget') : t('tenderFlow.budgetRange')}
          </button>
        ))}
      </div>

      {/* Exact Budget */}
      {budgetValue.type === "exact" && (
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
      )}

      {/* Range Budget */}
      {budgetValue.type === "range" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">{t('formBuilder.minLabel')}</span>
            <input
              type="number"
              placeholder="0"
              value={budgetValue.min}
              onChange={(e) => onChange({ ...budgetValue, min: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">{t('formBuilder.maxLabel')}</span>
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

      {/* Show budget to vendors toggle */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{t('formBuilder.showBudgetToVendors')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('formBuilder.vendorsSeeBudgetRfp')}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...budgetValue, showToVendors: !budgetValue.showToVendors })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            budgetValue.showToVendors ? "bg-[#E25E45]" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              budgetValue.showToVendors ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// Deliverables Input Component — supports name + optional description per item
function DeliverablesInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: (string | DeliverableItem)[];
  onChange: (value: DeliverableItem[]) => void;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {t('formBuilder.addDeliverablesNextStep')}
      </div>
    );
  }

  // Normalize: convert legacy string items to DeliverableItem objects
  const items: DeliverableItem[] = (value || []).map((item) =>
    typeof item === "string"
      ? { id: `legacy-${item}`, name: item, description: "" }
      : item
  );

  const handleAdd = () => {
    if (newName.trim()) {
      const newItem: DeliverableItem = {
        id: `del-${Date.now()}`,
        name: newName.trim(),
        description: newDesc.trim(),
      };
      onChange([...items, newItem]);
      setNewName("");
      setNewDesc("");
    }
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const handleUpdateDesc = (id: string, description: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, description } : i)));
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="text-xs text-[#E25E45] hover:underline flex-shrink-0"
                >
                  {expandedId === item.id
                    ? t('formBuilder.closeButton')
                    : item.description
                    ? t('formBuilder.editDescButton')
                    : t('formBuilder.addDescriptionButton')}
                </button>
                <button onClick={() => handleRemove(item.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {expandedId === item.id && (
                <div className="px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600">
                  <textarea
                    placeholder={t('formBuilder.addDescriptionPlaceholder')}
                    value={item.description}
                    onChange={(e) => handleUpdateDesc(item.id, e.target.value)}
                    rows={2}
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E25E45] resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <input
          type="text"
          placeholder={t('formBuilder.deliverableNamePlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
        />
        <textarea
          placeholder={t('tenderFlow.describeDeliverable')}
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none text-sm"
        />
        <Button onClick={handleAdd} className="w-full bg-[#E25E45] hover:bg-[#d54d35]">
          <Plus className="h-4 w-4 mr-2" />
          {t('tenderFlow.addDeliverable')}
        </Button>
      </div>
    </div>
  );
}

// Milestones Input Component — project milestones with due dates and descriptions
function MilestonesInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: ProjectMilestone[];
  onChange: (value: ProjectMilestone[]) => void;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newDesc, setNewDesc] = useState("");

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {t('formBuilder.addMilestonesNextStep')}
      </div>
    );
  }

  const items = value || [];

  const handleAdd = () => {
    if (newName.trim()) {
      const newItem: ProjectMilestone = {
        id: `ms-${Date.now()}`,
        name: newName.trim(),
        dueDate: newDate || null,
        description: newDesc.trim(),
      };
      onChange([...items, newItem]);
      setNewName("");
      setNewDate(null);
      setNewDesc("");
    }
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E25E45] flex items-center justify-center text-white text-xs font-bold mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                {item.dueDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('formBuilder.dueLabel')} {new Date(item.dueDate).toLocaleDateString()}
                  </p>
                )}
                {item.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">{item.description}</p>
                )}
              </div>
              <button onClick={() => handleRemove(item.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
        <input
          type="text"
          placeholder={t('tenderFlow.milestoneName')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent text-sm"
        />
        <DatePickerInput
          value={newDate}
          onChange={setNewDate}
          label={t('formBuilder.dueDateOptional')}
        />
        <textarea
          placeholder={t('tenderFlow.addDescription')}
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none text-sm"
        />
        <Button onClick={handleAdd} className="w-full bg-[#E25E45] hover:bg-[#d54d35]">
          <Plus className="h-4 w-4 mr-2" />
          {t('tenderFlow.addMilestone')}
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
  const { t } = useI18n();
  const [tab, setTab] = useState<"text" | "voice">("text");
  const val: DescriptionValue = value && typeof value === "object" && "text" in value
    ? value
    : { text: typeof value === "string" ? (value as string) : "", voiceNoteUrl: "", videoUrl: "" };

  const update = (patch: Partial<DescriptionValue>) => onChange({ ...val, ...patch });

  const countWords = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = countWords(val.text);
  const charCount = val.text.length;

  if (readOnly) {
    return (
      <div className="space-y-2">
        {val.text && <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{val.text}</p>}
        {val.voiceNoteUrl && (
          <div className="flex items-center gap-2 text-xs text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg w-fit">
            <Mic className="h-3.5 w-3.5" /> {t('formBuilder.voiceNoteAttached')}
          </div>
        )}
        {val.videoUrl && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
            <Video className="h-3.5 w-3.5" /> {t('formBuilder.videoLinkAttached')}
          </div>
        )}
        {!val.text && !val.voiceNoteUrl && (
          <p className="text-sm text-gray-400 italic">{t('formBuilder.noDescriptionYet')}</p>
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
          {t('formBuilder.writeTab')}
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
          {t('formBuilder.voiceNoteTab')}
          {val.voiceNoteUrl && (
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 ml-0.5" />
          )}
        </button>
      </div>

      {/* Write tab */}
      {tab === "text" && (
        <div className="space-y-2">
          <textarea
            placeholder={t('tenderFlow.descriptionPlaceholder')}
            value={val.text}
            onChange={(e) => update({ text: e.target.value })}
            maxLength={5000}
            rows={7}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center text-xs">
            <p className={wordCount > 0 && wordCount < 50 ? "text-amber-600 font-medium" : wordCount >= 50 ? "text-green-600 font-medium" : "text-gray-400"}>
              {wordCount < 50
                ? `${Math.max(0, 50 - wordCount)} ${t('tenderFlow.moreWordsNeeded')}`
                : `${t('tenderFlow.minWordCountMet')} ✓`}
            </p>
            <p className="text-gray-400">{wordCount} {t('tenderFlow.words')} · {charCount}/5000</p>
          </div>
        </div>
      )}

      {/* Voice note tab */}
      {tab === "voice" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Sparkles className="h-4 w-4 text-[#E25E45]" />
            {t('formBuilder.recordMessageDesc')}
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
          {t('formBuilder.videoLink')} <span className="font-normal text-gray-400">{t('tenderFlow.optional')}</span>
        </label>
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          value={val.videoUrl}
          onChange={(e) => update({ videoUrl: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent text-sm"
        />
        <p className="text-xs text-gray-400">{t('formBuilder.videoLinkHelper')}</p>
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
  const { t, language } = useI18n();
  const dateLocale = language === 'ar' ? arLocale : undefined;

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {t('formBuilder.setDateNextStep')}
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
          {date ? format(date, "PPP", { locale: dateLocale }) : label || t('tenderFlow.selectDate')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d?.toISOString() || null)}
          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          locale={dateLocale}
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
  const { t, language } = useI18n();
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
        {t('formBuilder.configureEvalNextStep')}
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
            {totalWeight === 100 ? t('tenderFlow.perfectBalance') : t('tenderFlow.weightDistribution')}
          </p>
          <p className={`text-xs mt-0.5 ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-500" : "text-amber-600"}`}>
            {totalWeight === 100
              ? t('tenderFlow.weightsCorrect')
              : totalWeight > 100
              ? `${t('tenderFlow.removeWeight')} ${totalWeight - 100}% ${t('tenderFlow.toBalance')}`
              : `${t('tenderFlow.addWeight')} ${100 - totalWeight}% ${t('tenderFlow.moreWeight')}`}
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
                <span className="font-medium text-sm text-gray-900 dark:text-white">{language === 'ar' ? (CRITERIA_TRANSLATIONS_AR[category.id]?.name || category.name) : category.name}</span>
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
                    <label className="text-xs text-gray-500">{t('tenderFlow.weight')} {currentWeight}%</label>
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
                          <label className="text-sm text-gray-900 dark:text-white">{language === 'ar' ? (CRITERIA_TRANSLATIONS_AR[req.id]?.label || req.label) : req.label}</label>
                          {req.type === "select" && req.options && (
                            <Select
                              value={(currentValue as string) || "none"}
                              onValueChange={(val) => handleReqChange(category.id, req.id, val === "none" ? "" : val)}
                            >
                              <SelectTrigger className="mt-1 w-full text-sm">
                                <SelectValue placeholder={t('tenderFlow.notRequired')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('tenderFlow.notRequired')}</SelectItem>
                                {req.options.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{language === 'ar' ? (CRITERIA_TRANSLATIONS_AR[req.id]?.options?.[opt.value] || opt.label) : opt.label}</SelectItem>
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
          {t('tenderFlow.customCriteria')} <span className="text-gray-400 font-normal">{t('tenderFlow.optional')}</span>
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
            placeholder={t('formBuilder.addCustomCriterionPlaceholder')}
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
interface AttachmentFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
];
const ALLOWED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (type.includes('image')) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (type.includes('word') || type.includes('doc')) return <FileText className="h-4 w-4 text-blue-600" />;
  return <Paperclip className="h-4 w-4 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsInput({
  value,
  onChange,
  readOnly = false,
}: {
  value: AttachmentFile[];
  onChange: (value: AttachmentFile[]) => void;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const files: AttachmentFile[] = Array.isArray(value) ? value : [];

  const uploadFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(t('formBuilder.fileTypeError'));
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(t('formBuilder.fileSizeError'));
      return null;
    }

    const response = await apiRequest('POST', '/api/objects/upload', { fileSize: file.size, fileType: file.type });
    const { uploadURL } = await response.json();

    await fetch(uploadURL, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
    const { objectPath } = await metadataResponse.json();

    return {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      url: objectPath,
      size: file.size,
      type: file.type,
    } as AttachmentFile;
  }, [t]);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) return;

    setUploading(true);
    try {
      const results = await Promise.all(filesToUpload.map(f => uploadFile(f)));
      const uploaded = results.filter(Boolean) as AttachmentFile[];
      if (uploaded.length > 0) {
        onChange([...files, ...uploaded]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert(t('formBuilder.uploadError'));
    } finally {
      setUploading(false);
    }
  }, [files, onChange, uploadFile, t]);

  const removeFile = useCallback((id: string) => {
    onChange(files.filter(f => f.id !== id));
  }, [files, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!readOnly && !uploading) handleFiles(e.dataTransfer.files);
  }, [readOnly, uploading, handleFiles]);

  if (readOnly) {
    if (files.length === 0) {
      return <div className="text-sm text-gray-400 italic py-2">{t('formBuilder.noAttachments')}</div>;
    }
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            {getFileIcon(file.type)}
            <span className="text-sm font-medium text-gray-700 truncate flex-1">{file.name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragOver ? "border-[#E25E45] bg-[#E25E45]/5" : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={ALLOWED_EXTENSIONS}
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-[#E25E45] animate-spin" />
            <p className="text-sm text-gray-500">{t('formBuilder.uploading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-gray-400" />
            <p className="text-sm text-gray-500">{t('formBuilder.dragDropFiles')}</p>
            <p className="text-xs text-gray-400">{t('formBuilder.acceptedFileTypes')}</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group">
              {getFileIcon(file.type)}
              <span className="text-sm font-medium text-gray-700 truncate flex-1">{file.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
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
  const { t } = useI18n();

  if (readOnly) {
    return (
      <div className="text-sm text-gray-400 italic py-2">
        {t('formBuilder.selectOptionNextStep')}
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
          placeholder={t('formBuilder.addOptionPlaceholder')}
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
