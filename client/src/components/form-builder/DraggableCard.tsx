import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Star, Pencil } from "lucide-react";
import { FormCard, getCardDefinition } from "@/lib/form-builder-types";
import { useState } from "react";
import { CardInputRenderer } from "./CardInputRenderer";

interface DraggableCardProps {
  card: FormCard;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<FormCard>) => void;
  isOverlay?: boolean;
  readOnly?: boolean;
}

export function DraggableCard({
  card,
  onRemove,
  onUpdate,
  isOverlay = false,
  readOnly = false,
}: DraggableCardProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState(card.label);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const definition = getCardDefinition(card.type);
  const Icon = definition?.icon;
  const isCustomCard = definition?.isCustom;

  const handleLabelSave = () => {
    if (editedLabel.trim() && onUpdate) {
      onUpdate(card.id, { label: editedLabel.trim() });
    }
    setIsEditingLabel(false);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLabelSave();
    } else if (e.key === "Escape") {
      setEditedLabel(card.label);
      setIsEditingLabel(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 border-2 rounded-xl transition-all duration-200 ${
        isDragging
          ? "opacity-50 border-[#E25E45] shadow-lg"
          : "border-gray-200 dark:border-gray-700 shadow-sm hover:border-[#E25E45] hover:shadow-[0_0_0_4px_rgba(226,94,69,0.15)]"
      } ${isOverlay ? "shadow-2xl rotate-2" : ""}`}
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>

        {/* Icon */}
        {Icon && (
          <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-700">
            <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </div>
        )}

        {/* Label */}
        <div className="flex-1 flex items-center gap-2">
          {isEditingLabel ? (
            <input
              type="text"
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={handleLabelKeyDown}
              className="flex-1 px-2 py-1 text-sm font-medium bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[#E25E45]"
              autoFocus
            />
          ) : (
            <>
              <span className="font-medium text-gray-900 dark:text-white">
                {card.label}
              </span>
              {card.isRequired && (
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              )}
            </>
          )}
        </div>

        {/* Edit Label Button (for custom cards) */}
        {isCustomCard && !isEditingLabel && (
          <button
            onClick={() => setIsEditingLabel(true)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit question"
          >
            <Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {/* Remove Button (only for non-required cards) */}
        {!card.isRequired && onRemove && (
          <button
            onClick={() => onRemove(card.id)}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors group"
            title="Remove card"
          >
            <X className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
          </button>
        )}
      </div>

      {/* Card Content - Input Area */}
      <div className="p-4">
        <CardInputRenderer card={card} onUpdate={onUpdate} readOnly={readOnly} />
      </div>
    </div>
  );
}

// Simplified version for the sidebar library
interface LibraryCardProps {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isRequired?: boolean;
}

export function LibraryCard({
  label,
  description,
  icon: Icon,
  isRequired,
}: LibraryCardProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-grab active:cursor-grabbing hover:border-[#E25E45] hover:shadow-sm transition-all">
      <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-700">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {label}
          </span>
          {isRequired && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {description}
        </p>
      </div>
    </div>
  );
}
