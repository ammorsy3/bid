import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Calendar, DollarSign, Clock, Building2, Send, FileText,
  Video, Play, Pause, AlertCircle, Target, ListChecks, Star,
  Mail, Phone, MessageSquare, Flag, HelpCircle, Shield, Layers,
  Tag, Mic, ExternalLink, EyeOff, CheckCircle2, ChevronRight,
  Hash, ClipboardCheck, AlertTriangle, BarChart3, Paperclip, ChevronDown
} from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import SubmitOfferModal from "@/components/submit-offer-modal";
import { formatCurrency } from "@/lib/format-currency";

interface Milestone {
  id?: string;
  name: string;
  description?: string;
  amount?: string;
  dueDate?: string;
}

interface VendorRequirement {
  id: string;
  text: string;
  type: 'mandatory' | 'preferred';
}

interface TenderInvite {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  budgetRange?: string;
  budget?: string;
  budgetMin?: number;
  budgetMax?: number;
  projectSize?: string;
  showPriceToVendors?: boolean;
  duration?: string;
  projectTimeline?: string;
  startDate?: string;
  endDate?: string;
  skills?: string[];
  scope?: string;
  pricingModel?: string;
  milestones?: Milestone[];
  voiceNoteUrl?: string;
  videoUrl?: string;
  submissionType?: 'quote_only' | 'tech_fin_proposal' | 'video_only' | 'tech_fin_with_video';
  videoRequired?: boolean;
  inquiryType?: 'inside_bid' | 'email_whatsapp';
  whatsappContact?: string;
  emailContact?: string;
  evaluationCriteria?: any;
  objective?: string;
  deliverables?: Array<string | { id: string; name: string; description: string; unit: string; quantity: number }>;
  vendorRequirements?: VendorRequirement[];
  company?: { id: string; name: string };
  profile?: { displayName?: string; logoUrl?: string };
  createdAt?: string;
  category?: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  formCards?: Array<{
    id: string;
    type: string;
    label: string;
    isRequired: boolean;
    options?: string[];
    value?: any;
  }>;
}

interface TenderQA {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  quote_only: "Price Quote Only",
  tech_fin_proposal: "Full Proposal (Technical + Financial)",
  video_only: "Video Pitch Only",
  tech_fin_with_video: "Full Proposal + Video Pitch",
  document_only: "Document Only",
  both: "Video & Document",
};

const SUBMISSION_TYPE_DESC: Record<string, string> = {
  quote_only: "Submit a detailed price quotation with a line-item breakdown for each deliverable.",
  video_only: "Record and submit a video pitch presenting your team, methodology, and approach.",
  tech_fin_proposal: "Submit two documents: (1) a technical approach with methodology and timeline, and (2) a financial proposal with detailed pricing.",
  tech_fin_with_video: "Submit a full proposal package: technical document, financial proposal, and a supporting video pitch.",
};

const CRITERIA_LABELS: Record<string, string> = {
  financial_offer: "Competitive Pricing",
  previous_work: "Relevant Experience",
  clear_timeline: "Clear Timeline",
  technical_approach: "Technical Approach",
  team_expertise: "Team Expertise",
};

const EVAL_CATEGORY_INFO: Record<string, { name: string; description: string }> = {
  experience: { name: "Relevant Experience", description: "Track record in similar projects and industry expertise" },
  financial: { name: "Financial Evaluation", description: "Financial stability and pricing competitiveness" },
  technical: { name: "Technical Capability", description: "Technical approach, methodology, and delivery capability" },
};

const EVAL_REQUIREMENT_INFO: Record<string, { label: string; description: string; formatValue?: (v: string) => string }> = {
  years_in_market: { label: "Minimum Years in Market", description: "The company must have been operating for at least this many years.", formatValue: (v) => `${v}+ years required` },
  similar_projects_count: { label: "Similar Projects Completed", description: "The company must have delivered this many comparable projects.", formatValue: (v) => `At least ${v} project${Number(v) > 1 ? 's' : ''} required` },
  min_project_value: { label: "Minimum Project Value", description: "At least one prior project of this value or higher.", formatValue: (v) => `${Number(v).toLocaleString()} SAR or higher` },
  client_references: { label: "Client References Required", description: "Verifiable references from previous clients for similar work." },
  financial_statements: { label: "Financial Statements Required", description: "Audited financial statements to demonstrate financial stability." },
  bank_guarantee: { label: "Bank Guarantee Capability", description: "Must be able to provide a bank guarantee if required." },
  methodology: { label: "Detailed Methodology Required", description: "A detailed project methodology explaining approach and execution." },
  timeline: { label: "Project Timeline Required", description: "A detailed project timeline with key milestones and delivery dates." },
  team_cvs: { label: "Team CVs Required", description: "CVs of key team members who will work on this project." },
  industry_certifications: { label: "Industry Certifications Required", description: "Relevant professional certifications for the specific field." },
};

// Items from eval requirements that map to checklist entries
const EVAL_REQUIREMENT_CHECKLIST: Record<string, string> = {
  client_references: "Client references",
  financial_statements: "Audited financial statements",
  bank_guarantee: "Bank guarantee capability",
  methodology: "Detailed methodology document",
  timeline: "Project timeline document",
  team_cvs: "CVs of key team members",
  industry_certifications: "Industry certifications",
};

const PROJECT_SIZE_LABELS: Record<string, string> = {
  small: "Small Project (Under 50K SAR)",
  medium: "Medium Project (50K–250K SAR)",
  large: "Large Project (250K+ SAR)",
};

const DURATION_LABELS: Record<string, string> = {
  "6plus": "More than 6 months",
  "3to6": "3 to 6 months",
  "1to3": "1 to 3 months",
};

