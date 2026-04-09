import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import {
  Building2, CheckCircle2, Loader2, LogIn, UserPlus,
  Globe, Linkedin, ArrowRight, Shield, Zap, Star,
  ChevronRight, Languages, MapPin, Briefcase
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
  primaryColor: '#E8614D',
  accentColor: '#1a1a2e',
  headerStyle: 'gradient',
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
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
    enabled: !!slug
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
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-5">
            <Building2 className="h-7 w-7 text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('tractionPage.pageNotFound')}</h1>
          <p className="text-gray-400 mb-6 text-sm">{t('tractionPage.pageNotFoundDesc')}</p>
          <Button variant="outline" onClick={() => navigate("/")} size="sm" className="rounded-lg">
            {t('tractionPage.goHome')}
          </Button>
        </div>
      </div>
    );
  }

  const theme = data.profile.tractionTheme || DEFAULT_THEME;
  const pc = theme.primaryColor;
  const ac = theme.accentColor;
  const pcRgb = hexToRgb(pc);
  const isLoggedIn = !!user;
  const hasCompany = !!activeCompany;
  const heading = theme.welcomeHeading || t('tractionPage.defaultHeading').replace('{company}', data.profile.displayName);
  const subtext = theme.welcomeSubtext || t('tractionPage.defaultSubtext');
  const ctaLabel = theme.ctaText || t('tractionPage.applyToJoin');
  const heroLight = theme.themeId === 'classic' || theme.themeId === 'minimal';

  const benefits = [
    { icon: Zap, title: t('tractionPage.benefitEarlyAccess'), desc: t('tractionPage.benefitEarlyAccessDesc') },
    { icon: Shield, title: t('tractionPage.benefitTrustedNetwork'), desc: t('tractionPage.benefitTrustedNetworkDesc') },
    { icon: Star, title: t('tractionPage.benefitPriority'), desc: t('tractionPage.benefitPriorityDesc') },
  ];

  const hasSocialLinks = data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin;
  const hasCompanyDetails = data.profile.bio || data.company.city || data.company.category || hasSocialLinks || (data.profile.tags && data.profile.tags.length > 0);

  /* ── Success state ── */
  if (joinBase.isSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-28 h-28">
            <div className="absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite]" style={{ background: `rgba(${pcRgb}, 0.15)` }} />
            <div className="absolute inset-2 rounded-full animate-[ping_2s_ease-in-out_infinite_0.3s]" style={{ background: `rgba(${pcRgb}, 0.1)` }} />
            <div className="relative w-28 h-28 rounded-full flex items-center justify-center bg-white shadow-lg border border-gray-100">
              <CheckCircle2 className="h-14 w-14" style={{ color: pc }} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">{t('tractionPage.requestSubmitted')}</h1>
          <p className="text-gray-500 mb-10 text-base leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.requestSubmittedDesc').replace('{company}', data.profile.displayName)}
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="rounded-xl px-8 text-white shadow-lg hover:shadow-xl transition-all h-12 text-[15px] font-semibold"
            style={{ background: pc }}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className={`${isRtl ? 'mr-2 rotate-180' : 'ml-2'} h-4 w-4`} />
          </Button>
        </div>
      </div>
    );
  }

  /* ── Hero background per theme ── */
  const heroStyle = (() => {
    switch (theme.themeId) {
      case 'modern':
        return { background: `linear-gradient(160deg, ${pc} 0%, ${ac} 100%)` };
      case 'bold':
        return { background: pc };
      case 'classic':
        return { background: '#ffffff', borderBottom: '1px solid #f0f0f0' };
      case 'minimal':
        return { background: '#fafafa', borderBottom: '1px solid #eee' };
      default:
        return { background: `linear-gradient(160deg, ${pc} 0%, ${ac} 100%)` };
    }
  })();

  const heroText = heroLight ? '#111827' : '#ffffff';
  const heroSubtext = heroLight ? 'rgba(17,24,39,0.6)' : 'rgba(255,255,255,0.7)';
  const heroPill = heroLight
    ? { bg: '#f3f4f6', text: '#6b7280' }
    : { bg: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.85)' };
  const heroLogo = heroLight
    ? { bg: '#f3f4f6', border: '1px solid #e5e7eb', icon: '#9ca3af' }
    : { bg: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.2)', icon: 'rgba(255,255,255,0.85)' };

  return (
    <div className="min-h-screen bg-[#f8f8f8]" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ═══════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={heroStyle}>

        {/* Decorative shapes for dark themes */}
        {!heroLight && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full opacity-[0.06]" style={{ background: '#fff' }} />
            <div className="absolute top-1/2 -left-32 w-[340px] h-[340px] rounded-full opacity-[0.04]" style={{ background: '#fff' }} />
            {data.profile.headerUrl && (
              <>
                <img src={data.profile.headerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 20%, ${theme.themeId === 'bold' ? pc : ac} 100%)` }} />
              </>
            )}
          </div>
        )}

        <div className="relative max-w-3xl mx-auto px-5 sm:px-8">

          {/* ── Top Nav ── */}
          <nav className={`flex items-center justify-between py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.profile.logoUrl ? (
                <img
                  src={data.profile.logoUrl}
                  alt={data.profile.displayName}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  style={{ border: heroLogo.border }}
                />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: heroLogo.bg }}>
                  <Building2 className="h-4 w-4" style={{ color: heroLogo.icon }} />
                </div>
              )}
              <span className="text-sm font-semibold truncate max-w-[160px] sm:max-w-none" style={{ color: heroText }}>
                {data.profile.displayName}
              </span>
            </div>

            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.company.category && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full hidden sm:inline-block"
                  style={{ background: heroPill.bg, color: heroPill.text }}>
                  {data.company.category}
                </span>
              )}
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{ background: heroPill.bg, color: heroPill.text }}
              >
                <Languages className="h-3 w-3" />
                {language === 'en' ? 'عربي' : 'EN'}
              </button>
            </div>
          </nav>

          {/* ── Hero Content ── */}
          <div className={`pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-xl ${isRtl ? 'mr-0 ml-auto text-right' : ''}`}>
            <h1
              className="text-[32px] sm:text-[48px] font-extrabold leading-[1.1] mb-5 tracking-tight"
              style={{ color: heroText }}
            >
              {heading}
            </h1>
            <p className="text-[15px] sm:text-lg leading-[1.7] mb-9" style={{ color: heroSubtext }}>
              {subtext}
            </p>

            {/* Hero CTA: logged-in with company → Apply */}
            {isLoggedIn && hasCompany && (
              <div>
                <Button
                  onClick={() => joinBase.mutate()}
                  disabled={joinBase.isPending}
                  size="lg"
                  className="rounded-xl px-8 text-[15px] font-semibold shadow-xl hover:shadow-2xl transition-all h-[50px]"
                  style={{
                    background: heroLight ? pc : '#ffffff',
                    color: heroLight ? '#fff' : pc,
                  }}
                >
                  {joinBase.isPending ? (
                    <>
                      <Loader2 className={`${isRtl ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                      {t('tractionPage.submitting')}
                    </>
                  ) : (
                    <>
                      {ctaLabel}
                      <ChevronRight className={`${isRtl ? 'mr-1 rotate-180' : 'ml-1'} h-4 w-4`} />
                    </>
                  )}
                </Button>
                <p className="text-xs mt-3" style={{ color: heroSubtext, opacity: 0.7 }}>
                  {t('tractionPage.detailsSharedForReview')}
                </p>
              </div>
            )}

            {/* Hero CTA: guest → scroll hint */}
            {!isLoggedIn && (
              <Button
                onClick={() => document.getElementById('traction-cta')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg"
                className="rounded-xl px-8 text-[15px] font-semibold shadow-xl hover:shadow-2xl transition-all h-[50px]"
                style={{
                  background: heroLight ? pc : '#ffffff',
                  color: heroLight ? '#fff' : pc,
                }}
              >
                {t('tractionPage.getStarted')}
                <ChevronRight className={`${isRtl ? 'mr-1 rotate-180' : 'ml-1'} h-4 w-4`} />
              </Button>
            )}

            {/* Hero CTA: logged in but no company */}
            {isLoggedIn && !hasCompany && (
              <Button
                onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                size="lg"
                className="rounded-xl px-8 text-[15px] font-semibold shadow-xl hover:shadow-2xl transition-all h-[50px]"
                style={{
                  background: heroLight ? pc : '#ffffff',
                  color: heroLight ? '#fff' : pc,
                }}
              >
                {t('tractionPage.createCompany')}
                <ChevronRight className={`${isRtl ? 'mr-1 rotate-180' : 'ml-1'} h-4 w-4`} />
              </Button>
            )}
          </div>
        </div>

        {/* Bottom curve for dark themes */}
        {!heroLight && (
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none" className="w-full h-8 sm:h-12">
              <path d="M0 48V0C240 32 480 48 720 48C960 48 1200 32 1440 0V48H0Z" fill="#f8f8f8" />
            </svg>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          BENEFITS SECTION
          ═══════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-300 mb-5">
          {t('tractionPage.whyJoin')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 hover:border-gray-200 transition-colors group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform"
                style={{ background: `rgba(${pcRgb}, 0.08)` }}
              >
                <b.icon className="h-5 w-5" style={{ color: pc }} />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{b.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          COMPANY PROFILE CARD
          ═══════════════════════════════════════════════ */}
      {hasCompanyDetails && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-10 sm:pb-14">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

            {/* Card header with logo and name */}
            <div className={`p-6 pb-4 flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.profile.logoUrl ? (
                <img
                  src={data.profile.logoUrl}
                  alt={data.profile.displayName}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-gray-300" />
                </div>
              )}
              <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : ''}`}>
                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{data.profile.displayName}</h3>
                <div className={`flex items-center gap-3 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {data.company.city && (
                    <span className={`flex items-center gap-1 text-xs text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {data.company.city}
                    </span>
                  )}
                  {data.company.category && (
                    <span className={`flex items-center gap-1 text-xs text-gray-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <Briefcase className="h-3 w-3 flex-shrink-0" />
                      {data.company.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {data.profile.bio && (
              <div className={`px-6 pb-4 ${isRtl ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-500 leading-relaxed">{data.profile.bio}</p>
              </div>
            )}

            {/* Tags */}
            {data.profile.tags && data.profile.tags.length > 0 && (
              <div className={`px-6 pb-4 flex gap-1.5 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                {data.profile.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                    style={{ background: `rgba(${pcRgb}, 0.06)`, color: pc }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Social links footer */}
            {hasSocialLinks && (
              <div className={`px-6 py-3.5 border-t border-gray-50 flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {data.profile.socialLinks?.website && (
                  <a href={data.profile.socialLinks.website} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Globe className="h-3.5 w-3.5" /> {t('tractionPage.website')}
                  </a>
                )}
                {data.profile.socialLinks?.linkedin && (
                  <a href={data.profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Linkedin className="h-3.5 w-3.5" /> {t('tractionPage.linkedin')}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════════ */}
      <section id="traction-cta" className="max-w-3xl mx-auto px-5 sm:px-8 pb-10 sm:pb-14">

        {/* Guest CTA */}
        {!isLoggedIn && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: `rgba(${pcRgb}, 0.06)` }}>
                <UserPlus className="h-8 w-8" style={{ color: pc }} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('tractionPage.readyToJoin')}</h2>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                {t('tractionPage.readyToJoinDesc')}
              </p>
              <div className={`flex gap-3 max-w-sm mx-auto ${isRtl ? 'flex-row-reverse' : ''}`}>
                <Button
                  onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                  size="lg"
                  variant="outline"
                  className="flex-1 rounded-xl h-12 text-sm font-semibold"
                >
                  <LogIn className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
                  {t('tractionPage.signIn')}
                </Button>
                <Button
                  onClick={() => navigate("/signup?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                  size="lg"
                  className="flex-1 rounded-xl text-white h-12 text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  style={{ background: pc }}
                >
                  <UserPlus className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
                  {t('tractionPage.signUp')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Logged in but no company */}
        {isLoggedIn && !hasCompany && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: `rgba(${pcRgb}, 0.06)` }}>
                <Building2 className="h-8 w-8" style={{ color: pc }} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('tractionPage.readyToJoin')}</h2>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                {t('tractionPage.setupCompanyFirst')}
              </p>
              <Button
                onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                size="lg"
                className="rounded-xl text-white h-12 px-10 text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow"
                style={{ background: pc }}
              >
                <Building2 className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
                {t('tractionPage.createCompany')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════ */}
      <footer className="text-center pb-8">
        <p className="text-[11px] text-gray-300 font-medium">
          {t('tractionPage.poweredBy')} <span className="font-bold" style={{ color: pc }}>Bid</span>
        </p>
      </footer>
    </div>
  );
}
