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
  DragOverEvent,
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
import {
  FormCard,
  CardDefinition,
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
          return parsedCards;
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

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(288); // 288px = w-72 default
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const isResizing = useRef(false);
  const minSidebarWidth = 200;
  const maxSidebarWidth = 500;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, e.clientX));
    setSidebarWidth(newWidth);
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

  // Validate required fields are complete
  const { isFormValid, missingFields } = useMemo(() => {
    const missing: string[] = [];
    
    for (const card of cards) {
      if (card.isRequired) {
        const isEmpty = 
          card.value === null || 
          card.value === undefined || 
          card.value === "" ||
          (Array.isArray(card.value) && card.value.length === 0);
        
        if (isEmpty) {
          missing.push(card.label);
        }
      }
    }
    
    return { isFormValid: missing.length === 0, missingFields: missing };
  }, [cards]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveDragData(event.active.data.current);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Could add visual feedback here
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

  const handleReviewAndLaunch = () => {
    // Save full card state (with values) to localStorage for review phase
    const TENDER_STATE_KEY = "tender_form_state";
    localStorage.setItem(TENDER_STATE_KEY, JSON.stringify(cards));

    // Navigate to review page
    navigate("/tenders/new/review");
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
      onDragOver={handleDragOver}
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
                  Build Your Tender Form
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag and drop to customize
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleReviewAndLaunch}
                disabled={!isFormValid}
                className={isFormValid 
                  ? "bg-[#E25E45] hover:bg-[#d54d35] text-white" 
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"}
                title={!isFormValid ? `Complete required fields: ${missingFields.join(", ")}` : ""}
              >
                Review & Launch
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
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
                <CardLibrarySidebar usedCardTypes={usedCardTypes} width={sidebarWidth} />

                {/* Resize Handle */}
                <div
                  onMouseDown={handleMouseDown}
                  className="w-1 hover:w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-[#E25E45] cursor-col-resize transition-all flex-shrink-0 group relative"
                >
                  <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#E25E45]/10" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FormBuilderCanvas
            cards={cards}
            onRemoveCard={handleRemoveCard}
            onUpdateCard={handleUpdateCard}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {renderDragOverlay()}
        </DragOverlay>

      </div>
    </DndContext>
  );
}

// Helper function to build tender data from cards
function buildTenderData(cards: FormCard[]): Record<string, any> {
  const data: Record<string, any> = {};

  for (const card of cards) {
    switch (card.type) {
      case "project-title":
        data.title = card.value;
        break;
      case "project-type":
        data.projectType = card.value;
        break;
      case "supplier-response":
        data.submissionType = card.value;
        break;
      case "project-dates":
        if (card.value) {
          data.startDate = card.value.startDate;
          data.endDate = card.value.endDate;
          data.deliveryDate = card.value.deliveryDate;
        }
        break;
      case "budget":
        if (card.value) {
          if (card.value.type === "exact") {
            data.budget = card.value.amount;
          } else {
            data.budgetMin = card.value.min;
            data.budgetMax = card.value.max;
          }
        }
        break;
      case "project-objective":
        data.projectObjective = card.value;
        break;
      case "key-deliverables":
        data.keyDeliverables = card.value;
        break;
      case "project-description":
        data.projectDescription = card.value;
        break;
      case "submission-deadline":
        data.submissionDeadline = card.value;
        break;
      case "evaluation-criteria":
        data.evaluationCriteria = card.value;
        break;
      case "attachments":
        data.attachments = card.value;
        break;
      default:
        // Custom fields
        if (card.type.startsWith("custom-")) {
          if (!data.customFields) data.customFields = [];
          data.customFields.push({
            label: card.label,
            type: card.type,
            value: card.value,
            options: card.options,
          });
        }
    }
  }

  return data;
}
