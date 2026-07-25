import { useAuthStore } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { ParticleButton } from "@/components/ui/particle-button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedCopyButton } from "@/components/ui/animated-copy-button";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider, 
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { Building2, FileText, Users, Inbox, LogOut, Search, CheckCircle, XCircle, Loader2, Mail, UserPlus, Eye, ShieldCheck, ShieldAlert, Clock, UserCheck, Plus, Copy, Check, Calendar, Send, MoreHorizontal, Trash2, Edit, ExternalLink, DollarSign, X, LayoutDashboard, Settings, CreditCard, Bell, MessageSquare, ChevronDown, Sparkles, Image, Link2, ClipboardList, Cog, Video, Play, Globe, HelpCircle, Gift, Sun, Moon, Monitor, ChevronRight, Filter, Handshake, ChevronsUpDown, Paintbrush, Briefcase, BookmarkPlus, Bookmark, User, Code2, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription, PopoverBody, PopoverFooter } from "@/components/ui/popover";
import { useState, useEffect, useRef } from "react";
import { useDashboardTour, usePageTour, resetAllTours } from "@/lib/tour";
import { DASHBOARD_TOUR_STEPS, VENDORS_BASE_TOUR_STEPS, getSteps } from "@/lib/tour-steps";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateTeamDialog from "@/components/CreateTeamDialog";
import IndividualsDirectory from "@/components/IndividualsDirectory";
import { useToast } from "@/hooks/use-toast";
import { viewAuthenticatedFile } from "@/lib/downloadFile";
import VendorProfileDrawer from "@/components/VendorProfileDrawer";
import {
  GetVerifiedVisual,
  CompanyProfileVisual,
  VendorsBaseVisual,
  CreateTenderVisual,
  SubmitProposalVisual,
  TendersMarketplaceVisual,
  BookDemoVisual,
} from "@/components/OnboardingTaskVisuals";
import { BidLogo } from "@/components/brand/BidLogo";
import { StatusBadge, type BidState } from "@/components/brand/StatusDot";
import { tenderStatusToState, proposalStatusToState } from "@/components/brand/statusMap";
import { SkeletonList } from "@/components/skeletons";
import { PageHeader } from "@/components/ui/page-header";

interface VendorProfile {
  id: string;
  companyId: string;
  slug: string;
  hasProfile: boolean;
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
    slug: string;
    hasProfile: boolean;
    name: string;
    email: string;
    company: string;
    expertise: string | null;
    verificationStatus: string;
    logoUrl: string | null;
    bio: string | null;
    websiteUrl: string | null;
  };
}

const SUBMISSION_TYPE_LABELS_DASH: Record<string, string> = {
  quote_only: "Price Quote Only",
  tech_fin_proposal: "Technical & Financial",
  video_only: "Video Only",
  tech_fin_with_video: "Tech & Fin + Video",
};

// ── Brand surfaces ───────────────────────────────────────────────────────────
// Design intent: cream is the canvas (the page), so data CARDS are clean white —
// they lift off the background and keep dense content legible. Orange shows up
// only as a subtle border + an interaction (hover) accent, never as a fill behind
// text. The peach gradient is reserved for the Overview's sparse showcase cards.
// Warm paper — lighter than the cream page so cards lift, but warm enough to
// belong to the same family (cold #FFF on cream reads as two unrelated colors).
const BRAND_CARD_CLASS =
  "rounded-2xl border border-[#FE3C01]/10 dark:border-border [background:var(--spotlight-card-bg)] shadow-[0_4px_16px_-8px_rgba(11,9,7,0.12)]";

// Branded segmented control (sub-tab navigation): a quiet warm-paper track with
// an orange active pill — the active state earns the accent, the rest stays calm.
const BRAND_TABSLIST =
  "bg-[#FFFCF7] dark:bg-card border border-[#FE3C01]/10 dark:border-border rounded-xl p-1 shadow-[0_4px_16px_-8px_rgba(11,9,7,0.12)]";
const BRAND_TABTRIGGER =
  "rounded-lg data-[state=active]:bg-[#FE3C01] data-[state=active]:text-white data-[state=active]:shadow-[0_6px_16px_-8px_rgba(254,60,1,0.45)]";

// Static containers (filters, empty states): warm-paper card on the cream page.
function brandCardProps(extraClass = "") {
  return {
    className: `${BRAND_CARD_CLASS} ${extraClass}`.trim(),
    style: undefined,
  };
}

// SpotlightCard list rows: restrained hover — small lift + warm orange shadow.
function brandSpotlightProps(extraClass = "") {
  return {
    className:
      `shadow-[0_4px_16px_-8px_rgba(11,9,7,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FE3C01]/25 hover:shadow-[0_18px_40px_-24px_rgba(254,60,1,0.22)] ${extraClass}`.trim(),
    style: undefined,
  };
}


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
  targetAudienceTypes: string[] | null;
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
  status: 'pending' | 'accepted' | 'rejected' | 'shortlisted';
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
  status: 'pending' | 'accepted' | 'rejected' | 'shortlisted';
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
    slug: string;
    name: string;
    category: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    logoUrl: string | null;
  };
}

