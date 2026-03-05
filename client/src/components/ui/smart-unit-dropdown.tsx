import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Star, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SmartUnitDropdownProps {
  value: string;
  onChange: (value: string) => void;
  deliverableName: string;
  deliverableDescription: string;
  projectTitle: string;
  error?: string;
  "data-testid"?: string;
}

// Grouped unit options
const UNIT_GROUPS = {
  "Content & Creative": [
    "Article",
    "Photo",
    "Graphic",
    "Animation",
    "Infographic",
    "Banner",
    "Logo",
    "Video",
    "Design",
  ],
  "Marketing": [
    "Ad Set",
    "Email",
    "Landing Page",
    "Event",
    "Report",
    "Strategy",
    "Package",
    "Campaign",
  ],
  "Digital/Social": [
    "Post",
    "Story",
    "Reel",
    "Thread",
    "Carousel",
  ],
  "Time-Based": [
    "Hour",
    "Day",
    "Week",
    "Month",
    "Quarter",
    "Year",
  ],
};

// Arabic labels for unit options (stored value stays as English key)
export const UNIT_LABELS_AR: Record<string, string> = {
  "Article": "مقال",
  "Photo": "صورة",
  "Graphic": "جرافيك",
  "Animation": "رسوم متحركة",
  "Infographic": "إنفوغرافيك",
  "Banner": "بانر",
  "Logo": "شعار",
  "Video": "فيديو",
  "Design": "تصميم",
  "Ad Set": "مجموعة إعلانات",
  "Email": "بريد إلكتروني",
  "Landing Page": "صفحة هبوط",
  "Event": "فعالية",
  "Report": "تقرير",
  "Strategy": "استراتيجية",
  "Package": "حزمة",
  "Campaign": "حملة",
  "Post": "منشور",
  "Story": "ستوري",
  "Reel": "ريل",
  "Thread": "سلسلة",
  "Carousel": "كاروسيل",
  "Hour": "ساعة",
  "Day": "يوم",
  "Week": "أسبوع",
  "Month": "شهر",
  "Quarter": "ربع سنة",
  "Year": "سنة",
};

// All units flattened for search
const ALL_UNITS = Object.values(UNIT_GROUPS).flat();

