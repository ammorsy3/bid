import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, ChevronDown, ChevronLeft, ChevronRight, MapPin, LayoutList, LayoutGrid, PackageOpen, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { isMarketplaceSubdomain } from "@/lib/subdomain";
import { useAuthStore } from "@/lib/auth";
import { BidLogo } from "@/components/brand/BidLogo";

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
  percent, days, expired, warn, size = 108,
}: {
  percent: number; days: number; expired: boolean; warn: boolean; size?: number;
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
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8A8078", marginTop: 3 }}>
            {expired ? "Closed" : "days"}
          </span>
        )}
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  align = "start",
  isActive,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  align?: "start" | "end";
  isActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = isActive !== undefined ? isActive : !!value;
  const displayLabel = value
    ? (options.find(o => o.value === value)?.label ?? label)
    : label;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap hover:bg-[#FAF5EC]"
        style={active ? { background: "#0B0907", color: "#F4EDE1" } : { background: "transparent", color: "#0B0907" }}
      >
        {displayLabel}
        <ChevronDown
          className={`w-2.5 h-2.5 opacity-50 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1.5 bg-white rounded-2xl border shadow-lg z-30 min-w-[180px] max-h-60 overflow-y-auto"
          style={{ borderColor: "rgba(11,9,7,0.08)", ...(align === "end" ? { right: 0 } : { left: 0 }) }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="block w-full text-start px-4 py-2.5 text-sm hover:bg-[#F4EDE1] transition-colors"
              style={{
                color: value === opt.value ? "#FE3C01" : "#8A8078",
                fontWeight: value === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Marketplace() {
  const { t, language, isRtl } = useI18n();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const isIndividual = (activeCompany as any)?.accountType === 'individual';
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
  const perPage = 9;

  const { data: categoriesData } = useQuery<{ categories: string[] }>({
    queryKey: ["/api/marketplace/categories"],
    staleTime: 5 * 60 * 1000,
  });
  const availableCategories = categoriesData?.categories ?? [];

  const { data: tendersData, isLoading } = useQuery<{ tenders: MarketplaceTender[]; total: number }>({
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
    enabled: isIndividual,
  });

  // Individuals: tenders recommended to them (field-matched).
  const { data: recommendedTenders = [] } = useQuery<any[]>({
    queryKey: ["/api/individuals/recommended-tenders"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/individuals/recommended-tenders",
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) return [];
      const j = await res.json();
      return j.tenders || [];
    },
    enabled: isIndividual,
  });

  const tenders = tendersData?.tenders || [];
  const total = tendersData?.total || 0;
  const totalPages = Math.ceil(total / perPage);
  const activeFilterCount = [category, city, tenderType, sort !== "newest" ? sort : ""].filter(Boolean).length;

  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
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
      className="min-h-screen"
      dir={isRtl ? "rtl" : "ltr"}
    >

      {/* ── TOPBAR ── */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{ background: "#F4EDE1", borderColor: "rgba(11,9,7,0.08)" }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={marketplaceHome} className="flex items-center">
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
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {!isIndividual && (
                  <Link href="/tenders/new">
                    <button
                      className="text-sm font-medium px-[18px] py-[11px] rounded-full transition-colors hover:bg-white"
                      style={{ color: "#0B0907" }}
                    >
                      {t("marketplace.postTender")}
                    </button>
                  </Link>
                )}
                <Link href="/dashboard">
                  <button
                    className="text-sm font-medium px-[18px] py-[11px] rounded-full transition-colors"
                    style={{ background: "#0B0907", color: "#F4EDE1" }}
                  >
                    {t("marketplace.dashboard")} {arrow}
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <button
                    className="text-sm font-medium px-[18px] py-[11px] rounded-full transition-colors hover:bg-white"
                    style={{ color: "#0B0907" }}
                  >
                    {t("marketplace.login")}
                  </button>
                </Link>
                <Link href="/signup">
                  <button
                    className="text-sm font-medium px-[18px] py-[11px] rounded-full transition-colors"
                    style={{ background: "#0B0907", color: "#F4EDE1" }}
                  >
                    {t("marketplace.getStarted")} {arrow}
                  </button>
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
              className="w-1.5 h-1.5 rounded-full animate-pulse"
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
              ...(isRtl && { fontFamily: "'IBM Plex Sans Arabic', sans-serif" }),
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
            {isIndividual ? t("marketplaceInd.forIndividuals") : t("marketplace.browseLabel")}
          </div>
          <h2
            className="font-display font-bold leading-[0.95]"
            style={{
              fontSize: "clamp(36px, 5vw, 72px)",
              letterSpacing: "-0.035em",
              color: "#0B0907",
              ...(isRtl && { fontFamily: "'IBM Plex Sans Arabic', sans-serif" }),
            }}
          >
            {t("marketplace.liveOpportunities")}
            <span style={{ color: "#FE3C01" }}>.</span>
          </h2>
          {isIndividual && (
            <p className="mt-3 text-base max-w-[52ch]" style={{ color: "#8A8078" }}>
              {t('marketplaceInd.forIndividualsSub')}
            </p>
          )}
        </div>

        {/* Recommended for you (individuals) */}
        {isIndividual && recommendedTenders.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[13px] font-semibold px-3 py-1 rounded-full" style={{ color: "#FE3C01", background: "#FFE4D7" }}>
                {t('marketplaceInd.recommended')}
              </span>
              <span className="text-sm" style={{ color: "#8A8078" }}>{t('marketplaceInd.recommendedSub')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendedTenders.map((rec) => (
                <Link
                  key={rec.id}
                  href={user ? `/invite/${rec.invitationToken}` : "/login"}
                  className="block rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
                  data-testid={`recommended-tender-${rec.id}`}
                >
                  <p className="text-sm font-semibold text-[#0B0907] line-clamp-2">{rec.title}</p>
                  <p className="text-xs mt-1" style={{ color: "#8A8078" }}>
                    {rec.requesterName || t('marketplaceInd.byCompany')}
                    {rec.category ? ` · ${rec.category}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Invited to you (individuals) */}
        {isIndividual && myInvitations.length > 0 && (
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
                  className="block rounded-2xl border p-4 hover:shadow-sm transition-shadow"
                  style={{ borderColor: "#F0C9B8", background: "#FFF8F4" }}
                  data-testid={`invited-tender-${inv.tender.id}`}
                >
                  <p className="text-sm font-semibold text-[#0B0907] line-clamp-2">{inv.tender.title}</p>
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
        {/* Mobile: stacks into a rounded card — pills scroll horizontally, search
            full-width below. Desktop (sm+): single pill row. Prevents the pills
            and the fixed-width search from overlapping at narrow widths. */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-2xl sm:rounded-full mb-4 shadow-[0_8px_24px_-16px_rgba(11,9,7,0.08)]"
          style={{ background: "white", border: "1px solid rgba(11,9,7,0.08)" }}
        >
          {/* Left: filter pills — horizontal scroll rail on mobile, wraps on desktop */}
          <div className="flex items-center gap-1.5 flex-1 flex-nowrap sm:flex-wrap min-w-0 overflow-x-auto no-scrollbar">

            {/* All pill */}
            <button
              onClick={() => { setCategory(""); setTenderType(""); setCity(""); setPage(1); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap"
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
                  ? availableCategories.map(c => ({ value: c, label: c }))
                  : []),
              ]}
              onChange={v => { setCategory(v); setPage(1); }}
              align={isRtl ? "end" : "start"}
            />

            {/* City */}
            <FilterDropdown
              label={t("marketplace.city")}
              value={city}
              options={[
                { value: "", label: t("marketplace.city") },
                ...SAUDI_CITIES.map(c => ({ value: c, label: c })),
              ]}
              onChange={v => { setCity(v); setPage(1); }}
              align={isRtl ? "end" : "start"}
            />

            {/* Type */}
            <FilterDropdown
              label={t("marketplace.allTypes")}
              value={tenderType}
              options={[
                { value: "", label: t("marketplace.allTypes") },
                { value: "open_tender", label: t("marketplace.openTender") },
                { value: "direct_purchase", label: t("marketplace.directPurchase") },
                { value: "framework_agreement", label: t("marketplace.frameworkAgreement") },
              ]}
              onChange={v => { setTenderType(v); setPage(1); }}
              align={isRtl ? "end" : "start"}
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
                className="bg-transparent border-0 outline-none text-[13px] font-medium w-full py-2.5"
                style={{ [isRtl ? "paddingRight" : "paddingLeft"]: 36, [isRtl ? "paddingLeft" : "paddingRight"]: 16, color: "#0B0907" }}
              />
            </div>

            {/* Sort */}
            <FilterDropdown
              label={t("marketplace.sortNewest")}
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
              className="text-[11px] font-bold uppercase tracking-[0.08em]"
              style={{ color: "#8A8078" }}
            >
              {t("marketplace.activeFiltersLabel")}
            </span>
            {category && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-white"
                style={{ borderColor: "rgba(11,9,7,0.08)", color: "#0B0907" }}
              >
                {category}
                <button
                  onClick={() => { setCategory(""); setPage(1); }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#0B0907", color: "white" }}
                >×</button>
              </span>
            )}
            {city && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-white"
                style={{ borderColor: "rgba(11,9,7,0.08)", color: "#0B0907" }}
              >
                {city}
                <button
                  onClick={() => { setCity(""); setPage(1); }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#0B0907", color: "white" }}
                >×</button>
              </span>
            )}
            {tenderType && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-white"
                style={{ borderColor: "rgba(11,9,7,0.08)", color: "#0B0907" }}
              >
                {tenderType.replace(/_/g, " ")}
                <button
                  onClick={() => { setTenderType(""); setPage(1); }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#0B0907", color: "white" }}
                >×</button>
              </span>
            )}
            {sort !== "newest" && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-white"
                style={{ borderColor: "rgba(11,9,7,0.08)", color: "#0B0907" }}
              >
                {sort === "deadline_asc" ? t("marketplace.sortDeadline") : t("marketplace.sortBudget")}
                <button
                  onClick={() => { setSort("newest"); setPage(1); }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#0B0907", color: "white" }}
                >×</button>
              </span>
            )}
            <button
              onClick={() => { setCategory(""); setTenderType(""); setCity(""); setSort("newest"); setPage(1); }}
              className="text-xs font-semibold underline underline-offset-2"
              style={{ color: "#FE3C01" }}
            >
              {t("marketplace.clearFilters")}
            </button>
          </div>
        )}

        {/* ── RESULTS BAR ── */}
        <div className="flex items-center justify-between mb-5 gap-6">
          <div className="text-sm" style={{ color: "#8A8078" }}>
            {!isLoading && total > 0 && (
              <>
                <strong style={{ color: "#0B0907", fontWeight: 700 }}>{total}</strong>{" "}
                {isRtl ? "نتيجة" : "results"}
              </>
            )}
          </div>
          <div
            className="flex items-center gap-1 p-1 rounded-full border"
            style={{ background: "#FAF5EC", borderColor: "rgba(11,9,7,0.08)" }}
          >
            <button
              onClick={() => setViewMode("list")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={viewMode === "list" ? { background: "#0B0907", color: "#F4EDE1" } : { color: "#8A8078" }}
            >
              <LayoutList className="w-3 h-3" />
              {t("marketplace.listView")}
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
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
                  className="flex sm:flex-col items-center sm:justify-center gap-4 px-4 py-4 sm:p-6 border-b sm:border-b-0 sm:border-r"
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
                  className="px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-4 justify-center border-t sm:border-t-0 sm:border-l"
                  style={{ background: "#FAF5EC", borderColor: "rgba(11,9,7,0.08)" }}
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : tenders.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title={t("marketplace.noTenders").replace(/\.$/, "")}
            description={t("marketplace.checkBackLater")}
            action={
              isIndividual ? undefined : (
                <Link href={user ? "/tenders/new" : "/signup"}>
                  <button className="inline-flex items-center gap-2 rounded-full bg-[var(--bid-orange)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E33600]">
                    {t("marketplace.postTender")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              )
            }
          />
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
                  className={`group no-underline bg-white rounded-[20px] border overflow-hidden cursor-pointer transition-all duration-[250ms] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(11,9,7,0.16)] hover:border-[rgba(254,60,1,0.25)] ${expired ? "opacity-70" : ""} ${viewMode === "list" ? "grid grid-cols-1 sm:grid-cols-[170px_1fr_220px]" : "flex flex-col"}`}
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
                      <CircleProgress percent={percent} days={days} expired={expired} warn={warn} size={56} />
                    </div>
                    {/* Desktop: full ring */}
                    <div className="hidden sm:block">
                      <CircleProgress percent={percent} days={days} expired={expired} warn={warn} size={108} />
                    </div>
                    <div className="text-center leading-[1.35]">
                      <em
                        className="not-italic block text-[9px] font-bold uppercase tracking-[0.08em] mb-0.5"
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
                    <div className="text-[11px] font-medium" style={{ color: "#8A8078", fontFamily: "ui-monospace, monospace" }}>
                      {tender.referenceNumber || "—"}
                    </div>
                    <h3
                      className="text-[17px] sm:text-[19px] font-semibold leading-[1.25] line-clamp-2 transition-colors group-hover:text-[#FE3C01]"
                      style={{ letterSpacing: "-0.02em", color: "#0B0907" }}
                    >
                      {tender.title}
                    </h3>
                    {tender.description && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[13px] leading-[1.5] line-clamp-2" style={{ color: "#8A8078" }}>
                          {snippetDescription(tender.description)}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 w-fit text-[11px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-full transition-all"
                          style={{ background: "#FFF3EA", color: "#FE3C01", border: "1px solid rgba(254,60,1,0.18)" }}
                        >
                          {t("marketplace.readMore")} {arrow}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-2.5 text-[13px] font-medium flex-wrap" style={{ color: "#8A8078" }}>
                      {/* Company / avatar */}
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: "#0B0907" }}>
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
                        <span className="truncate max-w-[160px] sm:max-w-none">{displayName}</span>
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
                            {tender.company.city}
                          </span>
                        </>
                      )}
                      {/* Category */}
                      {tender.category && (
                        <>
                          <span className="w-[3px] h-[3px] rounded-full flex-shrink-0" style={{ background: "#C9C1B6" }} />
                          <span style={{ color: "#0B0907", fontWeight: 500 }}>{tender.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── FACTS ── */}
                  <div
                    className="border-t sm:border-t-0 sm:border-s px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-3.5 justify-center"
                    style={{ background: "#FAF5EC", borderColor: "rgba(11,9,7,0.08)" }}
                  >
                    <div className="flex gap-4">
                      {/* Doc fee */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#8A8078" }}>
                          {t("marketplace.docFeeLabel")}
                        </span>
                        {tender.documentFee ? (
                          <span
                            className="text-[15px] font-bold leading-[1.1]"
                            style={{ letterSpacing: "-0.015em", color: "#0B0907", fontFamily: "ui-monospace, monospace" }}
                          >
                            {tender.documentFee.toLocaleString()}
                            <span className="text-[10px] font-semibold ms-0.5" style={{ color: "#8A8078" }}> SAR</span>
                          </span>
                        ) : (
                          <span className="text-[15px] font-bold leading-[1.1]" style={{ letterSpacing: "-0.015em", color: "#22C55E" }}>
                            {t("marketplace.free")}
                          </span>
                        )}
                      </div>
                      {/* Size */}
                      {size && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "#8A8078" }}>
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
                      <span className="inline-block transition-transform group-hover:translate-x-0.5">{arrow}</span>
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-9 gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:bg-white disabled:opacity-40"
              style={{ background: "white", borderColor: "rgba(11,9,7,0.08)" }}
            >
              {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let num: number;
              if (totalPages <= 7) num = i + 1;
              else if (page <= 4) num = i + 1;
              else if (page >= totalPages - 3) num = totalPages - 6 + i;
              else num = page - 3 + i;
              return (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors hover:bg-white"
                  style={page === num ? { background: "#0B0907", color: "#F4EDE1" } : { color: "#0B0907" }}
                >
                  {num}
                </button>
              );
            })}
            {totalPages > 7 && page < totalPages - 3 && (
              <span style={{ color: "#8A8078" }} className="px-1">…</span>
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:bg-white disabled:opacity-40"
              style={{ background: "white", borderColor: "rgba(11,9,7,0.08)" }}
            >
              {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* ── CTA STRIP ── */}
      {!isIndividual && (
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
              style={{ fontSize: "clamp(28px,4vw,44px)", letterSpacing: "-0.03em", lineHeight: 1 }}
            >
              {t("marketplace.ctaTitle")}
            </h2>
            <div className="relative z-10">
              <p className="text-white opacity-95 text-[15px] leading-[1.55] mb-6 max-w-[36ch]">
                {t("marketplace.ctaDesc")}
              </p>
              <Link href={user ? "/tenders/new" : "/signup"}>
                <button
                  className="font-semibold text-sm px-5 py-3.5 rounded-full transition-colors hover:bg-[#F4EDE1]"
                  style={{ background: "white", color: "#FE3C01" }}
                >
                  {t("marketplace.ctaButton")} {arrow}
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t" style={{ borderColor: "rgba(11,9,7,0.08)" }}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 py-14 sm:py-16">
          <div
            className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr_1fr] gap-8 sm:gap-10 pb-10 border-b"
            style={{ borderColor: "rgba(11,9,7,0.08)" }}
          >
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="mb-4">
                <BidLogo variant="orange" size={30} />
              </div>
              <p className="text-sm leading-[1.55] max-w-[36ch]" style={{ color: "#8A8078" }}>
                {t("marketplace.footerTagline")}
              </p>
            </div>
            {/* For Requesters */}
            <div>
              <h5
                className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3.5"
                style={{ color: "#0B0907" }}
              >
                {t("marketplace.footerForRequesters")}
              </h5>
              <div className="flex flex-col gap-1">
                <Link href={marketplaceHome} className="text-sm py-1 transition-colors hover:text-[#FE3C01]" style={{ color: "#8A8078" }}>
                  {t("marketplace.title")}
                </Link>
                <Link href="/signup" className="text-sm py-1 transition-colors hover:text-[#FE3C01]" style={{ color: "#8A8078" }}>
                  {t("marketplace.getStarted")}
                </Link>
              </div>
            </div>
            {/* For Vendors */}
            <div>
              <h5
                className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3.5"
                style={{ color: "#0B0907" }}
              >
                {t("marketplace.footerForVendors")}
              </h5>
              <div className="flex flex-col gap-1">
                <Link href={marketplaceHome} className="text-sm py-1 transition-colors hover:text-[#FE3C01]" style={{ color: "#8A8078" }}>
                  {t("marketplace.title")}
                </Link>
                <Link href="/login" className="text-sm py-1 transition-colors hover:text-[#FE3C01]" style={{ color: "#8A8078" }}>
                  {t("marketplace.login")}
                </Link>
              </div>
            </div>
            {/* Company */}
            <div>
              <h5
                className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3.5"
                style={{ color: "#0B0907" }}
              >
                {t("marketplace.footerCompany")}
              </h5>
              <div className="flex flex-col gap-1">
                <Link href="/" className="text-sm py-1 transition-colors hover:text-[#FE3C01]" style={{ color: "#8A8078" }}>
                  {t("marketplace.home")}
                </Link>
                <Link href="/login" className="text-sm py-1 transition-colors hover:text-[#FE3C01]" style={{ color: "#8A8078" }}>
                  {t("marketplace.login")}
                </Link>
              </div>
            </div>
          </div>
          <div
            className="flex items-center justify-between pt-7 text-[13px] gap-6 flex-wrap"
            style={{ color: "#8A8078" }}
          >
            <span>{t("marketplace.copyright")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
