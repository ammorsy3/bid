import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import {
  Building2, CheckCircle2, Loader2, UserPlus, LogIn,
  Globe, Linkedin, ArrowRight, ChevronRight, Languages,
  MapPin, Briefcase,
} from "lucide-react";

interface TractionTheme {
  themeId: 'classic' | 'modern' | 'bold' | 'minimal';
  primaryColor: string;
  accentColor: string;
  headerStyle: 'clean' | 'gradient' | 'solid' | 'image';
  ctaText?: string;
  welcomeHeading?: string;
  welcomeSubtext?: string;
}

interface TractionData {
  company: {
    id: string;
    name: string;
    category: string | null;
    city: string | null;
  };
  profile: {
    displayName: string;
    bio: string | null;
    logoUrl: string | null;
    headerUrl: string | null;
    socialLinks: { website?: string; linkedin?: string } | null;
    tags: string[];
    tractionTheme: TractionTheme | null;
  };
}

const DEFAULT_THEME: TractionTheme = {
  themeId: 'modern',
  primaryColor: '#E25E45',
  accentColor: '#1a1a2e',
  headerStyle: 'gradient',
};

function hexToRgb(hex: string): string {
  if (!hex || hex.length < 7) return '226, 94, 69';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '226, 94, 69';
  return `${r}, ${g}, ${b}`;
}

export default function TractionLink() {
  const [, params] = useRoute("/traction/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const { toast } = useToast();
  const { user, activeCompany } = useAuthStore();
  const { t, language, setLanguage } = useI18n();
  const isRtl = language === 'ar';

  const { data, isLoading, error } = useQuery<TractionData>({
    queryKey: ['/api/r', slug],
    enabled: !!slug,
  });

  const joinBase = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/r/${slug}/apply`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: t('tractionPage.requestSent'),
        description: t('tractionPage.requestSentDesc').replace('{company}', data?.profile.displayName || ''),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('tractionPage.requestFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-5 w-5 text-gray-300" />
          </div>
          <h1 className="text-base font-semibold text-gray-900 mb-1">{t('tractionPage.pageNotFound')}</h1>
          <p className="text-sm text-gray-400 mb-5">{t('tractionPage.pageNotFoundDesc')}</p>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            {t('tractionPage.goHome')}
          </button>
        </div>
      </div>
    );
  }

  const theme = data.profile.tractionTheme || DEFAULT_THEME;
  const pc = theme.primaryColor;
  const pcRgb = hexToRgb(pc);
  const isLoggedIn = !!user;
  const hasCompany = !!activeCompany;
  const ctaLabel = theme.ctaText || t('tractionPage.applyToJoin');
  const hasSocialLinks = data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin;
  const initials = data.profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  // Success state
  if (joinBase.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-white border border-gray-200 shadow-sm">
            <CheckCircle2 className="h-8 w-8" style={{ color: pc }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('tractionPage.requestSubmitted')}</h1>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            {t('tractionPage.requestSubmittedDesc').replace('{company}', data.profile.displayName)}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold"
            style={{ background: pc }}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06] bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <span className="text-base font-extrabold tracking-tight" style={{ color: pc }}>Bid</span>
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors px-2.5 py-1.5 rounded-md hover:bg-gray-100"
        >
          <Languages className="h-3 w-3" />
          {language === 'en' ? 'عربي' : 'EN'}
        </button>
      </header>

      {/* ── Main content — narrow centered column ── */}
      <main className="max-w-[460px] mx-auto px-4 py-10">

        {/* Company identity */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-3">

          {/* Accent bar */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${pc}, rgba(${pcRgb},0.3))` }} />

          <div className="p-6">
            {/* Logo + name */}
            <div className={`flex items-center gap-4 mb-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.profile.logoUrl ? (
                <img
                  src={data.profile.logoUrl}
                  alt={data.profile.displayName}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0 tracking-wide text-white"
                  style={{ background: pc }}
                >
                  {initials}
                </div>
              )}
              <div className={isRtl ? 'text-right' : ''}>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{data.profile.displayName}</h1>
                <div className={`flex items-center gap-2.5 mt-1 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {data.company.city && (
                    <span className={`flex items-center gap-1 text-xs text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <MapPin className="h-3 w-3" />{data.company.city}
                    </span>
                  )}
                  {data.company.category && (
                    <span className={`flex items-center gap-1 text-xs text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <Briefcase className="h-3 w-3" />{data.company.category}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}
                    style={{ color: pc, background: `rgba(${pcRgb}, 0.08)` }}
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {data.profile.bio && (
              <p className={`text-sm text-gray-500 leading-relaxed mb-4 ${isRtl ? 'text-right' : ''}`}>
                {data.profile.bio}
              </p>
            )}

            {/* Tags */}
            {data.profile.tags && data.profile.tags.length > 0 && (
              <div className={`flex gap-1.5 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                {data.profile.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium rounded-md px-2 py-0.5"
                    style={{ color: pc, background: `rgba(${pcRgb}, 0.07)` }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Social links */}
          {hasSocialLinks && (
            <div className={`flex gap-2 px-6 py-3 border-t border-gray-100 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.profile.socialLinks?.website && (
                <a
                  href={data.profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Globe className="h-3 w-3" />{t('tractionPage.website')}
                </a>
              )}
              {data.profile.socialLinks?.linkedin && (
                <a
                  href={data.profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Linkedin className="h-3 w-3" />{t('tractionPage.linkedin')}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Action card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className={`text-base font-bold text-gray-900 mb-1 ${isRtl ? 'text-right' : ''}`}>
            {t('tractionPage.defaultHeading').replace('{company}', data.profile.displayName)}
          </h2>
          <p className={`text-sm text-gray-400 mb-5 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
            {t('tractionPage.defaultSubtext')}
          </p>

          {/* Guest */}
          {!isLoggedIn && (
            <>
              <button
                onClick={() => navigate("/signup?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-semibold mb-2 transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: pc }}
              >
                <UserPlus className="h-4 w-4" />
                {t('tractionPage.signUp')}
              </button>
              <button
                onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                {t('tractionPage.signIn')}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-gray-300 mt-4">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                Free to join — no hidden fees
              </p>
            </>
          )}

          {/* Logged in, no company */}
          {isLoggedIn && !hasCompany && (
            <>
              <button
                onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: pc }}
              >
                <Building2 className="h-4 w-4" />
                {t('tractionPage.createCompany')}
              </button>
              <p className={`text-xs text-gray-400 mt-3 ${isRtl ? 'text-right' : ''}`}>
                {t('tractionPage.setupCompanyFirst')}
              </p>
            </>
          )}

          {/* Logged in with company */}
          {isLoggedIn && hasCompany && (
            <>
              <button
                onClick={() => joinBase.mutate()}
                disabled={joinBase.isPending}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: pc }}
              >
                {joinBase.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />{t('tractionPage.submitting')}</>
                  : <>{ctaLabel}<ChevronRight className="h-4 w-4" /></>
                }
              </button>
              <p className={`text-xs text-gray-300 mt-3 ${isRtl ? 'text-right' : ''}`}>
                {t('tractionPage.detailsSharedForReview')}
              </p>
            </>
          )}
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="text-center pb-8 pt-2">
        <p className="text-[11px] text-gray-300">
          {t('tractionPage.poweredBy')}{' '}
          <span className="font-bold" style={{ color: pc }}>Bid</span>
        </p>
      </footer>

    </div>
  );
}
