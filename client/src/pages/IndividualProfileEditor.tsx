import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Camera, ImageIcon, Globe, Linkedin, Twitter,
  Instagram, Link2, Check, Users, Eye,
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
  company: { id: string; slug: string; category: string | null; accountType: string };
  profile: {
    displayName: string;
    bio: string | null;
    logoUrl: string | null;
    headerUrl: string | null;
    socialLinks: Record<string, string | undefined> | null;
    whatsappNumber: string | null;
    whatsappVisibility?: string;
  } | null;
}

export default function IndividualProfileEditor() {
  const [location, navigate] = useLocation();
  const isOnboarding = location.startsWith("/onboarding");
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
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
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
    } catch {
      toast({ title: "Upload failed", description: "Could not upload your photo.", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const onPickHeader = async (file: File) => {
    setUploading("header");
    try {
      const { url } = await uploadImage("/api/company/header", file);
      setHeaderUrl(url);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload your header.", variant: "destructive" });
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
      toast({ title: "Profile saved", description: "Your profile has been updated." });
      navigate("/dashboard");
    },
    onError: (e: any) => {
      toast({ title: "Couldn't save", description: e.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!displayName.trim()) {
      toast({ title: "Display name required", variant: "destructive" });
      return;
    }
    if (username.trim().length < 3) {
      toast({ title: "Username too short", description: "Use at least 3 characters.", variant: "destructive" });
      return;
    }
    if (!whatsappNumber.trim()) {
      toast({ title: "WhatsApp number required", description: "Add a WhatsApp number so requesters can reach you.", variant: "destructive" });
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
            Back
          </button>
        )}
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-profile" className="bg-[#FE3C01] hover:bg-[#1A1613] text-white">
          {saveMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
          ) : (
            <><Check className="h-4 w-4 mr-2" />{isOnboarding ? "Create profile" : "Save"}</>
          )}
        </Button>
      </nav>

      <div className="max-w-[620px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isOnboarding && (
          <div className="text-center pt-2 pb-1">
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-[-0.03em] text-foreground">
              Create your profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              This is how requesters and companies will see you on Bid. You can refine it anytime.
            </p>
          </div>
        )}
        {/* Media */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="relative h-40 sm:h-48 bg-muted">
            {headerUrl ? (
              <img src={headerUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: "radial-gradient(120% 120% at 20% 10%, #FCE9DC 0%, #F4EDE1 55%, #EFE7DA 100%)" }} />
            )}
            <button
              onClick={() => headerInputRef.current?.click()}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs font-medium bg-card/90 border border-border rounded-full px-3 py-1.5 hover:bg-card transition-colors"
              data-testid="button-upload-header"
            >
              {uploading === "header" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              Header
            </button>
            <input ref={headerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickHeader(f); e.currentTarget.value = ""; }} />
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-10 relative w-20 h-20">
              <div className="w-20 h-20 rounded-full ring-4 ring-card bg-muted overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
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
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="mt-1.5" data-testid="input-display-name" />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <div className="mt-1.5 flex items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
              <span className="pl-3 pr-1 text-sm text-muted-foreground select-none">@</span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-handle"
                className="flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
                data-testid="input-username"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Your public profile lives at /company/{username || "your-handle"}</p>
          </div>
          <div>
            <Label>Field / Industry</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5" data-testid="select-category">
                <SelectValue placeholder="Select your field" />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bio">Short bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 400))} placeholder="A short, professional introduction." rows={3} className="mt-1.5" data-testid="input-bio" />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/400</p>
          </div>
        </div>

        {/* External links */}
        <div className="bg-card rounded-3xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">External links</h2>
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
            <h2 className="text-sm font-semibold text-foreground">WhatsApp contact <span className="text-[#FE3C01]">*</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5">Required. Include country code, e.g. +9665XXXXXXXX.</p>
          </div>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+966 5X XXX XXXX"
            data-testid="input-whatsapp"
          />
          <div className="space-y-2">
            <Label>Who can see it</Label>
            <button
              type="button"
              onClick={() => setWhatsappVisibility("requesters")}
              className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${whatsappVisibility === "requesters" ? "border-[#FE3C01] bg-[#FE3C01]/[0.04]" : "border-border hover:border-foreground/20"}`}
              data-testid="whatsapp-vis-requesters"
            >
              <Users className={`h-4 w-4 mt-0.5 ${whatsappVisibility === "requesters" ? "text-[#FE3C01]" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium text-foreground">Requesters I apply to</p>
                <p className="text-xs text-muted-foreground">Only companies whose tenders you apply to can see your number.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setWhatsappVisibility("public")}
              className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${whatsappVisibility === "public" ? "border-[#FE3C01] bg-[#FE3C01]/[0.04]" : "border-border hover:border-foreground/20"}`}
              data-testid="whatsapp-vis-public"
            >
              <Eye className={`h-4 w-4 mt-0.5 ${whatsappVisibility === "public" ? "text-[#FE3C01]" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium text-foreground">Everyone</p>
                <p className="text-xs text-muted-foreground">Shown publicly on your profile as a contact link.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
