import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FormCard } from "@/lib/form-builder-types";
import { DraggableCard } from "./DraggableCard";
import { Plus, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

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
  
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [topPadding, setTopPadding] = useState(100);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const FIXED_TOP_PADDING = 60;
  const MIN_BOTTOM_PADDING = 100;
  
  const dotColor = theme === 'dark'
    ? 'rgba(139, 92, 246, 0.15)'
    : 'rgba(156, 163, 175, 0.3)';

  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.1, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.1, MIN_SCALE));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    if (canvasRef.current) {
      canvasRef.current.scrollTop = 0;
    }
  }, []);

  useLayoutEffect(() => {
    if (!canvasRef.current || !contentRef.current) return;
    
    const canvasHeight = canvasRef.current.clientHeight;
    const contentHeight = contentRef.current.scrollHeight * scale;
    
    if (contentHeight < canvasHeight) {
      const padding = Math.max(FIXED_TOP_PADDING, (canvasHeight - contentHeight) / 2);
      setTopPadding(padding);
    } else {
      setTopPadding(FIXED_TOP_PADDING);
    }
  }, [cards.length, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale((s) => Math.min(Math.max(s + delta, MIN_SCALE), MAX_SCALE));
      } else {
        const newScrollTop = canvas.scrollTop + e.deltaY;
        const maxScroll = canvas.scrollHeight - canvas.clientHeight;
        canvas.scrollTop = Math.max(0, Math.min(newScrollTop, maxScroll));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div 
      className="flex-1 flex flex-col relative"
      style={{ overflow: 'hidden' }}
    >
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1 border border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="h-8 w-8"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="h-8 w-8"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetZoom}
          className="h-8 w-8"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={canvasRef}
        className="relative z-10 flex-1 hide-scrollbar"
        style={{ 
          overflowX: 'hidden',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />

        <div
          ref={contentRef}
          className="relative z-10 flex flex-col items-center"
          style={{
            paddingTop: `${topPadding}px`,
            paddingBottom: `${MIN_BOTTOM_PADDING}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <div className="w-full max-w-2xl px-6">
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
              className={`space-y-4 min-h-[200px] transition-colors rounded-lg ${
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

              <DropZoneIndicator isEmpty={cards.length === 0} isOver={isOver} />
            </div>
          </div>
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
