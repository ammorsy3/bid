import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Clock, DollarSign, Mail, Copy, Check, ArrowLeft, ExternalLink, Edit, Trash2, Send, Users, Loader2, FileText, AlertCircle, Eye, EyeOff, Download, Mic, Video, Play, Pause, X, CheckCircle, XCircle, Target, ListChecks, Star, Phone, MessageSquare, Flag, BarChart, HelpCircle, Shield, Layers, Tag, CheckCircle2, ChevronRight, MapPin, Sparkles, Handshake, Store } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tender } from "@shared/schema";
import SubmitOfferModal from "@/components/submit-offer-modal";
import ProposalComparison from "@/components/ProposalComparison";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { viewAuthenticatedFile } from "@/lib/downloadFile";
import { useI18n } from "@/lib/i18n";
import { usePageTour, TourBanner } from "@/lib/tour";
import { TENDER_DETAILS_TOUR_STEPS, TOUR_BANNERS, getSteps } from "@/lib/tour-steps";

const SUBMISSION_TYPE_LABELS: Record<string, Record<string, string>> = {
  quote_only: { en: "Price Quote Only", ar: "عرض سعر فقط" },
  tech_fin_proposal: { en: "Full Proposal (Technical + Financial)", ar: "عرض كامل (فني + مالي)" },
  video_only: { en: "Video Pitch Only", ar: "عرض فيديو فقط" },
  tech_fin_with_video: { en: "Full Proposal + Video Pitch", ar: "عرض كامل + فيديو" },
  document_only: { en: "Document Only", ar: "مستند فقط" },
  both: { en: "Video & Document", ar: "فيديو ومستند" },
};

const CRITERIA_LABELS: Record<string, Record<string, string>> = {
  financial_offer: { en: "Competitive Pricing", ar: "تسعير تنافسي" },
  previous_work: { en: "Relevant Experience", ar: "خبرة ذات صلة" },
  clear_timeline: { en: "Clear Timeline", ar: "جدول زمني واضح" },
  technical_approach: { en: "Technical Approach", ar: "المنهجية الفنية" },
  team_expertise: { en: "Team Expertise", ar: "خبرات الفريق" },
};

const EVAL_CATEGORY_INFO: Record<string, Record<string, { name: string; description: string }>> = {
  experience: { en: { name: "Relevant Experience", description: "Track record in similar projects and industry expertise" }, ar: { name: "الخبرة ذات الصلة", description: "سجل الأعمال في مشاريع مماثلة والخبرة في المجال" } },
  financial: { en: { name: "Financial Evaluation", description: "Financial stability and pricing competitiveness" }, ar: { name: "التقييم المالي", description: "الاستقرار المالي والقدرة التنافسية في الأسعار" } },
  technical: { en: { name: "Technical Capability", description: "Technical approach, methodology, and delivery capability" }, ar: { name: "القدرة الفنية", description: "المنهجية الفنية وآلية التنفيذ والقدرة على التسليم" } },
};

const SCORE_BAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const SCORE_DOT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const SCORE_TEXT_COLORS = ['text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600', 'text-rose-600', 'text-orange-600', 'text-cyan-600', 'text-teal-600', 'text-indigo-600', 'text-fuchsia-600'];

type EvalReqInfo = { label: string; description: string; formatValue?: (v: string) => string };
const EVAL_REQUIREMENT_INFO: Record<string, Record<string, EvalReqInfo>> = {
  years_in_market: { en: { label: "Minimum Years in Market", description: "The company must have been operating for at least this many years in a relevant field.", formatValue: (v) => `${v}+ years required` }, ar: { label: "الحد الأدنى لسنوات العمل", description: "يجب أن تكون الشركة عاملة في المجال لهذا العدد من السنوات على الأقل.", formatValue: (v) => `${v}+ سنوات مطلوبة` } },
  similar_projects_count: { en: { label: "Similar Projects Completed", description: "The company must have successfully delivered this many comparable projects.", formatValue: (v) => `At least ${v} project${Number(v) > 1 ? 's' : ''} required` }, ar: { label: "مشاريع مماثلة منجزة", description: "يجب أن تكون الشركة قد أنجزت هذا العدد من المشاريع المماثلة.", formatValue: (v) => `${v} مشاريع على الأقل` } },
  min_project_value: { en: { label: "Minimum Project Value", description: "The company must have delivered at least one project of this value or higher.", formatValue: (v) => `${Number(v).toLocaleString()} SAR or higher` }, ar: { label: "الحد الأدنى لقيمة المشروع", description: "يجب أن تكون الشركة قد نفذت مشروعاً واحداً على الأقل بهذه القيمة أو أعلى.", formatValue: (v) => `${Number(v).toLocaleString()} ريال أو أكثر` } },
  client_references: { en: { label: "Client References Required", description: "The company must provide verifiable references from previous clients for similar work." }, ar: { label: "مراجع العملاء مطلوبة", description: "يجب على الشركة تقديم مراجع يمكن التحقق منها من عملاء سابقين لأعمال مماثلة." } },
  financial_statements: { en: { label: "Financial Statements Required", description: "The company must submit audited financial statements to demonstrate financial stability." }, ar: { label: "القوائم المالية مطلوبة", description: "يجب على الشركة تقديم قوائم مالية مدققة لإثبات الاستقرار المالي." } },
  bank_guarantee: { en: { label: "Bank Guarantee Capability", description: "The company must be able to provide a bank guarantee if required during the project." }, ar: { label: "القدرة على تقديم ضمان بنكي", description: "يجب أن تكون الشركة قادرة على تقديم ضمان بنكي إذا تطلب المشروع ذلك." } },
  methodology: { en: { label: "Detailed Methodology Required", description: "The company must submit a detailed project methodology explaining their approach and execution plan." }, ar: { label: "المنهجية التفصيلية مطلوبة", description: "يجب على الشركة تقديم منهجية تفصيلية توضح نهجها وخطة التنفيذ." } },
  timeline: { en: { label: "Project Timeline Required", description: "The company must provide a detailed project timeline with key milestones and delivery dates." }, ar: { label: "الجدول الزمني مطلوب", description: "يجب على الشركة تقديم جدول زمني مفصل بالمراحل الرئيسية ومواعيد التسليم." } },
  team_cvs: { en: { label: "Team CVs Required", description: "The company must submit CVs of key team members who will be working on this project." }, ar: { label: "السير الذاتية للفريق مطلوبة", description: "يجب على الشركة تقديم السير الذاتية لأعضاء الفريق الرئيسيين." } },
  industry_certifications: { en: { label: "Industry Certifications Required", description: "The company must hold relevant professional certifications for the specific field of work." }, ar: { label: "الشهادات المهنية مطلوبة", description: "يجب أن تمتلك الشركة شهادات مهنية ذات صلة بمجال العمل." } },
};

