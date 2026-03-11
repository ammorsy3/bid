import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Clock, DollarSign, Mail, Copy, Check, ArrowLeft, ExternalLink, Edit, Trash2, Send, Users, Loader2, FileText, AlertCircle, Eye, EyeOff, Download, Mic, Video, Play, Pause, X, CheckCircle, XCircle, Target, ListChecks, Star, Phone, MessageSquare, Flag, BarChart, HelpCircle, Shield, Layers, Tag, CheckCircle2, ChevronRight, MapPin, Sparkles } from "lucide-react";
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

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  quote_only: "Price Quote Only",
  tech_fin_proposal: "Full Proposal (Technical + Financial)",
  video_only: "Video Pitch Only",
  tech_fin_with_video: "Full Proposal + Video Pitch",
  document_only: "Document Only",
  both: "Video & Document",
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

const SCORE_BAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const SCORE_DOT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-cyan-500', 'bg-teal-500', 'bg-indigo-500', 'bg-fuchsia-500'];
const SCORE_TEXT_COLORS = ['text-blue-600', 'text-emerald-600', 'text-purple-600', 'text-amber-600', 'text-rose-600', 'text-orange-600', 'text-cyan-600', 'text-teal-600', 'text-indigo-600', 'text-fuchsia-600'];

const EVAL_REQUIREMENT_INFO: Record<string, { label: string; description: string; formatValue?: (v: string) => string }> = {
  years_in_market: { label: "Minimum Years in Market", description: "The company must have been operating for at least this many years in a relevant field.", formatValue: (v) => `${v}+ years required` },
  similar_projects_count: { label: "Similar Projects Completed", description: "The company must have successfully delivered this many comparable projects.", formatValue: (v) => `At least ${v} project${Number(v) > 1 ? 's' : ''} required` },
  min_project_value: { label: "Minimum Project Value", description: "The company must have delivered at least one project of this value or higher.", formatValue: (v) => `${Number(v).toLocaleString()} SAR or higher` },
  client_references: { label: "Client References Required", description: "The company must provide verifiable references from previous clients for similar work." },
  financial_statements: { label: "Financial Statements Required", description: "The company must submit audited financial statements to demonstrate financial stability." },
  bank_guarantee: { label: "Bank Guarantee Capability", description: "The company must be able to provide a bank guarantee if required during the project." },
  methodology: { label: "Detailed Methodology Required", description: "The company must submit a detailed project methodology explaining their approach and execution plan." },
  timeline: { label: "Project Timeline Required", description: "The company must provide a detailed project timeline with key milestones and delivery dates." },
  team_cvs: { label: "Team CVs Required", description: "The company must submit CVs of key team members who will be working on this project." },
  industry_certifications: { label: "Industry Certifications Required", description: "The company must hold relevant professional certifications for the specific field of work." },
};

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  inside_bid: "Inside Bid Platform (Anonymous Q&A)",
  email_whatsapp: "Email & WhatsApp",
  whatsapp: "WhatsApp",
  email: "Email",
};

