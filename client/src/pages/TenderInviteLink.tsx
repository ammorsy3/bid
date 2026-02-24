import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Calendar, DollarSign, Clock, Building2, Send, FileText,
  Video, Play, Pause, AlertCircle, Target, ListChecks, Star,
  Mail, Phone, MessageSquare, Flag, HelpCircle, Shield, Layers,
  Tag, Mic, ExternalLink, EyeOff, CheckCircle2, ChevronRight,
  ArrowRight, Hash, Briefcase, ClipboardCheck
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  company?: {
    id: string;
    name: string;
  };
  profile?: {
    displayName?: string;
    logoUrl?: string;
  };
  createdAt?: string;
  category?: string;
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
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(src, { headers });
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
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * duration;
            if (!isFinite(newTime) || isNaN(newTime)) return;
            audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
            setCurrentTime(Math.max(0, Math.min(newTime, duration)));
          }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#E25E45] rounded-full"
            style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-[#E25E45] rounded-full shadow-md border-2 border-white"
            style={{ left: `calc(${progress}% - 8px)`, transition: isPlaying ? 'left 0.1s linear' : 'none' }}
          />
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

type TabId = 'overview' | 'deliverables' | 'timeline' | 'evaluation' | 'requirements' | 'media' | 'qa';

export default function TenderInviteLink() {
  const [, params] = useRoute("/invite/:id");
  const [, navigate] = useLocation();
  const tenderId = params?.id;
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedEvalCategories, setExpandedEvalCategories] = useState<Record<string, boolean>>({});

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
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">No tender ID provided.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
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
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Tender Not Found</CardTitle>
            <CardDescription>
              {(error as any)?.message || "The tender you're looking for doesn't exist or is no longer available."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDeadlinePassed = new Date(tender.deadline) < new Date();
  const daysRemaining = Math.ceil((new Date(tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
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
    const showPrice = tender.showPriceToVendors !== false;
    if (!showPrice) {
      if (tender.projectSize) {
        return PROJECT_SIZE_LABELS[tender.projectSize] || tender.projectSize;
      }
      return "Budget disclosed upon qualification";
    }
    if (tender.budgetMin && tender.budgetMax) {
      return `SAR ${tender.budgetMin.toLocaleString()} – ${tender.budgetMax.toLocaleString()}`;
    }
    if (tender.budget) {
      return formatCurrency(tender.budget);
    }
    return tender.budgetRange || 'Not specified';
  };

  const handleSubmitOffer = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login or create an account to submit a proposal.",
      });
      localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`);
      navigate("/login");
      return;
    }
    setShowOfferModal(true);
  };

  const hasDeliverables = tender.deliverables && tender.deliverables.length > 0;
  const hasMilestones = tender.milestones && tender.milestones.length > 0;
  const hasEvalCriteria = tender.evaluationCriteria && (
    Array.isArray(tender.evaluationCriteria)
      ? tender.evaluationCriteria.length > 0
      : (tender.evaluationCriteria.weights?.length > 0 || tender.evaluationCriteria.requirements?.length > 0 || tender.evaluationCriteria.customCriteria?.length > 0)
  );
  const hasMedia = !!(tender.voiceNoteUrl || tender.videoUrl);
  const hasSkills = tender.skills && tender.skills.length > 0;

  const logoUrl = companyProfile?.profile?.logoUrl || tender.profile?.logoUrl;
  const displayName = companyProfile?.profile?.displayName || tender.profile?.displayName || tender.company?.name;

  const allTabs: { id: TabId; label: string; icon: any; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: FileText, show: true },
    { id: 'deliverables', label: 'Deliverables', icon: ListChecks, show: hasDeliverables || false },
    { id: 'timeline', label: 'Timeline', icon: Flag, show: hasMilestones || false },
    { id: 'evaluation', label: 'Evaluation', icon: Star, show: hasEvalCriteria || false },
    { id: 'requirements', label: 'Requirements', icon: ClipboardCheck, show: !!(tender.submissionType || hasSkills) },
    { id: 'media', label: 'Media', icon: Mic, show: hasMedia },
    { id: 'qa', label: `Q&A${questions.length > 0 ? ` (${questions.length})` : ''}`, icon: MessageSquare, show: tender.inquiryType === 'inside_bid' },
  ];
  const tabs = allTabs.filter(t => t.show);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img
            src={logoPath}
            alt="Bid"
            className="h-9 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          />
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")} data-testid="button-login">
                  Login
                </Button>
                <Button size="sm" className="bg-[#E25E45] hover:bg-[#d54d35] text-white" onClick={() => navigate("/signup")} data-testid="button-signup">
                  Sign Up
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="button-dashboard">
                Dashboard
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-0">
          {/* Company & Status Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-gray-900 font-semibold text-sm">{displayName}</p>
                <p className="text-gray-400 text-xs">Requesting Organization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tender.status === 'published' && !isDeadlinePassed && (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1" data-testid="badge-status">
                  Open for Submissions
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

          {/* Key Metrics Strip */}
          <div className={`grid grid-cols-2 ${tender.pricingModel ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 mb-5`}>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar className="h-4 w-4 text-[#E25E45]" />
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Deadline</span>
              </div>
              <p className={`font-bold text-sm ${isDeadlinePassed ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                {formatDate(tender.deadline)}
              </p>
              {!isDeadlinePassed && <p className="text-gray-400 text-xs mt-0.5">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</p>}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Budget</span>
              </div>
              <p className="font-bold text-sm text-gray-900">{getBudgetDisplay()}</p>
              {tender.showPriceToVendors === false && (
                <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1"><EyeOff className="h-3 w-3" /> Range estimate</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Duration</span>
              </div>
              <p className="font-bold text-sm text-gray-900">{getDurationDisplay()}</p>
              {(tender.startDate || tender.endDate) && (
                <p className="text-gray-400 text-xs mt-0.5">
                  {tender.startDate && formatDate(tender.startDate)}{tender.startDate && tender.endDate && ' → '}{tender.endDate && formatDate(tender.endDate)}
                </p>
              )}
            </div>

            {tender.pricingModel && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <Layers className="h-4 w-4 text-purple-500" />
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Model</span>
                </div>
                <p className="font-bold text-sm text-gray-900 capitalize">
                  {tender.pricingModel === 'fixed' ? 'Fixed Price' : tender.pricingModel === 'milestone' ? 'Milestone-based' : tender.pricingModel}
                </p>
              </div>
            )}
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar -mb-px">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-[#E25E45] text-[#E25E45]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-gray-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Project Description</h2>
                  <p className="text-sm text-gray-400 mb-4">Overview of what this RFP is about and what the requesting organization needs.</p>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[15px]" data-testid="text-description">{tender.description}</p>
                  </div>

                  {tender.objective && (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-500" />
                        Project Objective
                      </h3>
                      <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{tender.objective}</p>
                      </div>
                    </div>
                  )}

                  {hasSkills && (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-indigo-500" />
                        Required Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {tender.skills!.map((skill, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium" data-testid={`badge-skill-${index}`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick navigation to other tabs */}
                  <div className="mt-10 pt-6 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Explore This RFP</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tabs.filter(t => t.id !== 'overview').map(tab => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left group"
                          >
                            <div className="p-2 rounded-lg bg-white border border-gray-200 group-hover:border-[#E25E45]/30 transition-colors">
                              <Icon className="h-4 w-4 text-gray-500 group-hover:text-[#E25E45] transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{tab.label}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#E25E45] transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Deliverables Tab */}
              {activeTab === 'deliverables' && hasDeliverables && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Scope of Work & Deliverables</h2>
                  <p className="text-sm text-gray-500 mb-6">Your proposal should address each item with pricing and timeline.</p>
                  <div className="space-y-3">
                    {tender.deliverables!.map((deliverable, index) => {
                      if (typeof deliverable === 'string') {
                        return (
                          <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#E25E45] text-white text-xs font-bold flex items-center justify-center">{index + 1}</span>
                            <span className="text-gray-800 pt-0.5">{deliverable}</span>
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
                                {deliverable.description && (
                                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{deliverable.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#E25E45]/10 text-[#E25E45]">
                              {deliverable.quantity} x {deliverable.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      Vendors are expected to provide a line-by-line cost breakdown for each deliverable.
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline / Milestones Tab */}
              {activeTab === 'timeline' && hasMilestones && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Milestones & Payment Schedule</h2>
                  <p className="text-sm text-gray-500 mb-6">Payments are released upon completion and acceptance of each milestone.</p>
                  <div className="space-y-4">
                    {tender.milestones!.map((milestone, index) => (
                      <div key={milestone.id || index} className="relative flex gap-4">
                        {/* Timeline line */}
                        {index < tender.milestones!.length - 1 && (
                          <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-[#E25E45]/40 to-[#E25E45]/10" />
                        )}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E25E45] text-white font-bold text-sm flex items-center justify-center z-10">
                          {index + 1}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                            <p className="font-semibold text-gray-900 text-base">{milestone.name}</p>
                            {milestone.description && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{milestone.description}</p>}
                            <div className="flex items-center gap-4 mt-3 flex-wrap">
                              {milestone.dueDate && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-100">
                                  <Calendar className="h-3.5 w-3.5" /> {formatDate(milestone.dueDate)}
                                </span>
                              )}
                              {milestone.amount && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E25E45] bg-[#E25E45]/5 px-3 py-1.5 rounded-lg">
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
                      <span className="text-lg font-bold text-gray-900">SAR {tender.milestones!.reduce((sum, m) => sum + (Number(m.amount) || 0), 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Evaluation Tab */}
              {activeTab === 'evaluation' && hasEvalCriteria && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Evaluation Criteria</h2>
                  <p className="text-sm text-gray-500 mb-6">Proposals will be scored against these criteria. Address each one in your submission.</p>
                  {Array.isArray(tender.evaluationCriteria) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tender.evaluationCriteria.map((criteria: any, index: number) => {
                        const label = typeof criteria === 'string' ? (CRITERIA_LABELS[criteria] || criteria) : (criteria.name || criteria);
                        return (
                          <div key={index} className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <Star className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="font-medium text-gray-800">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tender.evaluationCriteria.weights?.map((w: any) => {
                        const catInfo = EVAL_CATEGORY_INFO[w.categoryId];
                        const catRequirements = (tender.evaluationCriteria.requirements || []).filter((r: any) => r.categoryId === w.categoryId);
                        const isExpanded = expandedEvalCategories[w.categoryId] || false;
                        return (
                          <div key={w.categoryId} className="rounded-xl border border-gray-200 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedEvalCategories(prev => ({ ...prev, [w.categoryId]: !prev[w.categoryId] }))}
                              className="w-full flex items-center gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                            >
                              <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900">{catInfo?.name || w.categoryId}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{catInfo?.description || ''}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <span className="text-2xl font-bold text-[#E25E45]">{w.weight}</span>
                                <span className="text-xs text-gray-400 ml-0.5">%</span>
                              </div>
                            </button>
                            <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                              <div className="overflow-hidden">
                                {catRequirements.length > 0 ? (
                                  <div className="px-5 py-4 space-y-3 border-t border-gray-100">
                                    {catRequirements.map((req: any, i: number) => {
                                      const reqInfo = EVAL_REQUIREMENT_INFO[req.requirementId];
                                      const displayValue = req.value && typeof req.value !== 'boolean'
                                        ? (reqInfo?.formatValue ? reqInfo.formatValue(String(req.value)) : String(req.value))
                                        : null;
                                      return (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800">{reqInfo?.label || req.requirementId}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{reqInfo?.description || ''}</p>
                                            {displayValue && <p className="text-xs font-semibold text-[#E25E45] mt-1">{displayValue}</p>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="px-5 py-4 border-t border-gray-100">
                                    <p className="text-sm text-gray-400 italic">No specific requirements were set for this category.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {tender.evaluationCriteria.customCriteria?.length > 0 && (
                        <div className="space-y-2 pt-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Additional Criteria</p>
                          {tender.evaluationCriteria.customCriteria.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                              <span className="text-sm font-medium text-gray-800">{c.text}</span>
                              <span className="text-sm font-bold text-[#E25E45]">{c.weight}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Requirements Tab */}
              {activeTab === 'requirements' && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Requirements</h2>
                  <p className="text-sm text-gray-500 mb-6">Your proposal must follow the format specified below.</p>

                  {tender.submissionType && (
                    <div className="mb-6">
                      <div className="flex items-start gap-4 p-5 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-base">{SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}</p>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            {tender.submissionType === 'quote_only' && "Submit a detailed price quotation with line-item breakdown for each deliverable."}
                            {tender.submissionType === 'video_only' && "Record and submit a video pitch presenting your team, methodology, and approach."}
                            {tender.submissionType === 'tech_fin_proposal' && "Submit a two-part proposal: (1) Technical approach with methodology and timeline, and (2) Financial proposal with detailed pricing."}
                            {tender.submissionType === 'tech_fin_with_video' && "Submit a complete proposal package: technical document, financial proposal, and a supporting video pitch."}
                          </p>
                        </div>
                      </div>
                      {tender.videoRequired && (
                        <div className="mt-3 flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-200">
                          <Video className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-orange-800">Video submission is mandatory</span>
                        </div>
                      )}
                    </div>
                  )}

                  {hasSkills && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-indigo-500" />
                        Required Skills & Expertise
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">Your team should demonstrate competency in these areas.</p>
                      <div className="flex flex-wrap gap-2">
                        {tender.skills!.map((skill, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inquiry method info */}
                  {tender.inquiryType && tender.inquiryType !== 'inside_bid' && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact for Questions</h4>
                      <div className="space-y-2">
                        {tender.emailContact && (
                          <a href={`mailto:${tender.emailContact}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                            <Mail className="h-4 w-4" /> {tender.emailContact}
                          </a>
                        )}
                        {tender.whatsappContact && (
                          <a href={`https://wa.me/${tender.whatsappContact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-600 hover:underline">
                            <Phone className="h-4 w-4" /> {tender.whatsappContact}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-gray-100 rounded-xl">
                    <p className="text-sm text-gray-500">All submissions must be received before the deadline. Late submissions will not be accepted.</p>
                  </div>
                </div>
              )}

              {/* Media Tab */}
              {activeTab === 'media' && hasMedia && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Additional Context</h2>
                  <p className="text-sm text-gray-500 mb-6">The requester has provided additional media. Review carefully before preparing your proposal.</p>
                  <div className="space-y-6">
                    {tender.voiceNoteUrl && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                            <Button size="sm" onClick={() => { localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`); navigate("/login"); }} data-testid="button-login-voice">Login</Button>
                          </div>
                        )}
                      </div>
                    )}
                    {tender.videoUrl && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Video className="h-4 w-4 text-blue-500" /> Video Explanation
                        </h3>
                        <a href={tender.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium">
                          <ExternalLink className="h-4 w-4" /> Watch Video
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Q&A Tab */}
              {activeTab === 'qa' && (
                <div className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Questions & Answers</h2>
                  <div className="flex items-center gap-2 mb-6">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm text-gray-500">All questions are posted anonymously.</p>
                  </div>

                  {/* Ask question */}
                  {user ? (
                    <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Ask a Question</h3>
                      <Textarea
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Type your question about this RFP..."
                        className="min-h-[80px] bg-white border-gray-200 resize-none mb-3"
                        data-testid="input-question"
                      />
                      <Button
                        size="sm"
                        className="bg-[#E25E45] hover:bg-[#d54d35]"
                        onClick={() => newQuestion.trim() && askQuestion.mutate(newQuestion.trim())}
                        disabled={askQuestion.isPending || !newQuestion.trim()}
                        data-testid="button-ask"
                      >
                        {askQuestion.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Submit Question
                      </Button>
                    </div>
                  ) : (
                    <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200 text-center">
                      <p className="text-sm text-gray-600 mb-3">Log in to ask questions about this RFP</p>
                      <Button size="sm" onClick={() => { localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`); navigate("/login"); }}>
                        Login to Ask
                      </Button>
                    </div>
                  )}

                  {/* Question list */}
                  {questions.length > 0 ? (
                    <div className="space-y-4">
                      {questions.map((qa) => (
                        <div key={qa.id} className="p-4 rounded-xl border border-gray-100 bg-white">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-blue-50 flex-shrink-0 mt-0.5">
                              <HelpCircle className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium">{qa.question}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Asked {new Date(qa.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          {qa.answer && (
                            <div className="mt-3 ml-9 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                              <p className="text-sm text-gray-700">{qa.answer}</p>
                              {qa.answeredAt && (
                                <p className="text-xs text-emerald-600 mt-1 font-medium">
                                  Answered {new Date(qa.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          )}
                          {!qa.answer && (
                            <div className="mt-3 ml-9">
                              <span className="text-xs text-gray-400 italic">Awaiting response from requester</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No questions yet. Be the first to ask!</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar - Submit CTA */}
            <div className="hidden lg:block">
              <div className="sticky top-4 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-1">Ready to Submit?</h3>
                  <p className="text-sm text-gray-500 mb-5">
                    {isDeadlinePassed
                      ? 'This RFP is no longer accepting submissions.'
                      : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining to submit your proposal.`}
                  </p>
                  <Button
                    className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white py-6 text-base font-semibold rounded-xl"
                    onClick={handleSubmitOffer}
                    disabled={isDeadlinePassed}
                    data-testid="button-submit-offer"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Submit Proposal
                  </Button>
                  {!user && (
                    <p className="text-xs text-gray-400 text-center mt-3">You'll need to log in first</p>
                  )}
                </div>

                {/* Quick info card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Info</h4>
                  <div className="space-y-3">
                    {tender.submissionType && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Submission Format</span>
                          <span className="font-medium text-gray-900 text-right">{SUBMISSION_TYPE_LABELS[tender.submissionType]}</span>
                        </div>
                        <div className="border-t border-gray-50" />
                      </>
                    )}
                    {tender.pricingModel && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Pricing Model</span>
                          <span className="font-medium text-gray-900 capitalize">{tender.pricingModel === 'fixed' ? 'Fixed' : tender.pricingModel === 'milestone' ? 'Milestone' : tender.pricingModel}</span>
                        </div>
                        <div className="border-t border-gray-50" />
                      </>
                    )}
                    {tender.category && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Category</span>
                        <span className="font-medium text-gray-900">{tender.category}</span>
                      </div>
                    )}
                    {tender.inquiryType && tender.inquiryType !== 'inside_bid' && (
                      <>
                        <div className="border-t border-gray-50" />
                        <div className="text-sm">
                          <span className="text-gray-500 block mb-1">Contact</span>
                          {tender.emailContact && (
                            <a href={`mailto:${tender.emailContact}`} className="text-blue-600 hover:underline block text-xs truncate">{tender.emailContact}</a>
                          )}
                          {tender.whatsappContact && (
                            <a href={`https://wa.me/${tender.whatsappContact.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline block text-xs">{tender.whatsappContact}</a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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