import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Building2, ExternalLink, CheckCircle2, Loader2, LogIn, UserPlus,
  Globe, Linkedin, ArrowRight, Shield, Zap, Users, Star
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

const BENEFITS = [
  { icon: Zap, title: "Early access to tenders", desc: "Be first to know about new opportunities" },
  { icon: Shield, title: "Trusted network", desc: "Join a verified vendor community" },
  { icon: Star, title: "Priority consideration", desc: "Stand out when proposals are reviewed" },
];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getThemeStyles(theme: TractionTheme) {
  const pc = theme.primaryColor;
  const hsl = hexToHsl(pc);
  const lightBg = `hsl(${hsl.h}, ${Math.min(hsl.s, 30)}%, 97%)`;
  const subtleBg = `hsl(${hsl.h}, ${Math.min(hsl.s, 40)}%, 94%)`;

  switch (theme.themeId) {
    case 'classic':
      return {
        headerBg: '#ffffff',
        headerText: '#111827',
        pageBg: '#f9fafb',
        cardBg: '#ffffff',
        heroBg: lightBg,
        gradient: `linear-gradient(135deg, ${lightBg} 0%, #ffffff 100%)`,
      };
    case 'modern':
      return {
        headerBg: `linear-gradient(135deg, ${pc} 0%, ${theme.accentColor} 100%)`,
        headerText: '#ffffff',
        pageBg: '#f9fafb',
        cardBg: '#ffffff',
        heroBg: `linear-gradient(135deg, ${pc} 0%, ${theme.accentColor} 100%)`,
        gradient: `linear-gradient(180deg, ${subtleBg} 0%, #f9fafb 40%)`,
      };
    case 'bold':
      return {
        headerBg: pc,
        headerText: '#ffffff',
        pageBg: '#fafafa',
        cardBg: '#ffffff',
        heroBg: pc,
        gradient: `linear-gradient(180deg, ${pc} 0%, ${pc} 35%, #fafafa 35%)`,
      };
    case 'minimal':
      return {
        headerBg: '#ffffff',
        headerText: '#111827',
        pageBg: '#ffffff',
        cardBg: '#f9fafb',
        heroBg: '#ffffff',
        gradient: 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)',
      };
    default:
      return {
        headerBg: '#ffffff',
        headerText: '#111827',
        pageBg: '#f9fafb',
        cardBg: '#ffffff',
        heroBg: lightBg,
        gradient: `linear-gradient(135deg, ${lightBg} 0%, #ffffff 100%)`,
      };
  }
}

export default function TractionLink() {
  const [, params] = useRoute("/traction/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const { toast } = useToast();
  const { user } = useAuthStore();

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
        title: "Request submitted!",
        description: `Your request to join ${data?.profile.displayName}'s Vendors Base has been sent.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400 mx-auto mb-3" data-testid="loader-page" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-500 mb-6">This vendor registration link doesn't exist or has been removed.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const theme = data.profile.tractionTheme || DEFAULT_THEME;
  const styles = getThemeStyles(theme);
  const isLoggedIn = !!user;
  const heading = theme.welcomeHeading || `Join ${data.profile.displayName}'s Vendor Network`;
  const subtext = theme.welcomeSubtext || `Get access to tender opportunities and become a trusted partner.`;
  const ctaLabel = theme.ctaText || "Apply to Join";

  if (joinBase.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: `${theme.primaryColor}15` }}>
            <CheckCircle2 className="h-10 w-10" style={{ color: theme.primaryColor }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3" data-testid="text-success-title">Request Submitted!</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your request to join <strong>{data.profile.displayName}</strong>'s Vendor Network has been sent.
            You'll be notified once they review your application.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full"
              style={{ background: theme.primaryColor }}
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: styles.pageBg }}>
      {/* Hero Section */}
      {theme.themeId === 'modern' || theme.themeId === 'bold' ? (
        <div className="relative overflow-hidden" style={{ background: styles.heroBg }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: '#ffffff' }} />
            <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl" style={{ background: '#ffffff' }} />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
            {data.profile.logoUrl ? (
              <img
                src={data.profile.logoUrl}
                alt={data.profile.displayName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl mx-auto mb-6"
                data-testid="img-company-logo"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: styles.headerText }}>
              {heading}
            </h1>
            <p className="text-lg opacity-90 max-w-xl mx-auto leading-relaxed" style={{ color: styles.headerText }}>
              {subtext}
            </p>
            {data.company.category && (
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.2)', color: styles.headerText }}>
                {data.company.category}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative" style={{ background: styles.heroBg }}>
          <div className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
            {data.profile.logoUrl ? (
              <img
                src={data.profile.logoUrl}
                alt={data.profile.displayName}
                className="w-20 h-20 rounded-2xl object-cover border shadow-sm mx-auto mb-6"
                data-testid="img-company-logo"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {heading}
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              {subtext}
            </p>
            {data.company.category && (
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                {data.company.category}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 pb-16 space-y-6">
        {/* About Card */}
        {data.profile.bio && (
          <div className="rounded-2xl p-6 shadow-sm border border-gray-100" style={{ background: styles.cardBg }}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">About</h2>
            <p className="text-gray-700 leading-relaxed">{data.profile.bio}</p>
            {(data.profile.socialLinks?.website || data.profile.socialLinks?.linkedin) && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                {data.profile.socialLinks?.website && (
                  <a href={data.profile.socialLinks.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:underline" style={{ color: theme.primaryColor }}
                    data-testid="link-website">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {data.profile.socialLinks?.linkedin && (
                  <a href={data.profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:underline" style={{ color: theme.primaryColor }}
                    data-testid="link-linkedin">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BENEFITS.map((b, i) => (
            <div key={i} className="rounded-2xl p-5 shadow-sm border border-gray-100" style={{ background: styles.cardBg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${theme.primaryColor}12` }}>
                <b.icon className="h-5 w-5" style={{ color: theme.primaryColor }} />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{b.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Card */}
        <div className="rounded-2xl p-8 shadow-sm border border-gray-100 text-center" style={{ background: styles.cardBg }}>
          {!isLoggedIn ? (
            <>
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: `${theme.primaryColor}12` }}>
                <Users className="h-7 w-7" style={{ color: theme.primaryColor }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to join?</h2>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Create an account or sign in to submit your application.
              </p>
              <div className="flex gap-3 max-w-sm mx-auto">
                <Button
                  onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  data-testid="button-login"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate("/signup?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                  size="lg"
                  className="flex-1 text-white"
                  style={{ background: theme.primaryColor }}
                  data-testid="button-register"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: `${theme.primaryColor}12` }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: theme.primaryColor }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You're ready!</h2>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Click below to send your application. Your company profile will be shared with {data.profile.displayName}.
              </p>
              <Button
                onClick={() => joinBase.mutate()}
                disabled={joinBase.isPending}
                size="lg"
                className="w-full max-w-sm text-white"
                style={{ background: theme.primaryColor }}
                data-testid="button-join-base"
              >
                {joinBase.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    {ctaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-3">
                Your company details will be shared for review
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-semibold" style={{ color: theme.primaryColor }}>Bid</span>
          </p>
        </div>
      </div>
    </div>
  );
}
