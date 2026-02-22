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
  Tag, Mic, ExternalLink, EyeOff, CheckCircle2
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
  evaluationCriteria?: string[];
  objective?: string;
  deliverables?: Array<string | { id: string; name: string; description: string; unit: string; quantity: number }>;
  company?: {
    id: string;
    name: string;
  };
  profile?: {
    displayName?: string;
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

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  inside_bid: "Inside Bid Platform (Anonymous Q&A)",
  email_whatsapp: "Email & WhatsApp",
  whatsapp: "WhatsApp",
  email: "Email",
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

const SCOPE_LABELS: Record<string, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
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

export default function TenderInviteLink() {
  const [, params] = useRoute("/invite/:id");
  const [, navigate] = useLocation();
  const tenderId = params?.id;
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

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

  const hasSkills = tender.skills && tender.skills.length > 0;
  const hasDeliverables = tender.deliverables && tender.deliverables.length > 0;
  const hasMilestones = tender.milestones && tender.milestones.length > 0;
  const hasEvalCriteria = tender.evaluationCriteria && tender.evaluationCriteria.length > 0;
  const hasInquiryMethod = !!tender.inquiryType;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img
            src={logoPath}
            alt="Bid"
            className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          />
          {!user ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/login")} data-testid="button-login">
                Login
              </Button>
              <Button size="sm" className="bg-[#E25E45] hover:bg-[#d54d35]" onClick={() => navigate("/signup")} data-testid="button-signup">
                Sign Up
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} data-testid="button-dashboard">
              Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Hero Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge
                  className={`text-sm px-3 py-1 ${
                    tender.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  data-testid="badge-status"
                >
                  {tender.status === 'published' ? 'Open' : tender.status}
                </Badge>
                {isDeadlinePassed && (
                  <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">
                    Deadline Passed
                  </Badge>
                )}
                {tender.category && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {tender.category}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-tender-title">
                {tender.title}
              </h1>
              {tender.company && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">{tender.profile?.displayName || tender.company.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Key Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Deadline</span>
              </div>
              <p className={`font-semibold text-sm ${isDeadlinePassed ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                {formatDate(tender.deadline)}
              </p>
              {!isDeadlinePassed && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Budget</span>
              </div>
              <p className="font-semibold text-sm text-gray-900">
                {getBudgetDisplay()}
              </p>
              {tender.showPriceToVendors === false && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Range estimate
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Duration</span>
              </div>
              <p className="font-semibold text-sm text-gray-900">
                {DURATION_LABELS[tender.duration || ''] || tender.duration || 'Not specified'}
              </p>
              {tender.projectTimeline && (
                <p className="text-xs text-gray-500 mt-0.5">{tender.projectTimeline}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {isDeadlinePassed ? 'Status' : 'Scope'}
                </span>
              </div>
              <p className="font-semibold text-sm text-gray-900">
                {isDeadlinePassed
                  ? 'Closed'
                  : tender.scope
                    ? (SCOPE_LABELS[tender.scope] || tender.scope)
                    : tender.projectSize
                      ? (PROJECT_SIZE_LABELS[tender.projectSize] || tender.projectSize)
                      : 'Accepting Proposals'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Description */}
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#E25E45]" />
                  Project Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="text-description">
                  {tender.description}
                </p>
              </CardContent>
            </Card>

            {/* 2. Project Objective */}
            {tender.objective && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Project Objective
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {tender.objective}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 3. Key Deliverables (Bill of Quantities) */}
            {hasDeliverables && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-purple-600" />
                    Key Deliverables (Bill of Quantities)
                  </CardTitle>
                  <CardDescription>
                    Items and quantities expected in this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tender.deliverables!.map((deliverable, index) => {
                      if (typeof deliverable === 'string') {
                        return (
                          <div key={index} className="px-4 py-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-800">{deliverable}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={deliverable.id || index} className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
                                <span className="font-semibold text-gray-900">
                                  {deliverable.name}
                                </span>
                              </div>
                              {deliverable.description && (
                                <p className="text-sm text-gray-600 mt-1 ml-8">
                                  {deliverable.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#E25E45]/10 text-[#E25E45]">
                                {deliverable.quantity} x {deliverable.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. Milestones */}
            {hasMilestones && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-orange-500" />
                    Project Milestones
                  </CardTitle>
                  <CardDescription>
                    Key milestones and checkpoints for this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#E25E45] to-[#FF8A6B] rounded-full" />
                    <div className="space-y-4">
                      {tender.milestones!.map((milestone, index) => (
                        <div key={milestone.id || index} className="flex items-start gap-4 relative">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-[#E25E45] flex items-center justify-center flex-shrink-0 z-10">
                            <span className="text-xs font-bold text-[#E25E45]">{index + 1}</span>
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="font-semibold text-gray-900">{milestone.name}</p>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 mt-0.5">{milestone.description}</p>
                            )}
                            {milestone.dueDate && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {formatDate(milestone.dueDate)}
                              </p>
                            )}
                            {milestone.amount && (
                              <p className="text-xs text-[#E25E45] mt-1 font-medium">
                                SAR {Number(milestone.amount).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 5. Voice Note & Video */}
            {(tender.voiceNoteUrl || tender.videoUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-pink-500" />
                    Additional Context
                  </CardTitle>
                  <CardDescription>
                    Listen or watch to better understand the project requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tender.voiceNoteUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Mic className="h-4 w-4 text-pink-500" />
                        <span>Voice Note from Requester</span>
                      </div>
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
                              <p className="text-sm text-gray-500">Log in to listen to the requester's voice note</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`);
                              navigate("/login");
                            }}
                            data-testid="button-login-voice"
                          >
                            Login to Listen
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {tender.videoUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Video className="h-4 w-4 text-blue-500" />
                        <span>Video Explanation</span>
                      </div>
                      <a
                        href={tender.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Watch Video
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 6. Submission Requirements */}
            {tender.submissionType && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-600" />
                    How to Submit Your Proposal
                  </CardTitle>
                  <CardDescription>
                    What the requester expects in your submission
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                    <div className="p-2.5 bg-blue-100 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {tender.submissionType === 'quote_only' && "Submit your price quote for this project"}
                        {tender.submissionType === 'video_only' && "Record and submit a video pitch presenting your approach"}
                        {tender.submissionType === 'tech_fin_proposal' && "Submit both technical approach and financial proposal documents"}
                        {tender.submissionType === 'tech_fin_with_video' && "Submit full proposal documents plus a video pitch"}
                      </p>
                    </div>
                  </div>
                  {tender.videoRequired && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-200">
                      <Video className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-orange-800">
                        Video submission is required for this RFP
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 7. Evaluation Criteria */}
            {hasEvalCriteria && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Evaluation Criteria
                  </CardTitle>
                  <CardDescription>
                    How the requester will evaluate and compare proposals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tender.evaluationCriteria!.map((criteriaId, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-xl border border-amber-100"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Star className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="font-medium text-gray-800 text-sm">
                          {CRITERIA_LABELS[criteriaId] || criteriaId}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 8. Questions & Inquiries */}
            {hasInquiryMethod && (
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-green-600" />
                    Questions & Inquiries
                  </CardTitle>
                  <CardDescription>
                    {tender.inquiryType === 'inside_bid'
                      ? 'Ask questions anonymously — answers are visible to all vendors'
                      : 'How to ask questions about this RFP'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {tender.inquiryType === 'inside_bid' && (
                    <>
                      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                        <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">
                          Your identity is <span className="font-semibold text-gray-900">completely anonymous</span>. Only the requester can see and answer questions. All answers are shared with every vendor for fairness.
                        </p>
                      </div>

                      {/* Existing Questions */}
                      {questions.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-gray-700">
                            {questions.length} question{questions.length !== 1 ? 's' : ''} asked
                          </p>
                          {questions.map((q) => (
                            <div key={q.id} className="rounded-xl border border-gray-200 overflow-hidden">
                              <div className="px-4 py-3 bg-gray-50">
                                <div className="flex items-start gap-2">
                                  <HelpCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">{q.question}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Asked {new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {q.answer ? (
                                <div className="px-4 py-3 bg-white border-t border-gray-100">
                                  <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-green-700 mb-0.5">Answer from requester</p>
                                      <p className="text-sm text-gray-800">{q.answer}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-4 py-2.5 bg-amber-50/50 border-t border-gray-100">
                                  <p className="text-xs text-amber-600 flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    Awaiting answer from requester
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ask a Question Form */}
                      {user ? (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-700">Ask a question</p>
                          <Textarea
                            placeholder="Type your question here... (anonymous, max 1000 characters)"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            maxLength={1000}
                            rows={3}
                            className="resize-none"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">{newQuestion.length}/1000</p>
                            <Button
                              size="sm"
                              onClick={() => askQuestion.mutate(newQuestion)}
                              disabled={!newQuestion.trim() || askQuestion.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {askQuestion.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Submit Question
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-sm text-gray-600">Log in to ask a question anonymously</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              localStorage.setItem('postLoginRedirect', `/invite/${tenderId}`);
                              navigate("/login");
                            }}
                          >
                            Login to Ask
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {tender.inquiryType === 'email_whatsapp' && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 mb-3">
                        Reach out directly to the requester using the contact details below:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {tender.emailContact && (
                          <a
                            href={`mailto:${tender.emailContact}`}
                            className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                          >
                            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                              <Mail className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="font-medium text-blue-700 text-sm truncate">{tender.emailContact}</p>
                            </div>
                          </a>
                        )}
                        {tender.whatsappContact && (
                          <a
                            href={tender.whatsappContact.startsWith('http') ? tender.whatsappContact : `https://wa.me/${tender.whatsappContact.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors"
                          >
                            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                              <Phone className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500">WhatsApp</p>
                              <p className="font-medium text-green-700 text-sm truncate">{tender.whatsappContact}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {tender.inquiryType !== 'inside_bid' && tender.inquiryType !== 'email_whatsapp' && (
                    <p className="text-gray-600">
                      {INQUIRY_TYPE_LABELS[tender.inquiryType!] || tender.inquiryType}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 9. Required Skills */}
            {hasSkills && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-indigo-500" />
                    Required Skills & Expertise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tender.skills!.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 text-sm"
                        data-testid={`badge-skill-${index}`}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Submit Proposal CTA */}
            <Card className="overflow-hidden sticky top-20">
              <div className="h-1.5 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {isDeadlinePassed ? 'Submissions Closed' : 'Interested in this project?'}
                </h3>
                <p className="text-sm text-gray-600 mb-5">
                  {isDeadlinePassed
                    ? "This tender is no longer accepting proposals."
                    : "Submit your proposal to be considered for this project."}
                </p>

                {!isDeadlinePassed && (
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-[#E25E45]" />
                      <span>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
                    </div>
                    {tender.submissionType && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4 text-[#E25E45]" />
                        <span>{SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  size="lg"
                  onClick={handleSubmitOffer}
                  disabled={isDeadlinePassed || tender.status !== 'published'}
                  className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white font-semibold h-12"
                  data-testid="button-submit-proposal"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Submit Proposal
                </Button>

                {!user && !isDeadlinePassed && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    You'll need to log in or sign up first
                  </p>
                )}
              </CardContent>
            </Card>

            {/* At a Glance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">At a Glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tender.company && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Company</p>
                      <p className="text-sm font-medium text-gray-900">
                        {tender.profile?.displayName || tender.company.name}
                      </p>
                    </div>
                  </div>
                )}
                {tender.pricingModel && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Pricing Model</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {tender.pricingModel === 'fixed' ? 'Fixed Price' :
                         tender.pricingModel === 'milestone' ? 'Milestone-based' : tender.pricingModel}
                      </p>
                    </div>
                  </div>
                )}
                {tender.scope && (
                  <div className="flex items-start gap-3">
                    <Layers className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Project Scope</p>
                      <p className="text-sm font-medium text-gray-900">
                        {tender.scope === 'large' ? 'Large - Complex initiative' :
                         tender.scope === 'medium' ? 'Medium - Well-defined project' :
                         tender.scope === 'small' ? 'Small - Quick task' : tender.scope}
                      </p>
                    </div>
                  </div>
                )}
                {tender.projectSize && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Project Size</p>
                      <p className="text-sm font-medium text-gray-900">
                        {PROJECT_SIZE_LABELS[tender.projectSize] || tender.projectSize}
                      </p>
                    </div>
                  </div>
                )}
                {tender.inquiryType && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Inquiry Method</p>
                      <p className="text-sm font-medium text-gray-900">
                        {INQUIRY_TYPE_LABELS[tender.inquiryType] || tender.inquiryType}
                      </p>
                    </div>
                  </div>
                )}
                {tender.createdAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Published</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(tender.createdAt)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Submit Offer Modal */}
      {showOfferModal && tender && (
        <SubmitOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          tender={{
            id: tenderId,
            title: tender.title,
            deadline: tender.deadline,
            budget: tender.budgetRange || tender.budget,
            submissionType: tender.submissionType,
            videoRequired: tender.videoRequired,
          }}
          requester={{
            name: tender.profile?.displayName || tender.company?.name || "Unknown",
            company: tender.company?.name,
          }}
        />
      )}
    </div>
  );
}
