import { useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Building2, MapPin, Briefcase, ShieldCheck, Globe, Linkedin, Twitter,
  FileText, ArrowLeft, AlertCircle, Clock, CheckCircle2, ExternalLink, Users,
  Award, Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { categoryLabel, cityLabel } from "@/lib/category-labels";
import { isolateAuto, isolateLtr, withLtrUrls } from "@/lib/bidi";
import { StatusBadge } from "@/components/brand/StatusDot";
import { verificationStatusToState } from "@/components/brand/statusMap";
import IndividualProfilePage from "@/pages/IndividualProfilePage";

interface CompanyStats {
  yearsInBusiness?: number;
  projectsCompleted?: number;
  clientsServed?: number;
  repeatClientPct?: number;
  citiesCovered?: number;
  teamSize?: number;
}

type StatField = { key: keyof CompanyStats; labelKey: string; suffix?: string };

const STAT_FIELD_DEFS: StatField[] = [
  { key: 'yearsInBusiness', labelKey: 'statYearsInBusiness' },
  { key: 'projectsCompleted', labelKey: 'statProjectsCompleted' },
  { key: 'clientsServed', labelKey: 'statClientsServed' },
  { key: 'repeatClientPct', labelKey: 'statRepeatClients', suffix: '%' },
  { key: 'citiesCovered', labelKey: 'statCitiesCovered' },
  { key: 'teamSize', labelKey: 'statTeamSize' },
];

interface CertificationItem {
  name: string;
  issuer?: string;
  expiryDate?: string;
  documentUrl?: string;
  documentName?: string;
}

type InsuranceType = 'general_liability' | 'professional_indemnity' | 'workers_compensation' | 'public_liability' | 'cyber' | 'other';

interface InsurancePolicyItem {
  type: InsuranceType;
  provider: string;
  coverageAmount?: number;
  currency?: string;
  expiryDate?: string;
  documentUrl?: string;
  documentName?: string;
}

const INSURANCE_TYPE_KEYS: Record<InsuranceType, string> = {
  general_liability: 'insTypeGeneralLiability',
  professional_indemnity: 'insTypeProfessionalIndemnity',
  workers_compensation: 'insTypeWorkersCompensation',
  public_liability: 'insTypePublicLiability',
  cyber: 'insTypeCyber',
  other: 'insTypeOther',
};

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return false;
  return exp.getTime() < Date.now();
}

function parseVideoEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const yt = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface CompanyProfileData {
  company: {
    id: string;
    name: string;
    slug: string;
    legalName: string;
    category: string | null;
    city: string | null;
    accountType: 'company' | 'team' | 'individual';
    verificationStatus: string;
    certifications: string[];
    crNumber: string;
    vatNumber: string | null;
    createdAt: string;
    verifiedAt: string | null;
    verifiedDocuments: string[];
  };
  profile: {
    displayName: string;
    bio: string | null;
    tags: string[];
    logoUrl: string | null;
    headerUrl: string | null;
    brochureUrl: string | null;
    companySize: string | null;
    yearFounded: number | null;
    serviceAreas: string[] | null;
    languages: string[] | null;
    industriesServed: string[] | null;
    availabilityStatus: 'accepting' | 'limited' | 'booked' | null;
    availabilityNote: string | null;
    portfolio: { title: string; description?: string; imageUrl?: string; images?: { url: string; caption?: string }[] }[];
    socialLinks: { website?: string; linkedin?: string; twitter?: string } | null;
    introVideoUrl: string | null;
    stats: CompanyStats | null;
    certifications: CertificationItem[] | null;
    insurancePolicies: InsurancePolicyItem[] | null;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════

const COMPANY_SIZE_KEYS: Record<string, string> = {
  '1-10': 'sizeLabel110',
  '11-50': 'sizeLabel1150',
  '51-200': 'sizeLabel51200',
  '201-500': 'sizeLabel201500',
  '500+': 'sizeLabelOver500',
};

function formatMemberSince(iso: string | null | undefined, isRtl: boolean): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // Arabic gets Gregorian month names with Western digits (the app's rule).
  return d.toLocaleDateString(isRtl ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US', { month: 'short', year: 'numeric' });
}

// The server sends these four labels in English; map them to translated text.
const VERIFIED_DOC_KEYS: Record<string, string> = {
  'Commercial Registration': 'docCommercialRegistration',
  'VAT Certificate': 'docVatCertificate',
  'GOSI Certificate': 'docGosiCertificate',
  'National Address': 'docNationalAddress',
};

function yearsLabel(t: (key: string, vars?: Record<string, string | number>) => string, years: number, isRtl: boolean): string {
  if (years === 1) return t('companyProfile.factsYearsOne');
  if (isRtl && years === 2) return t('companyProfile.factsYearsTwo');
  if (isRtl && years >= 3 && years <= 10) return t('companyProfile.factsYearsFew', { count: years });
  return t('companyProfile.factsYearsMany', { count: years });
}

function VerificationBadge({ status }: { status: string }) {
  const { t, language } = useI18n();
  const isRtl = language === "ar";
  const labelKey =
    status === 'verified' ? 'companyProfile.badgeVerified'
    : status === 'under_review' ? 'companyProfile.badgeUnderReview'
    : status === 'rejected' ? 'companyProfile.badgeNotVerified'
    : 'companyProfile.badgeNotVerified';
  return (
    <StatusBadge
      state={verificationStatusToState(status)}
      label={t(labelKey)}
    />
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-dvh bg-muted">
      <nav className="sticky top-0 z-20 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
        <Skeleton className="h-5 w-24" />
      </nav>
      <Skeleton className="w-full h-52 md:h-64" />
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════

export default function CompanyProfilePage() {
  const [, setLocation] = useLocation();
  const [matchedCompanyRoute, companyParams] = useRoute("/company/:slug");
  const [matchedIndividualRoute, individualParams] = useRoute("/people/:slug");
  const slug = companyParams?.slug ?? individualParams?.slug;
  const { t, language } = useI18n();
  const isRtl = language === "ar";

  const { data, isLoading, error } = useQuery<CompanyProfileData>({
    queryKey: ['/api/companies/by-slug', slug, 'profile'],
    queryFn: () => apiRequest('GET', `/api/companies/by-slug/${slug}/profile`).then(r => r.json()),
    enabled: !!slug,
  });

  // Individuals live at /people/:slug (not /company/:slug — they aren't companies).
  // Canonicalize either direction so old/shared links keep working.
  useEffect(() => {
    if (!data || !slug) return;
    const isIndividual = data.company.accountType === 'individual';
    if (isIndividual && matchedCompanyRoute) setLocation(`/people/${slug}`, { replace: true });
    else if (!isIndividual && matchedIndividualRoute) setLocation(`/company/${slug}`, { replace: true });
  }, [data, slug, matchedCompanyRoute, matchedIndividualRoute, setLocation]);

  if (isLoading) return <ProfileSkeleton />;

  // Individuals get a dedicated, minimal, social-style profile.
  if (data && data.company.accountType === 'individual') {
    return <IndividualProfilePage data={data as any} />;
  }

  if (error || !data) {
    // window.close() only works on a tab the app opened itself (window.opener).
    // On a shared link it does nothing, so only offer it when it can work.
    const canCloseTab = typeof window !== 'undefined' && !!window.opener;
    return (
      <div className="min-h-dvh bg-muted flex items-center justify-center px-6 py-10">
        <div className="text-center space-y-4 w-full max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t('companyProfile.notFound')}</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t('companyProfile.notFoundDesc')}
          </p>
          <div className="flex flex-col items-center gap-2 pt-2">
            <Link
              href="/marketplace"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-[#FE3C01] hover:bg-[#1A1613] px-6 min-h-11 text-sm font-semibold text-white transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97]"
              data-testid="link-company-not-found-marketplace"
            >
              {t('companyProfile.goToMarketplace')}
            </Link>
            {canCloseTab && (
              <button
                onClick={() => window.close()}
                className="inline-flex items-center justify-center min-h-11 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-70"
              >
                {t('companyProfile.closeTab')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { company, profile } = data;
  const displayName = profile?.displayName || company.name;
  // Arabic letters join, so the first two letters of an Arabic name read as a
  // word (the first two of "شركة" spell "شر", which means "evil"). Show one letter.
  const initials = /^[\u0600-\u06FF]/.test(displayName.trim())
    ? displayName.trim().charAt(0)
    : displayName.slice(0, 2).toUpperCase();
  const hasSocialLinks = profile?.socialLinks?.website || profile?.socialLinks?.linkedin || profile?.socialLinks?.twitter;
  const hasTags = profile?.tags && profile.tags.length > 0;
  const hasCertifications = company.certifications && company.certifications.length > 0;
  const hasPortfolio = profile?.portfolio && profile.portfolio.length > 0;
  const sizeLabelKey = profile?.companySize ? COMPANY_SIZE_KEYS[profile.companySize] : null;
  const sizeLabel = sizeLabelKey ? t(`companyProfile.${sizeLabelKey}`) : null;
  const serviceAreas = profile?.serviceAreas || [];
  const languages = profile?.languages || [];
  const industriesServed = profile?.industriesServed || [];
  const availabilityStatus = profile?.availabilityStatus || null;
  const availabilityNote = profile?.availabilityNote || null;
  const yearFounded = profile?.yearFounded;
  const yearsInBusiness = yearFounded ? Math.max(0, new Date().getFullYear() - yearFounded) : null;
  const hasReach = serviceAreas.length > 0 || languages.length > 0 || industriesServed.length > 0;
  const hasFactsStrip = yearFounded || sizeLabel || company.city;
  const stats = profile?.stats || {};
  const visibleStats = STAT_FIELD_DEFS.filter(f => {
    const v = stats[f.key];
    return v != null && (v as number) > 0;
  });
  const videoEmbed = parseVideoEmbed(profile?.introVideoUrl);
  const visibleCertifications = (profile?.certifications || []).filter(c => !isExpired(c.expiryDate));
  const visibleInsurance = (profile?.insurancePolicies || []).filter(p => !isExpired(p.expiryDate));
  const hasStructuredCredentials = visibleCertifications.length > 0 || visibleInsurance.length > 0;

  // The hero content is shared by the photo-header and gradient-header variants.
  // On phones it sits in normal flow so a long name makes the banner taller
  // instead of running off the top; from md up the layout is unchanged.
  const renderHeroContent = (wrapperClass: string) => (
    <div className={wrapperClass}>
      <div className="flex items-end gap-4">
        {profile?.logoUrl ? (
          <img src={profile.logoUrl} alt={displayName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-lg flex-shrink-0 bg-card" />
        ) : (
          <div className="w-16 h-16 rounded-2xl border-2 border-white/80 shadow-lg flex-shrink-0 bg-card flex items-center justify-center text-xl font-extrabold text-muted-foreground">{initials}</div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-black text-xl md:text-2xl text-white tracking-[-0.03em] drop-shadow break-words"><bdi>{displayName}</bdi></h1>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            {/* The badge colours are made for a light page; on the dark banner they need their own light chip on phones. */}
            <span className="inline-flex rounded-full bg-card max-md:p-0.5 md:bg-transparent"><VerificationBadge status={company.verificationStatus} /></span>
            {company.category && (
              <span className="flex items-center gap-1 text-xs text-white/80 font-medium"><Briefcase className="h-3 w-3 flex-shrink-0" />{categoryLabel(company.category, isRtl)}</span>
            )}
            {company.city && (
              <span className="flex items-center gap-1 text-xs text-white/80 font-medium"><MapPin className="h-3 w-3 flex-shrink-0" />{cityLabel(company.city, isRtl)}</span>
            )}
            {sizeLabel && (
              <span className="flex items-center gap-1 text-xs text-white/80 font-medium"><Users className="h-3 w-3 flex-shrink-0" />{sizeLabel}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-muted">
      {/* ══════════════════════ TOP NAV ══════════════════════ */}
      <nav className="sticky top-0 z-20 bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/marketplace')}
            aria-label={t('companyProfile.navBack')}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-70 max-sm:h-11 max-sm:w-11 max-sm:-my-3 max-sm:-ms-3"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            <span className="hidden sm:inline">{t('companyProfile.navBack')}</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">
            {company.accountType === 'individual'
              ? t('companyProfile.navTitleIndividual')
              : company.accountType === 'team'
                ? t('companyProfile.navTitleTeam')
                : t('companyProfile.navTitle')}
          </span>
        </div>
      </nav>

      {/* ══════════════════════ HERO HEADER ══════════════════════ */}
      {profile?.headerUrl ? (
        <div className="w-full relative max-md:flex max-md:items-end max-md:min-h-52">
          <img src={profile.headerUrl} alt="" className="w-full h-auto block max-md:absolute max-md:inset-0 max-md:h-full max-md:object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {renderHeroContent("relative w-full max-w-[900px] mx-auto px-4 sm:px-6 pb-5 pt-6 md:pt-0 md:absolute md:bottom-0 md:inset-x-0")}
        </div>
      ) : (
        <div className="min-h-52 md:min-h-64 w-full relative flex items-end" style={{ background: 'linear-gradient(135deg, #1A1613 0%, #3A1B12 50%, #C23000 100%)' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {renderHeroContent("relative w-full max-w-[900px] mx-auto px-4 sm:px-6 pb-5 pt-6")}
        </div>
      )}

      {/* ══════════════════════ AVAILABILITY BADGE ══════════════════════ */}
      {availabilityStatus && (
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-6">
          <div className={`rounded-2xl px-5 py-3 flex items-center gap-3 border ${
            availabilityStatus === 'accepting'
              ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
              : availabilityStatus === 'limited'
                ? 'bg-amber-50/60 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                : 'bg-muted border-border'
          }`}>
            <span className={`relative flex h-2.5 w-2.5 flex-shrink-0`}>
              {availabilityStatus === 'accepting' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                availabilityStatus === 'accepting' ? 'bg-[var(--state-won)]'
                : availabilityStatus === 'limited' ? 'bg-amber-500'
                : 'bg-gray-400'
              }`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold ${
                availabilityStatus === 'accepting' ? 'text-emerald-800 dark:text-emerald-300'
                : availabilityStatus === 'limited' ? 'text-amber-800 dark:text-amber-300'
                : 'text-muted-foreground'
              }`}>
                {availabilityStatus === 'accepting' ? t('companyProfile.availabilityAccepting')
                  : availabilityStatus === 'limited' ? t('companyProfile.availabilityLimited')
                  : t('companyProfile.availabilityBooked')}
              </p>
              {availabilityNote && (
                <p dir="auto" className={`text-[11px] rtl:max-md:text-xs mt-0.5 break-words ${
                  availabilityStatus === 'accepting' ? 'text-[var(--state-won)]/80'
                  : availabilityStatus === 'limited' ? 'text-amber-700 dark:text-amber-300/80'
                  : 'text-muted-foreground'
                }`}>{availabilityNote}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ FACTS STRIP ══════════════════════ */}
      {hasFactsStrip && (
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-6">
          <div className="bg-card rounded-2xl border border-border px-5 py-4 flex flex-wrap gap-x-8 gap-y-3">
            {yearFounded && (
              <div>
                <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-0.5">{t('companyProfile.factsFoundedLabel')}</p>
                <p className="text-sm font-bold text-foreground">
                  {yearFounded}
                  {yearsInBusiness !== null && yearsInBusiness > 0 && (
                    <span className="text-[11px] rtl:max-md:text-xs font-medium text-muted-foreground ms-1">· {yearsLabel(t, yearsInBusiness, isRtl)}</span>
                  )}
                </p>
              </div>
            )}
            {sizeLabel && (
              <div>
                <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-0.5">{t('companyProfile.factsTeamLabel')}</p>
                <p className="text-sm font-bold text-foreground">{sizeLabel}</p>
              </div>
            )}
            {company.city && (
              <div>
                <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-0.5">{t('companyProfile.factsHqLabel')}</p>
                <p className="text-sm font-bold text-foreground">{cityLabel(company.city, isRtl)}</p>
              </div>
            )}
            {company.category && (
              <div>
                <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-0.5">{t('companyProfile.factsCategoryLabel')}</p>
                <p className="text-sm font-bold text-foreground">{categoryLabel(company.category, isRtl)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════ TRACK RECORD ══════════════════════ */}
      {visibleStats.length > 0 && (
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 pt-6">
          <div className="bg-card rounded-2xl border border-border px-6 py-5">
            <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-4">
              {t('companyProfile.sectionTrackRecord')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              {visibleStats.map(({ key, labelKey, suffix }) => (
                <div key={key}>
                  <p className="text-2xl md:text-3xl font-extrabold text-foreground tracking-[-0.02em]">
                    {(stats[key] as number).toLocaleString('en-US')}{suffix || ''}
                  </p>
                  <p className="text-[11px] rtl:max-md:text-xs font-medium text-muted-foreground mt-0.5">{t(`companyProfile.${labelKey}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ MAIN CONTENT ══════════════════════ */}
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6 order-2 md:order-1">

            {/* Verified Credentials */}
            {company.verifiedDocuments && company.verifiedDocuments.length > 0 && (
              <div className="bg-emerald-50/40 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--state-won)]" />
                    <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-emerald-800 dark:text-emerald-300">
                      {t('companyProfile.sectionVerifiedCredentials')}
                    </h2>
                  </div>
                  {formatMemberSince(company.verifiedAt, isRtl) && (
                    <span className="text-[10px] rtl:max-md:text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {t('companyProfile.verifiedSince', { date: formatMemberSince(company.verifiedAt, isRtl)! })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-3 leading-relaxed">
                  {t('companyProfile.verifiedByNote')}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {company.verifiedDocuments.map((doc) => (
                    <span
                      key={doc}
                      className="inline-flex items-center gap-1.5 max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-3 py-1 bg-card text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      <bdi>{VERIFIED_DOC_KEYS[doc] ? t(`companyProfile.${VERIFIED_DOC_KEYS[doc]}`) : doc}</bdi>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                {t('companyProfile.sectionAbout')}
              </h2>
              <p dir="auto" className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                {profile?.bio ? withLtrUrls(profile.bio) : t('companyProfile.noAbout')}
              </p>
            </div>

            {/* Intro Video */}
            {videoEmbed && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                  {t('companyProfile.sectionIntroVideo')}
                </h2>
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={videoEmbed}
                    title="Company intro video"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Capabilities / Tags */}
            {hasTags && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                  {t('companyProfile.sectionCapabilities')}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {profile!.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-3 py-1 bg-muted text-muted-foreground border border-border"
                    >
                      <bdi>{tag}</bdi>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Markets & Reach */}
            {hasReach && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {t('companyProfile.sectionMarketsReach')}
                </h2>
                {industriesServed.length > 0 && (
                  <div>
                    <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('companyProfile.industriesServedLabel')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {industriesServed.map((ind, i) => (
                        <span key={i} className="max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-3 py-1 bg-orange-50 dark:bg-orange-950/40 text-[var(--bid-orange)] border border-orange-100 dark:border-orange-900">
                          <bdi>{ind}</bdi>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {serviceAreas.length > 0 && (
                  <div>
                    <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('companyProfile.serviceAreasLabel')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {serviceAreas.map((area, i) => (
                        <span key={i} className="inline-flex items-center gap-1 max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-3 py-1 bg-muted text-muted-foreground border border-border">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <bdi>{area}</bdi>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {languages.length > 0 && (
                  <div>
                    <p className="text-[10px] rtl:max-md:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('companyProfile.languagesLabel')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {languages.map((lang, i) => (
                        <span key={i} className="max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-3 py-1 bg-muted text-muted-foreground border border-border">
                          <bdi>{lang}</bdi>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Structured Credentials (certifications + insurance) */}
            {hasStructuredCredentials && (
              <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {t('companyProfile.sectionCredentials')}
                </h2>

                {visibleCertifications.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-3.5 w-3.5 text-[var(--state-won)]" />
                      <p className="text-[11px] rtl:max-md:text-xs font-bold uppercase tracking-wider text-[var(--state-won)]">{t('companyProfile.subsectionCertifications')}</p>
                    </div>
                    <div className="space-y-2">
                      {visibleCertifications.map((cert, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/40">
                          <CheckCircle2 className="h-4 w-4 text-[var(--state-won)] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p dir="auto" className="text-sm font-bold text-foreground break-words">{cert.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {cert.issuer && (
                                <span className="text-[11px] rtl:max-md:text-xs text-muted-foreground">{t('companyProfile.certIssuedBy', { issuer: isolateAuto(cert.issuer) })}</span>
                              )}
                              {cert.expiryDate && (
                                <span className="text-[11px] rtl:max-md:text-xs text-muted-foreground">{t('companyProfile.certValidUntil', { date: isolateLtr(cert.expiryDate) })}</span>
                              )}
                            </div>
                          </div>
                          {cert.documentUrl && (
                            <a
                              href={cert.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] max-md:text-xs font-bold text-[var(--state-won)] bg-card border border-emerald-200 dark:border-emerald-800 rounded-full px-2 max-md:px-3 py-1 max-md:min-h-11 hover:bg-[var(--state-won)]/5 transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-80 flex-shrink-0"
                            >
                              <ShieldCheck className="h-3 w-3" /> {t('companyProfile.certDocument')}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {visibleInsurance.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-3.5 w-3.5 text-[var(--bid-orange)]" />
                      <p className="text-[11px] rtl:max-md:text-xs font-bold uppercase tracking-wider text-[var(--bid-orange)]">{t('companyProfile.subsectionInsurance')}</p>
                    </div>
                    <div className="space-y-2">
                      {visibleInsurance.map((pol, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-orange-100 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/40">
                          <CheckCircle2 className="h-4 w-4 text-[var(--bid-orange)] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground">{t(`companyProfile.${INSURANCE_TYPE_KEYS[pol.type]}`)}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-[11px] rtl:max-md:text-xs text-muted-foreground break-words"><bdi>{pol.provider}</bdi></span>
                              {pol.coverageAmount && (
                                <span className="text-[11px] rtl:max-md:text-xs text-muted-foreground">· <bdi dir="ltr">{pol.coverageAmount.toLocaleString('en-US')} {pol.currency || ''}</bdi></span>
                              )}
                              {pol.expiryDate && (
                                <span className="text-[11px] rtl:max-md:text-xs text-muted-foreground">{t('companyProfile.certValidUntil', { date: isolateLtr(pol.expiryDate) })}</span>
                              )}
                            </div>
                          </div>
                          {pol.documentUrl && (
                            <a
                              href={pol.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] max-md:text-xs font-bold text-[var(--bid-orange)] bg-card border border-[var(--bid-orange)]/20 rounded-full px-2 max-md:px-3 py-1 max-md:min-h-11 hover:bg-[var(--bid-orange)]/5 transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-80 flex-shrink-0"
                            >
                              <ShieldCheck className="h-3 w-3" /> {t('companyProfile.certDocument')}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Certifications (legacy plain list — only shown if no structured credentials exist) */}
            {!hasStructuredCredentials && hasCertifications && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                  {t('companyProfile.sectionCertifications')}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {company.certifications.map((cert, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-3 py-1 bg-[var(--state-won)]/5 text-[var(--state-won)] border border-emerald-100 dark:border-emerald-800"
                    >
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      <bdi>{cert}</bdi>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {hasPortfolio && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-4">
                  {company.accountType === 'individual' || company.accountType === 'team'
                    ? t('companyProfile.sectionPreviousWorks')
                    : t('companyProfile.sectionPortfolio')}
                </h2>
                <div className="space-y-5">
                  {profile!.portfolio.map((project, i) => {
                    const images = project.images ?? (project.imageUrl ? [{ url: project.imageUrl }] : []);
                    return (
                      <div key={i} className="rounded-xl border border-border overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                          <p dir="auto" className="text-sm font-bold text-foreground break-words">{project.title}</p>
                          {project.description && (
                            <p dir="auto" className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-words">{project.description}</p>
                          )}
                        </div>
                        {images.length > 0 && (
                          <div className={`grid gap-2 p-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {images.map((img, j) => (
                              <div key={j}>
                                <img
                                  src={img.url}
                                  alt={img.caption || project.title}
                                  className="w-full h-44 object-cover rounded-lg"
                                />
                                {img.caption && (
                                  <p dir="auto" className="text-xs text-muted-foreground mt-1 px-1 break-words">{img.caption}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Company Brochure */}
            {profile?.brochureUrl && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                  {t('companyProfile.sectionBrochure')}
                </h2>
                <a
                  href={profile.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-sm:w-full max-sm:justify-center items-center gap-2 px-4 py-2.5 max-md:min-h-11 rounded-xl text-sm font-semibold text-muted-foreground bg-muted border border-border hover:border-border hover:bg-muted transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-80"
                >
                  <FileText className="h-4 w-4" />
                  {t('companyProfile.viewCompanyProfile')}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="md:sticky md:top-20 space-y-4 order-1 md:order-2">

            {/* Quick Info Card */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                {profile?.logoUrl ? (
                  <img src={profile.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="w-fit max-w-full text-sm font-bold text-foreground line-clamp-2 break-words">{displayName}</p>
                  {company.legalName && company.legalName !== displayName && (
                    <p dir="auto" className="w-fit max-w-full text-[11px] rtl:max-md:text-xs text-muted-foreground line-clamp-2 break-words">{company.legalName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {company.category && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{categoryLabel(company.category, isRtl)}</span>
                  </div>
                )}
                {company.city && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{cityLabel(company.city, isRtl)}</span>
                  </div>
                )}
                {sizeLabel && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{sizeLabel}</span>
                  </div>
                )}

                <div className="h-px bg-muted my-1" />

                {company.crNumber && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono rtl:font-sans text-[11px] rtl:max-md:text-xs tracking-tight">{t('companyProfile.crLabel')} <bdi dir="ltr" className="font-mono">{company.crNumber}</bdi></span>
                  </div>
                )}
                {company.vatNumber && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono rtl:font-sans text-[11px] rtl:max-md:text-xs tracking-tight">{t('companyProfile.vatLabel')} <bdi dir="ltr" className="font-mono">{company.vatNumber}</bdi></span>
                  </div>
                )}
                {formatMemberSince(company.createdAt, isRtl) && (
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{t('companyProfile.memberSince', { date: formatMemberSince(company.createdAt, isRtl)! })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links Card */}
            {hasSocialLinks && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="text-[11px] rtl:max-md:text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                  {t('companyProfile.sectionConnect')}
                </h3>
                <div className="space-y-2">
                  {profile?.socialLinks?.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground px-3 py-2 max-md:min-h-11 rounded-lg border border-border hover:border-border hover:bg-muted transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-80 no-underline"
                    >
                      <Globe className="h-3.5 w-3.5" /> {t('companyProfile.socialWebsite')}
                    </a>
                  )}
                  {profile?.socialLinks?.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground px-3 py-2 max-md:min-h-11 rounded-lg border border-border hover:border-border hover:bg-muted transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-80 no-underline"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> {t('companyProfile.socialLinkedIn')}
                    </a>
                  )}
                  {profile?.socialLinks?.twitter && (
                    <a
                      href={profile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground px-3 py-2 max-md:min-h-11 rounded-lg border border-border hover:border-border hover:bg-muted transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-80 no-underline"
                    >
                      <Twitter className="h-3.5 w-3.5" /> {t('companyProfile.socialTwitter')}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <div className="border-t border-border py-6 px-4 sm:px-6">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t('tractionPage.poweredBy')} <strong className="text-muted-foreground">Bid</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
