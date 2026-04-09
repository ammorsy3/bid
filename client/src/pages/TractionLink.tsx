import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import {
  Building2, CheckCircle2, Loader2, LogIn, UserPlus,
  Globe, Linkedin, ArrowRight, Shield, Zap, Star, ChevronRight, Languages
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
  };
  profile: {
    displayName: string;
    bio: string | null;
    logoUrl: string | null;
    headerUrl: string | null;
    socialLinks: { website?: string; linkedin?: string } | null;
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
  const heroTextColor = heroLight ? '#111827' : '#ffffff';

  const benefits = [
    { icon: Zap, title: t('tractionPage.benefitEarlyAccess'), desc: t('tractionPage.benefitEarlyAccessDesc') },
    { icon: Shield, title: t('tractionPage.benefitTrustedNetwork'), desc: t('tractionPage.benefitTrustedNetworkDesc') },
    { icon: Star, title: t('tractionPage.benefitPriority'), desc: t('tractionPage.benefitPriorityDesc') },
  ];

  if (joinBase.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `rgba(${pcRgb}, 0.08)` }}>
            <CheckCircle2 className="h-10 w-10" style={{ color: pc }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('tractionPage.requestSubmitted')}</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            {t('tractionPage.requestSubmittedDesc').replace('{company}', data.profile.displayName)}
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="rounded-xl px-8 text-white"
            style={{ background: pc }}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className={`${isRtl ? 'mr-2 rotate-180' : 'ml-2'} h-4 w-4`} />
          </Button>
        </div>
      </div>
    );
  }

  const heroBackground = (() => {
    switch (theme.themeId) {
      case 'modern':
        return `linear-gradient(160deg, ${pc} 0%, ${ac} 100%)`;
      case 'bold':
        return pc;
      case 'classic':
        return '#ffffff';
      case 'minimal':
        return '#fafafa';
      default:
        return `linear-gradient(160deg, ${pc} 0%, ${ac} 100%)`;
    }
  })();

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── HERO SECTION ── */}
      <div className="relative overflow-hidden" style={{ background: heroBackground }}>
        {!heroLight && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: '#fff' }} />
            <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: '#fff' }} />
            {data.profile.headerUrl && (
              <>
                <img src={data.profile.headerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, ${theme.themeId === 'bold' ? pc : ac})` }} />
              </>
            )}
          </div>
        )}

        <div className="relative max-w-3xl mx-auto px-6 sm:px-8">

          {/* Nav bar */}
          <div className={`flex items-center justify-between py-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.profile.logoUrl ? (
                <img
                  src={data.profile.logoUrl}
                  alt={data.profile.displayName}
                  className="w-9 h-9 rounded-lg object-cover"
                  style={{ border: heroLight ? '1px solid #e5e7eb' : '2px solid rgba(255,255,255,0.25)' }}
                />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: heroLight ? '#f3f4f6' : 'rgba(255,255,255,0.15)' }}>
                  <Building2 className="h-4 w-4" style={{ color: heroLight ? '#9ca3af' : 'rgba(255,255,255,0.8)' }} />
                </div>
              )}
              <span className="text-sm font-semibold" style={{ color: heroTextColor, opacity: 0.9 }}>
                {data.profile.displayName}
              </span>
            </div>
            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.company.category && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full hidden sm:inline-block"
                  style={{
                    background: heroLight ? '#f3f4f6' : 'rgba(255,255,255,0.1)',
                    color: heroLight ? '#6b7280' : 'rgba(255,255,255,0.8)',
                  }}>
                  {data.company.category}
                </span>
              )}
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{
                  background: heroLight ? '#f3f4f6' : 'rgba(255,255,255,0.1)',
                  color: heroLight ? '#6b7280' : 'rgba(255,255,255,0.8)',
                }}
              >
                <Languages className="h-3.5 w-3.5" />
                {language === 'en' ? 'العربية' : 'English'}
              </button>
            </div>
          </div>

          {/* Hero content */}
          <div className={`pt-10 sm:pt-16 pb-20 sm:pb-28 ${isRtl ? 'text-right' : ''}`}>
            <h1
              className="text-3xl sm:text-[44px] font-extrabold leading-[1.15] mb-4 tracking-tight"
              style={{ color: heroTextColor }}
            >
              {heading}
            </h1>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-lg mb-8"
              style={{ color: heroTextColor, opacity: 0.7 }}
            >
              {subtext}
            </p>

            {/* Hero CTA — logged-in users with a company */}
            {isLoggedIn && hasCompany && (
              <div>
                <Button
                  onClick={() => joinBase.mutate()}
                  disabled={joinBase.isPending}
                  size="lg"
                  className="rounded-xl px-7 text-[15px] font-semibold shadow-xl hover:shadow-2xl transition-all h-12"
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
                      <ChevronRight className={`${isRtl ? 'mr-1.5 rotate-180' : 'ml-1.5'} h-4 w-4`} />
                    </>
                  )}
                </Button>
                <p className="text-xs mt-3 opacity-50" style={{ color: heroTextColor }}>
                  {t('tractionPage.detailsSharedForReview')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BENEFITS — pulled up over hero edge ── */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `rgba(${pcRgb}, 0.08)` }}
              >
                <b.icon className="h-[18px] w-[18px]" style={{ color: pc }} />
              </div>
              <h3 className="font-semibold text-gray-900 text-[13px] mb-0.5">{b.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY CONTENT ── */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-8 pb-16 space-y-5">

        {/* About */}
        {data.profile.bio && (
          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2.5">
              {t('tractionPage.about')}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm">{data.profile.bio}</p>
            {(data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin) && (
              <div className={`flex gap-4 mt-4 pt-3.5 border-t border-gray-200/60 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {data.profile.socialLinks?.website && (
                  <a href={data.profile.socialLinks.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: pc }}>
                    <Globe className="h-3.5 w-3.5" /> {t('tractionPage.website')}
                  </a>
                )}
                {data.profile.socialLinks?.linkedin && (
                  <a href={data.profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: pc }}>
                    <Linkedin className="h-3.5 w-3.5" /> {t('tractionPage.linkedin')}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auth CTA for guests */}
        {!isLoggedIn && (
          <div className="rounded-2xl p-8 text-center border border-gray-100" style={{ background: `rgba(${pcRgb}, 0.02)` }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `rgba(${pcRgb}, 0.08)` }}>
              <UserPlus className="h-7 w-7" style={{ color: pc }} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1.5">{t('tractionPage.readyToJoin')}</h2>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto text-sm leading-relaxed">
              {t('tractionPage.readyToJoinDesc')}
            </p>
            <div className={`flex gap-3 max-w-xs mx-auto ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Button
                onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                size="lg"
                variant="outline"
                className="flex-1 rounded-xl h-11"
              >
                <LogIn className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
                {t('tractionPage.signIn')}
              </Button>
              <Button
                onClick={() => navigate("/signup?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                size="lg"
                className="flex-1 rounded-xl text-white h-11"
                style={{ background: pc }}
              >
                <UserPlus className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
                {t('tractionPage.signUp')}
              </Button>
            </div>
          </div>
        )}

        {/* CTA for logged-in users without a company */}
        {isLoggedIn && !hasCompany && (
          <div className="rounded-2xl p-8 text-center border border-gray-100" style={{ background: `rgba(${pcRgb}, 0.02)` }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `rgba(${pcRgb}, 0.08)` }}>
              <Building2 className="h-7 w-7" style={{ color: pc }} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1.5">{t('tractionPage.readyToJoin')}</h2>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto text-sm leading-relaxed">
              {t('tractionPage.readyToJoinDesc')}
            </p>
            <Button
              onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
              size="lg"
              className="rounded-xl text-white h-11 px-8"
              style={{ background: pc }}
            >
              <Building2 className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
              {t('tractionPage.readyToJoin')}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-300 font-medium">
            {t('tractionPage.poweredBy')} <span className="font-bold" style={{ color: pc }}>Bid</span>
          </p>
        </div>
      </div>
    </div>
  );
}
