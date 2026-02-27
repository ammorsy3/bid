import { useState, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { CardLibrarySidebar } from "@/components/form-builder/CardLibrarySidebar";
import { FormBuilderCanvas } from "@/components/form-builder/FormBuilderCanvas";
import { DraggableCard, LibraryCard } from "@/components/form-builder/DraggableCard";
import { FieldInsightPanel } from "@/components/form-builder/FieldInsightPanel";
import {
  FormCard,
  CardDefinition,
  CardType,
  CARD_LIBRARY,
  createFormCard,
  getCardDefinition,
} from "@/lib/form-builder-types";

const TENDER_STATE_KEY = "tender_form_state";

export default function TenderFormBuilder() {
  const [, navigate] = useLocation();

  // Initialize cards - check for saved template/state first, then fall back to required cards
  const [cards, setCards] = useState<FormCard[]>(() => {
    const savedState = localStorage.getItem(TENDER_STATE_KEY);
    if (savedState) {
      try {
        const parsedCards = JSON.parse(savedState);
        if (Array.isArray(parsedCards) && parsedCards.length > 0) {
          // Sync labels from the current library for non-custom cards so label
          // changes in the library are always reflected on the canvas.
          return parsedCards.map((card: FormCard) => {
            const definition = getCardDefinition(card.type);
            if (definition && !definition.isCustom) {
              return { ...card, label: definition.label };
            }
            return card;
          });
        }
      } catch (e) {
        console.error("Error parsing saved cards:", e);
      }
    }
    // Fall back to default required cards
    return CARD_LIBRARY.required.map((def) => createFormCard(def));
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [insightCardType, setInsightCardType] = useState<CardType | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Sidebar resize state — default 50%, min 40%, max 60% of viewport
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("tender_sidebar_width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      const min = Math.round(window.innerWidth * 0.40);
      const max = Math.round(window.innerWidth * 0.60);
      if (!isNaN(parsed) && parsed >= min && parsed <= max) return parsed;
    }
    return Math.round(window.innerWidth * 0.50);
  });
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const min = Math.round(window.innerWidth * 0.40);
    const max = Math.round(window.innerWidth * 0.60);
    const newWidth = Math.min(max, Math.max(min, window.innerWidth - e.clientX));
    setSidebarWidth(newWidth);
    localStorage.setItem("tender_sidebar_width", String(newWidth));
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get list of card types already in the form
  const usedCardTypes = cards.map((c) => c.type);

  // Step 1 is valid as long as the user has at least the required cards (always true)
  const canContinue = cards.length > 0;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveDragData(event.active.data.current);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveDragData(null);

      if (!over) return;

      const activeData = active.data.current;

      // Handle dropping from library
      if (activeData?.type === "library-card") {
        const cardDefinition = activeData.cardDefinition as CardDefinition;

        // Check if non-custom card is already in form
        if (
          !cardDefinition.isCustom &&
          usedCardTypes.includes(cardDefinition.type)
        ) {
          return;
        }

        // Create new card and add to form
        const newCard = createFormCard(cardDefinition);
        setCards((prev) => [...prev, newCard]);
        return;
      }

      // Handle reordering within canvas
      if (active.id !== over.id) {
        setCards((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);

          if (oldIndex !== -1 && newIndex !== -1) {
            return arrayMove(items, oldIndex, newIndex);
          }
          return items;
        });
      }
    },
    [usedCardTypes]
  );

  const handleRemoveCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleUpdateCard = useCallback(
    (id: string, updates: Partial<FormCard>) => {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const handleBack = () => {
    navigate("/tenders/new/manual");
  };

  const handleContinue = () => {
    // Save card structure to localStorage — values filled in Step 2
    localStorage.setItem(TENDER_STATE_KEY, JSON.stringify(cards));
    navigate("/tenders/new/fill");
  };

  // Render drag overlay
  const renderDragOverlay = () => {
    if (!activeId || !activeDragData) return null;

    if (activeDragData.type === "library-card") {
      const def = activeDragData.cardDefinition as CardDefinition;
      return (
        <div className="opacity-80">
          <LibraryCard
            type={def.type}
            label={def.label}
            description={def.description}
            icon={def.icon}
            isRequired={def.isRequired}
          />
        </div>
      );
    }

    const card = cards.find((c) => c.id === activeId);
    if (card) {
      return <DraggableCard card={card} isOverlay />;
    }

    return null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={logoPath}
                alt="Bid"
                className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate("/dashboard")}
              />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Build Your RFP Structure
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Step 1 of 3 — Choose and arrange your form fields
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#E25E45] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span className="font-medium text-gray-900 dark:text-white">Structure</span>
              </div>
              <div className="w-6 h-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center text-[10px] font-bold">2</span>
                <span className="text-gray-400">Fill Details</span>
              </div>
              <div className="w-6 h-px bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 flex items-center justify-center text-[10px] font-bold">3</span>
                <span className="text-gray-400">Review</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                className="bg-[#E25E45] hover:bg-[#d54d35] text-white"
              >
                Continue to Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <FormBuilderCanvas
            cards={cards}
            onRemoveCard={handleRemoveCard}
            onUpdateCard={handleUpdateCard}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
            structureOnly={true}
          />

          <AnimatePresence mode="wait">
            {sidebarVisible && (
              <motion.div
                key="sidebar"
                initial={{ width: 0 }}
                animate={{ width: sidebarWidth + 4 }}
                exit={{ width: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex flex-shrink-0 overflow-hidden"
              >
                {/* Resize Handle - left of sidebar */}
                <div
                  onMouseDown={handleMouseDown}
                  className="w-1 hover:w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-[#E25E45] cursor-col-resize transition-all flex-shrink-0 group relative"
                >
                  <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#E25E45]/10" />
                </div>

                <CardLibrarySidebar
                  usedCardTypes={usedCardTypes}
                  width={sidebarWidth}
                  onShowInsight={(type, pos) => {
                    setInsightCardType(type);
                    setCursorPos(pos ?? null);
                  }}
                  onHideInsight={() => {
                    setInsightCardType(null);
                    setCursorPos(null);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {renderDragOverlay()}
        </DragOverlay>

        {/* Field Insight Panel */}
        <FieldInsightPanel
          cardType={insightCardType}
          cursorPos={cursorPos}
          onClose={() => { setInsightCardType(null); setCursorPos(null); }}
        />
      </div>
    </DndContext>
  );
}