// Keyword mapping for prioritization
const KEYWORD_MAPPING: Record<string, string[]> = {
  // Advertising keywords
  "ad": ["Ad Set", "Campaign", "Banner", "Post"],
  "ads": ["Ad Set", "Campaign", "Banner", "Post"],
  "advertising": ["Ad Set", "Campaign", "Banner", "Post"],
  "advertisement": ["Ad Set", "Campaign", "Banner", "Post"],

  // Video keywords
  "video": ["Video", "Animation", "Reel"],
  "videos": ["Video", "Animation", "Reel"],
  "videography": ["Video", "Animation", "Reel"],

  // Photo keywords
  "photo": ["Photo", "Graphic", "Design"],
  "photography": ["Photo", "Graphic", "Design"],
  "images": ["Photo", "Graphic", "Design"],
  "image": ["Photo", "Graphic", "Design"],

  // Social media keywords
  "social media": ["Post", "Story", "Reel", "Carousel"],
  "social": ["Post", "Story", "Reel", "Carousel"],
  "instagram": ["Post", "Story", "Reel", "Carousel"],
  "facebook": ["Post", "Story", "Reel", "Carousel"],
  "tiktok": ["Post", "Story", "Reel", "Video"],
  "linkedin": ["Post", "Article", "Carousel"],
  "twitter": ["Post", "Thread"],
  "x": ["Post", "Thread"],

  // Content keywords
  "content": ["Article", "Post", "Report"],
  "writing": ["Article", "Post", "Report"],
  "blog": ["Article", "Post"],
  "article": ["Article", "Post", "Report"],
  "articles": ["Article", "Post", "Report"],

  // Design keywords
  "design": ["Design", "Graphic", "Logo", "Banner", "Infographic"],
  "graphic": ["Graphic", "Design", "Logo", "Banner", "Infographic"],
  "visual": ["Design", "Graphic", "Logo", "Banner", "Infographic"],
  "graphics": ["Graphic", "Design", "Logo", "Banner", "Infographic"],

  // Brand keywords
  "brand": ["Logo", "Design", "Package", "Strategy"],
  "branding": ["Logo", "Design", "Package", "Strategy"],
  "identity": ["Logo", "Design", "Package", "Strategy"],
  "logo": ["Logo", "Design", "Package"],

  // Website keywords
  "website": ["Landing Page", "Design"],
  "web": ["Landing Page", "Design"],
  "landing": ["Landing Page", "Design"],
  "webpage": ["Landing Page", "Design"],

  // Email keywords
  "email": ["Email", "Campaign"],
  "newsletter": ["Email", "Campaign"],
  "emails": ["Email", "Campaign"],

  // Event keywords
  "event": ["Event", "Day", "Package"],
  "activation": ["Event", "Day", "Package"],
  "events": ["Event", "Day", "Package"],

  // Strategy keywords
  "strategy": ["Strategy", "Hour", "Month", "Report"],
  "consulting": ["Strategy", "Hour", "Month"],
  "consultation": ["Strategy", "Hour", "Month"],
  "consultant": ["Strategy", "Hour", "Month"],

  // Retainer keywords
  "retainer": ["Month", "Quarter", "Year"],
  "ongoing": ["Month", "Quarter", "Year"],
  "monthly": ["Month", "Quarter", "Year"],

  // Management keywords
  "management": ["Month", "Campaign", "Package"],
  "managing": ["Month", "Campaign", "Package"],
  "manager": ["Month", "Campaign", "Package"],

  // Report keywords
  "report": ["Report", "Package"],
  "analysis": ["Report", "Package"],
  "analytics": ["Report", "Package"],

  // Animation keywords
  "animation": ["Animation", "Video", "Reel"],
  "animate": ["Animation", "Video", "Reel"],
  "motion": ["Animation", "Video", "Reel"],

  // Infographic keywords
  "infographic": ["Infographic", "Graphic", "Design"],
  "infographics": ["Infographic", "Graphic", "Design"],

  // Banner keywords
  "banner": ["Banner", "Graphic", "Design"],
  "banners": ["Banner", "Graphic", "Design"],
};

