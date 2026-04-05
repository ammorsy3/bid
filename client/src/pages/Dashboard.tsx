import { useAuthStore } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { AnimatedCopyButton } from "@/components/ui/animated-copy-button";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { Building2, FileText, Users, Inbox, LogOut, Search, CheckCircle, XCircle, Loader2, Mail, UserPlus, Eye, ShieldCheck, Clock, UserCheck, Plus, Copy, Check, Calendar, Send, MoreHorizontal, Trash2, Edit, ExternalLink, DollarSign, X, LayoutDashboard, Settings, CreditCard, Bell, MessageSquare, ChevronDown, Sparkles, Image, Link2, ClipboardList, Cog, Video, Play, Globe, HelpCircle, Gift, Sun, Moon, Monitor, ChevronRight, Filter, Handshake, ChevronsUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription, PopoverBody, PopoverFooter } from "@/components/ui/popover";
import { useState, useRef, useEffect, useCallback } from "react";
import { useDashboardTour } from "@/lib/tour";
import { getDashboardTourSteps } from "@/lib/tour-steps";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { viewAuthenticatedFile } from "@/lib/downloadFile";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";

interface VendorProfile {
  id: string;
  companyId: string;
  company: string;
  legalName: string | null;
  category: string;
  city: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  bio: string;
  logoUrl: string | null;
  email: string;
  verificationStatus: string;
  joinMethod: string;
  joinedAt: string;
}

interface JoinRequest {
  id: string;
  status: string;
  createdAt: string;
  vendor?: {
    id: string;
    name: string;
    email: string;
    company: string;
    expertise: string | null;
    verificationStatus: string;
  };
}

const SUBMISSION_TYPE_LABELS_DASH: Record<string, string> = {
  quote_only: "Price Quote Only",
  tech_fin_proposal: "Technical & Financial",
  video_only: "Video Only",
  tech_fin_with_video: "Tech & Fin + Video",
};

interface TenderWithCounts {
  id: string;
  title: string;
  description: string;
  category: string | null;
  deadline: string;
  budget: string | null;
  budgetRange: string | null;
  status: string;
  invitationToken: string;
  createdAt: string;
  offersCount: number;
  submissionType: string | null;
}

interface MyOffer {
  id: string;
  tenderId: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  combinedFileUrl: string | null;
  quotePrice: number | null;
  videoUrl: string | null;
  notes: string | null;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  tender: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    budget: string | null;
    status: string;
    submissionType: string | null;
  };
}

interface IncomingOffer {
  id: string;
  tenderId: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  combinedFileUrl: string | null;
  quotePrice: number | null;
  videoUrl: string | null;
  notes: string | null;
  submittedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  isViewed: boolean;
  tender: {
    id: string;
    title: string;
    description: string | null;
    deadline: string;
    budget: string | null;
    status: string;
    submissionType: string | null;
  };
  company: {
    id: string;
    name: string;
    category: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    logoUrl: string | null;
  };
}