// Color palettes for the evaluation weight bar
const CATEGORY_BAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const CATEGORY_DOT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const CATEGORY_TEXT_COLORS = ['text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600', 'text-rose-600', 'text-orange-600', 'text-cyan-600', 'text-teal-600', 'text-indigo-600', 'text-fuchsia-600'];
const CATEGORY_LIGHT_COLORS = ['bg-blue-50 border-blue-100', 'bg-emerald-50 border-emerald-100', 'bg-purple-50 border-purple-100', 'bg-amber-50 border-amber-100'];

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAudio = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(src, { headers });
        if (!response.ok) throw new Error("Failed to load audio");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (err) {
        setError("Failed to load voice note");
      } finally {
        setIsLoading(false);
      }
    };
    loadAudio();
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading voice note...</span>
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">{error || "Failed to load voice note"}</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-10 w-10 rounded-full bg-[#E25E45] text-white hover:bg-[#d54d35]"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex-1">
        <div
          className="relative h-2 bg-gray-300 rounded-full cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration || !isFinite(duration)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const newTime = ((e.clientX - rect.left) / rect.width) * duration;
            if (!isFinite(newTime) || isNaN(newTime)) return;
            audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
            setCurrentTime(Math.max(0, Math.min(newTime, duration)));
          }}
        >
          <div className="absolute top-0 left-0 h-full bg-[#E25E45] rounded-full" style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }} />
          <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-[#E25E45] rounded-full shadow-md border-2 border-white" style={{ left: `calc(${progress}% - 8px)`, transition: isPlaying ? 'left 0.1s linear' : 'none' }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />
    </div>
  );
}

type SectionId = 'scope' | 'timeline' | 'evaluation' | 'submission' | 'custom' | 'context' | 'qa';