function getPrioritizedUnits(
  deliverableName: string,
  deliverableDescription: string,
  projectTitle: string
): string[] {
  const combinedText = `${deliverableName} ${deliverableDescription} ${projectTitle}`.toLowerCase();

  const matchedUnits = new Set<string>();

  // Check for keyword matches
  for (const [keyword, units] of Object.entries(KEYWORD_MAPPING)) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combinedText)) {
      units.forEach(unit => matchedUnits.add(unit));
    }
  }

  return Array.from(matchedUnits);
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export function SmartUnitDropdown({
  value,
  onChange,
  deliverableName,
  deliverableDescription,
  projectTitle,
  error,
  "data-testid": dataTestId,
}: SmartUnitDropdownProps) {
  const { t, isRtl } = useI18n();
  const labelFor = (unit: string) => isRtl ? (UNIT_LABELS_AR[unit] ?? unit) : unit;

  const GROUP_NAME_KEYS: Record<string, string> = {
    "Content & Creative": t('tenderFlow.unitGroupContent'),
    "Marketing": t('tenderFlow.unitGroupMarketing'),
    "Digital/Social": t('tenderFlow.unitGroupDigital'),
    "Time-Based": t('tenderFlow.unitGroupTime'),
  };

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get prioritized units based on context
  const prioritizedUnits = useMemo(() => {
    return getPrioritizedUnits(deliverableName, deliverableDescription, projectTitle);
  }, [deliverableName, deliverableDescription, projectTitle]);

  // Check if the current value is a custom "Other" value
  useEffect(() => {
    if (value && !ALL_UNITS.includes(value)) {
      setIsOtherMode(true);
      setOtherValue(value);
    } else if (!value) {
      setIsOtherMode(false);
      setOtherValue("");
    }
  }, [value]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure portal is mounted
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Filter units based on search term
  const filteredUnits = useMemo(() => {
    if (!searchTerm) return ALL_UNITS;
    return ALL_UNITS.filter(unit =>
      unit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Get non-prioritized units (excluding already prioritized ones)
  const nonPrioritizedUnits = useMemo(() => {
    return filteredUnits.filter(unit => !prioritizedUnits.includes(unit));
  }, [filteredUnits, prioritizedUnits]);

  // Filter prioritized units by search term
  const filteredPrioritizedUnits = useMemo(() => {
    if (!searchTerm) return prioritizedUnits;
    return prioritizedUnits.filter(unit =>
      unit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [prioritizedUnits, searchTerm]);

  const handleSelect = (unit: string) => {
    onChange(unit);
    setIsOpen(false);
    setSearchTerm("");
    setIsOtherMode(false);
  };

  const handleOtherSelect = () => {
    setIsOtherMode(true);
    setIsOpen(false);
    setSearchTerm("");
    setOtherValue("");
    onChange("");
  };

  const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setOtherValue(newValue);
    onChange(newValue);
  };

  const handleClearOther = () => {
    setIsOtherMode(false);
    setOtherValue("");
    onChange("");
  };

  // Count words helper
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const wordCount = countWords(otherValue);
  const isOverLimit = wordCount > 5;

  if (isOtherMode) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <input
            type="text"
            value={otherValue}
            onChange={handleOtherChange}
            placeholder={t('tenderFlow.enterCustomUnit')}
            className={`w-full px-3 py-2 pr-8 text-sm border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${
              error || isOverLimit ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            data-testid={dataTestId}
          />
          <button
            type="button"
            onClick={handleClearOther}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {wordCount} / 5 words
          </span>
          <button
            type="button"
            onClick={handleClearOther}
            className="text-xs text-[#E25E45] hover:underline"
          >
            {t('tenderFlow.backToSuggestions')}
          </button>
        </div>
      </div>
    );
  }

  const dropdownMenu = isOpen && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-hidden"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
      }}
    >
      {/* Add custom item - pinned at top */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleOtherSelect}
          className="w-full px-3 py-2 text-sm text-left hover:bg-[#E25E45]/10 rounded-md flex items-center gap-2 text-[#E25E45] font-medium"
        >
          <span className="text-lg leading-none">+</span>
          {t('tenderFlow.addCustomUnit')}
        </button>
      </div>

      {/* Search input */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('tenderFlow.searchUnits')}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E25E45]"
          />
        </div>
      </div>

      {/* Options list */}
      <div className="overflow-y-auto max-h-52">
        {/* Show ONLY suggested units if there are keyword matches */}
        {filteredPrioritizedUnits.length > 0 ? (
          <div>
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 flex items-center gap-1">
              <Star className="h-3 w-3 text-[#E25E45]" />
              {t('tenderFlow.suggestedUnits')}
            </div>
            {filteredPrioritizedUnits.map((unit) => (
              <button
                key={`suggested-${unit}`}
                type="button"
                onClick={() => handleSelect(unit)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-[#E25E45]/10 flex items-center gap-2 ${
                  value === unit ? 'bg-[#E25E45]/5 text-[#E25E45]' : 'text-gray-900 dark:text-white'
                }`}
              >
                <Star className="h-3 w-3 text-[#E25E45]" />
                {labelFor(unit)}
              </button>
            ))}
          </div>
        ) : (
          /* Show all options grouped only when NO keyword matches */
          Object.entries(UNIT_GROUPS).map(([groupName, units]) => {
            const groupUnits = units.filter(unit =>
              !searchTerm ||
              unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
              labelFor(unit).includes(searchTerm)
            );

            if (groupUnits.length === 0) return null;

            return (
              <div key={groupName}>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                  {GROUP_NAME_KEYS[groupName] ?? groupName}
                </div>
                {groupUnits.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => handleSelect(unit)}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-[#E25E45]/10 ${
                      value === unit ? 'bg-[#E25E45]/5 text-[#E25E45]' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {labelFor(unit)}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative">
      {/* Dropdown trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent ${
          error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
        }`}
        data-testid={dataTestId}
      >
        <span className={value ? "text-gray-900 dark:text-white" : "text-gray-400"}>
          {value ? labelFor(value) : t('tenderFlow.selectUnit')}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownMenu}
    </div>
  );
}
