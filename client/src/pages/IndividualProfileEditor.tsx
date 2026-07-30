import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Camera, ImageIcon, Globe, Linkedin, Twitter,
  Instagram, Link2, Check, Users, Eye, ShieldAlert,
} from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";

// ═══════════════════════════════════════════════════════════════════
// Minimal editor for individual profiles. Mirrors the clean, social-style
// public page: avatar, header, name, @username, field, short bio, external
// links, and a mandatory WhatsApp number with a visibility choice.
// No portfolio / stats / certifications / services.
// ═══════════════════════════════════════════════════════════════════

const SOCIAL_FIELDS: { key: string; label: string; Icon: any; placeholder: string }[] = [
  { key: "website", label: "Website", Icon: Globe, placeholder: "yoursite.com" },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, placeholder: "linkedin.com/in/you" },
  { key: "twitter", label: "X (Twitter)", Icon: Twitter, placeholder: "x.com/you" },
  { key: "instagram", label: "Instagram", Icon: Instagram, placeholder: "instagram.com/you" },
  { key: "behance", label: "Behance", Icon: Link2, placeholder: "behance.net/you" },
];

interface ProfileResponse {
  company: { id: string; slug: string; category: string | null; accountType: string; verificationStatus: string };
  profile: {
    displayName: string;
    bio: string | null;
    logoUrl: string | null;
    headerUrl: string | null;
    socialLinks: Record<string, string | undefined> | null;
    whatsappNumber: string | null;
    whatsappVisibility?: string;
    discoverable?: boolean;
  } | null;
}

