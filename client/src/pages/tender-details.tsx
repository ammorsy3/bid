import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Clock, DollarSign, Mail, Copy, Check, ArrowLeft, ExternalLink, Edit, Trash2, Send, Users, Loader2, FileText, AlertCircle, Eye, EyeOff, Download, Mic, Video, Play, Pause, X, CheckCircle, XCircle, Target, ListChecks, Star, Phone, MessageSquare, Flag, BarChart, HelpCircle, Shield, Layers, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Tender } from "@shared/schema";
import SubmitOfferModal from "@/components/submit-offer-modal";
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

export default function TenderDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitOfferModalOpen, setIsSubmitOfferModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const canManage = activeCompany && ['owner', 'admin'].includes(activeCompany.role);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({ title: "Status updated", description: "Tender status has been updated successfully" });
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

  const updateOfferStatus = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/offers/${offerId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id, 'offers'] });
      if (variables.status === 'accepted') {
        queryClient.invalidateQueries({ queryKey: ['/api/vendors-base'] });
      }
      toast({
        title: variables.status === 'accepted' ? "Proposal Accepted" : "Proposal Ignored",
        description: variables.status === 'accepted'
          ? "Vendor has been added to your Vendors Base."
          : "This proposal has been marked as ignored.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update proposal", description: error.message, variant: "destructive" });
    }
  });

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
  const hasEvalCriteria = tender.evaluationCriteria && tender.evaluationCriteria.length > 0;
  const hasInquiryMethod = !!tender.inquiryType;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-4 -ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className={`${statusBadge.className} text-sm px-3 py-1`} data-testid="badge-status">
                  {statusBadge.label}
                </Badge>
                {isExpired && isTenderOpen && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-sm px-3 py-1">
                    Deadline Passed
                  </Badge>
                )}
                {tender.category && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {tender.category}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-tender-title">
                {tender.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Published {formatDate(tender.createdAt)}
              </p>
            </div>
          </div>

          {/* Key Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Deadline</span>
              </div>
              <p className={`font-semibold text-sm ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                {formatDate(tender.deadline)}
              </p>
              {!isExpired && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Budget</span>
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {getBudgetDisplay()}
              </p>
              {tender.showPriceToVendors === false && !isOwner && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Hidden from vendors
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Duration</span>
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {DURATION_LABELS[tender.duration || ''] || tender.projectTimeline || tender.duration || 'Not specified'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Scope</span>
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {tender.scope ? (SCOPE_LABELS[tender.scope] || tender.scope) : (tender.projectSize ? (PROJECT_SIZE_LABELS[tender.projectSize] || tender.projectSize) : 'Not specified')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
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
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed" data-testid="text-description">
                  {tender.description}
                </p>
              </CardContent>
            </Card>

            {/* 2. Project Objective */}
            {(tender.objective as string) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Project Objective
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {tender.objective as string}
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
                    {(tender.deliverables as any[]).map((deliverable: any, index: number) => {
                      if (typeof deliverable === 'string') {
                        return (
                          <div key={index} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-800 dark:text-gray-200">{deliverable}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={deliverable.id || index} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {deliverable.name}
                                </span>
                              </div>
                              {deliverable.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-8">
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
                      {(tender.milestones as any[]).map((milestone: any, index: number) => (
                        <div key={milestone.id || index} className="flex items-start gap-4 relative">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-[#E25E45] flex items-center justify-center flex-shrink-0 z-10">
                            <span className="text-xs font-bold text-[#E25E45]">{index + 1}</span>
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="font-semibold text-gray-900 dark:text-white">{milestone.name}</p>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{milestone.description}</p>
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
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Mic className="h-4 w-4 text-pink-500" />
                        <span>Voice Note from Requester</span>
                      </div>
                      <AudioPlayer src={tender.voiceNoteUrl} />
                    </div>
                  )}
                  {tender.videoUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Video className="h-4 w-4 text-blue-500" />
                        <span>Video Explanation</span>
                      </div>
                      <a
                        href={tender.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        data-testid="link-video"
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
              <Card className="border-blue-200 dark:border-blue-800">
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
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {tender.submissionType === 'quote_only' && "Submit your price quote for this project"}
                        {tender.submissionType === 'tech_fin_proposal' && "Submit both technical approach and financial proposal documents"}
                        {tender.submissionType === 'video_only' && "Record and submit a video pitch presenting your approach"}
                        {tender.submissionType === 'tech_fin_with_video' && "Submit full proposal documents plus a video pitch"}
                      </p>
                    </div>
                  </div>
                  {tender.videoRequired && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <Video className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
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
                        className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                          {CRITERIA_LABELS[criteriaId] || criteriaId}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 8. Questions & Inquiries (Q&A) */}
            {hasInquiryMethod && (
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-green-600" />
                    Questions & Inquiries
                  </CardTitle>
                  <CardDescription>
                    How to ask questions about this RFP
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tender.inquiryType === 'inside_bid' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <div className="p-2.5 bg-green-100 dark:bg-green-800/50 rounded-lg flex-shrink-0">
                          <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Anonymous Q&A Inside the Platform
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Submit your questions directly through the Bid platform. Your identity will remain anonymous to other vendors. The requester's answers will be visible to all participants to ensure fairness.
                          </p>
                        </div>
                      </div>
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
                        className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1.5 text-sm"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Offer Section (for non-owner companies) */}
            {!isOwner && activeCompany && (
              <Card className={`overflow-hidden ${hasSubmittedOffer ? "border-green-200 dark:border-green-800" : "border-[#E25E45]/30"}`}>
                <div className={`h-1 ${hasSubmittedOffer ? 'bg-green-500' : 'bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]'}`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {hasSubmittedOffer ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Send className="h-5 w-5 text-[#E25E45]" />
                    )}
                    {hasSubmittedOffer ? 'Proposal Submitted' : 'Submit Your Proposal'}
                  </CardTitle>
                  <CardDescription>
                    {hasSubmittedOffer
                      ? 'Your proposal has been received and is under review.'
                      : 'Ready to compete? Submit your proposal for this opportunity.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hasSubmittedOffer ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Submitted on {myOffer?.submittedAt ? formatDate(myOffer.submittedAt) : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        You'll be notified when the requester reviews your proposal.
                      </p>
                    </div>
                  ) : !companyCanSubmit ? (
                    <div className="space-y-3">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          Your company must complete its profile and submit for verification to submit offers.
                        </AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation('/company-onboarding')}
                        data-testid="button-complete-profile"
                      >
                        Complete Company Profile
                      </Button>
                    </div>
                  ) : isExpired ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                      </div>
                      <p className="text-red-600 font-medium">This RFP has expired</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The deadline for submissions has passed.
                      </p>
                    </div>
                  ) : !isTenderOpen ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-muted-foreground font-medium">This RFP is not accepting submissions</p>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-12 text-base bg-[#E25E45] hover:bg-[#d54d35] text-white"
                      onClick={() => setIsSubmitOfferModalOpen(true)}
                      data-testid="button-submit-offer"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Submit Your Proposal
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invitation Link (for owner only) */}
            {isOwner && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Invitation Link
                  </CardTitle>
                  <CardDescription>
                    Share this link with qualified vendors to invite them to submit proposals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4">
                    <code className="text-sm break-all" data-testid="text-invitation-link">
                      {invitationLink}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={copyInvitationLink}
                      className="flex-1"
                      data-testid="button-copy-link"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(invitationLink, '_blank')}
                      data-testid="button-open-link"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proposals Section - Only visible to tender owner */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Proposals ({offers.length})
                  </CardTitle>
                  <CardDescription>
                    View and manage proposals submitted by vendors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOffers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : offers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No proposals received yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share the invitation link with vendors to start receiving proposals
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {offers.map((offer) => (
                        <Card
                          key={offer.id}
                          className={`border ${
                            offer.status === 'accepted'
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                              : offer.status === 'rejected'
                                ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                                : ''
                          }`}
                          data-testid={`card-offer-${offer.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">
                                    {offer.profile?.displayName || offer.company.name}
                                  </h4>
                                  {offer.company.verificationStatus === 'verified' && (
                                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Accepted
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Ignored
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {offer.company.category || 'No category'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Submitted {formatDate(offer.submittedAt)}
                                </p>
                                {offer.notes && (
                                  <p className="text-sm mt-2">{offer.notes}</p>
                                )}
                                {offer.quotePrice && (
                                  <p className="text-sm font-semibold text-[#E25E45] mt-1">
                                    Quote: SAR {offer.quotePrice.toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedOffer(offer)}
                                    data-testid={`button-view-profile-${offer.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  {offer.technicalFileUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)}
                                      data-testid={`button-tech-file-${offer.id}`}
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      Technical
                                    </Button>
                                  )}
                                  {offer.financialFileUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                      data-testid={`button-fin-file-${offer.id}`}
                                    >
                                      <DollarSign className="h-4 w-4 mr-1" />
                                      Financial
                                    </Button>
                                  )}
                                  {offer.videoUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(offer.videoUrl!, '_blank')}
                                    >
                                      <Video className="h-4 w-4 mr-1" />
                                      Video
                                    </Button>
                                  )}
                                </div>
                                {offer.status === 'pending' && (
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => updateOfferStatus.mutate({ offerId: offer.id, status: 'accepted' })}
                                      disabled={updateOfferStatus.isPending}
                                      data-testid={`button-accept-${offer.id}`}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-gray-600 hover:bg-gray-100"
                                      onClick={() => updateOfferStatus.mutate({ offerId: offer.id, status: 'rejected' })}
                                      disabled={updateOfferStatus.isPending}
                                      data-testid={`button-ignore-${offer.id}`}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Ignore
                                    </Button>
                                  </div>
                                )}
                                {offer.status !== 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-muted-foreground"
                                    onClick={() => updateOfferStatus.mutate({ offerId: offer.id, status: 'pending' })}
                                    disabled={updateOfferStatus.isPending}
                                    data-testid={`button-undo-${offer.id}`}
                                  >
                                    Undo Decision
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">At a Glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isOwner && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Proposals</span>
                    <span className="font-semibold text-lg">{offers.length}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">Deadline</span>
                  <span className={`font-semibold ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                    {isExpired ? 'Expired' : `${daysRemaining} days`}
                  </span>
                </div>
                {tender.submissionType && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Format</span>
                    <span className="text-sm font-medium text-right max-w-[140px]">
                      {SUBMISSION_TYPE_LABELS[tender.submissionType]?.split(' (')[0] || tender.submissionType}
                    </span>
                  </div>
                )}
                {tender.inquiryType && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Q&A</span>
                    <span className="text-sm font-medium">
                      {tender.inquiryType === 'inside_bid' ? 'Platform' : 'Direct'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Details Sidebar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tender.category && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="text-sm font-medium">{tender.category}</span>
                  </div>
                )}
                {tender.scope && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Scope</span>
                    <span className="text-sm font-medium">{SCOPE_LABELS[tender.scope] || tender.scope}</span>
                  </div>
                )}
                {tender.projectSize && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Size</span>
                    <span className="text-sm font-medium">{PROJECT_SIZE_LABELS[tender.projectSize]?.split(' (')[0] || tender.projectSize}</span>
                  </div>
                )}
                {(tender.duration || tender.projectTimeline) && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Timeline</span>
                    <span className="text-sm font-medium">
                      {DURATION_LABELS[tender.duration || ''] || tender.projectTimeline || tender.duration}
                    </span>
                  </div>
                )}
                {isOwner && tender.showPriceToVendors !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Price Visible</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      {tender.showPriceToVendors ? (
                        <><Eye className="h-3.5 w-3.5 text-green-500" /> Yes</>
                      ) : (
                        <><EyeOff className="h-3.5 w-3.5 text-gray-400" /> No</>
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions - Only visible to tender owner */}
            {isOwner && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tender.status === 'draft' && (
                    <>
                      <Button
                        className="w-full bg-[#E25E45] hover:bg-[#d54d35]"
                        onClick={() => updateStatus.mutate('published')}
                        disabled={updateStatus.isPending}
                        data-testid="button-publish"
                      >
                        Publish Tender
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation(`/tenders/${tender.id}/edit`)}
                        data-testid="button-edit"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Tender
                      </Button>
                    </>
                  )}

                  {tender.status === 'published' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => updateStatus.mutate('closed')}
                      disabled={updateStatus.isPending}
                      data-testid="button-close"
                    >
                      Close Tender
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this tender? This action cannot be undone.')) {
                        deleteTender.mutate();
                      }
                    }}
                    disabled={deleteTender.isPending}
                    data-testid="button-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Tender
                  </Button>
                </CardContent>
              </Card>
            )}
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

              <div className="flex gap-2 pt-2">
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
    </div>
  );
}
