import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  MapPin, Globe, Linkedin, Twitter, Instagram, Link2, BadgeCheck,
  MessageCircle, Lock, Pencil, X, LayoutDashboard, Send,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { BidLogo } from "@/components/brand/BidLogo";
import InviteToTenderModal from "@/components/InviteToTenderModal";

// ═══════════════════════════════════════════════════════════════════
// Minimal, social-style profile for individual accounts.
// A respectable personal introduction page — header, avatar, name,
// @handle, field, short bio, external links, and a WhatsApp contact.
// Deliberately excludes portfolio / stats / certifications / services.
// ═══════════════════════════════════════════════════════════════════

interface IndividualProfileData {
  company: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    city: string | null;
    accountType: string;
    verificationStatus: string;
    createdAt: string;
  };
  profile: {
    displayName: string;
    bio: string | null;
    logoUrl: string | null;
    headerUrl: string | null;
    socialLinks: Record<string, string | undefined> | null;
    whatsappNumber: string | null;
    whatsappVisibility?: string;
    whatsappLocked?: boolean;
  } | null;
}

const LINK_PROVIDERS: Record<string, { label: string; Icon: any }> = {
  website: { label: "Website", Icon: Globe },
  linkedin: { label: "LinkedIn", Icon: Linkedin },
  twitter: { label: "X", Icon: Twitter },
  x: { label: "X", Icon: Twitter },
  instagram: { label: "Instagram", Icon: Instagram },
  behance: { label: "Behance", Icon: Link2 },
};