// Component for sidebar header with logo/toggle swap on hover when collapsed
function ChatHistorySidebar() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const { data: chatSessions } = useQuery<any[]>({
    queryKey: ["/api/ai-chat-sessions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ai-chat-sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-chat-sessions"] });
    },
  });

  const sessions = chatSessions || [];
  if (sessions.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('common.today') || "Today";
    if (diffDays === 1) return t('common.yesterday') || "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <SidebarGroup>
      <div className="px-3 py-2 flex items-center justify-between group-data-[collapsible=icon]:hidden">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('dashboard.aiChatHistory') || "AI Chat History"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setLocation("/tenders/new/ai")}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-0.5">
          {sessions.slice(0, 10).map((session: any) => (
            <SidebarMenuItem key={session.id}>
              <SidebarMenuButton
                tooltip={session.title}
                onClick={() => setLocation(`/tenders/new/ai?session=${session.id}`)}
                className="py-2 text-sm rounded-lg hover:bg-muted group/chat"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm truncate block">{session.title}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(session.updatedAt)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(session.id);
                  }}
                  className="opacity-0 group-hover/chat:opacity-100 shrink-0 p-0.5 hover:text-destructive transition-opacity group-data-[collapsible=icon]:hidden"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarLogoToggle() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isCollapsed ? (
        <SidebarTrigger className="h-6 w-6" />
      ) : (
        <img src={logoPath} alt="Bid" className="h-8 object-contain" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, activeCompany, companies, logout, switchCompany } = useAuthStore();
  const [, setLocation] = useLocation();
  const { t, isRtl, language, setLanguage } = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<IncomingOffer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [tenderSearchQuery, setTenderSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [tenderFilter, setTenderFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [showTendersBlur, setShowTendersBlur] = useState(true);
  const [showSentBlur, setShowSentBlur] = useState(true);
  const [showReceivedBlur, setShowReceivedBlur] = useState(true);
  const tendersScrollRef = useRef<HTMLDivElement>(null);
  const sentScrollRef = useRef<HTMLDivElement>(null);
  const receivedScrollRef = useRef<HTMLDivElement>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCompanyProfileDialog, setShowCompanyProfileDialog] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const { toast } = useToast();

  // ── First-time user guided tour ──────────────────────────────────────────
  const { overlay: tourOverlay, tourDismissed, retake: retakeTour } = useDashboardTour({
    userId: user?.id ?? '',
    steps: getDashboardTourSteps((language as 'en' | 'ar') ?? 'en'),
    isRtl,
    autoStart: !!user,
  });

  const dotColor = currentTheme === 'dark'
    ? 'rgba(139, 92, 246, 0.15)'
    : 'rgba(156, 163, 175, 0.3)';

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!activeCompany) {
    setLocation("/company-onboarding");
    return null;
  }

  // Check if user is owner or admin (can create tenders, manage vendors)
  const userRole = activeCompany.role || 'viewer';
  const canManage = ['owner', 'admin'].includes(userRole);
  const isOwner = userRole === 'owner';

  // Fetch vendors in base
  const { data: vendors = [], isLoading: loadingVendors } = useQuery<VendorProfile[]>({
    queryKey: ['/api/vendors-base', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/vendors-base${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    enabled: canManage
  });

  // Fetch pending join requests
  const { data: pendingRequests = [] } = useQuery<JoinRequest[]>({
    queryKey: ['/api/join-requests', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/join-requests?status=pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch join requests");
      return response.json();
    },
    enabled: canManage
  });

  // Fetch tenders
  const { data: tenders = [], isLoading: loadingTenders } = useQuery<TenderWithCounts[]>({
    queryKey: ['/api/tenders'],
    queryFn: async () => {
      const response = await fetch('/api/tenders', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch tenders");
      return response.json();
    },
    enabled: canManage
  });

  // Fetch my submitted offers/proposals
  const { data: myOffers = [], isLoading: loadingMyOffers } = useQuery<MyOffer[]>({
    queryKey: ['/api/my-offers'],
    queryFn: async () => {
      const response = await fetch('/api/my-offers', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch offers");
      return response.json();
    }
  });

  // Fetch incoming offers on our tenders
  const { data: incomingOffers = [], isLoading: loadingIncomingOffers } = useQuery<IncomingOffer[]>({
    queryKey: ['/api/my-tenders/offers'],
    queryFn: async () => {
      const response = await fetch('/api/my-tenders/offers', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch incoming offers");
      return response.json();
    }
  });

  // Fetch onboarding tasks status
  interface OnboardingTasks {
    hasTender: boolean;
    hasCompletedProfile: boolean;
    hasProfilePicture: boolean;
    hasVendors: boolean;
    hasReviewedProposal: boolean;
    hasVisitedSettings: boolean;
    completedCount: number;
  }
  
  const { data: onboardingTasks } = useQuery<OnboardingTasks>({
    queryKey: ['/api/onboarding-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/onboarding-tasks', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!response.ok) throw new Error("Failed to fetch onboarding tasks");
      return response.json();
    }
  });

  // Tenders eligible for negotiation: closed, 2+ offers, no accepted offer
  const tendersReadyToNegotiate = tenders.filter(t =>
    t.status === 'closed' &&
    t.offersCount >= 2 &&
    !incomingOffers.some(o => o.tenderId === t.id && o.status === 'accepted')
  );

  // Helper: update blur visibility based on viewport scrollability + position
  const checkBlur = useCallback((ref: React.RefObject<HTMLDivElement | null>, setFn: (v: boolean) => void) => {
    const el = ref.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!el) return;
    setFn(el.scrollHeight > el.clientHeight + 10 && el.scrollHeight - el.scrollTop - el.clientHeight > 10);
  }, []);

  // Filter tenders based on search and status
  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = !tenderSearchQuery || 
      tender.title.toLowerCase().includes(tenderSearchQuery.toLowerCase()) ||
      (tender.description && tender.description.toLowerCase().includes(tenderSearchQuery.toLowerCase()));
    const matchesFilter = tenderFilter === 'all' || tender.status === tenderFilter;
    return matchesSearch && matchesFilter;
  });

  useEffect(() => { checkBlur(tendersScrollRef, setShowTendersBlur); }, [filteredTenders, checkBlur]);
  useEffect(() => { checkBlur(sentScrollRef, setShowSentBlur); }, [myOffers, checkBlur]);
  useEffect(() => { checkBlur(receivedScrollRef, setShowReceivedBlur); }, [incomingOffers, checkBlur]);

  // Derived unique values for vendor filters
  const uniqueCategories = Array.from(new Set(vendors.map(v => v.category).filter(Boolean))).sort();
  const uniqueCities = Array.from(new Set(vendors.map(v => v.city).filter(Boolean) as string[])).sort();

  // Filter vendors based on category, city, and verification status
  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = categoryFilter === 'all' || vendor.category === categoryFilter;
    const matchesCity = cityFilter === 'all' || vendor.city === cityFilter;
    const matchesVerification = verificationFilter === 'all' || vendor.verificationStatus === verificationFilter;
    return matchesCategory && matchesCity && matchesVerification;
  });

  const activeFilterCount = [categoryFilter, cityFilter, verificationFilter].filter(f => f !== 'all').length;

  // Delete tender mutation
  const deleteTender = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Tender deleted",
        description: "The tender has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Copy invitation link
  const copyInvitationLink = async (tender: TenderWithCounts) => {
    const invitationLink = `${window.location.origin}/invite/${tender.id}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedLinkId(tender.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
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

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { className: 'bg-green-100 text-green-800', label: 'Published' };
      case 'draft':
        return { className: 'bg-gray-100 text-gray-800', label: 'Draft' };
      case 'closed':
        return { className: 'bg-red-100 text-red-800', label: 'Closed' };
      case 'cancelled':
        return { className: 'bg-orange-100 text-orange-800', label: 'Cancelled' };
      default:
        return { className: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Approve join request mutation
  const approveRequest = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/join-requests/${id}/approve`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors-base'] });
      toast({
        title: "Request approved",
        description: data.message || "Vendor has been added to your base",
      });
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject join request mutation
  const rejectRequest = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/join-requests/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests'] });
      toast({
        title: "Request rejected",
        description: "Vendor application has been declined",
      });
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const markOfferViewed = useMutation({
    mutationFn: async (offerId: string) => {
      return await apiRequest('POST', `/api/offers/${offerId}/view`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tenders/offers'] });
    }
  });

  // Update offer status mutation (accept/reject proposals)
  const updateOfferStatus = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/offers/${offerId}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-tenders/offers'] });
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

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const sidebarItems = [
    { value: "overview", label: t('dashboard.overview'), icon: LayoutDashboard, show: true },
    { value: "tenders", label: t('dashboard.tenders'), icon: FileText, show: canManage },
    { value: "proposals", label: t('dashboard.proposals'), icon: Inbox, show: true },
    { value: "vendors", label: t('dashboard.vendorsBase'), icon: Users, show: canManage },
  ];

  return (
    <>
    <SidebarProvider>
      <Sidebar collapsible="icon" side={isRtl ? "right" : "left"} className={isRtl ? "border-l border-gray-200 dark:border-gray-800" : "border-r border-gray-200 dark:border-gray-800"}>
        {/* Brand accent strip */}
        <div className="h-0.5 bg-gradient-to-r from-[#E8614D] to-[#F19A8F] flex-shrink-0" />
        <SidebarHeader className="border-b px-4 py-4">
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <SidebarLogoToggle />
            {companies.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex-1 min-w-0 group-data-[collapsible=icon]:hidden flex items-center gap-1 hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-sm truncate">
                        {activeCompany.profile?.displayName || activeCompany.name}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate">
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)} • {activeCompany.verificationStatus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </p>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? 'end' : 'start'} className="w-64">
                  {companies.map((company: any) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={async () => {
                        if (company.id !== activeCompany.id) {
                          try {
                            await switchCompany(company.id);
                            queryClient.invalidateQueries();
                            toast({ title: `Switched to ${company.name}` });
                          } catch {
                            toast({ title: "Failed to switch company", variant: "destructive" });
                          }
                        }
                      }}
                      className={`flex items-center gap-3 py-2 ${company.id === activeCompany.id ? 'bg-primary/5' : ''}`}
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-medium text-xs flex-shrink-0">
                        {(company.profile?.displayName || company.name).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{company.profile?.displayName || company.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{company.role}</p>
                      </div>
                      {company.id === activeCompany.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className={`flex-1 min-w-0 group-data-[collapsible=icon]:hidden ${isRtl ? 'text-right' : ''}`}>
                <h2 className="font-semibold text-sm truncate">
                  {activeCompany.profile?.displayName || activeCompany.name}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)} • {activeCompany.verificationStatus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </p>
              </div>
            )}
            <SidebarTrigger className={`${isRtl ? 'mr-auto' : 'ml-auto'} flex-shrink-0 group-data-[collapsible=icon]:hidden`} />
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          {/* Action Items - Create & Search */}
          {canManage && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setLocation("/tenders/new")}
                      tooltip={t('dashboard.createTender')}
                      data-testid="sidebar-create-tender"
                      data-tour="create-tender"
                      className="py-3 text-base rounded-lg bg-[#E8614D] text-white hover:bg-[#D44D3A] hover:text-white"
                    >
                      <Plus className="h-5 w-5 text-white" />
                      <span className="text-base font-medium group-data-[collapsible=icon]:hidden text-white">{t('dashboard.createTender')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setShowSearchModal(true)}
                      tooltip={t('dashboard.searchTenders')}
                      data-testid="sidebar-search-tenders"
                      className="py-3 text-base rounded-lg hover:bg-muted"
                    >
                      <Search className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{t('dashboard.searchTenders')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Navigation Items */}
          <SidebarGroup data-tour="sidebar-nav">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {sidebarItems.filter(item => item.show).map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.value}
                      onClick={() => setActiveTab(item.value)}
                      tooltip={item.label}
                      data-testid={`sidebar-${item.value}`}
                      className={`py-3 text-base rounded-lg ${activeTab === item.value ? "bg-[#E8614D]/15 text-[#E8614D] hover:bg-[#E8614D]/20 hover:text-[#E8614D]" : "hover:bg-muted"}`}
                    >
                      <item.icon className={`h-5 w-5 ${activeTab === item.value ? "text-[#E8614D]" : "text-muted-foreground"}`} />
                      <span className={`text-base font-medium ${activeTab === item.value ? "text-[#E8614D]" : ""}`}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <ChatHistorySidebar />
        </SidebarContent>

        <SidebarFooter className="border-t px-4 py-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-3 w-full hover:bg-accent rounded-md p-1 -m-1 transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`} data-testid="button-user-menu" data-tour="user-menu">
                <div className="relative flex-shrink-0">
                  {user.profilePictureUrl ? (
                    <img 
                      src={user.profilePictureUrl} 
                      alt={user.name || user.username}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#C96B7E] flex items-center justify-center text-white text-sm font-medium">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {activeCompany.verificationStatus === 'verified' ? (
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white dark:border-gray-800"
                      title={t('dashboard.verified')}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div 
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-500 flex items-center justify-center"
                      title={t('dashboard.verificationPending')}
                    >
                      <Clock className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium truncate group-data-[collapsible=icon]:hidden">
                  {user.name || user.username}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align={isRtl ? "end" : "start"} className="w-72 mb-2 p-0">
              {/* User Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  {user.profilePictureUrl ? (
                    <img 
                      src={user.profilePictureUrl} 
                      alt={user.name || user.username}
                      className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[#4B5563] flex items-center justify-center text-white text-lg font-medium flex-shrink-0">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1) : user.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{user.name || user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                      data-testid="menu-notifications"
                    >
                      <div className="relative">
                        <Bell className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        {incomingOffers.filter(o => o.status === 'pending' && !o.isViewed).length > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {incomingOffers.filter(o => o.status === 'pending' && !o.isViewed).length}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-left flex-1">{t('settings.notifications')}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-72 p-0">
                    <div className="p-3 border-b">
                      <p className="font-medium text-sm">{t('settings.notifications')}</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {incomingOffers.filter(o => o.status === 'pending').length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {t('settings.noNotifications')}
                        </div>
                      ) : (
                        incomingOffers.filter(o => o.status === 'pending').slice(0, 5).map((offer) => (
                          <button
                            key={offer.id}
                            onClick={() => {
                              setActiveTab('proposals');
                              setSelectedProposal(offer);
                              if (!offer.isViewed) {
                                markOfferViewed.mutate(offer.id);
                              }
                            }}
                            className={`w-full flex items-start gap-3 p-3 transition-colors text-left border-b last:border-b-0 ${
                              offer.isViewed 
                                ? 'hover:bg-accent opacity-60' 
                                : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 font-medium'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              offer.isViewed 
                                ? 'bg-blue-100 dark:bg-blue-900/30' 
                                : 'bg-blue-200 dark:bg-blue-800/50'
                            }`}>
                              <FileText className={`h-4 w-4 ${offer.isViewed ? 'text-blue-600 dark:text-blue-400' : 'text-blue-700 dark:text-blue-300'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${offer.isViewed ? '' : 'font-semibold'}`}>{t('settings.newProposal')}</p>
                              <p className={`text-xs truncate ${offer.isViewed ? 'text-muted-foreground' : 'text-muted-foreground font-medium'}`}>{offer.tender?.title}</p>
                              <p className={`text-xs mt-0.5 ${offer.isViewed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {new Date(offer.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {incomingOffers.filter(o => o.status === 'pending' && !o.isViewed).length > 0 && (
                      <div className="p-2 border-t">
                        <button 
                          onClick={() => setActiveTab('proposals')}
                          className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline py-1"
                        >
                          {t('settings.viewAllNotifications')}
                        </button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                      data-testid="menu-help"
                    >
                      <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-left flex-1">{t('settings.helpCenter')}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-48 p-1">
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                      {t('settings.gettingStarted')}
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                      {t('settings.faqs')}
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                      {t('settings.contactSupport')}
                    </button>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                      data-testid="menu-language"
                    >
                      <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-left flex-1">{t('settings.language')}</span>
                      <span className="text-xs text-muted-foreground">{language === 'en' ? 'English' : 'العربية'}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-40 p-1">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        language === 'en' ? 'bg-accent font-medium' : 'hover:bg-accent'
                      }`}
                      data-testid="lang-english"
                    >
                      {language === 'en' && <Check className="h-4 w-4" />}
                      <span className={language !== 'en' ? 'ml-6' : ''}>English</span>
                    </button>
                    <button
                      onClick={() => setLanguage('ar')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        language === 'ar' ? 'bg-accent font-medium' : 'hover:bg-accent'
                      }`}
                      data-testid="lang-arabic"
                    >
                      {language === 'ar' && <Check className="h-4 w-4" />}
                      <span className={language !== 'ar' ? 'ml-6' : ''}>العربية</span>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Theme Section */}
              <div className="px-4 py-3 border-t">
                <p className="text-sm font-medium mb-3">{t('settings.theme')}</p>
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      document.documentElement.classList.remove('dark');
                      localStorage.setItem('theme', 'light');
                      setCurrentTheme('light');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm transition-colors ${
                      currentTheme === 'light'
                        ? 'bg-background shadow-sm font-medium' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="theme-light"
                  >
                    <Sun className="h-4 w-4" />
                    {t('settings.light')}
                  </button>
                  <button
                    onClick={() => {
                      document.documentElement.classList.add('dark');
                      localStorage.setItem('theme', 'dark');
                      setCurrentTheme('dark');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm transition-colors ${
                      currentTheme === 'dark'
                        ? 'bg-background shadow-sm font-medium' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="theme-dark"
                  >
                    <Moon className="h-4 w-4" />
                    {t('settings.dark')}
                  </button>
                  <button
                    onClick={() => {
                      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      if (prefersDark) {
                        document.documentElement.classList.add('dark');
                      } else {
                        document.documentElement.classList.remove('dark');
                      }
                      localStorage.setItem('theme', 'system');
                      setCurrentTheme('system');
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm transition-colors ${
                      currentTheme === 'system'
                        ? 'bg-background shadow-sm font-medium' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid="theme-system"
                  >
                    <Monitor className="h-4 w-4" />
                    {t('settings.system')}
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="py-2 border-t">
                <button 
                  onClick={() => setLocation('/settings')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                  data-testid="menu-settings"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{t('settings.settings')}</span>
                </button>

                <button 
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                  data-testid="button-logout"
                >
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{t('settings.logout')}</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Take a tour — only shown after dismissal */}
          {tourDismissed && (
            <button
              onClick={retakeTour}
              className={`mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-1 group-data-[collapsible=icon]:hidden ${isRtl ? 'flex-row-reverse' : ''}`}
              data-testid="button-retake-tour"
            >
              <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{isRtl ? 'جولة تعريفية' : 'Take a tour'}</span>
            </button>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Search Tenders Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <div className="p-6 border-b">
            <Input
              placeholder={t('dashboard.searchPlaceholder')}
              value={tenderSearchQuery}
              onChange={(e) => setTenderSearchQuery(e.target.value)}
              className="h-12 text-base rounded-lg"
              autoFocus
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredTenders.length > 0 ? (
              <div className="divide-y">
                {filteredTenders.map((tender) => (
                  <button
                    key={tender.id}
                    onClick={() => {
                      setShowSearchModal(false);
                      setTenderSearchQuery("");
                      setLocation(`/tenders/${tender.id}`);
                    }}
                    className="w-full text-left p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    data-testid={`search-tender-result-${tender.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base group-hover:text-[#E25E45] transition-colors">
                        {tender.title}
                      </h3>
                      <Badge 
                        className={`flex-shrink-0 text-xs font-medium ${getStatusBadge(tender.status).className}`}
                      >
                        {getStatusBadge(tender.status).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {tender.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                      <span>{formatDate(tender.deadline)}</span>
                      {tender.budget || tender.budgetRange ? (
                        <>
                          <span>•</span>
                          <span>{tender.budgetRange || tender.budget}</span>
                        </>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tenderSearchQuery
                      ? `${t('dashboard.noTendersFoundMatching')} "${tenderSearchQuery}"`
                      : t('dashboard.typeToSearch')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SidebarInset className="bg-gray-50 dark:bg-gray-900">
        {/* Main Content */}
        <main
          className="flex-1 overflow-auto p-6"
          style={{
            backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Dashboard Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-5">

            {/* ── Stat Cards Row ──────────────────────────────────────── */}
            {canManage && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-tour="dashboard-tabs">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm p-5"
                >
                  <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-[#E8614D] text-white flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className={isRtl ? 'text-right' : ''}>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {tenders.filter(tender => tender.status === 'published').length}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.activeRfps')}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm p-5"
                >
                  <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <Inbox className="h-5 w-5" />
                    </div>
                    <div className={isRtl ? 'text-right' : ''}>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {incomingOffers.filter(o => o.status === 'pending').length}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.pendingProposals')}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm p-5"
                >
                  <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className={isRtl ? 'text-right' : ''}>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {vendors.length}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.vendorsInBase')}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ── Ready to Negotiate Banner ───────────────────────────── */}
            {canManage && tendersReadyToNegotiate.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
                className="border-2 border-[#E25E45]/20 rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#FFF8F7',
                  backgroundImage: 'radial-gradient(circle, #e8c5be 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
                <div className="p-5">
                  <div className={`flex items-center gap-3 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="h-10 w-10 rounded-xl bg-[#E25E45]/10 border border-[#E25E45]/20 flex items-center justify-center flex-shrink-0">
                      <Handshake className="h-5 w-5 text-[#E25E45]" />
                    </div>
                    <div className={isRtl ? 'text-right' : ''}>
                      <h3 className="font-semibold text-gray-900">{t('dashboard.readyToNegotiateTitle')}</h3>
                      <p className="text-sm text-gray-500">
                        {t('dashboard.readyToNegotiateDesc').replace('{count}', String(tendersReadyToNegotiate.length))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {tendersReadyToNegotiate.slice(0, 3).map(tender => (
                      <div key={tender.id} className={`bg-white rounded-xl border border-[#E25E45]/10 p-3 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={isRtl ? 'text-right' : ''}>
                          <p className="font-medium text-sm text-gray-900">{tender.title}</p>
                          <p className="text-xs text-gray-500">
                            {t('dashboard.proposalsCount').replace('{count}', String(tender.offersCount))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#E25E45] hover:bg-[#d54d35] text-white flex-shrink-0"
                          onClick={() => setLocation(`/tenders/${tender.id}`)}
                        >
                          {t('dashboard.negotiateNowBtn')} →
                        </Button>
                      </div>
                    ))}
                    {tendersReadyToNegotiate.length > 3 && (
                      <p
                        className={`text-xs text-[#E25E45] cursor-pointer hover:underline ${isRtl ? 'text-right' : 'text-left'} px-1`}
                        onClick={() => setActiveTab('tenders')}
                      >
                        and {tendersReadyToNegotiate.length - 3} more →
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Demo Banner ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
              className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-[#E8614D] to-[#F19A8F]" />
              <div className={`flex items-center justify-between p-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="p-3 rounded-xl bg-[#E8614D]/10 flex-shrink-0">
                    <Play className="h-5 w-5 text-[#E8614D]" />
                  </div>
                  <div className={isRtl ? 'text-right' : ''}>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.bookDemoTitle')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.bookDemoDesc')}</p>
                  </div>
                </div>
                <Button
                  className="bg-[#E8614D] hover:bg-[#D44D3A] text-white flex-shrink-0"
                  data-testid="button-book-demo"
                >
                  {t('dashboard.bookDemo')}
                </Button>
              </div>
            </motion.div>

            {/* ── Main Grid ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Get Started Tasks — 2 cols */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
                  data-tour="onboarding-tasks"
                >
                  {/* Brand top strip */}
                  <div className="h-1 bg-gradient-to-r from-[#E8614D] to-[#F19A8F]" />

                  <div className="p-6">
                    <div className={`mb-5 ${isRtl ? 'text-right' : ''}`}>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard.getStartedTitle')}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.getStartedDesc')}</p>
                    </div>

                    {/* Animated progress bar */}
                    <div className="mb-6">
                      <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.min(onboardingTasks?.completedCount ?? 0, 5)} {t('tenderFlow.ofLabel')} 5 {t('dashboard.tasksComplete')}
                        </span>
                        <span className="text-sm font-bold text-[#E8614D]">
                          {Math.round((Math.min(onboardingTasks?.completedCount ?? 0, 5) / 5) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#E8614D] to-[#F19A8F]"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((Math.min(onboardingTasks?.completedCount ?? 0, 5) / 5) * 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Tasks */}
                    <Accordion type="single" collapsible className="space-y-3">

                      {/* Task 1: Create Tender */}
                      <AccordionItem value="task-1" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks?.hasTender ? 'border-[#E8614D] bg-[#E8614D]/5 dark:bg-[#E8614D]/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                        <AccordionTrigger className={`hover:no-underline py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasTender ? 'bg-[#E8614D] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasTender ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasTender ? 'text-[#E8614D]' : 'text-gray-900 dark:text-white'}`}>{t('dashboard.task1Title')}</span>
                            {onboardingTasks?.hasTender && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-3 w-3" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.task1Desc')}</p>
                              <Button
                                className="bg-[#E8614D] hover:bg-[#D44D3A] text-white"
                                onClick={() => setLocation('/tenders/new')}
                                data-testid="button-task-create-tender"
                              >
                                {t('dashboard.task1Action')}
                              </Button>
                            </div>
                            <div className={`hidden md:block w-56 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Sparkles className="h-3.5 w-3.5 text-[#E8614D]" />
                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{t('dashboard.task1Tip')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.task1TipDesc')}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 2: Complete Company Profile (only for owners/admins) */}
                      {canManage && (
                      <AccordionItem value="task-2" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks?.hasCompletedProfile ? 'border-[#E8614D] bg-[#E8614D]/5 dark:bg-[#E8614D]/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                        <AccordionTrigger className={`hover:no-underline py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasCompletedProfile ? 'bg-[#E8614D] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasCompletedProfile ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasCompletedProfile ? 'text-[#E8614D]' : 'text-gray-900 dark:text-white'}`}>{t('dashboard.task2Title')}</span>
                            {onboardingTasks?.hasCompletedProfile && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-3 w-3" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.task2Desc')}</p>
                              <Button
                                className="bg-[#E8614D] hover:bg-[#D44D3A] text-white"
                                onClick={() => setLocation('/company-onboarding')}
                                data-testid="button-task-complete-profile"
                              >
                                {t('dashboard.task2Action')}
                              </Button>
                            </div>
                            <div className={`hidden md:block w-56 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Sparkles className="h-3.5 w-3.5 text-[#E8614D]" />
                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{t('dashboard.task2Tip')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.task2TipDesc')}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 3: Upload Profile Picture */}
                      <AccordionItem value="task-3" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks?.hasProfilePicture ? 'border-[#E8614D] bg-[#E8614D]/5 dark:bg-[#E8614D]/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                        <AccordionTrigger className={`hover:no-underline py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasProfilePicture ? 'bg-[#E8614D] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasProfilePicture ? <Check className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasProfilePicture ? 'text-[#E8614D]' : 'text-gray-900 dark:text-white'}`}>{t('dashboard.task3Title')}</span>
                            {onboardingTasks?.hasProfilePicture ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-3 w-3" />{t('dashboard.completed')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 flex-shrink-0">
                                {t('dashboard.optional')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.task3Desc')}</p>
                              <Button
                                className="bg-[#E8614D] hover:bg-[#D44D3A] text-white"
                                onClick={() => setLocation('/settings')}
                                data-testid="button-task-upload-photo"
                              >
                                {t('dashboard.task3Action')}
                              </Button>
                            </div>
                            <div className={`hidden md:block w-56 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Sparkles className="h-3.5 w-3.5 text-[#E8614D]" />
                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{t('dashboard.task3Tip')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.task3TipDesc')}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 4: Invite Vendors */}
                      <AccordionItem value="task-4" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks?.hasVendors ? 'border-[#E8614D] bg-[#E8614D]/5 dark:bg-[#E8614D]/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                        <AccordionTrigger className={`hover:no-underline py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasVendors ? 'bg-[#E8614D] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasVendors ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasVendors ? 'text-[#E8614D]' : 'text-gray-900 dark:text-white'}`}>{t('dashboard.task4Title')}</span>
                            {onboardingTasks?.hasVendors && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-3 w-3" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.task4Desc')}</p>
                              <Button
                                className="bg-[#E8614D] hover:bg-[#D44D3A] text-white"
                                onClick={() => setActiveTab('vendors')}
                                data-testid="button-task-share-link"
                              >
                                {t('dashboard.task4Action')}
                              </Button>
                            </div>
                            <div className={`hidden md:block w-56 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Sparkles className="h-3.5 w-3.5 text-[#E8614D]" />
                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{t('dashboard.task4Tip')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.task4TipDesc')}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 5: Review Proposals */}
                      <AccordionItem value="task-5" className={`border-2 rounded-xl px-4 transition-all duration-300 ${onboardingTasks?.hasReviewedProposal ? 'border-[#E8614D] bg-[#E8614D]/5 dark:bg-[#E8614D]/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                        <AccordionTrigger className={`hover:no-underline py-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasReviewedProposal ? 'bg-[#E8614D] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasReviewedProposal ? <Check className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasReviewedProposal ? 'text-[#E8614D]' : 'text-gray-900 dark:text-white'}`}>{t('dashboard.task5Title')}</span>
                            {onboardingTasks?.hasReviewedProposal && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-3 w-3" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.task5Desc')}</p>
                              <Button
                                className="bg-[#E8614D] hover:bg-[#D44D3A] text-white"
                                onClick={() => setActiveTab('proposals')}
                                data-testid="button-task-view-proposals"
                              >
                                {t('dashboard.task5Action')}
                              </Button>
                            </div>
                            <div className={`hidden md:block w-56 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Sparkles className="h-3.5 w-3.5 text-[#E8614D]" />
                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{t('dashboard.task5Tip')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.task5TipDesc')}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                    </Accordion>
                  </div>
                </motion.div>
              </div>

              {/* Right column — Info Cards */}
              <div className="lg:col-span-1 space-y-4">

                {/* Company Status */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                >
                  <div className={`h-1 rounded-t-2xl bg-gradient-to-r from-[#E8614D] to-[#F19A8F] transition-opacity duration-300 ${activeCompany.verificationStatus === 'verified' ? 'opacity-100' : 'opacity-30'}`} />
                  <div className="p-5">
                    <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`p-3 rounded-xl flex-shrink-0 transition-all duration-300 ${activeCompany.verificationStatus === 'verified' ? 'bg-[#E8614D] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {activeCompany.verificationStatus === 'verified'
                          ? <ShieldCheck className="h-5 w-5" />
                          : <Clock className="h-5 w-5" />
                        }
                      </div>
                      <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{t('dashboard.companyStatus')}</p>
                        <p className={`text-base font-bold truncate ${activeCompany.verificationStatus === 'verified' ? 'text-[#E8614D]' : 'text-gray-900 dark:text-white'}`}>
                          {activeCompany.verificationStatus === 'verified'
                            ? t('dashboard.verified')
                            : activeCompany.verificationStatus === 'under_review' ? 'Under Review' : activeCompany.verificationStatus
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Latest Proposals */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                >
                  <div className="h-1 bg-gradient-to-r from-[#E8614D] to-[#F19A8F] opacity-50" />
                  <div className="p-5">
                    <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <Inbox className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('dashboard.recentActivity')}</h3>
                      </div>
                      {(incomingOffers.length > 0 || myOffers.length > 0) && (
                        <button
                          onClick={() => setActiveTab('proposals')}
                          className="text-xs font-medium text-[#E8614D] hover:underline"
                        >
                          {t('dashboard.viewAll')}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {incomingOffers.slice(0, 3).map((offer) => (
                        <button
                          key={offer.id}
                          onClick={() => {
                            setSelectedProposal(offer);
                            if (!offer.isViewed) markOfferViewed.mutate(offer.id);
                          }}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                            !offer.isViewed && offer.status === 'pending'
                              ? 'border-[#E8614D] bg-[#E8614D]/5'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-xs font-semibold truncate text-gray-900 dark:text-white">{offer.company.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{offer.tender.title}</p>
                            </div>
                            {!offer.isViewed && offer.status === 'pending' && (
                              <div className="h-2 w-2 bg-[#E8614D] rounded-full flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                      {myOffers.slice(0, 2).map((offer) => (
                        <div
                          key={offer.id}
                          className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30"
                        >
                          <div className={`flex items-start justify-between gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-xs font-semibold truncate text-gray-900 dark:text-white">{offer.tender.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t(`dashboard.${offer.status}`)}</p>
                            </div>
                            {offer.status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 flex-shrink-0">Pending</span>
                            )}
                            {offer.status === 'accepted' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">Accepted</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {incomingOffers.length === 0 && myOffers.length === 0 && (
                        <div className="text-center py-6">
                          <Inbox className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.noProposals')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.35, ease: "easeOut" }}
                  className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                >
                  <div className="h-1 bg-gradient-to-r from-[#E8614D] to-[#F19A8F]" />
                  <div className="p-5">
                    <div className={`flex items-center gap-2 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="p-2 rounded-lg bg-[#E8614D]/10">
                        <Sparkles className="h-4 w-4 text-[#E8614D]" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('dashboard.quickActions')}</h3>
                    </div>
                    <div className="space-y-2">
                      {canManage && (
                        <Button
                          variant="outline"
                          className="w-full justify-start h-10 border-2 border-gray-200 dark:border-gray-700 hover:border-[#E8614D] hover:text-[#E8614D] hover:bg-[#E8614D]/5 transition-all duration-200"
                          onClick={() => setLocation('/tenders/new')}
                          data-testid="button-create-tender"
                        >
                          <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                          {t('dashboard.createTender')}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full justify-start h-10 border-2 border-gray-200 dark:border-gray-700 hover:border-[#E8614D] hover:text-[#E8614D] hover:bg-[#E8614D]/5 transition-all duration-200"
                        onClick={() => setShowCompanyProfileDialog(true)}
                        data-testid="button-view-profile"
                      >
                        <Building2 className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('dashboard.viewProfile')}
                      </Button>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </TabsContent>

          {/* Tenders Tab */}
          {canManage && (
            <TabsContent value="tenders" className="space-y-6">
              {/* Header */}
              <div className={`flex justify-between items-start ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={isRtl ? 'text-right' : ''}>
                  <h2 className="text-2xl font-bold" data-testid="text-tenders-title">{t('dashboard.tendersTitle')}</h2>
                  <p className="text-muted-foreground" data-testid="text-tenders-description">
                    {t('dashboard.tendersDesc')}
                  </p>
                </div>
                <ParticleButton 
                  onSuccess={() => setLocation('/tenders/new')}
                  successDuration={600}
                  particleColor="bg-blue-400"
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-tender-header"
                >
                  <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                  {t('dashboard.newTender')}
                </ParticleButton>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className={`flex flex-col sm:flex-row gap-4 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
                    <div className="relative flex-1">
                      <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                      <Input
                        placeholder={t('dashboard.searchTenders')}
                        value={tenderSearchQuery}
                        onChange={(e) => setTenderSearchQuery(e.target.value)}
                        className={isRtl ? 'pr-10 text-right' : 'pl-10'}
                        data-testid="input-tender-search"
                      />
                    </div>
                    <Tabs value={tenderFilter} onValueChange={(v) => setTenderFilter(v as any)} className="w-full sm:w-auto">
                      <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                        <TabsTrigger value="all" data-testid="filter-all">{t('dashboard.all')}</TabsTrigger>
                        <TabsTrigger value="published" data-testid="filter-published">{t('dashboard.published')}</TabsTrigger>
                        <TabsTrigger value="draft" data-testid="filter-draft">{t('dashboard.draft')}</TabsTrigger>
                        <TabsTrigger value="closed" data-testid="filter-closed">{t('dashboard.closed')}</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              {/* Tenders List */}
              {loadingTenders ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTenders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2" data-testid="text-no-tenders-title">
                      {t('dashboard.noTenders')}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6" data-testid="text-no-tenders-description">
                      {t('dashboard.noTendersDesc')}
                    </p>
                    {!tenderSearchQuery && tenderFilter === 'all' && (
                      <Button 
                        onClick={() => setLocation('/tenders/new')}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-create-first-tender"
                      >
                        <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('dashboard.createTender')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div ref={tendersScrollRef} className="relative w-full h-[600px] border rounded-lg">
                  <ScrollArea
                    className="h-full"
                    onScrollCapture={() => checkBlur(tendersScrollRef, setShowTendersBlur)}
                  >
                    <div className="space-y-4 p-4">
                      {filteredTenders.map((tender) => {
                        const statusBadge = getStatusBadge(tender.status);
                        const isDeadlineSoon = new Date(tender.deadline).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                        const isReadyToNegotiate = tender.status === 'closed' && tender.offersCount >= 2 && !incomingOffers.some(o => o.tenderId === tender.id && o.status === 'accepted');
                        const getSpotlightColor = (status: string): 'blue' | 'purple' | 'green' | 'red' | 'orange' => {
                          switch (status) {
                            case 'published': return 'green';
                            case 'draft': return 'purple';
                            case 'closed': return 'orange';
                            case 'cancelled': return 'red';
                            default: return 'blue';
                          }
                        };
                        
                        return (
                          <SpotlightCard 
                            key={tender.id} 
                            className="bg-white border-neutral-200"
                            spotlightColor={getSpotlightColor(tender.status)}
                            data-testid={`card-tender-${tender.id}`}
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 
                                      className="text-xl font-bold text-neutral-900 cursor-pointer hover:text-blue-600"
                                      onClick={() => setLocation(`/tenders/${tender.id}`)}
                                      data-testid={`text-tender-title-${tender.id}`}
                                    >
                                      {tender.title}
                                    </h3>
                                    <Badge className={statusBadge.className} data-testid={`badge-status-${tender.id}`}>
                                      {statusBadge.label}
                                    </Badge>
                                    {isReadyToNegotiate && (
                                      <span className="text-[9px] font-bold bg-[#E25E45] text-white px-2 py-0.5 rounded-full animate-pulse">
                                        {t('dashboard.negotiateBadge')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-neutral-600 line-clamp-2" data-testid={`text-tender-description-${tender.id}`}>
                                    {tender.description}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                                <div className={`flex items-center gap-2 text-neutral-700 font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Calendar className="h-4 w-4" />
                                  <span className={isDeadlineSoon ? 'text-red-600 font-semibold' : ''}>
                                    {formatDate(tender.deadline)}
                                  </span>
                                </div>
                                <div className={`flex items-center gap-2 text-neutral-700 font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Send className="h-4 w-4" />
                                  <span data-testid={`text-proposals-count-${tender.id}`}>
                                    {tender.offersCount} {t('dashboard.offers')}
                                  </span>
                                </div>
                                {tender.submissionType && (
                                <div className={`flex items-center gap-2 text-neutral-700 font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <FileText className="h-4 w-4" />
                                  <span>{SUBMISSION_TYPE_LABELS_DASH[tender.submissionType] || tender.submissionType}</span>
                                </div>
                                )}
                                <div className={`flex items-center gap-2 text-neutral-700 font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <FileText className="h-4 w-4" />
                                  <span>{tender.budgetRange || tender.budget || t('dashboard.budget')}</span>
                                </div>
                              </div>
                              
                              <div className={`flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/tenders/${tender.id}`)}
                                  data-testid={`button-view-${tender.id}`}
                                >
                                  <Eye className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                  {t('dashboard.view')}
                                </Button>
                                <AnimatedCopyButton
                                  text={`${window.location.origin}/invite/${tender.id}`}
                                  isRtl={isRtl}
                                  data-testid={`button-copy-link-${tender.id}`}
                                >
                                  {t('dashboard.copyLink')}
                                </AnimatedCopyButton>
                                {['draft', 'published'].includes(tender.status) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setLocation(`/tenders/${tender.id}/edit`)}
                                    data-testid={`button-edit-${tender.id}`}
                                  >
                                    <Edit className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                    {t('dashboard.edit')}
                                  </Button>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm(t('dashboard.deleteConfirm'))) {
                                      deleteTender.mutate(tender.id);
                                    }
                                  }}
                                  disabled={deleteTender.isPending}
                                  data-testid={`button-delete-${tender.id}`}
                                >
                                  <Trash2 className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                  {t('dashboard.delete')}
                                </Button>
                              </div>
                            </div>
                          </SpotlightCard>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <motion.div animate={{ opacity: showTendersBlur ? 1 : 0 }} transition={{ duration: 0.3 }}>
                    <ProgressiveBlur position="bottom" height="21%" />
                  </motion.div>
                </div>
              )}
            </TabsContent>
          )}

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className={`mb-4 ${isRtl ? 'text-right' : ''}`}>
              <h2 className="text-2xl font-bold" data-testid="text-proposals-title">{t('dashboard.proposalsTitle')}</h2>
              <p className="text-muted-foreground" data-testid="text-proposals-description">
                {t('dashboard.proposalsDesc')}
              </p>
            </div>

            <Tabs defaultValue="submitted" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="submitted" className="gap-2" data-testid="tab-submitted-proposals">
                  <Send className="h-4 w-4" />
                  {t('dashboard.myProposals')} ({myOffers.length})
                </TabsTrigger>
                <TabsTrigger value="received" className="gap-2" data-testid="tab-received-proposals">
                  <Inbox className="h-4 w-4" />
                  {t('dashboard.incomingOffers')} ({incomingOffers.length})
                </TabsTrigger>
              </TabsList>

              {/* Submitted Proposals Sub-Tab */}
              <TabsContent value="submitted" className="space-y-4">
                {loadingMyOffers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : myOffers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Send className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">{t('dashboard.noProposals')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('dashboard.noProposalsDesc')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div ref={sentScrollRef} className="relative w-full h-[600px] border rounded-lg">
                    <ScrollArea
                      className="h-full"
                      onScrollCapture={() => checkBlur(sentScrollRef, setShowSentBlur)}
                    >
                      <div className="space-y-4 p-4">
                        {myOffers.map((offer) => {
                          const isExpired = new Date(offer.tender.deadline) < new Date();
                          const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                        <Card 
                          key={offer.id} 
                          className={`border ${
                            offer.status === 'accepted' 
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                              : offer.status === 'rejected' 
                                ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 opacity-60' 
                                : ''
                          }`} 
                          data-testid={`card-my-offer-${offer.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 
                                    className="font-medium cursor-pointer hover:text-primary"
                                    onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  >
                                    {offer.tender.title}
                                  </h4>
                                  <Badge 
                                    className={
                                      offer.tender.status === 'published' 
                                        ? 'bg-green-100 text-green-800' 
                                        : offer.tender.status === 'closed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }
                                  >
                                    {offer.tender.status.charAt(0).toUpperCase() + offer.tender.status.slice(1)}
                                  </Badge>
                                  {offer.status === 'accepted' && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.accepted')}
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                      <XCircle className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.rejected')}
                                    </Badge>
                                  )}
                                  {offer.status === 'pending' && (
                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                      <Clock className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.pending')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {offer.tender.description || t('dashboard.noDescription')}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('dashboard.submitted')} {new Date(offer.submittedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    {isExpired ? t('dashboard.deadlinePassed') : `${daysRemaining} ${t('dashboard.daysLeft')}`}
                                  </span>
                                </div>
                                {offer.notes && (
                                  <p className="text-sm mt-2 text-muted-foreground italic">"{offer.notes}"</p>
                                )}
                              </div>
                              <div className={`flex gap-2 flex-wrap ${isRtl ? 'mr-4' : 'ml-4'}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  data-testid={`button-view-tender-${offer.id}`}
                                >
                                  <Eye className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                  {t('dashboard.viewTender')}
                                </Button>
                                {offer.combinedFileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)}
                                    title={t('dashboard.combinedProposal')}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                                {offer.technicalFileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)}
                                    title={t('dashboard.technicalProposal')}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                                {offer.financialFileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                    title={t('dashboard.financialProposal')}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                                {offer.videoUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(offer.videoUrl!, '_blank')}
                                    title={t('dashboard.videoPitchLabel')}
                                  >
                                    <Video className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <motion.div animate={{ opacity: showSentBlur ? 1 : 0 }} transition={{ duration: 0.3 }}>
                      <ProgressiveBlur position="bottom" height="21%" />
                    </motion.div>
                  </div>
                )}
              </TabsContent>

              {/* Received Proposals Sub-Tab */}
              <TabsContent value="received" className="space-y-4">
                {loadingIncomingOffers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : incomingOffers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">{t('dashboard.noIncomingOffers')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('dashboard.noIncomingOffersDesc')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div ref={receivedScrollRef} className="relative w-full h-[600px] border rounded-lg">
                    <ScrollArea
                      className="h-full"
                      onScrollCapture={() => checkBlur(receivedScrollRef, setShowReceivedBlur)}
                    >
                      <div className="space-y-4 p-4">
                        {incomingOffers.map((offer) => {
                      const isExpired = new Date(offer.tender.deadline) < new Date();
                      const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Card 
                          key={offer.id} 
                          className={`border ${
                            offer.status === 'accepted' 
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20' 
                              : offer.status === 'rejected' 
                                ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 opacity-60' 
                                : ''
                          }`} 
                          data-testid={`card-incoming-offer-${offer.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-medium">
                                    {offer.profile?.displayName || offer.company.name}
                                  </h4>
                                  {offer.company.verificationStatus === 'verified' && (
                                    <Badge variant="secondary" className="text-xs">{t('dashboard.verified')}</Badge>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.accepted')}
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                      <XCircle className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.rejected')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {t('dashboard.forTender')} <span
                                    className="cursor-pointer hover:text-primary font-medium"
                                    onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  >
                                    {offer.tender.title}
                                  </span>
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('dashboard.received')} {new Date(offer.submittedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    {isExpired ? t('dashboard.deadlinePassed') : `${daysRemaining} ${t('dashboard.daysLeft')}`}
                                  </span>
                                  {offer.company.category && (
                                    <span className="text-muted-foreground">
                                      {offer.company.category}
                                    </span>
                                  )}
                                </div>
                                {offer.quotePrice && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-sm font-semibold text-emerald-700">SAR {offer.quotePrice.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground ml-1">({t('dashboard.priceQuote')})</span>
                                  </div>
                                )}
                                {offer.notes && (
                                  <p className="text-sm mt-2 text-muted-foreground italic">"{offer.notes}"</p>
                                )}
                              </div>
                              <div className={`grid grid-cols-2 gap-2 ${isRtl ? 'mr-4' : 'ml-4'} flex-shrink-0`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={!(offer.combinedFileUrl || offer.technicalFileUrl || offer.financialFileUrl || offer.videoUrl) ? 'col-span-2' : ''}
                                  onClick={() => setSelectedProposal(offer)}
                                  data-testid={`button-view-offer-${offer.id}`}
                                >
                                  <Eye className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                  {t('dashboard.view')}
                                </Button>
                                {offer.combinedFileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)}
                                    title={t('dashboard.combinedProposalLabel')}
                                  >
                                    <FileText className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                    {t('dashboard.proposalLabel')}
                                  </Button>
                                )}
                                {offer.technicalFileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.technicalFileUrl!)}
                                    title={t('dashboard.technicalProposal')}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                                {offer.financialFileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                    title={t('dashboard.financialProposal')}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                                {offer.videoUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(offer.videoUrl!, '_blank')}
                                    title={t('dashboard.videoPitchLabel')}
                                  >
                                    <Video className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="col-span-2 bg-[#E25E45] hover:bg-[#d54d35] text-white"
                                  onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  data-testid={`button-review-tender-${offer.id}`}
                                >
                                  <ExternalLink className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                  {t('dashboard.viewTender')}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        );
                        })}
                      </div>
                    </ScrollArea>
                    <motion.div animate={{ opacity: showReceivedBlur ? 1 : 0 }} transition={{ duration: 0.3 }}>
                      <ProgressiveBlur position="bottom" height="21%" />
                    </motion.div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Vendors Base Tab */}
          {canManage && (
            <TabsContent value="vendors" className="space-y-6">
              <div className={`mb-4 ${isRtl ? 'text-right' : ''}`}>
                <h2 className="text-2xl font-bold" data-testid="text-vendors-title">{t('dashboard.vendorsBaseTitle')}</h2>
                <p className="text-muted-foreground" data-testid="text-vendors-description">
                  {t('dashboard.vendorsBaseDesc')}
                </p>
              </div>

              <Tabs defaultValue="vendors-list" className="space-y-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="vendors-list" className="gap-2" data-testid="tab-vendors-list">
                    <Users className="h-4 w-4" />
                    {t('dashboard.vendorsBase')} ({vendors.length})
                  </TabsTrigger>
                  <TabsTrigger value="join-requests" className="gap-2" data-testid="tab-join-requests">
                    <UserPlus className="h-4 w-4" />
                    {t('dashboard.pendingRequests')}
                    {pendingRequests.length > 0 && (
                      <Badge variant="destructive" className={isRtl ? 'mr-2' : 'ml-2'} data-testid="badge-pending-count">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Vendors List Sub-Tab */}
                <TabsContent value="vendors-list" className="space-y-4">
                  {/* Search */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="relative">
                        <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                        <Input
                          placeholder={t('dashboard.searchVendors')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={isRtl ? 'pr-10 text-right' : 'pl-10'}
                          data-testid="input-vendor-search"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vendor Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Filter className="h-4 w-4" />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[160px] h-9" data-testid="filter-category">
                        <SelectValue placeholder={t('dashboard.allCategories')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dashboard.allCategories')}</SelectItem>
                        {uniqueCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-[160px] h-9" data-testid="filter-city">
                        <SelectValue placeholder={t('dashboard.allCities')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dashboard.allCities')}</SelectItem>
                        {uniqueCities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                      <SelectTrigger className="w-[160px] h-9" data-testid="filter-verification">
                        <SelectValue placeholder={t('dashboard.allStatuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dashboard.allStatuses')}</SelectItem>
                        <SelectItem value="verified">{t('dashboard.verified')}</SelectItem>
                        <SelectItem value="unverified">{t('dashboard.unverified')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setCategoryFilter('all');
                          setCityFilter('all');
                          setVerificationFilter('all');
                        }}
                        data-testid="button-clear-filters"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        {t('dashboard.clearFilters')}
                      </Button>
                    )}
                  </div>

                  {/* Active Filter Badges */}
                  <AnimatePresence>
                    {activeFilterCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {categoryFilter !== 'all' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {t('dashboard.filterByCategory')}: {categoryFilter}
                              <button
                                onClick={() => setCategoryFilter('all')}
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                                data-testid="badge-remove-category"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        )}
                        {cityFilter !== 'all' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {t('dashboard.filterByCity')}: {cityFilter}
                              <button
                                onClick={() => setCityFilter('all')}
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                                data-testid="badge-remove-city"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        )}
                        {verificationFilter !== 'all' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge variant="secondary" className="gap-1 pr-1">
                              {t('dashboard.filterByStatus')}: {t(`dashboard.${verificationFilter}`)}
                              <button
                                onClick={() => setVerificationFilter('all')}
                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                                data-testid="badge-remove-verification"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Vendors List */}
                  {loadingVendors ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredVendors.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Users className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-vendors-title">
                          {t('dashboard.noVendors')}
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md" data-testid="text-empty-vendors-description">
                          {t('dashboard.noVendorsDesc')}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredVendors.map((vendor) => (
                        <Card key={vendor.id} className="hover:shadow-lg transition-shadow" data-testid={`card-vendor-${vendor.id}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CardTitle className="text-xl" data-testid={`text-vendor-name-${vendor.id}`}>
                                      {vendor.company}
                                    </CardTitle>
                                    {vendor.verificationStatus === 'verified' && (
                                      <Badge variant="secondary" className="gap-1" data-testid={`badge-verified-${vendor.id}`}>
                                        <CheckCircle className="h-3 w-3" />
                                        {t('dashboard.verified')}
                                      </Badge>
                                    )}
                                  </div>
                                  <CardDescription data-testid={`text-vendor-category-${vendor.id}`}>
                                    {vendor.category}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={vendor.joinMethod === 'invitation' ? 'default' : 'outline'}
                                  data-testid={`badge-join-method-${vendor.id}`}
                                >
                                  {vendor.joinMethod === 'invitation' ? t('dashboard.invitedMethod') : vendor.joinMethod === 'proposal_accepted' ? t('dashboard.viaProposal') : t('dashboard.appliedViaTraction')}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedVendor(vendor)}
                                  data-testid={`button-view-vendor-${vendor.id}`}
                                >
                                  <Eye className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                  {t('dashboard.view')}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {vendor.bio && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-vendor-bio-${vendor.id}`}>
                                {vendor.bio}
                              </p>
                            )}
                            {vendor.city && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>{vendor.city}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Join Requests Sub-Tab */}
                <TabsContent value="join-requests" className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <UserPlus className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground" data-testid="text-no-requests">
                          {t('dashboard.noPendingRequests')}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardHeader className={isRtl ? 'text-right' : ''}>
                        <CardTitle className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`} data-testid="text-pending-title">
                          <UserPlus className="h-5 w-5" />
                          {t('dashboard.pendingRequests')} ({pendingRequests.length})
                        </CardTitle>
                        <CardDescription>
                          {t('dashboard.vendorsBaseDesc')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {pendingRequests.map((request) => (
                          <Card key={request.id} className="border-primary/20" data-testid={`card-request-${request.id}`}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <CardTitle className="text-lg" data-testid={`text-request-company-${request.id}`}>
                                      {request.vendor?.company || t('dashboard.unknownVendor')}
                                    </CardTitle>
                                    <Badge 
                                      variant={
                                        request.vendor?.verificationStatus === 'verified' ? 'default' :
                                        request.vendor?.verificationStatus === 'under_review' ? 'secondary' :
                                        'outline'
                                      }
                                      className={
                                        request.vendor?.verificationStatus === 'verified' 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : request.vendor?.verificationStatus === 'under_review'
                                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                          : 'bg-gray-100 text-gray-800 border-gray-200'
                                      }
                                      data-testid={`badge-request-status-${request.id}`}
                                    >
                                      {request.vendor?.verificationStatus === 'verified' && <ShieldCheck className="h-3 w-3 mr-1" />}
                                      {request.vendor?.verificationStatus === 'under_review' && <Clock className="h-3 w-3 mr-1" />}
                                      {request.vendor?.verificationStatus === 'verified' ? t('dashboard.verifiedStatus') :
                                       request.vendor?.verificationStatus === 'under_review' ? t('dashboard.underReviewStatus') :
                                       t('dashboard.notVerifiedStatus')}
                                    </Badge>
                                  </div>
                                  <CardDescription data-testid={`text-request-category-${request.id}`}>
                                    {request.vendor?.expertise || t('dashboard.noCategory')}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedRequest(request)}
                                        data-testid={`button-review-${request.id}`}
                                      >
                                        {t('dashboard.view')}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent data-testid="dialog-review">
                                      <DialogHeader>
                                        <DialogTitle data-testid="text-dialog-title">
                                          {t('dashboard.reviewApplication')} {selectedRequest?.vendor?.company || t('dashboard.unknownVendor')}
                                        </DialogTitle>
                                        <DialogDescription>
                                          {t('dashboard.reviewApplicationDesc')}
                                        </DialogDescription>
                                      </DialogHeader>
                                      {selectedRequest && (
                                        <div className="space-y-4">
                                          <div className="grid gap-3">
                                            <div>
                                              <label className="text-sm font-medium">{t('dashboard.companyNameLabel')}</label>
                                              <p className="text-sm text-muted-foreground" data-testid="text-dialog-company">
                                                {selectedRequest.vendor?.company || t('dashboard.unknownVendor')}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium">{t('dashboard.contactPersonLabel')}</label>
                                              <p className="text-sm text-muted-foreground" data-testid="text-dialog-contact">
                                                {selectedRequest.vendor?.name || t('dashboard.unknownVendor')}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium">{t('dashboard.emailLabel')}</label>
                                              <p className="text-sm text-muted-foreground" data-testid="text-dialog-email">
                                                {selectedRequest.vendor?.email || t('dashboard.unknownVendor')}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium">{t('dashboard.expertiseLabel')}</label>
                                              <p className="text-sm text-muted-foreground" data-testid="text-dialog-expertise">
                                                {selectedRequest.vendor?.expertise || t('auth.notSpecified')}
                                              </p>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium">{t('dashboard.verificationStatusLabel')}</label>
                                              <Badge variant={selectedRequest.vendor?.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                                                {selectedRequest.vendor?.verificationStatus || 'unknown'}
                                              </Badge>
                                            </div>
                                          </div>
                                          <div className={`flex gap-3 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                            <Button
                                              onClick={() => approveRequest.mutate(selectedRequest.id)}
                                              disabled={approveRequest.isPending || rejectRequest.isPending}
                                              className="flex-1"
                                              data-testid="button-approve"
                                            >
                                              {approveRequest.isPending ? (
                                                <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                              ) : (
                                                <CheckCircle className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                              )}
                                              {t('dashboard.approve')}
                                            </Button>
                                            <Button
                                              onClick={() => rejectRequest.mutate(selectedRequest.id)}
                                              disabled={approveRequest.isPending || rejectRequest.isPending}
                                              variant="destructive"
                                              className="flex-1"
                                              data-testid="button-reject"
                                            >
                                              {rejectRequest.isPending ? (
                                                <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                              ) : (
                                                <XCircle className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                              )}
                                              {t('dashboard.reject')}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span data-testid={`text-request-email-${request.id}`}>{request.vendor?.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                                  <span data-testid={`text-request-name-${request.id}`}>{request.vendor?.name || 'N/A'}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
          </Tabs>
        </main>

      {/* Proposal Details Modal */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedProposal?.profile?.displayName || selectedProposal?.company.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProposal?.company.category || t('dashboard.noCategory')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProposal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.companyNameLabel')}</h4>
                  <p className="text-sm">{selectedProposal.company.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.categoryLabel')}</h4>
                  <p className="text-sm">{selectedProposal.company.category || t('auth.notSpecified')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.verificationStatusLabel')}</h4>
                  <Badge variant={selectedProposal.company.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                    {selectedProposal.company.verificationStatus === 'verified' ? t('dashboard.verifiedStatus') : t('dashboard.underReviewStatus')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.forTenderLabel')}</h4>
                  <p className="text-sm font-medium">{selectedProposal.tender.title}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">{t('dashboard.proposalDetailsLabel')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.submittedLabel')}</span>
                    <span>{new Date(selectedProposal.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  {selectedProposal.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t('dashboard.notesLabel')}</span>
                      <p className="text-sm mt-1">{selectedProposal.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">{t('dashboard.submittedMaterials')}</h4>
                
                {selectedProposal.quotePrice && (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg mb-2">
                    <span className="text-sm text-muted-foreground">{t('dashboard.priceQuoteLabel')}</span>
                    <span className="text-lg font-bold text-emerald-700">SAR {selectedProposal.quotePrice.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {selectedProposal.combinedFileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => viewAuthenticatedFile(selectedProposal.combinedFileUrl!)}
                      data-testid="button-modal-combined-file"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t('dashboard.combinedProposal')}
                    </Button>
                  )}
                  {selectedProposal.technicalFileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => viewAuthenticatedFile(selectedProposal.technicalFileUrl!)}
                      data-testid="button-modal-tech-file"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t('dashboard.technicalProposal')}
                    </Button>
                  )}
                  {selectedProposal.financialFileUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => viewAuthenticatedFile(selectedProposal.financialFileUrl!)}
                      data-testid="button-modal-fin-file"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      {t('dashboard.financialProposal')}
                    </Button>
                  )}
                  {selectedProposal.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(selectedProposal.videoUrl!, '_blank')}
                      data-testid="button-modal-video"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      {t('dashboard.videoPitchLabel')}
                    </Button>
                  )}
                </div>

                {!selectedProposal.combinedFileUrl && !selectedProposal.technicalFileUrl && !selectedProposal.financialFileUrl && !selectedProposal.videoUrl && !selectedProposal.quotePrice && (
                  <p className="text-sm text-muted-foreground italic">{t('dashboard.noFilesSubmitted')}</p>
                )}
              </div>

              {/* Accept/Ignore Actions */}
              {selectedProposal.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                    onClick={() => {
                      updateOfferStatus.mutate({ offerId: selectedProposal.id, status: 'accepted' });
                      setSelectedProposal(null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {t('dashboard.accept')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={() => {
                      updateOfferStatus.mutate({ offerId: selectedProposal.id, status: 'rejected' });
                      setSelectedProposal(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('dashboard.ignore')}
                  </Button>
                </div>
              )}

              {selectedProposal.status === 'accepted' && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border-t mt-4 pt-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">{t('dashboard.accepted')}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor Details Modal */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedVendor?.logoUrl ? (
                <img 
                  src={selectedVendor.logoUrl} 
                  alt={selectedVendor.company} 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
              {selectedVendor?.company}
            </DialogTitle>
            <DialogDescription>
              {selectedVendor?.category}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVendor && (
            <div className="space-y-4">
              {/* Verification Status */}
              <div className="flex items-center gap-2">
                {selectedVendor.verificationStatus === 'verified' ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('dashboard.verifiedCompany')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {t('dashboard.underReviewStatus')}
                  </Badge>
                )}
                <Badge variant="outline">
                  {selectedVendor.joinMethod === 'invitation' ? t('dashboard.invitedMethod') : selectedVendor.joinMethod === 'proposal_accepted' ? t('dashboard.viaProposal') : t('dashboard.appliedViaTraction')}
                </Badge>
              </div>

              {/* Bio */}
              {selectedVendor.bio && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.aboutLabel')}</h4>
                  <p className="text-sm">{selectedVendor.bio}</p>
                </div>
              )}

              {/* Company Details */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                {selectedVendor.legalName && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.legalNameLabel')}</h4>
                    <p className="text-sm">{selectedVendor.legalName}</p>
                  </div>
                )}
                {selectedVendor.city && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.cityLabel')}</h4>
                    <p className="text-sm">{selectedVendor.city}</p>
                  </div>
                )}
                {selectedVendor.crNumber && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.crNumberLabel')}</h4>
                    <p className="text-sm font-mono">{selectedVendor.crNumber}</p>
                  </div>
                )}
                {selectedVendor.vatNumber && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.vatNumberLabel')}</h4>
                    <p className="text-sm font-mono">{selectedVendor.vatNumber}</p>
                  </div>
                )}
              </div>

              {/* Joined Date */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('dashboard.addedToVendorsBase')}</span>
                  <span>{new Date(selectedVendor.joinedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Company Profile Dialog */}
      <Dialog open={showCompanyProfileDialog} onOpenChange={setShowCompanyProfileDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {activeCompany.profile?.logoUrl ? (
                <img
                  src={activeCompany.profile.logoUrl}
                  alt={activeCompany.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#E25E45]/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[#E25E45]" />
                </div>
              )}
              <div>
                <p className="text-xl font-bold">{activeCompany.profile?.displayName || activeCompany.name}</p>
                <p className="text-sm text-muted-foreground font-normal">{t('dashboard.companyStatus')}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Verification & Role Status */}
            <div className="flex items-center gap-2">
              {activeCompany.verificationStatus === 'verified' ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {t('dashboard.verified')}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('dashboard.underReviewStatus')}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {t(`dashboard.${userRole}`)}
              </Badge>
              {activeCompany.onboardingState === 'completed' && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('dashboard.profileComplete')}
                </Badge>
              )}
            </div>

            {/* Company Bio */}
            {activeCompany.profile?.bio && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">{t('dashboard.aboutLabel')}</h4>
                <p className="text-sm">{activeCompany.profile.bio}</p>
              </div>
            )}

            {/* Company Details Grid */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.companyNameLabel')}</h4>
                <p className="text-sm font-medium">{activeCompany.name}</p>
              </div>
              {activeCompany.profile?.displayName && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.displayNameLabel')}</h4>
                  <p className="text-sm font-medium">{activeCompany.profile.displayName}</p>
                </div>
              )}
              {activeCompany.slug && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.companySlugLabel')}</h4>
                  <p className="text-sm font-mono">{activeCompany.slug}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('dashboard.onboardingStatusLabel')}</h4>
                <p className="text-sm capitalize">{activeCompany.onboardingState?.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border-t">
              {canManage && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#E25E45]">{tenders.length}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.tenders')}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{incomingOffers.length + myOffers.length}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.proposals')}</p>
              </div>
              {canManage && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{vendors.length}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.vendorsBase')}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              {canManage && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCompanyProfileDialog(false);
                  setLocation('/company-onboarding');
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('dashboard.edit')}
              </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCompanyProfileDialog(false);
                  setLocation('/settings');
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('settings.settings')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </SidebarInset>
    </SidebarProvider>

    {/* First-time user guided tour overlay */}
    {tourOverlay}
    </>
  );
}
