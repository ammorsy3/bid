import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CARD_LIBRARY, CardDefinition, CardType } from "@/lib/form-builder-types";
import { Star, GripVertical } from "lucide-react";

interface CardLibrarySidebarProps {
  usedCardTypes: string[];
  width?: number;
  onShowInsight?: (type: CardType) => void;
}

export function CardLibrarySidebar({ usedCardTypes, width = 288, onShowInsight }: CardLibrarySidebarProps) {
  return (
    <div 
      style={{ width: `${width}px` }}
      className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Card Library
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Drag cards to build your form
          </p>
        </div>

        {/* Required Cards */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            Required
          </h4>
          <div className="space-y-2">
            {CARD_LIBRARY.required.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={card}
                isUsed={usedCardTypes.includes(card.type)}
                isRequired
                onShowInsight={onShowInsight}
              />
            ))}
          </div>
        </div>

        {/* Standard Cards */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Standard Fields
          </h4>
          <div className="space-y-2">
            {CARD_LIBRARY.standard.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={card}
                isUsed={usedCardTypes.includes(card.type)}
                onShowInsight={onShowInsight}
              />
            ))}
          </div>
        </div>

        {/* Custom Cards */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Custom Fields
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Create your own questions
          </p>
          <div className="space-y-2">
            {CARD_LIBRARY.custom.map((card) => (
              <DraggableLibraryCard
                key={card.type}
                card={card}
                isUsed={false}
                allowMultiple
                onShowInsight={onShowInsight}
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
  onShowInsight?: (type: CardType) => void;
}

function DraggableLibraryCard({
  card,
  isUsed,
  isRequired,
  allowMultiple,
  onShowInsight,
}: DraggableLibraryCardProps) {
  const didDrag = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `library-${card.type}`,
    data: {
      type: "library-card",
      cardDefinition: card,
    },
    disabled: isUsed && !allowMultiple,
  });

  const Icon = card.icon;
  const isDisabled = isUsed && !allowMultiple;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Track whether a drag happened so we can distinguish click vs drag
  if (isDragging) {
    didDrag.current = true;
  }

  const handleClick = () => {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    onShowInsight?.(card.type);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all outline-none ${
        isDragging
          ? "opacity-50 border-[#E25E45] bg-[#E25E45]/5 shadow-lg z-50"
          : isDisabled
          ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-[#E25E45] hover:shadow-sm"
      }`}
    >
      <GripVertical className={`h-4 w-4 flex-shrink-0 ${isDisabled ? "text-gray-300" : "text-gray-400"}`} />
      <div className={`p-1.5 rounded ${isDisabled ? "bg-gray-200 dark:bg-gray-700" : "bg-gray-100 dark:bg-gray-700"}`}>
        <Icon className={`h-4 w-4 ${isDisabled ? "text-gray-400" : "text-gray-600 dark:text-gray-300"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium truncate ${isDisabled ? "text-gray-400" : "text-gray-900 dark:text-white"}`}>
            {card.label}
          </span>
          {isRequired && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className={`text-xs truncate ${isDisabled ? "text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
          {card.description}
        </p>
      </div>
      {isUsed && !allowMultiple && (
        <span className="text-xs text-gray-400 flex-shrink-0">Added</span>
      )}
    </div>
  );
}
