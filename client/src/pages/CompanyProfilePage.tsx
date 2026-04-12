import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Building2, MapPin, Briefcase, ShieldCheck, Globe, Linkedin, Twitter,
  FileText, ArrowLeft, AlertCircle, Clock, CheckCircle2, ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface CompanyProfileData {
  company: {
    id: string;
    name: string;
    slug: string;
    legalName: string;
    category: string | null;
    city: string | null;
    verificationStatus: string;
    certifications: string[];
  };
  profile: {
    displayName: string;
    bio: string | null;
    tags: string[];
    logoUrl: string | null;
    headerUrl: string | null;
    brochureUrl: string | null;
    socialLinks: { website?: string; linkedin?: string; twitter?: string } | null;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════

function VerificationBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Verified
      </span>
    );
  }
  if (status === 'under_review') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-blue-50 text-blue-600">
        <Clock className="h-3 w-3" /> Under Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-gray-100 text-gray-500">
      <AlertCircle className="h-3 w-3" /> Not Verified
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <Skeleton className="h-5 w-24" />
      </nav>
      <div className="relative">
        <Skeleton className="w-full h-52 md:h-64" />
        <div className="max-w-[900px] mx-auto px-6 -mt-12 relative z-10">
          <Skeleton className="w-24 h-24 rounded-2xl" />
          <Skeleton className="h-8 w-64 mt-4" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
      </div>
      <div className="max-w-[900px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════

export default function CompanyProfilePage() {
  const [, params] = useRoute("/company/:slug");
  const slug = params?.slug;

  const { data, isLoading, error } = useQuery<CompanyProfileData>({
    queryKey: ['/api/companies/by-slug', slug, 'profile'],
    queryFn: () => apiRequest('GET', `/api/companies/by-slug/${slug}/profile`).then(r => r.json()),
    enabled: !!slug,
  });

  if (isLoading) return <ProfileSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Company Not Found</h1>
          <p className="text-sm text-gray-500 max-w-sm">
            This company profile doesn't exist or has been removed.
          </p>
          <button
            onClick={() => window.close()}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Close this tab
          </button>
        </div>
      </div>
    );
  }

  const { company, profile } = data;
  const displayName = profile?.displayName || company.name;
  const initials = displayName.slice(0, 2).toUpperCase();
  const hasSocialLinks = profile?.socialLinks?.website || profile?.socialLinks?.linkedin || profile?.socialLinks?.twitter;
  const hasTags = profile?.tags && profile.tags.length > 0;
  const hasCertifications = company.certifications && company.certifications.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ══════════════════════ TOP NAV ══════════════════════ */}
      <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-gray-900">Company Profile</span>
        </div>
      </nav>

      {/* ══════════════════════ HERO HEADER ══════════════════════ */}
      <div className="relative overflow-hidden">
        {profile?.headerUrl ? (
          <div className="h-52 md:h-64 w-full">
            <img
              src={profile.headerUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ) : (
          <div
            className="h-52 md:h-64 w-full"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          />
        )}

        {/* ══════════════════════ IDENTITY BLOCK ══════════════════════ */}
        <div className="max-w-[900px] mx-auto px-6 relative z-10 -mt-14">
          <div className="flex items-end gap-5">
            {/* Logo */}
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={displayName}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg flex-shrink-0 bg-white"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg flex-shrink-0 bg-white flex items-center justify-center text-2xl font-extrabold text-gray-400 tracking-wide">
                {initials}
              </div>
            )}
          </div>

          {/* Name + badges */}
          <div className="mt-4 mb-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-[-0.02em]">
              {displayName}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <VerificationBadge status={company.verificationStatus} />
              {company.category && (
                <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <Briefcase className="h-3 w-3 flex-shrink-0" />{company.category}
                </span>
              )}
              {company.city && (
                <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <MapPin className="h-3 w-3 flex-shrink-0" />{company.city}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════ MAIN CONTENT ══════════════════════ */}
      <div className="max-w-[900px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* About */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-3">
                About
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {profile?.bio || "This company hasn't added a description yet."}
              </p>
            </div>

            {/* Capabilities / Tags */}
            {hasTags && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-3">
                  Capabilities
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {profile!.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold rounded-full px-3 py-1 bg-gray-50 text-gray-700 border border-gray-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {hasCertifications && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-3">
                  Certifications
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {company.certifications.map((cert, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Company Brochure */}
            {profile?.brochureUrl && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-3">
                  Company Brochure
                </h2>
                <a
                  href={profile.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  View Company Profile
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                </a>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="md:sticky md:top-20 space-y-4">

            {/* Quick Info Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                {profile?.logoUrl ? (
                  <img src={profile.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                  {company.legalName && company.legalName !== displayName && (
                    <p className="text-[11px] text-gray-400 truncate">{company.legalName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {company.category && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-500">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>{company.category}</span>
                  </div>
                )}
                {company.city && (
                  <div className="flex items-center gap-2.5 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span>{company.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links Card */}
            {hasSocialLinks && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-3">
                  Connect
                </h3>
                <div className="space-y-2">
                  {profile?.socialLinks?.website && (
                    <a
                      href={profile.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs font-semibold text-gray-600 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  )}
                  {profile?.socialLinks?.linkedin && (
                    <a
                      href={profile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs font-semibold text-gray-600 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  )}
                  {profile?.socialLinks?.twitter && (
                    <a
                      href={profile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-xs font-semibold text-gray-600 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <Twitter className="h-3.5 w-3.5" /> X / Twitter
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <div className="border-t border-gray-100 py-6 px-6">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <span className="text-xs text-gray-300">
            Powered by <strong className="text-gray-400">Bid</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
