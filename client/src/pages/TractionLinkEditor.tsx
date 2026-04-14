import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, CheckCircle2, Loader2, UserPlus, LogIn,
  Globe, Linkedin, ArrowRight, ArrowLeft,
  ChevronRight, Languages, MapPin, Briefcase, ShieldCheck,
  Paintbrush, Type, Image, Upload, Eye, Save, Check,
  Palette, Monitor, Smartphone, Code2, Copy,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types (shared with TractionLink.tsx)
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
// Theme Utilities (same as TractionLink.tsx)
// ═══════════════════════════════════════════════════════════════════

function hexToRgbParts(hex: string): { r: number; g: number; b: number } {
  if (!hex || hex.length < 7) return { r: 226, g: 94, b: 69 };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 226, g: 94, b: 69 };
  return { r, g, b };
}

function hexToRgbString(hex: string): string {
  const { r, g, b } = hexToRgbParts(hex);
  return `${r}, ${g}, ${b}`;
}

function hexLuminance(hex: string): number {
  const { r, g, b } = hexToRgbParts(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function isDarkColor(hex: string): boolean {
  return hexLuminance(hex) < 0.179;
}

function contrastTextColor(bgHex: string): '#ffffff' | '#111827' {
  return isDarkColor(bgHex) ? '#ffffff' : '#111827';
}

type BgType = 'white' | 'light' | 'dark-gradient' | 'solid-primary' | 'image';

function resolveBgType(theme: TractionTheme, headerUrl: string | null): BgType {
  switch (theme.headerStyle) {
    case 'gradient': return 'dark-gradient';
    case 'solid': return 'solid-primary';
    case 'image': return headerUrl ? 'image' : 'solid-primary';
    case 'clean': return theme.themeId === 'minimal' ? 'light' : 'white';
    default: return 'dark-gradient';
  }
}

function isBgDark(bgType: BgType): boolean {
  return bgType === 'dark-gradient' || bgType === 'solid-primary' || bgType === 'image';
}

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

function computeHeaderCardStyle(bgType: BgType): React.CSSProperties {
  if (isBgDark(bgType)) {
    return { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' };
  }
  return { background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' };
}

function computeTagStyle(primaryColor: string): React.CSSProperties {
  return { color: primaryColor, background: `rgba(${hexToRgbString(primaryColor)}, 0.06)` };
}

function computePrimaryBtnStyle(primaryColor: string): React.CSSProperties {
  return { background: primaryColor, color: contrastTextColor(primaryColor) };
}

function computeGhostBtnStyle(): React.CSSProperties {
  return { background: 'transparent', color: '#374151', border: '1px solid #d1d5db' };
}

function computeTextColors(bgType: BgType) {
  const dark = isBgDark(bgType);
  return {
    heading: dark ? '#ffffff' : '#111827',
    subtext: dark ? 'rgba(255,255,255,0.55)' : '#6b7280',
    muted: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af',
    chip: { bg: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', text: dark ? 'rgba(255,255,255,0.7)' : '#4b5563' },
    logo: {
      bg: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
      border: dark ? '2px solid rgba(255,255,255,0.15)' : '2px solid #e5e7eb',
      text: dark ? 'rgba(255,255,255,0.85)' : '#6b7280',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// Editor Component
// ═══════════════════════════════════════════════════════════════════

export default function TractionLinkEditor() {
  const [, params] = useRoute("/traction/:slug/edit");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const { toast } = useToast();
  const { user, activeCompany } = useAuthStore();
  const { t, language } = useI18n();
  const isRtl = language === 'ar';
  const queryClient = useQueryClient();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Fetch current traction data
  const { data, isLoading, error } = useQuery<TractionData>({
    queryKey: ['/api/r', slug],
    enabled: !!slug,
  });

  // Local theme state for live editing
  const [theme, setTheme] = useState<TractionTheme>(DEFAULT_THEME);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedVariant, setEmbedVariant] = useState<'inline' | 'popup' | 'text'>('inline');

  // Initialize theme from fetched data
  useEffect(() => {
    if (data?.profile.tractionTheme) {
      setTheme(data.profile.tractionTheme);
    }
    if (data?.profile.logoUrl) {
      setLogoPreview(data.profile.logoUrl);
    }
    if (data?.profile.headerUrl) {
      setHeaderPreview(data.profile.headerUrl);
    }
  }, [data]);

  // Save theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async (themeData: TractionTheme) => {
      return apiRequest('PATCH', '/api/company/profile', { tractionTheme: themeData });
    },
    onSuccess: () => {
      toast({ title: t('dashboard.tractionThemeSaved'), description: t('dashboard.tractionThemeSavedDesc') });
      queryClient.invalidateQueries({ queryKey: ['/api/r', slug] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      checkAuth();
    },
    onError: (error: Error) => {
      toast({ title: t('tractionPage.editorSaveFailed'), description: error.message, variant: "destructive" });
    },
  });

  // Header upload mutation
  const uploadHeaderMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/company/header', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload header');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) setHeaderPreview(data.url);
      queryClient.invalidateQueries({ queryKey: ['/api/r', slug] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      checkAuth();
      toast({ title: t('tractionPage.editorHeaderUpdated') });
    },
    onError: (error: Error) => {
      setHeaderPreview(data?.profile.headerUrl || null);
      toast({ title: t('tractionPage.editorHeaderUploadFailed'), description: error.message, variant: "destructive" });
    },
  });

  // Logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/company/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload logo');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) setLogoPreview(data.url);
      queryClient.invalidateQueries({ queryKey: ['/api/r', slug] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      checkAuth();
      toast({ title: t('tractionPage.editorLogoUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: t('tractionPage.editorLogoUploadFailed'), description: error.message, variant: "destructive" });
    },
  });

  const updateTheme = (updates: Partial<TractionTheme>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  };

  // Access check
  if (!user || !activeCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('tractionPage.editorLoginRequired')}</p>
          <Button variant="outline" onClick={() => navigate(`/traction/${slug}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />{t('tractionPage.editorViewPage')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('tractionPage.pageNotFound')}</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />{t('tractionPage.editorBackToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  // Computed values for preview
  const pc = theme.primaryColor;
  const pcRgb = hexToRgbString(pc);
  const currentHeaderUrl = headerPreview || data.profile.headerUrl;
  const bgType = resolveBgType(theme, currentHeaderUrl);
  const dark = isBgDark(bgType);
  const colors = computeTextColors(bgType);
  const headerBgStyle = computeHeaderBg(theme, currentHeaderUrl, bgType);
  const heading = theme.welcomeHeading || t('tractionPage.defaultHeading').replace('{company}', data.profile.displayName);
  const subtext = theme.welcomeSubtext || t('tractionPage.defaultSubtext');
  const ctaLabel = theme.ctaText || t('tractionPage.applyToJoin');
  const hasSocialLinks = data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin;
  const isVerified = data.company.verificationStatus === 'verified';
  const initials = data.profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const currentLogoUrl = logoPreview || data.profile.logoUrl;

  const bgStyles: { id: TractionTheme['headerStyle']; label: string; preview: React.CSSProperties }[] = [
    { id: 'gradient', label: t('tractionPage.editorBgGradient'), preview: { background: `linear-gradient(135deg, ${pc}, ${theme.accentColor})` } },
    { id: 'solid', label: t('tractionPage.editorBgSolid'), preview: { background: pc } },
    { id: 'clean', label: t('tractionPage.editorBgLight'), preview: { background: '#ffffff', border: '1px solid #e5e7eb' } },
    { id: 'image', label: t('tractionPage.editorBgImage'), preview: (headerPreview || data.profile.headerUrl)
      ? { backgroundImage: `url(${headerPreview || data.profile.headerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: '#e5e7eb' }
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ══════════════════════ TOP BAR ══════════════════════ */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/traction/${slug}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tractionPage.editorBackToPage')}</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-gray-900">{t('tractionPage.editorTitle')}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          {/* View live */}
          <a
            href={`/traction/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            {t('tractionPage.editorViewLive')}
          </a>

          {/* Save */}
          <Button
            onClick={() => saveThemeMutation.mutate(theme)}
            disabled={saveThemeMutation.isPending}
            size="sm"
            className="h-8 text-white"
            style={{ background: theme.primaryColor }}
          >
            {saveThemeMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t('tractionPage.editorSaving')}</>
              : <><Save className="h-3.5 w-3.5 mr-1.5" />{t('tractionPage.editorSaveChanges')}</>
            }
          </Button>
        </div>
      </div>

      {/* ══════════════════════ MAIN: EDITOR + PREVIEW ══════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Editor Panel ── */}
        <ScrollArea className="w-[340px] flex-shrink-0 border-r border-gray-200 bg-gray-50">
          <div className="p-5 space-y-7">

            {/* ─── Logo ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{t('tractionPage.editorLogo')}</h3>
              </div>
              <div className="flex items-center gap-3">
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400">
                    {initials}
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoPreview(URL.createObjectURL(file));
                          uploadLogoMutation.mutate(file);
                        }
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-white transition-colors">
                      <Upload className="h-3 w-3" />
                      {uploadLogoMutation.isPending ? t('tractionPage.editorUploading') : t('tractionPage.editorUploadLogo')}
                    </span>
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">{t('tractionPage.editorLogoHint')}</p>
                </div>
              </div>
            </section>

            {/* ─── Background Style ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Paintbrush className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{t('tractionPage.editorBackground')}</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {bgStyles.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => updateTheme({ headerStyle: bg.id })}
                    className={`relative rounded-xl overflow-hidden transition-all ${
                      theme.headerStyle === bg.id
                        ? 'ring-2 ring-offset-2'
                        : 'ring-1 ring-gray-200 hover:ring-gray-300'
                    }`}
                    style={theme.headerStyle === bg.id ? { '--tw-ring-color': theme.primaryColor } as React.CSSProperties : undefined}
                  >
                    <div className="h-12 rounded-xl" style={bg.preview} />
                    <p className="text-[10px] font-medium text-gray-500 mt-1 text-center pb-1">{bg.label}</p>
                    {theme.headerStyle === bg.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: theme.primaryColor }}>
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {theme.headerStyle === 'image' && (
                <div className="mt-3 space-y-2">
                  {(headerPreview || data.profile.headerUrl) ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={headerPreview || data.profile.headerUrl}
                        alt="Header background"
                        className="w-full h-20 object-cover"
                      />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setHeaderPreview(URL.createObjectURL(file));
                              uploadHeaderMutation.mutate(file);
                            }
                          }}
                        />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/50">
                          <Upload className="h-3 w-3" />
                          {uploadHeaderMutation.isPending ? t('tractionPage.editorUploading') : t('tractionPage.editorReplaceHeader')}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setHeaderPreview(URL.createObjectURL(file));
                            uploadHeaderMutation.mutate(file);
                          }
                        }}
                      />
                      <div className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors">
                        <Upload className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {uploadHeaderMutation.isPending ? t('tractionPage.editorUploading') : t('tractionPage.editorUploadHeader')}
                        </span>
                      </div>
                    </label>
                  )}
                  <p className="text-[10px] text-gray-400">{t('tractionPage.editorHeaderHint')}</p>
                </div>
              )}
            </section>

            {/* ─── Colors ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{t('tractionPage.editorColors')}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">{t('tractionPage.editorPrimaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <Input
                      value={theme.primaryColor}
                      onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                      className="font-mono text-xs h-9"
                      maxLength={7}
                    />
                  </div>
                </div>
                {(theme.headerStyle === 'gradient') && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">{t('tractionPage.editorAccentColor')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.accentColor}
                        onChange={(e) => updateTheme({ accentColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <Input
                        value={theme.accentColor}
                        onChange={(e) => updateTheme({ accentColor: e.target.value })}
                        className="font-mono text-xs h-9"
                        maxLength={7}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ─── Content ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Type className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{t('tractionPage.editorContent')}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">{t('tractionPage.editorHeading')}</Label>
                  <Input
                    value={theme.welcomeHeading || ''}
                    onChange={(e) => updateTheme({ welcomeHeading: e.target.value || undefined })}
                    placeholder={t('tractionPage.defaultHeading').replace('{company}', data.profile.displayName)}
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">{t('tractionPage.editorSubtext')}</Label>
                  <Textarea
                    value={theme.welcomeSubtext || ''}
                    onChange={(e) => updateTheme({ welcomeSubtext: e.target.value || undefined })}
                    placeholder={t('tractionPage.defaultSubtext')}
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">{t('tractionPage.editorButtonText')}</Label>
                  <Input
                    value={theme.ctaText || ''}
                    onChange={(e) => updateTheme({ ctaText: e.target.value || undefined })}
                    placeholder="Apply to Join"
                    className="text-sm h-9"
                  />
                </div>
              </div>
            </section>

            {/* ─── Theme Presets ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Paintbrush className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{t('tractionPage.editorQuickPresets')}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'classic' as const, name: t('tractionPage.editorPresetClassic'), headerStyle: 'clean' as const, preview: { background: '#ffffff', border: '1px solid #e5e7eb' } },
                  { id: 'modern' as const, name: t('tractionPage.editorPresetModern'), headerStyle: 'gradient' as const, preview: { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})` } },
                  { id: 'bold' as const, name: t('tractionPage.editorPresetBold'), headerStyle: 'solid' as const, preview: { background: theme.primaryColor } },
                  { id: 'minimal' as const, name: t('tractionPage.editorPresetMinimal'), headerStyle: 'clean' as const, preview: { background: '#f9fafb', border: '1px solid #e5e7eb' } },
                ]).map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => updateTheme({ themeId: preset.id, headerStyle: preset.headerStyle })}
                    className={`rounded-xl p-2.5 text-left transition-all ${
                      theme.themeId === preset.id
                        ? 'ring-2 ring-offset-1 bg-white'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                    style={theme.themeId === preset.id ? { '--tw-ring-color': theme.primaryColor } as React.CSSProperties : undefined}
                  >
                    <div className="h-8 rounded-lg mb-1.5" style={preset.preview} />
                    <p className="text-[11px] font-semibold text-gray-700">{preset.name}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* ─── Embed (Calendly-style) ─── */}
            {(() => {
              const tractionUrl = `${window.location.origin}/traction/${slug}`;
              const btnText = (theme.ctaText || '').trim() || 'Join our vendor network';
              const color = theme.primaryColor;
              const htmlAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const jsStr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/<\/script/gi, '<\\/script');
              const htmlText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

              const inlineSnippet = `<!-- Bid Traction inline embed -->
<div style="min-width:320px;height:700px;">
  <iframe
    src="${htmlAttr(tractionUrl)}"
    width="100%"
    height="100%"
    frameborder="0"
    style="border:0;border-radius:12px;"
    title="${htmlAttr(btnText)}"
  ></iframe>
</div>`;

              const popupSnippet = `<!-- Bid Traction popup widget -->
<script>
(function(){
  var u="${jsStr(tractionUrl)}",c="${jsStr(color)}",t="${jsStr(btnText)}";
  function openBid(){
    var o=document.createElement('div');
    o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;';
    o.onclick=function(e){if(e.target===o)document.body.removeChild(o);};
    var b=document.createElement('div');
    b.style.cssText='background:#fff;border-radius:12px;width:100%;max-width:900px;height:90vh;max-height:720px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);';
    var x=document.createElement('button');
    x.innerHTML='&times;';
    x.setAttribute('aria-label','Close');
    x.style.cssText='position:absolute;top:10px;right:12px;background:#fff;border:1px solid #e5e7eb;width:32px;height:32px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;z-index:1;';
    x.onclick=function(){document.body.removeChild(o);};
    var f=document.createElement('iframe');
    f.src=u;f.style.cssText='width:100%;height:100%;border:0;';f.title=t;
    f.setAttribute('allow','clipboard-write');
    b.appendChild(f);b.appendChild(x);o.appendChild(b);document.body.appendChild(o);
  }
  function init(){
    var btn=document.createElement('button');
    btn.type='button';btn.innerText=t;
    btn.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483646;padding:12px 22px;background:'+c+';color:#fff;border:0;border-radius:28px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.18);';
    btn.onclick=openBid;
    document.body.appendChild(btn);
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
</script>`;

              const textSnippet = `<!-- Bid Traction popup text link -->
<a href="${htmlAttr(tractionUrl)}" onclick="return BidTraction_open(event)" style="color:${htmlAttr(color)};font-weight:600;text-decoration:underline;cursor:pointer;">${htmlText(btnText)}</a>
<script>
function BidTraction_open(e){
  e.preventDefault();
  var u="${jsStr(tractionUrl)}",t="${jsStr(btnText)}";
  var o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;';
  o.onclick=function(ev){if(ev.target===o)document.body.removeChild(o);};
  var b=document.createElement('div');
  b.style.cssText='background:#fff;border-radius:12px;width:100%;max-width:900px;height:90vh;max-height:720px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);';
  var x=document.createElement('button');
  x.innerHTML='&times;';x.setAttribute('aria-label','Close');
  x.style.cssText='position:absolute;top:10px;right:12px;background:#fff;border:1px solid #e5e7eb;width:32px;height:32px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;z-index:1;';
  x.onclick=function(){document.body.removeChild(o);};
  var f=document.createElement('iframe');
  f.src=u;f.style.cssText='width:100%;height:100%;border:0;';f.title=t;
  b.appendChild(f);b.appendChild(x);o.appendChild(b);document.body.appendChild(o);
  return false;
}
</script>`;

              const snippets = { inline: inlineSnippet, popup: popupSnippet, text: textSnippet };
              const currentSnippet = snippets[embedVariant];

              const copyEmbed = async () => {
                try {
                  await navigator.clipboard.writeText(currentSnippet);
                  setCopiedEmbed(true);
                  toast({ title: t('tractionPage.editorEmbedCopied') || 'Embed code copied' });
                  setTimeout(() => setCopiedEmbed(false), 2000);
                } catch {
                  toast({ title: 'Copy failed', variant: 'destructive' });
                }
              };

              const variants: Array<{ id: 'inline' | 'popup' | 'text'; label: string; desc: string }> = [
                { id: 'inline', label: t('tractionPage.editorEmbedInline') || 'Inline', desc: t('tractionPage.editorEmbedInlineDesc') || 'Embed the full page on your site' },
                { id: 'popup', label: t('tractionPage.editorEmbedPopup') || 'Popup widget', desc: t('tractionPage.editorEmbedPopupDesc') || 'Floating button that opens a popup' },
                { id: 'text', label: t('tractionPage.editorEmbedText') || 'Popup text', desc: t('tractionPage.editorEmbedTextDesc') || 'Text link that opens a popup' },
              ];
              const current = variants.find(v => v.id === embedVariant)!;

              return (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">{t('tractionPage.editorEmbed') || 'Embed on your website'}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setEmbedVariant(v.id)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                          embedVariant === v.id
                            ? 'bg-white ring-2 ring-offset-1 text-gray-900'
                            : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
                        }`}
                        style={embedVariant === v.id ? { '--tw-ring-color': color } as React.CSSProperties : undefined}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{current.desc}</p>

                  <Textarea
                    readOnly
                    value={currentSnippet}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    className="text-[10px] font-mono resize-none mb-2 bg-gray-50"
                    rows={8}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={copyEmbed}
                  >
                    {copiedEmbed ? (
                      <><Check className="h-3.5 w-3.5 mr-1.5" />{t('tractionPage.editorEmbedCopied') || 'Copied!'}</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5 mr-1.5" />{t('tractionPage.editorCopyEmbed') || 'Copy embed code'}</>
                    )}
                  </Button>
                </section>
              );
            })()}

          </div>
        </ScrollArea>

        {/* ── RIGHT: Live Preview ── */}
        <div className="flex-1 bg-[#e8e8e8] flex items-start justify-center p-6 overflow-auto">
          <div
            className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
              previewMode === 'mobile' ? 'w-[390px]' : 'w-full max-w-[1024px]'
            }`}
            style={{ minHeight: '600px' }}
          >
            {/* ── Preview: Branded Header ── */}
            <div className="relative overflow-hidden" style={headerBgStyle}>
              <div className="relative z-10 px-6 py-4 flex items-center justify-between max-w-[860px] mx-auto">
                <span className="text-sm font-medium" style={{ color: colors.muted }}>
                  {t('tractionPage.poweredBy')}{' '}
                  <strong style={{ color: dark ? '#ffffff' : pc }}>Bid</strong>
                </span>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={computeHeaderCardStyle(bgType)}
                >
                  <Languages className="h-3.5 w-3.5" style={{ color: colors.subtext }} />
                  <span style={{ color: colors.subtext }}>{language === 'en' ? 'عربي' : 'EN'}</span>
                </div>
              </div>
              <div className="relative z-10 max-w-[860px] mx-auto px-6 pt-6 pb-12 text-center">
                {currentLogoUrl ? (
                  <img src={currentLogoUrl} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-5" style={{ border: colors.logo.border }} />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-base font-extrabold tracking-wide"
                    style={{ background: colors.logo.bg, border: colors.logo.border, color: colors.logo.text }}>
                    {initials}
                  </div>
                )}
                <p className="text-sm font-semibold mb-2" style={{ color: colors.subtext }}>{data.profile.displayName}</p>
                <h1 className="font-extrabold tracking-[-0.02em] mb-3 max-w-lg mx-auto" style={{ color: colors.heading, fontSize: previewMode === 'mobile' ? '24px' : 'clamp(24px, 4vw, 36px)', lineHeight: 1.15 }}>
                  {heading}
                </h1>
                <p className="text-sm leading-relaxed max-w-md mx-auto mb-5" style={{ color: colors.subtext }}>{subtext}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: colors.chip.bg, color: colors.chip.text }}>
                  <UserPlus className="h-3 w-3" />{t('tractionPage.vendorRegistration')}
                </div>
              </div>
            </div>

            {/* ── Preview: Page Body ── */}
            <div className="bg-gray-50">
              <div className="max-w-[860px] mx-auto px-4 py-8">
                <div className={`grid gap-6 items-start ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[1fr_320px]'}`}>

                  {/* Company Profile Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-start gap-4 p-6 border-b border-gray-50">
                      {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt="" className="w-14 h-14 rounded-[14px] object-cover flex-shrink-0 border border-gray-100" />
                      ) : (
                        <div className="w-14 h-14 rounded-[14px] bg-gray-50 flex items-center justify-center text-base font-extrabold text-gray-400 flex-shrink-0">{initials}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-extrabold text-gray-900 tracking-[-0.01em] mb-1">{data.profile.displayName}</h2>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {data.company.city && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                              <MapPin className="h-3 w-3" />{data.company.city}
                            </span>
                          )}
                          {data.company.category && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                              <Briefcase className="h-3 w-3" />{data.company.category}
                            </span>
                          )}
                          {isVerified && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5" style={{ color: '#059669', background: '#ecfdf5' }}>
                              <ShieldCheck className="h-3 w-3" />{t('tractionPage.verified')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">{t('tractionPage.about')}</p>
                        <p className="text-sm text-gray-500 leading-relaxed">{data.profile.bio || t('tractionPage.noCompanyBio')}</p>
                      </div>
                      {data.profile.tags && data.profile.tags.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">{t('tractionPage.services')}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {data.profile.tags.map((tag, i) => (
                              <span key={i} className="text-xs font-semibold rounded-full px-2.5 py-0.5" style={computeTagStyle(pc)}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {hasSocialLinks && (
                        <div className="flex gap-2 pt-2 border-t border-gray-50">
                          {data.profile.socialLinks?.website && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
                              <Globe className="h-3.5 w-3.5" />{t('tractionPage.website')}
                            </span>
                          )}
                          {data.profile.socialLinks?.linkedin && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg" style={{ border: '1px solid #e5e7eb' }}>
                              <Linkedin className="h-3.5 w-3.5" />{t('tractionPage.linkedin')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="mb-5">
                      <h3 className="text-base font-bold text-gray-900">{t('tractionPage.joinNetwork')}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t('tractionPage.quickApplication')}</p>
                    </div>
                    <div
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold"
                      style={computePrimaryBtnStyle(pc)}
                    >
                      <UserPlus className="h-4 w-4" />{t('tractionPage.createVendorProfile')}
                    </div>
                    <p className="text-[11px] text-gray-400 text-center mt-3">
                      {t('tractionPage.freeAccountHint')}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                      <span className="text-xs text-gray-500">{t('tractionPage.alreadyHaveAccount')} </span>
                      <span className="text-xs font-semibold" style={{ color: pc }}>
                        {t('tractionPage.signIn')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Preview: Footer ── */}
            <div className="bg-gray-50 border-t border-gray-100 py-5 px-6">
              <div className="max-w-[860px] mx-auto flex items-center justify-between">
                <span className="text-xs text-gray-300">
                  {t('tractionPage.poweredBy')}{' '}<strong style={{ color: pc }}>Bid</strong>
                </span>
                <span className="text-xs text-gray-300">{t('tractionPage.contact')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
