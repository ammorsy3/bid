import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, FileText, MapPin, ChevronLeft, ChevronRight, Loader2, ChevronDown, Building2, Users, ArrowRight, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { isMarketplaceSubdomain } from "@/lib/subdomain";
import { useAuthStore } from "@/lib/auth";
import { BidLogo } from "@/components/brand/BidLogo";
import heroBg from "@assets/image_1775799187200.png";

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
  company: {
    id: string;
    name: string;
    city: string | null;
    category: string | null;
  };
  profile?: {
    displayName: string | null;
    logoUrl: string | null;
  };
}

const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
  "Tabuk", "Abha", "Taif", "Hail", "Jubail", "Yanbu", "Najran", "Jazan",
  "Al Kharj", "Buraydah", "Khamis Mushait", "Al Hofuf", "Sakaka"
];

function getTenderProgress(createdAt: string, deadline: string) {
  const now = Date.now();
  const end = new Date(deadline).getTime();
  const remaining = end - now;
  if (remaining <= 0) return { days: 0, expired: true, percent: 0 };
  const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
  const maxDays = 100;
  const percent = Math.min(100, Math.max(0, (days / maxDays) * 100));
  return { days, expired: false, percent };
}

function CircleProgress({ percent, days, expired, size = 56 }: { percent: number; days: number; expired: boolean; size?: number }) {
  const isLarge = size >= 80;
  const stroke = isLarge ? 5 : 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = expired ? '#9ca3af' : percent < 25 ? '#f59e0b' : '#FE3C01';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${isLarge ? 'text-3xl' : 'text-base'} font-bold leading-none`} style={{ color }}>{expired ? 0 : days}</span>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { t, language, isRtl } = useI18n();
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const isSubdomain = isMarketplaceSubdomain();
  const marketplaceHome = isSubdomain ? "/" : "/marketplace";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [tenderType, setTenderType] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const perPage = 9;
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setShowCategoryDropdown(false), []);

  useEffect(() => {
    if (!showCategoryDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) closeDropdown();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showCategoryDropdown, closeDropdown]);

  const { data: tendersData, isLoading } = useQuery<{ tenders: MarketplaceTender[]; total: number }>({
    queryKey: ["/api/marketplace/tenders", search, category, city, tenderType, sort, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (tenderType) params.set("tenderType", tenderType);
      if (sort && sort !== "newest") params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", String(perPage));
      const res = await fetch(`/api/marketplace/tenders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });


  const tenders = tendersData?.tenders || [];
  const total = tendersData?.total || 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className={`min-h-screen bg-[#F3F4F6] ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href={marketplaceHome} className="flex items-center gap-2">
                <BidLogo size={28} />
              </Link>
              <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
                <Link href={marketplaceHome}>
                  <span className="text-[#FE3C01] font-semibold">
                    {t('marketplace.title')}
                  </span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link href="/tenders/new">
                    <Button size="sm" variant="outline" className="text-sm px-4 rounded border-[#FE3C01]/30 text-[#FE3C01] hover:bg-[#FE3C01]/5">
                      {t('marketplace.postTender') || 'Post a Tender'}
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="sm" className="bg-[#FE3C01] hover:bg-[#E83501] text-white text-sm px-5 rounded">
                      {t('marketplace.dashboard')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                      {t('marketplace.login')}
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" className="bg-[#FE3C01] hover:bg-[#E83501] text-white text-sm px-5 rounded">
                      {t('marketplace.getStarted')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="relative h-[280px] sm:h-[320px] overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-[0.92] tracking-[-0.04em]">
            {t('marketplace.title')}
          </h1>
        </div>
      </section>


      <section className="bg-card py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground text-center mb-3 tracking-[-0.03em]">
            {t('marketplace.howItWorks')}
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10 text-sm sm:text-base">
            {t('marketplace.howItWorksDesc')}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-muted p-7 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-[#FE3C01]/10 flex items-center justify-center mb-5">
                <Building2 className="h-7 w-7 text-[#FE3C01]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t('marketplace.buyers')}</h3>
              <p className="text-sm text-muted-foreground mb-5">{t('marketplace.buyersDesc')}</p>
              <Link href="/signup">
                <Button className="bg-[#FE3C01] hover:bg-[#E83501] text-white px-6">
                  {t('marketplace.startBuying')}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-muted p-7 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-[#FE3C01]/10 flex items-center justify-center mb-5">
                <Users className="h-7 w-7 text-[#FE3C01]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t('marketplace.suppliers')}</h3>
              <p className="text-sm text-muted-foreground mb-5">{t('marketplace.suppliersDesc')}</p>
              <Link href="/signup">
                <Button variant="outline" className="border-[#FE3C01] text-[#FE3C01] hover:bg-red-50 px-6">
                  {t('marketplace.startSelling')}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground text-center mb-8 tracking-[-0.03em]">
          {t('marketplace.latestOpportunities')}
        </h2>

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                aria-expanded={showCategoryDropdown}
                aria-haspopup="listbox"
                className="flex items-center gap-2 border border-border rounded-lg px-4 py-2.5 text-sm bg-card hover:border-gray-400 transition-colors"
              >
                {category || t('marketplace.category')}
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {showCategoryDropdown && (
                <div role="listbox" className={`absolute top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-30 min-w-[200px] max-h-60 overflow-y-auto ${isRtl ? 'right-0' : 'left-0'}`}>
                  <button
                    role="option"
                    aria-selected={!category}
                    onClick={() => { setCategory(""); setShowCategoryDropdown(false); setPage(1); }}
                    className={`block w-full text-start px-4 py-2 text-sm hover:bg-muted ${!category ? 'text-[#FE3C01] font-medium' : 'text-muted-foreground'}`}
                  >
                    {t('marketplace.allCategories')}
                  </button>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      role="option"
                      aria-selected={category === cat}
                      onClick={() => { setCategory(cat); setShowCategoryDropdown(false); setPage(1); }}
                      className={`block w-full text-start px-4 py-2 text-sm hover:bg-muted ${category === cat ? 'text-[#FE3C01] font-medium' : 'text-muted-foreground'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Select value={tenderType || "all"} onValueChange={(v) => { setTenderType(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[170px] h-10 text-sm bg-card border-border">
                <SelectValue placeholder={t('marketplace.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marketplace.allTypes')}</SelectItem>
                <SelectItem value="open_tender">{t('marketplace.openTender')}</SelectItem>
                <SelectItem value="direct_purchase">{t('marketplace.directPurchase')}</SelectItem>
                <SelectItem value="framework_agreement">{t('marketplace.frameworkAgreement')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={city || "all"} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-10 text-sm bg-card border-border">
                <SelectValue placeholder={t('marketplace.city')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marketplace.allCities')}</SelectItem>
                {SAUDI_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-10 text-sm bg-card border-border">
                <SelectValue placeholder={t('marketplace.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('marketplace.sortNewest')}</SelectItem>
                <SelectItem value="deadline_asc">{t('marketplace.sortDeadline')}</SelectItem>
                <SelectItem value="budget_desc">{t('marketplace.sortBudget')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('marketplace.searchPlaceholder')}
                className={`w-48 sm:w-64 h-10 text-sm bg-card border-border rounded-lg ${isRtl ? 'pr-10' : 'pl-10'}`}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4" data-testid="loader-page">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-stretch">
                  {/* Progress circle area */}
                  <div className="flex flex-col items-center justify-center px-8 py-8 border-e border-border min-w-[160px]">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-3 w-16 mt-3" />
                    <Skeleton className="h-3 w-12 mt-1.5" />
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <div className="flex items-center gap-4 pt-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-display font-black text-2xl text-muted-foreground tracking-[-0.03em]">{t('marketplace.noTenders')}</h3>
            <p className="text-sm text-gray-400 mt-2">{t('marketplace.checkBackLater')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tenders.map((tender) => {
              const { days, expired, percent } = getTenderProgress(tender.createdAt, tender.deadline);
              const tenderTypeLabel =
                tender.tenderType === 'open_tender' ? t('marketplace.openTender') :
                tender.tenderType === 'direct_purchase' ? t('marketplace.directPurchase') :
                tender.tenderType === 'framework_agreement' ? t('marketplace.frameworkAgreement') :
                t('marketplace.openTender');
              const formatDate = (dateStr: string) => {
                const d = new Date(dateStr);
                return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
              };
              return (
                <a
                  key={tender.id}
                  href={`/invite/${tender.invitationToken}`}
                  className="block bg-card rounded-xl border border-border hover:shadow-md hover:border-border transition-all cursor-pointer group no-underline overflow-hidden"
                  onClick={(e) => { e.preventDefault(); setLocation(user ? `/invite/${tender.invitationToken}` : '/login'); }}
                >
                  {/* Main content area */}
                  <div className="flex items-stretch">
                    {/* Left: Circle progress */}
                    <div className="flex flex-col items-center justify-center px-8 py-8 border-e border-border min-w-[160px]">
                      <CircleProgress percent={percent} days={days} expired={expired} size={110} />
                      <p className={`text-xs mt-3 ${expired ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {expired ? t('marketplace.deadlinePassed') : `${days} ${t('marketplace.daysRemaining')}`}
                      </p>
                    </div>

                    {/* Right: Tender info */}
                    <div className="flex-1 min-w-0 px-6 py-6 flex flex-col justify-between">
                      {/* Top row: publish date + badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{t('marketplace.publishDate')}:</span>
                          <span className="font-medium text-muted-foreground">{formatDate(tender.createdAt)}</span>
                        </div>
                        <Badge className="bg-[#FE3C01] text-white border-0 text-[11px] font-medium px-2.5 py-0.5 rounded">
                          {tenderTypeLabel}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-foreground group-hover:text-[#FE3C01] transition-colors leading-snug mb-2 line-clamp-2">
                        {tender.title}
                      </h3>

                      {/* Company info */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        {tender.profile?.logoUrl && tender.profile.logoUrl.includes('/company-logos/') ? (
                          <img src={tender.profile.logoUrl} alt="" className="h-5 w-5 rounded-full object-cover border border-border flex-shrink-0" />
                        ) : (
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="font-medium">{tender.profile?.displayName || tender.company.name}</span>
                        {tender.company.city && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {tender.company.city}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Category + details link */}
                      <div className="flex items-center justify-between">
                        {tender.category && (
                          <span className="text-xs text-[#FE3C01] font-medium">{tender.category}</span>
                        )}
                        <span className="text-xs text-muted-foreground underline underline-offset-2 group-hover:text-[#FE3C01] transition-colors">
                          {t('marketplace.viewDetails')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-muted border-t border-border">
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] text-gray-400 mb-1">{t('marketplace.refNumber')}</p>
                      <p className="text-sm font-semibold text-foreground font-mono">{tender.referenceNumber || '—'}</p>
                    </div>
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] text-gray-400 mb-1">{t('marketplace.inquiryDeadline')}</p>
                      <p className="text-sm font-semibold text-foreground">{tender.inquiryDeadline ? formatDate(tender.inquiryDeadline) : '—'}</p>
                    </div>
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] text-gray-400 mb-1">{t('marketplace.submissionDeadline')}</p>
                      <p className={`text-sm font-semibold ${expired ? 'text-red-500' : 'text-foreground'}`}>{formatDate(tender.deadline)}</p>
                    </div>
                    <div className="bg-card px-5 py-4 text-center">
                      <p className="text-[11px] text-gray-400 mb-1">{t('marketplace.documentFee')}</p>
                      <p className={`text-sm font-semibold ${tender.documentFee ? 'text-foreground' : 'text-green-600'}`}>
                        {tender.documentFee ? <>{tender.documentFee.toLocaleString()} <span className="saudi-riyal-symbol" /></> : t('marketplace.free')}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-10 gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="h-9 w-9 rounded-lg"
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) pageNum = i + 1;
              else if (page <= 4) pageNum = i + 1;
              else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = page - 3 + i;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setPage(pageNum)}
                  className={`h-9 w-9 rounded-lg text-sm ${page === pageNum ? 'bg-[#FE3C01] hover:bg-[#E83501] text-white' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-9 w-9 rounded-lg"
            >
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </main>

      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BidLogo size={20} className="opacity-60" />
              <span className="text-sm text-gray-400">
                {t('marketplace.copyright')}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href={isSubdomain ? "/" : "/"} className="hover:text-muted-foreground transition-colors">
                {t('marketplace.home')}
              </Link>
              <Link href={marketplaceHome} className="hover:text-muted-foreground transition-colors">
                {t('marketplace.title')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
