import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Search, ChevronDown, ChevronLeft, ChevronRight, MapPin, LayoutList, LayoutGrid, PackageOpen, ArrowRight, Check, X, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useI18n } from "@/lib/i18n";
import { categoryLabel, cityLabel } from "@/lib/category-labels";
import { Skeleton } from "@/components/ui/skeleton";
import { isMarketplaceSubdomain } from "@/lib/subdomain";
import { useAuthStore } from "@/lib/auth";
import { BidLogo } from "@/components/brand/BidLogo";
import { SiteFooter } from "@/components/site-footer";

interface MarketplaceTender {
  id: string;
  title: string;
  description: string;
  category: string | null;
  deadline: string;
  budget: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  status: string;
  invitationToken: string;
  createdAt: string;
  referenceNumber: string | null;
  documentFee: number | null;
  tenderType: string | null;
  inquiryDeadline: string | null;
  scope: string | null;
  targetAudienceTypes: string[] | null;
  company: { id: string; name: string; city: string | null; category: string | null };
  profile?: { displayName: string | null; logoUrl: string | null };
}

const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
  "Tabuk", "Abha", "Taif", "Hail", "Jubail", "Yanbu", "Najran", "Jazan",
  "Al Kharj", "Buraydah", "Khamis Mushait", "Al Hofuf", "Sakaka",
];

function getTenderProgress(deadline: string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const remaining = end - now;
  if (remaining <= 0) return { days: 0, expired: true, percent: 0 };
  const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
  const percent = Math.min(100, Math.max(0, (days / 100) * 100));
  return { days, expired: false, percent };
}

function getTenderSize(budgetMin: number | null, budgetMax: number | null): "small" | "mid" | "large" | null {
  const budget = budgetMax || budgetMin;
  if (!budget) return null;
  if (budget < 500_000) return "small";
  if (budget < 5_000_000) return "mid";
  return "large";
}

function getAvatarInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function snippetDescription(text: string, maxLen = 130): string {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + "…";
}

function getAvatarColor(name: string): { bg: string; fg: string } {
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palette = [
    { bg: "#FE3C01", fg: "#ffffff" },
    { bg: "#4A8FE7", fg: "#ffffff" },
    { bg: "#FFC42A", fg: "#0B0907" },
    { bg: "#0B0907", fg: "#F4EDE1" },
  ];
  return palette[sum % 4];
}