const INQUIRY_TYPE_LABELS: Record<string, Record<string, string>> = {
  inside_bid: { en: "Inside Bid Platform (Anonymous Q&A)", ar: "منصة المناقصة (أسئلة مجهولة)" },
  email_whatsapp: { en: "Email & WhatsApp", ar: "البريد الإلكتروني وواتساب" },
  whatsapp: { en: "WhatsApp", ar: "واتساب" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
};

const SCOPE_LABELS: Record<string, Record<string, string>> = {
  large: { en: "Large", ar: "كبير" },
  medium: { en: "Medium", ar: "متوسط" },
  small: { en: "Small", ar: "صغير" },
};

const PROJECT_SIZE_LABELS: Record<string, Record<string, string>> = {
  small: { en: "Small Project (Under 50K SAR)", ar: "مشروع صغير (أقل من 50 ألف ريال)" },
  medium: { en: "Medium Project (50K–250K SAR)", ar: "مشروع متوسط (50–250 ألف ريال)" },
  large: { en: "Large Project (250K+ SAR)", ar: "مشروع كبير (أكثر من 250 ألف ريال)" },
};

const DURATION_LABELS: Record<string, Record<string, string>> = {
  "6plus": { en: "More than 6 months", ar: "أكثر من 6 أشهر" },
  "3to6": { en: "3 to 6 months", ar: "3 إلى 6 أشهر" },
  "1to3": { en: "1 to 3 months", ar: "1 إلى 3 أشهر" },
};

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
        const response = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to load audio");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (err) {
        setError("Failed to load voice note");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAudio();
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
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
      <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading voice note...</span>
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">{error || "Failed to load voice note"}</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg" data-testid="audio-player">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-10 w-10 rounded-full bg-[#E25E45] text-white hover:bg-[#d54d35]"
        data-testid="button-audio-play"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex-1">
        <div
          className="relative h-2 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !duration || !isFinite(duration)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * duration;
            if (!isFinite(newTime) || isNaN(newTime)) return;
            audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
            setCurrentTime(Math.max(0, Math.min(newTime, duration)));
          }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#E25E45] rounded-full"
            style={{
              width: `${progress}%`,
              transition: isPlaying ? 'width 0.1s linear' : 'none'
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-[#E25E45] rounded-full shadow-md border-2 border-white"
            style={{
              left: `calc(${progress}% - 8px)`,
              transition: isPlaying ? 'left 0.1s linear' : 'none'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
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
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
}

function VendorAvatar({ logoUrl, name, className, gradient }: { logoUrl?: string | null; name: string; className: string; gradient: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${className} bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-white font-bold text-base leading-none">{initials}</span>
    </div>
  );
}

interface QaCompanyInfo {
  id: string;
  name: string;
  legalName?: string;
  crNumber?: string;
  vatNumber?: string;
  city?: string;
  category?: string;
  verificationStatus?: string;
  logoUrl?: string;
  displayName?: string;
  bio?: string;
}

interface TenderWithCounts extends Tender {
  offersCount: number;
  invitedCount: number;
}

interface Offer {
  id: string;
  tenderId: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  combinedFileUrl: string | null;
  notes: string | null;
  quotePrice: number | null;
  videoUrl: string | null;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  company: {
    id: string;
    name: string;
    category: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    bio: string | null;
    logoUrl: string | null;
  };
}

interface OfferAnalysis {
  id: string;
  offerId: string;
  status: string;
  executiveSummary: string | null;
  tableOfContents: { section: string; pageRange: string }[] | null;
  criteriaMapping: Record<string, string> | null;
  deliverables: string[] | null;
  financial: { total?: number; breakdown?: { item: string; amount: number }[]; paymentTerms?: string; vat?: number } | null;
  errorMessage: string | null;
  analyzedAt: string | null;
}

export default function TenderDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitOfferModalOpen, setIsSubmitOfferModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [expandedEvalCategories, setExpandedEvalCategories] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<string>('description');
  const [isNegotiationMode, setIsNegotiationMode] = useState(false);

  const canManage = activeCompany && ['owner', 'admin'].includes(activeCompany.role);

  const [qaProfileCompany, setQaProfileCompany] = useState<QaCompanyInfo | null>(null);

  const { data: qaQuestions = [] } = useQuery<Array<{
    id: string;
    question: string;
    answer: string | null;
    answeredAt: string | null;
    createdAt: string;
    askedByCompany?: QaCompanyInfo;
  }>>({
    queryKey: ['/api/tenders', id, 'questions'],
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${id}/questions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!id,
  });

  const answerQuestion = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      return await apiRequest('PATCH', `/api/tenders/${id}/questions/${questionId}/answer`, { answer });
    },
    onSuccess: (_, vars) => {
      setAnswerText(prev => { const copy = { ...prev }; delete copy[vars.questionId]; return copy; });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id, 'questions'] });
      toast({ title: t('tenderFlow.answerSubmittedToast'), description: t('tenderFlow.answerSubmittedDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.failedSubmitAnswerToast'), description: error.message, variant: "destructive" });
    },
  });

  const { data: tender, isLoading } = useQuery<TenderWithCounts>({
    queryKey: ['/api/tenders', id],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        useAuthStore.getState().logout();
        throw new Error("Session expired");
      }
      if (!response.ok) throw new Error("Failed to fetch tender");
      return response.json();
    },
    enabled: !!user && !!id,
    retry: false,
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery<Offer[]>({
    queryKey: ['/api/tenders', id, 'offers'],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}/offers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch offers");
      return response.json();
    },
    enabled: !!user && !!id && !!canManage,
  });

  const { data: myOffer } = useQuery<Offer | null>({
    queryKey: ['/api/tenders', id, 'my-offer'],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}/my-offer`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user && !!id && !!activeCompany,
  });

  const isOwner = tender?.companyId === activeCompany?.id;
  const tenderLanguage = (tender as any)?.language || 'en';
  const isTenderRtl = tenderLanguage === 'ar';
  const isRtl = language === 'ar';

  const { overlay: tourOverlay } = usePageTour({
    tourId: 'tender-details',
    userId: user?.id ?? '',
    steps: getSteps(TENDER_DETAILS_TOUR_STEPS, language),
    isRtl,
    autoStart: !!user && !!tender,
    autoStartDelay: 1500,
  });

  const { data: requesterProfile } = useQuery<{
    company: { id: string; name: string; category: string | null; verificationStatus: string };
    profile: { displayName: string | null; bio: string | null; logoUrl: string | null } | null;
  }>({
    queryKey: ['/api/companies', tender?.companyId, 'profile'],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${tender!.companyId}/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!tender?.companyId && !isOwner,
  });

  const isTenderOpen = tender?.status === 'published';
  const deadline = tender ? new Date(tender.deadline) : null;
  const isExpired = deadline ? deadline.getTime() < Date.now() : true;
  const hasSubmittedOffer = !!myOffer;
  const companyCanSubmit = activeCompany?.verificationStatus === 'verified' || activeCompany?.verificationStatus === 'under_review';
  const canSubmitOffer = !isOwner && isTenderOpen && !isExpired && !hasSubmittedOffer && companyCanSubmit;

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest('PATCH', `/api/tenders/${id}/status`, { status });
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      if (status === 'published' && tender?.invitationToken) {
        const inviteLink = `${window.location.origin}/invite/${tender.invitationToken}`;
        toast({
          title: t('tenderFlow.publishedToast'),
          description: t('tenderFlow.publishedToastDesc'),
          action: (
            <ToastAction altText={t('tenderFlow.copyLinkAlt')} onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: t('tenderFlow.linkCopiedToast') }); }}>
              <Copy className="h-3 w-3 mr-1" /> {t('tenderFlow.copyLink')}
            </ToastAction>
          ),
          duration: 10000,
        });
      } else {
        toast({ title: t('tenderFlow.statusUpdatedToast'), description: t('tenderFlow.statusUpdatedDesc') });
      }
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.failedUpdateStatusToast'), description: error.message, variant: "destructive" });
    }
  });

  const marketplaceSubmit = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/tenders/${id}/marketplace-submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id] });
      toast({ title: t('marketplace.submitted') || 'Submitted', description: t('marketplace.submittedDesc') || 'Your tender has been submitted for marketplace review' });
    },
    onError: (error: Error) => {
      toast({ title: t('marketplace.error'), description: error.message, variant: "destructive" });
    }
  });

  const deleteTender = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({ title: t('tenderFlow.tenderDeletedToast'), description: t('tenderFlow.tenderDeletedDesc') });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.failedDeleteToast'), description: error.message, variant: "destructive" });
    }
  });

  // Fetch existing AI analyses for this tender's offers
  const { data: offerAnalyses = [] } = useQuery<OfferAnalysis[]>({
    queryKey: ['/api/ai/proposal-analysis', id],
    queryFn: async () => {
      const res = await fetch(`/api/ai/proposal-analysis/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!id && !!isOwner,
  });

  // Fetch negotiation actions for this tender
  const { data: negotiationActions = [] } = useQuery<any[]>({
    queryKey: ['/api/tenders', id, 'negotiation-actions'],
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${id}/negotiation-actions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user && !!id && !!isOwner && tender?.status === 'closed',
  });

  // Per-offer AI analysis mutation
  const analyzeOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest('POST', `/api/ai/analyze-offer/${offerId}`, { language });
      return res.json();
    },
    onSuccess: (data: any, offerId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/proposal-analysis', id] });
      if (data?.status === 'failed') {
        toast({ title: t('tenderFlow.analysisFailedToast'), description: data.errorMessage || t('tenderFlow.analysisFailedDesc'), variant: "destructive" });
      } else {
        setAnalysisDrawerOfferId(offerId);
        toast({ title: t('tenderFlow.analysisCompleteToast'), description: t('tenderFlow.analysisCompleteDesc') });
      }
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.analysisFailedToast'), description: error.message, variant: "destructive" });
    }
  });

  const [analysisDrawerOfferId, setAnalysisDrawerOfferId] = useState<string | null>(null);

  const copyInvitationLink = async () => {
    if (!tender) return;
    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: t('tenderFlow.copiedToast'), description: t('tenderFlow.copiedToastDesc') });
    } catch (error) {
      toast({ title: t('tenderFlow.failedCopyToast'), description: t('tenderFlow.failedCopyDesc'), variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', label: t('tenderFlow.statusOpen') };
      case 'draft':
        return { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', label: t('tenderFlow.statusDraft') };
      case 'closed':
        return { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: t('tenderFlow.statusClosed') };
      case 'cancelled':
        return { className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: t('tenderFlow.statusCancelled') };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const getDurationDisplay = () => {
    if (tender.duration && DURATION_LABELS[tender.duration]) return DURATION_LABELS[tender.duration]?.[language] || DURATION_LABELS[tender.duration]?.en;
    if (tender.duration) return tender.duration;
    if (tender.startDate && tender.endDate) {
      const start = new Date(tender.startDate);
      const end = new Date(tender.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months <= 3) return DURATION_LABELS["1to3"]?.[language];
      if (months <= 6) return DURATION_LABELS["3to6"]?.[language];
      return DURATION_LABELS["6plus"]?.[language];
    }
    return t('tenderFlow.notSpecified');
  };

  const getBudgetDisplay = () => {
    if (!tender) return null;
    const showPrice = tender.showPriceToVendors !== false;
    const sar = t('tenderFlow.sarCurrency');

    if (!showPrice && !isOwner) {
      if (tender.projectSize) {
        return PROJECT_SIZE_LABELS[tender.projectSize]?.[language] || tender.projectSize;
      }
      return t('tenderFlow.budgetDisclosedUponQualification');
    }

    if (tender.budgetMin && tender.budgetMax) {
      return `${sar} ${tender.budgetMin.toLocaleString()} – ${tender.budgetMax.toLocaleString()}`;
    }
    if (tender.budget) {
      const numBudget = Number(tender.budget);
      if (!isNaN(numBudget) && numBudget > 0) {
        return `${sar} ${numBudget.toLocaleString()}`;
      }
      return tender.budget;
    }
    return tender.budgetRange || t('tenderFlow.notSpecified');
  };

  if (!user) {
    const returnPath = `/tenders/${id}`;
    setLocation(`/login?redirect=${encodeURIComponent(returnPath)}`);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E25E45]" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E25E45]" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <h3 className="text-xl font-semibold mb-2">{t('tenderFlow.tenderNotFoundTitle')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('tenderFlow.tenderNotFoundMessage')}
              </p>
              <Button onClick={() => setLocation('/dashboard')}>
                <ArrowLeft className={`h-4 w-4 ${isRtl ? 'ml-2 rotate-180' : 'mr-2'}`} />
                {t('tenderFlow.backToDashboard')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(tender.status);
  const daysRemaining = Math.ceil((new Date(tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const invitationLink = `${window.location.origin}/invite/${tender.id}`;

  const hasSkills = tender.skills && tender.skills.length > 0;
  const hasDeliverables = tender.deliverables && (tender.deliverables as any[]).length > 0;
  const hasMilestones = tender.milestones && Array.isArray(tender.milestones) && (tender.milestones as any[]).length > 0;
  const evalCriteria = tender.evaluationCriteria as any;
  const hasEvalCriteria = evalCriteria && (
    Array.isArray(evalCriteria)
      ? evalCriteria.length > 0
      : (evalCriteria.weights?.length > 0 || evalCriteria.requirements?.length > 0 || evalCriteria.customCriteria?.length > 0)
  );
  const hasInquiryMethod = !!tender.inquiryType;

  const tocSections = [
    { id: 'description', label: t('tenderFlow.projectScope'),       icon: FileText,    show: true },
    { id: 'context',     label: t('tenderFlow.tocContext'),         icon: Mic,         show: !!(tender.voiceNoteUrl || tender.videoUrl) },
    { id: 'submission',  label: t('tenderFlow.tocSubmission'),      icon: Send,        show: !!tender.submissionType },
    { id: 'evaluation',  label: t('tenderFlow.tocEvaluation'),      icon: Star,        show: hasEvalCriteria },
    { id: 'inquiry',     label: t('tenderFlow.tocQA'),              icon: HelpCircle,  show: hasInquiryMethod },
    ...(isOwner ? [{ id: 'proposals', label: t('tenderFlow.tocProposals'), icon: Users, show: true }] : []),
  ].filter(s => s.show);

  const sectionNumber = (id: string) => {
    const idx = tocSections.findIndex(s => s.id === id);
    return idx >= 0 ? idx + 1 : 0;
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(id); }
  };

  const durationDisplay = getDurationDisplay() !== 'Not specified' ? getDurationDisplay() : null;

  return (
    <>
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200" style={{ backgroundImage: 'radial-gradient(circle, rgba(156,163,175,0.35) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-6 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-white/80"
            data-testid="button-back"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {t('tenderFlow.backToDashboard')}
          </Button>

          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <Badge className={`${statusBadge.className} text-xs px-2.5 py-0.5`} data-testid="badge-status">
                    {statusBadge.label}
                  </Badge>
                  {isExpired && isTenderOpen && (
                    <Badge className="bg-red-100 text-red-700 text-xs px-2.5 py-0.5">{t('tenderFlow.deadlinePassed')}</Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  {t('tenderFlow.rfpLabel')} · <span className="font-mono">RFP-{tender.id?.slice(0, 8).toUpperCase()}</span>
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3" data-testid="text-tender-title">
                  {tender.title}
                </h1>
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  {tender.createdAt && <span>{t('tenderFlow.publishedOn')} {formatDate(tender.createdAt)}</span>}
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                  {tender.status === 'draft' && (
                    <Button className="bg-[#E25E45] hover:bg-[#d54d35] text-white shadow-sm"
                      onClick={() => updateStatus.mutate('published')} disabled={updateStatus.isPending} data-testid="button-publish">
                      {t('tenderFlow.publishBtn')}
                    </Button>
                  )}
                  {(tender.status === 'draft' || tender.status === 'published') && (
                    <Button variant="outline" className="bg-white/80" onClick={() => setLocation(`/tenders/${tender.id}/edit`)} data-testid="button-edit">
                      <Edit className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> {t('tenderFlow.editBtn')}
                    </Button>
                  )}
                  {tender.status === 'published' && (
                    <Button variant="outline" className="bg-white/80" onClick={() => updateStatus.mutate('closed')}
                      disabled={updateStatus.isPending} data-testid="button-close">
                      {t('tenderFlow.closeBtn')}
                    </Button>
                  )}
                  {tender.status === 'published' && !tender.isMarketplace && (
                    <Button variant="outline" className="bg-white/80 border-[#E8614D]/30 text-[#E8614D] hover:bg-[#E8614D]/10"
                      onClick={() => marketplaceSubmit.mutate()}
                      disabled={marketplaceSubmit.isPending} data-testid="button-marketplace">
                      {marketplaceSubmit.isPending ? <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> : <Store className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />}
                      {t('marketplace.publishToMarketplace') || 'Publish to Marketplace'}
                    </Button>
                  )}
                  {tender.isMarketplace && tender.marketplaceStatus === 'pending' && (
                    <Badge className="bg-amber-100 text-amber-800 text-xs px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {t('marketplace.pendingReview') || 'Marketplace Review Pending'}
                    </Badge>
                  )}
                  {tender.isMarketplace && tender.marketplaceStatus === 'approved' && (
                    <Badge className="bg-green-100 text-green-800 text-xs px-3 py-1.5">
                      <Store className="h-3.5 w-3.5 mr-1" />
                      {t('marketplace.liveOnMarketplace') || 'Live on Marketplace'}
                    </Badge>
                  )}
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-white/80"
                    onClick={() => { if (confirm(t('tenderFlow.deleteConfirm'))) { deleteTender.mutate(); } }}
                    disabled={deleteTender.isPending} data-testid="button-delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Hero metadata strip */}
          <div className="flex items-center gap-5 mt-5 pt-4 border-t border-gray-200/70 flex-wrap">
            {tender.category && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Tag className="h-3 w-3" /><span>{tender.category}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="h-3 w-3" /><span>{t('tenderFlow.deadlineOn')} {formatDate(tender.deadline)}</span>
            </div>
            {getBudgetDisplay() && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <DollarSign className="h-3 w-3" /><span>{getBudgetDisplay()}</span>
              </div>
            )}
            {durationDisplay && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3 w-3" /><span>{durationDisplay}</span>
              </div>
            )}
            {isOwner && (
              <div className={`flex items-center gap-1.5 text-xs font-semibold text-[#E25E45] ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                <Users className="h-3 w-3" /><span>{offers.length} {offers.length !== 1 ? t('tenderFlow.proposalsReceived') : t('tenderFlow.proposalReceived')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-gray-50/80 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-6">

            {/* Main document column */}
            <div>

              {/* Table of Contents */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-1.5">
                <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {tocSections.map((section, idx) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-[#E25E45] text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-[10px] font-mono tabular-nums leading-none ${isActive ? 'text-white/60' : 'text-gray-300'}`}>{String(idx + 1).padStart(2, '0')}</span>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Continuous Document */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* § Project Scope */}
                <div id="section-description" className="p-6 sm:p-8 scroll-mt-24">
                  <TDSectionHeader index={sectionNumber('description')} title={t('tenderFlow.projectScope')} />

                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('tenderFlow.descriptionLabel')}</p>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px] mb-6" data-testid="text-description">
                    {tender.description}
                  </p>

                  {durationDisplay && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-[#E25E45]" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('tenderFlow.projectDurationLabel')}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-gray-800 text-[15px]">{durationDisplay}</span>
                        {(tender.startDate || tender.endDate) && (
                          <span className="text-gray-400 text-sm">
                            ({tender.startDate && formatDate(tender.startDate)}{tender.startDate && tender.endDate && ' → '}{tender.endDate && formatDate(tender.endDate)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {tender.objective && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-3.5 w-3.5 text-[#E25E45]" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('tenderFlow.projectObjectiveTitle')}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-[#E25E45]/30 py-0.5">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px]">{String(tender.objective)}</p>
                      </div>
                    </div>
                  )}

                  {hasDeliverables && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <ListChecks className="h-3.5 w-3.5 text-[#E25E45]" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('tenderFlow.deliverablesSection')}</p>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">{t('tenderFlow.addressEachItem')}</p>
                      <div className="space-y-2.5">
                        {(tender.deliverables as any[]).map((deliverable: any, index: number) => {
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

                  {hasSkills && (
                    <div className={hasMilestones ? "mb-8" : ""}>
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="h-3.5 w-3.5 text-[#E25E45]" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('tenderFlow.requiredSkillsLabel')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tender.skills!.map((skill, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Milestones & Payments (inline within scope) */}
                  {!!hasMilestones && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Flag className="h-3.5 w-3.5 text-[#E25E45]" />
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('tenderFlow.milestonesPayments')}</p>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">{t('tenderFlow.paymentsReleasedHint')}</p>
                      <div className="relative">
                        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#E25E45] to-[#FF8A6B] rounded-full" />
                        <div className="space-y-4">
                          {(tender.milestones as any[]).map((milestone: any, index: number) => (
                            <div key={milestone.id || index} className="flex items-start gap-4 relative">
                              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#E25E45] flex items-center justify-center flex-shrink-0 z-10">
                                <span className="text-xs font-bold text-[#E25E45]">{index + 1}</span>
                              </div>
                              <div className="flex-1 pb-2">
                                <p className="font-semibold text-gray-900">{milestone.name}</p>
                                {milestone.description && <p className="text-sm text-gray-600 mt-0.5">{milestone.description}</p>}
                                {milestone.dueDate && (
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {t('tenderFlow.dueLabel')} {formatDate(milestone.dueDate)}
                                  </p>
                                )}
                                {milestone.amount && (
                                  <p className="text-xs text-[#E25E45] mt-1 font-medium">{t('tenderFlow.sarCurrency')} {Number(milestone.amount).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {(tender.milestones as any[]).some((m: any) => m.amount) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-2">
                          <span className="text-sm font-semibold text-gray-700">{t('tenderFlow.totalMilestoneValue')}</span>
                          <span className="text-base font-bold text-[#E25E45]">
                            {t('tenderFlow.sarCurrency')} {(tender.milestones as any[]).reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* end § Project Scope */}

                {(tender.voiceNoteUrl || tender.videoUrl) && (
                  <>
                    <div className="mx-6 sm:mx-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div id="section-context" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('context')} title={t('tenderFlow.additionalContextTitle')} />
                      <div className="space-y-4">
                        {tender.voiceNoteUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <Mic className="h-4 w-4 text-pink-500" />
                              <span>{t('tenderFlow.voiceNoteFromRequester')}</span>
                            </div>
                            <AudioPlayer src={tender.voiceNoteUrl} />
                          </div>
                        )}
                        {tender.videoUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <Video className="h-4 w-4 text-blue-500" />
                              <span>{t('tenderFlow.videoExplanationTitle')}</span>
                            </div>
                            <a href={tender.videoUrl.startsWith('http') ? tender.videoUrl : `https://${tender.videoUrl}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              data-testid="link-video">
                              <ExternalLink className="h-4 w-4" /> {t('tenderFlow.watchVideo')}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {tender.submissionType && (
                  <>
                    <div className="mx-6 sm:mx-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div id="section-submission" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('submission')} title={t('tenderFlow.submissionRequirementsTitle')} />
                      <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
                        <div className="h-0.5 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
                        <div className="flex items-center gap-3 p-4 bg-gray-50">
                          <div className="p-2 bg-white rounded-lg border border-gray-200 flex-shrink-0 shadow-sm">
                            <FileText className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{SUBMISSION_TYPE_LABELS[tender.submissionType]?.[language] || tender.submissionType}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {({
                                quote_only: t('tenderFlow.submDescQuoteOnly'),
                                tech_fin_proposal: t('tenderFlow.submDescTechFin'),
                                video_only: t('tenderFlow.submDescVideoOnly'),
                                tech_fin_with_video: t('tenderFlow.submDescTechFinVideo'),
                                document_only: t('tenderFlow.submDescDocOnly'),
                                both: t('tenderFlow.submDescBoth'),
                              } as Record<string, string>)[tender.submissionType!]}
                            </p>
                          </div>
                        </div>
                      </div>
                      {tender.videoRequired && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-200 mb-4">
                          <Video className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-orange-800">{t('tenderFlow.videoMandatoryOwner')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t('tenderFlow.submissionDeadlinePrefix')} <span className={`font-semibold ${isExpired ? 'text-red-500' : 'text-gray-600'}`}>{formatDate(tender.deadline)}</span></span>
                      </div>
                    </div>
                  </>
                )}

                {hasEvalCriteria && (
                  <>
                    <div className="mx-6 sm:mx-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div id="section-evaluation" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('evaluation')} title={t('tenderFlow.evaluationCriteriaTitle2')} />
                      <p className="text-sm text-gray-400 mb-6">{t('tenderFlow.evaluationHintOwner')}</p>
                  {Array.isArray(evalCriteria) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evalCriteria.map((criteria: any, index: number) => {
                        const label = typeof criteria === 'string'
                          ? (CRITERIA_LABELS[criteria]?.[language] || criteria)
                          : (criteria.name || criteria);
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30"
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                              <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Score Distribution bar */}
                      {(evalCriteria.weights?.length > 0 || evalCriteria.customCriteria?.length > 0) && (
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <BarChart className="h-3.5 w-3.5" /> {t('tenderFlow.scoreDistribution')}
                          </p>
                          <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
                            {(evalCriteria.weights || []).map((w: any, i: number) => (
                              <div
                                key={w.categoryId}
                                style={{ width: `${w.weight}%` }}
                                className={`${SCORE_BAR_COLORS[i % SCORE_BAR_COLORS.length]} first:rounded-l-full last:rounded-r-full`}
                                title={`${EVAL_CATEGORY_INFO[w.categoryId]?.[language]?.name || w.categoryId}: ${w.weight}%`}
                              />
                            ))}
                            {(evalCriteria.customCriteria || []).map((c: any, j: number) => {
                              const i = (evalCriteria.weights?.length || 0) + j;
                              return (
                                <div
                                  key={c.id}
                                  style={{ width: `${c.weight}%` }}
                                  className={`${SCORE_BAR_COLORS[i % SCORE_BAR_COLORS.length]} first:rounded-l-full last:rounded-r-full`}
                                  title={`${c.text}: ${c.weight}%`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {(evalCriteria.weights || []).map((w: any, i: number) => {
                              const catInfo = EVAL_CATEGORY_INFO[w.categoryId]?.[language];
                              return (
                                <div key={w.categoryId} className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SCORE_DOT_COLORS[i % SCORE_DOT_COLORS.length]}`} />
                                  <span className="text-sm text-gray-600">
                                    {catInfo?.name || w.categoryId}
                                    <span className={`font-bold ml-1.5 ${SCORE_TEXT_COLORS[i % SCORE_TEXT_COLORS.length]}`}>{w.weight}%</span>
                                  </span>
                                </div>
                              );
                            })}
                            {(evalCriteria.customCriteria || []).map((c: any, j: number) => {
                              const i = (evalCriteria.weights?.length || 0) + j;
                              return (
                                <div key={c.id} className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SCORE_DOT_COLORS[i % SCORE_DOT_COLORS.length]}`} />
                                  <span className="text-sm text-gray-600">
                                    {c.text}
                                    <span className={`font-bold ml-1.5 ${SCORE_TEXT_COLORS[i % SCORE_TEXT_COLORS.length]}`}>{c.weight}%</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {evalCriteria.weights?.map((w: any) => {
                        const catInfo = EVAL_CATEGORY_INFO[w.categoryId]?.[language];
                        const catRequirements = (evalCriteria.requirements || []).filter((r: any) => r.categoryId === w.categoryId);
                        const isExpanded = expandedEvalCategories[w.categoryId] || false;
                        return (
                          <div key={w.categoryId} className="rounded-xl border border-amber-100 dark:border-amber-900/30 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedEvalCategories(prev => ({ ...prev, [w.categoryId]: !prev[w.categoryId] }))}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors text-left"
                            >
                              <ChevronRight className={`h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                  {catInfo?.name || w.categoryId}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {catInfo?.description || ''}
                                </p>
                              </div>
                              <Badge variant="outline" className="font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 flex-shrink-0">{w.weight}%</Badge>
                            </button>
                            <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                              <div className="overflow-hidden">
                                {catRequirements.length > 0 && (
                                  <div className="px-4 py-3 space-y-3 border-t border-amber-100 dark:border-amber-900/30 bg-white dark:bg-gray-900">
                                    {catRequirements.map((req: any, i: number) => {
                                      const reqInfo = EVAL_REQUIREMENT_INFO[req.requirementId]?.[language] as EvalReqInfo | undefined;
                                      const displayValue = req.value && typeof req.value !== 'boolean'
                                        ? (reqInfo?.formatValue ? reqInfo.formatValue(String(req.value)) : String(req.value))
                                        : null;
                                      return (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                          <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                              {reqInfo?.label || req.requirementId}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                              {reqInfo?.description || ''}
                                            </p>
                                            {displayValue && (
                                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1">
                                                {displayValue}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {evalCriteria.customCriteria?.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{t('tenderFlow.customCriteriaSection')}</p>
                          {evalCriteria.customCriteria.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                              <span className="text-sm text-gray-800 dark:text-gray-200">{c.text}</span>
                              <Badge variant="outline" className="font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">{c.weight}%</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  </>
                )}

                {hasInquiryMethod && (
                  <>
                    <div className="mx-6 sm:mx-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div id="section-inquiry" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('inquiry')} title={t('tenderFlow.questionsAndClarifications')} />
                      <p className="text-sm text-gray-400 mb-6">
                        {tender.inquiryType === 'inside_bid'
                          ? t('tenderFlow.qaInsideBidDesc')
                          : t('tenderFlow.qaContactDesc')}
                      </p>
                  {tender.inquiryType === 'inside_bid' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg flex-shrink-0">
                          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('tenderFlow.qaAnonymousInfo')}
                        </p>
                      </div>

                      {qaQuestions.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {qaQuestions.length} {qaQuestions.length !== 1 ? t('tenderFlow.questionsFromVendors') : t('tenderFlow.questionFromVendors')}
                          </p>
                          {qaQuestions.map((q) => (
                            <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-start gap-2">
                                  {q.askedByCompany ? (
                                    q.askedByCompany.logoUrl ? (
                                      <img src={q.askedByCompany.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-gray-200 flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#E25E45] to-[#FF8A6B] flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-white text-[10px] font-bold leading-none">{(q.askedByCompany.displayName || q.askedByCompany.name).slice(0, 2).toUpperCase()}</span>
                                      </div>
                                    )
                                  ) : (
                                    <HelpCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    {q.askedByCompany && (
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{q.askedByCompany.displayName || q.askedByCompany.name}</span>
                                        {q.askedByCompany.verificationStatus === 'verified' && (
                                          <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                                            <CheckCircle2 className="h-2.5 w-2.5" /> {t('tenderFlow.verifiedBadge')}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => setQaProfileCompany(q.askedByCompany!)}
                                          className="text-[10px] text-[#E25E45] hover:text-[#d54d35] font-semibold flex items-center gap-0.5 transition-colors"
                                        >
                                          <Eye className="h-3 w-3" /> {t('tenderFlow.viewProfile')}
                                        </button>
                                      </div>
                                    )}
                                    <p className="text-sm text-gray-900 dark:text-white">{q.question}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {t('tenderFlow.askedLabel')} {new Date(q.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                      {q.askedByCompany?.category && (
                                        <span className={`${isRtl ? 'mr-1' : 'ml-1'} text-gray-500`}>· {q.askedByCompany.category}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {q.answer ? (
                                <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">{t('tenderFlow.yourAnswer')}</p>
                                      <p className="text-sm text-gray-800 dark:text-gray-200">{q.answer}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : canManage ? (
                                <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                  <Textarea
                                    placeholder={t('tenderFlow.typeAnswerPlaceholder')}
                                    value={answerText[q.id] || ''}
                                    onChange={(e) => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    rows={2}
                                    className="resize-none text-sm"
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      onClick={() => answerQuestion.mutate({ questionId: q.id, answer: answerText[q.id] || '' })}
                                      disabled={!answerText[q.id]?.trim() || answerQuestion.isPending}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {answerQuestion.isPending ? <Loader2 className={`h-3 w-3 animate-spin ${isRtl ? 'ml-1' : 'mr-1'}`} /> : <Send className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />}
                                      {t('tenderFlow.answerBtn')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-4 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-t border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    {t('tenderFlow.awaitingAnswer')}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('tenderFlow.noQuestionsOwner')}</p>
                      )}
                    </div>
                  )}

                  {tender.inquiryType === 'email_whatsapp' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {t('tenderFlow.reachOutDirectly')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tender.emailContact && (
                          <a
                            href={`mailto:${tender.emailContact}`}
                            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex-shrink-0">
                              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                              <p className="font-medium text-blue-700 dark:text-blue-300 text-sm truncate">{tender.emailContact}</p>
                            </div>
                          </a>
                        )}
                        {tender.whatsappContact && (
                          <a
                            href={tender.whatsappContact.startsWith('http') ? tender.whatsappContact : `https://wa.me/${tender.whatsappContact.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                          >
                            <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg flex-shrink-0">
                              <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</p>
                              <p className="font-medium text-green-700 dark:text-green-300 text-sm truncate">{tender.whatsappContact}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {tender.inquiryType !== 'inside_bid' && tender.inquiryType !== 'email_whatsapp' && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {INQUIRY_TYPE_LABELS[tender.inquiryType!]?.[language] || tender.inquiryType}
                    </p>
                  )}
                    </div>
                  </>
                )}

              </div>
              {/* end continuous document */}

              {/* Proposals (owner only) */}
              {isOwner && (
                <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" id="section-proposals" data-tour="offers-section">
                  <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-0 scroll-mt-24">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-300 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          {sectionNumber('proposals')}.0
                        </span>
                        <h2 className="text-xl font-bold text-gray-900">{t('tenderFlow.proposalsHeading')}</h2>
                        {offers.length > 0 && (
                          <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-gray-900 text-white text-xs font-bold">
                            {offers.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                    {loadingOffers ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#E25E45]" />
                      </div>
                    ) : offers.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                          <Users className="h-7 w-7 text-gray-300" />
                        </div>
                        <p className="font-semibold text-gray-500">{t('tenderFlow.noProposalsYet')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('tenderFlow.shareInvitationHint')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {offers.map((offer, offerIdx) => {
                          const analysis = offerAnalyses.find((a: any) => a.offerId === offer.id);
                          const initials = (offer.profile?.displayName || offer.company.name).slice(0, 2).toUpperCase();
                          const accentColors = [
                            'from-[#E25E45] to-[#FF8A6B]',
                            'from-indigo-500 to-purple-500',
                            'from-emerald-500 to-teal-500',
                            'from-amber-500 to-orange-500',
                            'from-sky-500 to-blue-500',
                          ];
                          const accent = accentColors[offerIdx % accentColors.length];
                          return (
                          <div key={offer.id}
                            className="rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                            data-testid={`card-offer-${offer.id}`}
                          >
                            {/* Top accent strip */}
                            <div className={`h-0.5 w-full bg-gradient-to-r ${accent}`} />

                            <div className="p-5">
                              <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                  <VendorAvatar
                                    logoUrl={offer.profile?.logoUrl}
                                    name={initials}
                                    className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/10 shadow-sm"
                                    gradient={accent}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-base leading-tight">{offer.profile?.displayName || offer.company.name}</h4>
                                        {offer.company.verificationStatus === 'verified' && (
                                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                                            <CheckCircle2 className="h-3 w-3" /> {t('tenderFlow.verifiedBadge')}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-400">
                                        {offer.company.category && <span className="font-medium text-gray-500">{offer.company.category} · </span>}
                                        {t('tenderFlow.submittedOn')} {formatDate(offer.submittedAt)}
                                      </p>
                                    </div>
                                    {offer.quotePrice && (
                                      <div className="flex-shrink-0 text-right">
                                        <p className="text-xl font-bold text-gray-900">{t('tenderFlow.sarCurrency')} {offer.quotePrice.toLocaleString()}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{t('tenderFlow.quotedPriceLabel')}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Submission type chips */}
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {offer.combinedFileUrl && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md font-medium">
                                        <FileText className="h-3 w-3" /> {t('tenderFlow.combinedProposal')}
                                      </span>
                                    )}
                                    {offer.technicalFileUrl && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-md font-medium">
                                        <FileText className="h-3 w-3" /> {t('tenderFlow.technicalLabel')}
                                      </span>
                                    )}
                                    {offer.financialFileUrl && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-md font-medium">
                                        <DollarSign className="h-3 w-3" /> {t('tenderFlow.financialFileLabel')}
                                      </span>
                                    )}
                                    {offer.videoUrl && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-1 rounded-md font-medium">
                                        <Video className="h-3 w-3" /> {t('tenderFlow.videoPitch')}
                                      </span>
                                    )}
                                    {analysis && analysis.status === 'completed' && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-1 rounded-md font-medium">
                                        <Sparkles className="h-3 w-3" /> {t('tenderFlow.aiAnalyzed')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action row */}
                              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                <Button variant="outline" size="sm" onClick={() => setSelectedOffer(offer)} className="text-xs font-medium h-8" data-testid={`button-view-${offer.id}`}>
                                  <Eye className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> {t('tenderFlow.viewProfile')}
                                </Button>
                                {offer.combinedFileUrl && (
                                  <Button variant="outline" size="sm" onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)} className="text-xs h-8" data-testid={`button-combined-${offer.id}`}>
                                    <FileText className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> {t('tenderFlow.proposalLabel')}
                                  </Button>
                                )}
                                {offer.technicalFileUrl && (
                                  <Button variant="outline" size="sm" onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)} className="text-xs h-8" data-testid={`button-tech-${offer.id}`}>
                                    <FileText className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> {t('tenderFlow.technicalLabel')}
                                  </Button>
                                )}
                                {offer.financialFileUrl && (
                                  <Button variant="outline" size="sm" onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)} className="text-xs h-8" data-testid={`button-fin-${offer.id}`}>
                                    <DollarSign className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> {t('tenderFlow.financialFileLabel')}
                                  </Button>
                                )}
                                {offer.videoUrl && (
                                  <Button variant="outline" size="sm" onClick={() => window.open(offer.videoUrl!, '_blank')} className="text-xs h-8" data-testid={`button-video-${offer.id}`}>
                                    <Video className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} /> {t('tenderFlow.videoLabel')}
                                  </Button>
                                )}
                                <div className={isRtl ? 'mr-auto' : 'ml-auto'}>
                                  {analysis && analysis.status === 'completed' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAnalysisDrawerOfferId(offer.id)}
                                      className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                                      data-testid={`button-ai-view-${offer.id}`}
                                    >
                                      <Sparkles className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                                      {t('tenderFlow.viewAISummary')}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => analyzeOffer.mutate(offer.id)}
                                      disabled={analyzeOffer.isPending}
                                      className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                                      data-testid={`button-ai-${offer.id}`}
                                    >
                                      {analyzeOffer.isPending && analyzeOffer.variables === offer.id ? (
                                        <Loader2 className={`h-3.5 w-3.5 animate-spin ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                                      ) : (
                                        <Sparkles className={`h-3.5 w-3.5 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                                      )}
                                      {t('tenderFlow.summarizeWithAI')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {analysis && analysis.status === 'failed' && (
                              <div className="mx-5 mb-4 flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg p-2 border border-red-100">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Analysis failed: {analysis.errorMessage || 'Unknown error'}</span>
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Negotiation Banner (owner only, closed tender with 2+ offers) */}
              {isOwner && tender.status === 'closed' && offers.length >= 2 && (
                <div className="mt-6">
                  {!isNegotiationMode ? (
                    <div
                      className="relative overflow-hidden border border-[#E25E45]/20 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap shadow-sm"
                      style={{ backgroundColor: '#FFF8F7', backgroundImage: 'radial-gradient(circle, #e8c5be 1px, transparent 1px)', backgroundSize: '18px 18px' }}
                      data-tour="negotiate-banner"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#E25E45]/10 border border-[#E25E45]/20 flex items-center justify-center flex-shrink-0">
                          <Handshake className="h-6 w-6 text-[#E25E45]" />
                        </div>
                        <div>
                          <h3 className="text-gray-900 font-bold text-base">{t('tenderFlow.negotiateBannerTitle')}</h3>
                          <p className="text-gray-500 text-sm mt-0.5">{t('tenderFlow.negotiateBannerDesc')}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setIsNegotiationMode(true)}
                        className="bg-[#E25E45] hover:bg-[#d54d35] text-white px-6 h-10 text-sm font-semibold shadow-lg"
                        data-testid="button-negotiate"
                      >
                        <Handshake className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('tenderFlow.startNegotiation')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-[#E25E45]/5 border-2 border-[#E25E45]/20 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-[#E25E45]/10 flex items-center justify-center flex-shrink-0">
                            <Handshake className="h-4 w-4 text-[#E25E45]" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{t('tenderFlow.negotiationModeActive')}</span>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setIsNegotiationMode(false)}
                          className="text-sm h-8"
                          data-testid="button-exit-negotiate"
                        >
                          {t('tenderFlow.exitNegotiation')}
                        </Button>
                      </div>
                      {user && (
                        <TourBanner
                          tourId="hint-negotiation-mode"
                          userId={user.id}
                          title={TOUR_BANNERS.negotiationMode[language === 'ar' ? 'ar' : 'en'].title}
                          body={TOUR_BANNERS.negotiationMode[language === 'ar' ? 'ar' : 'en'].body}
                          isRtl={isRtl}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* AI Proposal Comparison (owner only, when 2+ offers exist) */}
              {isOwner && offers.length >= 2 && (
                <div className="mt-6" data-tour="proposal-comparison">
                  <ProposalComparison
                    tenderId={tender.id}
                    offers={offers}
                    analyses={offerAnalyses}
                    negotiationMode={isNegotiationMode}
                    tenderTitle={tender.title}
                    tenderCompanyName={activeCompany?.name || ''}
                    negotiationActions={negotiationActions}
                    submissionType={tender.submissionType}
                  />
                </div>
              )}

            </div>
            {/* end main column */}

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div className="hidden lg:block">
              <div className="sticky top-20 space-y-4">

                {/* At a Glance */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('tenderFlow.atAGlance')}</p>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Row 1: Deadline | Budget */}
                      <div className={`rounded-xl p-3 border ${isExpired ? 'bg-red-50 border-red-100' : daysRemaining <= 3 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className={`h-3.5 w-3.5 ${isExpired ? 'text-red-500' : daysRemaining <= 3 ? 'text-orange-500' : 'text-[#E25E45]'}`} />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('tenderFlow.deadlineLabel')}</span>
                          </div>
                        </div>
                        <p className={`text-xs font-bold leading-tight ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-700' : 'text-gray-800'}`}>{formatDate(tender.deadline)}</p>
                        {!isExpired ? (
                          <span className={`mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${daysRemaining <= 3 ? 'bg-orange-200 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>{daysRemaining}{t('tenderFlow.daysLeftLabel')}</span>
                        ) : (
                          <span className="mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-200 text-red-700">{t('tenderFlow.expiredLabel')}</span>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('tenderFlow.budgetLabel')}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{getBudgetDisplay()}</p>
                      </div>

                      {/* Row 2: Category | Format */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Tag className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('tenderFlow.categoryLabel')}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{tender.category || '—'}</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="h-3.5 w-3.5 text-purple-500" />
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('tenderFlow.formatLabel')}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{tender.submissionType ? (SUBMISSION_TYPE_LABELS[tender.submissionType]?.[language] || tender.submissionType) : '—'}</p>
                      </div>

                      {/* Row 3: Proposals (full width, owner only) */}
                      {isOwner && (
                        <div className="col-span-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Users className="h-3.5 w-3.5 text-[#E25E45]" />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('tenderFlow.proposalsLabel')}</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 leading-tight">{offers.length}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Owner: Invitation Link */}
                {isOwner && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('tenderFlow.invitationLink')}</p>
                    </div>
                    <div className="p-4">
                      <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-200">
                        <code className="text-xs break-all text-gray-500" data-testid="text-invitation-link">{invitationLink}</code>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={copyInvitationLink} size="sm" className="flex-1 text-xs bg-[#E25E45] hover:bg-[#d54d35] text-white" data-testid="button-copy-link">
                          {copiedLink ? <><Check className={`h-3.5 w-3.5 ${isRtl ? 'ml-1' : 'mr-1'}`} /> {t('tenderFlow.copied')}</> : <><Copy className={`h-3.5 w-3.5 ${isRtl ? 'ml-1' : 'mr-1'}`} /> {t('tenderFlow.copyLink')}</>}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(invitationLink, '_blank')} data-testid="button-open-link">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}


                {/* Vendor: Submit CTA */}
                {!isOwner && activeCompany && (
                  <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {hasSubmittedOffer ? (
                      <div className="bg-white p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{t('tenderFlow.proposalSubmittedTitle')}</p>
                            <p className="text-xs text-gray-400">{t('tenderFlow.submittedOn')} {myOffer?.submittedAt ? formatDate(myOffer.submittedAt) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl border border-green-100">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs font-semibold text-green-700">{t('tenderFlow.underReviewByRequester')}</span>
                        </div>
                      </div>
                    ) : isExpired ? (
                      <div className="bg-gray-50 p-5">
                        <p className="text-sm font-bold text-gray-700 mb-1">{t('tenderFlow.submissionsClosedTitle')}</p>
                        <p className="text-xs text-gray-400">{t('tenderFlow.submissionsClosedMessage')}</p>
                      </div>
                    ) : !isTenderOpen ? (
                      <div className="bg-gray-50 p-5">
                        <p className="text-sm font-bold text-gray-700 mb-1">{t('tenderFlow.notAcceptingTitle')}</p>
                        <p className="text-xs text-gray-400">{t('tenderFlow.notAcceptingMessage')}</p>
                      </div>
                    ) : !companyCanSubmit ? (
                      <div className="bg-white p-5">
                        <p className="text-sm font-bold text-gray-900 mb-1">{t('tenderFlow.completeYourProfile')}</p>
                        <p className="text-xs text-gray-400 mb-4">{t('tenderFlow.completeProfileDesc')}</p>
                        <Button variant="outline" className="w-full text-sm" onClick={() => setLocation('/company-onboarding')} data-testid="button-complete-profile">
                          {t('tenderFlow.completeProfileBtn')}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-white">
                        <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
                        <div className="p-5">
                          <p className="text-xs font-bold text-[#E25E45] uppercase tracking-widest mb-1">{t('tenderFlow.readyToBidLabel')}</p>
                          <p className="text-sm font-bold text-gray-900 mb-0.5">{t('tenderFlow.submitYourProposal')}</p>
                          <p className="text-xs text-gray-400 mb-4">
                            {daysRemaining <= 7
                              ? <span className="text-orange-600 font-semibold">{daysRemaining} {daysRemaining !== 1 ? t('tenderFlow.daysRemainingText') : t('tenderFlow.dayRemainingText')}</span>
                              : `${t('tenderFlow.deadlineOn')}: ${formatDate(tender.deadline)}`}
                          </p>
                          <Button
                            className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white font-semibold rounded-xl h-11"
                            onClick={() => setIsSubmitOfferModalOpen(true)}
                            data-testid="button-submit-offer"
                          >
                            <Send className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} /> {t('tenderFlow.submitProposal')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
            {/* end sidebar */}

          </div>
        </div>
      </div>

      {/* Submit Offer Modal */}
      {tender && !isOwner && (
        <SubmitOfferModal
          isOpen={isSubmitOfferModalOpen}
          onClose={() => {
            setIsSubmitOfferModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['/api/tenders', id, 'my-offer'] });
          }}
          tender={{
            id: tender.id,
            title: tender.title,
            deadline: tender.deadline,
            budget: tender.budget || undefined,
            submissionType: tender.submissionType as any,
            videoRequired: tender.videoRequired ?? undefined,
          }}
          requester={{
            name: 'Company',
            company: activeCompany?.name
          }}
        />
      )}

      {/* View Company Profile Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedOffer && (
            <>
              {/* Header banner */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 pt-6 pb-8" style={{ backgroundImage: 'radial-gradient(circle, rgba(156,163,175,0.35) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <VendorAvatar
                      logoUrl={selectedOffer.profile?.logoUrl}
                      name={(selectedOffer.profile?.displayName || selectedOffer.company.name).slice(0, 2).toUpperCase()}
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-gray-200 shadow-sm"
                      gradient="from-[#E25E45] to-[#FF8A6B]"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">
                        {selectedOffer.profile?.displayName || selectedOffer.company.name}
                      </h2>
                      {selectedOffer.company.verificationStatus === 'verified' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> {t('tenderFlow.verifiedBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{selectedOffer.company.category || ''}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 -mt-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                  {/* Bio */}
                  {selectedOffer.profile?.bio && (
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.aboutLabel')}</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedOffer.profile.bio}</p>
                    </div>
                  )}

                  {/* Proposal details */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('tenderFlow.proposalDetailsLabel')}</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-gray-300" /> {t('tenderFlow.submittedOn')}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(selectedOffer.submittedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      {selectedOffer.quotePrice && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-gray-300" /> {t('tenderFlow.quotePriceLabel')}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {t('tenderFlow.sarCurrency')} {selectedOffer.quotePrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedOffer.notes && (
                        <div className="pt-1">
                          <p className="text-xs text-gray-400 mb-1">{t('tenderFlow.notesLabel')}</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedOffer.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  {(selectedOffer.combinedFileUrl || selectedOffer.technicalFileUrl || selectedOffer.financialFileUrl || selectedOffer.videoUrl) && (
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('tenderFlow.documentsLabel')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedOffer.combinedFileUrl && (
                          <button
                            onClick={() => viewAuthenticatedFile(selectedOffer.combinedFileUrl!)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                            data-testid="button-modal-combined-file"
                          >
                            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-blue-700">{t('tenderFlow.proposalLabel')}</span>
                          </button>
                        )}
                        {selectedOffer.technicalFileUrl && (
                          <button
                            onClick={() => viewAuthenticatedFile(selectedOffer.technicalFileUrl!)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-purple-100 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                            data-testid="button-modal-tech-file"
                          >
                            <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-purple-700">{t('tenderFlow.technicalLabel')}</span>
                          </button>
                        )}
                        {selectedOffer.financialFileUrl && (
                          <button
                            onClick={() => viewAuthenticatedFile(selectedOffer.financialFileUrl!)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
                            data-testid="button-modal-fin-file"
                          >
                            <DollarSign className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-emerald-700">{t('tenderFlow.financialFileLabel')}</span>
                          </button>
                        )}
                        {selectedOffer.videoUrl && (
                          <button
                            onClick={() => window.open(selectedOffer.videoUrl!, '_blank')}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-orange-100 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
                          >
                            <Video className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-orange-700">{t('tenderFlow.videoPitchLabel')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {/* Hidden DialogHeader for accessibility */}
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedOffer?.profile?.displayName || selectedOffer?.company.name}</DialogTitle>
            <DialogDescription>{selectedOffer?.company.category || 'Company Profile'}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Q&A Vendor Profile Dialog */}
      <Dialog open={!!qaProfileCompany} onOpenChange={(open) => !open && setQaProfileCompany(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {qaProfileCompany && (
            <>
              <div className="bg-gray-50 border-b border-gray-200 px-6 pt-6 pb-8" style={{ backgroundImage: 'radial-gradient(circle, rgba(156,163,175,0.35) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {qaProfileCompany.logoUrl ? (
                      <img src={qaProfileCompany.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-gray-200 shadow-sm" />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#E25E45] to-[#FF8A6B] flex items-center justify-center ring-2 ring-gray-200 shadow-sm">
                        <span className="text-white text-lg font-bold">{(qaProfileCompany.displayName || qaProfileCompany.name).slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">
                        {qaProfileCompany.displayName || qaProfileCompany.name}
                      </h2>
                      {qaProfileCompany.verificationStatus === 'verified' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> {t('tenderFlow.verifiedBadge')}
                        </span>
                      )}
                    </div>
                    {qaProfileCompany.category && (
                      <p className="text-sm text-gray-500">{qaProfileCompany.category}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 -mt-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {qaProfileCompany.bio && (
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.aboutLabel')}</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{qaProfileCompany.bio}</p>
                    </div>
                  )}

                  {(qaProfileCompany.legalName || qaProfileCompany.crNumber || qaProfileCompany.vatNumber || qaProfileCompany.city || qaProfileCompany.category) ? (
                  <div className="px-5 py-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('tenderFlow.companyDetailsLabel')}</p>
                    {qaProfileCompany.legalName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><Building className="h-3.5 w-3.5 text-gray-300" /> {t('dashboard.legalNameLabel')}</span>
                        <span className="text-sm font-medium text-gray-800">{qaProfileCompany.legalName}</span>
                      </div>
                    )}
                    {qaProfileCompany.crNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-gray-300" /> {t('dashboard.crNumberLabel')}</span>
                        <span className="text-sm font-medium text-gray-800 font-mono">{qaProfileCompany.crNumber}</span>
                      </div>
                    )}
                    {qaProfileCompany.vatNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-gray-300" /> {t('dashboard.vatNumberLabel')}</span>
                        <span className="text-sm font-medium text-gray-800 font-mono">{qaProfileCompany.vatNumber}</span>
                      </div>
                    )}
                    {qaProfileCompany.city && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-300" /> {t('dashboard.cityLabel')}</span>
                        <span className="text-sm font-medium text-gray-800">{qaProfileCompany.city}</span>
                      </div>
                    )}
                    {qaProfileCompany.category && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-gray-300" /> {t('dashboard.categoryLabel')}</span>
                        <span className="text-sm font-medium text-gray-800">{qaProfileCompany.category}</span>
                      </div>
                    )}
                  </div>
                  ) : !qaProfileCompany.bio ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-gray-400 italic">{t('tenderFlow.noProfileInfo')}</p>
                  </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
          <DialogHeader className="sr-only">
            <DialogTitle>{qaProfileCompany?.displayName || qaProfileCompany?.name}</DialogTitle>
            <DialogDescription>{qaProfileCompany?.category || 'Company Profile'}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Drawer */}
      <Sheet open={!!analysisDrawerOfferId} onOpenChange={(open) => !open && setAnalysisDrawerOfferId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {(() => {
            const drawerOffer = offers.find(o => o.id === analysisDrawerOfferId);
            const drawerAnalysis = offerAnalyses.find((a: any) => a.offerId === analysisDrawerOfferId);
            if (!drawerOffer || !drawerAnalysis) return null;
            return (
              <>
                {/* Drawer header */}
                <div className="px-6 pt-6 pb-5 border-b border-gray-100 bg-gray-50">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-gray-900">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      {t('tenderFlow.aiAnalysisTitle')}
                    </SheetTitle>
                    <SheetDescription className="text-gray-500">
                      {drawerOffer.profile?.displayName || drawerOffer.company.name}
                      {drawerOffer.company.category && ` · ${drawerOffer.company.category}`}
                    </SheetDescription>
                  </SheetHeader>
                </div>

                <div className="space-y-6 p-6">
                  {/* Re-analyze button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeOffer.mutate(drawerOffer.id)}
                      disabled={analyzeOffer.isPending}
                      className="text-xs"
                    >
                      {analyzeOffer.isPending && analyzeOffer.variables === drawerOffer.id ? (
                        <Loader2 className={`h-3 w-3 animate-spin ${isRtl ? 'ml-1' : 'mr-1'}`} />
                      ) : (
                        <Sparkles className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                      )}
                      {t('tenderFlow.reAnalyze')}
                    </Button>
                  </div>

                  {/* Executive Summary */}
                  {drawerAnalysis.executiveSummary && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.executiveSummary')}</p>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed bg-blue-50 rounded-lg p-3 border border-blue-100">
                        {drawerAnalysis.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Table of Contents */}
                  {drawerAnalysis.tableOfContents && drawerAnalysis.tableOfContents.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.tableOfContentsLabel')}</p>
                      <div className="space-y-1">
                        {drawerAnalysis.tableOfContents.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-700">{item.section}</span>
                            <span className="text-gray-400 font-mono text-xs">{item.pageRange}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements Coverage */}
                  {drawerAnalysis.criteriaMapping && Object.keys(drawerAnalysis.criteriaMapping).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.requirementsCoverage')}</p>
                      <div className="space-y-1">
                        {Object.entries(drawerAnalysis.criteriaMapping).map(([criterion, pageRef]) => {
                          const found = pageRef && pageRef !== 'Not Found' && pageRef !== 'غير موجود';
                          return (
                            <div key={criterion} className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                              <span className="text-gray-700">{criterion}</span>
                              {found ? (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  </div>
                                  <span className="font-mono text-xs text-emerald-600">{pageRef as string}</span>
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
                                  <X className="h-3 w-3 text-red-500" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  {drawerAnalysis.deliverables && drawerAnalysis.deliverables.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.deliverablesSection')}</p>
                      <ul className="space-y-1.5">
                        {drawerAnalysis.deliverables.map((d: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-gray-100 text-gray-500 text-xs font-mono flex items-center justify-center mt-0.5">{i + 1}</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Financial */}
                  {drawerAnalysis.financial && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tenderFlow.financialSection')}</p>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        {drawerAnalysis.financial.total != null && (
                          <div className="flex justify-between text-sm px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                            <span className="text-gray-700 font-medium">{t('tenderFlow.totalLabel')}</span>
                            <span className="font-bold text-gray-900">{t('tenderFlow.sarCurrency')} {drawerAnalysis.financial.total.toLocaleString()}</span>
                          </div>
                        )}
                        {drawerAnalysis.financial.vat != null && (
                          <div className="flex justify-between text-sm px-3 py-2 border-b border-gray-100">
                            <span className="text-gray-600">{t('tenderFlow.vatLabel')}</span>
                            <span className="text-gray-700">{drawerAnalysis.financial.vat}%</span>
                          </div>
                        )}
                        {drawerAnalysis.financial.paymentTerms && (
                          <div className="flex justify-between text-sm px-3 py-2 border-b border-gray-100">
                            <span className="text-gray-600">{t('tenderFlow.paymentTermsLabel')}</span>
                            <span className="text-gray-700 text-right max-w-[60%]">{drawerAnalysis.financial.paymentTerms}</span>
                          </div>
                        )}
                        {drawerAnalysis.financial.breakdown && drawerAnalysis.financial.breakdown.length > 0 && (
                          <>
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                              <span className="text-xs font-semibold text-gray-500 uppercase">{t('tenderFlow.breakdownLabel')}</span>
                            </div>
                            {drawerAnalysis.financial.breakdown.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm px-3 py-2 border-b border-gray-100 last:border-0">
                                <span className="text-gray-600">{item.item}</span>
                                <span className="text-gray-800 font-medium">{t('tenderFlow.sarCurrency')} {item.amount?.toLocaleString()}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {drawerAnalysis.analyzedAt && (
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                      {t('tenderFlow.analyzedLabel')} {new Date(drawerAnalysis.analyzedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
    {tourOverlay}
    </>
  );
}

function TDSectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#E25E45]/10 border border-[#E25E45]/20 flex-shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-[#E25E45] font-mono leading-none">{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
        <div className="mt-1.5 h-px bg-gradient-to-r from-[#E25E45]/25 via-gray-200/60 to-transparent" />
      </div>
    </div>
  );
}
