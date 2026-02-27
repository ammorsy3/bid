import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, FileText, PenLine, Star, Check, Loader2 } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { getQueryFn } from "@/lib/queryClient";

// Template Illustration - Document Stack with floating icons
const TemplateIllustration = ({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) => (
  <svg
    viewBox="0 0 280 200"
    className="w-full h-full"
    style={{ filter: isHovered || isSelected ? 'drop-shadow(0 0 20px rgba(232,97,77,0.2))' : 'none' }}
  >
    <defs>
      <linearGradient id="docGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FCEAE7" />
        <stop offset="100%" stopColor="#F9D5D0" />
      </linearGradient>
      <linearGradient id="docGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDF2F0" />
        <stop offset="100%" stopColor="#FCEAE7" />
      </linearGradient>
      <linearGradient id="docGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF7F6" />
        <stop offset="100%" stopColor="#FDF2F0" />
      </linearGradient>
      <filter id="docShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.08" />
      </filter>
      <filter id="iconShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
      </filter>
    </defs>

    {/* Background document (third/bottom) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(2px, -1px)' : 'translate(0, 0)' }}
    >
      <rect
        x="98"
        y="38"
        width="100"
        height="120"
        rx="8"
        fill="url(#docGradient3)"
        filter="url(#docShadow)"
        transform="rotate(3 148 98)"
      />
    </g>

    {/* Middle document (second) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(1px, -2px)' : 'translate(0, 0)' }}
    >
      <rect
        x="90"
        y="42"
        width="100"
        height="120"
        rx="8"
        fill="url(#docGradient2)"
        filter="url(#docShadow)"
        transform="rotate(1.5 140 102)"
      />
    </g>

    {/* Front document (top) - most prominent */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(0, -4px)' : 'translate(0, 0)' }}
    >
      <rect
        x="82"
        y="46"
        width="100"
        height="120"
        rx="8"
        fill="url(#docGradient1)"
        filter="url(#docShadow)"
      />

      {/* Document icon in top-left */}
      <rect x="92" y="56" width="20" height="24" rx="3" fill="#E8614D" opacity="0.2" />
      <path
        d="M97 62 L107 62 M97 67 L107 67 M97 72 L103 72"
        stroke="#E8614D"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Text lines */}
      <rect x="92" y="90" width="60" height="2" rx="1" fill="#D0D0D0" />
      <rect x="92" y="102" width="60" height="2" rx="1" fill="#D0D0D0" />
      <rect x="92" y="114" width="40" height="2" rx="1" fill="#D0D0D0" />
      <rect x="92" y="126" width="50" height="2" rx="1" fill="#D0D0D0" />

      {/* Checkbox icons */}
      <rect x="158" y="88" width="12" height="12" rx="2" fill="none" stroke="#E8614D" strokeWidth="1.5" />
      <path d="M161 94 L163 96 L167 92" stroke="#E8614D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="158" y="100" width="12" height="12" rx="2" fill="none" stroke="#E8614D" strokeWidth="1.5" />
      <rect x="158" y="112" width="12" height="12" rx="2" fill="none" stroke="#F19A8F" strokeWidth="1.5" />
    </g>

    {/* Floating checklist icon (top right) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(2px, -3px)' : 'translate(0, 0)' }}
      filter="url(#iconShadow)"
    >
      <circle cx="200" cy="50" r="18" fill="#FCEAE7" />
      <path
        d="M192 50 L197 55 L208 44"
        stroke="#E8614D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>

    {/* Floating gear icon (bottom left) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(-2px, -2px)' : 'translate(0, 0)' }}
      filter="url(#iconShadow)"
    >
      <circle cx="65" cy="140" r="16" fill="#FDF2F0" />
      <path
        d="M65 132 L65 134 M65 146 L65 148 M57 140 L59 140 M71 140 L73 140 M59.3 134.3 L60.7 135.7 M69.3 144.3 L70.7 145.7 M59.3 145.7 L60.7 144.3 M69.3 135.7 L70.7 134.3"
        stroke="#EE7A68"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="65" cy="140" r="4" fill="none" stroke="#EE7A68" strokeWidth="2" />
    </g>

    {/* Small decorative star (top left) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(-1px, -2px) scale(1.1)' : 'translate(0, 0) scale(1)' }}
    >
      <path
        d="M55 60 L57 66 L63 66 L58 70 L60 76 L55 72 L50 76 L52 70 L47 66 L53 66 Z"
        fill="#F19A8F"
        opacity="0.6"
      />
    </g>
  </svg>
);

// Scratch Illustration - Blank canvas with draggable blocks and cursor
const ScratchIllustration = ({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) => (
  <svg
    viewBox="0 0 280 200"
    className="w-full h-full"
    style={{ filter: isHovered || isSelected ? 'drop-shadow(0 0 20px rgba(232,97,77,0.2))' : 'none' }}
  >
    <defs>
      <linearGradient id="canvasGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#FAFAFA" />
      </linearGradient>
      <filter id="blockShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#E8614D" floodOpacity="0.15" />
      </filter>
      <filter id="canvasShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.06" />
      </filter>
      <filter id="cursorShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.2" />
      </filter>
    </defs>

    {/* Main canvas/workspace */}
    <g filter="url(#canvasShadow)">
      <rect
        x="70"
        y="30"
        width="140"
        height="140"
        rx="8"
        fill="url(#canvasGradient)"
        stroke="#E5E5E5"
        strokeWidth="1"
      />
      {/* Subtle grid pattern inside canvas */}
      <g opacity="0.3">
        <line x1="110" y1="30" x2="110" y2="170" stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="150" y1="30" x2="150" y2="170" stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="190" y1="30" x2="190" y2="170" stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="70" y1="70" x2="210" y2="70" stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="70" y1="110" x2="210" y2="110" stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="70" y1="150" x2="210" y2="150" stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
      </g>
    </g>

    {/* Block 1 - Text block (top-left, partially overlapping) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(0, -3px)' : 'translate(0, 0)' }}
      filter="url(#blockShadow)"
    >
      <rect
        x="50"
        y="45"
        width="55"
        height="35"
        rx="6"
        fill="#FCEAE7"
        stroke="#E8614D"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      <rect x="58" y="54" width="30" height="2" rx="1" fill="#E8614D" opacity="0.5" />
      <rect x="58" y="60" width="38" height="2" rx="1" fill="#E8614D" opacity="0.5" />
      <rect x="58" y="66" width="24" height="2" rx="1" fill="#E8614D" opacity="0.5" />
    </g>

    {/* Dotted connection line from Block 1 to canvas */}
    <path
      d="M105 62 L120 75"
      stroke="#F19A8F"
      strokeWidth="1.5"
      strokeDasharray="3 3"
      fill="none"
      opacity="0.6"
    />

    {/* Block 2 - Image placeholder (top-right) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(0, -2px) scale(1.02)' : 'translate(0, 0) scale(1)' }}
      filter="url(#blockShadow)"
    >
      <rect
        x="200"
        y="35"
        width="45"
        height="45"
        rx="6"
        fill="#F9D5D0"
      />
      {/* Image icon */}
      <rect x="210" y="47" width="25" height="20" rx="2" fill="none" stroke="#E8614D" strokeWidth="1.5" />
      <circle cx="217" cy="53" r="3" fill="#E8614D" opacity="0.6" />
      <path d="M212 63 L220 56 L228 63 L233 58" stroke="#E8614D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>

    {/* Block 3 - Button/input field (bottom-left) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(0, -2px)' : 'translate(0, 0)' }}
      filter="url(#blockShadow)"
    >
      <rect
        x="35"
        y="125"
        width="70"
        height="28"
        rx="6"
        fill="#FDF2F0"
        stroke="#F19A8F"
        strokeWidth="1"
      />
      <rect x="43" y="136" width="45" height="6" rx="3" fill="#F19A8F" opacity="0.4" />
    </g>

    {/* Dotted connection from Block 3 */}
    <path
      d="M105 139 L120 130"
      stroke="#F19A8F"
      strokeWidth="1.5"
      strokeDasharray="3 3"
      fill="none"
      opacity="0.6"
    />

    {/* Block 4 - Add button (bottom-right) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(0, -2px) scale(1.05)' : 'translate(0, 0) scale(1)' }}
      filter="url(#blockShadow)"
    >
      <circle
        cx="230"
        cy="145"
        r="22"
        fill="#F19A8F"
      />
      <path
        d="M230 135 L230 155 M220 145 L240 145"
        stroke="#D44D3A"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>

    {/* Block 5 - Small decorative block (middle-right) */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{ transform: isHovered ? 'translate(2px, -1px)' : 'translate(0, 0)' }}
    >
      <rect
        x="215"
        y="95"
        width="35"
        height="25"
        rx="4"
        fill="#FCEAE7"
        opacity="0.8"
      />
      <rect x="221" y="102" width="22" height="2" rx="1" fill="#E8614D" opacity="0.4" />
      <rect x="221" y="108" width="16" height="2" rx="1" fill="#E8614D" opacity="0.4" />
    </g>

    {/* Cursor/Hand element */}
    <g
      className="transition-transform duration-250 ease-out"
      style={{
        transform: isHovered
          ? 'translate(4px, 0) rotate(3deg)'
          : 'translate(0, 0) rotate(0deg)',
        transformOrigin: '165px 75px'
      }}
      filter="url(#cursorShadow)"
    >
      {/* Motion lines behind cursor */}
      <g opacity={isHovered ? 0.6 : 0.4}>
        <path d="M145 68 Q140 72 142 78" stroke="#E8614D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M148 62 Q142 67 145 74" stroke="#E8614D" strokeWidth="1" strokeLinecap="round" fill="none" />
        <path d="M143 75 Q137 78 140 84" stroke="#E8614D" strokeWidth="1" strokeLinecap="round" fill="none" />
      </g>

      {/* Cursor pointer hand */}
      <g transform="translate(155, 58)">
        <path
          d="M8 0 L8 18 L3 14 L0 20 L-3 18 L0 12 L-5 12 L8 0 Z"
          fill="#404040"
          stroke="#303030"
          strokeWidth="0.5"
        />
        {/* Highlight on cursor */}
        <path
          d="M7 2 L7 10"
          stroke="#606060"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </g>

    {/* Small floating dots decoration */}
    <g opacity="0.4">
      <circle cx="55" cy="100" r="3" fill="#F19A8F" />
      <circle cx="45" cy="112" r="2" fill="#F9D5D0" />
      <circle cx="255" cy="75" r="2.5" fill="#F19A8F" />
    </g>
  </svg>
);

type StartMethod = "template" | "scratch" | null;

interface TemplateCard {
  id: string;
  type: string;
  label: string;
  isRequired: boolean;
  placeholder?: string;
  options?: string[];
  value?: any; // Pre-filled value from saved template
}

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  cards: TemplateCard[];
  isPublic: boolean;
  createdAt: string;
}

