import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, Clock, Calendar, FileText, Building2, Tag, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, TrendingUp, Award, Send, Filter, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { VENDOR_CATEGORIES } from "@shared/schema";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";

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

interface MarketplaceStats {
  activeTenders: number;
  awardedTenders: number;
  totalOffers: number;
}

const TENDER_TYPE_COLORS: Record<string, string> = {
  open_tender: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  direct_purchase: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  framework_agreement: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function CountdownTimer({ deadline, t }: { deadline: string; t: (key: string) => string }) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return (
      <span className="text-red-600 dark:text-red-400 font-medium text-sm">
        {t('marketplace.deadlinePassed')}
      </span>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">
      {days > 0 ? `${days}${t('marketplace.days')}` : ''}{days > 0 && hours > 0 ? ' ' : ''}{hours > 0 ? `${hours}${t('marketplace.hours')}` : ''} {t('marketplace.remaining')}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { t, language, isRtl } = useI18n();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [tenderType, setTenderType] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [showFilters, setShowFilters] = useState(false);

  const tenderTypeLabels: Record<string, string> = {
    open_tender: t('marketplace.openTender'),
    direct_purchase: t('marketplace.directPurchase'),
    framework_agreement: t('marketplace.frameworkAgreement'),
  };

  const { data: statsData } = useQuery<MarketplaceStats>({
    queryKey: ["/api/marketplace/stats"],
  });

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
  const stats = statsData || { activeTenders: 0, awardedTenders: 0, totalOffers: 0 };

  const hasActiveFilters = category || city || tenderType;

  const clearFilters = () => {
    setCategory("");
    setCity("");
    setTenderType("");
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoPath} alt="Bid" className="h-8 object-contain" />
            </Link>
            <nav className="flex items-center gap-3">
              <Link href="/marketplace">
                <span className="text-sm font-medium text-[#E8614D]">
                  {t('marketplace.title')}
                </span>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {t('marketplace.login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-[#E8614D] hover:bg-[#d4553f] text-white">
                  {t('marketplace.getStarted')}
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('marketplace.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('marketplace.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={TrendingUp} value={stats.activeTenders} label={t('marketplace.activeTenders')} color="bg-[#E8614D]" />
          <StatCard icon={Award} value={stats.awardedTenders} label={t('marketplace.awardedTenders')} color="bg-emerald-500" />
          <StatCard icon={Send} value={stats.totalOffers} label={t('marketplace.submittedOffers')} color="bg-blue-500" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('marketplace.searchPlaceholder')}
                className={`${isRtl ? 'pr-10' : 'pl-10'}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={hasActiveFilters ? 'border-[#E8614D] text-[#E8614D]' : ''}
              >
                <Filter className="h-4 w-4 mr-1" />
                {t('marketplace.filters')}
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 bg-[#E8614D]/10 text-[#E8614D] text-xs px-1.5">
                    {[category, city, tenderType].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="18">18</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="sm:w-[200px]">
                  <SelectValue placeholder={t('marketplace.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('marketplace.allCategories')}</SelectItem>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tenderType} onValueChange={(v) => { setTenderType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="sm:w-[200px]">
                  <SelectValue placeholder={t('marketplace.tenderType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('marketplace.allTypes')}</SelectItem>
                  <SelectItem value="open_tender">{t('marketplace.openTender')}</SelectItem>
                  <SelectItem value="direct_purchase">{t('marketplace.directPurchase')}</SelectItem>
                  <SelectItem value="framework_agreement">{t('marketplace.frameworkAgreement')}</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                  <X className="h-4 w-4 mr-1" />
                  {t('marketplace.clearFilters')}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('marketplace.showingResults')
              .replace('{start}', String(Math.min((page - 1) * perPage + 1, total)))
              .replace('{end}', String(Math.min(page * perPage, total)))
              .replace('{total}', String(total))
            }
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#E8614D]" />
          </div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">
              {t('marketplace.noTenders')}
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t('marketplace.checkBackLater')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tenders.map((tender) => (
              <Link key={tender.id} href={`/invite/${tender.invitationToken}`}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 dark:border-gray-800 hover:border-[#E8614D]/30 group h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400">
                        {formatDate(tender.createdAt)}
                      </span>
                      {tender.tenderType && (
                        <Badge className={`text-xs font-medium ${TENDER_TYPE_COLORS[tender.tenderType] || 'bg-gray-100 text-gray-800'}`}>
                          {tenderTypeLabels[tender.tenderType] || tender.tenderType}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-[#E8614D] transition-colors line-clamp-2 mb-2">
                      {tender.title}
                    </h3>

                    <div className={`flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {tender.profile?.displayName || tender.company.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      {tender.category && (
                        <div className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Tag className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{tender.category}</span>
                        </div>
                      )}
                      {tender.company.city && (
                        <div className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{tender.company.city}</span>
                        </div>
                      )}
                      {tender.referenceNumber && (
                        <div className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-mono text-[11px]">{tender.referenceNumber}</span>
                        </div>
                      )}
                      {tender.inquiryDeadline && (
                        <div className={`flex items-center gap-1.5 text-gray-500 dark:text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('marketplace.inquiry')} {formatDate(tender.inquiryDeadline)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Clock className="h-4 w-4 text-amber-500" />
                        <CountdownTimer deadline={tender.deadline} t={t} />
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                        tender.documentFee
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {tender.documentFee
                          ? `${tender.documentFee.toLocaleString()} ${t('marketplace.sar')}`
                          : t('marketplace.free')
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8">
              {isRtl ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8">
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 ${page === pageNum ? 'bg-[#E8614D] hover:bg-[#d4553f] text-white' : ''}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8">
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8">
              {isRtl ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoPath} alt="Bid" className="h-6 object-contain" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('marketplace.copyright')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('marketplace.home')}
              </Link>
              <Link href="/marketplace" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('marketplace.title')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
