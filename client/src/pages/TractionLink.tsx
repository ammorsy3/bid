import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import {
  Building2, CheckCircle2, Loader2, LogIn, UserPlus,
  Globe, Linkedin, ArrowRight, Shield, Zap, Star, ChevronRight
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

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export default function TractionLink() {
  const [, params] = useRoute("/traction/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const { toast } = useToast();
  const { user, activeCompany } = useAuthStore();
  const { t, language } = useI18n();
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
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#E8614D] mx-auto mb-3" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Building2 className="h-9 w-9 text-gray-300" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('tractionPage.pageNotFound')}</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">{t('tractionPage.pageNotFoundDesc')}</p>
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl px-6">
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
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-lg w-full">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: pc }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: `rgba(${pcRgb}, 0.1)` }}>
              <CheckCircle2 className="h-12 w-12" style={{ color: pc }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('tractionPage.requestSubmitted')}</h1>
          <p className="text-gray-500 mb-10 leading-relaxed text-lg">
            {t('tractionPage.requestSubmittedDesc').replace('{company}', data.profile.displayName)}
          </p>
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="rounded-xl px-8 text-white shadow-lg hover:shadow-xl transition-all"
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
        return `linear-gradient(135deg, ${pc} 0%, ${ac} 100%)`;
      case 'bold':
        return pc;
      case 'classic':
        return '#ffffff';
      case 'minimal':
        return '#fafafa';
      default:
        return `linear-gradient(135deg, ${pc} 0%, ${ac} 100%)`;
    }
  })();

  return (
    <div className="min-h-screen bg-[#fafafa]" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: heroBackground }}>
        {!heroLight && (
          <>
            <div className="absolute inset-0">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-[0.08]" style={{ background: '#fff' }} />
              <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-[0.06]" style={{ background: '#fff' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: '#fff' }} />
            </div>
            {data.profile.headerUrl && (
              <div className="absolute inset-0">
                <img src={data.profile.headerUrl} alt="" className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent, ${theme.themeId === 'bold' ? pc : ac})` }} />
              </div>
            )}
          </>
        )}

        <div className="relative max-w-2xl mx-auto px-6 pt-16 sm:pt-20 pb-24 sm:pb-28">
          {/* Top bar */}
          <div className={`flex items-center justify-between mb-12 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {data.profile.logoUrl ? (
                <img
                  src={data.profile.logoUrl}
                  alt={data.profile.displayName}
                  className="w-11 h-11 rounded-xl object-cover shadow-lg"
                  style={{ border: heroLight ? '1px solid #e5e7eb' : '2px solid rgba(255,255,255,0.2)' }}
                />
              ) : (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: heroLight ? '#f3f4f6' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                  <Building2 className="h-5 w-5" style={{ color: heroLight ? '#9ca3af' : 'rgba(255,255,255,0.9)' }} />
                </div>
              )}
              <span className="text-sm font-semibold" style={{ color: heroTextColor, opacity: 0.9 }}>
                {data.profile.displayName}
              </span>
            </div>
            {data.company.category && (
              <span className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  background: heroLight ? '#f3f4f6' : 'rgba(255,255,255,0.12)',
                  color: heroLight ? '#6b7280' : 'rgba(255,255,255,0.85)',
                  backdropFilter: heroLight ? undefined : 'blur(8px)'
                }}>
                {data.company.category}
              </span>
            )}
          </div>

          {/* Hero content */}
          <div className={isRtl ? 'text-right' : ''}>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] mb-5 tracking-tight" style={{ color: heroTextColor }}>
              {heading}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed max-w-lg" style={{ color: heroTextColor, opacity: 0.75 }}>
              {subtext}
            </p>
          </div>

          {/* Quick CTA for logged-in users with a company */}
          {isLoggedIn && hasCompany && (
            <div className={`mt-10 ${isRtl ? 'text-right' : ''}`}>
              <Button
                onClick={() => joinBase.mutate()}
                disabled={joinBase.isPending}
                size="lg"
                className="rounded-xl px-8 text-base font-semibold shadow-xl hover:shadow-2xl transition-all h-12"
                style={{
                  background: heroLight ? pc : '#ffffff',
                  color: heroLight ? '#fff' : pc,
                }}
              >
                {joinBase.isPending ? (
                  <>
                    <Loader2 className={`${isRtl ? 'ml-2' : 'mr-2'} h-5 w-5 animate-spin`} />
                    {t('tractionPage.submitting')}
                  </>
                ) : (
                  <>
                    {ctaLabel}
                    <ChevronRight className={`${isRtl ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
                  </>
                )}
              </Button>
              <p className="text-xs mt-3" style={{ color: heroTextColor, opacity: 0.5 }}>
                {t('tractionPage.detailsSharedForReview')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 -mt-10 pb-20 space-y-5">
        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `rgba(${pcRgb}, 0.08)` }}>
                <b.icon className="h-5 w-5" style={{ color: pc }} />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{b.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* About */}
        {data.profile.bio && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">{t('tractionPage.about')}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">{data.profile.bio}</p>
            {(data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin) && (
              <div className={`flex gap-5 mt-5 pt-4 border-t border-gray-100 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {data.profile.socialLinks?.website && (
                  <a href={data.profile.socialLinks.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors" style={{ color: pc }}>
                    <Globe className="h-3.5 w-3.5" /> {t('tractionPage.website')}
                  </a>
                )}
                {data.profile.socialLinks?.linkedin && (
                  <a href={data.profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors" style={{ color: pc }}>
                    <Linkedin className="h-3.5 w-3.5" /> {t('tractionPage.linkedin')}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auth CTA for guests */}
        {!isLoggedIn && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100/80 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: `rgba(${pcRgb}, 0.08)` }}>
              <UserPlus className="h-8 w-8" style={{ color: pc }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('tractionPage.readyToJoin')}</h2>
            <p className="text-gray-400 mb-7 max-w-sm mx-auto text-sm leading-relaxed">
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
                className="flex-1 rounded-xl text-white h-11 shadow-lg"
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
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100/80 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: `rgba(${pcRgb}, 0.08)` }}>
              <Building2 className="h-8 w-8" style={{ color: pc }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('tractionPage.readyToJoin')}</h2>
            <p className="text-gray-400 mb-7 max-w-sm mx-auto text-sm leading-relaxed">
              {t('tractionPage.readyToJoinDesc')}
            </p>
            <Button
              onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
              size="lg"
              className="rounded-xl text-white h-11 shadow-lg px-8"
              style={{ background: pc }}
            >
              <Building2 className={`${isRtl ? 'ml-1.5' : 'mr-1.5'} h-4 w-4`} />
              {t('tractionPage.readyToJoin')}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-6">
          <p className="text-[11px] text-gray-300 font-medium">
            {t('tractionPage.poweredBy')} <span className="font-bold" style={{ color: pc }}>Bid</span>
          </p>
        </div>
      </div>
    </div>
  );
}
