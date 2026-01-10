import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, DollarSign, Clock, Building2, ArrowLeft, Send, FileText, Video, Play, Pause, AlertCircle, Target, ListChecks, Star, Mail, Phone, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import SubmitOfferModal from "@/components/submit-offer-modal";
import { formatCurrency } from "@/lib/format-currency";

interface Milestone {
  name: string;
  amount: string;
}

interface TenderInvite {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  budgetRange?: string;
  budget?: string;
  projectSize?: string; // 'small', 'medium', 'large'
  showPriceToVendors?: boolean;
  duration?: string;
  projectTimeline?: string;
  skills?: string[];
  scope?: string;
  pricingModel?: string;
  milestones?: Milestone[];
  voiceNoteUrl?: string;
  videoUrl?: string;
  // Submission process fields
  submissionType?: 'quote_only' | 'tech_fin_proposal' | 'video_only' | 'tech_fin_with_video';
  videoRequired?: boolean;
  // Inquiry/contact fields
  inquiryType?: 'inside_bid' | 'email_whatsapp';
  whatsappContact?: string;
  emailContact?: string;
  // Evaluation and scope
  evaluationCriteria?: string[];
  objective?: string;
  deliverables?: string[];
  company?: {
    id: string;
    name: string;
  };
  profile?: {
    displayName?: string;
  };
}

const getProjectSizeLabel = (size: string): string => {
  switch (size) {
    case "small": return "Small Project";
    case "medium": return "Medium Project";
    case "large": return "Large Project";
    default: return size;
  }
};