interface DisplayTemplate {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  isUserTemplate?: boolean;
  cards?: TemplateCard[];
}

const DEFAULT_TEMPLATES: DisplayTemplate[] = [
  {
    id: "bid-recommended",
    name: "Bid Recommended Template",
    description: "Our recommended structure for creating effective RFPs with all essential sections",
    recommended: true,
  },
];

export default function TenderStartMethodStep() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [startMethod, setStartMethod] = useState<StartMethod>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<"template" | "scratch" | null>(null);

  // Fetch user's saved templates
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useQuery<SavedTemplate[]>({
    queryKey: ["/api/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Combine default templates with user's saved templates
  const allTemplates: DisplayTemplate[] = [
    ...DEFAULT_TEMPLATES,
    ...(savedTemplates || []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || "Your saved template",
      isUserTemplate: true,
      cards: t.cards,
    })),
  ];

  const handleNext = () => {
    if (startMethod === "template" && selectedTemplate) {
      const template = allTemplates.find((t) => t.id === selectedTemplate);

      if (template?.isUserTemplate && template.cards) {
        // For user templates, load the cards directly into the form builder
        // Preserve any saved values from the template
        const TENDER_STATE_KEY = "tender_form_state";
        const cardsWithValues = template.cards.map((card) => ({
          ...card,
          // Keep the saved value if it exists, otherwise set to null
          value: card.value !== undefined ? card.value : null,
        }));
        localStorage.setItem(TENDER_STATE_KEY, JSON.stringify(cardsWithValues));
        navigate("/tenders/new/form-builder");
      } else {
        // For default templates, use the old flow
        localStorage.setItem("tenderDraft", JSON.stringify({ template: selectedTemplate }));
        navigate("/tenders/new/title");
      }
    } else if (startMethod === "scratch") {
      // Clear any existing draft for fresh start
      localStorage.removeItem("tenderDraft");
      localStorage.removeItem("tender_form_state");
      // Navigate to the drag-and-drop form builder
      navigate("/tenders/new/form-builder");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new");
  };

  const isFormValid =
    startMethod === "scratch" ||
    (startMethod === "template" && selectedTemplate !== null);

  // Dot grid pattern color based on theme
  const dotColor = theme === 'dark'
    ? 'rgba(139, 92, 246, 0.15)'
    : 'rgba(156, 163, 175, 0.3)';

  return (
    <div
      className="min-h-screen py-8 px-4 bg-gray-50 dark:bg-gray-900"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <Button
            onClick={handleBack}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              Back
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
              <ArrowLeft
                className="opacity-60"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            </i>
          </Button>
        </div>

        {/* Headline Section - Centered */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
            How would you like to start?
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Choose to start with a pre-built template for faster setup, or
            start from scratch for complete customization.
          </p>
        </div>

        {/* Large Cards Section - Side by Side */}
        <div className="flex justify-center gap-8 mb-12">
          {/* Template Card */}
          <button
            type="button"
            onClick={() => {
              setStartMethod("template");
              const recommended = DEFAULT_TEMPLATES.find((t) => t.recommended);
              if (recommended) setSelectedTemplate(recommended.id);
            }}
            onMouseEnter={() => setHoveredCard("template")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group flex flex-col items-center min-w-[350px] h-[520px] p-8 rounded-2xl cursor-pointer transition-all duration-300 ease-in-out border-2 bg-white dark:bg-gray-800 ${
              startMethod === "template"
                ? "border-[#E8614D] shadow-2xl shadow-[#E8614D]/20 scale-[1.02]"
                : "border-gray-200 dark:border-gray-700 shadow-lg hover:border-[#E8614D] hover:shadow-2xl hover:shadow-[#E8614D]/15 hover:scale-[1.03]"
            }`}
            data-testid="button-template"
          >
            {/* Illustration Area */}
            <div className={`w-full h-[220px] rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ease-in-out overflow-hidden ${
              startMethod === "template"
                ? "bg-[#F7F7F7]"
                : "bg-[#F7F7F7] group-hover:bg-[#FEF7F6]"
            }`}>
              <TemplateIllustration
                isSelected={startMethod === "template"}
                isHovered={hoveredCard === "template"}
              />
            </div>

            {/* Title */}
            <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ease-in-out ${
              startMethod === "template"
                ? "text-[#E8614D]"
                : "text-gray-900 dark:text-white group-hover:text-[#E8614D]"
            }`}>
              Start with a template
            </h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#E8614D] mb-2">Faster</span>

            {/* Subtitle */}
            <p className="text-gray-500 dark:text-gray-400 text-base mb-6 text-center max-w-[280px]">
              Use our pre-built structure for faster setup with all essential sections included
            </p>

            {/* Selection Indicator */}
            <div className={`mt-auto w-full py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
              startMethod === "template"
                ? "bg-[#E8614D] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-[#E8614D]/10 group-hover:text-[#E8614D]"
            }`}>
              {startMethod === "template" ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  Selected
                </span>
              ) : (
                "Select"
              )}
            </div>
          </button>

          {/* Scratch Card */}
          <button
            type="button"
            onClick={() => {
              setStartMethod("scratch");
              setSelectedTemplate(null);
            }}
            onMouseEnter={() => setHoveredCard("scratch")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group flex flex-col items-center min-w-[350px] h-[520px] p-8 rounded-2xl cursor-pointer transition-all duration-300 ease-in-out border-2 bg-white dark:bg-gray-800 ${
              startMethod === "scratch"
                ? "border-[#E8614D] shadow-2xl shadow-[#E8614D]/20 scale-[1.02]"
                : "border-gray-200 dark:border-gray-700 shadow-lg hover:border-[#E8614D] hover:shadow-2xl hover:shadow-[#E8614D]/15 hover:scale-[1.03]"
            }`}
            data-testid="button-scratch"
          >
            {/* Illustration Area */}
            <div className={`w-full h-[220px] rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ease-in-out overflow-hidden ${
              startMethod === "scratch"
                ? "bg-[#F7F7F7]"
                : "bg-[#F7F7F7] group-hover:bg-[#FEF7F6]"
            }`}>
              <ScratchIllustration
                isSelected={startMethod === "scratch"}
                isHovered={hoveredCard === "scratch"}
              />
            </div>

            {/* Title */}
            <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ease-in-out ${
              startMethod === "scratch"
                ? "text-[#E8614D]"
                : "text-gray-900 dark:text-white group-hover:text-[#E8614D]"
            }`}>
              Start from scratch
            </h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#E8614D] mb-2">More customization</span>

            {/* Subtitle */}
            <p className="text-gray-500 dark:text-gray-400 text-base mb-6 text-center max-w-[280px]">
              Build your RFP from the ground up with complete customization freedom
            </p>

            {/* Selection Indicator */}
            <div className={`mt-auto w-full py-3 rounded-lg font-medium transition-all duration-300 ease-in-out ${
              startMethod === "scratch"
                ? "bg-[#E8614D] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-[#E8614D]/10 group-hover:text-[#E8614D]"
            }`}>
              {startMethod === "scratch" ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  Selected
                </span>
              ) : (
                "Select"
              )}
            </div>
          </button>
        </div>

        {/* Template Selection - Progressive Disclosure */}
        <div
          className={`max-w-3xl mx-auto transition-all duration-300 ease-out ${
            startMethod === "template"
              ? "opacity-100 max-h-[800px] translate-y-0"
              : "opacity-0 max-h-0 overflow-hidden -translate-y-4"
          }`}
        >
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#E8614D] to-[#F19A8F]" />
            <div className="p-8">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Choose a template
              </label>

              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E8614D]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Default Templates Section */}
                  {DEFAULT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all duration-300 ease-in-out text-left ${
                        selectedTemplate === template.id
                          ? "border-[#E8614D] bg-[#E8614D]/5 shadow-md"
                          : "border-gray-200 dark:border-gray-600 hover:border-[#E8614D]/50 hover:shadow-md"
                      }`}
                      data-testid={`template-${template.id}`}
                    >
                      <div
                        className={`p-3 rounded-xl flex-shrink-0 transition-all duration-300 ease-in-out ${
                          selectedTemplate === template.id
                            ? "bg-[#E8614D] text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-lg ${
                            selectedTemplate === template.id
                              ? "text-[#E8614D]"
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {template.name}
                          </span>
                          {template.recommended && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Star className="h-3.5 w-3.5" />
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                          {template.description}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-in-out ${
                          selectedTemplate === template.id
                            ? "border-[#E8614D] bg-[#E8614D]"
                            : "border-gray-300 dark:border-gray-500"
                        }`}
                      >
                        {selectedTemplate === template.id && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </button>
                  ))}

                  {/* User's Saved Templates Section */}
                  {savedTemplates && savedTemplates.length > 0 && (
                    <>
                      <div className="relative py-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400">
                            Your Saved Templates
                          </span>
                        </div>
                      </div>

                      {savedTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all duration-300 ease-in-out text-left ${
                            selectedTemplate === template.id
                              ? "border-[#E8614D] bg-[#E8614D]/5 shadow-md"
                              : "border-gray-200 dark:border-gray-600 hover:border-[#E8614D]/50 hover:shadow-md"
                          }`}
                          data-testid={`template-${template.id}`}
                        >
                          <div
                            className={`p-3 rounded-xl flex-shrink-0 transition-all duration-300 ease-in-out ${
                              selectedTemplate === template.id
                                ? "bg-[#E8614D] text-white"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-lg ${
                                selectedTemplate === template.id
                                  ? "text-[#E8614D]"
                                  : "text-gray-900 dark:text-white"
                              }`}>
                                {template.name}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {template.cards.length} fields
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                              {template.description || "Your saved template"}
                            </p>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-in-out ${
                              selectedTemplate === template.id
                                ? "border-[#E8614D] bg-[#E8614D]"
                                : "border-gray-300 dark:border-gray-500"
                            }`}
                          >
                            {selectedTemplate === template.id && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Navigation Buttons - Fixed at Bottom */}
        <div className="flex justify-center gap-4 mt-12">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="min-w-[160px] h-12 text-base"
            data-testid="button-cancel"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isFormValid}
            className="min-w-[160px] h-12 text-base bg-[#E8614D] hover:bg-[#D44D3A] disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-next"
          >
            Continue
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
