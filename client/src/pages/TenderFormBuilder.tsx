import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { TourBanner } from "@/lib/tour";
import { TOUR_BANNERS } from "@/lib/tour-steps";
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
import { ArrowLeft, ArrowRight, LayoutList, PlusSquare } from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";
import { CardLibrarySidebar } from "@/components/form-builder/CardLibrarySidebar";
import { FormBuilderCanvas } from "@/components/form-builder/FormBuilderCanvas";
import { DraggableCard, LibraryCard } from "@/components/form-builder/DraggableCard";
import { FieldInsightPanel } from "@/components/form-builder/FieldInsightPanel";
import { StepIndicator } from "@/components/form-builder/StepIndicator";
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
  const { t, language, isRtl } = useI18n();
  const { user } = useAuthStore();

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
  const [mobileTab, setMobileTab] = useState<'canvas' | 'library'>('canvas');

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

  // Persist every change locally as it happens, not just on "Continue" —
  // otherwise a refresh or back-nav mid-edit silently drops typed input.
  useEffect(() => {
    localStorage.setItem(TENDER_STATE_KEY, JSON.stringify(cards));
  }, [cards]);

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

  const handleAddCard = useCallback((cardDef: CardDefinition) => {
    if (!cardDef.isCustom && usedCardTypes.includes(cardDef.type)) return;
    setCards((prev) => [...prev, createFormCard(cardDef)]);
    setMobileTab('canvas');
  }, [usedCardTypes]);

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
      <div className="h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-950">

        {/* ── Mobile Header ── */}
        <header className="sm:hidden flex-shrink-0 bg-white dark:bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BidLogo variant="orange" size={32} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/dashboard")} />
              <span className="text-sm font-semibold text-gray-900 dark:text-foreground leading-tight">
                {t('tenderFlow.formBuilderTitle')}
              </span>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" dir="ltr">
              1 / 3
            </span>
          </div>
        </header>

        {/* ── Desktop Header ── */}
        <header className="hidden sm:flex flex-shrink-0 bg-white dark:bg-background border-b border-border dark:border-border px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <BidLogo variant="orange" size={40} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/dashboard")} />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                  {t('tenderFlow.formBuilderTitle')}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('tenderFlow.formBuilderSubtitle')}
                </p>
              </div>
            </div>

            <StepIndicator
              steps={[{ label: t('tenderFlow.stepStructure') }, { label: t('tenderFlow.stepFillDetails') }, { label: t('tenderFlow.stepReview') }]}
              currentStep={1}
            />

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('tenderFlow.back')}
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                className="bg-[#FE3C01] hover:bg-[#d54d35] text-white"
              >
                {t('tenderFlow.continueToDetails')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </header>

        {/* Onboarding hint — desktop only */}
        {user && (
          <div className="hidden sm:block flex-shrink-0 px-6 pt-3">
            <TourBanner
              tourId="hint-form-builder"
              userId={user.id}
              title={TOUR_BANNERS.formBuilder[language === 'ar' ? 'ar' : 'en'].title}
              body={TOUR_BANNERS.formBuilder[language === 'ar' ? 'ar' : 'en'].body}
              isRtl={isRtl}
            />
          </div>
        )}

        {/* ── Mobile Layout: tabbed canvas / library ── */}
        <div className="sm:hidden flex flex-col flex-1 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex flex-shrink-0 border-b border-border bg-white dark:bg-background">
            <button
              onClick={() => setMobileTab('canvas')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === 'canvas'
                  ? 'text-[#FE3C01] border-b-2 border-[#FE3C01]'
                  : 'text-muted-foreground border-b-2 border-transparent'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              {t('tenderFlow.stepStructure')}
            </button>
            <button
              onClick={() => setMobileTab('library')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                mobileTab === 'library'
                  ? 'text-[#FE3C01] border-b-2 border-[#FE3C01]'
                  : 'text-muted-foreground border-b-2 border-transparent'
              }`}
            >
              <PlusSquare className="h-4 w-4" />
              {t('formBuilder.cardLibrary')}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {mobileTab === 'canvas' ? (
              <FormBuilderCanvas
                cards={cards}
                onRemoveCard={handleRemoveCard}
                onUpdateCard={handleUpdateCard}
                sidebarVisible={false}
                onToggleSidebar={() => setMobileTab('library')}
                structureOnly={true}
              />
            ) : (
              <CardLibrarySidebar
                usedCardTypes={usedCardTypes}
                fullWidth
                onAddCard={handleAddCard}
                onShowInsight={(type, pos) => {
                  setInsightCardType(type);
                  setCursorPos(pos ?? null);
                }}
                onHideInsight={() => {
                  setInsightCardType(null);
                  setCursorPos(null);
                }}
              />
            )}
          </div>

          {/* Mobile bottom action bar */}
          <div
            className="flex-shrink-0 flex gap-3 px-4 pt-3 pb-3 bg-white dark:bg-background border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            <Button variant="outline" onClick={handleBack} className="flex-1 h-11">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('tenderFlow.back')}
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className="flex-1 h-11 bg-[#FE3C01] hover:bg-[#d54d35] text-white"
            >
              {t('tenderFlow.continueToDetails')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* ── Desktop Layout: canvas + sidebar ── */}
        <div className="hidden sm:flex flex-1 overflow-hidden">
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
                  className="w-1 hover:w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-[#FE3C01] cursor-col-resize transition-all flex-shrink-0 group relative"
                >
                  <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#FE3C01]/10" />
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

