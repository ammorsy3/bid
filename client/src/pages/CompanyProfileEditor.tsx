import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, MapPin, Briefcase, ShieldCheck, Globe, Linkedin, Twitter,
  FileText, ArrowLeft, AlertCircle, Clock, CheckCircle2, ExternalLink,
  Image, Upload, Save, Loader2, X, Plus, Monitor, Smartphone, Eye, Type, Link2,
  Tag,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface ProfileData {
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

interface EditState {
  displayName: string;
  bio: string;
  tags: string[];
  socialLinks: { website: string; linkedin: string; twitter: string };
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Verification Badge (mirrors CompanyProfilePage)
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

// ═══════════════════════════════════════════════════════════════════
// Main Editor
// ═══════════════════════════════════════════════════════════════════

export default function CompanyProfileEditor() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const activeCompanyId = activeCompany?.id;

  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [tagInput, setTagInput] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState>({
    displayName: '',
    bio: '',
    tags: [],
    socialLinks: { website: '', linkedin: '', twitter: '' },
  });

  // Auth guard
  if (!user) {
    navigate('/login');
    return null;
  }

  // Fetch profile data
  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['/api/companies', activeCompanyId, 'profile'],
    queryFn: () => apiRequest('GET', `/api/companies/${activeCompanyId}/profile`).then(r => r.json()),
    enabled: !!activeCompanyId,
  });

  // Seed edit state from fetched data
  useEffect(() => {
    if (data) {
      setEditState({
        displayName: data.profile?.displayName || data.company.name,
        bio: data.profile?.bio || '',
        tags: data.profile?.tags || [],
        socialLinks: {
          website: data.profile?.socialLinks?.website || '',
          linkedin: data.profile?.socialLinks?.linkedin || '',
          twitter: data.profile?.socialLinks?.twitter || '',
        },
      });
    }
  }, [data]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (state: EditState) => {
      const res = await apiRequest('PUT', `/api/companies/${activeCompanyId}/profile`, {
        displayName: state.displayName,
        bio: state.bio,
        tags: state.tags,
        socialLinks: {
          website: state.socialLinks.website || undefined,
          linkedin: state.socialLinks.linkedin || undefined,
          twitter: state.socialLinks.twitter || undefined,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Profile saved", description: "Your company profile has been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save profile changes.", variant: "destructive" });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/company/logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Logo updated" });
      setLogoPreview(null);
    },
    onError: () => {
      toast({ title: "Failed to upload logo", variant: "destructive" });
      setLogoPreview(null);
    },
  });

  const uploadHeaderMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/company/header', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Header image updated" });
      setHeaderPreview(null);
    },
    onError: () => {
      toast({ title: "Failed to upload header", variant: "destructive" });
      setHeaderPreview(null);
    },
  });

  const uploadBrochureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/company/brochure', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Brochure uploaded" });
    },
    onError: () => {
      toast({ title: "Failed to upload brochure", variant: "destructive" });
    },
  });

  // Tag helpers
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !editState.tags.includes(tag) && editState.tags.length < 15) {
      setEditState(s => ({ ...s, tags: [...s.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setEditState(s => ({ ...s, tags: s.tags.filter((_, i) => i !== index) }));
  };

  if (isLoading || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const { company } = data;
  const currentLogoUrl = logoPreview || data.profile?.logoUrl;
  const currentHeaderUrl = headerPreview || data.profile?.headerUrl;
  const currentBrochureUrl = data.profile?.brochureUrl;
  const displayName = editState.displayName || company.name;
  const initials = displayName.slice(0, 2).toUpperCase();
  const hasSocialLinks = editState.socialLinks.website || editState.socialLinks.linkedin || editState.socialLinks.twitter;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ══════════════════════ TOP BAR ══════════════════════ */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Settings</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-gray-900">Edit Company Profile</span>
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
            href={`/company/${company.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View Live
          </a>

          {/* Save */}
          <Button
            onClick={() => saveMutation.mutate(editState)}
            disabled={saveMutation.isPending}
            size="sm"
            className="h-8"
          >
            {saveMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving</>
              : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Changes</>
            }
          </Button>
        </div>
      </div>

      {/* ══════════════════════ MAIN: EDITOR + PREVIEW ══════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Editor Panel ── */}
        <ScrollArea className="w-[360px] flex-shrink-0 border-r border-gray-200 bg-gray-50">
          <div className="p-5 space-y-7">

            {/* ─── Logo ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Logo</h3>
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
                      {uploadLogoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                    </span>
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">200x200px, PNG or JPG</p>
                </div>
              </div>
            </section>

            {/* ─── Header Image ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Header Image</h3>
              </div>
              {(currentHeaderUrl) ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={currentHeaderUrl}
                    alt="Header"
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
                      {uploadHeaderMutation.isPending ? 'Uploading...' : 'Replace'}
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
                      {uploadHeaderMutation.isPending ? 'Uploading...' : 'Upload header image'}
                    </span>
                  </div>
                </label>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">1200x400px recommended</p>
            </section>

            {/* ─── Display Name ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Type className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Display Name</h3>
              </div>
              <Input
                value={editState.displayName}
                onChange={(e) => setEditState(s => ({ ...s, displayName: e.target.value }))}
                placeholder="Your company name"
                className="text-sm h-9"
                maxLength={100}
              />
            </section>

            {/* ─── Bio ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Type className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">About</h3>
              </div>
              <Textarea
                value={editState.bio}
                onChange={(e) => setEditState(s => ({ ...s, bio: e.target.value }))}
                placeholder="Tell potential clients about your company..."
                className="text-sm resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{editState.bio.length}/500</p>
            </section>

            {/* ─── Tags / Capabilities ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Capabilities</h3>
              </div>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add a capability..."
                  className="text-sm h-9 flex-1"
                  maxLength={40}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={!tagInput.trim() || editState.tags.length >= 15}
                  className="h-9 px-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {editState.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {editState.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-gray-700"
                    >
                      {tag}
                      <button onClick={() => removeTag(i)} className="hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">{editState.tags.length}/15 capabilities</p>
            </section>

            {/* ─── Company Brochure ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Company Brochure</h3>
              </div>
              {currentBrochureUrl && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">Brochure uploaded</span>
                  <a
                    href={currentBrochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex-shrink-0"
                  >
                    View
                  </a>
                </div>
              )}
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadBrochureMutation.mutate(file);
                  }}
                />
                <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {uploadBrochureMutation.isPending ? 'Uploading...' : (currentBrochureUrl ? 'Replace brochure' : 'Upload brochure')}
                  </span>
                </div>
              </label>
              <p className="text-[10px] text-gray-400 mt-1.5">PDF, JPG, or PNG (max 10MB)</p>
            </section>

            {/* ─── Social Links ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Social Links</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Website
                  </Label>
                  <Input
                    value={editState.socialLinks.website}
                    onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, website: e.target.value } }))}
                    placeholder="https://yourcompany.com"
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5">
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </Label>
                  <Input
                    value={editState.socialLinks.linkedin}
                    onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, linkedin: e.target.value } }))}
                    placeholder="https://linkedin.com/company/..."
                    className="text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5">
                    <Twitter className="h-3 w-3" /> X / Twitter
                  </Label>
                  <Input
                    value={editState.socialLinks.twitter}
                    onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, twitter: e.target.value } }))}
                    placeholder="https://x.com/..."
                    className="text-sm h-9"
                  />
                </div>
              </div>
            </section>

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

            {/* Preview: Header */}
            <div className="relative overflow-hidden">
              {currentHeaderUrl ? (
                <div className="h-44 md:h-52 w-full">
                  <img src={currentHeaderUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              ) : (
                <div
                  className="h-44 md:h-52 w-full"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                />
              )}

              {/* Identity */}
              <div className="max-w-[860px] mx-auto px-6 relative z-10 -mt-12">
                <div className="flex items-end gap-4">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt=""
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg flex-shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg flex-shrink-0 bg-white flex items-center justify-center text-xl font-extrabold text-gray-400 tracking-wide">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="mt-3 mb-2">
                  <h1 className="text-xl font-extrabold text-gray-900 tracking-[-0.02em]">
                    {displayName}
                  </h1>
                  <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                    <VerificationBadge status={company.verificationStatus} />
                    {company.category && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <Briefcase className="h-3 w-3" />{company.category}
                      </span>
                    )}
                    {company.city && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <MapPin className="h-3 w-3" />{company.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview: Content */}
            <div className="bg-gray-50">
              <div className="max-w-[860px] mx-auto px-5 py-6">
                <div className={`grid gap-5 items-start ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-[1fr_260px]'}`}>

                  {/* Left column */}
                  <div className="space-y-4">
                    {/* About */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">About</p>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {editState.bio || "This company hasn't added a description yet."}
                      </p>
                    </div>

                    {/* Tags */}
                    {editState.tags.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">Capabilities</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {editState.tags.map((tag, i) => (
                            <span key={i} className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Brochure */}
                    {currentBrochureUrl && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">Company Brochure</p>
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200">
                          <FileText className="h-3.5 w-3.5" /> View Company Profile <ExternalLink className="h-3 w-3 text-gray-400" />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right sidebar */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2.5 mb-3">
                        {currentLogoUrl ? (
                          <img src={currentLogoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">{initials}</div>
                        )}
                        <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
                      </div>
                      <div className="space-y-2">
                        {company.category && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <Briefcase className="h-3 w-3 text-gray-400" />{company.category}
                          </div>
                        )}
                        {company.city && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <MapPin className="h-3 w-3 text-gray-400" />{company.city}
                          </div>
                        )}
                      </div>
                    </div>

                    {hasSocialLinks && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">Connect</p>
                        <div className="space-y-1.5">
                          {editState.socialLinks.website && (
                            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-100">
                              <Globe className="h-3 w-3" /> Website
                            </span>
                          )}
                          {editState.socialLinks.linkedin && (
                            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-100">
                              <Linkedin className="h-3 w-3" /> LinkedIn
                            </span>
                          )}
                          {editState.socialLinks.twitter && (
                            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-100">
                              <Twitter className="h-3 w-3" /> X / Twitter
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview: Footer */}
            <div className="bg-gray-50 border-t border-gray-100 py-4 px-6">
              <div className="max-w-[860px] mx-auto">
                <span className="text-[10px] text-gray-300">Powered by <strong className="text-gray-400">Bid</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
