import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building, Clock, DollarSign, Mail, Copy, Check, ArrowLeft, ExternalLink, Edit, Trash2, Send, Users, Loader2, FileText, AlertCircle, Eye, Download, Mic, Video, Play, Pause, X, CheckCircle, XCircle, Target, ListChecks, Star, Phone, MessageSquare } from "lucide-react";
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
};

const CRITERIA_LABELS: Record<string, string> = {
  financial_offer: "Competitive Pricing",
  previous_work: "Relevant Experience",
  clear_timeline: "Clear Timeline",
  technical_approach: "Technical Approach",
  team_expertise: "Team Expertise",
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
        className="h-10 w-10 rounded-full bg-primary text-white hover:bg-primary/90"
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
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ 
              width: `${progress}%`,
              transition: isPlaying ? 'width 0.1s linear' : 'none'
            }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-blue-600 rounded-full shadow-md border-2 border-white"
            style={{ 
              left: `calc(${progress}% - 8px)`,
              transition: isPlaying ? 'left 0.1s linear' : 'none'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{formatTime(currentTime)}</span>
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

  // Check if current company has already submitted an offer
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

  // Check ownership and eligibility for submission
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
      toast({
        title: "Status updated",
        description: "Tender status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteTender = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Tender deleted",
        description: "The tender has been removed",
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateOfferStatus = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/offers/${offerId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', id, 'offers'] });
      // When accepting, vendor is automatically added to base - refresh that list too
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
      toast({
        title: "Failed to update proposal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const copyInvitationLink = async () => {
    if (!tender) return;
    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
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
        return { className: 'bg-blue-100 text-blue-800', label: 'Published' };
      case 'draft':
        return { className: 'bg-gray-100 text-gray-800', label: 'Draft' };
      case 'closed':
        return { className: 'bg-green-100 text-green-800', label: 'Closed' };
      case 'cancelled':
        return { className: 'bg-red-100 text-red-800', label: 'Cancelled' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" data-testid="text-tender-title">{tender.title}</h1>
                <Badge className={statusBadge.className} data-testid="badge-status">
                  {statusBadge.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created on {formatDate(tender.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap" data-testid="text-description">
                  {tender.description}
                </p>
              </CardContent>
            </Card>

            {/* Voice Note & Video Link */}
            {(tender.voiceNoteUrl || tender.videoUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tender.voiceNoteUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mic className="h-4 w-4" />
                        <span>Voice Note from Requester</span>
                      </div>
                      <AudioPlayer src={tender.voiceNoteUrl} />
                    </div>
                  )}
                  {tender.videoUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Video className="h-4 w-4" />
                        <span>Video Explanation</span>
                      </div>
                      <a 
                        href={tender.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
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

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Tender Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submission Deadline</p>
                      <p className={`font-medium ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                        {formatDate(tender.deadline)}
                        {!isExpired && (
                          <span className="text-sm ml-2">
                            ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left)
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-sm ml-2">(Expired)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Budget Range</p>
                      <p className="font-medium">
                        {tender.budgetRange || tender.budget || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {tender.category && (
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{tender.category}</p>
                      </div>
                    </div>
                  )}

                  {(tender.duration || tender.projectTimeline) && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Project Timeline</p>
                        <p className="font-medium">{tender.projectTimeline || tender.duration}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Objective & Deliverables */}
            {(tender.objective || (tender.deliverables && tender.deliverables.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Project Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tender.objective && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Project Objective</h4>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{tender.objective}</p>
                    </div>
                  )}
                  {tender.deliverables && tender.deliverables.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Key Deliverables (Bill of Quantities)
                      </h4>
                      <div className="space-y-3">
                        {(tender.deliverables as any[]).map((deliverable: any, index: number) => {
                          // Handle both old format (string) and new format (object)
                          if (typeof deliverable === 'string') {
                            return (
                              <div key={index} className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-gray-800 dark:text-gray-200">{deliverable}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={deliverable.id || index} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {deliverable.name}
                                    </span>
                                  </div>
                                  {deliverable.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {deliverable.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-[#E25E45]/10 text-[#E25E45]">
                                    {deliverable.quantity} × {deliverable.unit}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submission Requirements */}
            {tender.submissionType && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Submission Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                    {SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}
                  </Badge>
                  {tender.videoRequired && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video submission is required
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Evaluation Criteria */}
            {tender.evaluationCriteria && tender.evaluationCriteria.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Evaluation Criteria
                  </CardTitle>
                  <CardDescription>
                    What matters most when evaluating proposals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tender.evaluationCriteria.map((criteriaId, index) => (
                      <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {CRITERIA_LABELS[criteriaId] || criteriaId}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            {tender.inquiryType === 'email_whatsapp' && (tender.emailContact || tender.whatsappContact) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Contact for Inquiries
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  {tender.emailContact && (
                    <a
                      href={`mailto:${tender.emailContact}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {tender.emailContact}
                    </a>
                  )}
                  {tender.whatsappContact && (
                    <a
                      href={tender.whatsappContact.startsWith('http') ? tender.whatsappContact : `https://wa.me/${tender.whatsappContact.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-green-600 hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp: {tender.whatsappContact}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submit Offer Section (for non-owner companies) */}
            {!isOwner && activeCompany && (
              <Card className={hasSubmittedOffer ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {hasSubmittedOffer ? 'Offer Submitted' : 'Submit Your Offer'}
                  </CardTitle>
                  <CardDescription>
                    {hasSubmittedOffer 
                      ? 'You have already submitted an offer for this tender.' 
                      : 'Submit your technical and financial proposal for this tender.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hasSubmittedOffer ? (
                    <div className="text-center py-4">
                      <Check className="h-12 w-12 mx-auto text-green-600 mb-3" />
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Your offer was submitted on {myOffer?.submittedAt ? formatDate(myOffer.submittedAt) : 'N/A'}
                      </p>
                    </div>
                  ) : !companyCanSubmit ? (
                    <div className="space-y-3">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          Your company must complete its profile and submit for verification to submit offers.
                          Please complete your company profile to request verification.
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
                    <div className="text-center py-4">
                      <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-3" />
                      <p className="text-red-600 font-medium">This tender has expired</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The deadline for submissions has passed.
                      </p>
                    </div>
                  ) : !isTenderOpen ? (
                    <div className="text-center py-4">
                      <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-muted-foreground font-medium">This tender is not accepting submissions</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The tender status is: {tender.status}
                      </p>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setIsSubmitOfferModalOpen(true)}
                      data-testid="button-submit-offer"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Offer
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
                      {offers.map((offer, index) => (
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
                                    View Profile
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
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOwner && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Proposals</span>
                    <span className="font-semibold">{offers.length}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time Remaining</span>
                  <span className={`font-semibold ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                    {isExpired ? 'Expired' : `${daysRemaining} days`}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions - Only visible to tender owner */}
            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tender.status === 'draft' && (
                    <>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
