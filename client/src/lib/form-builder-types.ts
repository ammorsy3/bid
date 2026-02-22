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
      description: "The name of your RFP",
      icon: Type,
      isRequired: true,
    },
    {
      type: "project-type",
      label: "Project Type",
      description: "Time-bound, deliverable-based, or ongoing",
      icon: Layers,
      isRequired: true,
    },
    {
      type: "supplier-response",
      label: "Vendor Response",
      description: "How Vendors submit their Proposals",
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
      return "Choose how Vendors should submit Proposals";
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

// Field insight content for the slide-in panel
export interface FieldInsight {
  title: string;
  description: string;
  vendorTip: string;
  bestPractice: string;
}

export const FIELD_INSIGHTS: Record<CardType, FieldInsight> = {
  "project-title": {
    title: "Project Title",
    description:
      "The project title is the first thing vendors see. A clear, specific title helps attract the right Vendors and sets expectations from the start.",
    vendorTip:
      "Vendors filter opportunities by title. Include the core service or product so qualified Vendors can find your RFP quickly.",
    bestPractice:
      "Be specific — \"Office IT Infrastructure Upgrade Q3\" is better than \"IT Project.\" Avoid internal jargon or acronyms.",
  },
  "project-type": {
    title: "Project Type",
    description:
      "Defines whether this project is ongoing with time constraints or focused on delivering a specific product or service. This shapes how vendors structure their proposals.",
    vendorTip:
      "Vendors tailor pricing and staffing based on project type. Time-bound projects need availability schedules, while deliverable-based projects need milestone plans.",
    bestPractice:
      "Choose the type that best matches your contracting model. If unsure, deliverable-based gives you more control over outcomes.",
  },
  "supplier-response": {
    title: "Vendor Response Format",
    description:
      "Controls how vendors submit their proposals — documents, video pitches, or through the platform. This affects the quality and comparability of responses.",
    vendorTip:
      "Offering multiple response formats (e.g. document + video) lets vendors showcase their strengths and gives you a richer evaluation.",
    bestPractice:
      "Document submissions are easiest to compare side-by-side. Video pitches work well for creative or consulting projects where presentation matters.",
  },
  "project-dates": {
    title: "Timeline",
    description:
      "Sets the expected start and end dates for the project. Clear timelines help vendors assess availability and plan resource allocation.",
    vendorTip:
      "Vendors need realistic timelines to provide accurate Proposals. Tight deadlines may limit the pool of qualified Vendors or increase costs.",
    bestPractice:
      "Include buffer time for onboarding. If dates are flexible, mention it — this can attract more competitive bids.",
  },
  budget: {
    title: "Budget",
    description:
      "Specifying a budget (exact or range) helps vendors understand the scope and submit realistic proposals within your financial constraints.",
    vendorTip:
      "Sharing budget information upfront saves time for both parties. Vendors can immediately tell if the project aligns with their pricing.",
    bestPractice:
      "A budget range is often better than an exact amount — it gives vendors room to propose creative solutions while staying within limits.",
  },
  "project-objective": {
    title: "Objective",
    description:
      "A concise statement of what this project aims to achieve. This gives vendors the context they need to propose relevant solutions.",
    vendorTip:
      "Vendors use the objective to understand the \"why\" behind your project. A well-written objective leads to proposals that solve the right problem.",
    bestPractice:
      "Focus on outcomes, not methods. \"Reduce customer support response time by 40%\" is more useful than \"Implement a chatbot.\"",
  },
  "key-deliverables": {
    title: "Deliverables",
    description:
      "A list of tangible outputs the vendor is expected to produce. Clear deliverables prevent scope disagreements down the line.",
    vendorTip:
      "Well-defined deliverables help vendors provide accurate timelines and costs. Vague deliverables often lead to change orders and delays.",
    bestPractice:
      "Make each deliverable measurable. Instead of \"Training materials,\" try \"10-page training manual + 3 video tutorials (5 min each).\"",
  },
  "project-description": {
    title: "Description",
    description:
      "The full project description provides vendors with all the context they need — background, requirements, constraints, and any technical specifications.",
    vendorTip:
      "This is where vendors decide whether to bid. Include enough detail for them to assess fit, but keep it organized and scannable.",
    bestPractice:
      "Structure with short paragraphs or bullet points. Cover background, scope, technical requirements, and any constraints or preferences.",
  },
  "submission-deadline": {
    title: "Submission Deadline",
    description:
      "The cutoff date by which vendors must submit their proposals. This creates urgency and ensures your evaluation timeline stays on track.",
    vendorTip:
      "Give vendors at least 2 weeks for simple projects and 4+ weeks for complex ones. Rushed deadlines reduce proposal quality.",
    bestPractice:
      "Set the deadline on a weekday, mid-morning. Avoid holidays. Publish the RFP as early as possible to maximize response quality.",
  },
  "evaluation-criteria": {
    title: "Evaluation Criteria",
    description:
      "Defines how you will score and compare vendor proposals. Transparent criteria ensure fairness and help vendors focus on what matters most to you.",
    vendorTip:
      "When vendors know your priorities, they invest effort where it counts. This leads to higher-quality, more relevant proposals.",
    bestPractice:
      "Weight criteria by importance (e.g. Technical Approach 40%, Price 30%, Experience 20%, Timeline 10%). Keep it to 3-5 criteria.",
  },
  attachments: {
    title: "Attachments",
    description:
      "Supporting documents such as specifications, drawings, reference materials, or existing contracts that help vendors understand the full scope.",
    vendorTip:
      "Attachments reduce back-and-forth questions. The more context vendors have upfront, the faster and more accurate their proposals will be.",
    bestPractice:
      "Label files clearly (e.g. \"Floor_Plan_v2.pdf\"). Include a brief note explaining each attachment's relevance.",
  },
  "custom-text": {
    title: "Short Answer Field",
    description:
      "A single-line text input for collecting brief, specific information from vendors — such as company name, certification number, or a concise answer.",
    vendorTip:
      "Keep the question specific. Short answer fields work best for factual data that doesn't need elaboration.",
    bestPractice:
      "Use a clear, direct question. Add placeholder text to show the expected format (e.g. \"ISO 9001:2015\").",
  },
  "custom-textarea": {
    title: "Long Answer Field",
    description:
      "A multi-line text area for open-ended questions where vendors can provide detailed explanations, methodologies, or case studies.",
    vendorTip:
      "Great for qualitative questions like \"Describe your approach\" or \"Explain relevant experience.\" Gives vendors space to differentiate themselves.",
    bestPractice:
      "Limit to 2-3 long-answer questions per RFP. Too many open-ended questions discourage vendors from completing the form.",
  },
  "custom-date": {
    title: "Date Field",
    description:
      "A date picker for collecting specific dates from vendors — such as earliest available start date, certification expiry, or milestone commitments.",
    vendorTip:
      "Use date fields when you need precise, comparable answers. Easier to evaluate than free-text date formats.",
    bestPractice:
      "Specify what the date represents in your question label (e.g. \"Earliest available start date\" rather than just \"Date\").",
  },
  "custom-select": {
    title: "Multiple Choice Field",
    description:
      "A dropdown or radio-button field that lets vendors choose from predefined options. Ideal for standardized questions with fixed answers.",
    vendorTip:
      "Multiple choice fields are the easiest for vendors to fill out and the easiest for you to compare across proposals.",
    bestPractice:
      "Include an \"Other\" option if the list might not cover all cases. Keep options mutually exclusive and collectively exhaustive.",
  },
};

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