function CircleProgress({
  percent, days, expired, warn, size = 108, unitLabel, closedLabel,
}: {
  percent: number; days: number; expired: boolean; warn: boolean; size?: number;
  unitLabel: string; closedLabel: string;
}) {
  const scale = size / 108;
  const r = Math.round(48 * scale);
  const sw = Math.max(3, Math.round(5 * scale));
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const center = size / 2;
  const stroke = expired ? "#C9C1B6" : warn ? "#F59E0B" : "#FE3C01";
  const numCol = expired ? "#8A8078" : warn ? "#F59E0B" : "#FE3C01";
  const numPx = Math.max(11, Math.round(30 * scale));

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(11,9,7,0.08)" strokeWidth={sw} />
        <circle
          cx={center} cy={center} r={r} fill="none"
          stroke={stroke} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: numPx, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: numCol }}>
          {expired ? "—" : days}
        </span>
        {size >= 70 && (
          <span
            className="text-[9px] font-bold uppercase tracking-[0.1em] rtl:normal-case rtl:tracking-normal rtl:text-[11px]"
            style={{ color: "#8A8078", marginTop: 3 }}
          >
            {expired ? closedLabel : unitLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Same breakpoint as the layout's `sm:` switch: below 640px the filter menus
// become bottom sheets, above it they are popovers next to their button.
// The page is hard-coded cream even in dark mode, but the shared EmptyState
// switches its headline to near-white under .dark, which vanishes on cream.
// Pin the dark-mode text colours here (page-level; empty-state.tsx untouched).
const EMPTY_STATE_ON_CREAM = "dark:[&_h3]:!text-[#0B0907] dark:[&_p]:!text-[#6B6259]";

function useIsPhone() {
  const [phone, setPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setPhone(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return phone;
}

function FilterDropdown({
  label,
  title,
  value,
  options,
  onChange,
  align = "start",
  isActive,
}: {
  label: string;
  /** Heading of the phone sheet. Falls back to the pill's own label. */
  title?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  /** Which edge of the pill the popover lines up with, in reading direction (the right edge in Arabic). */
  align?: "start" | "end";
  isActive?: boolean;
}) {
  const { t, isRtl } = useI18n();
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Outside press and Escape are handled by Radix on both surfaces (popover on
  // tablet/desktop, dialog sheet on phones). The old hand-made listener used
  // `mousedown`, which never fired for a touch tap on some phones.
  const active = isActive !== undefined ? isActive : !!value;
  const displayLabel = value
    ? (options.find(o => o.value === value)?.label ?? label)
    : label;
  const pick = (v: string) => { onChange(v); setOpen(false); };

  // Swipe-down-to-close for the phone sheet. Only the handle + title strip
  // takes the gesture (it is `touch-none`), so scrolling the option list is
  // untouched. Pointer events work the same on iOS Safari and Chrome.
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startY: number; startT: number; moved: boolean } | null>(null);
  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return; // keep the close button a plain tap
    drag.current = { id: e.pointerId, startY: e.clientY, startT: e.timeStamp, moved: false };
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || d.id !== e.pointerId || !el) return;
    const dy = Math.max(0, e.clientY - d.startY);
    if (!d.moved) {
      if (dy < 4) return;
      d.moved = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone; the drag still works without capture */ }
      el.style.transition = "none";
    }
    el.style.transform = `translateY(${dy}px)`;
  };
  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !d.moved || !el) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const fast = dy / Math.max(1, e.timeStamp - d.startT) > 0.5;
    if (e.type === "pointerup" && (dy > 96 || (dy > 24 && fast))) {
      // Leave the offset in place: the sheet's exit animation continues from it.
      setOpen(false);
    } else {
      el.style.transition = "transform 200ms ease-out";
      el.style.transform = "";
    }
  };

  return (
    <PopoverPrimitive.Root open={open && !isPhone} onOpenChange={setOpen}>
    <div className="relative max-w-full">
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          className="inline-flex max-w-full items-center gap-1.5 px-4 py-2.5 min-h-11 sm:min-h-0 rounded-full text-[13px] font-medium transition-[color,background-color,border-color,transform] active:scale-[0.97] whitespace-nowrap hover:bg-[#FAF5EC]"
          style={active ? { background: "#0B0907", color: "#F4EDE1" } : { background: "transparent", color: "#0B0907" }}
        >
          {/* A long category name is cut with an ellipsis here; the full name is
              in the menu and in the active-filter chip below. */}
          <span className="block min-w-0 max-w-[20rem] truncate" dir="auto">{displayLabel}</span>
          <ChevronDown
            className={`w-2.5 h-2.5 flex-shrink-0 opacity-50 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverPrimitive.Trigger>

      {/* Tablet / desktop: popover. It used to sit inside the pill rail, whose
          overflow-x-auto clipped it, so it never showed. It is portalled out of
          the rail, and Radix keeps it inside the screen (in Arabic too), so a
          menu near the edge slides over instead of running off it. */}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-filter-menu
          aria-label={title ?? label}
          side="bottom"
          align={align}
          sideOffset={6}
          collisionPadding={16}
          dir={isRtl ? "rtl" : "ltr"}
          className="z-[60] w-max min-w-[180px] max-w-[min(20rem,calc(100vw-2rem))] max-h-[min(24rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain rounded-2xl border bg-white shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
          style={{ borderColor: "rgba(11,9,7,0.08)", color: "#0B0907", fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : undefined }}
        >
          {/* Rows below the menu's own scroll edge sit outside its box, so the
              audit's "covered" hit-test lands on the page beneath them. They are
              not covered: they are scrolled out of view inside this list. */}
          <div role="listbox" aria-label={title ?? label} data-audit-ok="covered">
            {options.map(opt => {
              const selected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(opt.value)}
                  className="flex w-full items-center justify-between gap-3 text-start px-4 py-2.5 text-sm [overflow-wrap:anywhere] hover:bg-[#F4EDE1] active:bg-[#F4EDE1] transition-colors"
                  style={{ background: selected ? "#FFF3EA" : undefined, fontWeight: selected ? 600 : 400 }}
                >
                  <span className="min-w-0">{opt.label}</span>
                  {selected && <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#FE3C01" }} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>

      {/* Phone: bottom sheet, one thumb-sized row per option. */}
      {isPhone && (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              ref={sheetRef}
              data-filter-menu
              aria-describedby={undefined}
              dir={isRtl ? "rtl" : "ltr"}
              onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus({ preventScroll: true }); }}
              className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[85dvh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
              style={{ color: "#0B0907", fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : undefined }}
            >
              <div
                className="flex-shrink-0 touch-none select-none"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
              <div className="mx-auto mt-2 h-1 w-10 flex-shrink-0 rounded-full" style={{ background: "rgba(11,9,7,0.15)" }} aria-hidden="true" />
              <div className="flex flex-shrink-0 items-center justify-between gap-3 ps-5 pe-2">
                <DialogPrimitive.Title className="min-w-0 text-base font-semibold">{title ?? label}</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                  aria-label={t("common.close")}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </DialogPrimitive.Close>
              </div>
              </div>
              <div
                role="listbox"
                aria-label={title ?? label}
                className="min-h-0 overflow-y-auto overscroll-contain pb-2"
              >
                {options.map(opt => {
                  const selected = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => pick(opt.value)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 border-t px-5 py-2.5 text-start text-base leading-snug transition-colors active:bg-[#F4EDE1]"
                      style={{
                        borderColor: "rgba(11,9,7,0.06)",
                        background: selected ? "#FFF3EA" : undefined,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      <span className="min-w-0 [overflow-wrap:anywhere]">{opt.label}</span>
                      {selected && <Check className="h-4 w-4 flex-shrink-0" style={{ color: "#FE3C01" }} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
    </PopoverPrimitive.Root>
  );
}

// One removable chip in the "active filters" row. On phones the × is a full
// 44px target (the circle drawn inside it stays small).
function FilterChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 ps-3 pe-0 min-h-11 sm:min-h-0 sm:py-1 sm:pe-3 sm:gap-1.5 rounded-full text-sm font-medium border bg-white"
      style={{ borderColor: "rgba(11,9,7,0.08)", color: "#0B0907" }}
    >
      <span className="min-w-0 py-1 [overflow-wrap:anywhere]" dir="auto">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeLabel}: ${label}`}
        className="group flex h-11 w-11 flex-shrink-0 items-center justify-center sm:h-4 sm:w-4"
      >
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-transform group-active:scale-90"
          style={{ background: "#0B0907", color: "white" }}
          aria-hidden="true"
        >×</span>
      </button>
    </span>
  );
}

