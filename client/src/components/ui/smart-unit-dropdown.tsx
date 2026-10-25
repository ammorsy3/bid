import { useState, useRef, useEffect, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Star, Plus } from "lucide-react";
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

type Option = { kind: "create"; value: string } | { kind: "unit"; value: string; suggested: boolean };

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;
const collapse = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * Unit of measurement as a combobox (BID-UX-BUGFIX item 2):
 * - opening shows the options (context suggestions first), typing filters them
 *   by English or Arabic label;
 * - Enter picks the highlighted option, or — when nothing matches — adds the
 *   typed unit and selects it at once (no separate "add custom" step);
 * - a typed name equal to an existing unit (any case, English or Arabic)
 *   selects that unit instead of creating a duplicate; empty input adds nothing;
 * - Enter never submits the form or advances the wizard.
 */
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
  const groupOf = (unit: string) => Object.entries(UNIT_GROUPS).find(([, units]) => units.includes(unit))?.[0] ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const prioritizedUnits = useMemo(
    () => getPrioritizedUnits(deliverableName, deliverableDescription, projectTitle),
    [deliverableName, deliverableDescription, projectTitle],
  );

  const typed = collapse(query);
  const needle = typed.toLowerCase();
  /** An existing unit whose English key or Arabic label equals the typed text. */
  const existing = useMemo(
    () => (needle ? ALL_UNITS.find((u) => u.toLowerCase() === needle || (UNIT_LABELS_AR[u] ?? "") === typed) : undefined),
    [needle, typed],
  );
  const tooLong = countWords(typed) > 5;

  const options: Option[] = useMemo(() => {
    const matches = (u: string) => !needle || u.toLowerCase().includes(needle) || (UNIT_LABELS_AR[u] ?? "").includes(typed);
    const suggested = prioritizedUnits.filter(matches).map((u) => ({ kind: "unit" as const, value: u, suggested: true }));
    const rest = ALL_UNITS.filter((u) => !prioritizedUnits.includes(u) && matches(u)).map((u) => ({ kind: "unit" as const, value: u, suggested: false }));
    const list: Option[] = [...suggested, ...rest];
    // A custom unit that is not already the selected value or an existing unit.
    if (typed && !existing && !tooLong && typed !== value) list.unshift({ kind: "create", value: typed });
    return list;
  }, [needle, typed, prioritizedUnits, existing, tooLong, value]);

  useEffect(() => { setActive(0); }, [query, isOpen]);

  const place = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!isOpen) return;
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [isOpen]);

  // Close when tapping or clicking outside the field and its list.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (inputRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      close();
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [isOpen]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, isOpen, listId]);

  function close() {
    setIsOpen(false);
    setQuery("");
  }

  function choose(unit: string) {
    onChange(unit);
    close();
  }

  function commitTyped() {
    if (!typed) return;               // nothing typed: nothing to add
    if (existing) return choose(existing);
    if (tooLong) return;              // the inline hint explains why
    choose(typed);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Never submit the form or advance the wizard from this field.
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) { setIsOpen(true); return; }
      // The highlighted option: "Add …" comes first when nothing matches exactly,
      // an exact existing unit is never offered as a new one.
      const option = options[active];
      return option ? choose(option.value) : commitTyped();
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      if (isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
    } else if (e.key === "Tab") {
      close();
    }
  }

  const display = value ? labelFor(value) : "";
  const activeId = isOpen && options[active] ? `${listId}-opt-${active}` : undefined;

  let lastGroup = "";
  const dropdownMenu = isOpen && createPortal(
    <div
      ref={dropdownRef}
      id={listId}
      role="listbox"
      aria-label={t('tenderFlow.unitOfMeasurement')}
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed z-[9999] bg-white dark:bg-background border border-border dark:border-border rounded-lg shadow-lg max-h-72 overflow-y-auto overscroll-contain"
      style={{ top: dropdownPosition.top, left: dropdownPosition.left, width: Math.max(dropdownPosition.width, 220) }}
    >
      {options.length === 0 && tooLong && (
        <p className="px-3 py-3 text-xs text-red-500">{t('tenderFlow.unitTooLong')}</p>
      )}
      {options.map((option, i) => {
        const isActive = i === active;
        const base = `w-full min-h-[44px] px-3 py-2 text-sm text-start flex items-center gap-2 cursor-pointer select-none ${
          isActive ? 'bg-[#FE3C01]/10' : ''
        }`;
        if (option.kind === "create") {
          return (
            <div
              key="create"
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={isActive}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(option.value)}
              onMouseEnter={() => setActive(i)}
              className={`${base} text-[#FE3C01] font-medium border-b border-border`}
              data-testid="unit-option-create"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('tenderFlow.createUnit', { unit: option.value })}</span>
            </div>
          );
        }
        const heading = option.suggested ? "suggested" : groupOf(option.value);
        const showHeading = !needle && heading !== lastGroup;
        lastGroup = heading;
        return (
          <div key={`${heading}-${option.value}`}>
            {showHeading && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-card flex items-center gap-1" role="presentation">
                {option.suggested && <Star className="h-3 w-3 text-[#FE3C01]" aria-hidden="true" />}
                {option.suggested ? t('tenderFlow.suggestedUnits') : (GROUP_NAME_KEYS[heading] ?? heading)}
              </div>
            )}
            <div
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={value === option.value}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(option.value)}
              onMouseEnter={() => setActive(i)}
              className={`${base} ${value === option.value ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}
              data-testid={`unit-option-${option.value}`}
            >
              {option.suggested && <Star className="h-3 w-3 text-[#FE3C01] shrink-0" aria-hidden="true" />}
              {labelFor(option.value)}
            </div>
          </div>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={!!error || undefined}
        enterKeyHint="done"
        autoComplete="off"
        value={isOpen ? query : display}
        placeholder={isOpen && display ? display : t('tenderFlow.selectUnit')}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onChange={(e) => { setQuery(e.target.value); if (!isOpen) setIsOpen(true); }}
        onKeyDown={onKeyDown}
        className={`w-full px-3 py-2 pe-8 text-sm border rounded-lg bg-white dark:bg-background text-gray-900 dark:text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FE3C01] focus:border-transparent ${
          error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
        }`}
        data-testid={dataTestId}
      />
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
      {dropdownMenu}
    </div>
  );
}
