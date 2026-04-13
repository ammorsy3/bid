import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageCropDialog from "@/components/ImageCropDialog";
import { cn } from "@/lib/utils";
import {
  Building2, MapPin, Globe, Linkedin, Twitter,
  FileText, ArrowLeft, Clock, CheckCircle2,
  Image as ImageIcon, Upload, Loader2, X, Plus, Eye, Type, Link2,
  Tag, Users, Trash2, ImagePlus, ShieldCheck, Video, BarChart3, Award, Shield, Paperclip, AlertTriangle,
  Cloud, CloudOff,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// Types & constants
// ═══════════════════════════════════════════════════════════════════

interface CertificationItem {
  name: string;
  issuer?: string;
  expiryDate?: string;
  documentUrl?: string;
  documentName?: string;
}

type InsuranceType = 'general_liability' | 'professional_indemnity' | 'workers_compensation' | 'public_liability' | 'cyber' | 'other';

interface InsurancePolicyItem {
  type: InsuranceType;
  provider: string;
  coverageAmount?: number;
  currency?: string;
  expiryDate?: string;
  documentUrl?: string;
  documentName?: string;
}

const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  general_liability: 'General liability',
  professional_indemnity: 'Professional indemnity',
  workers_compensation: 'Workers compensation',
  public_liability: 'Public liability',
  cyber: 'Cyber liability',
  other: 'Other',
};

type ExpiryStatus = 'none' | 'active' | 'expiring' | 'expired';

function getExpiryStatus(expiryDate?: string): ExpiryStatus {
  if (!expiryDate) return 'none';
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return 'none';
  const now = new Date();
  const days = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'active';
}

interface CompanyStats {
  yearsInBusiness?: number;
  projectsCompleted?: number;
  clientsServed?: number;
  repeatClientPct?: number;
  citiesCovered?: number;
  teamSize?: number;
}

const STAT_FIELDS: { key: keyof CompanyStats; label: string; suffix?: string; max: number }[] = [
  { key: 'yearsInBusiness', label: 'Years in business', max: 200 },
  { key: 'projectsCompleted', label: 'Projects completed', max: 1_000_000 },
  { key: 'clientsServed', label: 'Clients served', max: 1_000_000 },
  { key: 'repeatClientPct', label: 'Repeat clients', suffix: '%', max: 100 },
  { key: 'citiesCovered', label: 'Cities covered', max: 10_000 },
  { key: 'teamSize', label: 'Team size', max: 1_000_000 },
];

function parseVideoEmbed(url: string | null | undefined): { provider: 'youtube' | 'vimeo'; embedUrl: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  const yt = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  return null;
}

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
    crNumber: string;
    vatNumber: string | null;
    createdAt: string;
    verifiedAt: string | null;
    verifiedDocuments: string[];
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
    yearFounded: number | null;
    serviceAreas: string[] | null;
    languages: string[] | null;
    industriesServed: string[] | null;
    availabilityStatus: 'accepting' | 'limited' | 'booked' | null;
    availabilityNote: string | null;
    portfolio: PortfolioItem[];
    socialLinks: { website?: string; linkedin?: string; twitter?: string } | null;
    introVideoUrl: string | null;
    stats: CompanyStats | null;
    certifications: CertificationItem[] | null;
    insurancePolicies: InsurancePolicyItem[] | null;
  } | null;
}

interface EditState {
  displayName: string;
  bio: string;
  tags: string[];
  companySize: string;
  yearFounded: string;
  serviceAreas: string[];
  languages: string[];
  industriesServed: string[];
  availabilityStatus: 'accepting' | 'limited' | 'booked' | null;
  availabilityNote: string;
  portfolio: PortfolioItem[];
  socialLinks: { website: string; linkedin: string; twitter: string };
  introVideoUrl: string;
  stats: CompanyStats;
  certifications: CertificationItem[];
  insurancePolicies: InsurancePolicyItem[];
}

const AVAILABILITY_OPTIONS: { value: 'accepting' | 'limited' | 'booked'; label: string; color: string }[] = [
  { value: 'accepting', label: 'Accepting projects', color: 'emerald' },
  { value: 'limited', label: 'Limited capacity', color: 'amber' },
  { value: 'booked', label: 'Currently booked', color: 'gray' },
];

const COMMON_LANGUAGES = ['Arabic', 'English', 'Urdu', 'Hindi', 'French', 'Filipino'];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