const SCOPE_LABELS: Record<string, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitOfferModalOpen, setIsSubmitOfferModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [expandedEvalCategories, setExpandedEvalCategories] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<string>('description');

  const canManage = activeCompany && ['owner', 'admin'].includes(activeCompany.role);

  const { data: qaQuestions = [] } = useQuery<Array<{
    id: string;
    question: string;
    answer: string | null;
    answeredAt: string | null;
    createdAt: string;
    askedByCompanyName?: string;
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
      toast({ title: "Answer submitted", description: "Your answer is now visible to all vendors." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit answer", description: error.message, variant: "destructive" });
    },
  });

  const { data: tender, isLoading } = useQuery<TenderWithCounts>({
    queryKey: ['/api/tenders', id],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch tender");
      return response.json();
    },
    enabled: !!user && !!id,
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
          title: "Published!",
          description: "Tender is now live and accepting proposals",
          action: (
            <ToastAction altText="Copy invitation link" onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: "Link copied!" }); }}>
              <Copy className="h-3 w-3 mr-1" /> Copy Link
            </ToastAction>
          ),
          duration: 10000,
        });
      } else {
        toast({ title: "Status updated", description: "Tender status has been updated successfully" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    }
  });

  const deleteTender = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({ title: "Tender deleted", description: "The tender has been removed" });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
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

  // Per-offer AI analysis mutation
  const analyzeOffer = useMutation({
    mutationFn: async (offerId: string) => {
      const res = await apiRequest('POST', `/api/ai/analyze-offer/${offerId}`);
      return res.json();
    },
    onSuccess: (data: any, offerId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/proposal-analysis', id] });
      if (data?.status === 'failed') {
        toast({ title: "Analysis failed", description: data.errorMessage || "Could not analyze this proposal.", variant: "destructive" });
      } else {
        setAnalysisDrawerOfferId(offerId);
        toast({ title: "Analysis complete", description: "AI has extracted key facts from this proposal." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
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
      toast({ title: "Copied!", description: "Invitation link copied to clipboard" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Open' };
      case 'draft':
        return { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', label: 'Draft' };
      case 'closed':
        return { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Closed' };
      case 'cancelled':
        return { className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Cancelled' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const getDurationDisplay = () => {
    if (tender.duration && DURATION_LABELS[tender.duration]) return DURATION_LABELS[tender.duration];
    if (tender.duration) return tender.duration;
    if (tender.startDate && tender.endDate) {
      const start = new Date(tender.startDate);
      const end = new Date(tender.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months <= 3) return '1 to 3 months';
      if (months <= 6) return '3 to 6 months';
      return 'More than 6 months';
    }
    return 'Not specified';
  };

  const getBudgetDisplay = () => {
    if (!tender) return null;
    const showPrice = tender.showPriceToVendors !== false;

    if (!showPrice && !isOwner) {
      if (tender.projectSize) {
        return PROJECT_SIZE_LABELS[tender.projectSize] || tender.projectSize;
      }
      return "Budget disclosed upon qualification";
    }

    if (tender.budgetMin && tender.budgetMax) {
      return `SAR ${tender.budgetMin.toLocaleString()} – ${tender.budgetMax.toLocaleString()}`;
    }
    if (tender.budget) {
      const numBudget = Number(tender.budget);
      if (!isNaN(numBudget) && numBudget > 0) {
        return `SAR ${numBudget.toLocaleString()}`;
      }
      return tender.budget;
    }
    return tender.budgetRange || 'Not specified';
  };

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
              <h3 className="text-xl font-semibold mb-2">Tender not found</h3>
              <p className="text-muted-foreground mb-4">
                The tender you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => setLocation('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
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
    { id: 'description', label: 'Project Scope',             icon: FileText,    show: true },
    { id: 'context',     label: 'Context',                   icon: Mic,         show: !!(tender.voiceNoteUrl || tender.videoUrl) },
    { id: 'submission',  label: 'Submission',                icon: Send,        show: !!tender.submissionType },
    { id: 'evaluation',  label: 'Evaluation',                icon: Star,        show: hasEvalCriteria },
    { id: 'inquiry',     label: 'Q&A',                       icon: HelpCircle,  show: hasInquiryMethod },
    ...(isOwner ? [{ id: 'proposals', label: 'Proposals', icon: Users, show: true }] : []),
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
    <div className="min-h-screen bg-white" dir={isTenderRtl ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-4 -ml-2 text-gray-500 hover:text-gray-700"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="mt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <Badge className={`${statusBadge.className} text-xs px-2.5 py-0.5`} data-testid="badge-status">
                    {statusBadge.label}
                  </Badge>
                  {isExpired && isTenderOpen && (
                    <Badge className="bg-red-100 text-red-700 text-xs px-2.5 py-0.5">Deadline Passed</Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Title</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2" data-testid="text-tender-title">
                  {tender.title}
                </h1>
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  {tender.createdAt && <span>Published {formatDate(tender.createdAt)}</span>}
                  <span>·</span>
                  <span className="font-mono text-xs">RFP-{tender.id?.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                  {tender.status === 'draft' && (
                    <Button className="bg-[#E25E45] hover:bg-[#d54d35] text-white"
                      onClick={() => updateStatus.mutate('published')} disabled={updateStatus.isPending} data-testid="button-publish">
                      Publish
                    </Button>
                  )}
                  {(tender.status === 'draft' || tender.status === 'published') && (
                    <Button variant="outline" onClick={() => setLocation(`/tenders/${tender.id}/edit`)} data-testid="button-edit">
                      <Edit className="h-4 w-4 mr-1.5" /> Edit
                    </Button>
                  )}
                  {tender.status === 'published' && (
                    <Button variant="outline" onClick={() => updateStatus.mutate('closed')}
                      disabled={updateStatus.isPending} data-testid="button-close">
                      Close
                    </Button>
                  )}
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { if (confirm('Are you sure you want to delete this tender? This action cannot be undone.')) { deleteTender.mutate(); } }}
                    disabled={deleteTender.isPending} data-testid="button-delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-gray-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-6">

            {/* Main document column */}
            <div>

              {/* Table of Contents */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
                <div className="flex">
                  {tocSections.map((section, idx) => {
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
                        }`}
                      >
                        <span className={`text-xs font-mono ${isActive ? 'text-white/70' : 'text-gray-300'}`}>{idx + 1}</span>
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
                  <TDSectionHeader index={sectionNumber('description')} title="Project Scope" />

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Project Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px] mb-6" data-testid="text-description">
                    {tender.description}
                  </p>

                  {durationDisplay && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Project Duration</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
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
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Project Objective
                      </h3>
                      <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{String(tender.objective)}</p>
                      </div>
                    </div>
                  )}

                  {hasDeliverables && (
                    <div className="mb-8">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> Deliverables
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">Address each item with pricing and timeline in your proposal.</p>
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
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4" /> Required Skills
                      </h3>
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
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Flag className="h-4 w-4" /> Milestones & Payments
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">Payments are released upon completion and acceptance of each milestone.</p>
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
                                    <Calendar className="h-3 w-3" /> Due: {formatDate(milestone.dueDate)}
                                  </p>
                                )}
                                {milestone.amount && (
                                  <p className="text-xs text-[#E25E45] mt-1 font-medium">SAR {Number(milestone.amount).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {(tender.milestones as any[]).some((m: any) => m.amount) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-2">
                          <span className="text-sm font-semibold text-gray-700">Total Project Value</span>
                          <span className="text-base font-bold text-[#E25E45]">
                            SAR {(tender.milestones as any[]).reduce((sum: number, m: any) => sum + (Number(m.amount) || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* end § Project Scope */}

                {(tender.voiceNoteUrl || tender.videoUrl) && (
                  <>
                    <div className="mx-6 sm:mx-8 border-t border-gray-100" />
                    <div id="section-context" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('context')} title="Additional Context" />
                      <div className="space-y-4">
                        {tender.voiceNoteUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <Mic className="h-4 w-4 text-pink-500" />
                              <span>Voice Note from Requester</span>
                            </div>
                            <AudioPlayer src={tender.voiceNoteUrl} />
                          </div>
                        )}
                        {tender.videoUrl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                              <Video className="h-4 w-4 text-blue-500" />
                              <span>Video Explanation</span>
                            </div>
                            <a href={tender.videoUrl.startsWith('http') ? tender.videoUrl : `https://${tender.videoUrl}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              data-testid="link-video">
                              <ExternalLink className="h-4 w-4" /> Watch Video
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {tender.submissionType && (
                  <>
                    <div className="mx-6 sm:mx-8 border-t border-gray-100" />
                    <div id="section-submission" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('submission')} title="Submission Requirements" />
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl mb-4">
                        <div className="p-2.5 bg-blue-100 rounded-lg flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}</p>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {tender.submissionType === 'quote_only' && "Submit a detailed price quote with itemized costs for each deliverable"}
                            {tender.submissionType === 'tech_fin_proposal' && "Submit a comprehensive technical approach document and a separate financial proposal"}
                            {tender.submissionType === 'video_only' && "Record and submit a video pitch (max 10 minutes) presenting your approach"}
                            {tender.submissionType === 'tech_fin_with_video' && "Submit full technical and financial proposal documents accompanied by a video pitch"}
                            {tender.submissionType === 'document_only' && "Submit your proposal as a single document covering scope, approach, timeline, and pricing"}
                            {tender.submissionType === 'both' && "Submit both a video presentation and a written document detailing your proposal"}
                          </p>
                        </div>
                      </div>
                      {tender.videoRequired && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-200 mb-4">
                          <Video className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-orange-800">Video submission is mandatory for this RFP</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Submission deadline: <span className={`font-semibold ${isExpired ? 'text-red-500' : 'text-gray-600'}`}>{formatDate(tender.deadline)}</span></span>
                      </div>
                    </div>
                  </>
                )}

                {hasEvalCriteria && (
                  <>
                    <div className="mx-6 sm:mx-8 border-t border-gray-100" />
                    <div id="section-evaluation" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('evaluation')} title="Evaluation Criteria" />
                      <p className="text-sm text-gray-400 mb-6">Proposals will be scored against these criteria. Ensure your submission clearly addresses each category.</p>
                  {Array.isArray(evalCriteria) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evalCriteria.map((criteria: any, index: number) => {
                        const label = typeof criteria === 'string'
                          ? (CRITERIA_LABELS[criteria] || criteria)
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
                            <BarChart className="h-3.5 w-3.5" /> Score Distribution
                          </p>
                          <div className="flex rounded-full overflow-hidden h-3 mb-3 gap-0.5">
                            {(evalCriteria.weights || []).map((w: any, i: number) => (
                              <div
                                key={w.categoryId}
                                style={{ width: `${w.weight}%` }}
                                className={`${SCORE_BAR_COLORS[i % SCORE_BAR_COLORS.length]} first:rounded-l-full last:rounded-r-full`}
                                title={`${EVAL_CATEGORY_INFO[w.categoryId]?.name || w.categoryId}: ${w.weight}%`}
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
                              const catInfo = EVAL_CATEGORY_INFO[w.categoryId];
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
                        const catInfo = EVAL_CATEGORY_INFO[w.categoryId];
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
                                      const reqInfo = EVAL_REQUIREMENT_INFO[req.requirementId];
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Custom Criteria</p>
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
                    <div className="mx-6 sm:mx-8 border-t border-gray-100" />
                    <div id="section-inquiry" className="p-6 sm:p-8 scroll-mt-24">
                      <TDSectionHeader index={sectionNumber('inquiry')} title="Questions & Clarifications" />
                      <p className="text-sm text-gray-400 mb-6">
                        {tender.inquiryType === 'inside_bid'
                          ? 'Vendors can ask anonymous questions. Your answers are shared with all participants.'
                          : 'Contact the requester directly for any clarifications about this RFP.'}
                      </p>
                  {tender.inquiryType === 'inside_bid' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg flex-shrink-0">
                          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Vendors can ask anonymous questions on this RFP. Your answers will be visible to all participants.
                        </p>
                      </div>

                      {qaQuestions.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {qaQuestions.length} question{qaQuestions.length !== 1 ? 's' : ''} from vendors
                          </p>
                          {qaQuestions.map((q) => (
                            <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-start gap-2">
                                  <HelpCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-white">{q.question}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Asked {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {q.askedByCompanyName && (
                                        <span className="ml-1 text-gray-500"> by {q.askedByCompanyName}</span>
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
                                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">Your answer</p>
                                      <p className="text-sm text-gray-800 dark:text-gray-200">{q.answer}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : canManage ? (
                                <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                  <Textarea
                                    placeholder="Type your answer..."
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
                                      {answerQuestion.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                                      Answer
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-4 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-t border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    Awaiting answer
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No questions have been asked yet.</p>
                      )}
                    </div>
                  )}

                  {tender.inquiryType === 'email_whatsapp' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Reach out directly to the requester using the contact details below:
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
                      {INQUIRY_TYPE_LABELS[tender.inquiryType!] || tender.inquiryType}
                    </p>
                  )}
                    </div>
                  </>
                )}

              </div>
              {/* end continuous document */}

              {/* Proposals (owner only) */}
              {isOwner && (
                <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" id="section-proposals">
                  <div className="p-6 sm:p-8 scroll-mt-24">
                    <TDSectionHeader index={sectionNumber('proposals')} title={`Proposals (${offers.length})`} />
                    {loadingOffers ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-[#E25E45]" />
                      </div>
                    ) : offers.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-gray-500">No proposals received yet</p>
                        <p className="text-sm mt-1">Share the invitation link with vendors to start receiving proposals</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {offers.map((offer) => {
                          const analysis = offerAnalyses.find((a: any) => a.offerId === offer.id);
                          return (
                          <div key={offer.id}
                            className="rounded-xl border border-gray-200 p-4"
                            data-testid={`card-offer-${offer.id}`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-semibold text-gray-900">{offer.profile?.displayName || offer.company.name}</h4>
                                  {offer.company.verificationStatus === 'verified' && (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 className="h-3 w-3" /> Verified
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mb-2">
                                  {offer.company.category && <span>{offer.company.category} · </span>}
                                  Submitted {formatDate(offer.submittedAt)}
                                </p>
                                {offer.quotePrice && (
                                  <p className="text-sm font-semibold text-[#E25E45]">SAR {offer.quotePrice.toLocaleString()}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedOffer(offer)} data-testid={`button-view-${offer.id}`}>
                                    <Eye className="h-3.5 w-3.5 mr-1" /> View Profile
                                  </Button>
                                  {offer.combinedFileUrl && (
                                    <Button variant="outline" size="sm" onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)} data-testid={`button-combined-${offer.id}`}>
                                      <FileText className="h-3.5 w-3.5 mr-1" /> Proposal
                                    </Button>
                                  )}
                                  {offer.technicalFileUrl && (
                                    <Button variant="outline" size="sm" onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)} data-testid={`button-tech-${offer.id}`}>
                                      <FileText className="h-3.5 w-3.5 mr-1" /> Technical
                                    </Button>
                                  )}
                                  {offer.financialFileUrl && (
                                    <Button variant="outline" size="sm" onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)} data-testid={`button-fin-${offer.id}`}>
                                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Financial
                                    </Button>
                                  )}
                                  {offer.videoUrl && (
                                    <Button variant="outline" size="sm" onClick={() => window.open(offer.videoUrl!, '_blank')} data-testid={`button-video-${offer.id}`}>
                                      <Video className="h-3.5 w-3.5 mr-1" /> Video
                                    </Button>
                                  )}
                                  {analysis && analysis.status === 'completed' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAnalysisDrawerOfferId(offer.id)}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                      data-testid={`button-ai-view-${offer.id}`}
                                    >
                                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                                      View AI Summary
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => analyzeOffer.mutate(offer.id)}
                                      disabled={analyzeOffer.isPending}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                      data-testid={`button-ai-${offer.id}`}
                                    >
                                      {analyzeOffer.isPending && analyzeOffer.variables === offer.id ? (
                                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                                      )}
                                      Summarize with AI
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {analysis && analysis.status === 'failed' && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg p-2">
                                <AlertCircle className="h-3.5 w-3.5" />
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

              {/* AI Proposal Comparison (owner only, when 2+ offers exist) */}
              {isOwner && offers.length >= 2 && (
                <div className="mt-6">
                  <ProposalComparison tenderId={tender.id} offers={offers} analyses={offerAnalyses} />
                </div>
              )}

            </div>
            {/* end main column */}

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div className="hidden lg:block">
              <div className="sticky top-20 space-y-4">

                {/* At a Glance */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">At a Glance</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg p-2.5 border ${isExpired ? 'bg-gray-50 border-gray-100' : daysRemaining <= 3 ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className={`h-3 w-3 flex-shrink-0 ${isExpired ? 'text-red-400' : daysRemaining <= 3 ? 'text-orange-500' : 'text-[#E25E45]'}`} />
                        <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Deadline</span>
                      </div>
                      <p className={`text-xs font-bold leading-tight ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-800'}`}>
                        {formatDate(tender.deadline)}
                      </p>
                      {!isExpired && <p className="text-[10px] text-gray-400 mt-0.5">{daysRemaining}d left</p>}
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
                    {isOwner && (
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 col-span-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide leading-none">Proposals</span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{offers.length} received</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner: Invitation Link */}
                {isOwner && (
                  <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Invitation Link</p>
                    <div className="bg-white rounded-lg p-2.5 mb-3 border border-blue-100">
                      <code className="text-xs break-all text-gray-600" data-testid="text-invitation-link">{invitationLink}</code>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={copyInvitationLink} size="sm" className="flex-1 text-xs" data-testid="button-copy-link">
                        {copiedLink ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied!</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy Link</>}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(invitationLink, '_blank')} data-testid="button-open-link">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}


                {/* Vendor: Submit CTA */}
                {!isOwner && activeCompany && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    {hasSubmittedOffer ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Proposal Submitted</p>
                        <p className="text-xs text-gray-400 mb-4">Submitted on {myOffer?.submittedAt ? formatDate(myOffer.submittedAt) : 'N/A'}</p>
                        <div className="flex items-center justify-center py-3 bg-green-50 rounded-xl border border-green-100">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-green-700">Under review</span>
                        </div>
                      </>
                    ) : isExpired ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Submissions Closed</p>
                        <p className="text-xs text-gray-400 mb-4">The deadline for this RFP has passed.</p>
                      </>
                    ) : !isTenderOpen ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Not Accepting Submissions</p>
                        <p className="text-xs text-gray-400 mb-4">This RFP is not currently open.</p>
                      </>
                    ) : !companyCanSubmit ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Complete Your Profile</p>
                        <p className="text-xs text-gray-400 mb-4">Your company must be verified to submit proposals.</p>
                        <Button variant="outline" className="w-full text-sm" onClick={() => setLocation('/company-onboarding')} data-testid="button-complete-profile">
                          Complete Profile
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Ready to Submit?</p>
                        <p className="text-xs text-gray-400 mb-4">
                          {daysRemaining <= 7 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : `Deadline: ${formatDate(tender.deadline)}`}
                        </p>
                        <Button className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white py-5 text-sm font-semibold rounded-xl"
                          onClick={() => setIsSubmitOfferModalOpen(true)} data-testid="button-submit-offer">
                          <Send className="h-4 w-4 mr-2" /> Submit Proposal
                        </Button>
                      </>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOffer?.profile?.logoUrl && (
                <img
                  src={selectedOffer.profile.logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              {selectedOffer?.profile?.displayName || selectedOffer?.company.name}
              {selectedOffer?.company.verificationStatus === 'verified' && (
                <Badge variant="secondary" className="text-xs ml-2">Verified</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedOffer?.company.category || 'Company Profile'}
            </DialogDescription>
          </DialogHeader>

          {selectedOffer && (
            <div className="space-y-4">
              {selectedOffer.profile?.bio && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">About</h4>
                  <p className="text-sm">{selectedOffer.profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Company Name</h4>
                  <p className="text-sm">{selectedOffer.company.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
                  <p className="text-sm">{selectedOffer.company.category || 'Not specified'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Proposal Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{new Date(selectedOffer.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  {selectedOffer.quotePrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quote Price</span>
                      <span className="font-semibold text-[#E25E45]">SAR {selectedOffer.quotePrice.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOffer.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="text-sm mt-1">{selectedOffer.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedOffer.combinedFileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => viewAuthenticatedFile(selectedOffer.combinedFileUrl!)}
                    data-testid="button-modal-combined-file"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Proposal
                  </Button>
                )}
                {selectedOffer.technicalFileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => viewAuthenticatedFile(selectedOffer.technicalFileUrl!)}
                    data-testid="button-modal-tech-file"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Technical Proposal
                  </Button>
                )}
                {selectedOffer.financialFileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => viewAuthenticatedFile(selectedOffer.financialFileUrl!)}
                    data-testid="button-modal-fin-file"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Financial Proposal
                  </Button>
                )}
                {selectedOffer.videoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(selectedOffer.videoUrl!, '_blank')}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video Pitch
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Analysis Drawer */}
      <Sheet open={!!analysisDrawerOfferId} onOpenChange={(open) => !open && setAnalysisDrawerOfferId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {(() => {
            const drawerOffer = offers.find(o => o.id === analysisDrawerOfferId);
            const drawerAnalysis = offerAnalyses.find((a: any) => a.offerId === analysisDrawerOfferId);
            if (!drawerOffer || !drawerAnalysis) return null;
            return (
              <>
                <SheetHeader className="pb-4 border-b border-gray-100">
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    AI Analysis
                  </SheetTitle>
                  <SheetDescription>
                    {drawerOffer.profile?.displayName || drawerOffer.company.name}
                    {drawerOffer.company.category && ` · ${drawerOffer.company.category}`}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 pt-6">
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
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      Re-analyze
                    </Button>
                  </div>

                  {/* Executive Summary */}
                  {drawerAnalysis.executiveSummary && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Executive Summary</p>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed bg-blue-50 rounded-lg p-3 border border-blue-100">
                        {drawerAnalysis.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Table of Contents */}
                  {drawerAnalysis.tableOfContents && drawerAnalysis.tableOfContents.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Table of Contents</p>
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

                  {/* Criteria Mapping */}
                  {drawerAnalysis.criteriaMapping && Object.keys(drawerAnalysis.criteriaMapping).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Criteria Mapping</p>
                      <div className="space-y-1">
                        {Object.entries(drawerAnalysis.criteriaMapping).map(([criterion, pageRef]) => (
                          <div key={criterion} className="flex justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-700">{criterion}</span>
                            <span className={`font-mono text-xs ${pageRef === 'Not Found' ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                              {pageRef as string}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliverables */}
                  {drawerAnalysis.deliverables && drawerAnalysis.deliverables.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deliverables</p>
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
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Financial</p>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        {drawerAnalysis.financial.total != null && (
                          <div className="flex justify-between text-sm px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                            <span className="text-gray-700 font-medium">Total</span>
                            <span className="font-bold text-gray-900">SAR {drawerAnalysis.financial.total.toLocaleString()}</span>
                          </div>
                        )}
                        {drawerAnalysis.financial.vat != null && (
                          <div className="flex justify-between text-sm px-3 py-2 border-b border-gray-100">
                            <span className="text-gray-600">VAT</span>
                            <span className="text-gray-700">{drawerAnalysis.financial.vat}%</span>
                          </div>
                        )}
                        {drawerAnalysis.financial.paymentTerms && (
                          <div className="flex justify-between text-sm px-3 py-2 border-b border-gray-100">
                            <span className="text-gray-600">Payment Terms</span>
                            <span className="text-gray-700 text-right max-w-[60%]">{drawerAnalysis.financial.paymentTerms}</span>
                          </div>
                        )}
                        {drawerAnalysis.financial.breakdown && drawerAnalysis.financial.breakdown.length > 0 && (
                          <>
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Breakdown</span>
                            </div>
                            {drawerAnalysis.financial.breakdown.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm px-3 py-2 border-b border-gray-100 last:border-0">
                                <span className="text-gray-600">{item.item}</span>
                                <span className="text-gray-800 font-medium">SAR {item.amount?.toLocaleString()}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {drawerAnalysis.analyzedAt && (
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                      Analyzed {new Date(drawerAnalysis.analyzedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TDSectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-mono text-gray-300 bg-gray-50 px-2 py-1 rounded border border-gray-100">
        {index}.0
      </span>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}