function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function waLink(number: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}`;
}

function formatMemberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Simple full-screen image viewer.
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
      data-testid="image-lightbox"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl"
      />
    </div>
  );
}

export default function IndividualProfilePage({ data }: { data: IndividualProfileData }) {
  const { user, activeCompany } = useAuthStore();
  const { t } = useI18n();
  const { company, profile } = data;
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const isOwner = activeCompany?.id === company.id;
  const isLoggedIn = !!user;
  const isCompanyViewer = (activeCompany as any)?.accountType === "company";
  const isVerified = company.verificationStatus === "verified";
  const displayName = profile?.displayName || company.name;
  const memberSince = formatMemberSince(company.createdAt);

  const links = useMemo(() => {
    const s = profile?.socialLinks || {};
    return Object.entries(s)
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
      .map(([key, v]) => {
        const meta = LINK_PROVIDERS[key.toLowerCase()] || { label: key, Icon: Link2 };
        return { key, href: normalizeUrl(v as string), ...meta };
      });
  }, [profile?.socialLinks]);

  const whatsappNumber = profile?.whatsappNumber || null;
  const whatsappLocked = !!profile?.whatsappLocked;

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* ── Branded top bar ── */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="Bid home">
            <BidLogo variant="orange" size={30} className="cursor-pointer hover:opacity-80 transition-opacity" />
          </Link>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <a
                href="/company/edit"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground bg-card border border-border rounded-full px-3.5 py-1.5 hover:bg-muted transition-colors"
                data-testid="link-edit-profile"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('indProfile.editProfile')}
              </a>
            ) : isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#FE3C01] hover:bg-[#1A1613] rounded-full px-4 py-1.5 transition-colors"
                data-testid="link-dashboard"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                {t('indProfile.dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center text-sm font-medium text-foreground rounded-full px-3.5 py-1.5 hover:bg-muted transition-colors"
                  data-testid="link-login"
                >
                  {t('indProfile.login')}
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center text-sm font-medium text-white bg-[#FE3C01] hover:bg-[#1A1613] rounded-full px-4 py-1.5 transition-colors"
                  data-testid="link-signup"
                >
                  {t('indProfile.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Profile card ── */}
      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 sm:px-6 py-8">
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          {/* Header banner */}
          <div
            className={`h-44 sm:h-56 w-full ${profile?.headerUrl ? "cursor-zoom-in" : ""}`}
            onClick={() => profile?.headerUrl && setLightbox(profile.headerUrl)}
          >
            {profile?.headerUrl ? (
              <img src={profile.headerUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "radial-gradient(120% 120% at 20% 10%, #FCE9DC 0%, #F4EDE1 55%, #EFE7DA 100%)" }}
              />
            )}
          </div>

          <div className="px-5 sm:px-8 pb-8">
            {/* Avatar */}
            <div className="-mt-14 relative inline-block">
              <button
                type="button"
                onClick={() => profile?.logoUrl && setLightbox(profile.logoUrl)}
                className={`w-28 h-28 rounded-full ring-4 ring-card bg-muted overflow-hidden shadow-sm flex items-center justify-center ${profile?.logoUrl ? "cursor-zoom-in hover:opacity-95 transition-opacity" : "cursor-default"}`}
                aria-label={profile?.logoUrl ? t('indProfile.viewPhoto') : undefined}
                data-testid="profile-avatar"
              >
                {profile?.logoUrl ? (
                  <img src={profile.logoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground select-none">
                    {initialsOf(displayName)}
                  </span>
                )}
              </button>
            </div>

            {/* Identity */}
            <div className="mt-4">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-black text-2xl sm:text-3xl tracking-[-0.03em] text-foreground">
                  {displayName}
                </h1>
                {isVerified && (
                  <BadgeCheck className="h-5 w-5 text-[#FE3C01] flex-shrink-0" aria-label={t('indProfile.verified')} />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">@{company.slug}</p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                {company.category && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FE3C01]" />
                    {company.category}
                  </span>
                )}
                {company.city && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {company.city}
                  </span>
                )}
              </div>
            </div>

            {/* Company action — invite this individual to a tender */}
            {isCompanyViewer && (
              <div className="mt-5">
                <button
                  onClick={() => setInviteOpen(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#FE3C01] hover:bg-[#1A1613] rounded-full px-5 py-2.5 transition-colors"
                  data-testid="button-invite-to-tender"
                >
                  <Send className="h-4 w-4" />
                  {t('inviteTender.button')}
                </button>
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <p className="mt-5 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            {/* External links */}
            {links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {links.map(({ key, href, label, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-muted/60 border border-border rounded-full px-3.5 py-2 hover:border-foreground/30 hover:bg-muted transition-all"
                    data-testid={`link-social-${key}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                ))}
              </div>
            )}

            {/* WhatsApp */}
            {(whatsappNumber || whatsappLocked) && (
              <div className="mt-6 pt-6 border-t border-border">
                {whatsappNumber ? (
                  <a
                    href={waLink(whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#25D366] hover:brightness-95 rounded-full px-5 py-2.5 transition-all"
                    data-testid="link-whatsapp"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('indProfile.messageWhatsapp')}
                  </a>
                ) : (
                  <div
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/60 border border-dashed border-border rounded-full px-4 py-2.5"
                    data-testid="whatsapp-locked"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {t('indProfile.whatsappLocked')}
                  </div>
                )}
                {isOwner && whatsappNumber && (
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    {profile?.whatsappVisibility === "public"
                      ? t('indProfile.whatsappPublicNote')
                      : t('indProfile.whatsappRequestersNote')}
                  </p>
                )}
              </div>
            )}

            {memberSince && (
              <p className="mt-6 text-xs text-muted-foreground">{t('indProfile.onBidSince', { date: memberSince })}</p>
            )}
          </div>
        </div>

        {/* Logged-out CTA — chrome, not profile content */}
        {!isLoggedIn && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('indProfile.wantProfile')}{" "}
              <Link href="/signup" className="font-medium text-[#FE3C01] hover:underline">
                {t('indProfile.joinBid')}
              </Link>
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <BidLogo variant="orange" size={18} />
            <span>· {t('indProfile.tagline')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t('indProfile.privacy')}</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t('indProfile.terms')}</Link>
          </div>
        </div>
      </footer>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {isCompanyViewer && (
        <InviteToTenderModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          individualCompanyId={company.id}
          individualName={displayName}
        />
      )}
    </div>
  );
}
