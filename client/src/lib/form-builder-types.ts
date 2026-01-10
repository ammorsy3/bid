import {
  Type,
  Layers,
  Calendar,
  DollarSign,
  Target,
  CheckSquare,
  FileText,
  Clock,
  BarChart,
  Paperclip,
  AlignLeft,
  List,
  MessageSquare,
  LucideIcon,
} from "lucide-react";

// Card type identifiers
export type CardType =
  // Required
  | "project-title"
  | "project-type"
  | "supplier-response"
  // Standard optional
  | "project-dates"
  | "budget"
  | "project-objective"
  | "key-deliverables"
  | "project-description"
  | "submission-deadline"
  | "evaluation-criteria"
  | "attachments"
  // Custom
  | "custom-text"
  | "custom-textarea"
  | "custom-date"
  | "custom-select";

// Card definition from library
export interface CardDefinition {
  type: CardType;
  label: string;
  description: string;
  icon: LucideIcon;
  isRequired?: boolean;
  isCustom?: boolean;
}

// Card instance in the form
export interface FormCard {
  id: string;
  type: CardType;
  label: string;
  placeholder?: string;
  isRequired: boolean;
  options?: string[]; // for select/choice cards
  value: any; // the actual form value
  touched?: boolean; // tracks if user has interacted with this card
}

// Form builder state
export interface FormBuilderState {
  cards: FormCard[];
}

// Template for saving
export interface TenderTemplate {
  id?: number;
  userId?: number;
  companyId?: number;
  name: string;
  description?: string;
  cards: Omit<FormCard, "value">[]; // Card structure without values
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Card library organized by category
export const CARD_LIBRARY: {
  required: CardDefinition[];
  standard: CardDefinition[];
  custom: CardDefinition[];
} = {
  required: [
    {
      type: "project-title",
      label: "Project Title",
      description: "The name of your tender project",
      icon: Type,
      isRequired: true,
    },
    {
      type: "project-type",
      label: "What type of project is this?",
      description: "Define if this is time-bound or deliverable-based",
      icon: Layers,
      isRequired: true,
    },
    {
      type: "supplier-response",
      label: "How should suppliers respond?",
      description: "Define how vendors submit their proposals",
      icon: MessageSquare,
      isRequired: true,
    },
  ],
  standard: [
    {
      type: "project-dates",
      label: "Timeline",
      description: "Start/end dates or delivery deadline",
      icon: Calendar,
    },
    {
      type: "budget",
      label: "Budget",
      description: "Project budget (exact or range)",
      icon: DollarSign,
    },
    {
      type: "project-objective",
      label: "Objective",
      description: "Main goal of the project",
      icon: Target,
    },
    {
      type: "key-deliverables",
      label: "Deliverables",
      description: "List of expected deliverables",
      icon: CheckSquare,
    },
    {
      type: "project-description",
      label: "Description",
      description: "Detailed project description",
      icon: FileText,
    },
    {
      type: "submission-deadline",
      label: "Submission Deadline",
      description: "Deadline for vendor submissions",
      icon: Clock,
    },
    {
      type: "evaluation-criteria",
      label: "Evaluation Criteria",
      description: "How proposals will be evaluated",
      icon: BarChart,
    },
    {
      type: "attachments",
      label: "Attachments",
      description: "Supporting documents and files",
      icon: Paperclip,
    },
  ],
  custom: [
    {
      type: "custom-text",
      label: "Short Answer",
      description: "Single-line text input",
      icon: Type,
      isCustom: true,
    },
    {
      type: "custom-textarea",
      label: "Long Answer",
      description: "Multi-line text area",
      icon: AlignLeft,
      isCustom: true,
    },
    {
      type: "custom-date",
      label: "Date",
      description: "Date picker field",
      icon: Calendar,
      isCustom: true,
    },
    {
      type: "custom-select",
      label: "Multiple Choice",
      description: "Dropdown or radio options",
      icon: List,
      isCustom: true,
    },
  ],
};

// Helper to create a new form card instance
export function createFormCard(
  definition: CardDefinition,
  existingId?: string
): FormCard {
  const id = existingId || `${definition.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    type: definition.type,
    label: definition.isCustom ? "Custom Question" : definition.label,
    isRequired: definition.isRequired || false,
    placeholder: getDefaultPlaceholder(definition.type),
    options: definition.type === "custom-select" ? ["Option 1", "Option 2"] : undefined,
    value: getDefaultValue(definition.type),
  };
}

// Get default placeholder text for card types
function getDefaultPlaceholder(type: CardType): string {
  switch (type) {
    case "project-title":
      return "Enter project title...";
    case "project-type":
      return "Select the type of project";
    case "supplier-response":
      return "Choose how suppliers should submit proposals";
    case "project-objective":
      return "What is the main goal of this project?";
    case "project-description":
      return "Provide detailed information about your project...";
    case "custom-text":
      return "Enter your answer...";
    case "custom-textarea":
      return "Enter your detailed answer...";
    default:
      return "";
  }
}

// Get default value for card types
function getDefaultValue(type: CardType): any {
  switch (type) {
    case "project-type":
      return null; // "time-bound" | "deliverable" | "ongoing"
    case "supplier-response":
      return null; // "document" | "video" | "both" | "platform"
    case "project-dates":
      return { startDate: null, endDate: null, deliveryDate: null };
    case "budget":
      return { type: "exact", amount: "", min: "", max: "" };
    case "key-deliverables":
      return [];
    case "evaluation-criteria":
      return [];
    case "attachments":
      return [];
    case "custom-select":
      return null;
    default:
      return "";
  }
}

// Get all card definitions as a flat array
export function getAllCardDefinitions(): CardDefinition[] {
  return [
    ...CARD_LIBRARY.required,
    ...CARD_LIBRARY.standard,
    ...CARD_LIBRARY.custom,
  ];
}

// Find card definition by type
export function getCardDefinition(type: CardType): CardDefinition | undefined {
  return getAllCardDefinitions().find((def) => def.type === type);
}