const getProjectSizeRange = (size: string): string => {
  switch (size) {
    case "small": return "Under 50,000 SAR";
    case "medium": return "50,000 - 250,000 SAR";
    case "large": return "250,000+ SAR";
    default: return "";
  }
};

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
        className="h-10 w-10 rounded-full bg-primary text-white hover:bg-primary/90"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex-1">
        <div className="relative h-2 bg-gray-300 rounded-full cursor-pointer">
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
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
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-page" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src={logoPath}
            alt="Bid"
            className="h-12 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          />
          {!user ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/login")} data-testid="button-login">
                Login
              </Button>
              <Button onClick={() => navigate("/signup")} data-testid="button-signup">
                Sign Up
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => navigate("/dashboard")} data-testid="button-dashboard">
              Dashboard
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Tender Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-tender-title">
                {tender.title}
              </h1>
              {tender.company && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>{tender.profile?.displayName || tender.company.name}</span>
                </div>
              )}
            </div>
            <Badge 
              className={tender.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
              data-testid="badge-status"
            >
              {tender.status === 'published' ? 'Open' : tender.status}
            </Badge>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Deadline</span>
              </div>
              <p className={`font-semibold ${isDeadlinePassed ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                {new Date(tender.deadline).toLocaleDateString()}
              </p>
              {!isDeadlinePassed && (
                <p className="text-xs text-gray-500">{daysRemaining} days left</p>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Budget</span>
              </div>
              {tender.showPriceToVendors !== false && tender.budget ? (
                <>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(tender.budget)}
                  </p>
                  {tender.projectSize && (
                    <p className="text-xs text-gray-500 mt-1">
                      {getProjectSizeLabel(tender.projectSize)}
                    </p>
                  )}
                </>
              ) : tender.projectSize ? (
                <>
                  <p className="font-semibold text-gray-900">
                    {getProjectSizeLabel(tender.projectSize)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getProjectSizeRange(tender.projectSize)}
                  </p>
                </>
              ) : (
                <p className="font-semibold text-gray-900">
                  {tender.budgetRange || "Not specified"}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="font-semibold text-gray-900">
                {tender.duration || tender.projectTimeline || "Not specified"}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <p className="font-semibold text-gray-900">
                {isDeadlinePassed ? 'Closed' : 'Accepting Proposals'}
              </p>
            </Card>
          </div>
        </div>

        {/* Description Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-description">
              {tender.description}
            </p>
          </CardContent>
        </Card>

        {/* Skills & Scope Section */}
        {(tender.skills && tender.skills.length > 0) || tender.scope || tender.pricingModel ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Skills */}
              {tender.skills && tender.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {tender.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800" data-testid={`badge-skill-${index}`}>
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Scope */}
              {tender.scope && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Project Scope</h4>
                  <Badge variant="outline" className="capitalize" data-testid="badge-scope">
                    {tender.scope === 'large' ? 'Large - Complex initiative' : 
                     tender.scope === 'medium' ? 'Medium - Well-defined project' : 
                     tender.scope === 'small' ? 'Small - Quick task' : tender.scope}
                  </Badge>
                </div>
              )}

              {/* Pricing Model */}
              {tender.pricingModel && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Pricing Model</h4>
                  <Badge variant="outline" className="capitalize" data-testid="badge-pricing-model">
                    {tender.pricingModel === 'fixed' ? 'Fixed Price' : 
                     tender.pricingModel === 'milestone' ? 'Milestone-based' : tender.pricingModel}
                  </Badge>
                </div>
              )}

              {/* Milestones */}
              {tender.pricingModel === 'milestone' && tender.milestones && tender.milestones.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Project Milestones</h4>
                  <div className="space-y-2">
                    {tender.milestones.map((milestone, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg" data-testid={`milestone-${index}`}>
                        <span className="font-medium text-gray-800">{milestone.name}</span>
                        <span className="text-gray-600">${milestone.amount}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-3 bg-[#E25E45]/10 rounded-lg font-semibold">
                      <span className="text-gray-800">Total</span>
                      <span className="text-[#E25E45]">
                        ${tender.milestones.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Voice Note */}
        {tender.voiceNoteUrl && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Voice Note from Requester
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <AudioPlayer src={tender.voiceNoteUrl} />
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
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
            </CardContent>
          </Card>
        )}

        {/* Video Link */}
        {tender.videoUrl && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Project Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={tender.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                Watch project video
              </a>
            </CardContent>
          </Card>
        )}

        {/* Project Objective & Deliverables */}
        {(tender.objective || (tender.deliverables && tender.deliverables.length > 0)) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Project Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tender.objective && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Project Objective</h4>
                  <p className="text-gray-800 whitespace-pre-wrap">{tender.objective}</p>
                </div>
              )}
              {tender.deliverables && tender.deliverables.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Key Deliverables
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {tender.deliverables.map((deliverable, index) => (
                      <li key={index} className="text-gray-800">{deliverable}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submission Requirements */}
        {tender.submissionType && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                How to Submit Your Proposal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  {SUBMISSION_TYPE_LABELS[tender.submissionType] || tender.submissionType}
                </Badge>
              </div>
              {tender.videoRequired && (
                <p className="text-sm text-orange-600 flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video submission is required for this tender
                </p>
              )}
              <p className="text-sm text-gray-600">
                {tender.submissionType === 'quote_only' && "Submit your best price quote for this project."}
                {tender.submissionType === 'video_only' && "Record a video pitch explaining your approach and qualifications."}
                {tender.submissionType === 'tech_fin_proposal' && "Submit both a technical proposal and a financial proposal document."}
                {tender.submissionType === 'tech_fin_with_video' && "Submit technical and financial proposals along with a video pitch."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Criteria */}
        {tender.evaluationCriteria && tender.evaluationCriteria.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                What We Value Most
              </CardTitle>
              <CardDescription>
                These criteria will be prioritized when evaluating proposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tender.evaluationCriteria.map((criteriaId, index) => (
                  <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                    {CRITERIA_LABELS[criteriaId] || criteriaId}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        {tender.inquiryType === 'email_whatsapp' && (tender.emailContact || tender.whatsappContact) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Questions? Contact Us
              </CardTitle>
              <CardDescription>
                Reach out if you have any questions about this tender
              </CardDescription>
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

        {/* Submit Offer CTA */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Interested in this project?
                </h3>
                <p className="text-gray-600">
                  {isDeadlinePassed 
                    ? "This tender is no longer accepting proposals."
                    : "Submit your proposal to be considered for this project."}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleSubmitOffer}
                disabled={isDeadlinePassed || tender.status !== 'published'}
                className="bg-[#E25E45] hover:bg-[#d54d35] text-white font-semibold px-8"
                data-testid="button-submit-proposal"
              >
                <Send className="h-5 w-5 mr-2" />
                Submit Proposal
              </Button>
            </div>
          </CardContent>
        </Card>
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