type SectionId =
  | 'basics'
  | 'availability'
  | 'facts'
  | 'track-record'
  | 'capabilities'
  | 'credentials'
  | 'media'
  | 'links';

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'basics',       label: 'Basics',                  icon: Type,       description: 'Logo, name, and short description' },
  { id: 'availability', label: 'Availability',            icon: Clock,      description: 'Let requesters know your status' },
  { id: 'facts',        label: 'Company facts',           icon: Building2,  description: 'Size, year, reach, and languages' },
  { id: 'track-record', label: 'Track record',            icon: BarChart3,  description: 'Numbers clients care about' },
  { id: 'capabilities', label: 'Capabilities & portfolio', icon: Tag,       description: 'Services you offer and past work' },
  { id: 'credentials',  label: 'Credentials',             icon: ShieldCheck, description: 'Certifications and insurance' },
  { id: 'media',        label: 'Media',                   icon: ImageIcon,  description: 'Header image, intro video, brochure' },
  { id: 'links',        label: 'Links',                   icon: Link2,      description: 'Website and social profiles' },
];

// ═══════════════════════════════════════════════════════════════════
// Main Editor
// ═══════════════════════════════════════════════════════════════════

export default function CompanyProfileEditor() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const activeCompanyId = activeCompany?.id;

  // Active section from query param, default 'basics'
  const initialSection: SectionId = useMemo(() => {
    const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('section') : null;
    return (SECTIONS.find(s => s.id === qs)?.id) || 'basics';
  }, []);
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

  const changeSection = (id: SectionId) => {
    setActiveSection(id);
    const url = new URL(window.location.href);
    url.searchParams.set('section', id);
    window.history.replaceState({}, '', url.toString());
  };

  const [tagInput, setTagInput] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);

  const [cropDialog, setCropDialog] = useState<{
    open: boolean;
    imageSrc: string;
    aspect: number;
    target: 'logo' | 'header';
    pendingOriginal: File | null;
  }>({ open: false, imageSrc: '', aspect: 1, target: 'logo', pendingOriginal: null });

  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');

  const [editState, setEditState] = useState<EditState>({
    displayName: '',
    bio: '',
    tags: [],
    companySize: '',
    yearFounded: '',
    serviceAreas: [],
    languages: [],
    industriesServed: [],
    availabilityStatus: null,
    availabilityNote: '',
    portfolio: [],
    socialLinks: { website: '', linkedin: '', twitter: '' },
    introVideoUrl: '',
    stats: {},
    certifications: [],
    insurancePolicies: [],
  });

  const [newCert, setNewCert] = useState<CertificationItem>({ name: '', issuer: '', expiryDate: '' });
  const [newInsurance, setNewInsurance] = useState<InsurancePolicyItem>({ type: 'general_liability', provider: '', currency: 'SAR' });

  // Dirty tracking
  const [savedState, setSavedState] = useState<string>('');
  const isDirty = useMemo(() => {
    if (!savedState) return false;
    return JSON.stringify(editState) !== savedState;
  }, [editState, savedState]);

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

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

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['/api/companies', activeCompanyId, 'profile'],
    queryFn: () => apiRequest('GET', `/api/companies/${activeCompanyId}/profile`).then(r => r.json()),
    enabled: !!activeCompanyId,
  });

  useEffect(() => {
    if (data) {
      const initial: EditState = {
        displayName: data.profile?.displayName || data.company.name,
        bio: data.profile?.bio || '',
        tags: data.profile?.tags || [],
        companySize: data.profile?.companySize || '',
        yearFounded: data.profile?.yearFounded ? String(data.profile.yearFounded) : '',
        serviceAreas: data.profile?.serviceAreas || [],
        languages: data.profile?.languages || [],
        industriesServed: data.profile?.industriesServed || [],
        availabilityStatus: data.profile?.availabilityStatus || null,
        availabilityNote: data.profile?.availabilityNote || '',
        portfolio: data.profile?.portfolio || [],
        socialLinks: {
          website: data.profile?.socialLinks?.website || '',
          linkedin: data.profile?.socialLinks?.linkedin || '',
          twitter: data.profile?.socialLinks?.twitter || '',
        },
        introVideoUrl: data.profile?.introVideoUrl || '',
        stats: data.profile?.stats || {},
        certifications: data.profile?.certifications || [],
        insurancePolicies: data.profile?.insurancePolicies || [],
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
        yearFounded: state.yearFounded ? Number(state.yearFounded) : null,
        serviceAreas: state.serviceAreas,
        languages: state.languages,
        industriesServed: state.industriesServed,
        availabilityStatus: state.availabilityStatus,
        availabilityNote: state.availabilityNote || null,
        portfolio: state.portfolio,
        socialLinks: {
          website: state.socialLinks.website || undefined,
          linkedin: state.socialLinks.linkedin || undefined,
          twitter: state.socialLinks.twitter || undefined,
        },
        introVideoUrl: state.introVideoUrl.trim() || null,
        stats: state.stats,
        certifications: state.certifications,
        insurancePolicies: state.insurancePolicies,
      });
      return res.json();
    },
    onSuccess: (_result, savedEditState) => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'profile'] });
      setSavedState(JSON.stringify(savedEditState));
      setLastSavedAt(Date.now());
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save profile changes.", variant: "destructive" });
    },
  });

  // ── Autosave (debounced) ──
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!savedState) return; // initial load hasn't happened
    if (!isDirty) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveMutation.mutate(editState);
    }, 900);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editState, isDirty, savedState]);

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

  const uploadCredentialDocMutation = useMutation({
    mutationFn: async ({ file, target }: { file: File; target: { kind: 'cert' | 'insurance'; index: number } }): Promise<{ url: string; name: string; target: typeof target }> => {
      const result = await uploadFile('/api/company/credential-document', file);
      return { url: result.url, name: result.name || file.name, target };
    },
    onSuccess: ({ url, name, target }) => {
      setEditState(s => {
        if (target.kind === 'cert') {
          const next = [...s.certifications];
          if (next[target.index]) next[target.index] = { ...next[target.index], documentUrl: url, documentName: name };
          return { ...s, certifications: next };
        } else {
          const next = [...s.insurancePolicies];
          if (next[target.index]) next[target.index] = { ...next[target.index], documentUrl: url, documentName: name };
          return { ...s, insurancePolicies: next };
        }
      });
      toast({ title: "Document uploaded" });
    },
    onError: () => {
      toast({ title: "Failed to upload document", variant: "destructive" });
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

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (headerPreview) URL.revokeObjectURL(headerPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tag/list helpers ──
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !editState.tags.includes(tag) && editState.tags.length < 15) {
      setEditState(s => ({ ...s, tags: [...s.tags, tag] }));
      setTagInput('');
    }
  };
  const removeTag = (index: number) => setEditState(s => ({ ...s, tags: s.tags.filter((_, i) => i !== index) }));
  const removePortfolioItem = (index: number) => setEditState(s => ({ ...s, portfolio: s.portfolio.filter((_, i) => i !== index) }));

  const addServiceArea = () => {
    const v = serviceAreaInput.trim();
    if (v && !editState.serviceAreas.includes(v) && editState.serviceAreas.length < 20) {
      setEditState(s => ({ ...s, serviceAreas: [...s.serviceAreas, v] }));
      setServiceAreaInput('');
    }
  };
  const removeServiceArea = (i: number) => setEditState(s => ({ ...s, serviceAreas: s.serviceAreas.filter((_, idx) => idx !== i) }));

  const addIndustry = () => {
    const v = industryInput.trim();
    if (v && !editState.industriesServed.includes(v) && editState.industriesServed.length < 15) {
      setEditState(s => ({ ...s, industriesServed: [...s.industriesServed, v] }));
      setIndustryInput('');
    }
  };
  const removeIndustry = (i: number) => setEditState(s => ({ ...s, industriesServed: s.industriesServed.filter((_, idx) => idx !== i) }));

  const addCertification = () => {
    const name = newCert.name.trim();
    if (!name) return;
    if (editState.certifications.length >= 15) return;
    const entry: CertificationItem = { name };
    if (newCert.issuer?.trim()) entry.issuer = newCert.issuer.trim();
    if (newCert.expiryDate) entry.expiryDate = newCert.expiryDate;
    setEditState(s => ({ ...s, certifications: [...s.certifications, entry] }));
    setNewCert({ name: '', issuer: '', expiryDate: '' });
  };
  const removeCertification = (i: number) => setEditState(s => ({ ...s, certifications: s.certifications.filter((_, idx) => idx !== i) }));

  const addInsurancePolicy = () => {
    const provider = newInsurance.provider.trim();
    if (!provider) return;
    if (editState.insurancePolicies.length >= 5) return;
    const entry: InsurancePolicyItem = { type: newInsurance.type, provider };
    if (newInsurance.coverageAmount && newInsurance.coverageAmount > 0) entry.coverageAmount = newInsurance.coverageAmount;
    if (newInsurance.currency) entry.currency = newInsurance.currency;
    if (newInsurance.expiryDate) entry.expiryDate = newInsurance.expiryDate;
    setEditState(s => ({ ...s, insurancePolicies: [...s.insurancePolicies, entry] }));
    setNewInsurance({ type: 'general_liability', provider: '', currency: 'SAR' });
  };
  const removeInsurancePolicy = (i: number) => setEditState(s => ({ ...s, insurancePolicies: s.insurancePolicies.filter((_, idx) => idx !== i) }));

  const toggleLanguage = (lang: string) => {
    setEditState(s => ({
      ...s,
      languages: s.languages.includes(lang) ? s.languages.filter(l => l !== lang) : [...s.languages, lang],
    }));
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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

  // ── Per-section completeness ──
  const sectionCompleteness: Record<SectionId, { done: number; total: number }> = {
    basics: {
      done: [!!currentLogoUrl, !!editState.displayName.trim(), editState.bio.trim().length >= 10].filter(Boolean).length,
      total: 3,
    },
    availability: {
      done: [!!editState.availabilityStatus].filter(Boolean).length,
      total: 1,
    },
    facts: {
      done: [
        !!editState.companySize,
        !!editState.yearFounded,
        editState.industriesServed.length >= 1,
        editState.serviceAreas.length >= 1,
        editState.languages.length >= 1,
      ].filter(Boolean).length,
      total: 5,
    },
    'track-record': {
      done: Object.values(editState.stats).filter(v => v != null && (v as number) > 0).length >= 3 ? 1 : 0,
      total: 1,
    },
    capabilities: {
      done: [editState.tags.length >= 1, editState.portfolio.length >= 1].filter(Boolean).length,
      total: 2,
    },
    credentials: {
      done: [
        editState.certifications.some(c => getExpiryStatus(c.expiryDate) !== 'expired'),
        editState.insurancePolicies.some(p => getExpiryStatus(p.expiryDate) !== 'expired'),
      ].filter(Boolean).length,
      total: 2,
    },
    media: {
      done: [!!currentHeaderUrl, !!parseVideoEmbed(editState.introVideoUrl), !!currentBrochureUrl].filter(Boolean).length,
      total: 3,
    },
    links: {
      done: [!!editState.socialLinks.website || !!editState.socialLinks.linkedin].filter(Boolean).length,
      total: 1,
    },
  };

  const overallDone = Object.values(sectionCompleteness).reduce((s, x) => s + x.done, 0);
  const overallTotal = Object.values(sectionCompleteness).reduce((s, x) => s + x.total, 0);
  const completenessPercent = Math.round((overallDone / overallTotal) * 100);

  const sectionStatus = (id: SectionId): 'complete' | 'partial' | 'empty' => {
    const { done, total } = sectionCompleteness[id];
    if (done === 0) return 'empty';
    if (done >= total) return 'complete';
    return 'partial';
  };

  // ── Save status indicator ──
  const saveStatus: 'saved' | 'dirty' | 'saving' | 'error' =
    saveMutation.isError ? 'error'
    : saveMutation.isPending ? 'saving'
    : isDirty ? 'dirty'
    : 'saved';

  const savedAgoLabel = (() => {
    if (!lastSavedAt) return null;
    const s = Math.floor((Date.now() - lastSavedAt) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return 'a while ago';
  })();

  const currentSectionMeta = SECTIONS.find(s => s.id === activeSection)!;

  const handleBack = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/settings');
  };

  const openPreview = () => {
    window.open(`/company/${company.slug}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <ImageCropDialog
        open={cropDialog.open}
        onClose={() => setCropDialog(s => ({ ...s, open: false }))}
        imageSrc={cropDialog.imageSrc}
        aspect={cropDialog.aspect}
        title={cropDialog.target === 'logo' ? 'Edit Logo' : 'Edit Header Image'}
        onComplete={handleCropComplete}
        saving={uploadLogoMutation.isPending || uploadHeaderMutation.isPending}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* ═══════════ LEFT SUB-NAV ═══════════ */}
        <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
          {/* Brand accent strip (matches app sidebar) */}
          <div className="h-0.5 bg-gradient-to-r from-[#E8614D] to-[#F19A8F]" />

          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Settings
            </button>
            <h2 className="text-sm font-semibold text-foreground">Edit Company Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{company.name}</p>
          </div>

          {/* Completeness */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Profile strength</span>
              <span className="text-xs font-bold text-[#E8614D]">{completenessPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E8614D] to-[#F19A8F] transition-all duration-700 ease-out"
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {overallDone} of {overallTotal} fields complete
            </p>
          </div>

          {/* Section nav */}
          <nav className="flex-1 p-2 overflow-y-auto">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              const status = sectionStatus(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => changeSection(s.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left mb-0.5",
                    active
                      ? "bg-[#E8614D]/10 text-[#E8614D]"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-[#E8614D]" : "text-gray-400")} />
                  <span className="text-sm font-medium flex-1 truncate">{s.label}</span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full flex-shrink-0",
                      status === 'complete' ? "bg-emerald-500"
                        : status === 'partial' ? "bg-amber-400"
                          : "bg-gray-300 dark:bg-gray-600"
                    )}
                    aria-label={`${s.label} ${status}`}
                  />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ═══════════ MAIN ═══════════ */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-3xl mx-auto px-8 py-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Profile / Edit</p>
                <h1 className="text-2xl font-bold text-foreground mt-0.5">{currentSectionMeta.label}</h1>
                <p className="text-sm text-muted-foreground mt-1">{currentSectionMeta.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <SaveStatus status={saveStatus} savedAgoLabel={savedAgoLabel} />
                <Button variant="outline" size="sm" onClick={openPreview} className="h-9">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto px-8 py-8 pb-20 space-y-6">

              {/* ═════ BASICS ═════ */}
              {activeSection === 'basics' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Logo
                      </CardTitle>
                      <CardDescription>Square crop, PNG or JPG. Shown in search results and on your public profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        {currentLogoUrl ? (
                          <img src={currentLogoUrl} alt="Logo" className="w-20 h-20 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-400">
                            {initials}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {currentLogoUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditExisting('logo')}
                              disabled={uploadLogoMutation.isPending}
                            >
                              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                              Edit crop
                            </Button>
                          )}
                          <label>
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
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span className="cursor-pointer">
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                {uploadLogoMutation.isPending ? 'Uploading...' : currentLogoUrl ? 'Replace' : 'Upload logo'}
                              </span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Display name</CardTitle>
                      <CardDescription>This is the name clients will see on your public profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={editState.displayName}
                        onChange={(e) => setEditState(s => ({ ...s, displayName: e.target.value }))}
                        placeholder="Your company name"
                        maxLength={100}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">About</CardTitle>
                      <CardDescription>A short pitch for potential clients. Aim for 2–4 sentences.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={editState.bio}
                        onChange={(e) => setEditState(s => ({ ...s, bio: e.target.value }))}
                        placeholder="Tell potential clients what you do, who you serve, and what makes you different..."
                        className="resize-none"
                        rows={5}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-right">{editState.bio.length}/500</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ═════ AVAILABILITY ═════ */}
              {activeSection === 'availability' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current availability</CardTitle>
                    <CardDescription>Clients filter by this. Keep it up to date so you don't miss opportunities.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {AVAILABILITY_OPTIONS.map((opt) => {
                        const active = editState.availabilityStatus === opt.value;
                        const activeClasses =
                          opt.color === 'emerald' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300'
                          : opt.color === 'amber' ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300'
                          : 'bg-gray-100 border-gray-400 text-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-200';
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditState(s => ({ ...s, availabilityStatus: active ? null : opt.value }))}
                            className={cn(
                              "text-sm font-semibold rounded-lg px-3 py-3 border-2 transition-colors",
                              active ? activeClasses : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">Note (optional)</Label>
                      <Input
                        value={editState.availabilityNote}
                        onChange={(e) => setEditState(s => ({ ...s, availabilityNote: e.target.value }))}
                        placeholder="e.g. Available from May 2026, or booked until Q3"
                        maxLength={200}
                        disabled={!editState.availabilityStatus}
                      />
                      {editState.availabilityStatus && (
                        <p className="text-xs text-muted-foreground mt-1 text-right">{editState.availabilityNote.length}/200</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ═════ FACTS ═════ */}
              {activeSection === 'facts' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Company size</CardTitle>
                      <CardDescription>How big is your team?</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={editState.companySize}
                        onValueChange={(v) => setEditState(s => ({ ...s, companySize: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Year founded</CardTitle>
                      <CardDescription>Used to calculate years in business on your profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1800}
                        max={new Date().getFullYear()}
                        value={editState.yearFounded}
                        onChange={(e) => setEditState(s => ({ ...s, yearFounded: e.target.value }))}
                        placeholder="e.g. 2015"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Industries served</CardTitle>
                      <CardDescription>Which verticals do you work with?</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={industryInput}
                          onChange={(e) => setIndustryInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIndustry(); } }}
                          placeholder="e.g. Healthcare, Fintech, Retail..."
                          className="flex-1"
                          maxLength={40}
                        />
                        <Button type="button" variant="outline" onClick={addIndustry}
                          disabled={!industryInput.trim() || editState.industriesServed.length >= 15}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {editState.industriesServed.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {editState.industriesServed.map((ind, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 pl-2.5">
                              {ind}
                              <button onClick={() => removeIndustry(i)} aria-label={`Remove ${ind}`} className="ml-0.5 hover:text-red-500"><X className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{editState.industriesServed.length}/15</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Service areas</CardTitle>
                      <CardDescription>Cities, regions, or countries you operate in.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={serviceAreaInput}
                          onChange={(e) => setServiceAreaInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addServiceArea(); } }}
                          placeholder="e.g. Riyadh, Jeddah, GCC-wide..."
                          className="flex-1"
                          maxLength={40}
                        />
                        <Button type="button" variant="outline" onClick={addServiceArea}
                          disabled={!serviceAreaInput.trim() || editState.serviceAreas.length >= 20}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {editState.serviceAreas.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {editState.serviceAreas.map((area, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 pl-2">
                              <MapPin className="h-3 w-3" />
                              {area}
                              <button onClick={() => removeServiceArea(i)} aria-label={`Remove ${area}`} className="ml-0.5 hover:text-red-500"><X className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{editState.serviceAreas.length}/20</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Languages</CardTitle>
                      <CardDescription>Languages your team can work in.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-1.5 flex-wrap">
                        {COMMON_LANGUAGES.map((lang) => {
                          const active = editState.languages.includes(lang);
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => toggleLanguage(lang)}
                              className={cn(
                                "text-sm font-medium rounded-full px-4 py-1.5 border transition-colors",
                                active
                                  ? 'bg-[#E8614D] text-white border-[#E8614D]'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                              )}
                            >
                              {lang}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ═════ TRACK RECORD ═════ */}
              {activeSection === 'track-record' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">The numbers</CardTitle>
                    <CardDescription>These go on your public profile as headline stats. Leave any blank to hide them.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {STAT_FIELDS.map(({ key, label, suffix, max }) => (
                        <div key={key}>
                          <Label className="text-sm mb-1.5 block">{label}{suffix ? ` (${suffix})` : ''}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={max}
                            value={editState.stats[key] ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setEditState(s => {
                                const next = { ...s.stats };
                                if (raw === '') {
                                  delete next[key];
                                } else {
                                  const n = Math.floor(Number(raw));
                                  if (Number.isFinite(n) && n >= 0 && n <= max) next[key] = n;
                                }
                                return { ...s, stats: next };
                              });
                            }}
                            placeholder="—"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ═════ CAPABILITIES & PORTFOLIO ═════ */}
              {activeSection === 'capabilities' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Capabilities</CardTitle>
                      <CardDescription>Specific skills and services you offer. Used for matching and search.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                          placeholder="Add a capability..."
                          className="flex-1"
                          maxLength={40}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addTag}
                          disabled={!tagInput.trim() || editState.tags.length >= 15}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {editState.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {editState.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 pl-2.5">
                              {tag}
                              <button onClick={() => removeTag(i)} aria-label={`Remove ${tag}`} className="ml-0.5 hover:text-red-500"><X className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{editState.tags.length}/15 capabilities</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                        Portfolio
                      </CardTitle>
                      <CardDescription>Showcase up to 8 past projects. Clients use this to judge quality.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editState.portfolio.length > 0 && (
                        <div className="space-y-2">
                          {editState.portfolio.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                              <img src={item.imageUrl} alt={item.title} className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{item.title}</p>
                                {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => removePortfolioItem(i)} aria-label={`Remove ${item.title}`} className="h-8 w-8 text-muted-foreground hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {editState.portfolio.length < 8 && (
                        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                          <Input
                            value={portfolioTitle}
                            onChange={(e) => setPortfolioTitle(e.target.value)}
                            placeholder="Project name"
                            maxLength={60}
                          />
                          <Input
                            value={portfolioDesc}
                            onChange={(e) => setPortfolioDesc(e.target.value)}
                            placeholder="Short description (optional)"
                            maxLength={120}
                          />
                          <label className={cn("block", portfolioTitle.trim() ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
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
                            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">{editState.portfolio.length}/8 projects</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ═════ CREDENTIALS ═════ */}
              {activeSection === 'credentials' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        Certifications
                      </CardTitle>
                      <CardDescription>ISO, industry, or trade certifications. Attach the document for a verified badge.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editState.certifications.length > 0 && (
                        <div className="space-y-2">
                          {editState.certifications.map((cert, i) => {
                            const status = getExpiryStatus(cert.expiryDate);
                            return (
                              <div key={i} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{cert.name}</p>
                                    {cert.issuer && <p className="text-xs text-muted-foreground truncate">{cert.issuer}</p>}
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeCertification(i)} aria-label={`Remove ${cert.name}`} className="h-7 w-7 text-muted-foreground hover:text-red-500">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {cert.documentUrl ? (
                                    <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 hover:bg-emerald-100 transition-colors">
                                      <ShieldCheck className="h-3 w-3" /> Document on file
                                    </a>
                                  ) : (
                                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2.5 py-1 cursor-pointer hover:bg-gray-100 transition-colors">
                                      <Paperclip className="h-3 w-3" /> {uploadCredentialDocMutation.isPending ? 'Uploading…' : 'Attach document'}
                                      <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadCredentialDocMutation.mutate({ file, target: { kind: 'cert', index: i } });
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  )}
                                  {status === 'active' && cert.expiryDate && (
                                    <span className="text-xs text-muted-foreground">Expires {cert.expiryDate}</span>
                                  )}
                                  {status === 'expiring' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                                      <AlertTriangle className="h-3 w-3" /> Expiring {cert.expiryDate}
                                    </span>
                                  )}
                                  {status === 'expired' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                                      <AlertTriangle className="h-3 w-3" /> Expired {cert.expiryDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {editState.certifications.length < 15 && (
                        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                          <Input
                            value={newCert.name}
                            onChange={(e) => setNewCert(c => ({ ...c, name: e.target.value }))}
                            placeholder="e.g. ISO 9001:2015"
                            maxLength={120}
                          />
                          <Input
                            value={newCert.issuer || ''}
                            onChange={(e) => setNewCert(c => ({ ...c, issuer: e.target.value }))}
                            placeholder="Issuer (optional, e.g. BSI)"
                            maxLength={120}
                          />
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Expiry date (optional)</Label>
                            <Input
                              type="date"
                              value={newCert.expiryDate || ''}
                              onChange={(e) => setNewCert(c => ({ ...c, expiryDate: e.target.value }))}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={addCertification}
                            disabled={!newCert.name.trim()}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-1.5" /> Add certification
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{editState.certifications.length}/15</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Insurance
                      </CardTitle>
                      <CardDescription>Coverage clients expect from professional service providers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editState.insurancePolicies.length > 0 && (
                        <div className="space-y-2">
                          {editState.insurancePolicies.map((pol, i) => {
                            const status = getExpiryStatus(pol.expiryDate);
                            return (
                              <div key={i} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{INSURANCE_TYPE_LABELS[pol.type]}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {pol.provider}
                                      {pol.coverageAmount ? ` · ${pol.coverageAmount.toLocaleString()} ${pol.currency || ''}` : ''}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => removeInsurancePolicy(i)} aria-label="Remove policy" className="h-7 w-7 text-muted-foreground hover:text-red-500">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {pol.documentUrl ? (
                                    <a href={pol.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 hover:bg-emerald-100 transition-colors">
                                      <ShieldCheck className="h-3 w-3" /> Document on file
                                    </a>
                                  ) : (
                                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2.5 py-1 cursor-pointer hover:bg-gray-100 transition-colors">
                                      <Paperclip className="h-3 w-3" /> {uploadCredentialDocMutation.isPending ? 'Uploading…' : 'Attach document'}
                                      <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadCredentialDocMutation.mutate({ file, target: { kind: 'insurance', index: i } });
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                  )}
                                  {status === 'active' && pol.expiryDate && (
                                    <span className="text-xs text-muted-foreground">Expires {pol.expiryDate}</span>
                                  )}
                                  {status === 'expiring' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                                      <AlertTriangle className="h-3 w-3" /> Expiring {pol.expiryDate}
                                    </span>
                                  )}
                                  {status === 'expired' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                                      <AlertTriangle className="h-3 w-3" /> Expired {pol.expiryDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {editState.insurancePolicies.length < 5 && (
                        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                          <Select value={newInsurance.type} onValueChange={(v) => setNewInsurance(p => ({ ...p, type: v as InsuranceType }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(INSURANCE_TYPE_LABELS) as InsuranceType[]).map(t => (
                                <SelectItem key={t} value={t}>{INSURANCE_TYPE_LABELS[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={newInsurance.provider}
                            onChange={(e) => setNewInsurance(p => ({ ...p, provider: e.target.value }))}
                            placeholder="Provider (e.g. Tawuniya)"
                            maxLength={120}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={newInsurance.coverageAmount ?? ''}
                              onChange={(e) => setNewInsurance(p => ({ ...p, coverageAmount: e.target.value ? Number(e.target.value) : undefined }))}
                              placeholder="Coverage"
                              className="col-span-2"
                            />
                            <Select value={newInsurance.currency || 'SAR'} onValueChange={(v) => setNewInsurance(p => ({ ...p, currency: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SAR">SAR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="AED">AED</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Expiry date (optional)</Label>
                            <Input
                              type="date"
                              value={newInsurance.expiryDate || ''}
                              onChange={(e) => setNewInsurance(p => ({ ...p, expiryDate: e.target.value }))}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={addInsurancePolicy}
                            disabled={!newInsurance.provider.trim()}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-1.5" /> Add policy
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{editState.insurancePolicies.length}/5</p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ═════ MEDIA ═════ */}
              {activeSection === 'media' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Header image
                      </CardTitle>
                      <CardDescription>Wide banner at the top of your public profile. 3:1 ratio works best.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currentHeaderUrl ? (
                        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                          <img src={currentHeaderUrl} alt="Header" className="w-full h-40 object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditExisting('header')}
                              disabled={uploadHeaderMutation.isPending}
                              className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white"
                            >
                              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                              Edit crop
                            </Button>
                            <label>
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
                              <Button type="button" variant="outline" size="sm" asChild className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white">
                                <span className="cursor-pointer">
                                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                                  {uploadHeaderMutation.isPending ? 'Uploading...' : 'Replace'}
                                </span>
                              </Button>
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
                          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 rounded-lg bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {uploadHeaderMutation.isPending ? 'Uploading...' : 'Upload header image'}
                            </span>
                          </div>
                        </label>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        Intro video
                      </CardTitle>
                      <CardDescription>A short video helps clients get a feel for your team. YouTube or Vimeo links only.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={editState.introVideoUrl}
                        onChange={(e) => setEditState(s => ({ ...s, introVideoUrl: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                      />
                      {editState.introVideoUrl.trim() && !parseVideoEmbed(editState.introVideoUrl) && (
                        <p className="text-xs text-red-500 mt-2">Must be a YouTube or Vimeo link.</p>
                      )}
                      {parseVideoEmbed(editState.introVideoUrl) && (
                        <p className="text-xs text-emerald-600 mt-2">
                          ✓ {parseVideoEmbed(editState.introVideoUrl)?.provider === 'youtube' ? 'YouTube' : 'Vimeo'} video detected
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Company brochure
                      </CardTitle>
                      <CardDescription>PDF, JPG, or PNG (max 10MB). Shown as a download on your profile.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currentBrochureUrl && (
                        <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm text-muted-foreground truncate flex-1">Brochure uploaded</span>
                          <a href={currentBrochureUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#E8614D] hover:underline flex-shrink-0">View</a>
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
                        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {uploadBrochureMutation.isPending ? 'Uploading...' : (currentBrochureUrl ? 'Replace brochure' : 'Upload brochure')}
                          </span>
                        </div>
                      </label>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ═════ LINKS ═════ */}
              {activeSection === 'links' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Website & social</CardTitle>
                    <CardDescription>Where clients can learn more about you.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm mb-1.5 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website</Label>
                      <Input value={editState.socialLinks.website} onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, website: e.target.value } }))} placeholder="https://yourcompany.com" />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5 text-muted-foreground" /> LinkedIn</Label>
                      <Input value={editState.socialLinks.linkedin} onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, linkedin: e.target.value } }))} placeholder="https://linkedin.com/company/..." />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 flex items-center gap-1.5"><Twitter className="h-3.5 w-3.5 text-muted-foreground" /> X / Twitter</Label>
                      <Input value={editState.socialLinks.twitter} onChange={(e) => setEditState(s => ({ ...s, socialLinks: { ...s.socialLinks, twitter: e.target.value } }))} placeholder="https://x.com/..." />
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </main>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Save status indicator
// ═══════════════════════════════════════════════════════════════════

function SaveStatus({ status, savedAgoLabel }: { status: 'saved' | 'dirty' | 'saving' | 'error'; savedAgoLabel: string | null }) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <CloudOff className="h-3.5 w-3.5" />
        Save failed
      </div>
    );
  }
  if (status === 'dirty') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Unsaved changes
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {savedAgoLabel ? `Saved ${savedAgoLabel}` : 'All changes saved'}
    </div>
  );
}
