import { useDraggable } from "@dnd-kit/core";
import { CARD_LIBRARY, FIELD_INSIGHTS, CardDefinition, CardType } from "@/lib/form-builder-types";
import { Star, GripVertical, CheckCircle2, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface CardLibrarySidebarProps {
  usedCardTypes: string[];
  width?: number;
  onShowInsight?: (type: CardType, pos?: { x: number; y: number }) => void;
  onHideInsight?: () => void;
}

const CARD_COLORS: Record<string, {
  topBg: string;
  iconBg: string;
  border: string;
  hoverBorder: string;
}> = {
  "project-title": {
    topBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    iconBg: "bg-blue-400/30",
    border: "border-blue-200 dark:border-blue-800",
    hoverBorder: "hover:border-blue-400 hover:shadow-blue-100 dark:hover:shadow-blue-900/30",
  },
  "supplier-response": {
    topBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-400/30",
    border: "border-emerald-200 dark:border-emerald-800",
    hoverBorder: "hover:border-emerald-400 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30",
  },
  "project-dates": {
    topBg: "bg-gradient-to-br from-orange-500 to-orange-600",
    iconBg: "bg-orange-400/30",
    border: "border-orange-200 dark:border-orange-800",
    hoverBorder: "hover:border-orange-400 hover:shadow-orange-100 dark:hover:shadow-orange-900/30",
  },
  "budget": {
    topBg: "bg-gradient-to-br from-teal-500 to-teal-600",
    iconBg: "bg-teal-400/30",
    border: "border-teal-200 dark:border-teal-800",
    hoverBorder: "hover:border-teal-400 hover:shadow-teal-100 dark:hover:shadow-teal-900/30",
  },
  "key-deliverables": {
    topBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    iconBg: "bg-indigo-400/30",
    border: "border-indigo-200 dark:border-indigo-800",
    hoverBorder: "hover:border-indigo-400 hover:shadow-indigo-100 dark:hover:shadow-indigo-900/30",
  },
  "project-description": {
    topBg: "bg-gradient-to-br from-amber-500 to-amber-600",
    iconBg: "bg-amber-400/30",
    border: "border-amber-200 dark:border-amber-800",
    hoverBorder: "hover:border-amber-400 hover:shadow-amber-100 dark:hover:shadow-amber-900/30",
  },
  "submission-deadline": {
    topBg: "bg-gradient-to-br from-red-500 to-red-600",
    iconBg: "bg-red-400/30",
    border: "border-red-200 dark:border-red-800",
    hoverBorder: "hover:border-red-400 hover:shadow-red-100 dark:hover:shadow-red-900/30",
  },
  "evaluation-criteria": {
    topBg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    iconBg: "bg-cyan-400/30",
    border: "border-cyan-200 dark:border-cyan-800",
    hoverBorder: "hover:border-cyan-400 hover:shadow-cyan-100 dark:hover:shadow-cyan-900/30",
  },
  "attachments": {
    topBg: "bg-gradient-to-br from-lime-500 to-lime-600",
    iconBg: "bg-lime-400/30",
    border: "border-lime-200 dark:border-lime-800",
    hoverBorder: "hover:border-lime-400 hover:shadow-lime-100 dark:hover:shadow-lime-900/30",
  },
  "milestones": {
    topBg: "bg-gradient-to-br from-purple-500 to-purple-600",
    iconBg: "bg-purple-400/30",
    border: "border-purple-200 dark:border-purple-800",
    hoverBorder: "hover:border-purple-400 hover:shadow-purple-100 dark:hover:shadow-purple-900/30",
  },
  "custom-text": {
    topBg: "bg-gradient-to-br from-slate-500 to-slate-600",
    iconBg: "bg-slate-400/30",
    border: "border-slate-200 dark:border-slate-700",
    hoverBorder: "hover:border-slate-400 hover:shadow-slate-100 dark:hover:shadow-slate-900/30",
  },
  "custom-textarea": {
    topBg: "bg-gradient-to-br from-violet-500 to-violet-600",
    iconBg: "bg-violet-400/30",
    border: "border-violet-200 dark:border-violet-800",
    hoverBorder: "hover:border-violet-400 hover:shadow-violet-100 dark:hover:shadow-violet-900/30",
  },
  "custom-date": {
    topBg: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600",
    iconBg: "bg-fuchsia-400/30",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    hoverBorder: "hover:border-fuchsia-400 hover:shadow-fuchsia-100 dark:hover:shadow-fuchsia-900/30",
  },
  "custom-select": {
    topBg: "bg-gradient-to-br from-sky-500 to-sky-600",
    iconBg: "bg-sky-400/30",
    border: "border-sky-200 dark:border-sky-800",
    hoverBorder: "hover:border-sky-400 hover:shadow-sky-100 dark:hover:shadow-sky-900/30",
  },
};

const DEFAULT_COLORS = {
  topBg: "bg-gradient-to-br from-gray-500 to-gray-600",
  iconBg: "bg-gray-400/30",
  border: "border-gray-200 dark:border-gray-700",
  hoverBorder: "hover:border-gray-400",
};

export function CardLibrarySidebar({ usedCardTypes, width = 288, onShowInsight, onHideInsight }: CardLibrarySidebarProps) {
  const { t } = useI18n();

  const translatedCardInfo: Record<string, { label: string; description: string }> = {
    'project-title': { label: t('formBuilder.cardProjectTitleLabel'), description: t('formBuilder.cardProjectTitleDesc') },
    'supplier-response': { label: t('formBuilder.cardVendorResponseLabel'), description: t('formBuilder.cardVendorResponseDesc') },
    'project-dates': { label: t('formBuilder.cardTimelineLabel'), description: t('formBuilder.cardTimelineDesc') },
    'budget': { label: t('formBuilder.cardBudgetLabel'), description: t('formBuilder.cardBudgetDesc') },
    'key-deliverables': { label: t('formBuilder.cardDeliverablesLabel'), description: t('formBuilder.cardDeliverablesDesc') },
    'milestones': { label: t('formBuilder.cardMilestonesLabel'), description: t('formBuilder.cardMilestonesDesc') },
    'project-description': { label: t('formBuilder.cardDescriptionLabel'), description: t('formBuilder.cardDescriptionDesc') },
    'submission-deadline': { label: t('formBuilder.cardDeadlineLabel'), description: t('formBuilder.cardDeadlineDesc') },
    'evaluation-criteria': { label: t('formBuilder.cardEvalLabel'), description: t('formBuilder.cardEvalDesc') },
    'attachments': { label: t('formBuilder.cardAttachmentsLabel'), description: t('formBuilder.cardAttachmentsDesc') },
    'custom-text': { label: t('formBuilder.cardShortAnswerLabel'), description: t('formBuilder.cardShortAnswerDesc') },
    'custom-textarea': { label: t('formBuilder.cardLongAnswerLabel'), description: t('formBuilder.cardLongAnswerDesc') },
    'custom-date': { label: t('formBuilder.cardDateLabel'), description: t('formBuilder.cardDateDesc') },
    'custom-select': { label: t('formBuilder.cardMultipleChoiceLabel'), description: t('formBuilder.cardMultipleChoiceDesc') },
  };

  return (
    <div
      style={{ width: `${width}px` }}
      className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
    >
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('formBuilder.cardLibrary')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('formBuilder.cardLibrarySubtitle')}</p>
        </div>

        {/* Required Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            {t('formBuilder.sectionRequired')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {CARD_LIBRARY.required.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={{ ...card, label: translatedCardInfo[card.type]?.label ?? card.label, description: translatedCardInfo[card.type]?.description ?? card.description }}
                isUsed={usedCardTypes.includes(card.type)}
                isRequired
                onShowInsight={onShowInsight}
                onHideInsight={onHideInsight}
                addedLabel={t('formBuilder.added')}
                dragToAddLabel={t('formBuilder.dragToAdd')}
              />
            ))}
          </div>
        </div>

        {/* Standard Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('formBuilder.sectionStandard')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {CARD_LIBRARY.standard.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={{ ...card, label: translatedCardInfo[card.type]?.label ?? card.label, description: translatedCardInfo[card.type]?.description ?? card.description }}
                isUsed={usedCardTypes.includes(card.type)}
                onShowInsight={onShowInsight}
                onHideInsight={onHideInsight}
                addedLabel={t('formBuilder.added')}
                dragToAddLabel={t('formBuilder.dragToAdd')}
              />
            ))}
          </div>
        </div>

        {/* Custom Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('formBuilder.sectionCustom')}
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
            {t('formBuilder.sectionCustomSubtitle')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CARD_LIBRARY.custom.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={{ ...card, label: translatedCardInfo[card.type]?.label ?? card.label, description: translatedCardInfo[card.type]?.description ?? card.description }}
                isUsed={false}
                allowMultiple
                onShowInsight={onShowInsight}
                onHideInsight={onHideInsight}
                addedLabel={t('formBuilder.added')}
                dragToAddLabel={t('formBuilder.dragToAdd')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DraggableLibraryCardProps {
  card: CardDefinition;
  isUsed: boolean;
  isRequired?: boolean;
  allowMultiple?: boolean;
  onShowInsight?: (type: CardType, pos?: { x: number; y: number }) => void;
  onHideInsight?: () => void;
  addedLabel?: string;
  dragToAddLabel?: string;
}

function DraggableLibraryCard({
  card,
  isUsed,
  isRequired,
  allowMultiple,
  onShowInsight,
  addedLabel = "Added",
  dragToAddLabel = "Drag to add",
}: DraggableLibraryCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${card.type}`,
    data: {
      type: "library-card",
      cardDefinition: card,
    },
    disabled: isUsed && !allowMultiple,
  });

  const Icon = card.icon;
  const isDisabled = isUsed && !allowMultiple;
  const colors = CARD_COLORS[card.type] ?? DEFAULT_COLORS;
  const insight = FIELD_INSIGHTS[card.type];

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const handleMoreClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onShowInsight?.(card.type, { x: rect.left, y: rect.bottom + 4 });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group flex flex-col rounded-xl border-2 overflow-hidden outline-none transition-all duration-200 ${
        isDragging
          ? "opacity-50 shadow-2xl scale-105 z-50 border-[#E25E45]"
          : isDisabled
          ? `opacity-55 cursor-not-allowed ${colors.border}`
          : `${colors.border} ${colors.hoverBorder} cursor-grab hover:shadow-lg hover:-translate-y-0.5`
      }`}
    >
      {/* Colored top section */}
      <div className={`relative px-3 pt-3 pb-3 ${colors.topBg}`}>
        <div className="flex items-start justify-between gap-1">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${colors.iconBg}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-1">
            {insight && !isDisabled && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleMoreClick}
                className="p-1 rounded-md hover:bg-white/20 transition-colors flex-shrink-0"
                title="Field tips & best practices"
                aria-label="Show field tips"
              >
                <Info className="h-3.5 w-3.5 text-white/70" />
              </button>
            )}
            {isRequired && !isDisabled && (
              <Star className="h-3 w-3 text-amber-300 fill-amber-300 flex-shrink-0 mt-0.5" />
            )}
            {isDisabled && (
              <div className="flex items-center gap-1 bg-white/20 rounded-full px-1.5 py-0.5">
                <CheckCircle2 className="h-3 w-3 text-white" />
                <span className="text-[10px] font-medium text-white leading-none">{addedLabel}</span>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm font-semibold text-white leading-snug">
          {card.label}
        </p>
      </div>

      {/* Card body */}
      <div className="px-3 py-2.5 flex flex-col gap-2 flex-1 bg-white dark:bg-gray-800">
        {/* Description — short one-liner from the library definition */}
        <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
          {card.description}
        </p>

        {/* Bottom row: drag hint */}
        {!isDisabled && (
          <div className="flex items-center gap-1 pt-0.5">
            <GripVertical className="h-3 w-3 text-gray-300 dark:text-gray-600" />
            <span className="text-[10px] text-gray-300 dark:text-gray-600">{dragToAddLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
