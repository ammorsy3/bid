import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, FileText, MapPin, ChevronLeft, ChevronRight, Loader2, Eye, Share2, Printer, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { isMarketplaceSubdomain } from "@/lib/subdomain";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import heroBg from "@assets/image_1775799187200.png";

interface MarketplaceTender {
  id: string;
  title: string;
  description: string;
  category: string | null;
  deadline: string;
  budget: string | null;
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

function getDaysRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { days: 0, expired: true };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { days, expired: false };
}

export default function Marketplace() {
  const { t, language, isRtl } = useI18n();
  const [, setLocation] = useLocation();
  const isSubdomain = isMarketplaceSubdomain();
  const marketplaceHome = isSubdomain ? "/" : "/marketplace";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [tenderType, setTenderType] = useState("");
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
    queryKey: ["/api/marketplace/tenders", search, category, city, tenderType, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (tenderType) params.set("tenderType", tenderType);
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href={marketplaceHome} className="flex items-center gap-2">
                <img src={logoPath} alt="Bid" className="h-8 object-contain" />
              </Link>
              <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
                <Link href={marketplaceHome}>
                  <span className="text-[#E8614D] font-semibold">
                    {t('marketplace.title')}
                  </span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('marketplace.login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-[#E8614D] hover:bg-[#d4553f] text-white text-sm px-5 rounded">
                  {t('marketplace.getStarted')}
                </Button>
              </Link>
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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {t('marketplace.title')}
          </h1>
        </div>
      </section>


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          {t('marketplace.latestOpportunities')}
        </h2>

        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              aria-expanded={showCategoryDropdown}
              aria-haspopup="listbox"
              className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white hover:border-gray-400 transition-colors"
            >
              {category || t('marketplace.category')}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            {showCategoryDropdown && (
              <div role="listbox" className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[200px] max-h-60 overflow-y-auto ${isRtl ? 'right-0' : 'left-0'}`}>
                <button
                  role="option"
                  aria-selected={!category}
                  onClick={() => { setCategory(""); setShowCategoryDropdown(false); setPage(1); }}
                  className={`block w-full text-start px-4 py-2 text-sm hover:bg-gray-50 ${!category ? 'text-[#E8614D] font-medium' : 'text-gray-700'}`}
                >
                  {t('marketplace.allCategories')}
                </button>
                {VENDOR_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    role="option"
                    aria-selected={category === cat}
                    onClick={() => { setCategory(cat); setShowCategoryDropdown(false); setPage(1); }}
                    className={`block w-full text-start px-4 py-2 text-sm hover:bg-gray-50 ${category === cat ? 'text-[#E8614D] font-medium' : 'text-gray-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Select value={city} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-10 text-sm bg-white border-gray-300">
                <SelectValue placeholder={t('marketplace.city')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marketplace.allCities')}</SelectItem>
                {SAUDI_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('marketplace.searchPlaceholder')}
                className={`w-48 sm:w-64 h-10 text-sm bg-white border-gray-300 rounded-lg ${isRtl ? 'pr-10' : 'pl-10'}`}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#E8614D]" />
          </div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-500">{t('marketplace.noTenders')}</h3>
            <p className="text-sm text-gray-400 mt-2">{t('marketplace.checkBackLater')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tenders.map((tender) => {
              const { days, expired } = getDaysRemaining(tender.deadline);
              const hash = tender.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
              const viewCount = (hash % 180) + 15;
              return (
                <a
                  key={tender.id}
                  href={`/invite/${tender.invitationToken}`}
                  className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group flex flex-col no-underline"
                  onClick={(e) => { e.preventDefault(); setLocation(`/invite/${tender.invitationToken}`); }}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="flex items-center gap-1 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          {viewCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Share"
                          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          onClick={(e) => e.preventDefault()}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        >
                          <Share2 className="h-4 w-4" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Print"
                          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          onClick={(e) => e.preventDefault()}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        >
                          <Printer className="h-4 w-4" />
                        </span>
                        <Badge className="bg-[#E8614D] text-white border-0 text-[11px] font-medium px-2.5 py-0.5 rounded">
                          {t('marketplace.available')}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 group-hover:text-[#E8614D] transition-colors leading-snug mb-3 line-clamp-2">
                      {tender.title}
                    </h3>

                    {tender.category && (
                      <p className="text-sm text-gray-500 mb-1.5 line-clamp-1">
                        {tender.category}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span>{tender.company.city || "—"}</span>
                    </div>

                    {tender.tenderType && (
                      <p className="text-xs text-gray-400 mt-1">
                        {tender.tenderType === 'open_tender' ? t('marketplace.openTender') :
                         tender.tenderType === 'direct_purchase' ? t('marketplace.directPurchase') :
                         t('marketplace.frameworkAgreement')}
                      </p>
                    )}
                  </div>

                  <div className={`border-t border-gray-100 px-5 py-4 flex items-center justify-center gap-2 ${expired ? 'bg-red-50' : 'bg-[#E8614D]/5'}`}>
                    <span className={`text-2xl font-bold ${expired ? 'text-red-500' : 'text-[#E8614D]'}`}>
                      {expired ? 0 : days}
                    </span>
                    <span className={`text-sm ${expired ? 'text-red-400' : 'text-[#E8614D]/70'}`}>
                      {expired ? t('marketplace.deadlinePassed') : t('marketplace.daysRemaining')}
                    </span>
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
                  className={`h-9 w-9 rounded-lg text-sm ${page === pageNum ? 'bg-[#E8614D] hover:bg-[#d4553f] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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

      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoPath} alt="Bid" className="h-6 object-contain opacity-60" />
              <span className="text-sm text-gray-400">
                {t('marketplace.copyright')}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href={isSubdomain ? "/" : "/"} className="hover:text-gray-700 transition-colors">
                {t('marketplace.home')}
              </Link>
              <Link href={marketplaceHome} className="hover:text-gray-700 transition-colors">
                {t('marketplace.title')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