export default function Marketplace() {
  const { t, language, isRtl, setLanguage } = useI18n();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const accountType = (activeCompany as any)?.accountType ?? 'company';
  const isIndividual = accountType === 'individual';
  const isTeam = accountType === 'team';
  // Individuals and teams are both vendor-side: they respond to tenders rather
  // than publish them, so they get the same marketplace shape — an
  // audience-filtered listing plus the tenders they've been invited to, and
  // none of the buyer controls. Only the headline copy differs. (Q-033)
  const isVendorAccount = isIndividual || isTeam;
  const isSubdomain = isMarketplaceSubdomain();
  const marketplaceHome = isSubdomain ? "/" : "/marketplace";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [tenderType, setTenderType] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const isPhone = useIsPhone();
  const perPage = 9;
  // Paging from the bottom of a long phone list would otherwise leave you
  // looking at the footer of the new page.
  const listTopRef = useRef<HTMLDivElement>(null);
  const goToPage = (n: number) => {
    setPage(n);
    listTopRef.current?.scrollIntoView({ block: "start" });
  };

  const { data: categoriesData } = useQuery<{ categories: string[] }>({
    queryKey: ["/api/marketplace/categories"],
    staleTime: 5 * 60 * 1000,
  });
  const availableCategories = categoriesData?.categories ?? [];

  const { data: tendersData, isLoading, isError, refetch } = useQuery<{ tenders: MarketplaceTender[]; total: number }>({
    queryKey: ["/api/marketplace/tenders", debouncedSearch, category, city, tenderType, sort, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (tenderType) params.set("tenderType", tenderType);
      if (sort && sort !== "newest") params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", String(perPage));
      // Send the token so the server can scope tenders to the caller's account
      // type (individuals only see tenders open to individual applicants).
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/marketplace/tenders?${params.toString()}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Individuals: tenders they've been personally invited to.
  const { data: myInvitations = [] } = useQuery<any[]>({
    queryKey: ["/api/my-invitations"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/my-invitations",
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isVendorAccount,
  });

  const tenders = tendersData?.tenders || [];
  const total = tendersData?.total || 0;
  const totalPages = Math.ceil(total / perPage);
  const activeFilterCount = [category, city, tenderType, sort !== "newest" ? sort : ""].filter(Boolean).length;

  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });

  const arrow = isRtl ? "←" : "→";

  // pill style helpers
  const pillActive = { background: "#0B0907", color: "#F4EDE1" } as const;
  const pillInactive = { color: "#0B0907", background: "transparent" } as const;

  return (
    <div
      style={{
        background: "#F4EDE1",
        color: "#0B0907",
        fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : undefined,
      }}
      className="min-h-dvh surface-cream"
      dir={isRtl ? "rtl" : "ltr"}
    >

      {/* ── TOPBAR ── */}
      <div
        className="sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)]"
        style={{ background: "#F4EDE1", borderColor: "rgba(11,9,7,0.08)" }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 py-2 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 transition-transform active:scale-[0.97]" aria-label={t("marketplace.homeLink")}>
              <BidLogo variant="orange" size={28} />
            </Link>
            <nav className="hidden md:flex items-center gap-7">
              <Link href={marketplaceHome}>
                <span className="text-sm font-medium" style={{ color: "#FE3C01" }}>
                  {t("marketplace.title")}
                </span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="text-sm font-medium px-3 py-[11px] min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 rounded-full border transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-white"
              style={{ color: "#0B0907", borderColor: "rgba(11,9,7,0.16)" }}
              aria-label={t("marketplace.switchLanguage")}
              data-testid="button-language-toggle"
            >
              {language === "ar" ? "EN" : "AR"}
            </button>
            {user ? (
              <>
                {!isVendorAccount && (
                  <Link
                    href="/tenders/new"
                    className="inline-flex items-center whitespace-nowrap min-h-11 sm:min-h-0 text-sm font-medium px-3 sm:px-[18px] py-[11px] rounded-full transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-white"
                    style={{ color: "#0B0907" }}
                  >
                    {t("marketplace.postTender")}
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center whitespace-nowrap min-h-11 sm:min-h-0 text-sm font-medium px-3 sm:px-[18px] py-[11px] rounded-full transition-[color,background-color,border-color,transform] active:scale-[0.97]"
                  style={{ background: "#0B0907", color: "#F4EDE1" }}
                >
                  {t("marketplace.dashboard")}&nbsp;{arrow}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center whitespace-nowrap min-h-11 sm:min-h-0 text-sm font-medium px-3 sm:px-[18px] py-[11px] rounded-full transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-white"
                  style={{ color: "#0B0907" }}
                >
                  {t("marketplace.login")}
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center whitespace-nowrap min-h-11 sm:min-h-0 text-sm font-medium px-3 sm:px-[18px] py-[11px] rounded-full transition-[color,background-color,border-color,transform] active:scale-[0.97]"
                  style={{ background: "#0B0907", color: "#F4EDE1" }}
                >
                  {t("marketplace.getStarted")}&nbsp;{arrow}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 pt-16 sm:pt-20 pb-8 sm:pb-10">
        <div className="max-w-[900px]">
          {/* Live badge */}
          <span
            className="inline-flex items-center gap-2.5 mb-6 sm:mb-7 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: "white", border: "1px solid rgba(11,9,7,0.08)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full sm:motion-safe:animate-pulse"
              style={{ background: "#FE3C01" }}
            />
            {t("marketplace.liveBadge")}
          </span>
          {/* Headline */}
          <h1
            className="font-display font-bold leading-[0.92]"
            style={{
              fontSize: "clamp(44px, 9vw, 140px)",
              letterSpacing: "-0.045em",
              color: "#0B0907",
              // Arabic script has tall marks and descenders, so the 0.92
              // line-height built for Latin display type makes the two lines
              // collide. Loosen it and drop the Latin letter-spacing.
              ...(isRtl && {
                fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                lineHeight: 1.2,
                letterSpacing: 0,
              }),
            }}
          >
            {t("marketplace.heroLine1")}
            <br />
            {t("marketplace.heroLine2")}
            <span style={{ color: "#FE3C01" }}>.</span>
          </h1>
          {/* Subtitle */}
          <p className="mt-5 sm:mt-6 text-base sm:text-lg leading-relaxed max-w-[46ch]" style={{ color: "#8A8078" }}>
            {t("marketplace.heroSubtitle")}
          </p>
        </div>
      </div>

      {/* ── LIVE OPPORTUNITIES ── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">

        {/* Section header */}
        <div className="mb-8 sm:mb-9">
          <div
            className="inline-block text-[13px] font-semibold px-3.5 py-1.5 rounded-full mb-4"
            style={{ color: "#FE3C01", background: "#FFE4D7" }}
          >
            {isIndividual ? t("marketplaceInd.forIndividuals")
              : isTeam ? t("marketplaceInd.forTeams")
              : t("marketplace.browseLabel")}
          </div>
          <h2
            className="font-display font-bold leading-[0.95]"
            style={{
              fontSize: "clamp(36px, 5vw, 72px)",
              letterSpacing: "-0.035em",
              color: "#0B0907",
              ...(isRtl && { fontFamily: "'IBM Plex Sans Arabic', sans-serif", letterSpacing: 0 }),
            }}
          >
            {t("marketplace.liveOpportunities")}
            <span style={{ color: "#FE3C01" }}>.</span>
          </h2>
          {isVendorAccount && (
            <p className="mt-3 text-base max-w-[52ch]" style={{ color: "#8A8078" }}>
              {t(isTeam ? 'marketplaceInd.forTeamsSub' : 'marketplaceInd.forIndividualsSub')}
            </p>
          )}
        </div>

        {/* Invited to you (individuals) */}
        {isVendorAccount && myInvitations.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold px-3 py-1 rounded-full" style={{ color: "#0B0907", background: "#FFE4D7" }}>
                {t('marketplaceInd.invited')}
              </span>
              <span className="text-sm" style={{ color: "#8A8078" }}>
                {myInvitations.length === 1
                  ? t('marketplaceInd.invitationOne', { count: myInvitations.length })
                  : t('marketplaceInd.invitationMany', { count: myInvitations.length })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myInvitations.map((inv) => (
                <Link
                  key={inv.id}
                  href={user ? `/invite/${inv.tender.invitationToken}` : "/login"}
                  className="block rounded-2xl border p-4 hover:shadow-sm transition-[box-shadow,transform] active:scale-[0.98]"
                  style={{ borderColor: "#F0C9B8", background: "#FFF8F4" }}
                  data-testid={`invited-tender-${inv.tender.id}`}
                >
                  <p dir="auto" className="text-sm font-semibold text-[#0B0907] line-clamp-2">{inv.tender.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#8A8078" }}>
                    {t('marketplaceInd.invitedBy', { name: inv.requester.name })}
                    {inv.tender.category ? ` · ${inv.tender.category}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTER BAR ── */}
        {/* Mobile: stacks into a rounded card — pills wrap onto a second line if
            they don't fit, search full-width below. Desktop (sm+): single pill
            row. Prevents the pills and the fixed-width search from overlapping
            at narrow widths. The rail must NOT scroll or clip (overflow-x-auto
            used to cut the filter menus off, so they never showed). */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-2xl sm:rounded-full mb-4 shadow-[0_8px_24px_-16px_rgba(11,9,7,0.08)]"
          style={{ background: "white", border: "1px solid rgba(11,9,7,0.08)" }}
        >
          {/* Left: filter pills — wrap onto extra lines instead of scrolling */}
          <div className="flex items-center gap-1.5 flex-1 flex-wrap min-w-0 no-scrollbar">

            {/* All pill */}
            <button
              onClick={() => { setCategory(""); setTenderType(""); setCity(""); setPage(1); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 sm:min-h-0 rounded-full text-[13px] font-medium transition-[color,background-color,border-color,transform] active:scale-[0.97] whitespace-nowrap"
              style={!category && !tenderType && !city ? pillActive : pillInactive}
            >
              {t("marketplace.allFilter")}
              {total > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={
                    !category && !tenderType && !city
                      ? { background: "#F4EDE1", color: "#0B0907" }
                      : { background: "#FE3C01", color: "white" }
                  }
                >
                  {total}
                </span>
              )}
            </button>

            {/* Category */}
            <FilterDropdown
              label={t("marketplace.category")}
              value={category}
              options={[
                { value: "", label: t("marketplace.allCategories") },
                ...(availableCategories.length > 0
                  ? availableCategories.map(c => ({ value: c, label: categoryLabel(c, isRtl) }))
                  : []),
              ]}
              onChange={v => { setCategory(v); setPage(1); }}
            />

            {/* City */}
            <FilterDropdown
              label={t("marketplace.city")}
              value={city}
              options={[
                { value: "", label: t("marketplace.allCities") },
                ...SAUDI_CITIES.map(c => ({ value: c, label: cityLabel(c, isRtl) })),
              ]}
              onChange={v => { setCity(v); setPage(1); }}
            />

            {/* Type */}
            <FilterDropdown
              label={t("marketplace.allTypes")}
              title={t("marketplace.tenderType")}
              value={tenderType}
              options={[
                { value: "", label: t("marketplace.allTypes") },
                { value: "open_tender", label: t("marketplace.openTender") },
                { value: "direct_purchase", label: t("marketplace.directPurchase") },
                { value: "framework_agreement", label: t("marketplace.frameworkAgreement") },
              ]}
              onChange={v => { setTenderType(v); setPage(1); }}
            />
          </div>

          {/* Right: search + sort — full width on mobile, natural on desktop */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto sm:flex-shrink-0">
            {/* Search */}
            <div
              className="relative flex items-center rounded-full flex-1 min-w-0 sm:min-w-[240px]"
              style={{ background: "#F4EDE1" }}
            >
              <Search
                className="absolute w-3.5 h-3.5 pointer-events-none"
                style={{ [isRtl ? "right" : "left"]: 14, top: "50%", transform: "translateY(-50%)", color: "#8A8078" }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("marketplace.searchPlaceholder")}
                aria-label={t("marketplace.searchPlaceholder")}
                enterKeyHint="search"
                className="bg-transparent border-0 outline-none text-base sm:text-[13px] font-medium w-full py-2.5"
                style={{ [isRtl ? "paddingRight" : "paddingLeft"]: 36, [isRtl ? "paddingLeft" : "paddingRight"]: 16, color: "#0B0907" }}
              />
            </div>

            {/* Sort */}
            <FilterDropdown
              label={t("marketplace.sortNewest")}
              title={t("marketplace.sortBy")}
              value={sort}
              options={[
                { value: "newest", label: t("marketplace.sortNewest") },
                { value: "deadline_asc", label: t("marketplace.sortDeadline") },
                { value: "budget_desc", label: t("marketplace.sortBudget") },
              ]}
              onChange={v => { setSort(v); setPage(1); }}
              align="end"
              isActive={sort !== "newest"}
            />
          </div>
        </div>

        {/* ── ACTIVE FILTER CHIPS ── */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal rtl:text-xs"
              style={{ color: "#8A8078" }}
            >
              {t("marketplace.activeFiltersLabel")}
            </span>
            {category && (
              <FilterChip
                label={categoryLabel(category, isRtl)}
                removeLabel={t("marketplace.removeFilter")}
                onRemove={() => { setCategory(""); setPage(1); }}
              />
            )}
            {city && (
              <FilterChip
                label={cityLabel(city, isRtl)}
                removeLabel={t("marketplace.removeFilter")}
                onRemove={() => { setCity(""); setPage(1); }}
              />
            )}
            {tenderType && (
              <FilterChip
                label={
                  tenderType === "open_tender" ? t("marketplace.openTender")
                    : tenderType === "direct_purchase" ? t("marketplace.directPurchase")
                    : tenderType === "framework_agreement" ? t("marketplace.frameworkAgreement")
                    : tenderType.replace(/_/g, " ")
                }
                removeLabel={t("marketplace.removeFilter")}
                onRemove={() => { setTenderType(""); setPage(1); }}
              />
            )}
            {sort !== "newest" && (
              <FilterChip
                label={sort === "deadline_asc" ? t("marketplace.sortDeadline") : t("marketplace.sortBudget")}
                removeLabel={t("marketplace.removeFilter")}
                onRemove={() => { setSort("newest"); setPage(1); }}
              />
            )}
            <button
              type="button"
              onClick={() => { setCategory(""); setTenderType(""); setCity(""); setSort("newest"); setPage(1); }}
              className="inline-flex items-center min-h-11 sm:min-h-0 px-2 sm:px-0 text-xs font-semibold underline underline-offset-2 transition-transform active:scale-[0.97]"
              style={{ color: "#FE3C01" }}
            >
              {t("marketplace.clearFilters")}
            </button>
          </div>
        )}

        {/* ── RESULTS BAR ── */}
        <div ref={listTopRef} className="flex items-center justify-between mb-5 gap-6 scroll-mt-20">
          <div className="text-sm" style={{ color: "#8A8078" }}>
            {!isLoading && total > 0 && (
              <>
                <strong style={{ color: "#0B0907", fontWeight: 700 }}>{total.toLocaleString("en-US")}</strong>{" "}
                {total === 1 ? t("marketplace.resultOne")
                  : total <= 10 ? t("marketplace.resultsFew")
                  : t("marketplace.resultsLabel")}
              </>
            )}
          </div>
          {/* Below 640px the list and grid layouts are the same single column,
              so the toggle would do nothing: hide it on phones. */}
          <div
            className="hidden sm:flex items-center gap-1 p-1 rounded-full border"
            style={{ background: "#FAF5EC", borderColor: "rgba(11,9,7,0.08)" }}
            role="group"
            aria-label={t("marketplace.listView") + " / " + t("marketplace.gridView")}
          >
            <button
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-[color,background-color,border-color,transform] active:scale-[0.97]"
              style={viewMode === "list" ? { background: "#0B0907", color: "#F4EDE1" } : { color: "#8A8078" }}
            >
              <LayoutList className="w-3 h-3" />
              {t("marketplace.listView")}
            </button>
            <button
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-[color,background-color,border-color,transform] active:scale-[0.97]"
              style={viewMode === "grid" ? { background: "#0B0907", color: "#F4EDE1" } : { color: "#8A8078" }}
            >
              <LayoutGrid className="w-3 h-3" />
              {t("marketplace.gridView")}
            </button>
          </div>
        </div>

        {/* ── TENDER CARDS ── */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[170px_1fr_220px] bg-white rounded-[20px] border overflow-hidden"
                style={{ borderColor: "rgba(11,9,7,0.08)" }}
              >
                <div
                  className="flex sm:flex-col items-center sm:justify-center gap-4 px-4 py-4 sm:p-6 border-b sm:border-b-0 sm:border-e"
                  style={{ background: "linear-gradient(180deg,#FFF3EA,#FCE9DC)", borderColor: "rgba(254,60,1,0.08)" }}
                >
                  <Skeleton className="w-14 h-14 sm:w-[108px] sm:h-[108px] rounded-full" />
                  <Skeleton className="h-3 w-20 hidden sm:block" />
                </div>
                <div className="p-4 sm:p-6 flex flex-col gap-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div
                  className="px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-4 justify-center border-t sm:border-t-0 sm:border-s"
                  style={{ background: "#FAF5EC", borderColor: "rgba(11,9,7,0.08)" }}
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            className={EMPTY_STATE_ON_CREAM}
            icon={<WifiOff className="h-6 w-6" />}
            title={t("marketplace.loadErrorTitle")}
            description={t("marketplace.loadErrorDesc")}
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center min-h-11 rounded-full bg-[var(--bid-orange)] px-6 py-2.5 text-sm font-semibold text-white transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-[#E33600]"
              >
                {t("marketplace.retry")}
              </button>
            }
          />
        ) : tenders.length === 0 ? (
          activeFilterCount > 0 || debouncedSearch ? (
            <EmptyState
              className={EMPTY_STATE_ON_CREAM}
              icon={<Search className="h-6 w-6" />}
              title={t("marketplace.noMatchTitle")}
              description={t("marketplace.noMatchDesc")}
              action={
                <button
                  type="button"
                  onClick={() => { setCategory(""); setTenderType(""); setCity(""); setSort("newest"); setSearch(""); setDebouncedSearch(""); setPage(1); }}
                  className="inline-flex items-center justify-center min-h-11 rounded-full bg-[var(--bid-orange)] px-6 py-2.5 text-sm font-semibold text-white transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-[#E33600]"
                >
                  {t("marketplace.clearFilters")}
                </button>
              }
            />
          ) : (
          <EmptyState
            className={EMPTY_STATE_ON_CREAM}
            icon={<PackageOpen className="h-6 w-6" />}
            title={t("marketplace.noTenders").replace(/\.$/, "")}
            description={t("marketplace.checkBackLater")}
            action={
              isVendorAccount ? undefined : (
                <Link
                  href={user ? "/tenders/new" : "/signup"}
                  className="inline-flex items-center justify-center gap-2 min-h-11 rounded-full bg-[var(--bid-orange)] px-5 py-2.5 text-sm font-semibold text-white transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-[#E33600]"
                >
                  {t("marketplace.postTender")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              )
            }
          />
          )
        ) : (
          <div className={viewMode === "list" ? "flex flex-col gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
            {tenders.map((tender) => {
              const { days, expired, percent } = getTenderProgress(tender.deadline);
              const warn = !expired && days <= 25;
              const size = getTenderSize(tender.budgetMin, tender.budgetMax);
              const displayName = tender.profile?.displayName || tender.company.name;
              const initials = getAvatarInitials(displayName);
              const { bg: avatarBg, fg: avatarFg } = getAvatarColor(displayName);

              return (
                <a
                  key={tender.id}
                  href={`/invite/${tender.invitationToken}`}
                  onClick={(e) => { e.preventDefault(); setLocation(user ? `/invite/${tender.invitationToken}` : "/login"); }}
                  className={`group no-underline bg-white rounded-[20px] border overflow-hidden cursor-pointer transition-all duration-[250ms] active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(11,9,7,0.16)] hover:border-[rgba(254,60,1,0.25)] ${expired ? "opacity-70" : ""} ${viewMode === "list" ? "grid grid-cols-1 sm:grid-cols-[170px_1fr_220px]" : "flex flex-col"}`}
                  style={{ borderColor: "rgba(11,9,7,0.08)" }}
                >
                  {/* ── COUNTDOWN ── */}
                  <div
                    className="flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-3 px-4 py-3 sm:px-3.5 sm:py-5 border-b sm:border-b-0 sm:border-e"
                    style={{
                      background: "linear-gradient(180deg,#FFF3EA 0%,#FCE9DC 100%)",
                      borderColor: "rgba(254,60,1,0.08)",
                    }}
                  >
                    {/* Mobile: small ring */}
                    <div className="sm:hidden">
                      <CircleProgress percent={percent} days={days} expired={expired} warn={warn} size={56} unitLabel={t("marketplace.daysUnit")} closedLabel={t("marketplace.closedLabel")} />
                    </div>
                    {/* Desktop: full ring */}
                    <div className="hidden sm:block">
                      <CircleProgress percent={percent} days={days} expired={expired} warn={warn} size={108} unitLabel={t("marketplace.daysUnit")} closedLabel={t("marketplace.closedLabel")} />
                    </div>
                    <div className="text-center leading-[1.35]">
                      <em
                        className="not-italic block text-[9px] font-bold uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal rtl:text-[11px] mb-0.5"
                        style={{ color: expired ? "#E84A3F" : "#8A8078" }}
                      >
                        {expired
                          ? t("marketplace.closedOn")
                          : warn
                          ? t("marketplace.closingSoon")
                          : t("marketplace.deadlineLabel")}
                      </em>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: expired ? "#E84A3F" : "#0B0907" }}
                      >
                        {fmt(tender.deadline)}
                      </span>
                    </div>
                  </div>

                  {/* ── BODY ── */}
                  <div className="px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-2.5 min-w-0 justify-center flex-1">
                    <div className="text-[11px] font-medium [overflow-wrap:anywhere]" style={{ color: "#8A8078", fontFamily: "ui-monospace, monospace" }}>
                      <bdi>{tender.referenceNumber || "—"}</bdi>
                    </div>
                    <h3
                      dir="auto"
                      className="text-[17px] sm:text-[19px] font-semibold leading-[1.25] rtl:leading-[1.45] line-clamp-2 [overflow-wrap:anywhere] transition-colors group-hover:text-[#FE3C01]"
                      style={{ letterSpacing: isRtl ? 0 : "-0.02em", color: "#0B0907" }}
                    >
                      {tender.title}
                    </h3>
                    {tender.description && (
                      <div className="flex flex-col gap-1.5">
                        <p dir="auto" className="text-[13px] leading-[1.5] line-clamp-2" style={{ color: "#8A8078" }}>
                          {snippetDescription(tender.description)}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 w-fit text-[11px] font-bold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal rtl:text-xs px-2.5 py-1 rounded-full transition-all"
                          style={{ background: "#FFF3EA", color: "#FE3C01", border: "1px solid rgba(254,60,1,0.18)" }}
                        >
                          {t("marketplace.readMore")} {arrow}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-2.5 text-[13px] font-medium flex-wrap" style={{ color: "#8A8078" }}>
                      {/* Company / avatar */}
                      <span className="flex items-center gap-1.5 font-medium min-w-0 max-w-full" style={{ color: "#0B0907" }}>
                        {tender.profile?.logoUrl && tender.profile.logoUrl.includes("/company-logos/") ? (
                          <img
                            src={tender.profile.logoUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0 border"
                            style={{ borderColor: "rgba(11,9,7,0.08)" }}
                          />
                        ) : (
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{ background: avatarBg, color: avatarFg }}
                          >
                            {initials}
                          </span>
                        )}
                        {/* Two lines then an ellipsis. dir="auto" so an English company
                            name inside an Arabic page keeps its own reading order and the
                            ellipsis lands at the end of the name, not in the middle. */}
                        <span className="min-w-0 line-clamp-2 [overflow-wrap:anywhere]" dir="auto" title={displayName}>{displayName}</span>
                        <span
                          className="w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
                          style={{ background: "#22C55E", color: "white" }}
                        >✓</span>
                      </span>
                      {/* City */}
                      {tender.company.city && (
                        <>
                          <span className="w-[3px] h-[3px] rounded-full flex-shrink-0" style={{ background: "#C9C1B6" }} />
                          <span className="flex items-center gap-1">
                            <MapPin className="w-[11px] h-[11px] flex-shrink-0" />
                            {cityLabel(tender.company.city, isRtl)}
                          </span>
                        </>
                      )}
                      {/* Category */}
                      {tender.category && (
                        <>
                          <span className="w-[3px] h-[3px] rounded-full flex-shrink-0" style={{ background: "#C9C1B6" }} />
                          <span className="min-w-0 [overflow-wrap:anywhere]" style={{ color: "#0B0907", fontWeight: 500 }}>{categoryLabel(tender.category, isRtl)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── FACTS ── */}
                  <div
                    className="border-t sm:border-t-0 sm:border-s px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-3.5 justify-center"
                    style={{ background: "#FAF5EC", borderColor: "rgba(11,9,7,0.08)" }}
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {/* Doc fee */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal rtl:text-[11px]" style={{ color: "#8A8078" }}>
                          {t("marketplace.docFeeLabel")}
                        </span>
                        {tender.documentFee ? (
                          <span
                            className="text-[15px] font-bold leading-[1.1]"
                            style={{ letterSpacing: isRtl ? 0 : "-0.015em", color: "#0B0907", fontFamily: "ui-monospace, monospace" }}
                          >
                            {tender.documentFee.toLocaleString("en-US")}
                            <span
                              className="text-[10px] font-semibold ms-0.5"
                              style={{ color: "#8A8078", fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : undefined }}
                            > {t("marketplace.sar")}</span>
                          </span>
                        ) : (
                          <span className="text-[15px] font-bold leading-[1.1] rtl:leading-[1.4]" style={{ letterSpacing: isRtl ? 0 : "-0.015em", color: "#22C55E" }}>
                            {t("marketplace.free")}
                          </span>
                        )}
                      </div>
                      {/* Size */}
                      {size && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal rtl:text-[11px]" style={{ color: "#8A8078" }}>
                            {t("marketplace.sizeLabel")}
                          </span>
                          <span
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full w-fit border"
                            style={{ background: "white", borderColor: "rgba(11,9,7,0.08)", color: "#0B0907" }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: size === "small" ? "#4A8FE7" : size === "mid" ? "#FE3C01" : "#0B0907" }}
                            />
                            {size === "small" ? t("marketplace.sizeSmall") : size === "mid" ? t("marketplace.sizeMid") : t("marketplace.sizeLarge")}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* CTA button */}
                    <span
                      className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-full text-[12px] font-semibold transition-colors"
                      style={{ background: expired ? "#8A8078" : "#0B0907", color: expired ? "white" : "#F4EDE1" }}
                    >
                      {expired ? t("marketplace.viewArchive") : t("marketplace.viewTender")}
                      <span className="inline-block transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">{arrow}</span>
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (() => {
          // Phones only have room for a 3-page window between the arrows
          // (44px targets, 320px screens); wider screens keep the 7-page one.
          const win = Math.min(isPhone ? 3 : 7, totalPages);
          const half = Math.floor(win / 2);
          const first = totalPages <= win || page <= half + 1
            ? 1
            : page >= totalPages - half
              ? totalPages - win + 1
              : page - half;
          const btn = "w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-[color,background-color,border-color,transform] active:scale-[0.97] disabled:active:scale-100";
          return (
          <nav aria-label={t("marketplace.pagination")} className="flex items-center justify-center mt-9 gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label={t("marketplace.prevPage")}
              className={`${btn} border hover:bg-white disabled:opacity-40`}
              style={{ background: "white", borderColor: "rgba(11,9,7,0.08)" }}
            >
              {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            {Array.from({ length: win }, (_, i) => {
              const num = first + i;
              return (
                <button
                  type="button"
                  key={num}
                  onClick={() => goToPage(num)}
                  aria-label={t("marketplace.pageN", { n: num })}
                  aria-current={page === num ? "page" : undefined}
                  className={`${btn} text-sm font-semibold hover:bg-white`}
                  style={page === num ? { background: "#0B0907", color: "#F4EDE1" } : { color: "#0B0907" }}
                >
                  {num}
                </button>
              );
            })}
            {totalPages > win && first + win - 1 < totalPages && (
              <span style={{ color: "#8A8078" }} className="px-1" aria-hidden="true">…</span>
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label={t("marketplace.nextPage")}
              className={`${btn} border hover:bg-white disabled:opacity-40`}
              style={{ background: "white", borderColor: "rgba(11,9,7,0.08)" }}
            >
              {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </nav>
          );
        })()}
      </div>

      {/* ── CTA STRIP ── */}
      {!isVendorAccount && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 mb-16">
          <div
            className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr] gap-8 sm:gap-12 items-center p-8 sm:p-14 rounded-[24px] sm:rounded-[32px] relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#FE3C01 0%,#FF6535 100%)" }}
          >
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage: "radial-gradient(circle at center,rgba(255,255,255,.15) 1.5px,transparent 2px)",
                backgroundSize: "24px 24px",
              }}
            />
            <h2
              className="relative z-10 font-display font-bold text-white"
              style={{ fontSize: "clamp(28px,4vw,44px)", letterSpacing: isRtl ? 0 : "-0.03em", lineHeight: isRtl ? 1.25 : 1 }}
            >
              {t("marketplace.ctaTitle")}
            </h2>
            <div className="relative z-10">
              <p className="text-white opacity-95 text-[15px] leading-[1.55] mb-6 max-w-[36ch]">
                {t("marketplace.ctaDesc")}
              </p>
              <Link
                href={user ? "/tenders/new" : "/signup"}
                className="flex w-full items-center justify-center sm:inline-flex sm:w-auto font-semibold text-sm px-5 py-3.5 min-h-12 sm:min-h-0 rounded-full transition-[color,background-color,border-color,transform] active:scale-[0.97] hover:bg-[#F4EDE1]"
                style={{ background: "white", color: "#FE3C01" }}
              >
                {t("marketplace.ctaButton")}&nbsp;{arrow}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <SiteFooter lang={language === "ar" ? "ar" : "en"} />
    </div>
  );
}
