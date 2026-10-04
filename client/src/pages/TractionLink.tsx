import { useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { categoryLabel, cityLabel } from "@/lib/category-labels";
import { isolateAuto, withLtrUrls } from "@/lib/bidi";
import { Skeleton } from "@/components/ui/skeleton";
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
    accountType: string | null;
    slug: string | null;
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
  primaryColor: '#FE3C01',
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

/**
 * The company's brand colour, darkened just enough to be readable (4.5:1) as
 * small text on a white card. A pale brand colour (yellow, light orange) is
 * fine for a button fill but unreadable as text. Dark mode keeps the brand
 * colour itself (see .tl-ink in the page's <style>).
 */
function readableInk(hex: string): string {
  for (let a = 0; a >= -0.9; a -= 0.05) {
    const c = a === 0 ? hex : adjustBrightness(hex, a);
    if (hexLuminance(c) <= 0.15) return c;
  }
  return '#111827';
}

/** Dark-mode twin of readableInk: lightened just enough to be readable on the dark cards. */
function readableInkOnDark(hex: string): string {
  for (let a = 0; a <= 0.9; a += 0.05) {
    const c = a === 0 ? hex : adjustBrightness(hex, a);
    if (hexLuminance(c) >= 0.28) return c;
  }
  return '#f9fafb';
}

/** Returns tag pill style (the text colour comes from the .tl-ink class) */
function computeTagStyle(primaryColor: string): React.CSSProperties {
  return {
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

  // Traction pages are a buyer-side storefront: a company publishes one so
  // vendors can apply to join its Vendors Base. Individuals and teams are the
  // vendors, so the page means nothing for them — send visitors to that
  // workspace's actual profile instead. Old shared links keep working rather
  // than 404ing. (Q-034)
  const tractionOwnerType = data?.company.accountType;
  const tractionOwnerSlug = data?.company.slug;
  useEffect(() => {
    if (!tractionOwnerType || !tractionOwnerSlug) return;
    if (tractionOwnerType === 'individual') {
      navigate(`/people/${tractionOwnerSlug}`, { replace: true });
    } else if (tractionOwnerType === 'team') {
      navigate(`/company/${tractionOwnerSlug}`, { replace: true });
    }
  }, [tractionOwnerType, tractionOwnerSlug, navigate]);

  const joinBase = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/r/${slug}/apply`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: t('tractionPage.requestSent'),
        description: t('tractionPage.requestSentDesc').replace('{company}', isolateAuto(data?.profile.displayName || '')),
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
      <div className="min-h-dvh bg-muted" data-testid="loader-page">
        {/* Header area */}
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Logo + name */}
          <div className="flex items-end gap-4 -mt-14">
            <Skeleton className="h-20 w-20 rounded-xl border-4 border-card flex-shrink-0" />
            <div className="space-y-2 pb-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          {/* Bio */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          {/* Stats row */}
          <div className="flex gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 bg-card rounded-xl border border-border p-4 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
          {/* Action button */}
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted px-6 py-10" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center w-full max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-5">
            <Building2 className="h-7 w-7 text-gray-300" />
          </div>
          <h1 className="font-display font-black text-2xl text-foreground mb-2 tracking-[-0.03em] rtl:tracking-normal">{t('tractionPage.pageNotFound')}</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{t('tractionPage.pageNotFoundDesc')}</p>
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/marketplace"
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-[#FE3C01] hover:bg-[#1A1613] px-6 min-h-11 text-sm font-semibold text-white transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97]"
              data-testid="link-traction-not-found-marketplace"
            >
              {t('tractionPage.goToMarketplace')}
            </Link>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-70"
            >
              {t('tractionPage.goHome')}
            </button>
          </div>
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
  // An English company name inside an Arabic sentence (or the reverse) is wrapped
  // so the browser keeps its words in order instead of splitting it around the sentence.
  const heading = theme.welcomeHeading || t('tractionPage.defaultHeading').replace('{company}', isolateAuto(data.profile.displayName));
  const subtext = theme.welcomeSubtext || t('tractionPage.defaultSubtext');
  const ctaLabel = theme.ctaText || t('tractionPage.applyToJoin');
  const hasSocialLinks = data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin;
  const isVerified = data.company.verificationStatus === 'verified';
  // Arabic letters join, so the first letters of several Arabic words would read as one
  // made-up word. For an Arabic name show only the first letter.
  const initialsWords = data.profile.displayName.split(' ').filter(w => /^[\p{L}\p{N}]/u.test(w));
  const initials = /^[؀-ۿ]/.test(data.profile.displayName.trim())
    ? data.profile.displayName.trim().charAt(0)
    : (initialsWords.map(w => w[0]).join('').slice(0, 3).toUpperCase() || data.profile.displayName.trim().charAt(0));
  // Same brand colour, but dark enough to read as small text on the white cards.
  const ink = readableInk(pc);
  const inkDark = readableInkOnDark(pc);

  // ── Success state ──
  if (joinBase.isSuccess) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center bg-muted px-4"
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ '--tl-ink': ink, '--tl-ink-dark': inkDark } as React.CSSProperties}
      >
        {/* The check icon is text-like: the readable ink colour, brand colour kept in dark mode */}
        <style>{`.tl-ink { color: var(--tl-ink); } .dark .tl-ink { color: var(--tl-ink-dark) !important; }`}</style>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `rgba(${pcRgb}, 0.12)`, animationDuration: '2s' }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-card shadow-sm border border-border">
              <CheckCircle2 className="h-12 w-12 tl-ink" />
            </div>
          </div>
          <h1 className="font-display font-black text-3xl text-foreground mb-3 tracking-[-0.04em] rtl:tracking-normal">{t('tractionPage.requestSubmitted')}</h1>
          <p className="text-muted-foreground mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.requestSubmittedDesc').replace('{company}', isolateAuto(data.profile.displayName))}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="tl-btn inline-flex items-center justify-center gap-2 px-7 min-h-11 rounded-xl text-sm font-semibold transition-[transform,filter,opacity] duration-100 hover:-translate-y-px active:scale-[0.97]"
            style={computePrimaryBtnStyle(pc)}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    );
  }

  // ── Already in base state ──
  if (alreadyInBase) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-card shadow-sm border border-border">
              <Info className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          <h1 className="font-display font-black text-3xl text-foreground mb-3 tracking-[-0.04em] rtl:tracking-normal">{t('tractionPage.alreadyInBase')}</h1>
          <p className="text-muted-foreground mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.alreadyInBaseDesc').replace('{company}', isolateAuto(data.profile.displayName))}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="tl-btn inline-flex items-center justify-center gap-2 px-7 min-h-11 rounded-xl text-sm font-semibold transition-[transform,filter,opacity] duration-100 hover:-translate-y-px active:scale-[0.97]"
            style={computePrimaryBtnStyle(pc)}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    );
  }

  // ── Request already pending state ──
  if (requestAlreadyPending) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted px-4" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md w-full py-20">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-card shadow-sm border border-border">
              <CheckCircle2 className="h-12 w-12 text-amber-500" />
            </div>
          </div>
          <h1 className="font-display font-black text-3xl text-foreground mb-3 tracking-[-0.04em] rtl:tracking-normal">{t('tractionPage.requestPending')}</h1>
          <p className="text-muted-foreground mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            {t('tractionPage.requestPendingDesc').replace('{company}', isolateAuto(data.profile.displayName))}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="tl-btn inline-flex items-center justify-center gap-2 px-7 min-h-11 rounded-xl text-sm font-semibold transition-[transform,filter,opacity] duration-100 hover:-translate-y-px active:scale-[0.97]"
            style={computePrimaryBtnStyle(pc)}
          >
            {t('tractionPage.goToDashboard')}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
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
            className="tl-btn flex items-center justify-center gap-2 w-full min-h-11 py-2 rounded-xl text-sm font-semibold transition-[transform,filter,opacity] duration-100 hover:-translate-y-px active:scale-[0.97]"
            style={computePrimaryBtnStyle(pc)}
          >
            <UserPlus className="h-4 w-4" />
            {t('tractionPage.createVendorProfile')}
          </button>
          <p className="text-[11px] rtl:max-sm:text-xs text-gray-400 text-center mt-3">
            {t('tractionPage.freeAccountHint')}
          </p>
          <div className="mt-4 pt-4 border-t border-border text-center flex flex-wrap items-center justify-center gap-x-1 sm:min-h-[41px]">
            <span className="text-sm sm:text-xs text-muted-foreground">{t('tractionPage.alreadyHaveAccount')}</span>
            <button
              onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
              className="tl-ink inline-flex items-center justify-center min-h-11 sm:min-h-0 px-2 sm:px-0 -my-2 sm:my-0 text-sm sm:text-xs font-semibold hover:underline transition-[opacity,transform] duration-100 active:scale-[0.97] active:opacity-70"
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
          <p className="text-sm text-muted-foreground mb-4">{t('tractionPage.setupCompanyFirst')}</p>
          <button
            onClick={() => navigate("/onboarding?redirect=" + encodeURIComponent(`/traction/${slug}`))}
            className="tl-btn flex items-center justify-center gap-2 w-full min-h-11 py-2 rounded-xl text-sm font-semibold transition-[transform,filter,opacity] duration-100 hover:-translate-y-px active:scale-[0.97]"
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
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted mb-4">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] rtl:max-sm:text-xs text-gray-400 font-medium">{t('tractionPage.applyingAs')}</p>
            <p className="text-sm font-semibold text-foreground truncate"><bdi>{activeCompany?.name}</bdi></p>
          </div>
        </div>
        <button
          onClick={() => joinBase.mutate()}
          disabled={joinBase.isPending}
          className="tl-btn flex items-center justify-center gap-2 w-full min-h-11 py-2 rounded-xl text-sm font-semibold transition-[transform,filter,opacity] duration-100 hover:-translate-y-px active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:active:scale-100"
          style={computePrimaryBtnStyle(pc)}
        >
          {joinBase.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />{t('tractionPage.submitting')}</>
            : <>{ctaLabel}<ChevronRight className="h-4 w-4 rtl:-scale-x-100" /></>
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
      className="min-h-dvh flex flex-col"
      style={{ '--bid': pc, '--bid-rgb': pcRgb, '--tl-ink': ink, '--tl-ink-dark': inkDark } as React.CSSProperties}
    >
      <style>{`
        .tl-btn:hover:not(:disabled) { filter: brightness(0.93); }
        .tl-ghost-btn:hover { background: rgba(0,0,0,0.06) !important; color: #111827 !important; }
        .tl-co-link:hover { color: var(--tl-ink) !important; border-color: var(--bid) !important; }
        .tl-ink { color: var(--tl-ink); }
        .dark .tl-ink, .dark .tl-co-link:hover { color: var(--tl-ink-dark) !important; }
      `}</style>

      {/* ══════════════════════ BRANDED HEADER ══════════════════════ */}
      <header className="relative overflow-hidden" style={headerBgStyle}>
        {/* Nav bar */}
        <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-4 max-w-[860px] mx-auto w-full">
          <span className="text-sm font-medium" style={{ color: colors.muted }}>
            {t('tractionPage.poweredBy')}{' '}
            <strong style={{ color: dark ? '#ffffff' : ink }}>Bid</strong>
          </span>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            aria-label={t('tractionPage.switchLanguage')}
            className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 min-h-11 sm:min-h-0 sm:py-1.5 text-xs font-semibold transition-[transform,opacity] duration-100 active:scale-[0.97] active:opacity-70"
            style={computeHeaderCardStyle(bgType)}
          >
            <Languages className="h-3.5 w-3.5" style={{ color: colors.subtext }} />
            <span style={{ color: colors.subtext }}>{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>
        </nav>

        {/* Header content */}
        <div className="relative z-10 max-w-[860px] mx-auto px-6 pt-6 pb-8 sm:pb-16 text-center">
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
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-base font-extrabold tracking-wide rtl:tracking-normal"
              style={{ background: colors.logo.bg, border: colors.logo.border, color: colors.logo.text }}
            >
              {initials}
            </div>
          )}

          {/* Company name */}
          <p className="text-sm font-semibold mb-2 break-words" style={{ color: colors.subtext }}>
            <bdi>{data.profile.displayName}</bdi>
          </p>

          {/* Heading */}
          <h1
            dir={theme.welcomeHeading ? 'auto' : undefined}
            className="font-extrabold tracking-[-0.02em] rtl:tracking-normal leading-[1.15] rtl:max-md:leading-[1.3] mb-3 max-w-lg mx-auto break-words"
            style={{ color: colors.heading, fontSize: 'clamp(24px, 4vw, 36px)' }}
          >
            {heading}
          </h1>

          {/* Subtext */}
          <p dir={theme.welcomeSubtext ? 'auto' : undefined} className="text-sm leading-relaxed max-w-md mx-auto mb-5 break-words" style={{ color: colors.subtext }}>
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
      <main className="flex-1 bg-muted">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">

            {/* ── LEFT: Company Profile Card ── */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden order-2 md:order-1">

              {/* Card header: identity */}
              <div className="flex items-start gap-4 p-6 border-b border-border/50">
                {data.profile.logoUrl ? (
                  <img
                    src={data.profile.logoUrl}
                    alt={data.profile.displayName}
                    className="w-14 h-14 rounded-[14px] object-cover flex-shrink-0 border border-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-[14px] bg-muted flex items-center justify-center text-base font-extrabold text-gray-400 flex-shrink-0 tracking-wide rtl:tracking-normal">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-foreground tracking-[-0.01em] rtl:tracking-normal mb-1 break-words"><bdi>{data.profile.displayName}</bdi></h2>
                  <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap">
                    {data.company.city && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <MapPin className="h-3 w-3 flex-shrink-0" />{cityLabel(data.company.city, isRtl)}
                      </span>
                    )}
                    {data.company.category && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                        <Briefcase className="h-3 w-3 flex-shrink-0" />{categoryLabel(data.company.category, isRtl)}
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] rtl:max-sm:text-xs font-bold rounded-full px-2 py-0.5 text-emerald-800 bg-emerald-50">
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
                  <p className="text-[11px] rtl:max-sm:text-xs font-semibold uppercase rtl:normal-case tracking-[0.1em] rtl:tracking-normal text-gray-300 mb-2">
                    {t('tractionPage.about')}
                  </p>
                  <p dir="auto" className="text-sm text-muted-foreground leading-relaxed break-words">
                    {data.profile.bio ? withLtrUrls(data.profile.bio) : t('tractionPage.noCompanyBio')}
                  </p>
                </div>

                {/* Tags */}
                {data.profile.tags && data.profile.tags.length > 0 && (
                  <div>
                    <p className="text-[11px] rtl:max-sm:text-xs font-semibold uppercase rtl:normal-case tracking-[0.1em] rtl:tracking-normal text-gray-300 mb-2">
                      {t('tractionPage.services')}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {data.profile.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="tl-ink max-w-full [overflow-wrap:anywhere] text-xs font-semibold rounded-full px-2.5 py-0.5"
                          style={computeTagStyle(pc)}
                        >
                          <bdi>{tag}</bdi>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social links */}
                {hasSocialLinks && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {data.profile.socialLinks?.website && (
                      <a
                        href={data.profile.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tl-co-link flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground px-3 min-h-11 sm:min-h-0 sm:py-1.5 rounded-lg border border-border no-underline transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-70"
                      >
                        <Globe className="h-3.5 w-3.5" />{t('tractionPage.website')}
                      </a>
                    )}
                    {data.profile.socialLinks?.linkedin && (
                      <a
                        href={data.profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tl-co-link flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground px-3 min-h-11 sm:min-h-0 sm:py-1.5 rounded-lg border border-border no-underline transition-[color,background-color,border-color,transform] duration-100 active:scale-[0.97] active:opacity-70"
                      >
                        <Linkedin className="h-3.5 w-3.5" />{t('tractionPage.linkedin')}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Action Card (sticky on desktop) ── */}
            <div className="md:sticky md:top-6 order-1 md:order-2">
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="mb-5">
                  <h3 className="text-base font-bold text-foreground">{t('tractionPage.joinNetwork')}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t('tractionPage.quickApplication')}</p>
                </div>
                {renderActionCard()}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="bg-muted border-t border-border pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 sm:px-6">
        <div className="max-w-[860px] mx-auto flex items-center justify-between">
          <span className="text-xs text-gray-300">
            {t('tractionPage.poweredBy')}{' '}
            <strong className="tl-ink">Bid</strong>
          </span>
          <a
            href="mailto:hello@bid.sa"
            className="inline-flex items-center justify-center min-h-11 sm:min-h-0 px-3 sm:px-0 -my-3 sm:my-0 -me-3 sm:me-0 text-xs text-muted-foreground hover:text-foreground transition-[color,transform,opacity] duration-100 active:opacity-70 no-underline"
          >
            {t('tractionPage.contact')}
          </a>
        </div>
      </footer>
    </div>
  );
}
