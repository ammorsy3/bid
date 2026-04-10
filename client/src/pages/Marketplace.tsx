import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, Clock, Calendar, FileText, Building2, Tag, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, TrendingUp, Award, Send, Filter, X, ExternalLink, Hash } from "lucide-react";
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

const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
  "Tabuk", "Abha", "Taif", "Hail", "Jubail", "Yanbu", "Najran", "Jazan",
  "Al Kharj", "Buraydah", "Khamis Mushait", "Al Hofuf", "Sakaka"
];

function getDaysAndHours(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours, expired: false };
}

export default function Marketplace() {
  const { t, language, isRtl } = useI18n();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [tenderType, setTenderType] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
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
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  };

  return (
    <div className={`min-h-screen bg-[#f5f5f5] ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoPath} alt="Bid" className="h-8 object-contain" />
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <Link href="/marketplace">
                <span className="text-[#E8614D] border-b-2 border-[#E8614D] pb-3.5 pt-4 inline-block">
                  {t('marketplace.title')}
                </span>
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="text-xs border-[#E8614D] text-[#E8614D] hover:bg-[#E8614D]/5">
                  {t('marketplace.login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-[#E8614D] hover:bg-[#d4553f] text-white text-xs">
                  {t('marketplace.getStarted')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`relative ${isRtl ? 'pr-0' : 'pl-0'}`}>
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('marketplace.searchPlaceholder')}
                className={`w-48 sm:w-64 h-9 text-sm bg-white border-gray-300 ${isRtl ? 'pr-9' : 'pl-9'}`}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 text-xs ${hasActiveFilters ? 'border-[#E8614D] text-[#E8614D]' : 'border-gray-300'}`}
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              {t('marketplace.filters')}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 bg-[#E8614D]/10 text-[#E8614D] text-[10px] px-1.5 h-4">
                  {[category, city, tenderType].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
            <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder={t('marketplace.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marketplace.allCategories')}</SelectItem>
                {VENDOR_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder={t('marketplace.city')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marketplace.allCities')}</SelectItem>
                {SAUDI_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tenderType} onValueChange={(v) => { setTenderType(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
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
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 text-xs h-9">
                <X className="h-3.5 w-3.5 mr-1" />
                {t('marketplace.clearFilters')}
              </Button>
            )}
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-6">
          {t('marketplace.title')}
        </h1>

        <div className="bg-[#E8614D]/5 border border-[#E8614D]/15 rounded-xl p-4 sm:p-5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-full bg-[#E8614D]/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-[#E8614D]" />
              </div>
              <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.activeTenders.toLocaleString()}</div>
                <div className="text-xs text-gray-500">{t('marketplace.activeTenders')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center border-y sm:border-y-0 sm:border-x border-[#E8614D]/10 py-3 sm:py-0 sm:px-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.awardedTenders.toLocaleString()}</div>
                <div className="text-xs text-gray-500">{t('marketplace.awardedTenders')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-center sm:justify-end">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalOffers.toLocaleString()}</div>
                <div className="text-xs text-gray-500">{t('marketplace.submittedOffers')}</div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#E8614D]" />
          </div>
        ) : tenders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-20">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">
              {t('marketplace.noTenders')}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {t('marketplace.checkBackLater')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.map((tender) => {
              const { days, hours, expired } = getDaysAndHours(tender.deadline);
              return (
                <div
                  key={tender.id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-[#E8614D]/30 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                  onClick={() => setLocation(`/invite/${tender.invitationToken}`)}
                >
                  <div className="flex">
                    <div className={`flex flex-col items-center justify-center w-20 sm:w-28 flex-shrink-0 py-5 ${expired ? 'bg-red-50' : 'bg-[#E8614D]/5'} border-${isRtl ? 'l' : 'r'} border-gray-100`}>
                      <span className={`text-3xl sm:text-4xl font-bold ${expired ? 'text-red-500' : 'text-[#E8614D]'}`}>
                        {expired ? 0 : days}
                      </span>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        {expired
                          ? (t('marketplace.deadlinePassed'))
                          : `${days > 0 ? t('marketplace.days') : ''} ${hours > 0 ? `${hours}${t('marketplace.hours')}` : ''}`
                        }
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-[11px] text-gray-400">{formatDate(tender.createdAt)}</span>
                            {tender.tenderType && (
                              <Badge className="text-[10px] font-medium bg-[#E8614D]/10 text-[#E8614D] border-0 px-2 py-0.5">
                                {tenderTypeLabels[tender.tenderType] || tender.tenderType}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#E8614D] transition-colors line-clamp-2 leading-snug">
                            {tender.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{tender.profile?.displayName || tender.company.name}</span>
                            {tender.company.city && (
                              <>
                                <span className="text-gray-300">-</span>
                                <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span>{tender.company.city}</span>
                              </>
                            )}
                          </div>
                          {tender.category && (
                            <div className="mt-2">
                              <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 font-normal">
                                <Tag className="h-2.5 w-2.5 mr-0.5" />
                                {tender.category}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-[#E8614D] font-medium group-hover:underline flex-shrink-0 hidden sm:inline-flex items-center gap-1 pt-1">
                          {t('marketplace.viewDetails') || 'Details'}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                          {tender.referenceNumber && (
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="text-[10px] text-gray-400 leading-none">{t('marketplace.refNumber') || 'Ref #'}</div>
                                <div className="text-xs font-mono font-medium text-gray-700 mt-0.5">{tender.referenceNumber}</div>
                              </div>
                            </div>
                          )}
                          {tender.inquiryDeadline && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <div>
                                <div className="text-[10px] text-gray-400 leading-none">{t('marketplace.inquiryDeadlineLabel') || 'Inquiry Deadline'}</div>
                                <div className="text-xs font-medium text-gray-700 mt-0.5">{formatDate(tender.inquiryDeadline)}</div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <div>
                              <div className="text-[10px] text-gray-400 leading-none">{t('marketplace.submissionDeadline') || 'Submission Deadline'}</div>
                              <div className="text-xs font-medium text-gray-700 mt-0.5">{formatDate(tender.deadline)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <div>
                              <div className="text-[10px] text-gray-400 leading-none">{t('marketplace.docFee')}</div>
                              <div className={`text-xs font-bold mt-0.5 ${tender.documentFee ? 'text-[#E8614D]' : 'text-emerald-600'}`}>
                                {tender.documentFee
                                  ? `${tender.documentFee.toLocaleString()} ${t('marketplace.sar')}`
                                  : t('marketplace.free')
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 0 && (
          <div className="flex items-center justify-between mt-6 bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              {t('marketplace.showingResults')
                .replace('{start}', String(Math.min((page - 1) * perPage + 1, total)))
                .replace('{end}', String(Math.min(page * perPage, total)))
                .replace('{total}', String(total))
              }
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(1)} className="h-7 w-7">
                  {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7">
                  {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(pageNum)}
                      className={`h-7 w-7 text-xs ${page === pageNum ? 'bg-[#E8614D] hover:bg-[#d4553f] text-white' : ''}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 w-7">
                  {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-7 w-7">
                  {isRtl ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={logoPath} alt="Bid" className="h-5 object-contain opacity-60" />
              <span className="text-xs text-gray-400">
                {t('marketplace.copyright')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <Link href="/" className="hover:text-gray-700 transition-colors">
                {t('marketplace.home')}
              </Link>
              <Link href="/marketplace" className="hover:text-gray-700 transition-colors">
                {t('marketplace.title')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