export default function IndividualProfileEditor() {
  const [location, navigate] = useLocation();
  const isOnboarding = location.startsWith("/onboarding");
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const activeCompanyId = activeCompany?.id;

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [social, setSocial] = useState<Record<string, string>>({});
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappVisibility, setWhatsappVisibility] = useState<"requesters" | "public">("requesters");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [headerBroken, setHeaderBroken] = useState(false);
  const [showInDiscovery, setShowInDiscovery] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [uploading, setUploading] = useState<null | "avatar" | "header">(null);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { data, isLoading } = useQuery<ProfileResponse>({
    queryKey: ["/api/companies", activeCompanyId, "profile"],
    queryFn: () => apiRequest("GET", `/api/companies/${activeCompanyId}/profile`).then((r) => r.json()),
    enabled: !!activeCompanyId,
  });

  // Seed local state once the profile loads.
  const seeded = useRef(false);
  useEffect(() => {
    if (data && !seeded.current) {
      seeded.current = true;
      setDisplayName(data.profile?.displayName || "");
      setUsername(data.company.slug || "");
      setCategory(data.company.category || "");
      setBio(data.profile?.bio || "");
      const links = data.profile?.socialLinks || {};
      setSocial(Object.fromEntries(Object.entries(links).filter(([, v]) => !!v)) as Record<string, string>);
      setWhatsappNumber(data.profile?.whatsappNumber || "");
      setWhatsappVisibility((data.profile?.whatsappVisibility as any) === "public" ? "public" : "requesters");
      setAvatarUrl(data.profile?.logoUrl || null);
      setHeaderUrl(data.profile?.headerUrl || null);
      setIsVerified(data.company.verificationStatus === "verified");
      setShowInDiscovery(data.company.verificationStatus === "verified" && data.profile?.discoverable !== false);
    }
  }, [data]);

  const uploadImage = async (endpoint: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<{ url: string }>;
  };

  const onPickAvatar = async (file: File) => {
    setUploading("avatar");
    try {
      const { url } = await uploadImage("/api/company/logo", file);
      setAvatarUrl(url);
      setAvatarBroken(false);
    } catch {
      toast({ title: t('profEditor.uploadFailed'), description: t('profEditor.uploadPhotoFailed'), variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const onPickHeader = async (file: File) => {
    setUploading("header");
    try {
      const { url } = await uploadImage("/api/company/header", file);
      setHeaderUrl(url);
      setHeaderBroken(false);
    } catch {
      toast({ title: t('profEditor.uploadFailed'), description: t('profEditor.uploadHeaderFailed'), variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/companies/${activeCompanyId}/profile`, {
        displayName: displayName.trim(),
        slug: username.trim(),
        category: category || undefined,
        bio: bio.trim(),
        socialLinks: Object.fromEntries(
          SOCIAL_FIELDS.map((f) => [f.key, social[f.key]?.trim() || undefined]),
        ),
        whatsappNumber: whatsappNumber.trim(),
        whatsappVisibility,
        discoverable: isVerified ? showInDiscovery : false,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: async () => {
      await checkAuth(); // slug may have changed → refresh workspace
      queryClient.invalidateQueries({ queryKey: ["/api/companies", activeCompanyId, "profile"] });
      if (isOnboarding) {
        // First-time setup complete — individuals go straight to the dashboard.
        toast({ title: t('profEditor.createdTitle'), description: t('profEditor.createdDesc') });
        navigate("/dashboard");
      } else {
        toast({ title: t('profEditor.savedTitle'), description: t('profEditor.savedDesc') });
        navigate("/dashboard");
      }
    },
    onError: (e: any) => {
      toast({ title: t('profEditor.couldntSave'), description: e.message || t('profEditor.tryAgain'), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!displayName.trim()) {
      toast({ title: t('profEditor.errName'), variant: "destructive" });
      return;
    }
    if (username.trim().length < 3) {
      toast({ title: t('profEditor.errUsername'), description: t('profEditor.errUsernameDesc'), variant: "destructive" });
      return;
    }
    if (!whatsappNumber.trim()) {
      toast({ title: t('profEditor.errWhatsapp'), description: t('profEditor.errWhatsappDesc'), variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <nav className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        {isOnboarding ? (
          <BidLogo variant="orange" size={26} />
        ) : (
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('profEditor.back')}
          </button>
        )}
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-profile" className="bg-[#FE3C01] hover:bg-[#1A1613] text-white">
          {saveMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isOnboarding ? t('indBasics.creating') : t('profEditor.save')}</>
          ) : (
            <><Check className="h-4 w-4 mr-2" />{isOnboarding ? t('profEditor.createProfile') : t('profEditor.save')}</>
          )}
        </Button>
      </nav>

      <div className="max-w-[620px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isOnboarding && (
          <div className="text-center pt-2 pb-1">
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-[-0.03em] text-foreground">
              {t('profEditor.createHeading')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {t('profEditor.createSubtitle')}
            </p>
          </div>
        )}
        {/* Media */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="relative h-40 sm:h-48 bg-muted">
            {headerUrl && !headerBroken ? (
              <img src={headerUrl} alt="" className="w-full h-full object-cover" onError={() => setHeaderBroken(true)} />
            ) : (
              <div className="w-full h-full" style={{ background: "radial-gradient(120% 120% at 20% 10%, #FCE9DC 0%, #F4EDE1 55%, #EFE7DA 100%)" }} />
            )}
            <button
              onClick={() => headerInputRef.current?.click()}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs font-medium bg-card/90 border border-border rounded-full px-3 py-1.5 hover:bg-card transition-colors"
              data-testid="button-upload-header"
            >
              {uploading === "header" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              {t('profEditor.header')}
            </button>
            <input ref={headerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickHeader(f); e.currentTarget.value = ""; }} />
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-10 relative w-20 h-20">
              <div className="w-20 h-20 rounded-full ring-4 ring-card bg-muted overflow-hidden flex items-center justify-center">
                {avatarUrl && !avatarBroken ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setAvatarBroken(true)} />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FE3C01] text-white flex items-center justify-center shadow-sm hover:brightness-95"
                data-testid="button-upload-avatar"
              >
                {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickAvatar(f); e.currentTarget.value = ""; }} />
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
          <div>
            <Label htmlFor="displayName">{t('profEditor.displayName')}</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('profEditor.displayNamePlaceholder')} className="mt-1.5" data-testid="input-display-name" />
          </div>
          <div>
            <Label htmlFor="username">{t('profEditor.username')}</Label>
            <div className="mt-1.5 flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
              <span className="pl-3 pr-1 text-sm text-muted-foreground select-none">@</span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-handle"
                className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
                dir="ltr"
                data-testid="input-username"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('profEditor.usernameHelp', { handle: username || "your-handle" })}</p>
          </div>
          <div>
            <Label>{t('profEditor.fieldIndustry')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5" data-testid="select-category">
                <SelectValue placeholder={t('profEditor.selectField')} />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio">{t('profEditor.shortBio')}</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 400))} placeholder={t('profEditor.bioPlaceholder')} rows={3} className="mt-1.5" data-testid="input-bio" />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/400</p>
          </div>
        </div>

        {/* External links */}
        <div className="bg-card rounded-3xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t('profEditor.externalLinks')}</h2>
          {SOCIAL_FIELDS.map(({ key, label, Icon, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <Input
                  value={social[key] || ""}
                  onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={placeholder}
                  aria-label={label}
                  data-testid={`input-social-${key}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp */}
        <div className="bg-card rounded-3xl border border-border p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('profEditor.whatsappContact')} <span className="text-[#FE3C01]">*</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profEditor.whatsappRequired')}</p>
          </div>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+966 5X XXX XXXX"
            dir="ltr"
            data-testid="input-whatsapp"
          />
          <div className="space-y-2">
            <Label>{t('profEditor.whoCanSee')}</Label>
            <button
              type="button"
              onClick={() => setWhatsappVisibility("requesters")}
              className={`w-full flex items-start gap-3 rounded-xl border p-3 text-start transition-colors ${whatsappVisibility === "requesters" ? "border-[#FE3C01] bg-[#FE3C01]/[0.04]" : "border-border hover:border-foreground/20"}`}
              data-testid="whatsapp-vis-requesters"
            >
              <Users className={`h-4 w-4 mt-0.5 ${whatsappVisibility === "requesters" ? "text-[#FE3C01]" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium text-foreground">{t('profEditor.visRequesters')}</p>
                <p className="text-xs text-muted-foreground">{t('profEditor.visRequestersDesc')}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setWhatsappVisibility("public")}
              className={`w-full flex items-start gap-3 rounded-xl border p-3 text-start transition-colors ${whatsappVisibility === "public" ? "border-[#FE3C01] bg-[#FE3C01]/[0.04]" : "border-border hover:border-foreground/20"}`}
              data-testid="whatsapp-vis-public"
            >
              <Eye className={`h-4 w-4 mt-0.5 ${whatsappVisibility === "public" ? "text-[#FE3C01]" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium text-foreground">{t('profEditor.visEveryone')}</p>
                <p className="text-xs text-muted-foreground">{t('profEditor.visEveryoneDesc')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Discovery visibility */}
        <div className="bg-card rounded-3xl border border-border p-5" data-testid="card-discovery-visibility">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('profEditor.discoveryVisibility')}</h2>
              <Label htmlFor="show-in-discovery" className={`block text-sm font-medium mt-2 ${isVerified ? "text-foreground cursor-pointer" : "text-muted-foreground"}`}>
                {t('profEditor.showInDiscovery')}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('profEditor.showInDiscoveryDesc')}</p>
            </div>
            <Switch
              id="show-in-discovery"
              checked={showInDiscovery}
              onCheckedChange={setShowInDiscovery}
              disabled={!isVerified}
              data-testid="switch-show-in-discovery"
            />
          </div>
          {!isVerified && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-400">{t('profEditor.discoveryVerifyRequired')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
