import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FormCard } from "@/lib/form-builder-types";
import { DraggableCard } from "./DraggableCard";
import { Plus } from "lucide-react";

interface FormBuilderCanvasProps {
  cards: FormCard[];
  onRemoveCard: (id: string) => void;
  onUpdateCard: (id: string, updates: Partial<FormCard>) => void;
}

export function FormBuilderCanvas({
  cards,
  onRemoveCard,
  onUpdateCard,
}: FormBuilderCanvasProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "form-canvas",
  });

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Tender Form
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Drag cards from the sidebar to build your custom tender form
          </p>
        </div>

        <div
          ref={setNodeRef}
          className={`space-y-4 min-h-[400px] transition-colors rounded-lg ${
            isOver ? "bg-[#E25E45]/5" : ""
          }`}
        >
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <DraggableCard
                key={card.id}
                card={card}
                onRemove={onRemoveCard}
                onUpdate={onUpdateCard}
              />
            ))}
          </SortableContext>

          {/* Drop Zone Indicator */}
          <DropZoneIndicator isEmpty={cards.length === 0} isOver={isOver} />
        </div>
      </div>
    </div>
  );
}

interface DropZoneIndicatorProps {
  isEmpty: boolean;
  isOver: boolean;
}

function DropZoneIndicator({ isEmpty, isOver }: DropZoneIndicatorProps) {
  if (!isEmpty && !isOver) {
    return (
      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center transition-colors hover:border-gray-300">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Drop more cards here
        </p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
          isOver
            ? "border-[#E25E45] bg-[#E25E45]/5"
            : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isOver
              ? "bg-[#E25E45]/10"
              : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          <Plus
            className={`h-8 w-8 ${
              isOver ? "text-[#E25E45]" : "text-gray-400"
            }`}
          />
        </div>
        <p
          className={`text-lg font-medium ${
            isOver ? "text-[#E25E45]" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {isOver ? "Drop here to add" : "Drag cards here to start"}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Build your custom tender form by dragging cards from the library
        </p>
      </div>
    );
  }

  return null;
}
