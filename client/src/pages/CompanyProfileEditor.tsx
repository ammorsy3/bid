import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageCropDialog from "@/components/ImageCropDialog";
import {
  Building2, MapPin, Briefcase, Globe, Linkedin, Twitter,
  FileText, ArrowLeft, AlertCircle, Clock, CheckCircle2, ExternalLink,
  Image, Upload, Save, Loader2, X, Plus, Monitor, Smartphone, Eye, Type, Link2,
  Tag, Users, Trash2, ImagePlus,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface PortfolioItem {
  title: string;
  description?: string;
  imageUrl: string;
}

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
    logoOriginalUrl: string | null;
    headerUrl: string | null;
    headerOriginalUrl: string | null;
    brochureUrl: string | null;
    companySize: string | null;
    portfolio: PortfolioItem[];
    socialLinks: { website?: string; linkedin?: string; twitter?: string } | null;
  } | null;
}

interface EditState {
  displayName: string;
  bio: string;
  tags: string[];
  companySize: string;
  portfolio: PortfolioItem[];
  socialLinks: { website: string; linkedin: string; twitter: string };
}

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

// ═══════════════════════════════════════════════════════════════════
// Helper: Verification Badge
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

  // Image crop state
  const [cropDialog, setCropDialog] = useState<{
    open: boolean;
    imageSrc: string;
    aspect: number;
    target: 'logo' | 'header';
    pendingOriginal: File | null;
  }>({ open: false, imageSrc: '', aspect: 1, target: 'logo', pendingOriginal: null });

  // Portfolio add form
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');

  const [editState, setEditState] = useState<EditState>({
    displayName: '',
    bio: '',
    tags: [],
    companySize: '',
    portfolio: [],
    socialLinks: { website: '', linkedin: '', twitter: '' },
  });

  // Track saved state for dirty detection
  const [savedState, setSavedState] = useState<string>('');
  const isDirty = useMemo(() => {
    if (!savedState) return false;
    return JSON.stringify(editState) !== savedState;
  }, [editState, savedState]);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Auth guard
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Fetch profile data
  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['/api/companies', activeCompanyId, 'profile'],
    queryFn: () => apiRequest('GET', `/api/companies/${activeCompanyId}/profile`).then(r => r.json()),
    enabled: !!activeCompanyId,
  });

  // Seed edit state from fetched data
  useEffect(() => {
    if (data) {
      const initial: EditState = {
        displayName: data.profile?.displayName || data.company.name,
        bio: data.profile?.bio || '',
        tags: data.profile?.tags || [],
        companySize: data.profile?.companySize || '',
        portfolio: data.profile?.portfolio || [],
        socialLinks: {
          website: data.profile?.socialLinks?.website || '',
          linkedin: data.profile?.socialLinks?.linkedin || '',
          twitter: data.profile?.socialLinks?.twitter || '',
        },
      };
      setEditState(initial);
      setSavedState(JSON.stringify(initial));
    }
  }, [data]);

  // ── Upload helpers ──
  const uploadFile = useCallback(async (endpoint: string, file: File | Blob, filename?: string) => {
    const formData = new FormData();
    formData.append('file', file, filename || (file instanceof File ? file.name : 'image.jpg'));
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }, []);

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async (state: EditState) => {
      const res = await apiRequest('PUT', `/api/companies/${activeCompanyId}/profile`, {
        displayName: state.displayName,
        bio: state.bio,
        tags: state.tags,
        companySize: state.companySize || null,
        portfolio: state.portfolio,
        socialLinks: {
          website: state.socialLinks.website || undefined,
          linkedin: state.socialLinks.linkedin || undefined,
          twitter: state.socialLinks.twitter || undefined,
        },
      });
      return res.json();
    },
    onSuccess: (_result, savedEditState) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      setSavedState(JSON.stringify(savedEditState));
      toast({ title: "Profile saved", description: "Your company profile has been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save profile changes.", variant: "destructive" });
    },
  });

  const uploadLogoOriginalMutation = useMutation({
    mutationFn: (file: File) => uploadFile('/api/company/logo?kind=original', file, file.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
    },
  });

  const uploadHeaderOriginalMutation = useMutation({
    mutationFn: (file: File) => uploadFile('/api/company/header?kind=original', file, file.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File | Blob) => uploadFile('/api/company/logo', file, 'logo.jpg'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Logo updated" });
      setLogoPreview((url) => { if (url) URL.revokeObjectURL(url); return null; });
    },
    onError: () => {
      toast({ title: "Failed to upload logo", variant: "destructive" });
      setLogoPreview((url) => { if (url) URL.revokeObjectURL(url); return null; });
    },
  });

  const uploadHeaderMutation = useMutation({
    mutationFn: (file: File | Blob) => uploadFile('/api/company/header', file, 'header.jpg'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Header image updated" });
      setHeaderPreview((url) => { if (url) URL.revokeObjectURL(url); return null; });
    },
    onError: () => {
      toast({ title: "Failed to upload header", variant: "destructive" });
      setHeaderPreview((url) => { if (url) URL.revokeObjectURL(url); return null; });
    },
  });

  const uploadBrochureMutation = useMutation({
    mutationFn: (file: File) => uploadFile('/api/company/brochure', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      toast({ title: "Brochure uploaded" });
    },
    onError: () => {
      toast({ title: "Failed to upload brochure", variant: "destructive" });
    },
  });

  const uploadPortfolioImageMutation = useMutation({
    mutationFn: (file: File) => uploadFile('/api/company/portfolio-image', file),
    onSuccess: (result) => {
      const title = portfolioTitle.trim();
      const desc = portfolioDesc.trim() || undefined;
      setEditState(s => ({
        ...s,
        portfolio: [...s.portfolio, { title, description: desc, imageUrl: result.url }],
      }));
      setPortfolioTitle('');
      setPortfolioDesc('');
      toast({ title: "Portfolio image added" });
    },
    onError: () => {
      toast({ title: "Failed to upload image", variant: "destructive" });
    },
  });

  // ── File validation ──
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const MAX_BROCHURE_BYTES = 10 * 1024 * 1024;

  const validateImage = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return false;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "File too large", description: "Images must be under 5MB.", variant: "destructive" });
      return false;
    }
    return true;
  };

  // ── Image crop handlers ──
  const handleFileForCrop = (file: File, target: 'logo' | 'header') => {
    if (!validateImage(file)) return;
    setCropDialog((prev) => {
      if (prev.imageSrc && prev.imageSrc.startsWith('blob:')) URL.revokeObjectURL(prev.imageSrc);
      return {
        open: true,
        imageSrc: URL.createObjectURL(file),
        aspect: target === 'logo' ? 1 : 3,
        target,
        pendingOriginal: file,
      };
    });
  };

  const handleEditExisting = (target: 'logo' | 'header') => {
    const src = target === 'logo'
      ? (data?.profile?.logoOriginalUrl || data?.profile?.logoUrl || null)
      : (data?.profile?.headerOriginalUrl || data?.profile?.headerUrl || null);
    if (!src) return;
    setCropDialog((prev) => {
      if (prev.imageSrc && prev.imageSrc.startsWith('blob:')) URL.revokeObjectURL(prev.imageSrc);
      return {
        open: true,
        imageSrc: src,
        aspect: target === 'logo' ? 1 : 3,
        target,
        pendingOriginal: null,
      };
    });
  };

  const handleCropComplete = useCallback((blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    if (cropDialog.target === 'logo') {
      setLogoPreview((old) => { if (old) URL.revokeObjectURL(old); return previewUrl; });
      if (cropDialog.pendingOriginal) uploadLogoOriginalMutation.mutate(cropDialog.pendingOriginal);
      uploadLogoMutation.mutate(blob);
    } else {
      setHeaderPreview((old) => { if (old) URL.revokeObjectURL(old); return previewUrl; });
      if (cropDialog.pendingOriginal) uploadHeaderOriginalMutation.mutate(cropDialog.pendingOriginal);
      uploadHeaderMutation.mutate(blob);
    }
    setCropDialog(s => {
      if (s.imageSrc && s.imageSrc.startsWith('blob:')) URL.revokeObjectURL(s.imageSrc);
      return { ...s, imageSrc: '', open: false, pendingOriginal: null };
    });
  }, [cropDialog.target, cropDialog.pendingOriginal, uploadLogoMutation, uploadHeaderMutation, uploadLogoOriginalMutation, uploadHeaderOriginalMutation]);

  // Revoke any remaining preview URLs on unmount
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (headerPreview) URL.revokeObjectURL(headerPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tag helpers ──
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

  const removePortfolioItem = (index: number) => {
    setEditState(s => ({ ...s, portfolio: s.portfolio.filter((_, i) => i !== index) }));
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
  const initials = Array.from(displayName.trim()).slice(0, 2).join('').toUpperCase();
  const hasSocialLinks = editState.socialLinks.website || editState.socialLinks.linkedin || editState.socialLinks.twitter;
  const sizeLabel = COMPANY_SIZES.find(s => s.value === editState.companySize)?.label;

  // Profile completeness
  const completenessItems = [
    { label: 'Logo', done: !!currentLogoUrl },
    { label: 'Header', done: !!currentHeaderUrl },
    { label: 'Display name', done: !!editState.displayName.trim() },
    { label: 'About', done: editState.bio.trim().length >= 10 },
    { label: 'Company size', done: !!editState.companySize },
    { label: 'Capabilities', done: editState.tags.length >= 1 },
    { label: 'Portfolio', done: editState.portfolio.length >= 1 },
    { label: 'Brochure', done: !!currentBrochureUrl },
    { label: 'Social links', done: !!(editState.socialLinks.website || editState.socialLinks.linkedin) },
  ];
  const completedCount = completenessItems.filter(i => i.done).length;
  const completenessPercent = Math.round((completedCount / completenessItems.length) * 100);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialog.open}
        onClose={() => setCropDialog(s => ({ ...s, open: false }))}
        imageSrc={cropDialog.imageSrc}
        aspect={cropDialog.aspect}
        title={cropDialog.target === 'logo' ? 'Edit Logo' : 'Edit Header Image'}
        onComplete={handleCropComplete}
        saving={uploadLogoMutation.isPending || uploadHeaderMutation.isPending}
      />

      {/* ══════════════════════ TOP BAR ══════════════════════ */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
              navigate('/settings');
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Settings</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <span className="text-sm font-semibold text-gray-900">Edit Company Profile</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setPreviewMode('desktop')}
              aria-label="Desktop preview"
              aria-pressed={previewMode === 'desktop'}
              className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              aria-label="Mobile preview"
              aria-pressed={previewMode === 'mobile'}
              className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <a
            href={`/company/${company.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View Live
          </a>

          <Button
            onClick={() => saveMutation.mutate(editState)}
            disabled={saveMutation.isPending || !isDirty}
            size="sm"
            className="h-8 relative"
          >
            {saveMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving</>
              : isDirty
                ? <><Save className="h-3.5 w-3.5 mr-1.5" />Save Changes</>
                : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Saved</>
            }
            {isDirty && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
            )}
          </Button>
        </div>
      </div>

      {/* ══════════════════════ MAIN: EDITOR + PREVIEW ══════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Editor Panel ── */}
        <ScrollArea className="w-[360px] flex-shrink-0 border-r border-gray-200 bg-gray-50">
          <div className="p-5 space-y-7">

            {/* ─── Profile Completeness ─── */}
            <section className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Profile completeness</span>
                <span className={`text-xs font-bold ${completenessPercent === 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {completedCount}/{completenessItems.length}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completenessPercent === 100
                      ? 'bg-emerald-500'
                      : completenessPercent >= 70
                        ? 'bg-blue-500'
                        : completenessPercent >= 40
                          ? 'bg-amber-500'
                          : 'bg-gray-300'
                  }`}
                  style={{ width: `${completenessPercent}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {completenessItems.map((item) => (
                  <span
                    key={item.label}
                    className={`text-[10px] font-medium rounded-full px-2 py-0.5 transition-colors ${
                      item.done
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {item.done ? '✓' : '○'} {item.label}
                  </span>
                ))}
              </div>
            </section>

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
                  <div className="flex items-center gap-1.5">
                    {currentLogoUrl && (
                      <button
                        type="button"
                        onClick={() => handleEditExisting('logo')}
                        disabled={uploadLogoMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-white transition-colors disabled:opacity-50"
                      >
                        <Image className="h-3 w-3" />
                        Edit
                      </button>
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileForCrop(file, 'logo');
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-white transition-colors">
                        <Upload className="h-3 w-3" />
                        {uploadLogoMutation.isPending ? 'Uploading...' : currentLogoUrl ? 'Replace' : 'Upload Logo'}
                      </span>
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Square crop, PNG or JPG</p>
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
                <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={currentHeaderUrl} alt="Header" className="w-full h-20 object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleEditExisting('header')}
                      disabled={uploadHeaderMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/50 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <Image className="h-3 w-3" />
                      Edit
                    </button>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileForCrop(file, 'header');
                          e.target.value = '';
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/50 hover:bg-white/10 transition-colors">
                        <Upload className="h-3 w-3" />
                        {uploadHeaderMutation.isPending ? 'Uploading...' : 'Replace'}
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileForCrop(file, 'header');
                      e.target.value = '';
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
              <p className="text-[10px] text-gray-400 mt-1.5">Wide crop (3:1 ratio)</p>
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

            {/* ─── Company Size ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Company Size</h3>
              </div>
              <Select
                value={editState.companySize}
                onValueChange={(v) => setEditState(s => ({ ...s, companySize: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <span key={i} className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-gray-700">
                      {tag}
                      <button onClick={() => removeTag(i)} aria-label={`Remove ${tag}`} className="hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">{editState.tags.length}/15 capabilities</p>
            </section>

            {/* ─── Portfolio / Past Work ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ImagePlus className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Portfolio</h3>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Showcase past projects to build credibility</p>

              {/* Existing items */}
              {editState.portfolio.length > 0 && (
                <div className="space-y-2 mb-3">
                  {editState.portfolio.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                      <img src={item.imageUrl} alt={item.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.title}</p>
                        {item.description && <p className="text-[10px] text-gray-400 truncate">{item.description}</p>}
                      </div>
                      <button onClick={() => removePortfolioItem(i)} aria-label={`Remove ${item.title}`} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new item */}
              {editState.portfolio.length < 8 && (
                <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
                  <Input
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    placeholder="Project name"
                    className="text-xs h-8"
                    maxLength={60}
                  />
                  <Input
                    value={portfolioDesc}
                    onChange={(e) => setPortfolioDesc(e.target.value)}
                    placeholder="Short description (optional)"
                    className="text-xs h-8"
                    maxLength={120}
                  />
                  <label className={`block ${portfolioTitle.trim() ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!portfolioTitle.trim()}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && validateImage(file)) uploadPortfolioImageMutation.mutate(file);
                        e.target.value = '';
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors">
                      <Upload className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {uploadPortfolioImageMutation.isPending
                          ? 'Uploading...'
                          : portfolioTitle.trim()
                            ? 'Upload project image'
                            : 'Enter a project name first'}
                      </span>
                    </div>
                  </label>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">{editState.portfolio.length}/8 projects</p>
            </section>

            {/* ─── Company Brochure ─── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Company Brochure</h3>
              </div>
              {currentBrochureUrl && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded-lg border border-gray-200">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">Brochure uploaded</span>
                  <a href={currentBrochureUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex-shrink-0">View</a>
                </div>
              )}
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
                      if (!okType) {
                        toast({ title: "Invalid file", description: "Brochure must be PDF, JPG, or PNG.", variant: "destructive" });
                      } else if (file.size > MAX_BROCHURE_BYTES) {
                        toast({ title: "File too large", description: "Brochure must be under 10MB.", variant: "destructive" });
                      } else {
                        uploadBrochureMutation.mutate(file);
                      }
                    }
                    e.target.value = '';
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
                  <Label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5"><Globe className="h-3 w-3" /> Website</Label>
                  <Input value={editState.socialLinks.website} onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, website: e.target.value } }))} placeholder="https://yourcompany.com" className="text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
                  <Input value={editState.socialLinks.linkedin} onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, linkedin: e.target.value } }))} placeholder="https://linkedin.com/company/..." className="text-sm h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5"><Twitter className="h-3 w-3" /> X / Twitter</Label>
                  <Input value={editState.socialLinks.twitter} onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, twitter: e.target.value } }))} placeholder="https://x.com/..." className="text-sm h-9" />
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
            <div className="relative overflow-hidden bg-gray-50">
              {currentHeaderUrl ? (
                <div className="h-44 md:h-52 w-full relative">
                  <img src={currentHeaderUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 max-w-[860px] mx-auto px-6 pb-4">
                    <div className="flex items-end gap-3">
                      {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-white/80 shadow-lg flex-shrink-0 bg-white" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl border-2 border-white/80 shadow-lg flex-shrink-0 bg-white flex items-center justify-center text-lg font-extrabold text-gray-400">{initials}</div>
                      )}
                      <div>
                        <h1 className="text-base font-extrabold text-white tracking-[-0.02em] drop-shadow">{displayName}</h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <VerificationBadge status={company.verificationStatus} />
                          {company.category && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80 font-medium"><Briefcase className="h-3 w-3" />{company.category}</span>
                          )}
                          {company.city && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80 font-medium"><MapPin className="h-3 w-3" />{company.city}</span>
                          )}
                          {sizeLabel && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80 font-medium"><Users className="h-3 w-3" />{sizeLabel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-44 md:h-52 w-full relative" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 max-w-[860px] mx-auto px-6 pb-4">
                    <div className="flex items-end gap-3">
                      {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-white/80 shadow-lg flex-shrink-0 bg-white" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl border-2 border-white/80 shadow-lg flex-shrink-0 bg-white flex items-center justify-center text-lg font-extrabold text-gray-400">{initials}</div>
                      )}
                      <div>
                        <h1 className="text-base font-extrabold text-white tracking-[-0.02em] drop-shadow">{displayName}</h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <VerificationBadge status={company.verificationStatus} />
                          {company.category && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80 font-medium"><Briefcase className="h-3 w-3" />{company.category}</span>
                          )}
                          {company.city && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80 font-medium"><MapPin className="h-3 w-3" />{company.city}</span>
                          )}
                          {sizeLabel && (
                            <span className="flex items-center gap-1 text-[11px] text-white/80 font-medium"><Users className="h-3 w-3" />{sizeLabel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Preview: Content */}
            <div className="bg-gray-50">
              <div className="max-w-[860px] mx-auto px-5 py-6">
                <div className={`grid gap-5 items-start ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-[1fr_260px]'}`}>

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
                            <span key={i} className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-gray-50 text-gray-700 border border-gray-100">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portfolio */}
                    {editState.portfolio.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-3">Portfolio</p>
                        <div className={`grid gap-3 ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {editState.portfolio.map((item, i) => (
                            <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                              <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" />
                              <div className="p-3">
                                <p className="text-xs font-bold text-gray-800">{item.title}</p>
                                {item.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>}
                              </div>
                            </div>
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
                          <div className="flex items-center gap-2 text-[11px] text-gray-500"><Briefcase className="h-3 w-3 text-gray-400" />{company.category}</div>
                        )}
                        {company.city && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500"><MapPin className="h-3 w-3 text-gray-400" />{company.city}</div>
                        )}
                        {sizeLabel && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500"><Users className="h-3 w-3 text-gray-400" />{sizeLabel}</div>
                        )}
                      </div>
                    </div>

                    {hasSocialLinks && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-300 mb-2">Connect</p>
                        <div className="space-y-1.5">
                          {editState.socialLinks.website && (
                            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-100"><Globe className="h-3 w-3" /> Website</span>
                          )}
                          {editState.socialLinks.linkedin && (
                            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-100"><Linkedin className="h-3 w-3" /> LinkedIn</span>
                          )}
                          {editState.socialLinks.twitter && (
                            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-600 px-2.5 py-1.5 rounded-lg border border-gray-100"><Twitter className="h-3 w-3" /> X / Twitter</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