function TractionSlugSetup({ companyName, isRtl }: { companyName: string; isRtl: boolean }) {
  const { toast } = useToast();
  const { checkAuth } = useAuthStore();
  const { t } = useI18n();
  const defaultSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const [slug, setSlug] = useState(defaultSlug);
  const [isEditing, setIsEditing] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);

  const createSlugMutation = useMutation({
    mutationFn: async (slugValue: string) => {
      const res = await apiRequest('PATCH', '/api/company/traction-slug', { slug: slugValue });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: t('dashboard.tractionLinkCreated'), description: `${t('dashboard.tractionLinkLiveAt')} /traction/${data.slug}` });
      setSlugTaken(false);
      checkAuth();
    },
    onError: (error: Error) => {
      if (error.message.includes('already taken')) {
        setSlugTaken(true);
      } else {
        toast({ title: t('settings.somethingWentWrong'), description: error.message, variant: "destructive" });
      }
    }
  });

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center">
          <Link2 className="h-4 w-4 text-[#FE3C01]" />
        </div>
        <div className={isRtl ? 'text-right' : ''}>
          <p className="text-sm font-semibold">{t('dashboard.createTractionLink')}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.createTractionLinkDesc')}</p>
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm text-muted-foreground whitespace-nowrap">/traction/</span>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                setSlugTaken(false);
              }}
              placeholder="your-company"
              className={`font-mono text-sm ${slugTaken ? 'border-amber-300 focus-visible:ring-amber-200' : ''}`}
              maxLength={50}
              data-testid="input-traction-slug"
            />
          </div>
          {slugTaken && (
            <div className={`flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <HelpCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">"{slug}" {t('dashboard.slugTaken')}</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  <button className="underline font-medium hover:text-amber-800 dark:text-amber-300" onClick={() => { setSlug(`${slug}-co`); setSlugTaken(false); }}>{slug}-co</button>,{' '}
                  <button className="underline font-medium hover:text-amber-800 dark:text-amber-300" onClick={() => { setSlug(`${slug}-${Math.floor(Math.random() * 99) + 1}`); setSlugTaken(false); }}>{slug}-{Math.floor(Math.random() * 99) + 1}</button> {t('dashboard.slugTakenSuggestion')}
                </p>
              </div>
            </div>
          )}
          <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Button
              size="sm"
              onClick={() => createSlugMutation.mutate(slug)}
              disabled={!slug.trim() || slug.length < 2 || createSlugMutation.isPending}
              className="bg-[#FE3C01] hover:bg-[#E83501] text-white"
              data-testid="button-create-traction"
            >
              {createSlugMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('dashboard.createLink')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setSlugTaken(false); }}>{t('common.cancel')}</Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="border-[#FE3C01]/30 text-[#FE3C01] hover:bg-[#FE3C01]/5"
          data-testid="button-setup-traction"
        >
          <Plus className={`h-4 w-4 ${isRtl ? 'ml-1' : 'mr-1'}`} />
          {t('dashboard.setupTractionLink')}
        </Button>
      )}
    </div>
  );
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
              </SidebarMenuButton>
              {/* Sibling, not a child: SidebarMenuButton is itself a <button>,
                  and a nested button is invalid DOM — it breaks keyboard focus
                  and screen readers. */}
              <SidebarMenuAction
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(session.id);
                }}
                aria-label="Delete chat"
                className="opacity-0 group-hover/chat:opacity-100 p-0.5 hover:text-destructive transition-opacity group-data-[collapsible=icon]:hidden"
              >
                <Trash2 className="h-3 w-3" />
              </SidebarMenuAction>
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

  return (
    <div className="relative flex-shrink-0">
      {isCollapsed ? (
        <SidebarTrigger className="h-6 w-6" />
      ) : (
        <BidLogo variant="orange" size={28} />
      )}
    </div>
  );
}

// On mobile the sidebar renders inside an off-canvas drawer that's closed by default,
// so tour steps that highlight sidebar content (nav, create-tender, user-menu) would
// otherwise point at an invisible element. This opens/closes the drawer in lockstep
// with the active tour step. Must live inside <SidebarProvider> to reach useSidebar().
//
// The tour card lives outside the drawer's own DOM subtree (it's a separate fixed
// overlay), so tapping its Next/Skip buttons registers as a Radix "outside click" and
// the Sheet closes itself even while `open` is still logically true across consecutive
// steps that both need it open (e.g. sidebar-nav -> create-tender). Keying the effect
// on `stepId` (which changes every step) forces it to re-open on every transition, not
// just when the open/closed requirement flips.
function MobileTourSidebarSync({ open, stepId }: { open: boolean; stepId: string | null }) {
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) setOpenMobile(open);
  }, [isMobile, open, stepId, setOpenMobile]);

  return null;
}

type SidebarNavItem = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  href?: string;
};

function SidebarNavButton({
  item,
  activeTab,
  setActiveTab,
}: {
  item: SidebarNavItem;
  activeTab: string;
  setActiveTab: (value: string) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = activeTab === item.value;
  return (
    <SidebarMenuButton
      isActive={isActive}
      onClick={() => {
        if (item.href) { window.open(item.href, '_blank'); return; }
        setActiveTab(item.value);
        if (isMobile) setOpenMobile(false);
      }}
      tooltip={item.label}
      data-testid={`sidebar-${item.value}`}
      className={`py-3 text-base rounded-xl transition-all ${isActive ? "bg-[#FE3C01]/15 text-[#FE3C01] font-semibold hover:bg-[#FE3C01]/20 hover:text-[#FE3C01] shadow-[0_6px_16px_-10px_rgba(254,60,1,0.6)]" : "hover:bg-[#FE3C01]/5 hover:text-[#FE3C01]"}`}
    >
      <item.icon className={`h-5 w-5 transition-colors ${isActive ? "text-[#FE3C01]" : "text-muted-foreground group-hover/menu-item:text-[#FE3C01]"}`} />
      <span className={`text-base font-medium ${isActive ? "text-[#FE3C01]" : ""}`}>{item.label}</span>
    </SidebarMenuButton>
  );
}

function SidebarSearchButton({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      onClick={() => {
        onOpen();
        // Mobile-only: close the drawer so the search modal isn't behind it.
        // On desktop isMobile is false, so behavior is unchanged.
        if (isMobile) setOpenMobile(false);
      }}
      tooltip={label}
      data-testid="sidebar-search-tenders"
      className="py-3 text-base rounded-lg hover:bg-muted"
    >
      <Search className="h-5 w-5 text-muted-foreground" />
      <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{label}</span>
    </SidebarMenuButton>
  );
}

// B-7: RFPs/Proposals/Vendors are real, shareable routes rather than pure
// client-side tab state, while still rendering inside this single component
// (splitting their ~1100 lines of tightly-coupled queries/mutations/tour
// hooks into separate files was judged too high-risk to do unsupervised).
const TAB_TO_ROUTE: Record<string, string> = {
  overview: '/dashboard',
  tenders: '/rfps',
  proposals: '/proposals',
  vendors: '/vendors',
};
const ROUTE_TO_TAB: Record<string, string> = {
  '/dashboard': 'overview',
  '/rfps': 'tenders',
  '/proposals': 'proposals',
  '/vendors': 'vendors',
};

export default function Dashboard() {
  const { user, activeCompany, companies, switchCompany } = useAuthStore();
  const [location, setLocation] = useLocation();
  const { t, isRtl, language, setLanguage } = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileJoinRequestId, setProfileJoinRequestId] = useState<string | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<IncomingOffer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [tenderSearchQuery, setTenderSearchQuery] = useState("");
  const [activeTab, setActiveTabState] = useState(() => ROUTE_TO_TAB[location] ?? "overview");
  const mainRef = useRef<HTMLElement>(null);

  // Keep the URL in sync with the active tab so /rfps, /proposals, and
  // /vendors are real, shareable, back-button-friendly routes (B-7) instead
  // of pure client-side tab state.
  const setActiveTab = (value: string) => {
    setActiveTabState(value);
    const route = TAB_TO_ROUTE[value];
    if (route && route !== location) setLocation(route);
  };
  useEffect(() => {
    const tabForRoute = ROUTE_TO_TAB[location];
    if (tabForRoute && tabForRoute !== activeTab) setActiveTabState(tabForRoute);
  }, [location]);
  const [proposalsSubTab, setProposalsSubTab] = useState(() => localStorage.getItem('dashboard-proposals-tab') || 'submitted');
  const [vendorsSubTab, setVendorsSubTab] = useState(() => localStorage.getItem('dashboard-vendors-tab') || 'vendors-list');
  const [tenderFilter, setTenderFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [tenderTypeFilter, setTenderTypeFilter] = useState<string>('all');
  const [tenderOffersFilter, setTenderOffersFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCompanyProfileDialog, setShowCompanyProfileDialog] = useState(false);
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const { toast } = useToast();

  // ── First-time user guided tour ──────────────────────────────────────────
  const { overlay: tourOverlay, tourDismissed, retake: retakeTour, activeStep: dashboardTourStep } = useDashboardTour({
    userId: user?.id ?? '',
    steps: getSteps(DASHBOARD_TOUR_STEPS, language),
    isRtl,
    autoStart: false, // opt-in only (was auto-launch)
  });

  // "Take a tour" is meant to re-arm every guide across the app, not just this page's —
  // otherwise someone who already dismissed all of them sees nothing when they later
  // visit Settings, Vendors, etc. Clear every tour's dismissal state first, then start
  // this page's tour immediately since we're already here.
  const handleRetakeTour = async () => {
    if (user?.id) await resetAllTours(user.id);
    retakeTour();
  };

  // Switching tabs swaps TabsContent in place inside the same scrollable <main> —
  // scrollTop isn't reset automatically, so a tab opened while scrolled down from the
  // previous one can leave its content (and any tour spotlight targeting it) starting
  // out partially off-screen instead of at the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // ── Vendors tab tour (fires first time user opens the vendors tab) ────────
  const { overlay: vendorsTourOverlay, isActive: vendorsTourActive } = usePageTour({
    tourId: 'vendors-base',
    userId: user?.id ?? '',
    steps: getSteps(VENDORS_BASE_TOUR_STEPS, language),
    isRtl,
    autoStart: false, // opt-in only (was auto-launch)
    autoStartDelay: 800,
  });

  // The tour's 2nd step spotlights the vendors-list sub-tab's search card, which only
  // exists in the DOM while that sub-tab is active. Force it so the step can't silently
  // skip because the user last left the join-requests sub-tab open.
  useEffect(() => {
    if (vendorsTourActive) setVendorsSubTab('vendors-list');
  }, [vendorsTourActive]);

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!user.otpVerified) {
    setLocation("/verify-email");
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
  const isCompanyVerified = activeCompany.verificationStatus === 'verified';
  const workspaceKind = (activeCompany.accountType ?? 'company') as 'company' | 'team' | 'individual';
  const isBuyerAccount = workspaceKind === 'company';
  const isIndividual = workspaceKind === 'individual';
  const isTeam = workspaceKind === 'team';
  const canCreateTenders = isBuyerAccount;
  // A user can spin up a personal individual workspace unless they already have one.
  const hasIndividualWorkspace = companies.some((c: any) => c.accountType === 'individual');
  const canActivateIndividual = !hasIndividualWorkspace;
  const hasProfileComplete = !!(activeCompany.profile?.bio && activeCompany.profile?.logoUrl);

  function handleCreateTender() {
    if (!isCompanyVerified) {
      setShowUnverifiedDialog(true);
    } else {
      setLocation('/tenders/new');
    }
  }

  async function handleExploreMarketplace() {
    // Optimistically mark the task complete so the checkmark shows immediately
    queryClient.setQueryData(['/api/onboarding-tasks'], (old: any) =>
      old ? { ...old, hasExploredMarketplace: true } : old
    );
    try {
      await apiRequest('POST', '/api/onboarding-tasks/marketplace-explored');
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-tasks'] });
    } catch {}
    window.open('/marketplace', '_blank');
  }

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
    enabled: canManage,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const [vendorToRemove, setVendorToRemove] = useState<{ id: string; companyId: string; name: string } | null>(null);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [profileEmbedOpen, setProfileEmbedOpen] = useState(false);
  const [profileEmbedVariant, setProfileEmbedVariant] = useState<'inline' | 'popup' | 'text'>('inline');
  const [profileEmbedCopied, setProfileEmbedCopied] = useState(false);

  const removeVendorMutation = useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      await apiRequest('DELETE', `/api/vendors-base/${id}`);
    },
    onSuccess: (_data, { id, name }) => {
      queryClient.setQueryData(
        ['/api/vendors-base', searchQuery],
        (old: VendorProfile[] | undefined) => (old ?? []).filter(v => v.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-tasks'] });
      setVendorToRemove(null);
      toast({ title: t('dashboard.removeVendorTitle'), description: `${name} ${t('dashboard.removedFromBase')}` });
    },
    onError: () => {
      toast({ title: t('dashboard.removeVendorTitle'), description: t('dashboard.removeVendorError'), variant: 'destructive' });
    },
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
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Fetch onboarding tasks status
  interface OnboardingTasks {
    isVerified: boolean;
    hasCompletedProfile: boolean;
    hasVendors: boolean;
    hasTender: boolean;
    hasReviewedProposal: boolean;
    hasExploredMarketplace: boolean;
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

  // Full profile data for "My Profile Link" tab — only fetched when that tab is active
  const { data: profileLinkData } = useQuery<{
    company: { id: string; name: string; slug: string; legalName: string; category: string | null; city: string | null; accountType: string; verificationStatus: string; certifications: string[]; crNumber: string; vatNumber: string | null; createdAt: string; verifiedAt: string | null; verifiedDocuments: string[] };
    profile: { displayName: string; bio: string | null; tags: string[]; logoUrl: string | null; headerUrl: string | null; brochureUrl: string | null; companySize: string | null; yearFounded: number | null; serviceAreas: string[] | null; languages: string[] | null; industriesServed: string[] | null; availabilityStatus: string | null; availabilityNote: string | null; portfolio: { title: string; description?: string; imageUrl: string }[]; socialLinks: { website?: string; linkedin?: string; twitter?: string } | null; introVideoUrl: string | null; stats: Record<string, number> | null; certifications: { name: string }[] | null; insurancePolicies: { type: string; provider: string }[] | null } | null;
  }>({
    queryKey: ['/api/companies/by-slug', activeCompany.slug, 'profile'],
    queryFn: () => apiRequest('GET', `/api/companies/by-slug/${activeCompany.slug}/profile`).then(r => r.json()),
    enabled: activeTab === 'profile-link' && !!activeCompany.slug && (isIndividual || isTeam),
  });

  // Tenders eligible for negotiation: closed, 2+ offers, no accepted offer
  const tendersReadyToNegotiate = tenders.filter(t =>
    t.status === 'closed' &&
    t.offersCount >= 2 &&
    !incomingOffers.some(o => o.tenderId === t.id && o.status === 'accepted')
  );

  // Helper: update blur visibility based on viewport scrollability + position
  // Filter tenders based on search and status
  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = !tenderSearchQuery || 
      tender.title.toLowerCase().includes(tenderSearchQuery.toLowerCase()) ||
      (tender.description && tender.description.toLowerCase().includes(tenderSearchQuery.toLowerCase()));
    const matchesFilter = tenderFilter === 'all' || tender.status === tenderFilter;
    const matchesType = tenderTypeFilter === 'all' || tender.submissionType === tenderTypeFilter;
    const matchesOffers = tenderOffersFilter === 'all' ||
      (tenderOffersFilter === 'none' && tender.offersCount === 0) ||
      (tenderOffersFilter === '1-5' && tender.offersCount >= 1 && tender.offersCount <= 5) ||
      (tenderOffersFilter === '6-10' && tender.offersCount >= 6 && tender.offersCount <= 10) ||
      (tenderOffersFilter === '10+' && tender.offersCount > 10);
    return matchesSearch && matchesFilter && matchesType && matchesOffers;
  });

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
        title: "RFP deleted",
        description: "The RFP has been removed",
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

  // Get status badge styling — maps to brand dot-states
  const getStatusBadge = (status: string, deadline?: string): { state: BidState; label: string } => {
    if (status === 'closed' && deadline && deadline < new Date().toISOString().split('T')[0]) {
      return { state: 'lost', label: (t('dashboard.closedLabel') || 'Closed') + ' · ' + (t('dashboard.deadlinePassed') || 'Deadline Passed') };
    }
    const state = tenderStatusToState(status);
    switch (status) {
      case 'published': return { state, label: 'Published' };
      case 'draft':     return { state, label: 'Draft' };
      case 'closed':    return { state, label: 'Closed' };
      case 'cancelled': return { state, label: 'Cancelled' };
      default:          return { state, label: status };
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
      setProfileDrawerOpen(false);
      setProfileJoinRequestId(null);
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
      setProfileDrawerOpen(false);
      setProfileJoinRequestId(null);
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
        title: variables.status === 'accepted' ? t('dashboard.accepted') : variables.status === 'shortlisted' ? t('dashboard.shortlisted') : t('dashboard.rejected'),
        description: variables.status === 'accepted'
          ? "Vendor has been added to your Vendors Base."
          : variables.status === 'shortlisted'
          ? "Proposal has been shortlisted."
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

  const doLogout = useLogout();
  const handleLogout = () => {
    doLogout("/");
  };

  const sidebarItems = [
    { value: "overview", label: t('dashboard.overview'), icon: LayoutDashboard, show: true },
    { value: "tenders", label: t('dashboard.tenders'), icon: FileText, show: canManage && isBuyerAccount },
    { value: "proposals", label: t('dashboard.proposals'), icon: Inbox, show: true },
    { value: "vendors", label: t('dashboard.vendorsBase'), icon: Users, show: canManage && isBuyerAccount },
    { value: "profile-link", label: isIndividual ? t('dashboard.profileLinkFreelancer') : t('dashboard.profileLinkTeam'), icon: Link2, show: isIndividual || isTeam },
  ];

  return (
    <>
    <SidebarProvider>
      <MobileTourSidebarSync open={!!dashboardTourStep?.requiresMobileSidebar} stepId={dashboardTourStep?.id ?? null} />
      <Sidebar collapsible="icon" side={isRtl ? "right" : "left"} className={isRtl ? "border-l border-border dark:border-border" : "border-r border-border dark:border-border"}>
        {/* Brand accent strip */}
        <div className="h-0.5 bg-gradient-to-r from-[#FE3C01] to-[#F19A8F] flex-shrink-0" />
        <SidebarHeader className="border-b px-4 py-4">
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <SidebarLogoToggle />
            {companies.length > 1 || canActivateIndividual ? (
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
                            toast({ title: t('settings.switchedTo', { company: company.name }) });
                          } catch {
                            toast({ title: t('settings.failedSwitchCompany'), variant: "destructive" });
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
                  {canActivateIndividual && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setLocation('/onboarding/individual-basics')}
                        className="flex items-center gap-3 py-2"
                        data-testid="menu-activate-individual"
                      >
                        <div className="h-8 w-8 rounded-md bg-[var(--state-won)]/10 flex items-center justify-center text-[var(--state-won)] flex-shrink-0">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t('activateIndividual.label')}</p>
                          <p className="text-xs text-muted-foreground truncate">{t('activateIndividual.sublabel')}</p>
                        </div>
                      </DropdownMenuItem>
                    </>
                  )}
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
            {activeCompany?.slug && (
              <button
                type="button"
                onClick={() => window.open(`/company/${activeCompany.slug}`, '_blank', 'noopener,noreferrer')}
                title={t('settings.viewPublicProfile')}
                aria-label={t('settings.viewPublicProfile')}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-[#FE3C01] hover:bg-[#FE3C01]/10 transition-colors flex-shrink-0 group-data-[collapsible=icon]:hidden"
                data-testid="button-view-public-profile-sidebar"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            <SidebarTrigger className={`${isRtl ? 'mr-auto' : 'ml-auto'} flex-shrink-0 group-data-[collapsible=icon]:hidden`} />
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          {/* Action Items - Create & Search */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {canManage && canCreateTenders && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleCreateTender}
                      tooltip={t('dashboard.createTender')}
                      data-testid="sidebar-create-tender"
                      data-tour="create-tender"
                      className="py-3 text-base rounded-xl bg-[#FE3C01] text-white hover:bg-[#1A1613] hover:text-white shadow-[0_10px_24px_-8px_rgba(254,60,1,0.55)] transition-all"
                    >
                      <Plus className="h-5 w-5 text-white" />
                      <span className="text-base font-medium group-data-[collapsible=icon]:hidden text-white">{t('dashboard.createTender')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isIndividual && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setCreateTeamOpen(true)}
                      tooltip={t('dashboard.createTeam')}
                      data-testid="sidebar-create-team"
                      className="py-3 text-base rounded-xl bg-[#FE3C01] text-white hover:bg-[#1A1613] hover:text-white shadow-[0_10px_24px_-8px_rgba(254,60,1,0.55)] transition-all"
                    >
                      <Plus className="h-5 w-5 text-white" />
                      <span className="text-base font-medium group-data-[collapsible=icon]:hidden text-white">{t('dashboard.createTeam')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isIndividual && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => activeCompany.slug
                        ? window.open(`/company/${activeCompany.slug}`, '_blank')
                        : setLocation('/company/edit')}
                      tooltip={t('dashboard.myPublicProfile')}
                      data-testid="sidebar-profile-link"
                      className="py-3 text-base rounded-lg hover:bg-muted"
                    >
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                      <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{t('dashboard.myPublicProfile')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {canManage && !isIndividual && !isTeam && (
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
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Navigation Items */}
          <SidebarGroup data-tour="sidebar-nav">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {sidebarItems.filter(item => item.show).map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarNavButton
                      item={item}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Marketplace Portal */}
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 group-data-[collapsible=icon]:px-0">
                <button
                  onClick={() => window.open('/marketplace', '_blank')}
                  className="w-full rounded-xl border border-[#FE3C01]/20 bg-gradient-to-br from-[#FE3C01]/5 to-[#F19A8F]/10 px-3 py-3 hover:from-[#FE3C01]/10 hover:to-[#F19A8F]/20 hover:border-[#FE3C01]/30 transition-all group/mp cursor-pointer group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
                >
                  <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:gap-0">
                    <div className="h-8 w-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center flex-shrink-0 group-hover/mp:bg-[#FE3C01]/15 transition-colors">
                      <Globe className="h-4 w-4 text-[#FE3C01]" />
                    </div>
                    <div className="flex-1 min-w-0 text-start group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{t('dashboard.marketplace')}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{t('dashboard.marketplaceHint')}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-[#FE3C01]/50 group-hover/mp:text-[#FE3C01] transition-colors flex-shrink-0 group-data-[collapsible=icon]:hidden" />
                  </div>
                </button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Panel — only visible to platform admins */}
          {user.isAdmin && (
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 group-data-[collapsible=icon]:px-0">
                  <button
                    onClick={() => setLocation('/admin/dashboard')}
                    className="w-full rounded-xl border border-purple-300/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 px-3 py-3 hover:from-purple-500/15 hover:to-indigo-500/20 hover:border-purple-400/40 transition-all group/admin cursor-pointer group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
                  >
                    <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:gap-0">
                      <div className="h-8 w-8 rounded-lg bg-[var(--bid-orange)]/15 flex items-center justify-center flex-shrink-0 group-hover/admin:bg-[var(--bid-orange)]/25 transition-colors">
                        <ShieldCheck className="h-4 w-4 text-[var(--bid-orange)] dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-start group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{t('settings.adminPanelLabel')}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{t('settings.adminPanelDesc')}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-purple-400/50 group-hover/admin:text-purple-500 transition-colors flex-shrink-0 group-data-[collapsible=icon]:hidden" />
                    </div>
                  </button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <ChatHistorySidebar />
        </SidebarContent>

        <SidebarFooter className="border-t px-4 py-4">
          {/* Verification banner — shown for unverified/pending/rejected companies */}
          {activeCompany.verificationStatus === 'not_verified' && (
            <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">{isTeam ? t('settings.teamNotVerified') : t('settings.companyNotVerified')}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-1.5 leading-snug">{isTeam ? t('settings.teamNotVerifiedDesc') : t('settings.companyNotVerifiedDesc')}</p>
              <button
                onClick={() => setLocation('/settings?tab=company')}
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900"
              >
                {t('settings.verifyNow')}
              </button>
            </div>
          )}
          {activeCompany.verificationStatus === 'under_review' && (
            <div className="mb-3 rounded-lg bg-[var(--bid-orange)]/5 dark:bg-blue-950/40 border border-[var(--bid-orange)]/20 dark:border-blue-800 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-0.5">{t('settings.verificationInProgress')}</p>
              <p className="text-xs text-[var(--bid-orange)] dark:text-blue-400 leading-snug">{t('settings.verificationInProgressDesc')}</p>
            </div>
          )}
          {activeCompany.verificationStatus === 'rejected' && (
            <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-0.5">{t('settings.verificationRejected')}</p>
              {activeCompany.rejectionReason ? (
                <p className="text-xs text-red-700 dark:text-red-400 mb-1.5 leading-snug">
                  <strong>{t('settings.verificationReasonLabel')}</strong> {activeCompany.rejectionReason}
                </p>
              ) : (
                <p className="text-xs text-red-700 dark:text-red-400 mb-1.5 leading-snug">{t('settings.verificationRejectedDesc')}</p>
              )}
              <button
                onClick={() => setLocation('/settings?tab=company')}
                className="text-xs font-semibold text-red-800 dark:text-red-300 underline underline-offset-2 hover:text-red-900"
              >
                {t('settings.reUploadDocuments')}
              </button>
            </div>
          )}

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
                      className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[var(--bid-orange)] flex items-center justify-center border-2 border-white dark:border-border"
                      title={t('dashboard.verified')}
                    >
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : activeCompany.verificationStatus === 'under_review' ? (
                    <div
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-400 flex items-center justify-center"
                      title={t('settings.verificationInProgress')}
                    >
                      <Clock className="h-2.5 w-2.5 text-white" />
                    </div>
                  ) : activeCompany.verificationStatus === 'rejected' ? (
                    <div
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center"
                      title={t('settings.verificationRejected')}
                    >
                      <XCircle className="h-2.5 w-2.5 text-white" />
                    </div>
                  ) : (
                    <div
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center"
                      title={t('settings.companyNotVerified')}
                    >
                      <X className="h-2.5 w-2.5 text-white" />
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
                                : 'bg-[var(--bid-orange)]/5 dark:bg-blue-900/20 hover:bg-[var(--bid-orange)]/10 dark:hover:bg-blue-900/30 font-medium'
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              offer.isViewed 
                                ? 'bg-[var(--bid-orange)]/10 dark:bg-blue-900/30' 
                                : 'bg-blue-200 dark:bg-blue-800/50'
                            }`}>
                              <FileText className={`h-4 w-4 ${offer.isViewed ? 'text-[var(--bid-orange)] dark:text-blue-400' : 'text-[var(--bid-orange)] dark:text-blue-300'}`} />
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
                          className="w-full text-center text-sm text-[var(--bid-orange)] dark:text-blue-400 hover:underline py-1"
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
                    <button onClick={() => setLocation('/getting-started')} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                      {t('settings.gettingStarted')}
                    </button>
                    <button onClick={() => setLocation('/faq')} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
                      {t('settings.faqs')}
                    </button>
                    <button onClick={() => window.location.href = 'mailto:info@bid.sa'} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">
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
                {!isIndividual && (
                <button
                  onClick={() => setLocation('/company/edit')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                  data-testid="menu-company-profile"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{isTeam ? t('settings.teamProfileMenuItem') : t('settings.companyProfileMenuItem')}</span>
                </button>
                )}

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
              onClick={handleRetakeTour}
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
                    className="w-full text-left p-6 hover:bg-muted dark:hover:bg-gray-800 transition-colors group"
                    data-testid={`search-tender-result-${tender.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-foreground text-base group-hover:text-[#FE3C01] transition-colors">
                        {tender.title}
                      </h3>
                      {(() => {
                        const sb = getStatusBadge(tender.status, tender.deadline);
                        return (
                          <StatusBadge state={sb.state} label={sb.label} className="flex-shrink-0" />
                        );
                      })()}
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

      <SidebarInset className="bg-[#F6F4F1] dark:bg-background">
        {/* Mobile top bar — only way to reach navigation on phones */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <SidebarTrigger className="h-9 w-9 -ms-1.5" aria-label="Open menu" />
          <BidLogo variant="orange" size={24} />
        </header>
        {/* Main Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-auto p-4 sm:p-6 max-md:pb-28"
          style={currentTheme !== 'dark' ? {
            // Porcelain canvas with two soft blooms — orange top-right, ink
            // bottom-left — replacing the old flat cream + dot grid.
            backgroundColor: '#F6F4F1',
            backgroundImage: [
              'radial-gradient(1100px 520px at 88% -8%, rgba(254,60,1,0.07), transparent 62%)',
              'radial-gradient(900px 480px at -12% 112%, rgba(26,22,19,0.06), transparent 60%)',
            ].join(', '),
          } : {
            backgroundImage: [
              'radial-gradient(1100px 520px at 88% -8%, rgba(254,60,1,0.08), transparent 62%)',
              'radial-gradient(900px 480px at -12% 112%, rgba(0,0,0,0.35), transparent 60%)',
            ].join(', '),
          }}
        >
          {/* Dashboard Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-10 w-full pt-2 px-1 sm:px-2">

            {/* ── Signal desk — heading + live stats fused into one ink panel ── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`bid-grain relative overflow-hidden rounded-[28px] bg-[#171310] px-6 sm:px-9 pt-8 sm:pt-10 ${canManage ? 'pb-7 sm:pb-9' : 'pb-8'} ${isRtl ? 'text-right' : ''}`}
            >
              {/* Orange blooms — the signal glowing off the desk */}
              <div aria-hidden className="pointer-events-none absolute -top-36 -right-28 h-96 w-96 rounded-full bg-[#FE3C01]/25 blur-[110px]" />
              <div aria-hidden className="pointer-events-none absolute -bottom-44 -left-24 h-80 w-80 rounded-full bg-[#FE3C01]/[0.08] blur-[100px]" />

              <div className="relative">
                {canManage && (
                  <span className="inline-block text-xs font-semibold text-[#FF6A3C] bg-[#FE3C01]/15 px-3 py-1.5 rounded-full mb-4 tracking-wide">
                    01
                  </span>
                )}
                <h1 className="font-display font-bold text-4xl sm:text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[0.95]">
                  {t('dashboard.overview')}<span className="text-[#FE3C01]">.</span>
                </h1>
                {canManage && (
                  <p className="text-sm sm:text-base text-[#B9AFA5] mt-3 max-w-xl leading-relaxed">
                    {t('dashboard.getStartedDesc')}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8" data-tour="dashboard-tabs">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0, duration: 0.35, ease: "easeOut" }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveTab('tenders')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('tenders'); } }}
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 transition-colors hover:bg-white/[0.07] hover:border-[#FE3C01]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  >
                    <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="h-11 w-11 rounded-xl bg-[#FE3C01] text-white flex items-center justify-center flex-shrink-0 shadow-[0_8px_18px_-6px_rgba(254,60,1,0.5)]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <p className="font-display font-bold text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[1] tabular-nums">
                          {tenders.filter(tender => tender.status === 'published').length}
                        </p>
                        <p className="text-sm text-[#B9AFA5] mt-2 font-medium">{t('dashboard.activeRfps')}</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveTab('proposals')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('proposals'); } }}
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 transition-colors hover:bg-white/[0.07] hover:border-[#FE3C01]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  >
                    <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="h-11 w-11 rounded-xl bg-white/10 text-[#F4EDE1] flex items-center justify-center flex-shrink-0 border border-white/10">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <p className="font-display font-bold text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[1] tabular-nums">
                          {incomingOffers.filter(o => o.status === 'pending').length}
                        </p>
                        <p className="text-sm text-[#B9AFA5] mt-2 font-medium">{t('dashboard.pendingProposals')}</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveTab('vendors')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('vendors'); } }}
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 transition-colors hover:bg-white/[0.07] hover:border-[#FE3C01]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  >
                    <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="h-11 w-11 rounded-xl bg-white/10 text-[#F4EDE1] flex items-center justify-center flex-shrink-0 border border-white/10">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <p className="font-display font-bold text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[1] tabular-nums">
                          {vendors.length}
                        </p>
                        <p className="text-sm text-[#B9AFA5] mt-2 font-medium">{t('dashboard.vendorsInBase')}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.section>

            {/* ── Ready to Negotiate Banner ───────────────────────────── */}
            {canManage && tendersReadyToNegotiate.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
                className="rounded-3xl overflow-hidden border border-[#FE3C01]/15 dark:border-border bg-white dark:bg-card shadow-[0_18px_44px_-32px_rgba(26,22,19,0.25)]"
              >
                <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />
                <div className="p-6 sm:p-7">
                  <div className={`flex items-center gap-4 mb-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="h-11 w-11 rounded-2xl bg-[#FE3C01] flex items-center justify-center flex-shrink-0 shadow-[0_8px_18px_-6px_rgba(254,60,1,0.45)]">
                      <Handshake className="h-5 w-5 text-white" />
                    </div>
                    <div className={isRtl ? 'text-right' : ''}>
                      <h3 className="font-display font-bold text-xl text-[#1A1613] dark:text-foreground tracking-[-0.02em]">{t('dashboard.readyToNegotiateTitle')}</h3>
                      <p className="text-sm text-[#8A8078] dark:text-muted-foreground mt-0.5">
                        {t('dashboard.readyToNegotiateDesc').replace('{count}', String(tendersReadyToNegotiate.length))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {tendersReadyToNegotiate.slice(0, 3).map(tender => (
                      <div key={tender.id} className={`[background:var(--spotlight-card-bg)] rounded-2xl border border-[#FE3C01]/10 px-4 py-3 flex items-center justify-between shadow-[0_8px_20px_-12px_rgba(11,9,7,0.12)] ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={isRtl ? 'text-right' : ''}>
                          <p className="font-semibold text-sm text-[#1A1613] dark:text-foreground">{tender.title}</p>
                          <p className="text-xs text-[#8A8078] dark:text-muted-foreground mt-0.5">
                            {t('dashboard.proposalsCount').replace('{count}', String(tender.offersCount))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#1A1613] hover:bg-[#FE3C01] text-[#F4EDE1] rounded-full px-4 flex-shrink-0 transition-colors"
                          onClick={() => setLocation(`/tenders/${tender.id}`)}
                        >
                          {t('dashboard.negotiateNowBtn')} →
                        </Button>
                      </div>
                    ))}
                    {tendersReadyToNegotiate.length > 3 && (
                      <p
                        className={`text-xs text-[#FE3C01] cursor-pointer hover:underline font-medium ${isRtl ? 'text-right' : 'text-left'} px-1 pt-1`}
                        onClick={() => setActiveTab('tenders')}
                      >
                        and {tendersReadyToNegotiate.length - 3} more →
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Demo Banner — demoted to a quiet card; the ink hero owns the
                   dark weight now (plan B-5) ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-[#1A1613]/10 dark:border-border bg-white dark:bg-card"
            >
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 sm:px-6 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3.5 min-w-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="h-9 w-9 rounded-xl bg-[#FE3C01]/10 flex items-center justify-center flex-shrink-0">
                    <Play className="h-4 w-4 text-[#FE3C01] fill-[#FE3C01]" />
                  </div>
                  <div className={`min-w-0 ${isRtl ? 'text-right' : ''}`}>
                    <h3 className="font-display font-bold text-base text-[#1A1613] dark:text-foreground tracking-[-0.02em]">{t('dashboard.bookDemoTitle')}</h3>
                    <p className="text-sm text-[#8A8078] dark:text-muted-foreground mt-0.5">{t('dashboard.bookDemoDesc')}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full px-5 flex-shrink-0 border-[#1A1613]/20 text-[#1A1613] dark:text-foreground hover:bg-[#FE3C01] hover:text-white hover:border-[#FE3C01] transition-colors"
                  data-testid="button-book-demo"
                >
                  {t('dashboard.bookDemo')}
                </Button>
              </div>
            </motion.div>

            {/* ── Get Started Tasks ───────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35, ease: "easeOut" }}
              className="rounded-3xl border border-[#1A1613]/10 dark:border-border overflow-hidden bg-white dark:bg-card shadow-[0_18px_44px_-32px_rgba(26,22,19,0.25)]"
              data-tour="onboarding-tasks"
            >
              <div className="px-6 sm:px-8 pt-7 pb-6 sm:pt-8 sm:pb-8">
                <div className={`mb-6 ${isRtl ? 'text-right' : ''}`}>
                      <span className="inline-block text-xs font-semibold text-[#FE3C01] bg-[#FFE4D7] dark:bg-[#FE3C01]/15 px-3 py-1.5 rounded-full mb-3 tracking-wide">
                        02
                      </span>
                      <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1A1613] dark:text-foreground tracking-[-0.035em] leading-[1.05]">{t('dashboard.getStartedTitle')}<span className="text-[#FE3C01]">.</span></h2>
                      <p className="text-sm text-[#8A8078] dark:text-muted-foreground mt-2 max-w-xl">{t('dashboard.getStartedDesc')}</p>
                    </div>

                    {/* Animated progress bar */}
                    <div className="mb-6">
                      {(() => {
                        const adminFlags = canManage && !isIndividual ? [isCompanyVerified, onboardingTasks?.hasCompletedProfile, onboardingTasks?.hasVendors] : [];
                        const memberFlags = isIndividual
                          ? [hasProfileComplete, onboardingTasks?.hasReviewedProposal, onboardingTasks?.hasExploredMarketplace]
                          : [onboardingTasks?.hasTender, onboardingTasks?.hasReviewedProposal, onboardingTasks?.hasExploredMarketplace];
                        const allFlags = [...adminFlags, ...memberFlags];
                        const localCount = allFlags.filter(Boolean).length;
                        const total = allFlags.length;
                        const pct = total > 0 ? Math.round((localCount / total) * 100) : 0;
                        return (
                          <>
                            <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <span className="text-sm text-[#8A8078] dark:text-muted-foreground font-medium">
                                {localCount} {t('tenderFlow.ofLabel')} {total} {t('dashboard.tasksComplete')}
                              </span>
                              <span className="text-sm font-bold text-[#FE3C01] tabular-nums">{pct}%</span>
                            </div>
                            <div className="h-2 bg-white/70 dark:bg-gray-700 rounded-full overflow-hidden border border-[#FE3C01]/10">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-[#FE3C01] to-[#F19A8F]"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Tasks */}
                    <Accordion type="single" collapsible defaultValue={canManage ? "task-1" : "task-4"} className="space-y-3">

                      {/* Task 1: Get Verified (admins/owners only) */}
                      {canManage && (
                      <AccordionItem value="task-1" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${isCompanyVerified ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCompanyVerified ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {isCompanyVerified ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${isCompanyVerified ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task1Title')}</span>
                            {isCompanyVerified && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{isTeam ? t('dashboard.task1DescTeam') : t('dashboard.task1Desc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={() => setLocation('/settings?tab=company&highlight=verification')}
                                data-testid="button-task-get-verified"
                              >
                                {t('dashboard.task1Action')}
                              </Button>
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <GetVerifiedVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 2: Complete Company Profile (only for owners/admins) */}
                      {canManage && (
                      <AccordionItem value="task-2" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${onboardingTasks?.hasCompletedProfile ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasCompletedProfile ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasCompletedProfile ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasCompletedProfile ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{isTeam ? t('dashboard.task2TitleTeam') : t('dashboard.task2Title')}</span>
                            {onboardingTasks?.hasCompletedProfile && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{isTeam ? t('dashboard.task2DescTeam') : t('dashboard.task2Desc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={() => setLocation('/company-onboarding')}
                                data-testid="button-task-complete-profile"
                              >
                                {t('dashboard.task2Action')}
                              </Button>
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <CompanyProfileVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 3: Set Your Vendors Base (admins/owners only) */}
                      {canManage && (
                      <AccordionItem value="task-3" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${onboardingTasks?.hasVendors ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasVendors ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasVendors ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasVendors ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task3Title')}</span>
                            {onboardingTasks?.hasVendors && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task3Desc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={() => setActiveTab('vendors')}
                                data-testid="button-task-set-vendors"
                              >
                                {t('dashboard.task3Action')}
                              </Button>
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <VendorsBaseVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 4: Create your First RFP (company/team only) */}
                      {!isIndividual && <AccordionItem value="task-4" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${onboardingTasks?.hasTender ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasTender ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasTender ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasTender ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task4Title')}</span>
                            {onboardingTasks?.hasTender && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task4Desc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={handleCreateTender}
                                data-testid="button-task-create-rfp"
                              >
                                {t('dashboard.task4Action')}
                              </Button>
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <CreateTenderVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                      {/* Task 4b: Complete your profile (individual only) */}
                      {isIndividual && <AccordionItem value="task-4b" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${hasProfileComplete ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${hasProfileComplete ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {hasProfileComplete ? <Check className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${hasProfileComplete ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task4bTitle')}</span>
                            {hasProfileComplete && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task4bDesc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={() => setLocation('/company/edit')}
                                data-testid="button-task-complete-profile"
                              >
                                {t('dashboard.task4bAction')}
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                      {/* Task 5: Submit your First Proposal */}
                      <AccordionItem value="task-5" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${onboardingTasks?.hasReviewedProposal ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasReviewedProposal ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasReviewedProposal ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasReviewedProposal ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task5Title')}</span>
                            {onboardingTasks?.hasReviewedProposal && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task5Desc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={() => setActiveTab('proposals')}
                                data-testid="button-task-submit-proposal"
                              >
                                {t('dashboard.task5Action')}
                              </Button>
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <SubmitProposalVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 6: Explore Tenders Marketplace */}
                      <AccordionItem value="task-6" className={`border-2 rounded-2xl px-5 transition-all duration-300 ${onboardingTasks?.hasExploredMarketplace ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasExploredMarketplace ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasExploredMarketplace ? <Check className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'} ${onboardingTasks?.hasExploredMarketplace ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task6Title')}</span>
                            {onboardingTasks?.hasExploredMarketplace && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" />{t('dashboard.completed')}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task6Desc')}</p>
                              <Button
                                className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
                                onClick={handleExploreMarketplace}
                                data-testid="button-task-explore-marketplace"
                              >
                                {t('dashboard.task6Action')}
                              </Button>
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <TendersMarketplaceVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                    </Accordion>
                  </div>
                </motion.div>

          </TabsContent>

          {/* Tenders Tab */}
          {canManage && (
            <TabsContent value="tenders" className="space-y-6">
              {/* Header */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
<PageHeader
                num="02"
                title={t('dashboard.tendersTitle')}
                description={t('dashboard.tendersDesc')}
                isRtl={isRtl}
                titleTestId="text-tenders-title"
                descTestId="text-tenders-description"
                action={
                  <ParticleButton
                    onSuccess={handleCreateTender}
                    successDuration={600}
                    particleColor="bg-blue-400"
                    className="bg-[#FE3C01] hover:bg-[#1A1613] text-white rounded-full shadow-[0_10px_24px_-8px_rgba(254,60,1,0.5)] transition-colors"
                    data-testid="button-create-tender-header"
                  >
                    <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                    {t('dashboard.newTender')}
                  </ParticleButton>
                }
              />
              </motion.div>

              {/* Filters */}
              <Card {...brandCardProps()}>
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
                    <Select value={tenderTypeFilter} onValueChange={setTenderTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9" data-testid="filter-tender-type">
                        <SelectValue placeholder={t('dashboard.allTypes')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dashboard.allTypes')}</SelectItem>
                        {Object.entries(SUBMISSION_TYPE_LABELS_DASH).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={tenderOffersFilter} onValueChange={setTenderOffersFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9" data-testid="filter-tender-offers">
                        <SelectValue placeholder={t('dashboard.offersReceived')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dashboard.offersReceived')}</SelectItem>
                        <SelectItem value="none">{t('dashboard.noOffers')}</SelectItem>
                        <SelectItem value="1-5">1-5 {t('dashboard.offers')}</SelectItem>
                        <SelectItem value="6-10">6-10 {t('dashboard.offers')}</SelectItem>
                        <SelectItem value="10+">10+ {t('dashboard.offers')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Tenders List */}
              {loadingTenders ? (
                <SkeletonList items={3} />
              ) : filteredTenders.length === 0 ? (
                <Card {...brandCardProps()}>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="h-16 w-16 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-4 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                      <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="font-display font-black text-2xl mb-2 tracking-[-0.03em]" data-testid="text-no-tenders-title">
                      {t('dashboard.noTenders')}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6" data-testid="text-no-tenders-description">
                      {t('dashboard.noTendersDesc')}
                    </p>
                    {!tenderSearchQuery && tenderFilter === 'all' && tenderTypeFilter === 'all' && tenderOffersFilter === 'all' && (
                      <Button
                        onClick={handleCreateTender}
                        className="bg-[var(--bid-orange)] hover:bg-[var(--bid-orange)]/90 text-white"
                        data-testid="button-create-first-tender"
                      >
                        <Plus className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                        {t('dashboard.createTender')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                      {filteredTenders.map((tender) => {
                        const statusBadge = getStatusBadge(tender.status, tender.deadline);
                        const isDeadlineSoon = new Date(tender.deadline).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                        const isReadyToNegotiate = tender.status === 'closed' && tender.offersCount >= 2 && !incomingOffers.some(o => o.tenderId === tender.id && o.status === 'accepted');
                        const getSpotlightColor = (status: string): 'green' | 'red' | 'orange' => {
                          switch (status) {
                            case 'cancelled': return 'red';
                            default: return 'orange';
                          }
                        };
                        
                        return (
                          <SpotlightCard
                            key={tender.id}
                            {...brandSpotlightProps()}
                            spotlightColor={getSpotlightColor(tender.status)}
                            data-testid={`card-tender-${tender.id}`}
                          >
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 
                                      className="text-xl font-bold text-foreground cursor-pointer hover:text-[var(--bid-orange)]"
                                      onClick={() => setLocation(`/tenders/${tender.id}`)}
                                      data-testid={`text-tender-title-${tender.id}`}
                                    >
                                      {tender.title}
                                    </h3>
                                    <StatusBadge
                                      state={statusBadge.state}
                                      label={statusBadge.label}
                                      data-testid={`badge-status-${tender.id}`}
                                    />
                                    {isReadyToNegotiate && (
                                      <span className="text-[9px] font-bold bg-[#FE3C01] text-white px-2 py-0.5 rounded-full animate-pulse">
                                        {t('dashboard.negotiateBadge')}
                                      </span>
                                    )}
                                    {tender.targetAudienceTypes && tender.targetAudienceTypes.length > 0 && tender.targetAudienceTypes.map((type: string) => (
                                      <span key={type} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border text-muted-foreground bg-muted">
                                        {type === 'company' ? 'Companies' : type === 'team' ? 'Teams' : 'Individuals'}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-sm font-medium text-muted-foreground line-clamp-2" data-testid={`text-tender-description-${tender.id}`}>
                                    {tender.description}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Calendar className="h-4 w-4" />
                                  <span className={`font-mono ${isDeadlineSoon ? 'text-[var(--state-lost)] font-semibold' : ''}`}>
                                    {formatDate(tender.deadline)}
                                  </span>
                                </div>
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Send className="h-4 w-4" />
                                  <span data-testid={`text-proposals-count-${tender.id}`}>
                                    <span className="font-mono">{tender.offersCount}</span> {t('dashboard.offers')}
                                  </span>
                                </div>
                                {tender.submissionType && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <FileText className="h-4 w-4" />
                                  <span>{SUBMISSION_TYPE_LABELS_DASH[tender.submissionType] || tender.submissionType}</span>
                                </div>
                                )}
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                                  className="text-red-600 hover:text-red-700 dark:text-red-300 hover:bg-red-50"
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
              )}
            </TabsContent>
          )}

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
<PageHeader
              num="03"
              title={t('dashboard.proposalsTitle')}
              description={t('dashboard.proposalsDesc')}
              isRtl={isRtl}
              titleTestId="text-proposals-title"
              descTestId="text-proposals-description"
            />
            </motion.div>

            <Tabs value={(isIndividual || isTeam) ? 'submitted' : proposalsSubTab} onValueChange={(v) => { setProposalsSubTab(v); localStorage.setItem('dashboard-proposals-tab', v); }} className="space-y-4">
              {!isIndividual && !isTeam && (
              <TabsList className={`grid w-full max-w-md grid-cols-2 ${BRAND_TABSLIST}`}>
                <TabsTrigger value="submitted" className={`gap-2 ${BRAND_TABTRIGGER}`} data-testid="tab-submitted-proposals">
                  <Send className="h-4 w-4" />
                  {t('dashboard.myProposals')} ({myOffers.length})
                </TabsTrigger>
                <TabsTrigger value="received" className={`gap-2 ${BRAND_TABTRIGGER}`} data-testid="tab-received-proposals">
                  <Inbox className="h-4 w-4" />
                  {t('dashboard.incomingOffers')} ({incomingOffers.length})
                </TabsTrigger>
              </TabsList>
              )}

              {/* Submitted Proposals Sub-Tab */}
              <TabsContent value="submitted" className="space-y-4">
                {loadingMyOffers ? (
                  <SkeletonList items={3} />
                ) : myOffers.length === 0 ? (
                  <Card {...brandCardProps()}>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="h-14 w-14 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-3 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                        <Send className="h-7 w-7" />
                      </div>
                      <p className="font-display font-black text-2xl tracking-[-0.03em]">{t('dashboard.noProposals')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('dashboard.noProposalsDesc')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                        {myOffers.map((offer) => {
                          const isExpired = new Date(offer.tender.deadline) < new Date();
                          const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                        <SpotlightCard
                          key={offer.id}
                          {...brandSpotlightProps()}
                          spotlightColor={offer.status === 'accepted' ? 'green' : offer.status === 'rejected' ? 'red' : 'orange'}
                          data-testid={`card-my-offer-${offer.id}`}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3
                                    className="text-xl font-bold text-foreground cursor-pointer hover:text-[var(--bid-orange)]"
                                    onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  >
                                    {offer.tender.title}
                                  </h3>
                                  <StatusBadge
                                    state={tenderStatusToState(offer.tender.status)}
                                    label={offer.tender.status.charAt(0).toUpperCase() + offer.tender.status.slice(1)}
                                  />
                                  {offer.status === 'accepted' && (
                                    <StatusBadge
                                      state={proposalStatusToState(offer.status)}
                                      label={t('dashboard.accepted')}
                                    />
                                  )}
                                  {offer.status === 'rejected' && (
                                    <StatusBadge state="lost" label={t('dashboard.rejected')} />
                                  )}
                                  {offer.status === 'pending' && (
                                    <StatusBadge state="pending" label={t('dashboard.pending')} />
                                  )}
                                  {offer.status === 'shortlisted' && (
                                    <StatusBadge state="decision" label={t('dashboard.shortlisted')} />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                                  {offer.tender.description || t('dashboard.noDescription')}
                                </p>
                              </div>
                            </div>

                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {t('dashboard.submitted')} {new Date(offer.submittedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className={`flex items-center gap-2 font-medium ${isRtl ? 'flex-row-reverse' : ''} ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                <Clock className="h-4 w-4" />
                                <span>
                                  {isExpired ? t('dashboard.deadlinePassed') : `${daysRemaining} ${t('dashboard.daysLeft')}`}
                                </span>
                              </div>
                              {offer.notes && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium col-span-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <FileText className="h-4 w-4" />
                                  <span className="italic line-clamp-1">"{offer.notes}"</span>
                                </div>
                              )}
                            </div>

                            <div className={`flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                data-testid={`button-view-tender-${offer.id}`}
                              >
                                <Eye className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('dashboard.viewTender')}
                              </Button>
                              {offer.combinedFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)}
                                  title={t('dashboard.combinedProposal')}
                                >
                                  <FileText className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
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
                                  <FileText className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                </Button>
                              )}
                              {offer.financialFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                  title={t('dashboard.financialProposal')}
                                >
                                  <DollarSign className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                </Button>
                              )}
                              {offer.videoUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(offer.videoUrl!, '_blank')}
                                  title={t('dashboard.videoPitchLabel')}
                                >
                                  <Video className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </SpotlightCard>
                          );
                        })}
                  </div>
                )}
              </TabsContent>

              {/* Received Proposals Sub-Tab — company only */}
              {!isIndividual && !isTeam && <TabsContent value="received" className="space-y-4">
                {loadingIncomingOffers ? (
                  <SkeletonList items={3} />
                ) : incomingOffers.length === 0 ? (
                  <Card {...brandCardProps()}>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="h-14 w-14 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-3 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                        <Inbox className="h-7 w-7" />
                      </div>
                      <p className="font-display font-black text-2xl tracking-[-0.03em]">{t('dashboard.noIncomingOffers')}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('dashboard.noIncomingOffersDesc')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                        {incomingOffers.map((offer) => {
                      const isExpired = new Date(offer.tender.deadline) < new Date();
                      const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <SpotlightCard
                          key={offer.id}
                          {...brandSpotlightProps()}
                          spotlightColor={offer.status === 'accepted' ? 'green' : offer.status === 'rejected' ? 'red' : 'orange'}
                          data-testid={`card-incoming-offer-${offer.id}`}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-xl font-bold text-foreground">
                                    {offer.profile?.displayName || offer.company.name}
                                  </h3>
                                  {offer.company.verificationStatus === 'verified' && (
                                    <Badge variant="secondary" className="text-xs">{t('dashboard.verified')}</Badge>
                                  )}
                                  {offer.status === 'accepted' && (
                                    <Badge className="bg-green-100 text-green-800 dark:text-green-300 text-xs">
                                      <CheckCircle className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.accepted')}
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-muted text-muted-foreground text-xs">
                                      <XCircle className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.rejected')}
                                    </Badge>
                                  )}
                                  {offer.status === 'shortlisted' && (
                                    <Badge className="bg-[#FE3C01]/10 text-[#FE3C01] dark:text-[#FE3C01] text-xs">
                                      <Bookmark className={`h-3 w-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                                      {t('dashboard.shortlisted')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                  {t('dashboard.forTender')} <span
                                    className="cursor-pointer hover:text-[var(--bid-orange)] font-bold"
                                    onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                  >
                                    {offer.tender.title}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {t('dashboard.received')} {new Date(offer.submittedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className={`flex items-center gap-2 font-medium ${isRtl ? 'flex-row-reverse' : ''} ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                <Clock className="h-4 w-4" />
                                <span>
                                  {isExpired ? t('dashboard.deadlinePassed') : `${daysRemaining} ${t('dashboard.daysLeft')}`}
                                </span>
                              </div>
                              {offer.company.category && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Building2 className="h-4 w-4" />
                                  <span>{offer.company.category}</span>
                                </div>
                              )}
                              {offer.quotePrice && (
                                <div className={`flex items-center gap-2 font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <DollarSign className="h-4 w-4 text-[var(--state-won)]" />
                                  <span className="text-[var(--state-won)]">SAR {offer.quotePrice.toLocaleString()}</span>
                                </div>
                              )}
                            </div>

                            {offer.notes && (
                              <p className="text-sm mb-4 text-muted-foreground italic">"{offer.notes}"</p>
                            )}

                            <div className={`flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (offer.company?.slug) {
                                    window.open(`/company/${offer.company.slug}`, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                disabled={!offer.company?.slug}
                                data-testid={`button-view-offer-${offer.id}`}
                              >
                                <Eye className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('dashboard.view')}
                              </Button>
                              {offer.combinedFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)}
                                  title={t('dashboard.combinedProposalLabel')}
                                >
                                  <FileText className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
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
                                  <FileText className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                </Button>
                              )}
                              {offer.financialFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                  title={t('dashboard.financialProposal')}
                                >
                                  <DollarSign className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                </Button>
                              )}
                              {offer.videoUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(offer.videoUrl!, '_blank')}
                                  title={t('dashboard.videoPitchLabel')}
                                >
                                  <Video className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="bg-[#FE3C01] hover:bg-[#d54d35] text-white"
                                onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                data-testid={`button-review-tender-${offer.id}`}
                              >
                                <ExternalLink className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('dashboard.viewTender')}
                              </Button>
                            </div>
                          </div>
                        </SpotlightCard>
                        );
                        })}
                  </div>
                )}
              </TabsContent>}
            </Tabs>
          </TabsContent>

          {/* Vendors Base Tab */}
          {canManage && (
            <TabsContent value="vendors" className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
<PageHeader
                num="04"
                title={t('dashboard.vendorsBaseTitle')}
                description={t('dashboard.vendorsBaseDesc')}
                isRtl={isRtl}
                titleTestId="text-vendors-title"
                descTestId="text-vendors-description"
              />
              </motion.div>

              {/* Traction Link Card */}
              <Card {...brandCardProps('border-dashed')}>
                <CardContent className="pt-6">
                  {activeCompany?.profile?.tractionSlug ? (
                    <div className="space-y-3">
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center">
                          <Link2 className="h-4 w-4 text-[#FE3C01]" />
                        </div>
                        <div className={isRtl ? 'text-right' : ''}>
                          <p className="text-sm font-semibold">{t('dashboard.yourTractionLink')}</p>
                          <p className="text-xs text-muted-foreground">{t('dashboard.shareLinkWithVendors')}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                          {window.location.origin}/traction/{activeCompany.profile.tractionSlug}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/traction/${activeCompany.profile?.tractionSlug}`);
                            toast({ title: t('dashboard.linkCopied'), description: t('dashboard.linkCopiedDesc') });
                          }}
                          data-testid="button-copy-traction-link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <a
                          href={`/traction/${activeCompany.profile.tractionSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" data-testid="button-preview-traction">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        <a href={`/traction/${activeCompany.profile.tractionSlug}/edit`}>
                          <Button variant="outline" size="sm" data-testid="button-customize-traction">
                            <Paintbrush className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <TractionSlugSetup companyName={activeCompany?.name || ''} isRtl={isRtl} />
                  )}
                </CardContent>
              </Card>

              <Tabs value={vendorsSubTab} onValueChange={(v) => { setVendorsSubTab(v); localStorage.setItem('dashboard-vendors-tab', v); }} className="space-y-4">
                <TabsList className={`flex w-full max-w-2xl overflow-x-auto sm:grid sm:grid-cols-3 ${BRAND_TABSLIST}`} data-tour="vendors-tabs">
                  <TabsTrigger value="vendors-list" className={`gap-2 flex-shrink-0 sm:flex-1 whitespace-nowrap ${BRAND_TABTRIGGER}`} data-testid="tab-vendors-list">
                    <Users className="h-4 w-4" />
                    {t('dashboard.vendorsBase')} ({vendors.length})
                  </TabsTrigger>
                  <TabsTrigger value="discover" className={`gap-2 flex-shrink-0 sm:flex-1 whitespace-nowrap ${BRAND_TABTRIGGER}`} data-testid="tab-discover-individuals">
                    <Search className="h-4 w-4" />
                    {t('directory.title')}
                  </TabsTrigger>
                  <TabsTrigger value="join-requests" className={`gap-2 flex-shrink-0 sm:flex-1 whitespace-nowrap ${BRAND_TABTRIGGER}`} data-testid="tab-join-requests" data-tour="vendors-requests-tab">
                    <UserPlus className="h-4 w-4" />
                    {t('dashboard.pendingRequests')}
                    {pendingRequests.length > 0 && (
                      <Badge variant="destructive" className={isRtl ? 'mr-2' : 'ml-2'} data-testid="badge-pending-count">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Discover individuals Sub-Tab */}
                <TabsContent value="discover" className="space-y-4">
                  <div className="max-w-[52ch]">
                    <p className="text-sm text-muted-foreground">
                      {t('directory.intro')}
                    </p>
                  </div>
                  <IndividualsDirectory />
                </TabsContent>

                {/* Vendors List Sub-Tab */}
                <TabsContent value="vendors-list" className="space-y-4">
                  {/* Search */}
                  <Card {...brandCardProps()} data-tour="vendors-search">
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
                      <SelectTrigger className="w-full sm:w-[160px] h-9" data-testid="filter-category">
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
                      <SelectTrigger className="w-full sm:w-[160px] h-9" data-testid="filter-city">
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
                      <SelectTrigger className="w-full sm:w-[160px] h-9" data-testid="filter-verification">
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
                    <SkeletonList items={4} />
                  ) : filteredVendors.length === 0 ? (
                    <Card {...brandCardProps()}>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="h-16 w-16 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-4 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                          <Users className="h-8 w-8" />
                        </div>
                        <h3 className="font-display font-black text-2xl mb-2 tracking-[-0.03em]" data-testid="text-empty-vendors-title">
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
                        <SpotlightCard key={vendor.id} {...brandSpotlightProps()} spotlightColor="orange" data-testid={`card-vendor-${vendor.id}`}>
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-bold text-foreground" data-testid={`text-vendor-name-${vendor.id}`}>
                                      {vendor.company}
                                    </h3>
                                    {vendor.verificationStatus === 'verified' && (
                                      <Badge variant="secondary" className="gap-1" data-testid={`badge-verified-${vendor.id}`}>
                                        <CheckCircle className="h-3 w-3" />
                                        {t('dashboard.verified')}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-muted-foreground" data-testid={`text-vendor-category-${vendor.id}`}>
                                    {vendor.category}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={vendor.joinMethod === 'invitation' ? 'default' : 'outline'}
                                data-testid={`badge-join-method-${vendor.id}`}
                              >
                                {vendor.joinMethod === 'invitation' ? t('dashboard.invitedMethod') : vendor.joinMethod === 'proposal_accepted' ? t('dashboard.viaProposal') : t('dashboard.appliedViaTraction')}
                              </Badge>
                            </div>

                            {vendor.bio && (
                              <p className="text-sm font-medium text-muted-foreground line-clamp-2 mb-4" data-testid={`text-vendor-bio-${vendor.id}`}>
                                {vendor.bio}
                              </p>
                            )}

                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                              {vendor.city && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Building2 className="h-4 w-4" />
                                  <span>{vendor.city}</span>
                                </div>
                              )}
                            </div>

                            <div className={`flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (vendor.slug) {
                                    window.open(`/company/${vendor.slug}`, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                disabled={!vendor.slug}
                                data-testid={`button-view-vendor-${vendor.id}`}
                              >
                                <Eye className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('dashboard.view')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
                                onClick={() => setVendorToRemove({ id: vendor.id, companyId: vendor.companyId, name: vendor.company })}
                                data-testid={`button-remove-vendor-${vendor.id}`}
                              >
                                <Trash2 className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                {t('dashboard.remove')}
                              </Button>
                            </div>
                          </div>
                        </SpotlightCard>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Join Requests Sub-Tab */}
                <TabsContent value="join-requests" className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <Card {...brandCardProps()}>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="h-14 w-14 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-3 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                          <UserPlus className="h-7 w-7" />
                        </div>
                        <p className="font-display font-black text-2xl tracking-[-0.03em]" data-testid="text-no-requests">
                          {t('dashboard.noPendingRequests')}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className={isRtl ? 'text-right' : ''}>
                        <h3 className={`text-lg font-semibold flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`} data-testid="text-pending-title">
                          <UserPlus className="h-5 w-5" />
                          {t('dashboard.pendingRequests')} ({pendingRequests.length})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t('dashboard.vendorsBaseDesc')}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {pendingRequests.map((request) => {
                          const initials = (request.vendor?.company || 'U')
                            .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                          const timeAgo = request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                          return (
                            <SpotlightCard
                              key={request.id}
                              {...brandSpotlightProps()}
                              spotlightColor={request.vendor?.verificationStatus === 'verified' ? 'green' : 'orange'}
                              data-testid={`card-request-${request.id}`}
                            >
                              <div className="p-6">
                                <div className={`flex items-start justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                    {request.vendor?.logoUrl ? (
                                      <img
                                        src={request.vendor.logoUrl}
                                        alt={request.vendor.company}
                                        className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0 bg-card"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                                        <span className="text-sm font-bold text-primary">{initials}</span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className={`flex items-center gap-3 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                        <h3 className="text-xl font-bold text-foreground truncate" data-testid={`text-request-company-${request.id}`}>
                                          {request.vendor?.company || t('dashboard.unknownVendor')}
                                        </h3>
                                        <Badge
                                          variant="outline"
                                          className={
                                            request.vendor?.verificationStatus === 'verified'
                                              ? 'bg-[var(--state-won)]/5 text-[var(--state-won)] border-emerald-200 text-xs px-2 py-0'
                                              : request.vendor?.verificationStatus === 'under_review'
                                              ? 'bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200 text-xs px-2 py-0'
                                              : 'bg-muted text-muted-foreground border-border text-xs px-2 py-0'
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
                                    </div>
                                  </div>
                                </div>

                                {request.vendor?.bio && (
                                  <p className="text-sm font-medium text-muted-foreground line-clamp-2 mb-4">
                                    {request.vendor.bio}
                                  </p>
                                )}

                                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                                  {request.vendor?.expertise && (
                                    <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`} data-testid={`text-request-category-${request.id}`}>
                                      <Briefcase className="h-4 w-4" />
                                      <span>{request.vendor.expertise}</span>
                                    </div>
                                  )}
                                  {request.vendor?.websiteUrl && (
                                    <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                      <Globe className="h-4 w-4" />
                                      <a
                                        href={request.vendor.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline hover:text-[var(--bid-orange)] truncate max-w-[160px]"
                                      >
                                        {request.vendor.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                                      </a>
                                    </div>
                                  )}
                                  {timeAgo && (
                                    <div className={`flex items-center gap-2 text-muted-foreground font-medium ${isRtl ? 'flex-row-reverse' : ''}`}>
                                      <Calendar className="h-4 w-4" />
                                      <span>{timeAgo}</span>
                                    </div>
                                  )}
                                </div>

                                <div className={`flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (request.vendor?.slug) {
                                        window.open(`/company/${request.vendor.slug}`, '_blank', 'noopener,noreferrer');
                                      }
                                    }}
                                    disabled={!request.vendor?.slug}
                                    data-testid={`button-view-profile-${request.id}`}
                                  >
                                    <Eye className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                    {t('dashboard.view')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300"
                                    onClick={() => rejectRequest.mutate(request.id)}
                                    disabled={rejectRequest.isPending}
                                    data-testid={`button-reject-${request.id}`}
                                  >
                                    <XCircle className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                    {t('dashboard.reject')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-[var(--state-won)] hover:bg-[var(--state-won)]/90 text-white"
                                    onClick={() => approveRequest.mutate(request.id)}
                                    disabled={approveRequest.isPending}
                                    data-testid={`button-approve-${request.id}`}
                                  >
                                    {approveRequest.isPending ? (
                                      <Loader2 className={`h-4 w-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                    ) : (
                                      <CheckCircle className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                                    )}
                                    {t('dashboard.approve')}
                                  </Button>
                                </div>
                              </div>
                            </SpotlightCard>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vendor Profile Drawer */}
                  {profileJoinRequestId && (
                    <VendorProfileDrawer
                      open={profileDrawerOpen}
                      onClose={() => {
                        setProfileDrawerOpen(false);
                        setProfileJoinRequestId(null);
                      }}
                      joinRequestId={profileJoinRequestId}
                      showActions
                      onApprove={(id) => approveRequest.mutate(id)}
                      onDecline={(id) => rejectRequest.mutate(id)}
                      isApproving={approveRequest.isPending}
                      isDeclining={rejectRequest.isPending}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}

          {/* ══════════════════════ MY PROFILE LINK TAB (freelancers & teams only) ══════════════════════ */}
          {(isIndividual || isTeam) && (() => {
            const profileUrl = `${window.location.origin}/company/${activeCompany.slug}`;
            const pl = profileLinkData?.profile;

            // Completion items — labels/descriptions adapt to account type
            const completionItems = isIndividual ? [
              { section: 'basics',       label: t('dashboard.completionBasicsFreelancer'),       description: t('dashboard.completionBasicsFreelancerDesc'),       complete: !!(pl?.bio && pl.bio.length > 0) },
              { section: 'media',        label: t('dashboard.completionPhotoFreelancer'),        description: t('dashboard.completionPhotoFreelancerDesc'),         complete: !!(pl?.logoUrl) },
              { section: 'availability', label: t('dashboard.completionAvailabilityFreelancer'), description: t('dashboard.completionAvailabilityFreelancerDesc'),  complete: !!(pl?.availabilityStatus) },
              { section: 'capabilities', label: t('dashboard.completionSkillsFreelancer'),       description: t('dashboard.completionSkillsFreelancerDesc'),         complete: !!(pl?.tags?.length) },
              { section: 'facts',        label: t('dashboard.completionReachFreelancer'),        description: t('dashboard.completionReachFreelancerDesc'),          complete: !!(pl?.serviceAreas?.length || pl?.languages?.length) },
              { section: 'credentials', label: t('dashboard.completionCredentialsFreelancer'),   description: t('dashboard.completionCredentialsFreelancerDesc'),    complete: !!(pl?.certifications?.length || pl?.insurancePolicies?.length) },
              { section: 'links',        label: t('dashboard.completionLinksFreelancer'),        description: t('dashboard.completionLinksFreelancerDesc'),          complete: !!(pl?.socialLinks?.website || pl?.socialLinks?.linkedin) },
            ] : [
              { section: 'basics',       label: t('dashboard.completionBasicsTeam'),       description: t('dashboard.completionBasicsTeamDesc'),       complete: !!(pl?.bio && pl.bio.length > 0) },
              { section: 'media',        label: t('dashboard.completionPhotoTeam'),        description: t('dashboard.completionPhotoTeamDesc'),         complete: !!(pl?.logoUrl) },
              { section: 'availability', label: t('dashboard.completionAvailabilityTeam'), description: t('dashboard.completionAvailabilityTeamDesc'),  complete: !!(pl?.availabilityStatus) },
              { section: 'capabilities', label: t('dashboard.completionSkillsTeam'),       description: t('dashboard.completionSkillsTeamDesc'),         complete: !!(pl?.tags?.length) },
              { section: 'facts',        label: t('dashboard.completionReachTeam'),        description: t('dashboard.completionReachTeamDesc'),          complete: !!(pl?.serviceAreas?.length || pl?.languages?.length) },
              { section: 'credentials', label: t('dashboard.completionCredentialsTeam'),   description: t('dashboard.completionCredentialsTeamDesc'),    complete: !!(pl?.certifications?.length || pl?.insurancePolicies?.length) },
              { section: 'links',        label: t('dashboard.completionLinksTeam'),        description: t('dashboard.completionLinksTeamDesc'),          complete: !!(pl?.socialLinks?.website || pl?.socialLinks?.linkedin) },
            ];
            const completedCount = completionItems.filter(i => i.complete).length;
            const totalSections = completionItems.length;

            // Embed snippet builders
            const jsStr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/<\/script/gi, '<\\/script');
            const htmlAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            const inlineSnippet = `<!-- Bid profile inline embed -->\n<div style="min-width:320px;height:700px;">\n  <iframe\n    src="${htmlAttr(profileUrl)}"\n    width="100%"\n    height="100%"\n    frameborder="0"\n    style="border:0;border-radius:12px;"\n    title="${htmlAttr(activeCompany.profile?.displayName || activeCompany.name)}"\n  ></iframe>\n</div>`;

            const popupSnippet = `<!-- Bid profile popup widget -->\n<script>\n(function(){\n  var u="${jsStr(profileUrl)}";\n  function openProfile(){\n    var o=document.createElement('div');\n    o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;';\n    o.onclick=function(e){if(e.target===o)document.body.removeChild(o);};\n    var b=document.createElement('div');\n    b.style.cssText='background:#fff;border-radius:12px;width:100%;max-width:900px;height:90vh;max-height:720px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);';\n    var x=document.createElement('button');\n    x.innerHTML='&times;';x.setAttribute('aria-label','Close');\n    x.style.cssText='position:absolute;top:10px;right:12px;background:#fff;border:1px solid #e5e7eb;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer;z-index:1;';\n    x.onclick=function(){document.body.removeChild(o);};\n    var f=document.createElement('iframe');\n    f.src=u;f.style.cssText='width:100%;height:100%;border:0;';\n    b.appendChild(f);b.appendChild(x);o.appendChild(b);document.body.appendChild(o);\n  }\n  var btn=document.createElement('button');\n  btn.type='button';btn.innerText='View Profile';\n  btn.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483646;padding:12px 22px;background:#FE3C01;color:#fff;border:0;border-radius:28px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.18);';\n  btn.onclick=openProfile;\n  document.body.appendChild(btn);\n})();\n<\/script>`;

            const textSnippet = `<!-- Bid profile text link -->\n<a href="${htmlAttr(profileUrl)}" style="color:#FE3C01;font-weight:600;text-decoration:underline;">${htmlAttr(activeCompany.profile?.displayName || activeCompany.name)}</a>`;

            const snippets = { inline: inlineSnippet, popup: popupSnippet, text: textSnippet };
            const currentSnippet = snippets[profileEmbedVariant];

            const embedVariantDescs: Record<string, string> = {
              inline: t('tractionPage.editorEmbedInlineDesc'),
              popup: t('tractionPage.editorEmbedPopupDesc'),
              text: t('tractionPage.editorEmbedTextDesc'),
            };

            const copyProfileLink = async () => {
              await navigator.clipboard.writeText(profileUrl);
              setProfileLinkCopied(true);
              setTimeout(() => setProfileLinkCopied(false), 2000);
            };

            const copyEmbed = async () => {
              await navigator.clipboard.writeText(currentSnippet);
              setProfileEmbedCopied(true);
              setTimeout(() => setProfileEmbedCopied(false), 2000);
            };

            return (
              <TabsContent value="profile-link" className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
<PageHeader
                  num="05"
                  title={isIndividual ? t('dashboard.profileLinkTitleFreelancer') : t('dashboard.profileLinkTitleTeam')}
                  description={isIndividual ? t('dashboard.profileLinkDescFreelancer') : t('dashboard.profileLinkDescTeam')}
                  isRtl={isRtl}
                  titleTestId="text-profile-link-title"
                  descTestId="text-profile-link-description"
                />
                </motion.div>

                {/* ─── Profile Link Card ─── */}
                <Card {...brandCardProps()}>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{t('dashboard.yourProfileLink')}</p>
                      <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                          {profileUrl}
                        </div>
                        <Button variant="outline" size="sm" onClick={copyProfileLink} className="flex-shrink-0 gap-1.5">
                          {profileLinkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {profileLinkCopied ? t('dashboard.copied') : t('dashboard.copyLink')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`/company/${activeCompany.slug}`, '_blank')} className="flex-shrink-0 gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t('dashboard.viewProfile')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setLocation('/company/edit')} className="flex-shrink-0 gap-1.5">
                          <Edit className="h-3.5 w-3.5" />
                          {t('dashboard.editProfile')}
                        </Button>
                      </div>
                    </div>

                    {/* Share / Embed */}
                    <Collapsible open={profileEmbedOpen} onOpenChange={setProfileEmbedOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground px-0">
                          <Code2 className="h-4 w-4" />
                          {t('dashboard.shareEmbed')}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${profileEmbedOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['inline', 'popup', 'text'] as const).map(v => (
                            <button
                              key={v}
                              onClick={() => setProfileEmbedVariant(v)}
                              className={`px-2 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                                profileEmbedVariant === v
                                  ? 'bg-card ring-2 ring-offset-1 text-foreground'
                                  : 'bg-muted border border-border text-muted-foreground hover:text-foreground'
                              }`}
                              style={profileEmbedVariant === v ? { '--tw-ring-color': '#FE3C01' } as React.CSSProperties : undefined}
                            >
                              {t(`tractionPage.editorEmbed${v.charAt(0).toUpperCase()}${v.slice(1)}`)}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{embedVariantDescs[profileEmbedVariant]}</p>
                        <Textarea
                          readOnly
                          value={currentSnippet}
                          rows={6}
                          className="font-mono text-[10px] bg-muted resize-none"
                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={copyEmbed}>
                          {profileEmbedCopied
                            ? <><Check className="h-3.5 w-3.5" />{t('tractionPage.editorEmbedCopied')}</>
                            : <><Copy className="h-3.5 w-3.5" />{t('tractionPage.editorCopyEmbed')}</>
                          }
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>

                {/* ─── Profile Completion Card ─── */}
                <Card {...brandCardProps()}>
                  <CardContent className="pt-6 space-y-5">
                    <div>
                      <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <h3 className="text-sm font-semibold text-foreground">{t('dashboard.profileCompletion')}</h3>
                        <span className="text-sm font-bold" style={{ color: '#FE3C01' }}>
                          {profileLinkData ? `${completedCount}/${totalSections}` : '—'}
                        </span>
                      </div>
                      <Progress
                        value={profileLinkData ? (completedCount / totalSections) * 100 : 0}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">{t('dashboard.profileCompletionHint')}</p>
                    </div>

                    {!profileLinkData ? (
                      <div className="space-y-2">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className="h-[60px] rounded-xl bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {completionItems.map(item => (
                          <div
                            key={item.section}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                              item.complete
                                ? 'border-emerald-100 bg-emerald-50/40'
                                : 'border-border bg-muted/30'
                            }`}
                          >
                            <div className={`flex items-center gap-3 min-w-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              {item.complete
                                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                : <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                              }
                              <div className={`min-w-0 ${isRtl ? 'text-right' : ''}`}>
                                <p className={`text-sm font-semibold ${item.complete ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {item.label}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">{item.description}</p>
                              </div>
                            </div>
                            {!item.complete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0 text-xs gap-0.5 hover:bg-[#FE3C01]/5"
                                style={{ color: '#FE3C01' }}
                                onClick={() => setLocation(`/company/edit?section=${item.section}`)}
                              >
                                {t('dashboard.fillIn')}
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })()}

          </Tabs>
        </main>

      {/* Remove Vendor Confirmation */}
      <AlertDialog open={!!vendorToRemove} onOpenChange={(open) => !open && setVendorToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.removeVendorTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.removeVendorDesc', { name: vendorToRemove?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => vendorToRemove && removeVendorMutation.mutate({ id: vendorToRemove.id, name: vendorToRemove.name })}
            >
              {removeVendorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('dashboard.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <div className="flex items-center justify-between p-3 bg-[var(--state-won)]/5 rounded-lg mb-2">
                    <span className="text-sm text-muted-foreground">{t('dashboard.priceQuoteLabel')}</span>
                    <span className="text-lg font-bold text-[var(--state-won)]">SAR {selectedProposal.quotePrice.toLocaleString()}</span>
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

              {/* Accept/Shortlist/Ignore Actions */}
              {(selectedProposal.status === 'pending' || selectedProposal.status === 'shortlisted') && (
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
                  {selectedProposal.status === 'pending' && (
                    <Button
                      variant="outline"
                      className="flex-1 border-blue-300 text-[var(--bid-orange)] hover:bg-[var(--bid-orange)]/5"
                      size="sm"
                      onClick={() => {
                        updateOfferStatus.mutate({ offerId: selectedProposal.id, status: 'shortlisted' });
                        setSelectedProposal(null);
                      }}
                    >
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      {t('dashboard.shortlist')}
                    </Button>
                  )}
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

              {selectedProposal.status === 'shortlisted' && (
                <div className="flex items-center justify-center gap-2 p-3 bg-[var(--bid-orange)]/5 dark:bg-blue-950/20 rounded-lg border-t mt-4 pt-4">
                  <Bookmark className="h-5 w-5 text-[var(--bid-orange)]" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">{t('dashboard.shortlisted')}</span>
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
                  <Badge className="bg-green-100 text-green-800 dark:text-green-300">
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
                <div className="w-12 h-12 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[#FE3C01]" />
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
                <Badge className="bg-[var(--bid-orange)]/10 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
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
                  <p className="font-display font-black text-3xl text-[var(--bid-orange)] tracking-[-0.04em] tabular-nums">{tenders.length}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.tenders')}</p>
                </div>
              )}
              <div className="text-center">
                <p className="font-display font-black text-3xl text-[var(--bid-ink)] dark:text-[var(--bid-cream)] tracking-[-0.04em] tabular-nums">{incomingOffers.length + myOffers.length}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.proposals')}</p>
              </div>
              {canManage && (
                <div className="text-center">
                  <p className="font-display font-black text-3xl text-[var(--bid-ink)] dark:text-[var(--bid-cream)] tracking-[-0.04em] tabular-nums">{vendors.length}</p>
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

    {/* ── Mobile bottom tab bar — primary navigation on phones. Replaces the
           hamburger→drawer as the way to move between dashboard sections;
           the drawer stays available for secondary items (marketplace,
           profile, settings). Safe-area aware. ── */}
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className={`flex items-stretch ${isRtl ? 'flex-row-reverse' : ''}`}>
        {sidebarItems.filter(i => i.show).slice(0, 4).map((item) => {
          const ActiveIcon = item.icon;
          const active = activeTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => { setActiveTab(item.value); mainRef.current?.scrollTo({ top: 0 }); }}
              aria-current={active ? 'page' : undefined}
              data-testid={`bottomnav-${item.value}`}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 text-[11px] font-medium transition-colors ${
                active ? 'text-[#FE3C01]' : 'text-muted-foreground'
              }`}
            >
              <ActiveIcon className="h-5 w-5" aria-hidden />
              <span className="truncate max-w-full leading-none">{item.label}</span>
              <span className={`h-1 w-1 rounded-full ${active ? 'bg-[#FE3C01]' : 'bg-transparent'}`} aria-hidden />
            </button>
          );
        })}
      </div>
    </nav>

    {/* Verification required dialog */}
    <Dialog open={showUnverifiedDialog} onOpenChange={setShowUnverifiedDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {activeCompany.verificationStatus === 'under_review'
              ? t('dashboard.verificationPending')
              : activeCompany.verificationStatus === 'rejected'
                ? t('dashboard.verificationRejected')
                : isTeam ? t('dashboard.teamVerificationRequired') : t('dashboard.verificationRequired')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              {activeCompany.verificationStatus === 'under_review' ? (
                <>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{t('dashboard.verificationPending')}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {isTeam ? t('dashboard.teamVerificationUnderReviewDesc') : t('dashboard.verificationUnderReviewDesc')}
                  </p>
                </>
              ) : activeCompany.verificationStatus === 'rejected' ? (
                <>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{t('dashboard.verificationRejected')}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t('dashboard.verificationRejectedDesc')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{isTeam ? t('dashboard.teamVerificationRequired') : t('dashboard.verificationRequired')}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {isTeam ? t('dashboard.teamVerificationNotVerifiedDesc') : t('dashboard.verificationNotVerifiedDesc')}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowUnverifiedDialog(false)}
              className="flex-1"
            >
              {t('dashboard.goBack')}
            </Button>
            {activeCompany.verificationStatus !== 'under_review' && (
              <Button
                onClick={() => { setShowUnverifiedDialog(false); setLocation('/settings?tab=company'); }}
                className="flex-1 bg-[#FE3C01] hover:bg-[#D44D3A]"
              >
                {t('dashboard.uploadDocuments')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* First-time user guided tour overlay */}
    {tourOverlay}
    {/* Vendors tab tour overlay */}
    {vendorsTourOverlay}
    {/* Create-team dialog (individuals) */}
    <CreateTeamDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
    </>
  );
}
