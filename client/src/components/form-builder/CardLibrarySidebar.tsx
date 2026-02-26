import { useDraggable } from "@dnd-kit/core";
import { CARD_LIBRARY, FIELD_INSIGHTS, CardDefinition, CardType } from "@/lib/form-builder-types";
import { Star, GripVertical, CheckCircle2 } from "lucide-react";

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
  "project-objective": {
    topBg: "bg-gradient-to-br from-rose-500 to-rose-600",
    iconBg: "bg-rose-400/30",
    border: "border-rose-200 dark:border-rose-800",
    hoverBorder: "hover:border-rose-400 hover:shadow-rose-100 dark:hover:shadow-rose-900/30",
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
  return (
    <div
      style={{ width: `${width}px` }}
      className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
    >
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Card Library</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Drag cards onto the canvas to build your form</p>
        </div>

        {/* Required Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            Required
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {CARD_LIBRARY.required.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={card}
                isUsed={usedCardTypes.includes(card.type)}
                isRequired
                onShowInsight={onShowInsight}
                onHideInsight={onHideInsight}
              />
            ))}
          </div>
        </div>

        {/* Standard Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Standard Fields
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {CARD_LIBRARY.standard.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={card}
                isUsed={usedCardTypes.includes(card.type)}
                onShowInsight={onShowInsight}
                onHideInsight={onHideInsight}
              />
            ))}
          </div>
        </div>

        {/* Custom Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Custom Fields
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
            Create your own questions — add as many as you need
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CARD_LIBRARY.custom.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={card}
                isUsed={false}
                allowMultiple
                onShowInsight={onShowInsight}
                onHideInsight={onHideInsight}
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
}

function DraggableLibraryCard({
  card,
  isUsed,
  isRequired,
  allowMultiple,
  onShowInsight,
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
          {isRequired && !isDisabled && (
            <Star className="h-3 w-3 text-amber-300 fill-amber-300 flex-shrink-0 mt-0.5" />
          )}
          {isDisabled && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-1.5 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-white" />
              <span className="text-[10px] font-medium text-white leading-none">Added</span>
            </div>
          )}
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

        {/* Bottom row: drag hint + more button */}
        <div className="flex items-center justify-between pt-0.5">
          {!isDisabled ? (
            <div className="flex items-center gap-1">
              <GripVertical className="h-3 w-3 text-gray-300 dark:text-gray-600" />
              <span className="text-[10px] text-gray-300 dark:text-gray-600">Drag to add</span>
            </div>
          ) : (
            <span />
          )}
          {insight && !isDisabled && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleMoreClick}
              className="text-[10px] font-medium text-[#E25E45] hover:text-[#d54d35] hover:underline transition-colors leading-none"
            >
              ...more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
