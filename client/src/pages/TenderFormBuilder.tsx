import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
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
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function TenderFormBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Initialize with ALL required cards
  const [cards, setCards] = useState<FormCard[]>(() => {
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

  // Save as template dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleContinueToFill = () => {
    // Save form structure (with ids but without values) to localStorage for fill phase
    const FORM_STRUCTURE_KEY = "tender_form_structure";
    const formStructure = cards.map((card) => ({
      id: card.id,
      type: card.type,
      label: card.label,
      isRequired: card.isRequired,
      options: card.options,
      placeholder: card.placeholder,
    }));
    localStorage.setItem(FORM_STRUCTURE_KEY, JSON.stringify(formStructure));

    // Navigate to fill page
    navigate("/tenders/new/fill");
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Template name required",
        description: "Please enter a name for your template",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Build template structure (without values)
      const templateStructure = cards.map(({ id, type, label, isRequired, options, placeholder }) => ({
        id, type, label, isRequired, options, placeholder
      }));

      // Save template via API
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim(),
          cards: templateStructure,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save template");
      }

      toast({
        title: "Template saved",
        description: "Your template has been saved successfully",
      });

      setShowSaveDialog(false);
      setTemplateName("");
      setTemplateDescription("");

      // Also continue to fill form
      handleContinueToFill();
    } catch (error) {
      toast({
        title: "Error saving template",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                className="border-[#E25E45] text-[#E25E45] hover:bg-[#E25E45]/5"
              >
                <Save className="h-4 w-4 mr-2" />
                Submit & Save Template
              </Button>
              <Button
                onClick={handleContinueToFill}
                className="bg-[#E25E45] hover:bg-[#d54d35]"
              >
                Continue to Fill Form
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {sidebarVisible && (
            <>
              <CardLibrarySidebar usedCardTypes={usedCardTypes} width={sidebarWidth} />

              {/* Resize Handle */}
              <div
                onMouseDown={handleMouseDown}
                className="w-1 hover:w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-[#E25E45] cursor-col-resize transition-all flex-shrink-0 group relative"
              >
                <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#E25E45]/10" />
              </div>
            </>
          )}

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

        {/* Save Template Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save this form structure as a reusable template for future tenders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Marketing Campaign Tender"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E25E45]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Description (optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E25E45] resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAsTemplate}
                disabled={isSaving}
                className="bg-[#E25E45] hover:bg-[#d54d35]"
              >
                {isSaving ? "Saving..." : "Save & Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
