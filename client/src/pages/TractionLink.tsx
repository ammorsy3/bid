import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import {
  Building2, CheckCircle2, Loader2, UserPlus, LogIn,
  Globe, Linkedin, ArrowRight,
  ChevronRight, Languages, MapPin, Briefcase, ShieldCheck, Info,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

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
    verificationStatus: string | null;
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

// ═══════════════════════════════════════════════════════════════════
// Theme Utilities — pure functions, no React deps
// ═══════════════════════════════════════════════════════════════════

/** Parse #RRGGBB → { r, g, b } with safe fallback */
function hexToRgbParts(hex: string): { r: number; g: number; b: number } {
  if (!hex || hex.length < 7) return { r: 226, g: 94, b: 69 };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 226, g: 94, b: 69 };
  return { r, g, b };
}

/** Returns "r, g, b" string for CSS rgba() usage */
function hexToRgbString(hex: string): string {
  const { r, g, b } = hexToRgbParts(hex);
  return `${r}, ${g}, ${b}`;
}

/** WCAG relative luminance (0–1) */
function hexLuminance(hex: string): number {
  const { r, g, b } = hexToRgbParts(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** True if hex color is perceptually dark */
function isDarkColor(hex: string): boolean {
  return hexLuminance(hex) < 0.179;
}

/** Returns readable text color for a given background */
function contrastTextColor(bgHex: string): '#ffffff' | '#111827' {
  return isDarkColor(bgHex) ? '#ffffff' : '#111827';
}

/** Lighten or darken a hex color. amount: -1 (black) to +1 (white) */
function adjustBrightness(hex: string, amount: number): string {
  const { r, g, b } = hexToRgbParts(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  if (amount > 0) {
    return `#${[r, g, b].map(c => clamp(c + (255 - c) * amount).toString(16).padStart(2, '0')).join('')}`;
  }
  return `#${[r, g, b].map(c => clamp(c * (1 + amount)).toString(16).padStart(2, '0')).join('')}`;
}

// ── Background resolution ──

type BgType = 'white' | 'light' | 'dark-gradient' | 'solid-primary' | 'image';

/** Maps headerStyle → visual background type */
function resolveBgType(theme: TractionTheme, headerUrl: string | null): BgType {
  switch (theme.headerStyle) {
    case 'gradient': return 'dark-gradient';
    case 'solid': return 'solid-primary';
    case 'image': return headerUrl ? 'image' : 'solid-primary';
    case 'clean':
      return theme.themeId === 'minimal' ? 'light' : 'white';
    default: return 'dark-gradient';
  }
}

/** True if the background type is visually dark */
function isBgDark(bgType: BgType): boolean {
  return bgType === 'dark-gradient' || bgType === 'solid-primary' || bgType === 'image';
}

// ── Style computers ──

/** Returns CSS for the branded header background */
function computeHeaderBg(theme: TractionTheme, headerUrl: string | null, bgType: BgType): React.CSSProperties {
  switch (bgType) {
    case 'dark-gradient':
      return { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})` };
    case 'solid-primary':
      return { background: theme.primaryColor };
    case 'image':
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${headerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    case 'light':
      return { background: '#f9fafb', borderBottom: '1px solid #e5e7eb' };
    case 'white':
    default:
      return { background: '#ffffff', borderBottom: '1px solid #e5e7eb' };
  }
}

/** Returns card styles adapted to dark/light header backgrounds */
function computeHeaderCardStyle(bgType: BgType): React.CSSProperties {
  if (isBgDark(bgType)) {
    return {
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(16px)',
    };
  }
  return {
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.06)',
  };
}

/** Returns tag pill style */
function computeTagStyle(primaryColor: string): React.CSSProperties {
  return {
    color: primaryColor,
    background: `rgba(${hexToRgbString(primaryColor)}, 0.06)`,
  };
}

/** Returns primary CTA button style */
function computePrimaryBtnStyle(primaryColor: string): React.CSSProperties {
  const textColor = contrastTextColor(primaryColor);
  return {
    background: primaryColor,
    color: textColor,
  };
}

/** Returns ghost/outline button style adapted to context */
function computeGhostBtnStyle(context: 'dark' | 'light'): React.CSSProperties {
  if (context === 'dark') {
    return {
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.75)',
      border: '1px solid rgba(255,255,255,0.12)',
      backdropFilter: 'blur(8px)',
    };
  }
  return {
    background: 'transparent',
    color: '#374151',
    border: '1px solid #d1d5db',
  };
}

/** Returns adaptive text colors for a given bg type */
function computeTextColors(bgType: BgType) {
  const dark = isBgDark(bgType);
  return {
    heading: dark ? '#ffffff' : '#111827',
    subtext: dark ? 'rgba(255,255,255,0.55)' : '#6b7280',
    muted: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af',
    chip: {
      bg: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      text: dark ? 'rgba(255,255,255,0.7)' : '#4b5563',
    },
    logo: {
      bg: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
      border: dark ? '2px solid rgba(255,255,255,0.15)' : '2px solid #e5e7eb',
      text: dark ? 'rgba(255,255,255,0.85)' : '#6b7280',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export default function TractionLink() {
  const [, params] = useRoute("/traction/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const { toast } = useToast();
  const { user, activeCompany } = useAuthStore();
  const { t, language, setLanguage } = useI18n();
  const isRtl = language === 'ar';
  const [alreadyInBase, setAlreadyInBase] = useState(false);
  const [requestAlreadyPending, setRequestAlreadyPending] = useState(false);

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
      const code = error instanceof ApiError ? error.code : undefined;
      if (code === 'ALREADY_IN_BASE') {
        setAlreadyInBase(true);
        return;
      }
      if (code === 'REQUEST_ALREADY_PENDING') {
        setRequestAlreadyPending(true);
        return;
      }
      toast({
        title: t('tractionPage.requestFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Building2 className="h-7 w-7 text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('tractionPage.pageNotFound')}</h1>
          <p className="text-sm text-gray-500 mb-6">{t('tractionPage.pageNotFoundDesc')}</p>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
          >
            {t('tractionPage.goHome')}
          </button>
        </div>
      </div>
    );
  }

  // ── Resolve theme ──
  const theme = data.profile.tractionTheme || DEFAULT_THEME;
  const pc = theme.primaryColor;
  const pcRgb = hexToRgbString(pc);
  const bgType = resolveBgType(theme, data.profile.headerUrl);
  const colors = computeTextColors(bgType);
  const dark = isBgDark(bgType);
  const headerBgStyle = computeHeaderBg(theme, data.profile.headerUrl, bgType);
  const isLoggedIn = !!user;
  const hasCompany = !!activeCompany;
  const heading = theme.welcomeHeading || t('tractionPage.defaultHeading').replace('{company}', data.profile.displayName);
  const subtext = theme.welcomeSubtext || t('tractionPage.defaultSubtext');
  const ctaLabel = theme.ctaText || t('tractionPage.applyToJoin');
  const hasSocialLinks = data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin;
  const isVerified = data.company.verificationStatus === 'verified';
  const initials = data.profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  // ── Success state ──
  if (joinBase.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `rgba(${pcRgb}, 0.12)`, animationDuration: '2s' }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100">
              <CheckCircle2 className="h-12 w-12" style={{ color: pc }} />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">{t('tractionPage.requestSubmitted')}</h1>
          <p className="text-gray-500 mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.requestSubmittedDesc').replace('{company}', data.profile.displayName)}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="tl-btn inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={computePrimaryBtnStyle(pc)}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Already in base state ──
  if (alreadyInBase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100">
              <Info className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">{t('tractionPage.alreadyInBase')}</h1>
          <p className="text-gray-500 mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.alreadyInBaseDesc').replace('{company}', data.profile.displayName)}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="tl-btn inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={computePrimaryBtnStyle(pc)}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Request already pending state ──
  if (requestAlreadyPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100">
              <CheckCircle2 className="h-12 w-12 text-amber-500" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">{t('tractionPage.requestPending')}</h1>
          <p className="text-gray-500 mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.requestPendingDesc').replace('{company}', data.profile.displayName)}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="tl-btn inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={computePrimaryBtnStyle(pc)}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Action card renderer ──
  const renderActionCard = () => {
    if (!isLoggedIn) {
      return (
        <>
          <button
            onClick={() => navigate("/signup?redirect=" + encodeURIComponent(`/traction/${slug}`))}
            className="tl-btn flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={computePrimaryBtnStyle(pc)}
          >
            <UserPlus className="h-4 w-4" />
            {t('tractionPage.createVendorProfile')}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-3">
            {t('tractionPage.freeAccountHint')}
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-500">{t('tractionPage.alreadyHaveAccount')} </span>
            <button
              onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
              className="text-xs font-semibold hover:underline"
              style={{ color: pc }}
            >
              {t('tractionPage.signIn')}
            </button>
          </div>
        </>
      );
    }

    if (!hasCompany) {
      return (
        <>
          <p className="text-sm text-gray-500 mb-4">{t('tractionPage.setupCompanyFirst')}</p>
          <button
            onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
            className="tl-btn flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={computePrimaryBtnStyle(pc)}
          >
            <Building2 className="h-4 w-4" />
            {t('tractionPage.createCompany')}
          </button>
        </>
      );
    }

    return (
      <>
        {/* "Applying as" confirmation */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 font-medium">{t('tractionPage.applyingAs')}</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{activeCompany?.name}</p>
          </div>
        </div>
        <button
          onClick={() => joinBase.mutate()}
          disabled={joinBase.isPending}
          className="tl-btn flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          style={computePrimaryBtnStyle(pc)}
        >
          {joinBase.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />{t('tractionPage.submitting')}</>
            : <>{ctaLabel}<ChevronRight className="h-4 w-4" /></>
          }
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          {t('tractionPage.detailsSharedForReview')}
        </p>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col"
      style={{ '--bid': pc, '--bid-rgb': pcRgb } as React.CSSProperties}
    >
      <style>{`
        .tl-btn:hover:not(:disabled) { filter: brightness(0.93); }
        .tl-ghost-btn:hover { background: rgba(0,0,0,0.06) !important; color: #111827 !important; }
        .tl-co-link:hover { color: var(--bid) !important; border-color: var(--bid) !important; }
      `}</style>

      {/* ══════════════════════ BRANDED HEADER ══════════════════════ */}
      <header className="relative overflow-hidden" style={headerBgStyle}>
        {/* Nav bar */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-[860px] mx-auto w-full">
          <span className="text-sm font-medium" style={{ color: colors.muted }}>
            {t('tractionPage.poweredBy')}{' '}
            <strong style={{ color: dark ? '#ffffff' : pc }}>Bid</strong>
          </span>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
            style={computeHeaderCardStyle(bgType)}
          >
            <Languages className="h-3.5 w-3.5" style={{ color: colors.subtext }} />
            <span style={{ color: colors.subtext }}>{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>
        </nav>

        {/* Header content */}
        <div className="relative z-10 max-w-[860px] mx-auto px-6 pt-6 pb-12 sm:pb-16 text-center">
          {/* Logo */}
          {data.profile.logoUrl ? (
            <img
              src={data.profile.logoUrl}
              alt={data.profile.displayName}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-5 flex-shrink-0"
              style={{ border: colors.logo.border }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-base font-extrabold tracking-wide"
              style={{ background: colors.logo.bg, border: colors.logo.border, color: colors.logo.text }}
            >
              {initials}
            </div>
          )}

          {/* Company name */}
          <p className="text-sm font-semibold mb-2" style={{ color: colors.subtext }}>
            {data.profile.displayName}
          </p>

          {/* Heading */}
          <h1
            className="font-extrabold tracking-[-0.02em] mb-3 max-w-lg mx-auto"
            style={{ color: colors.heading, fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: 1.15 }}
          >
            {heading}
          </h1>

          {/* Subtext */}
          <p className="text-sm leading-relaxed max-w-md mx-auto mb-5" style={{ color: colors.subtext }}>
            {subtext}
          </p>

          {/* Purpose chip */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: colors.chip.bg, color: colors.chip.text }}
          >
            <UserPlus className="h-3 w-3" />
            {t('tractionPage.vendorRegistration')}
          </div>
        </div>
      </header>

      {/* ══════════════════════ PAGE BODY ══════════════════════ */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">

            {/* ── LEFT: Company Profile Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

              {/* Card header: identity */}
              <div className="flex items-start gap-4 p-6 border-b border-gray-50">
                {data.profile.logoUrl ? (
                  <img
                    src={data.profile.logoUrl}
                    alt={data.profile.displayName}
                    className="w-14 h-14 rounded-[14px] object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-[14px] bg-gray-50 flex items-center justify-center text-base font-extrabold text-gray-400 flex-shrink-0 tracking-wide">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-gray-900 tracking-[-0.01em] mb-1">{data.profile.displayName}</h2>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {data.company.city && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <MapPin className="h-3 w-3 flex-shrink-0" />{data.company.city}
                      </span>
                    )}
                    {data.company.category && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <Briefcase className="h-3 w-3 flex-shrink-0" />{data.company.category}
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5"
                        style={{ color: '#059669', background: '#ecfdf5' }}>
                        <ShieldCheck className="h-3 w-3" />{t('tractionPage.verified')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-6 space-y-5">

                {/* Bio */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">
                    {t('tractionPage.about')}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {data.profile.bio || t('tractionPage.noCompanyBio')}
                  </p>
                </div>

                {/* Tags */}
                {data.profile.tags && data.profile.tags.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">
                      {t('tractionPage.services')}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {data.profile.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                          style={computeTagStyle(pc)}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social links */}
                {hasSocialLinks && (
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    {data.profile.socialLinks?.website && (
                      <a
                        href={data.profile.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tl-co-link flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg no-underline transition-colors"
                        style={{ border: '1px solid #e5e7eb' }}
                      >
                        <Globe className="h-3.5 w-3.5" />{t('tractionPage.website')}
                      </a>
                    )}
                    {data.profile.socialLinks?.linkedin && (
                      <a
                        href={data.profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tl-co-link flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg no-underline transition-colors"
                        style={{ border: '1px solid #e5e7eb' }}
                      >
                        <Linkedin className="h-3.5 w-3.5" />{t('tractionPage.linkedin')}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Action Card (sticky on desktop) ── */}
            <div className="md:sticky md:top-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-gray-900">{t('tractionPage.joinNetwork')}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t('tractionPage.quickApplication')}</p>
                </div>
                {renderActionCard()}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="bg-gray-50 border-t border-gray-100 py-5 px-6">
        <div className="max-w-[860px] mx-auto flex items-center justify-between">
          <span className="text-xs text-gray-300">
            {t('tractionPage.poweredBy')}{' '}
            <strong style={{ color: pc }}>Bid</strong>
          </span>
          <a
            href="mailto:hello@bid.sa"
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors no-underline"
          >
            {t('tractionPage.contact')}
          </a>
        </div>
      </footer>
    </div>
  );
}