function MobileAtAGlance({
  tender,
  isDeadlinePassed,
  isDeadlineToday,
  daysRemaining,
  formatDate,
  deadlineSubtext,
  getBudgetDisplay,
  durationDisplay,
}: {
  tender: TenderData;
  isDeadlinePassed: boolean;
  isDeadlineToday: boolean;
  daysRemaining: number;
  formatDate: (d: string) => string;
  deadlineSubtext: () => string;
  getBudgetDisplay: () => string;
  durationDisplay: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#E25E45]" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">At a Glance</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 shadow-sm px-4 pb-4 -mt-1">
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className={`rounded-lg p-2.5 border ${isDeadlineToday ? 'bg-orange-50 border-orange-200' : isDeadlinePassed ? 'bg-red-50 border-red-100' : daysRemaining <= 3 ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className={`h-3 w-3 flex-shrink-0 ${isDeadlineToday ? 'text-orange-500' : isDeadlinePassed ? 'text-red-500' : 'text-[#E25E45]'}`} />
                <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Deadline</span>
              </div>
              <p className={`text-xs font-bold leading-tight ${isDeadlinePassed ? 'text-red-600' : isDeadlineToday || daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-800'}`}>
                {formatDate(tender.deadline)}
              </p>
              {deadlineSubtext() && (
                <p className={`text-[10px] mt-0.5 ${isDeadlineToday ? 'text-orange-500' : 'text-gray-400'}`}>{deadlineSubtext()}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Budget</span>
              </div>
              <p className="text-xs font-bold text-gray-800 leading-tight">{getBudgetDisplay()}</p>
            </div>
            {durationDisplay && (
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3 w-3 flex-shrink-0 text-blue-500" />
                  <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Duration</span>
                </div>
                <p className="text-xs font-bold text-gray-800 leading-tight">{durationDisplay}</p>
              </div>
            )}
            {tender.submissionType && (
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3 w-3 flex-shrink-0 text-purple-500" />
                  <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Format</span>
                </div>
                <p className="text-xs font-bold text-gray-800 leading-tight">{SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}</p>
              </div>
            )}
            {tender.category && (
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Tag className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                  <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Category</span>
                </div>
                <p className="text-xs font-bold text-gray-800 leading-tight">{tender.category}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenderInviteLink() {
  const [, params] = useRoute("/invite/:id");
  const [, navigate] = useLocation();
  const tenderId = params?.id;
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [expandedEvalCategories, setExpandedEvalCategories] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<SectionId>('scope');

  const { data: questions = [] } = useQuery<TenderQA[]>({
    queryKey: ['/api/tenders', tenderId, 'questions'],
    enabled: !!tenderId,
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${tenderId}/questions`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const askQuestion = useMutation({
    mutationFn: async (question: string) => {
      return await apiRequest('POST', `/api/tenders/${tenderId}/questions`, { question });
    },
    onSuccess: () => {
      setNewQuestion('');
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', tenderId, 'questions'] });
      toast({ title: "Question submitted", description: "Your question has been posted anonymously." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit question", description: error.message, variant: "destructive" });
    },
  });

  const { data: tender, isLoading, error } = useQuery<TenderInvite>({
    queryKey: ['/api/tenders', tenderId, 'invite'],
    enabled: !!tenderId,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${tenderId}/invite`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch tender');
      }
      return res.json();
    },
  });

  const { data: companyProfile } = useQuery<{ profile: { displayName?: string; logoUrl?: string } | null }>({
    queryKey: ['/api/companies', tender?.company?.id, 'profile'],
    enabled: !!tender?.company?.id,
    queryFn: async () => {
      const res = await fetch(`/api/companies/${tender!.company!.id}/profile`);
      if (!res.ok) return { profile: null };
      return res.json();
    },
  });

  if (!tenderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Link</h2>
          <p className="text-sm text-gray-600 mb-4">No tender ID provided.</p>
          <Button onClick={() => navigate("/")} className="w-full">Go to Home</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#E25E45]" data-testid="loader-page" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Tender Not Found</h2>
          <p className="text-sm text-gray-600 mb-4">{(error as any)?.message || "This tender doesn't exist or is no longer available."}</p>
          <Button onClick={() => navigate("/")} className="w-full">Go to Home</Button>
        </div>
      </div>
    );
  }

  // ── Deadline helpers ─────────────────────────────────────────────────────────
  const now = new Date();
  const deadlineDate = new Date(tender.deadline);
  // Compare using local calendar dates to avoid UTC/timezone mismatch
  const toLocalDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const isDeadlineToday = toLocalDateKey(deadlineDate) === toLocalDateKey(now);
  const isDeadlinePassed = deadlineDate < now && !isDeadlineToday;
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const deadlineSubtext = () => {
    if (isDeadlinePassed) return null;
    if (isDeadlineToday) return 'Closes today';
    if (daysRemaining === 1) return '1 day left';
    if (daysRemaining <= 7) return `${daysRemaining} days left`;
    return null;
  };

  // ── Duration helpers ─────────────────────────────────────────────────────────
  const durationLabel = (() => {
    if (tender.duration && DURATION_LABELS[tender.duration]) return DURATION_LABELS[tender.duration];
    if (tender.duration) return tender.duration;
    return null;
  })();

  const durationDisplay = durationLabel || (() => {
    if (tender.startDate && tender.endDate) {
      const start = new Date(tender.startDate);
      const end = new Date(tender.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months <= 1) return 'Up to 1 month';
      if (months <= 3) return '1 to 3 months';
      if (months <= 6) return '3 to 6 months';
      return 'More than 6 months';
    }
    return null;
  })();

  // Show date range only when no duration label/text is set at all
  const showDurationDateRange = !tender.duration && (tender.startDate || tender.endDate);

  // ── Budget helpers ───────────────────────────────────────────────────────────
  const getBudgetDisplay = () => {
    const showPrice = tender.showPriceToVendors !== false;
    if (!showPrice) {
      if (tender.projectSize) return PROJECT_SIZE_LABELS[tender.projectSize] || tender.projectSize;
      return "Disclosed upon qualification";
    }
    if (tender.budgetMin && tender.budgetMax) return `SAR ${tender.budgetMin.toLocaleString()} – ${tender.budgetMax.toLocaleString()}`;
    if (tender.budget) return formatCurrency(tender.budget);
    return tender.budgetRange || 'Not specified';
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleSubmitOffer = () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login or create an account to submit a proposal." });
      localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`);
      window.open("/login", "_blank");
      return;
    }
    setShowOfferModal(true);
  };

  // ── Section visibility ───────────────────────────────────────────────────────
  const hasDeliverables = !!(tender.deliverables && tender.deliverables.length > 0);
  const hasMilestones = !!(tender.milestones && tender.milestones.length > 0);
  const hasEvalCriteria = tender.evaluationCriteria && (
    Array.isArray(tender.evaluationCriteria)
      ? tender.evaluationCriteria.length > 0
      : (tender.evaluationCriteria.weights?.length > 0 || tender.evaluationCriteria.requirements?.length > 0 || tender.evaluationCriteria.customCriteria?.length > 0)
  );
  const hasVendorRequirements = !!(tender.vendorRequirements && tender.vendorRequirements.length > 0);
  const hasExternalContact = !!(tender.inquiryType && tender.inquiryType !== 'inside_bid' && (tender.emailContact || tender.whatsappContact));
  const hasSubmissionSection = !!(tender.submissionType || hasVendorRequirements || hasExternalContact);
  const hasCustomCards = !!(tender.formCards && tender.formCards.some(c =>
    c.value !== null && c.value !== undefined && c.value !== '' &&
    !(Array.isArray(c.value) && c.value.length === 0)
  ));
  const hasMedia = !!(tender.voiceNoteUrl || tender.videoUrl);
  const showQA = tender.inquiryType === 'inside_bid';

  const mandatoryRequirements = tender.vendorRequirements?.filter(r => r.type === 'mandatory') || [];
  const preferredRequirements = tender.vendorRequirements?.filter(r => r.type === 'preferred') || [];

  const allSections: { id: SectionId; label: string; icon: any; show: boolean }[] = [
    { id: 'scope',      label: 'Project Scope',           icon: FileText,       show: true },
    { id: 'custom',     label: 'Additional Requirements', icon: ClipboardCheck, show: hasCustomCards },
    { id: 'evaluation', label: 'Evaluation Criteria',     icon: Star,           show: !!hasEvalCriteria },
    { id: 'submission', label: 'Submission Requirements', icon: Shield,         show: hasSubmissionSection },
    { id: 'context',    label: 'Additional Context',      icon: Mic,            show: hasMedia },
    { id: 'qa',         label: 'Vendor Q&A',              icon: MessageSquare,  show: showQA },
  ];
  const sections = allSections.filter(s => s.show);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const logoUrl = companyProfile?.profile?.logoUrl || tender.profile?.logoUrl;
  const displayName = companyProfile?.profile?.displayName || tender.profile?.displayName || tender.company?.name;

  // ── Proposal checklist for sidebar ──────────────────────────────────────────
  interface ChecklistItem { text: string; hint?: string; category: 'document' | 'video' | 'eligibility' }
  const proposalChecklist: ChecklistItem[] = [];

  if (tender.submissionType === 'quote_only') {
    proposalChecklist.push({ text: 'Detailed price quotation', hint: 'Line-by-line breakdown', category: 'document' });
  } else if (tender.submissionType === 'video_only') {
    proposalChecklist.push({ text: 'Video pitch recording', category: 'video' });
  } else if (tender.submissionType === 'tech_fin_proposal') {
    proposalChecklist.push({ text: 'Technical proposal', hint: 'PDF', category: 'document' });
    proposalChecklist.push({ text: 'Financial proposal', hint: 'PDF', category: 'document' });
  } else if (tender.submissionType === 'tech_fin_with_video') {
    proposalChecklist.push({ text: 'Technical proposal', hint: 'PDF', category: 'document' });
    proposalChecklist.push({ text: 'Financial proposal', hint: 'PDF', category: 'document' });
    proposalChecklist.push({ text: 'Video pitch', hint: tender.videoRequired ? 'Required' : 'Optional', category: 'video' });
  }

  // Add items from evaluation requirements that map to deliverables
  if (!Array.isArray(tender.evaluationCriteria) && tender.evaluationCriteria?.requirements) {
    tender.evaluationCriteria.requirements.forEach((req: any) => {
      const label = EVAL_REQUIREMENT_CHECKLIST[req.requirementId];
      if (label) proposalChecklist.push({ text: label, category: 'document' });
    });
  }

  // Add mandatory vendor requirements (up to 3 — don't overwhelm)
  mandatoryRequirements.slice(0, 3).forEach(req => {
    proposalChecklist.push({ text: req.text, category: 'eligibility' });
  });

  const remainingReqCount = Math.max(0, mandatoryRequirements.length - 3);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img src={logoPath} alt="Bid" className="h-9 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/")} />
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.open("/login", "_blank")} data-testid="button-login">Login</Button>
                <Button size="sm" className="bg-[#E25E45] hover:bg-[#d54d35] text-white" onClick={() => window.open("/signup", "_blank")} data-testid="button-signup">Sign Up</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="button-dashboard">Dashboard</Button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-6">

          {/* Company & Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName} className="w-14 h-14 rounded-xl object-cover border border-gray-200 shadow-sm" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm">
                  <Building2 className="h-7 w-7 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-gray-900 font-bold text-lg">{displayName}</p>
                <p className="text-gray-400 text-sm">Requesting Organization</p>
              </div>
            </div>
            <div>
              {tender.status === 'published' && !isDeadlinePassed && !isDeadlineToday && (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1" data-testid="badge-status">
                  Open for Submissions
                </Badge>
              )}
              {isDeadlineToday && (
                <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-3 py-1">
                  Closes Today
                </Badge>
              )}
              {isDeadlinePassed && (
                <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1">Closed</Badge>
              )}
            </div>
          </div>

          {/* Title */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Title</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2" data-testid="text-tender-title">
            {tender.title}
          </h1>
          <div className="flex items-center gap-3 text-gray-400 text-sm mb-5">
            {tender.createdAt && <span>Published {formatDate(tender.createdAt)}</span>}
            <span>·</span>
            <span className="font-mono text-xs">RFP-{tenderId?.slice(0, 8).toUpperCase()}</span>
          </div>


        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-6">

            {/* ── Main document column ─────────────────────────────────────── */}
            <div>

              {/* Mobile At a Glance (collapsible) */}
              <MobileAtAGlance
                tender={tender}
                isDeadlinePassed={isDeadlinePassed}
                isDeadlineToday={isDeadlineToday}
                daysRemaining={daysRemaining}
                formatDate={formatDate}
                deadlineSubtext={deadlineSubtext}
                getBudgetDisplay={getBudgetDisplay}
                durationDisplay={durationDisplay}
              />

              {/* Table of Contents */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
                <div className="flex">
                  {sections.map((section, idx) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#E25E45] text-white'
                            : 'bg-gray-50 border-r border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm hover:text-gray-800'
                        } ${idx === sections.length - 1 ? '' : isActive ? '' : ''}`}
                      >
                        <span className={`text-xs font-mono ${isActive ? 'text-white/70' : 'text-gray-300'}`}>{idx + 1}</span>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Continuous Document ─────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* §1 Project Scope */}
                <SectionObserver id="scope" onVisible={() => setActiveSection('scope')}>
                  <div id="section-scope" className="p-6 sm:p-8 scroll-mt-24">
                    <SectionHeader index={sections.findIndex(s => s.id === 'scope') + 1} title="Project Scope" />

                    {/* Description */}
                    <div className="prose prose-sm max-w-none mb-6">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Project Description</p>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px]" data-testid="text-description">
                        {tender.description}
                      </p>
                    </div>

                    {/* Duration row — milestone strip */}
                    {durationDisplay && (
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Project Duration
                        </h3>
                        <div className="relative bg-gray-50 border border-gray-200 rounded-xl px-6 py-5">
                          <div className="flex items-center justify-center mb-3">
                            <span className="text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-full px-4 py-1 shadow-sm">{durationDisplay}</span>
                          </div>
                          <div className="relative flex items-center">
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-[3px] border-blue-100 shadow-sm" />
                              <span className="text-[11px] font-semibold text-gray-500 mt-1.5 whitespace-nowrap">
                                {tender.startDate ? formatDate(tender.startDate) : formatDate(tender.createdAt)}
                              </span>
                            </div>
                            <div className="flex-1 mx-2 relative">
                              <div className="h-[2px] bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 rounded-full" />
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-300 rounded-full" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#E25E45] border-[3px] border-orange-100 shadow-sm" />
                              <span className="text-[11px] font-semibold text-gray-500 mt-1.5 whitespace-nowrap">
                                {tender.endDate ? formatDate(tender.endDate) : formatDate(tender.deadline)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Objective */}
                    {tender.objective && (
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4" /> Project Objective
                        </h3>
                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{tender.objective}</p>
                        </div>
                      </div>
                    )}

                    {/* Deliverables */}
                    {hasDeliverables && (
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                          <ListChecks className="h-4 w-4" /> Deliverables
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Address each item with pricing and timeline in your proposal.</p>
                        <div className="space-y-2.5">
                          {tender.deliverables!.map((deliverable, index) => {
                            if (typeof deliverable === 'string') {
                              return (
                                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#E25E45] text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
                                  <span className="text-gray-800 pt-0.5 leading-relaxed">{deliverable}</span>
                                </div>
                              );
                            }
                            return (
                              <div key={deliverable.id || index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#E25E45] text-white text-xs font-bold flex items-center justify-center mt-0.5">{index + 1}</span>
                                    <div>
                                      <p className="font-semibold text-gray-900">{deliverable.name}</p>
                                      {deliverable.description && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{deliverable.description}</p>}
                                    </div>
                                  </div>
                                  {(deliverable.quantity || deliverable.unit) && (
                                    <span className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#E25E45]/10 text-[#E25E45]">
                                      {deliverable.quantity} × {deliverable.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {tender.attachments && tender.attachments.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                          <Paperclip className="h-4 w-4" /> Attachments
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Supporting documents provided by the requester. Review these before preparing your proposal.</p>
                        <div className="space-y-2">
                          {tender.attachments.map((file) => {
                            const icon = file.type?.includes('pdf') ? <FileText className="h-5 w-5 text-red-500" />
                              : (file.type?.includes('sheet') || file.type?.includes('excel') || file.type?.includes('xls')) ? <FileText className="h-5 w-5 text-green-500" />
                              : file.type?.includes('image') ? <FileText className="h-5 w-5 text-blue-500" />
                              : <Paperclip className="h-5 w-5 text-gray-500" />;
                            const sizeStr = file.size < 1024 ? `${file.size} B`
                              : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB`
                              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
                            if (!user) {
                              return (
                                <div key={file.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                  {icon}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-400">{sizeStr}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`); window.open("/login", "_blank"); }}
                                  >
                                    Log in to download
                                  </Button>
                                </div>
                              );
                            }
                            return (
                              <button
                                key={file.id}
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("token");
                                    const headers: HeadersInit = {};
                                    if (token) headers.Authorization = `Bearer ${token}`;
                                    const response = await fetch(file.url, { headers });
                                    if (!response.ok) throw new Error("Download failed");
                                    const blob = await response.blob();
                                    const blobUrl = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = blobUrl;
                                    a.download = file.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(blobUrl);
                                  } catch {
                                    toast({ title: "Download failed", description: "Could not download the file. Please try again.", variant: "destructive" });
                                  }
                                }}
                                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-100 transition-colors group text-left"
                              >
                                {icon}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#E25E45] transition-colors">{file.name}</p>
                                  <p className="text-xs text-gray-400">{sizeStr}</p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-[#E25E45] transition-colors flex-shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Required Skills */}
                    {tender.skills && tender.skills.length > 0 && (
                      <div className={hasMilestones ? "mb-8" : ""}>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Tag className="h-4 w-4" /> Required Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {tender.skills.map((skill, index) => (
                            <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100" data-testid={`badge-skill-${index}`}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestones & Payments (inline within scope) */}
                    {hasMilestones && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                          <Flag className="h-4 w-4" /> Milestones & Payments
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">Payments are released upon completion and acceptance of each milestone.</p>
                        <div className="space-y-3">
                          {tender.milestones!.map((milestone, index) => (
                            <div key={milestone.id || index} className="relative flex gap-4">
                              {index < tender.milestones!.length - 1 && (
                                <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-[#E25E45]/30 to-transparent" />
                              )}
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E25E45] text-white font-bold text-sm flex items-center justify-center z-10 shadow-sm">{index + 1}</div>
                              <div className="flex-1 pb-2">
                                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                  <p className="font-semibold text-gray-900">{milestone.name}</p>
                                  {milestone.description && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{milestone.description}</p>}
                                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    {milestone.dueDate && (
                                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100">
                                        <Calendar className="h-3.5 w-3.5" /> {formatDate(milestone.dueDate)}
                                      </span>
                                    )}
                                    {milestone.amount && (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E25E45] bg-[#E25E45]/8 px-3 py-1.5 rounded-lg">
                                        <DollarSign className="h-3.5 w-3.5" /> SAR {Number(milestone.amount).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {tender.milestones!.some(m => m.amount) && (
                          <div className="mt-4 p-4 bg-[#E25E45]/5 rounded-xl border border-[#E25E45]/10 flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">Total milestone value</span>
                            <span className="text-lg font-bold text-gray-900">
                              SAR {tender.milestones!.reduce((sum, m) => sum + (Number(m.amount) || 0), 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </SectionObserver>

                {/* §2 Additional Requirements (custom fields) */}
                {hasCustomCards && (
                  <>
                    <SectionDivider />
                    <SectionObserver id="custom" onVisible={() => setActiveSection('custom')}>
                      <div id="section-custom" className="p-6 sm:p-8 scroll-mt-24">
                        <SectionHeader index={sections.findIndex(s => s.id === 'custom') + 1} title="Additional Requirements" />
                        <p className="text-sm text-gray-400 mb-6">
                          The requester has specified additional requirements for this project. Address these in your proposal.
                        </p>
                        <div className="space-y-4">
                          {tender.formCards!.map((card) => {
                            if (card.value === null || card.value === undefined || card.value === '') return null;
                            if (Array.isArray(card.value) && card.value.length === 0) return null;
                            return (
                              <div key={card.id} className="rounded-xl border border-gray-100 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                  {card.type === 'custom-date'
                                    ? <Calendar className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                                    : card.type === 'custom-select'
                                    ? <Layers className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                                    : <Hash className="h-3.5 w-3.5 text-[#E25E45] flex-shrink-0" />}
                                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    {card.label}
                                  </span>
                                  {card.isRequired && (
                                    <span className="ml-auto text-[10px] font-bold text-red-400 uppercase tracking-wider">Required</span>
                                  )}
                                </div>
                                <div className="px-4 py-3 bg-white">
                                  {card.type === 'custom-date' ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                      <span className="text-gray-800 font-medium">{formatDate(card.value)}</span>
                                    </div>
                                  ) : card.type === 'custom-select' ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                                      {card.value}
                                    </span>
                                  ) : (
                                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{card.value}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </SectionObserver>
                  </>
                )}

                {/* §3 Evaluation Criteria */}
                {hasEvalCriteria && (
                  <>
                    <SectionDivider />
                    <SectionObserver id="evaluation" onVisible={() => setActiveSection('evaluation')}>
                      <div id="section-evaluation" className="p-6 sm:p-8 scroll-mt-24">
                        <SectionHeader index={sections.findIndex(s => s.id === 'evaluation') + 1} title="Evaluation Criteria" />
                        <p className="text-sm text-gray-400 mb-6">
                          Proposals will be scored against these criteria. Address each one directly in your submission.
                        </p>

                        {/* Weighted categories */}
                        {!Array.isArray(tender.evaluationCriteria) && (tender.evaluationCriteria.weights?.length > 0 || tender.evaluationCriteria.customCriteria?.length > 0) ? (
                          <div>
                            {/* Visual weight bar */}
                            <div className="mb-6">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <BarChart3 className="h-3.5 w-3.5" /> Score Distribution
                              </p>
                              <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
                                {tender.evaluationCriteria.weights.map((w: any, i: number) => (
                                  <div
                                    key={w.categoryId}
                                    style={{ width: `${w.weight}%` }}
                                    className={`${CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]} first:rounded-l-full last:rounded-r-full`}
                                    title={`${EVAL_CATEGORY_INFO[w.categoryId]?.name || w.categoryId}: ${w.weight}%`}
                                  />
                                ))}
                                {(tender.evaluationCriteria.customCriteria || []).map((c: any, j: number) => {
                                  const i = tender.evaluationCriteria.weights.length + j;
                                  return (
                                    <div
                                      key={c.id}
                                      style={{ width: `${c.weight}%` }}
                                      className={`${CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]} first:rounded-l-full last:rounded-r-full`}
                                      title={`${c.text}: ${c.weight}%`}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex flex-wrap gap-4">
                                {tender.evaluationCriteria.weights.map((w: any, i: number) => {
                                  const catInfo = EVAL_CATEGORY_INFO[w.categoryId];
                                  return (
                                    <div key={w.categoryId} className="flex items-center gap-2">
                                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${CATEGORY_DOT_COLORS[i % CATEGORY_DOT_COLORS.length]}`} />
                                      <span className="text-sm text-gray-600">
                                        {catInfo?.name || w.categoryId}
                                        <span className={`font-bold ml-1.5 ${CATEGORY_TEXT_COLORS[i % CATEGORY_TEXT_COLORS.length]}`}>{w.weight}%</span>
                                      </span>
                                    </div>
                                  );
                                })}
                                {(tender.evaluationCriteria.customCriteria || []).map((c: any, j: number) => {
                                  const i = tender.evaluationCriteria.weights.length + j;
                                  return (
                                    <div key={c.id} className="flex items-center gap-2">
                                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${CATEGORY_DOT_COLORS[i % CATEGORY_DOT_COLORS.length]}`} />
                                      <span className="text-sm text-gray-600">
                                        {c.text}
                                        <span className={`font-bold ml-1.5 ${CATEGORY_TEXT_COLORS[i % CATEGORY_TEXT_COLORS.length]}`}>{c.weight}%</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Expandable category cards */}
                            <div className="space-y-3">
                              {tender.evaluationCriteria.weights.map((w: any, i: number) => {
                                const catInfo = EVAL_CATEGORY_INFO[w.categoryId];
                                const catRequirements = (tender.evaluationCriteria.requirements || []).filter((r: any) => r.categoryId === w.categoryId);
                                const isExpanded = expandedEvalCategories[w.categoryId] || false;
                                const colorClass = CATEGORY_LIGHT_COLORS[i % CATEGORY_LIGHT_COLORS.length];
                                return (
                                  <div key={w.categoryId} className="rounded-xl border border-gray-200 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedEvalCategories(prev => ({ ...prev, [w.categoryId]: !prev[w.categoryId] }))}
                                      className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors text-left"
                                    >
                                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900">{catInfo?.name || w.categoryId}</p>
                                        {catInfo?.description && <p className="text-xs text-gray-400 mt-0.5">{catInfo.description}</p>}
                                      </div>
                                      <div className="flex-shrink-0 flex items-baseline gap-0.5">
                                        <span className={`text-2xl font-black ${CATEGORY_TEXT_COLORS[i % CATEGORY_TEXT_COLORS.length]}`}>{w.weight}</span>
                                        <span className="text-xs text-gray-400">%</span>
                                      </div>
                                    </button>
                                    <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                      <div className="overflow-hidden">
                                        {w.categoryId === 'financial' && getBudgetDisplay() !== 'Not specified' && (
                                          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-t border-gray-100">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Project Budget</span>
                                            <span className="text-sm font-bold text-gray-900">{getBudgetDisplay()}</span>
                                          </div>
                                        )}
                                        {catRequirements.length > 0 ? (
                                          <div className={`px-5 py-4 space-y-3 ${w.categoryId === 'financial' && getBudgetDisplay() !== 'Not specified' ? '' : 'border-t border-gray-100'}`}>
                                            {catRequirements.map((req: any, j: number) => {
                                              const reqInfo = EVAL_REQUIREMENT_INFO[req.requirementId];
                                              const displayValue = req.value && typeof req.value !== 'boolean'
                                                ? (reqInfo?.formatValue ? reqInfo.formatValue(String(req.value)) : String(req.value))
                                                : null;
                                              return (
                                                <div key={j} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800">{reqInfo?.label || req.requirementId}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{reqInfo?.description || ''}</p>
                                                    {displayValue && <p className="text-xs font-semibold text-[#E25E45] mt-1.5">{displayValue}</p>}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="px-5 py-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-400 italic">No specific sub-requirements for this category.</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Custom criteria */}
                              {tender.evaluationCriteria.customCriteria?.length > 0 && (
                                <div className="pt-2">
                                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional Criteria</p>
                                  <div className="space-y-2">
                                    {tender.evaluationCriteria.customCriteria.map((c: any) => (
                                      <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-sm font-medium text-gray-800">{c.text}</span>
                                        <span className="text-sm font-bold text-[#E25E45]">{c.weight}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Simple array criteria */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(tender.evaluationCriteria as any[]).map((criteria: any, index: number) => {
                              const label = typeof criteria === 'string' ? (CRITERIA_LABELS[criteria] || criteria) : (criteria.name || criteria);
                              return (
                                <div key={index} className="flex items-center gap-3 p-4 bg-amber-50/60 rounded-xl border border-amber-100">
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Star className="h-4 w-4 text-amber-600" />
                                  </div>
                                  <span className="font-medium text-gray-800 text-sm">{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </SectionObserver>
                  </>
                )}

                {/* §4 Submission Requirements */}
                {hasSubmissionSection && (
                  <>
                    <SectionDivider />
                    <SectionObserver id="submission" onVisible={() => setActiveSection('submission')}>
                      <div id="section-submission" className="p-6 sm:p-8 scroll-mt-24">
                        <SectionHeader index={sections.findIndex(s => s.id === 'submission') + 1} title="Submission Requirements" />

                        {/* What to Submit */}
                        {tender.submissionType && (
                          <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <ClipboardCheck className="h-4 w-4" /> What to Submit
                            </h3>

                            {/* Format card */}
                            <div className="p-5 bg-[#E25E45]/5 border border-[#E25E45]/15 rounded-xl mb-3">
                              <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-[#E25E45]/10 rounded-xl flex-shrink-0">
                                  <FileText className="h-5 w-5 text-[#E25E45]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900">{SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}</p>
                                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{SUBMISSION_TYPE_DESC[tender.submissionType] || ''}</p>
                                </div>
                              </div>
                            </div>

                            {/* Video requirement notice */}
                            {tender.videoRequired && (
                              <div className="flex items-center gap-2.5 px-4 py-3 bg-orange-50 rounded-xl border border-orange-200">
                                <Video className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-orange-800">Video submission is mandatory for this RFP</span>
                              </div>
                            )}

                            {/* Deadline reminder */}
                            <div className="mt-3 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="h-4 w-4 text-[#E25E45]" />
                                <span>Submission deadline</span>
                              </div>
                              <span className={`text-sm font-bold ${isDeadlinePassed ? 'text-red-600' : isDeadlineToday ? 'text-orange-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {formatDate(tender.deadline)}
                                {deadlineSubtext() && <span className="ml-2 font-normal text-xs">({deadlineSubtext()})</span>}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Eligibility Requirements */}
                        {hasVendorRequirements && (
                          <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Shield className="h-4 w-4" /> Eligibility Requirements
                            </h3>
                            <p className="text-xs text-gray-400 mb-5">
                              Your company must meet the following requirements to be eligible for this opportunity.
                            </p>

                            {mandatoryRequirements.length > 0 && (
                              <div className="mb-5">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Mandatory</span>
                                  <span className="text-xs text-gray-400">— must meet all to be eligible</span>
                                </div>
                                <div className="space-y-2">
                                  {mandatoryRequirements.map((req) => (
                                    <div key={req.id} className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                      <span className="text-sm text-gray-800 flex-1">{req.text}</span>
                                      <span className="flex-shrink-0 text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">Required</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {preferredRequirements.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Preferred</span>
                                  <span className="text-xs text-gray-400">— strengthens your proposal</span>
                                </div>
                                <div className="space-y-2">
                                  {preferredRequirements.map((req) => (
                                    <div key={req.id} className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                                      <CheckCircle2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                      <span className="text-sm text-gray-800 flex-1">{req.text}</span>
                                      <span className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Preferred</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contact for questions (non-platform) */}
                        {hasExternalContact && (
                          <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" /> Questions & Contact
                            </h3>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                              {tender.emailContact && (
                                <a href={`mailto:${tender.emailContact}`} className="flex items-center gap-2.5 text-sm text-blue-600 hover:text-blue-700 hover:underline">
                                  <Mail className="h-4 w-4" /> {tender.emailContact}
                                </a>
                              )}
                              {tender.whatsappContact && (
                                <a href={`https://wa.me/${tender.whatsappContact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-emerald-600 hover:text-emerald-700 hover:underline">
                                  <Phone className="h-4 w-4" /> {tender.whatsappContact}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </SectionObserver>
                  </>
                )}

                {/* §5 Additional Context */}
                {hasMedia && (
                  <>
                    <SectionDivider />
                    <SectionObserver id="context" onVisible={() => setActiveSection('context')}>
                      <div id="section-context" className="p-6 sm:p-8 scroll-mt-24">
                        <SectionHeader index={sections.findIndex(s => s.id === 'context') + 1} title="Additional Context" />
                        <p className="text-sm text-gray-400 mb-6">The requester has provided additional media. Review carefully before preparing your proposal.</p>
                        <div className="space-y-6">
                          {tender.voiceNoteUrl && (
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Mic className="h-4 w-4 text-pink-500" /> Voice Note
                              </h3>
                              {user ? (
                                <AudioPlayer src={tender.voiceNoteUrl} />
                              ) : (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                      <Play className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Voice note available</p>
                                      <p className="text-sm text-gray-500">Log in to listen</p>
                                    </div>
                                  </div>
                                  <Button size="sm" onClick={() => { localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`); window.open("/login", "_blank"); }} data-testid="button-login-voice">Login</Button>
                                </div>
                              )}
                            </div>
                          )}
                          {tender.videoUrl && (
                            <div>
                              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Video className="h-4 w-4 text-blue-500" /> Video Explanation
                              </h3>
                              <a href={tender.videoUrl.startsWith('http') ? tender.videoUrl : `https://${tender.videoUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium">
                                <ExternalLink className="h-4 w-4" /> Watch Video
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </SectionObserver>
                  </>
                )}


              </div>
              {/* end document */}
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────────────── */}
            <div className="hidden lg:block">
              <div className="sticky top-20 space-y-4">

                {/* At a Glance */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">At a Glance</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg p-2.5 border ${isDeadlineToday ? 'bg-orange-50 border-orange-200' : isDeadlinePassed ? 'bg-red-50 border-red-100' : daysRemaining <= 3 ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className={`h-3 w-3 flex-shrink-0 ${isDeadlineToday ? 'text-orange-500' : isDeadlinePassed ? 'text-red-500' : 'text-[#E25E45]'}`} />
                        <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Deadline</span>
                      </div>
                      <p className={`text-xs font-bold leading-tight ${isDeadlinePassed ? 'text-red-600' : isDeadlineToday || daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-800'}`}>
                        {formatDate(tender.deadline)}
                      </p>
                      {deadlineSubtext() && (
                        <p className={`text-[10px] mt-0.5 ${isDeadlineToday ? 'text-orange-500' : 'text-gray-400'}`}>{deadlineSubtext()}</p>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                        <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Budget</span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 leading-tight">{getBudgetDisplay()}</p>
                    </div>
                    {durationDisplay && (
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="h-3 w-3 flex-shrink-0 text-blue-500" />
                          <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Duration</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{durationDisplay}</p>
                      </div>
                    )}
                    {tender.submissionType && (
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="h-3 w-3 flex-shrink-0 text-purple-500" />
                          <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Format</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}</p>
                      </div>
                    )}
                    {tender.category && (
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 col-span-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Tag className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                          <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Category</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{tender.category}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit CTA */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  {isDeadlinePassed ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Submissions Closed</p>
                      <p className="text-xs text-gray-400 mb-4">This RFP is no longer accepting proposals.</p>
                    </>
                  ) : isDeadlineToday ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Closes Today</p>
                      <p className="text-xs text-orange-500 font-medium mb-4">Submit your proposal before end of day.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Ready to Submit?</p>
                      <p className="text-xs text-gray-400 mb-4">
                        {daysRemaining <= 7
                          ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                          : `Deadline: ${formatDate(tender.deadline)}`}
                      </p>
                    </>
                  )}
                  <Button
                    className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white py-5 text-sm font-semibold rounded-xl"
                    onClick={handleSubmitOffer}
                    disabled={isDeadlinePassed}
                    data-testid="button-submit-offer"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Proposal
                  </Button>
                  {!user && (
                    <p className="text-xs text-gray-400 text-center mt-2.5">You'll need to log in first</p>
                  )}
                </div>

                {/* Proposal Prep Checklist */}
                {proposalChecklist.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Prepare Your Submission</h4>

                    {/* Group: Documents & Media */}
                    {proposalChecklist.filter(i => i.category === 'document' || i.category === 'video').length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2">What to include</p>
                        <div className="space-y-2">
                          {proposalChecklist
                            .filter(i => i.category === 'document' || i.category === 'video')
                            .map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2.5">
                                <div className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${item.category === 'video' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
                                  {item.hint && <p className={`text-xs mt-0.5 ${item.hint === 'Required' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>{item.hint}</p>}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Group: Eligibility */}
                    {proposalChecklist.filter(i => i.category === 'eligibility').length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Must have</p>
                        <div className="space-y-2">
                          {proposalChecklist
                            .filter(i => i.category === 'eligibility')
                            .map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2.5">
                                <Shield className="flex-shrink-0 h-3.5 w-3.5 text-red-400 mt-0.5" />
                                <p className="text-xs text-gray-600 leading-snug">{item.text}</p>
                              </div>
                            ))}
                          {remainingReqCount > 0 && (
                            <button
                              onClick={() => scrollToSection('submission')}
                              className="text-xs text-[#E25E45] hover:underline pl-6"
                            >
                              +{remainingReqCount} more requirement{remainingReqCount !== 1 ? 's' : ''} →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Vendor Q&A Panel ─────────────────────────────────────────────────── */}
      {showQA && (
        <div id="section-qa" className="bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Vendor Inquiries</h2>
                  <p className="text-sm text-gray-400">Questions are answered anonymously and visible to all participants</p>
                </div>
              </div>
              {questions.length > 0 && (
                <Badge className="bg-blue-50 text-blue-600 border border-blue-200 text-xs">
                  {questions.length} question{questions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Q&A list */}
              <div>
                {questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map((qa) => (
                      <div key={qa.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-blue-100 flex-shrink-0 mt-0.5">
                            <HelpCircle className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium">{qa.question}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Asked {new Date(qa.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {qa.answer ? (
                          <div className="mt-3 ml-10 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-sm text-gray-700">{qa.answer}</p>
                            {qa.answeredAt && (
                              <p className="text-xs text-emerald-600 mt-1 font-medium">
                                Answered {new Date(qa.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 ml-10">
                            <span className="text-xs text-gray-400 italic">Awaiting response from the requester</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p className="text-sm font-medium">No questions yet</p>
                    <p className="text-xs mt-1 opacity-60">Be the first to ask a question</p>
                  </div>
                )}
              </div>

              {/* Ask a question form */}
              <div>
                {user ? (
                  <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">Your identity is hidden from the requester</span>
                    </div>
                    <Textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Type your question about this RFP..."
                      className="min-h-[90px] bg-white border-blue-200 resize-none mb-3 focus:ring-blue-300 focus:border-blue-300"
                      data-testid="input-question"
                    />
                    <Button
                      className="w-full bg-[#E25E45] hover:bg-[#d54d35]"
                      onClick={() => newQuestion.trim() && askQuestion.mutate(newQuestion.trim())}
                      disabled={askQuestion.isPending || !newQuestion.trim()}
                      data-testid="button-ask"
                    >
                      {askQuestion.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Submit Question
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 text-blue-300" />
                    <p className="text-sm font-semibold text-gray-800 mb-1">Have a question?</p>
                    <p className="text-xs text-gray-500 mb-4">Log in to ask the requester anything about this RFP</p>
                    <Button
                      size="sm"
                      className="bg-[#E25E45] hover:bg-[#d54d35]"
                      onClick={() => { localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`); window.open("/login", "_blank"); }}
                    >
                      Login to Ask
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom spacer so content isn't hidden behind sticky CTA */}
      <div className="lg:hidden h-24" />

      {/* Mobile bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t px-4 pt-2 pb-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Calendar className={`h-3 w-3 ${isDeadlinePassed ? 'text-red-500' : isDeadlineToday ? 'text-orange-500' : 'text-gray-400'}`} />
          <span className={`text-xs font-medium ${isDeadlinePassed ? 'text-red-600' : isDeadlineToday ? 'text-orange-600' : 'text-gray-500'}`}>
            {isDeadlinePassed ? 'Closed' : isDeadlineToday ? 'Closes today' : daysRemaining <= 7 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left` : `Due ${formatDate(tender.deadline)}`}
          </span>
        </div>
        <Button
          className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white py-5 text-base font-semibold rounded-xl"
          onClick={handleSubmitOffer}
          disabled={isDeadlinePassed}
          data-testid="button-submit-offer-mobile"
        >
          <Send className="h-5 w-5 mr-2" />
          Submit Proposal
        </Button>
      </div>

      {showOfferModal && (
        <SubmitOfferModal
          tender={{
            id: tender.id,
            title: tender.title,
            deadline: tender.deadline,
            budget: tender.budget,
            submissionType: tender.submissionType,
            videoRequired: tender.videoRequired,
          }}
          requester={{
            name: displayName || 'Unknown',
            company: tender.company?.name,
          }}
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionDivider() {
  return <div className="mx-6 sm:mx-8 border-t border-gray-100" />;
}

function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-mono text-gray-300 bg-gray-50 px-2 py-1 rounded border border-gray-100">
        {index}.0
      </span>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

function SectionObserver({ id, onVisible, children }: { id: string; onVisible: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { rootMargin: '-15% 0px -65% 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return <div ref={ref}>{children}</div>;
}
