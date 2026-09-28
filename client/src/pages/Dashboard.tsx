import { useAuthStore } from "@/lib/auth";
import { displayRoleName } from "@/lib/roles";
import { useLogout } from "@/hooks/use-logout";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Building2, FileText, Users, Inbox, LogOut, Search, CheckCircle, XCircle, Loader2, Mail, UserPlus, Eye, ShieldCheck, ShieldAlert, Clock, UserCheck, Plus, Copy, Check, Calendar, Send, MoreHorizontal, Trash2, Edit, ExternalLink, DollarSign, X, LayoutDashboard, Settings, CreditCard, Bell, MessageSquare, ChevronDown, Sparkles, Image, Link2, ClipboardList, Cog, Video, Play, Globe, HelpCircle, Gift, Sun, Moon, Monitor, ChevronRight, Filter, Handshake, ChevronsUpDown, Paintbrush, Briefcase, BookmarkPlus, Bookmark, User, Code2, CheckCircle2, MapPin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SupportContactLinks } from "@/components/support-contact";
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
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { viewAuthenticatedFile } from "@/lib/downloadFile";
import { categoryLabel, cityLabel } from "@/lib/category-labels";
import { profilePath } from "@/lib/profile-url";
import { withViewTransition } from "@/lib/view-transition";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";

interface VendorProfile {
  id: string;
  companyId: string;
  slug: string;
  hasProfile: boolean;
  company: string;
  legalName: string | null;
  category: string | null;
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

// i18n KEYS, not literal strings — these rendered untranslated on /rfps for
// Arabic users. A module-level constant can't call t(), so the values are keys
// and the caller resolves them. The translations already existed.
const SUBMISSION_TYPE_LABEL_KEYS: Record<string, string> = {
  quote_only: "tenderFlow.editSubmTypeQuoteOnly",
  tech_fin_proposal: "tenderFlow.editSubmTypeTechFin",
  video_only: "tenderFlow.editSubmTypeVideoOnly",
  tech_fin_with_video: "tenderFlow.editSubmTypeTechFinVideo",
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
  status: 'pending' | 'accepted' | 'rejected' | 'shortlisted' | 'superseded';
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
  status: 'pending' | 'accepted' | 'rejected' | 'shortlisted' | 'superseded';
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
      <div className={`flex items-center gap-2`}>
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
          <div className={`flex items-center gap-2 max-md:[direction:ltr]`}>
            <span className="text-sm text-muted-foreground whitespace-nowrap">/traction/</span>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                setSlugTaken(false);
              }}
              placeholder="your-company"
              className={`font-mono text-base md:text-sm ${slugTaken ? 'border-amber-300 focus-visible:ring-amber-200' : ''}`}
              maxLength={50}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-testid="input-traction-slug"
            />
          </div>
          {slugTaken && (
            <div className={`flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 ${isRtl ? 'text-right' : ''}`}>
              <HelpCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">"{slug}" {t('dashboard.slugTaken')}</p>
                <p className="text-xs text-amber-600 max-md:text-amber-800 mt-0.5 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-2">
                  <button className="underline font-medium hover:text-amber-800 dark:text-amber-300 active:opacity-70 max-md:min-h-11" onClick={() => { setSlug(`${slug}-co`); setSlugTaken(false); }}>{slug}-co</button>,{' '}
                  <button className="underline font-medium hover:text-amber-800 dark:text-amber-300 active:opacity-70 max-md:min-h-11" onClick={() => { setSlug(`${slug}-${Math.floor(Math.random() * 99) + 1}`); setSlugTaken(false); }}>{slug}-{Math.floor(Math.random() * 99) + 1}</button> {t('dashboard.slugTakenSuggestion')}
                </p>
              </div>
            </div>
          )}
          <div className={`flex gap-2 max-md:[&>button]:flex-1`}>
            <Button
              size="sm"
              onClick={() => createSlugMutation.mutate(slug)}
              disabled={!slug.trim() || slug.length < 2 || createSlugMutation.isPending}
              className="bg-[#FE3C01] hover:bg-[#E83501] text-white max-md:h-11 max-md:active:bg-[#C93000]"
              data-testid="button-create-traction"
            >
              {createSlugMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('dashboard.createLink')}
            </Button>
            <Button size="sm" variant="ghost" className="max-md:h-11" onClick={() => { setIsEditing(false); setSlugTaken(false); }}>{t('common.cancel')}</Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="border-[#FE3C01]/30 text-[#FE3C01] hover:bg-[#FE3C01]/5 max-md:h-11 max-md:w-full max-md:border-transparent max-md:bg-[#FE3C01] max-md:text-white max-md:hover:bg-[#E83501] max-md:hover:text-white max-md:active:bg-[#C93000]"
          data-testid="button-setup-traction"
        >
          <Plus className={`h-4 w-4 me-1`} />
          {t('dashboard.setupTractionLink')}
        </Button>
      )}
    </div>
  );
}

// A name or title someone typed can be in either script, whatever the page
// language is. dir="auto" lets the browser cut it off at the end of its own
// script ("Built…", not "…iltcorrectly"); the inline-block keeps it lined up
// with the page direction instead of jumping to the other side.
function UserText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span dir="auto" data-user-content className={`inline-block max-w-full truncate align-bottom ${className}`}>{children}</span>;
}

// The big number on a stat card. On phones, while the count is still loading, a
// pulsing bar of the same height stands in for it so a made-up "0" never flashes
// before the real figure arrives. Desktop keeps showing the number as before.
function StatNumber({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (!loading) return <>{children}</>;
  return (
    <>
      <span aria-busy="true" className="block h-12 w-14 rounded-lg bg-white/10 animate-pulse md:hidden" />
      <span className="max-md:hidden">{children}</span>
    </>
  );
}

// Shown in place of a step's action button once that step is finished, so a
// completed step never offers to do the thing again.
function StepDone({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-step-done">
      <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

// ── RFPs tab on phones ───────────────────────────────────────────────────────
// The list shows ten RFPs at a time and "Show more" adds the next ten. Search and
// the filters always run on the full list; only the rendering is paged.
const RFP_PAGE_SIZE = 10;

// Something someone typed (an RFP title or description), clamped to two lines.
// dir="auto" cuts it at the end of its own script (a Latin title on an Arabic page
// keeps its "..." on the right). Full width, so every Latin title lines up on the same
// edge and every Arabic title on the other, instead of short ones drifting to one side.
function UserClamp({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span dir="auto" data-user-content className={`w-full line-clamp-2 break-words ${className}`}>{children}</span>;
}

// Stand-in with the same shape as a real row, so nothing jumps when the list arrives.
function RfpRowSkeleton() {
  return (
    <div aria-busy="true" className="rounded-2xl border border-[#FE3C01]/10 dark:border-border bg-card p-4 space-y-3">
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

// One RFP as a phone list row. The title gets its own full-width lines (the badges
// used to squeeze it into a narrow column), the badges wrap underneath, the row
// actions sit behind one 44px "..." button, and a tap anywhere on the row opens it.
function RfpRowMobile({ tender, statusBadge, showNegotiate, isDeadlineSoon, dateText, onOpen, onEdit, onDelete }: {
  tender: TenderWithCounts;
  statusBadge: { state: BidState; label: string };
  showNegotiate: boolean;
  isDeadlineSoon: boolean;
  dateText: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, isRtl } = useI18n();
  const { toast } = useToast();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${tender.id}`);
      toast({ title: t('dashboard.rfpLinkCopied') });
    } catch {
      toast({ title: t('dashboard.rfpCopyFailed'), variant: "destructive" });
    }
  };

  const offersText = tender.offersCount === 1 ? t('dashboard.rfpOffersOne')
    : tender.offersCount === 2 ? t('dashboard.rfpOffersTwo')
    : `${tender.offersCount} ${t('dashboard.offers')}`;
  const typeText = tender.submissionType
    ? (SUBMISSION_TYPE_LABEL_KEYS[tender.submissionType] ? t(SUBMISSION_TYPE_LABEL_KEYS[tender.submissionType]) : tender.submissionType)
    : null;
  const budgetText = tender.budgetRange || tender.budget;
  const audience = tender.targetAudienceTypes ?? [];

  return (
    <SpotlightCard {...brandSpotlightProps()} spotlightColor={tender.status === 'cancelled' ? 'red' : 'orange'}>
      <div className="relative px-4 pb-4 pt-3" data-testid={`card-tender-${tender.id}`}>
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-base font-bold leading-snug text-foreground">
            {/* Stretched link: the ::after covers the whole row, so a tap anywhere opens the RFP
                (and it is a real link for keyboards and long-press). The "..." button sits above it. */}
            <a
              href={`/tenders/${tender.id}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onOpen();
              }}
              className="flex min-h-11 items-center rounded-md outline-none after:absolute after:inset-0 active:after:bg-black/[0.05] dark:active:after:bg-white/[0.06] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
              data-testid={`text-tender-title-${tender.id}`}
            >
              <UserClamp>{tender.title}</UserClamp>
            </a>
          </h3>
          <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-10 -me-2 shrink-0 text-[#6B635B] dark:text-muted-foreground"
                aria-label={t('dashboard.rfpMoreActions')}
                data-testid={`button-menu-${tender.id}`}
              >
                <MoreHorizontal className="!size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={12} className="w-56 p-1.5" data-testid={`menu-tender-${tender.id}`}>
              <DropdownMenuItem className="min-h-12 gap-3 px-3 text-base active:bg-accent" onSelect={copyLink} data-testid={`button-copy-link-${tender.id}`}>
                <Copy />
                {t('dashboard.copyLink')}
              </DropdownMenuItem>
              {['draft', 'published'].includes(tender.status) && (
                <DropdownMenuItem className="min-h-12 gap-3 px-3 text-base active:bg-accent" onSelect={onEdit} data-testid={`button-edit-${tender.id}`}>
                  <Edit />
                  {t('dashboard.edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="min-h-12 gap-3 px-3 text-base text-red-600 focus:text-red-700 dark:text-red-300 active:bg-red-50 dark:active:bg-red-950/40"
                onSelect={onDelete}
                data-testid={`button-delete-${tender.id}`}
              >
                <Trash2 />
                {t('dashboard.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge state={statusBadge.state} label={statusBadge.label} data-testid={`badge-status-${tender.id}`} />
          {showNegotiate && (
            <span className="rounded-full bg-[#FE3C01] px-2 py-0.5 text-[11px] font-bold text-white">
              {t('dashboard.negotiateBadge')}
            </span>
          )}
          {audience.map((type: string) => (
            <span key={type} className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-[#6B635B] dark:text-muted-foreground">
              {type === 'company' ? t('tenderFlow.audienceCompanies')
                : type === 'team' ? t('tenderFlow.audienceTeams')
                : t('tenderFlow.audienceIndividuals')}
            </span>
          ))}
        </div>

        {tender.description && (
          <p className="mt-2 text-sm leading-relaxed text-[#6B635B] dark:text-muted-foreground" data-testid={`text-tender-description-${tender.id}`}>
            <UserClamp>{tender.description}</UserClamp>
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-[#6B635B] dark:text-muted-foreground">
          <div className="flex min-w-0 items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={`min-w-0 tabular-nums ${isDeadlineSoon ? 'font-semibold text-[var(--state-lost)] dark:text-red-300' : ''}`}>{dateText}</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <Send className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0" data-testid={`text-proposals-count-${tender.id}`}>{offersText}</span>
          </div>
          {typeText && (
            <div className="col-span-2 flex min-w-0 items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{typeText}</span>
            </div>
          )}
          <div className="col-span-2 flex min-w-0 items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 tabular-nums">
              {budgetText ? <bdi dir="ltr">{budgetText}</bdi> : t('dashboard.rfpBudgetNotSet')}
            </span>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}

// ── Proposals tab on phones ──────────────────────────────────────────────────
// Same idea as the RFPs tab: ten rows at a time, a full-width 2-line title, badges
// under it, and a row that opens the RFP when you tap anywhere on it.

// "1 day left", "يومان متبقيان", "15 يومًا متبقيًا": the plain "days left" wording is
// wrong for 1, 2 and 11+ in Arabic ("1 أيام متبقية").
function daysLeftText(t: (key: string, vars?: Record<string, string | number>) => string, days: number): string {
  if (days === 1) return t('dashboard.daysLeftOne');
  if (days === 2) return t('dashboard.daysLeftTwo');
  if (days >= 11) return t('dashboard.daysLeftMany', { count: days });
  return `${days} ${t('dashboard.daysLeft')}`;
}

// The number of proposals on a sub-tab. On phones, while the list is still loading, a
// pulsing bar stands in for it so a made-up "(0)" never shows before the real count.
function TabCount({ loading, count }: { loading: boolean; count: number }) {
  if (!loading) return <span className="tabular-nums">({count})</span>;
  return (
    <>
      <span aria-busy="true" className="inline-block h-4 w-6 rounded bg-current opacity-20 animate-pulse md:hidden" />
      <span className="tabular-nums max-md:hidden">({count})</span>
    </>
  );
}

// Stand-in with the same shape as a real proposal row, so nothing jumps when the list arrives.
function ProposalRowSkeleton() {
  return (
    <div aria-busy="true" className="rounded-2xl border border-[#FE3C01]/10 dark:border-border bg-card p-4 space-y-3">
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}

// Proposal status as a small pill with text that reads clearly on the cream card.
function ProposalStatusPill({ status }: { status: MyOffer['status'] }) {
  const { t } = useI18n();
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  if (status === 'accepted') {
    return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`}><CheckCircle className="h-3 w-3" aria-hidden="true" />{t('dashboard.accepted')}</span>;
  }
  if (status === 'rejected') {
    return <span className={`${base} bg-muted text-[#6B635B] dark:text-muted-foreground`}><XCircle className="h-3 w-3" aria-hidden="true" />{t('dashboard.rejected')}</span>;
  }
  if (status === 'shortlisted') {
    return <span className={`${base} bg-[#FE3C01]/10 text-[#B32A00] dark:text-[#FF8A63]`}><Bookmark className="h-3 w-3" aria-hidden="true" />{t('dashboard.shortlisted')}</span>;
  }
  if (status === 'superseded') {
    return <span className={`${base} bg-muted text-[#6B635B] dark:text-muted-foreground`}>{t('dashboard.superseded')}</span>;
  }
  return <span className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200`}><Clock className="h-3 w-3" aria-hidden="true" />{t('dashboard.pending')}</span>;
}

// One proposal as a phone list row. "sent" = a proposal we submitted, "incoming" = an
// offer a vendor sent us. The whole row opens the RFP (a real link stretched over the
// row); the buttons sit above it, at least 44px tall, and wrap in a two-column grid.
function ProposalRowMobile({ kind, offer, dateText, tenderBadge, onOpenTender, onViewFile, onOpenProfile }: {
  kind: 'sent' | 'incoming';
  offer: MyOffer | IncomingOffer;
  dateText: string;
  tenderBadge?: { state: BidState; label: string };
  onOpenTender: () => void;
  onViewFile: (url: string) => void;
  onOpenProfile?: () => void;
}) {
  const { t, isRtl } = useI18n();
  const incoming = kind === 'incoming' ? (offer as IncomingOffer) : null;

  const deadline = new Date(offer.tender.deadline);
  const isExpired = deadline.getTime() < Date.now();
  const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const deadlineText = isExpired ? t('dashboard.deadlinePassed') : daysLeftText(t, daysRemaining);
  const deadlineClass = isExpired
    ? 'font-semibold text-red-700 dark:text-red-300'
    : daysRemaining <= 3 ? 'font-semibold text-orange-700 dark:text-orange-300' : '';
  const amount = offer.quotePrice ? t('dashboard.sarAmount', { amount: offer.quotePrice.toLocaleString('en-US') }) : null;
  const vendorName = incoming ? (incoming.profile?.displayName || incoming.company.name) : '';

  // Secondary actions, only the ones this proposal has. The last one takes the full row
  // when there is an odd number, so the grid never ends on a half-empty line.
  const files: { key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; testId?: string }[] = [];
  if (incoming) {
    files.push({
      key: 'profile', label: t('dashboard.offerVendorProfile'), icon: <Eye />,
      onClick: () => onOpenProfile?.(), disabled: !incoming.company?.slug, testId: `button-view-offer-${offer.id}`,
    });
  }
  if (offer.combinedFileUrl) files.push({ key: 'combined', label: t('dashboard.combinedProposal'), icon: <FileText />, onClick: () => onViewFile(offer.combinedFileUrl!) });
  if (offer.technicalFileUrl) files.push({ key: 'technical', label: t('dashboard.technicalProposal'), icon: <FileText />, onClick: () => onViewFile(offer.technicalFileUrl!) });
  if (offer.financialFileUrl) files.push({ key: 'financial', label: t('dashboard.financialProposal'), icon: <DollarSign />, onClick: () => onViewFile(offer.financialFileUrl!) });
  if (offer.videoUrl) files.push({ key: 'video', label: t('dashboard.videoPitchLabel'), icon: <Video />, onClick: () => window.open(offer.videoUrl!, '_blank') });

  const linkClass = "min-h-11 rounded-md outline-none after:absolute after:inset-0 active:after:bg-black/[0.05] dark:active:after:bg-white/[0.06] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring";
  const openLink = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpenTender();
  };

  return (
    <SpotlightCard {...brandSpotlightProps()} spotlightColor={offer.status === 'accepted' ? 'green' : offer.status === 'rejected' ? 'red' : 'orange'}>
      <div className="relative px-4 pb-4 pt-3" data-testid={incoming ? `card-incoming-offer-${offer.id}` : `card-my-offer-${offer.id}`}>
        {incoming ? (
          <h3 className="pt-1 text-base font-bold leading-snug text-foreground" data-testid={`text-offer-vendor-${offer.id}`}>
            <UserClamp>{vendorName}</UserClamp>
          </h3>
        ) : (
          <h3 className="text-base font-bold leading-snug text-foreground">
            {/* Stretched link: a tap anywhere on the row opens the RFP; the buttons sit above it. */}
            <a href={`/tenders/${offer.tender.id}`} onClick={openLink} className={`flex items-center ${linkClass}`} data-testid={`text-offer-title-${offer.id}`}>
              <UserClamp>{offer.tender.title}</UserClamp>
            </a>
          </h3>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {incoming && amount && (
            <span className="whitespace-nowrap text-base font-bold tabular-nums text-green-700 dark:text-green-400" data-testid={`text-offer-amount-${offer.id}`}>
              {amount}
            </span>
          )}
          {tenderBadge && <StatusBadge state={tenderBadge.state} label={tenderBadge.label} />}
          {incoming?.company.verificationStatus === 'verified' && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{t('dashboard.verified')}</span>
          )}
          {(kind === 'sent' || offer.status !== 'pending') && <ProposalStatusPill status={offer.status} />}
        </div>

        {incoming ? (
          <div className="mt-2 text-sm leading-relaxed text-[#6B635B] dark:text-muted-foreground">
            <span className="block text-xs">{t('dashboard.forTender')}</span>
            <a href={`/tenders/${offer.tender.id}`} onClick={openLink} className={`flex items-center font-semibold text-foreground ${linkClass}`} data-testid={`text-offer-tender-${offer.id}`}>
              <UserClamp>{offer.tender.title}</UserClamp>
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[#6B635B] dark:text-muted-foreground">
            <UserClamp>{offer.tender.description || t('dashboard.noDescription')}</UserClamp>
          </p>
        )}

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-sm text-[#6B635B] dark:text-muted-foreground">
          <div className="flex min-w-0 items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{incoming ? t('dashboard.received') : t('dashboard.submitted')} <span className="tabular-nums">{dateText}</span></span>
          </div>
          <div className={`flex min-w-0 items-start gap-2 ${deadlineClass}`}>
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 tabular-nums">{deadlineText}</span>
          </div>
          {incoming?.company.category && (
            <div className="col-span-2 flex min-w-0 items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0" dir="auto" data-user-content>{categoryLabel(incoming.company.category, isRtl)}</span>
            </div>
          )}
          {!incoming && amount && (
            <div className="col-span-2 flex min-w-0 items-start gap-2 font-medium text-green-700 dark:text-green-400">
              <DollarSign className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 tabular-nums">{amount}</span>
            </div>
          )}
          {offer.notes && (
            <div className="col-span-2 flex min-w-0 items-start gap-2 italic">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1"><UserClamp>{`"${offer.notes}"`}</UserClamp></span>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
          <Button
            variant={incoming ? 'default' : 'outline'}
            className={`col-span-2 h-auto min-h-11 whitespace-normal py-2 text-center leading-tight ${incoming ? 'bg-[#FE3C01] text-white hover:bg-[#d54d35] active:bg-[#C93000]' : ''}`}
            onClick={onOpenTender}
            data-testid={incoming ? `button-review-tender-${offer.id}` : `button-view-tender-${offer.id}`}
          >
            {incoming ? <ExternalLink /> : <Eye />}
            {t('dashboard.viewTender')}
          </Button>
          {files.map((f, i) => (
            <Button
              key={f.key}
              variant="outline"
              className={`h-auto min-h-11 whitespace-normal py-2 text-center leading-tight ${i === files.length - 1 && files.length % 2 === 1 ? 'col-span-2' : ''}`}
              onClick={f.onClick}
              disabled={f.disabled}
              data-testid={f.testId}
            >
              {f.icon}
              {f.label}
            </Button>
          ))}
        </div>
      </div>
    </SpotlightCard>
  );
}

// ── Vendors Base tab on phones ───────────────────────────────────────────────
// Copy to the clipboard. The async clipboard API can refuse (Safari drops the tap gesture
// after an await, some in-app browsers have none), so fall back to the old copy command.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;top:0;opacity:0;font-size:16px';
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(box);
    return ok;
  } catch {
    return false;
  }
}

// "Copy link" that answers back: the label turns into a green "Copied" for two seconds,
// and a copy that fails says so instead of doing nothing.
function CopyLinkButton({ url, className = "", iconClassName = "", testId }: { url: string; className?: string; iconClassName?: string; testId?: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        if (await copyText(url)) setCopied(true);
        else toast({ title: t('dashboard.rfpCopyFailed'), variant: "destructive" });
      }}
      aria-live="polite"
      data-testid={testId}
    >
      {copied ? <Check className="text-green-700 dark:text-green-400" /> : <Copy className={iconClassName} />}
      <span className={copied ? 'text-green-700 dark:text-green-400' : ''}>{copied ? t('dashboard.copied') : t('dashboard.copyLink')}</span>
    </Button>
  );
}

// The joining link on phones: the whole link on its own lines (a Latin URL, so left-to-right and
// broken anywhere instead of cut off), then 44px buttons instead of three bare icons.
function TractionLinkActionsMobile({ slug }: { slug: string }) {
  const { t } = useI18n();
  const url = `${window.location.origin}/traction/${slug}`;
  return (
    <div className="space-y-2">
      <div dir="ltr" data-user-content className="min-h-11 break-words rounded-lg bg-muted px-3 py-2.5 text-start font-mono text-sm leading-snug" data-testid="text-traction-link">
        {/* <wbr> after each slash: the link wraps at a slash instead of in the middle of a word. */}
        {url.split('/').map((part, i, all) => (
          <span key={i}>{part}{i < all.length - 1 && <>/<wbr /></>}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <CopyLinkButton
          url={url}
          className="col-span-2 max-md:h-auto max-md:min-h-11 border-[#FE3C01]/30 hover:bg-[#FE3C01]/5"
          iconClassName="text-[#FE3C01]"
          testId="button-copy-traction-link"
        />
        <Button variant="outline" className="max-md:h-auto max-md:min-h-11" asChild>
          <a href={`/traction/${slug}`} target="_blank" rel="noopener noreferrer" data-testid="button-preview-traction">
            <ExternalLink />
            {t('dashboard.tractionPreview')}
          </a>
        </Button>
        <Button variant="outline" className="max-md:h-auto max-md:min-h-11" asChild>
          <a href={`/traction/${slug}/edit`} data-testid="button-customize-traction">
            <Paintbrush />
            {t('dashboard.tractionCustomize')}
          </a>
        </Button>
      </div>
    </div>
  );
}

// A vendor's logo that shows the placeholder (icon or initials) until the picture has loaded, or for
// good if it never does (a missing or private file), so the avatar is never an empty circle.
function LogoAvatar({ url, shape = "rounded-full", children }: { url: string | null; shape?: string; children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-border bg-primary/10 ${shape}`}>
      {state !== 'loaded' && children}
      {url && state !== 'failed' && (
        <img
          src={url}
          alt=""
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          className={`absolute inset-0 h-full w-full object-cover ${state === 'loaded' ? 'bg-card' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

// Stand-in with the same shape as a real vendor row, so nothing jumps when the list arrives.
function VendorRowSkeleton() {
  return (
    <div aria-busy="true" className="rounded-2xl border border-[#FE3C01]/10 dark:border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-4 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-11 rounded-md" />
        <Skeleton className="h-11 rounded-md" />
      </div>
    </div>
  );
}

// One vendor as a phone list row. The name gets a full-width line of its own (the chips used to
// squeeze it into a narrow column), the chips wrap underneath, and the two actions are 44px.
function VendorRowMobile({ vendor, categoryText, cityText, joinText, onRemove }: {
  vendor: VendorProfile;
  categoryText: string;
  cityText: string;
  joinText: string;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  return (
    <SpotlightCard {...brandSpotlightProps()} spotlightColor="orange">
      <div className="px-4 pb-4 pt-4" data-testid={`card-vendor-${vendor.id}`}>
        <div className="flex items-start gap-3">
          <LogoAvatar url={vendor.logoUrl}>
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </LogoAvatar>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-snug text-foreground" data-testid={`text-vendor-name-${vendor.id}`}>
              {/* Only as wide as the text, so the name sits next to the logo whatever script it is in. */}
              <UserClamp className="!w-fit max-w-full">{vendor.company}</UserClamp>
            </h3>
            <p className="mt-0.5 text-sm leading-snug text-[#6B635B] dark:text-muted-foreground" data-testid={`text-vendor-category-${vendor.id}`}>
              <UserClamp className="!w-fit max-w-full">{categoryText}</UserClamp>
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {vendor.verificationStatus === 'verified' && (
            <Badge variant="secondary" className="gap-1" data-testid={`badge-verified-${vendor.id}`}>
              <CheckCircle className="h-3 w-3" aria-hidden="true" />
              {t('dashboard.verified')}
            </Badge>
          )}
          {/* "Invited" as a light orange chip with dark orange text: white on the brand orange is only 3.3:1. */}
          <Badge
            variant="outline"
            className={`max-w-full whitespace-normal ${vendor.joinMethod === 'invitation' ? 'border-transparent bg-[#FE3C01]/10 text-[#B32A00] dark:text-[#FF8A63]' : ''}`}
            data-testid={`badge-join-method-${vendor.id}`}
          >
            {joinText}
          </Badge>
        </div>

        {vendor.bio && (
          <p className="mt-2 text-sm leading-relaxed text-[#6B635B] dark:text-muted-foreground" data-testid={`text-vendor-bio-${vendor.id}`}>
            <UserClamp>{vendor.bio}</UserClamp>
          </p>
        )}

        {cityText && (
          <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-[#6B635B] dark:text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span dir="auto" data-user-content className="min-w-0 truncate">{cityText}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="max-md:h-auto max-md:min-h-11 whitespace-normal py-2 text-center leading-tight"
            onClick={() => {
              if (vendor.slug) window.open(`/company/${vendor.slug}`, '_blank', 'noopener,noreferrer');
            }}
            disabled={!vendor.slug}
            data-testid={`button-view-vendor-${vendor.id}`}
          >
            <Eye />
            {t('dashboard.offerVendorProfile')}
          </Button>
          <Button
            variant="outline"
            className="max-md:h-auto max-md:min-h-11 whitespace-normal py-2 text-center leading-tight text-destructive dark:text-red-300 border-destructive/30 hover:bg-destructive/10 hover:border-destructive active:bg-destructive/10"
            onClick={onRemove}
            data-testid={`button-remove-vendor-${vendor.id}`}
          >
            <Trash2 />
            {t('dashboard.remove')}
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}

// One pending join request as a phone list row: the same shape as a vendor row, with the
// three actions (view, reject, approve) as 44px buttons.
function JoinRequestRowMobile({ request, dateText, onReject, onApprove, rejecting, approving }: {
  request: JoinRequest;
  dateText: string;
  onReject: () => void;
  onApprove: () => void;
  rejecting: boolean;
  approving: boolean;
}) {
  const { t, isRtl } = useI18n();
  const vendor = request.vendor;
  const status = vendor?.verificationStatus;
  const initials = (vendor?.company || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const website = vendor?.websiteUrl ? vendor.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
  const statusClass = status === 'verified'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
    : status === 'under_review'
    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
    : 'border-border bg-muted text-[#6B635B] dark:text-muted-foreground';
  return (
    <SpotlightCard {...brandSpotlightProps()} spotlightColor={status === 'verified' ? 'green' : 'orange'}>
      <div className="px-4 pb-4 pt-4" data-testid={`card-request-${request.id}`}>
        <div className="flex items-start gap-3">
          <LogoAvatar url={vendor?.logoUrl ?? null} shape="rounded-xl">
            <span className="text-sm font-bold text-[#B32A00] dark:text-[#FF8A63]">{initials}</span>
          </LogoAvatar>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-snug text-foreground" data-testid={`text-request-company-${request.id}`}>
              <UserClamp className="!w-fit max-w-full">{vendor?.company || t('dashboard.unknownVendor')}</UserClamp>
            </h3>
            {vendor?.expertise && (
              <p className="mt-0.5 text-sm leading-snug text-[#6B635B] dark:text-muted-foreground" data-testid={`text-request-category-${request.id}`}>
                <UserClamp className="!w-fit max-w-full">{categoryLabel(vendor.expertise, isRtl)}</UserClamp>
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`gap-1 ${statusClass}`} data-testid={`badge-request-status-${request.id}`}>
            {status === 'verified' && <ShieldCheck className="h-3 w-3" aria-hidden="true" />}
            {status === 'under_review' && <Clock className="h-3 w-3" aria-hidden="true" />}
            {status === 'verified' ? t('dashboard.verifiedStatus') : status === 'under_review' ? t('dashboard.underReviewStatus') : t('dashboard.notVerifiedStatus')}
          </Badge>
        </div>

        {vendor?.bio && (
          <p className="mt-2 text-sm leading-relaxed text-[#6B635B] dark:text-muted-foreground">
            <UserClamp>{vendor.bio}</UserClamp>
          </p>
        )}

        <div className="mt-2 space-y-1 text-sm text-[#6B635B] dark:text-muted-foreground">
          {website && (
            <a
              href={vendor!.websiteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-1 flex min-h-11 min-w-0 items-center gap-2 active:opacity-70"
            >
              <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span dir="ltr" data-user-content className="min-w-0 truncate">{website}</span>
            </a>
          )}
          {dateText && (
            <div className="flex min-w-0 items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">{dateText}</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="col-span-2 max-md:h-auto max-md:min-h-11 whitespace-normal py-2 text-center leading-tight"
            onClick={() => {
              if (vendor?.slug) window.open(`/company/${vendor.slug}`, '_blank', 'noopener,noreferrer');
            }}
            disabled={!vendor?.slug}
            data-testid={`button-view-profile-${request.id}`}
          >
            <Eye />
            {t('dashboard.offerVendorProfile')}
          </Button>
          <Button
            variant="outline"
            className="max-md:h-auto max-md:min-h-11 whitespace-normal py-2 text-center leading-tight border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 active:bg-red-50 dark:text-red-300"
            onClick={onReject}
            disabled={rejecting}
            data-testid={`button-reject-${request.id}`}
          >
            <XCircle />
            {t('dashboard.reject')}
          </Button>
          <Button
            className="max-md:h-auto max-md:min-h-11 whitespace-normal py-2 text-center leading-tight bg-green-700 text-white hover:bg-green-800 active:bg-green-800"
            onClick={onApprove}
            disabled={approving}
            data-testid={`button-approve-${request.id}`}
          >
            {approving ? <Loader2 className="animate-spin" /> : <CheckCircle />}
            {t('dashboard.approve')}
          </Button>
        </div>
      </div>
    </SpotlightCard>
  );
}

// Company verification status (as the server stores it) → translation key.
const VERIFICATION_STATUS_KEYS: Record<string, string> = {
  verified: "dashboard.verifStatusVerified",
  under_review: "dashboard.verifStatusUnderReview",
  not_verified: "dashboard.verifStatusNotVerified",
  rejected: "dashboard.verifStatusRejected",
};

// Component for sidebar header with logo/toggle swap on hover when collapsed
function ChatHistorySidebar() {
  const [, setLocation] = useLocation();
  const { t, language } = useI18n();
  const { data: chatSessions } = useQuery<any[]>({
    queryKey: ["/api/ai-chat-sessions"],
  });
  // The trash icon is always visible on phones (no hover to reveal it there),
  // so an accidental tap is easier than on desktop; confirm before deleting.
  const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ai-chat-sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-chat-sessions"] });
      setChatToDelete(null);
    },
  });

  const sessions = chatSessions || [];
  if (sessions.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return t('common.today') || "Today";
    if (diffDays === 1) return t('common.yesterday') || "Yesterday";
    // Western digits in both languages, and a month name in the page's language.
    if (diffDays < 7) return new Intl.RelativeTimeFormat(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en', { numeric: 'always' }).format(-diffDays, 'day');
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SidebarGroup>
      <div className="px-3 py-2 flex items-center justify-between group-data-[collapsible=icon]:hidden">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider rtl:normal-case rtl:tracking-normal">
          {t('dashboard.aiChatHistory') || "AI Chat History"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          aria-label={t('dashboard.createTender')}
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
                className="py-2 text-sm rounded-lg hover:bg-muted group/chat max-md:h-auto max-md:min-h-11 max-md:group-has-[[data-sidebar=menu-action]]/menu-item:pe-11"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm truncate block"><UserText>{session.title}</UserText></span>
                  <span className="text-[11px] text-muted-foreground">{formatDate(session.updatedAt)}</span>
                </div>
              </SidebarMenuButton>
              {/* Sibling, not a child: SidebarMenuButton is itself a <button>,
                  and a nested button is invalid DOM — it breaks keyboard focus
                  and screen readers. */}
              <SidebarMenuAction
                onClick={(e) => {
                  e.stopPropagation();
                  setChatToDelete({ id: session.id, title: session.title });
                }}
                aria-label={t('dashboard.deleteChat')}
                className="opacity-0 max-md:opacity-100 group-hover/chat:opacity-100 p-0.5 hover:text-destructive active:text-destructive transition-opacity group-data-[collapsible=icon]:hidden"
              >
                <Trash2 className="h-3 w-3 max-md:h-4 max-md:w-4" />
              </SidebarMenuAction>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>

      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent className="max-md:w-[calc(100%-2rem)] max-md:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.chatDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              <UserClamp className="mx-auto font-medium text-foreground">{chatToDelete?.title}</UserClamp>
              <span className="mt-1 block">{t('dashboard.chatDeleteWarning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="max-md:gap-2">
            <AlertDialogCancel className="mt-0" data-testid="button-cancel-delete-chat">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 active:bg-destructive/80 text-destructive-foreground"
              onClick={() => chatToDelete && deleteMutation.mutate(chatToDelete.id)}
              data-testid="button-confirm-delete-chat"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('dashboard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

// Lets code outside the sidebar provider (the create-RFP handler) close the phone
// drawer before it opens a popup, so the popup isn't stacked on top of the drawer.
function DrawerCloseBridge({ closeRef }: { closeRef: React.MutableRefObject<() => void> }) {
  const { isMobile, setOpenMobile } = useSidebar();
  closeRef.current = () => { if (isMobile) setOpenMobile(false); };
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

type AuthSnapshot = ReturnType<typeof useAuthStore.getState>;

// Thin gate in front of the real dashboard. The redirects used to sit in the
// middle of the dashboard itself, above dozens of later hooks, so the moment the
// user or workspace went empty (sign-out, session expiry) React threw "Rendered
// fewer hooks than expected". Here nothing is skipped: the dashboard is either
// rendered whole or not at all.
export default function Dashboard() {
  const { user, activeCompany } = useAuthStore();
  const [, setLocation] = useLocation();
  // Signup left half-finished (user exists, no workspace): resume at the
  // account-type choice rather than assuming they wanted a company.
  const redirectTo = !user ? "/login" : !user.otpVerified ? "/verify-email" : !activeCompany ? "/onboarding" : null;
  useEffect(() => {
    if (redirectTo) setLocation(redirectTo);
  }, [redirectTo, setLocation]);
  if (!user || !activeCompany || redirectTo) return null;
  return <DashboardInner user={user} activeCompany={activeCompany} />;
}

function DashboardInner({ user, activeCompany }: {
  user: NonNullable<AuthSnapshot["user"]>;
  activeCompany: NonNullable<AuthSnapshot["activeCompany"]>;
}) {
  const { companies, switchCompany } = useAuthStore();
  const isPhone = useIsMobile();
  const [menuBoundary, setMenuBoundary] = useState<Element | null>(null);
  const [location, setLocation] = useLocation();
  const { t, isRtl, language, setLanguage } = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileJoinRequestId, setProfileJoinRequestId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<IncomingOffer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [tenderSearchQuery, setTenderSearchQuery] = useState("");
  const [rfpVisible, setRfpVisible] = useState(RFP_PAGE_SIZE);
  // Proposals tab on phones: how many rows of each list are shown (10, then +10 per "Show more").
  const [sentVisible, setSentVisible] = useState(RFP_PAGE_SIZE);
  const [incomingVisible, setIncomingVisible] = useState(RFP_PAGE_SIZE);
  const [tenderToDelete, setTenderToDelete] = useState<TenderWithCounts | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState(() => ROUTE_TO_TAB[location] ?? "overview");
  const mainRef = useRef<HTMLElement>(null);
  const closeDrawerRef = useRef<() => void>(() => {});

  // Keep the URL in sync with the active tab so /rfps, /proposals, and
  // /vendors are real, shareable, back-button-friendly routes (B-7) instead
  // of pure client-side tab state.
  const setActiveTab = (value: string) => {
    withViewTransition(() => {
      setActiveTabState(value);
      const route = TAB_TO_ROUTE[value];
      if (route && route !== location) setLocation(route);
    });
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
  // A new search or filter starts the phone list again from the first ten.
  useEffect(() => { setRfpVisible(RFP_PAGE_SIZE); }, [tenderSearchQuery, tenderFilter, tenderTypeFilter, tenderOffersFilter]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  // Vendors Base on phones: how many rows are shown (10, then +10 per "Show more"); a new search or filter starts over.
  const [vendorVisible, setVendorVisible] = useState(RFP_PAGE_SIZE);
  useEffect(() => { setVendorVisible(RFP_PAGE_SIZE); }, [searchQuery, categoryFilter, cityFilter, verificationFilter]);
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

  // Check if user is owner or admin (can create tenders, manage vendors)
  const userRole = activeCompany.role || 'viewer';
  const canManage = ['owner', 'admin'].includes(userRole);
  const isOwner = userRole === 'owner';
  const isCompanyVerified = activeCompany.verificationStatus === 'verified';
  const workspaceKind = (activeCompany.accountType ?? 'company') as 'company' | 'team' | 'individual';
  const isBuyerAccount = workspaceKind === 'company';
  const requiresLegalVerification = workspaceKind === 'company';
  const isIndividual = workspaceKind === 'individual';
  const roleLabel = isIndividual ? t('dashboard.roleIndividual') : displayRoleName(userRole, workspaceKind, t);
  const verificationLabel = VERIFICATION_STATUS_KEYS[activeCompany.verificationStatus]
    ? t(VERIFICATION_STATUS_KEYS[activeCompany.verificationStatus])
    : activeCompany.verificationStatus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const myProfilePath = activeCompany?.slug ? profilePath({ slug: activeCompany.slug, accountType: workspaceKind }) : null;
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
    // Phones: while a new search is loading keep showing the last list instead of flashing
    // the loading placeholders on every letter typed. Desktop behaves as before.
    placeholderData: isPhone ? keepPreviousData : undefined,
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
      toast({ title: t('dashboard.removeVendorTitle'), description: `\u2068${name}\u2069 ${t('dashboard.removedFromBase')}` });
    },
    onError: () => {
      toast({ title: t('dashboard.removeVendorTitle'), description: t('dashboard.removeVendorError'), variant: 'destructive' });
    },
  });

  // Fetch pending join requests
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery<JoinRequest[]>({
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
  
  const { data: onboardingTasks, isLoading: loadingOnboarding } = useQuery<OnboardingTasks>({
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
  const uniqueCategories = Array.from(new Set(vendors.map(v => v.category).filter((c): c is string => Boolean(c)))).sort();
  const uniqueCities = Array.from(new Set(vendors.map(v => v.city).filter(Boolean) as string[])).sort();

  // Filter vendors based on category, city, and verification status
  const filteredVendors = vendors.filter(vendor => {
    const matchesCategory = categoryFilter === 'all' || vendor.category === categoryFilter;
    const matchesCity = cityFilter === 'all' || vendor.city === cityFilter;
    const matchesVerification = verificationFilter === 'all'
      || (verificationFilter === 'unverified' ? vendor.verificationStatus !== 'verified' : vendor.verificationStatus === verificationFilter);
    return matchesCategory && matchesCity && matchesVerification;
  });

  const activeFilterCount = [categoryFilter, cityFilter, verificationFilter].filter(f => f !== 'all').length;

  // Category and city are stored in English; show them in the page language. A
  // vendor with no category set gets our own translated placeholder, not the
  // server's (the server used to send the literal English "No category").
  const vendorCategoryText = (category: string | null) => category ? categoryLabel(category, isRtl) : t('dashboard.noCategory');
  const vendorJoinText = (method: string) => method === 'invitation' ? t('dashboard.invitedMethod') : method === 'proposal_accepted' ? t('dashboard.viaProposal') : t('dashboard.appliedViaTraction');
  const clearVendorFilters = () => { setCategoryFilter('all'); setCityFilter('all'); setVerificationFilter('all'); };
  // A workspace with no vendors at all (nothing searched, nothing filtered) skips the search and filters on phones.
  const vendorsEmptyWorkspace = !loadingVendors && vendors.length === 0 && !searchQuery && activeFilterCount === 0;

  // Delete tender mutation
  const deleteTender = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/tenders/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: t('dashboard.rfpDeleted'),
        description: t('dashboard.rfpDeletedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('dashboard.rfpDeleteFailed'),
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
      case 'published': return { state, label: t('dashboard.published') };
      case 'draft':     return { state, label: t('dashboard.draft') };
      case 'closed':    return { state, label: t('dashboard.closedLabel') };
      case 'cancelled': return { state, label: t('tenderCard.cancelled') };
      default:          return { state, label: status };
    }
  };

  // Format date
  // Month name in the page language, Western digits in both.
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US', { 
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors-base'] });
      toast({
        title: t('dashboard.requestApproved'),
        description: t('dashboard.requestApprovedDesc'),
      });
      setSelectedRequest(null);
      setProfileDrawerOpen(false);
      setProfileJoinRequestId(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('dashboard.requestApproveFailed'),
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
        title: t('dashboard.requestRejected'),
        description: t('dashboard.requestRejectedDesc'),
      });
      setSelectedRequest(null);
      setProfileDrawerOpen(false);
      setProfileJoinRequestId(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('dashboard.requestRejectFailed'),
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
          ? t('dashboard.offerAcceptedDesc')
          : variables.status === 'shortlisted'
          ? t('dashboard.offerShortlistedDesc')
          : t('dashboard.offerRejectedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('dashboard.offerUpdateFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const doLogout = useLogout();
  const handleLogout = () => {
    doLogout("/");
  };

  // One entry per checklist step, gated by the *same* condition that renders the
  // step's AccordionItem below (keep the two in step). Feeds the progress text and
  // the phone loading skeleton's row count.
  const checklistFlags = [
    ...(canManage && requiresLegalVerification ? [isCompanyVerified] : []),          // task-1
    ...(canManage && (isBuyerAccount || isTeam) ? [onboardingTasks?.hasCompletedProfile] : []), // task-2
    ...(canManage && isBuyerAccount ? [onboardingTasks?.hasVendors] : []),           // task-3
    ...(isBuyerAccount ? [onboardingTasks?.hasTender] : []),                         // task-4
    ...(isIndividual ? [hasProfileComplete] : []),                                   // task-4b
    onboardingTasks?.hasReviewedProposal,                                            // task-5
    onboardingTasks?.hasExploredMarketplace,                                         // task-6
  ];
  // On phones, until /api/onboarding-tasks answers, show pulsing placeholders
  // instead of "0 of N" and rows painted "not done" that then flip to done.
  const showChecklistSkeleton = isPhone && loadingOnboarding;

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
      <DrawerCloseBridge closeRef={closeDrawerRef} />
      <Sidebar collapsible="icon" side={isRtl ? "right" : "left"} className={isRtl ? "border-l border-border dark:border-border" : "border-r border-border dark:border-border"}>
        {/* Brand accent strip */}
        <div className="h-0.5 bg-gradient-to-r from-[#FE3C01] to-[#F19A8F] flex-shrink-0" />
        <SidebarHeader className="border-b px-4 py-4">
          <div className={`flex items-center gap-3 max-md:gap-2`}>
            <SidebarLogoToggle />
            {companies.length > 1 || canActivateIndividual ? (
              <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'} onOpenChange={(open) => { if (open) setMenuBoundary(document.querySelector('[data-mobile="true"]')); }}>
                <DropdownMenuTrigger asChild>
                  <button className={`flex-1 min-w-0 group-data-[collapsible=icon]:hidden flex items-center gap-1 hover:bg-muted/50 active:bg-muted rounded-md px-2 py-1 -mx-2 transition-colors max-md:min-h-11 ${isRtl ? 'text-right' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-sm truncate">
                        <UserText className="max-md:whitespace-normal max-md:line-clamp-2 max-md:break-words">{activeCompany.profile?.displayName || activeCompany.name}</UserText>
                      </h2>
                      <p className="text-xs text-muted-foreground truncate max-md:whitespace-normal">
                        {roleLabel}{requiresLegalVerification && ` • ${verificationLabel}`}
                      </p>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? 'end' : 'start'} collisionBoundary={isPhone && menuBoundary ? [menuBoundary] : undefined} collisionPadding={8} className="w-64">
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
                      className={`flex items-center gap-3 py-2 max-md:min-h-12 ${company.id === activeCompany.id ? 'bg-primary/5' : ''}`}
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-medium text-xs flex-shrink-0">
                        {(Array.from(String(company.profile?.displayName || company.name))[0] ?? '').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate"><UserText>{company.profile?.displayName || company.name}</UserText></p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {company.accountType === 'individual'
                            ? t('dashboard.roleIndividual')
                            : displayRoleName(company.role, (company.accountType ?? 'company') as any, t)}
                        </p>
                      </div>
                      {company.id === activeCompany.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  {canActivateIndividual && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setLocation('/onboarding/individual-basics')}
                        className="flex items-center gap-3 py-2 max-md:min-h-12"
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
                  <UserText className="max-md:whitespace-normal max-md:line-clamp-2 max-md:break-words">{activeCompany.profile?.displayName || activeCompany.name}</UserText>
                </h2>
                <p className="text-xs text-muted-foreground truncate max-md:whitespace-normal">
                  {roleLabel}{requiresLegalVerification && ` • ${verificationLabel}`}
                </p>
              </div>
            )}
            {myProfilePath && (
              <button
                type="button"
                onClick={() => window.open(myProfilePath, '_blank', 'noopener,noreferrer')}
                title={t('settings.viewPublicProfile')}
                aria-label={t('settings.viewPublicProfile')}
                className="h-7 w-7 max-md:h-11 max-md:w-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-[#FE3C01] hover:bg-[#FE3C01]/10 active:bg-[#FE3C01]/10 transition-colors flex-shrink-0 group-data-[collapsible=icon]:hidden"
                data-testid="button-view-public-profile-sidebar"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            <SidebarTrigger className="ms-auto flex-shrink-0 group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarHeader>
        
        {/* data-audit-ok="covered": this box scrolls above the pinned profile footer, so
            the mobile checklist sees rows that are scrolled out of view as "covered" by
            the footer (see the reason in the page result file). */}
        <SidebarContent data-audit-ok="covered">
          {/* Action Items - Create & Search */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {canManage && canCreateTenders && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => { closeDrawerRef.current(); handleCreateTender(); }}
                      tooltip={t('dashboard.createTender')}
                      data-testid="sidebar-create-tender"
                      data-tour="create-tender"
                      className="py-3 text-base rounded-xl bg-[#FE3C01] text-white hover:bg-[#1A1613] hover:text-white active:bg-[#1A1613] active:text-white shadow-[0_10px_24px_-8px_rgba(254,60,1,0.55)] transition-all"
                    >
                      <Plus className="h-5 w-5 text-white" />
                      <span className="text-base font-medium group-data-[collapsible=icon]:hidden text-white">{t('dashboard.createTender')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isIndividual && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => myProfilePath
                        ? window.open(myProfilePath, '_blank')
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
                    <SidebarSearchButton label={t('dashboard.searchTenders')} onOpen={() => setShowSearchModal(true)} />
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
                  className="w-full rounded-xl border border-[#FE3C01]/20 bg-gradient-to-br from-[#FE3C01]/5 to-[#F19A8F]/10 px-3 py-3 hover:from-[#FE3C01]/10 hover:to-[#F19A8F]/20 hover:border-[#FE3C01]/30 active:scale-[0.98] active:from-[#FE3C01]/10 active:to-[#F19A8F]/20 transition-all group/mp cursor-pointer group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
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
                    className="w-full rounded-xl border border-purple-300/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 px-3 py-3 hover:from-purple-500/15 hover:to-indigo-500/20 hover:border-purple-400/40 active:scale-[0.98] active:from-purple-500/15 active:to-indigo-500/20 transition-all group/admin cursor-pointer group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center"
                  >
                    <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:gap-0">
                      <div className="h-8 w-8 rounded-lg bg-[var(--bid-orange)]/15 flex items-center justify-center flex-shrink-0 group-hover/admin:bg-[var(--bid-orange)]/25 transition-colors">
                        <ShieldCheck className="h-4 w-4 text-[var(--bid-orange)] dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-start group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{t('settings.adminPanelLabel')}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{t('settings.adminPanelDesc')}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-purple-400/50 group-hover/admin:text-purple-500 transition-colors flex-shrink-0 rtl:-scale-x-100 group-data-[collapsible=icon]:hidden" />
                    </div>
                  </button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Support — direct line to the team, same details as the landing footer */}
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 group-data-[collapsible=icon]:px-0">
                <div className="w-full rounded-xl border border-border bg-muted/40 px-3 py-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:rounded-lg">
                  <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                    <div className="h-8 w-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="h-4 w-4 text-[#FE3C01]" />
                    </div>
                    <div className="flex-1 min-w-0 text-start group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{t('support.heading')}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{t('support.needHelp')}</p>
                    </div>
                  </div>
                  <SupportContactLinks
                    className="mt-2.5 flex flex-col gap-1 group-data-[collapsible=icon]:hidden"
                    linkClassName="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent transition-colors max-md:min-h-11 max-md:text-sm"
                    iconClassName="h-3.5 w-3.5 text-[#FE3C01] flex-shrink-0"
                    showSocial={false}
                  />
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Tender-creation entry point (its "+" opens /tenders/new/ai), so it
              follows the same gate as the create-tender button above rather
              than rendering for workspace types that can't create tenders. */}
          {canManage && canCreateTenders && <ChatHistorySidebar />}
        </SidebarContent>

        <SidebarFooter className="border-t px-4 py-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:max-h-[45dvh] max-md:overflow-y-auto max-md:overscroll-contain">
          {/* Legal verification belongs to company workspaces only. */}
          {requiresLegalVerification && activeCompany.verificationStatus === 'not_verified' && (
            <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">{t('settings.companyNotVerified')}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-1.5 leading-snug">{t('settings.companyNotVerifiedDesc')}</p>
              <button
                onClick={() => setLocation('/settings?tab=company')}
                className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 active:opacity-70 max-md:inline-flex max-md:min-h-11 max-md:items-center"
              >
                {t('settings.verifyNow')}
              </button>
            </div>
          )}
          {requiresLegalVerification && activeCompany.verificationStatus === 'under_review' && (
            <div className="mb-3 rounded-lg bg-[var(--bid-orange)]/5 dark:bg-blue-950/40 border border-[var(--bid-orange)]/20 dark:border-blue-800 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-0.5">{t('settings.verificationInProgress')}</p>
              <p className="text-xs text-[var(--bid-orange)] dark:text-blue-400 leading-snug">{t('settings.verificationInProgressDesc')}</p>
            </div>
          )}
          {requiresLegalVerification && activeCompany.verificationStatus === 'rejected' && (
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
                className="text-xs font-semibold text-red-800 dark:text-red-300 underline underline-offset-2 hover:text-red-900 active:opacity-70 max-md:inline-flex max-md:min-h-11 max-md:items-center"
              >
                {t('settings.reUploadDocuments')}
              </button>
            </div>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-3 w-full hover:bg-accent active:bg-accent rounded-md p-1 -m-1 transition-colors max-md:min-h-11 ${isRtl ? 'text-right' : ''}`} data-testid="button-user-menu" data-tour="user-menu">
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
                  {/* Individuals have no verification state to show — they're
                      never asked to verify an identity. */}
                  {requiresLegalVerification && (activeCompany.verificationStatus === 'verified' ? (
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
                  ))}
                </div>
                <span dir="auto" data-user-content className="text-sm font-medium truncate group-data-[collapsible=icon]:hidden">
                  {user.name || user.username}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align={isRtl ? "end" : "start"} collisionPadding={8} className="w-72 mb-2 p-0 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain">
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
                    <p className="font-semibold text-sm truncate"><UserText>{user.name || user.username}</UserText></p>
                    <p className="text-xs text-muted-foreground truncate"><UserText>{user.email}</UserText></p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
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
                      <span className="text-sm text-start flex-1">{t('settings.notifications')}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:-scale-x-100" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side={isPhone ? "bottom" : "right"} align="start" collisionPadding={8} className="w-72 p-0">
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
                            className={`w-full flex items-start gap-3 p-3 transition-colors text-start border-b last:border-b-0 ${
                              offer.isViewed
                                ? 'hover:bg-accent active:bg-accent opacity-60'
                                : 'bg-[var(--bid-orange)]/5 dark:bg-blue-900/20 hover:bg-[var(--bid-orange)]/10 dark:hover:bg-blue-900/30 active:bg-[var(--bid-orange)]/10 dark:active:bg-blue-900/30 font-medium'
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
                              <p className={`text-xs truncate ${offer.isViewed ? 'text-muted-foreground' : 'text-muted-foreground font-medium'}`}><UserText>{offer.tender?.title}</UserText></p>
                              <p className={`text-xs mt-0.5 ${offer.isViewed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {new Date(offer.submittedAt).toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US', { month: 'short', day: 'numeric' })}
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
                          className="w-full text-center text-sm text-[var(--bid-orange)] dark:text-blue-400 hover:underline active:opacity-70 py-1"
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
                      className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
                      data-testid="menu-help"
                    >
                      <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-start flex-1">{t('settings.helpCenter')}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:-scale-x-100" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side={isPhone ? "bottom" : "right"} align="start" collisionPadding={8} className="w-48 p-1">
                    <button onClick={() => setLocation('/getting-started')} className="w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm hover:bg-accent active:bg-accent transition-colors">
                      {t('settings.gettingStarted')}
                    </button>
                    <button onClick={() => setLocation('/faq')} className="w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm hover:bg-accent active:bg-accent transition-colors">
                      {t('settings.faqs')}
                    </button>
                    <button onClick={() => window.location.href = 'mailto:info@bid.sa'} className="w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm hover:bg-accent active:bg-accent transition-colors">
                      {t('settings.contactSupport')}
                    </button>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
                      data-testid="menu-language"
                    >
                      <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-start flex-1">{t('settings.language')}</span>
                      <span className="text-xs text-muted-foreground">
                        {language === 'en' ? t('companyProfileEditor.langEnglish') : t('companyProfileEditor.langArabic')}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:-scale-x-100" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side={isPhone ? "bottom" : "right"} align="start" collisionPadding={8} className="w-40 p-1">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm transition-colors ${
                        language === 'en' ? 'bg-accent font-medium' : 'hover:bg-accent active:bg-accent'
                      }`}
                      data-testid="lang-english"
                    >
                      {language === 'en' && <Check className="h-4 w-4" />}
                      <span className={language !== 'en' ? 'ms-6' : ''}>{t('companyProfileEditor.langEnglish')}</span>
                    </button>
                    <button
                      onClick={() => setLanguage('ar')}
                      className={`w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm transition-colors ${
                        language === 'ar' ? 'bg-accent font-medium' : 'hover:bg-accent active:bg-accent'
                      }`}
                      data-testid="lang-arabic"
                    >
                      {language === 'ar' && <Check className="h-4 w-4" />}
                      <span className={language !== 'ar' ? 'ms-6' : ''}>{t('companyProfileEditor.langArabic')}</span>
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
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 max-md:py-3 px-3 rounded-md text-sm transition-colors ${
                      currentTheme === 'light'
                        ? 'bg-background shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground active:text-foreground'
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
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 max-md:py-3 px-3 rounded-md text-sm transition-colors ${
                      currentTheme === 'dark'
                        ? 'bg-background shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground active:text-foreground'
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
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 max-md:py-3 px-3 rounded-md text-sm transition-colors ${
                      currentTheme === 'system'
                        ? 'bg-background shadow-sm font-medium'
                        : 'text-muted-foreground hover:text-foreground active:text-foreground'
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
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
                      data-testid="menu-add-account"
                    >
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm flex-1">{t('settings.addAccount')}</span>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side={isPhone ? "bottom" : isRtl ? "left" : "right"} align={isPhone ? "start" : "end"} collisionPadding={8} className="w-56 p-1">
                    <button
                      onClick={() => setLocation('/onboarding/company-basics?addAccount=1')}
                      className={`w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm hover:bg-accent active:bg-accent ${isRtl ? 'text-right' : ''}`}
                      data-testid="menu-create-organization"
                    >
                      <Building2 className="h-4 w-4" />
                      {t('settings.createOrganization')}
                    </button>
                    <button
                      onClick={() => setLocation('/onboarding?addAccount=1&join=1')}
                      className={`w-full flex items-center gap-2 px-3 py-2 max-md:py-3 rounded-md text-sm hover:bg-accent active:bg-accent ${isRtl ? 'text-right' : ''}`}
                      data-testid="menu-join-organization"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t('settings.joinOrganization')}
                    </button>
                  </PopoverContent>
                </Popover>

                {!isIndividual && (
                <button
                  onClick={() => setLocation('/company/edit')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
                  data-testid="menu-company-profile"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{isTeam ? t('settings.teamProfileMenuItem') : t('settings.companyProfileMenuItem')}</span>
                </button>
                )}

                <button
                  onClick={() => setLocation('/settings')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
                  data-testid="menu-settings"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{t('settings.settings')}</span>
                </button>

                <button 
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 max-md:py-3 hover:bg-accent active:bg-accent transition-colors ${isRtl ? 'text-right' : ''}`}
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
              className={`mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors w-full min-h-11 px-1 max-md:mt-1 group-data-[collapsible=icon]:hidden`}
              data-testid="button-retake-tour"
            >
              <HelpCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{t('dashboard.takeTour')}</span>
            </button>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Search Tenders Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <div className="p-6 max-md:pt-14 border-b">
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
                    className="w-full text-start p-6 hover:bg-muted dark:hover:bg-gray-800 active:bg-muted dark:active:bg-gray-800 transition-colors group"
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
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-border bg-card">
          <SidebarTrigger className="h-9 w-9 -ms-1.5" aria-label={t('dashboard.openMenu')} data-testid="button-open-menu" />
          <BidLogo variant="orange" size={24} />
        </header>
        {/* Main Content. data-audit-ok (phones only): the fixed bottom tab bar sits on top
            of whatever is scrolled to the bottom edge, and the last row always clears it
            (max-md:pb-28), so the mobile checklist's "covered" on a control at the fold
            is expected, not a bug (reason in the page result file). */}
        <main
          ref={mainRef}
          data-audit-ok={isPhone ? "covered" : undefined}
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
          <Tabs dir={isRtl ? 'rtl' : 'ltr'} value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-10 w-full pt-2 px-1 sm:px-2">

            {/* ── Signal desk — heading + live stats fused into one ink panel ── */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              dir={isRtl ? 'rtl' : 'ltr'}
              className={`bid-grain relative overflow-hidden rounded-[28px] bg-[#171310] px-6 sm:px-9 pt-8 sm:pt-10 ${canManage ? 'pb-7 sm:pb-9' : 'pb-8'} text-start`}
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
                <h1 className="font-display font-bold text-4xl sm:text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[0.95] max-md:rtl:leading-[1.3]">
                  {t('dashboard.overview')}<span className="text-[#FE3C01]">.</span>
                </h1>
                {canManage && (
                  <p className="text-sm sm:text-base text-[#B9AFA5] mt-3 max-w-xl leading-relaxed [unicode-bidi:plaintext]">
                    {t('dashboard.getStartedDesc')}
                  </p>
                )}
              </div>

              {/* Buyer metrics: RFPs owned, proposals received, vendors managed.
                  None of these mean anything for an individual (who IS the vendor)
                  or a team (not a buyer account), and the matching tabs below are
                  gated the same way — keep the two in step. */}
              {canManage && isBuyerAccount && (
                <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8" data-tour="dashboard-tabs">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0, duration: 0.35, ease: "easeOut" }}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveTab('tenders')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('tenders'); } }}
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 transition-colors max-md:transition-[background-color,border-color,transform] max-md:active:scale-[0.98] max-md:active:bg-white/[0.10] hover:bg-white/[0.07] hover:border-[#FE3C01]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  >
                    <div className={`flex items-start gap-4`}>
                      <div className="h-11 w-11 rounded-xl bg-[#FE3C01] text-white flex items-center justify-center flex-shrink-0 shadow-[0_8px_18px_-6px_rgba(254,60,1,0.5)]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <p className="font-display font-bold text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[1] tabular-nums">
                          <StatNumber loading={loadingTenders}>{tenders.filter(tender => tender.status === 'published').length}</StatNumber>
                        </p>
                        <p className="text-sm text-[#B9AFA5] mt-2 font-medium [unicode-bidi:plaintext]">{t('dashboard.activeRfps')}</p>
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
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 transition-colors max-md:transition-[background-color,border-color,transform] max-md:active:scale-[0.98] max-md:active:bg-white/[0.10] hover:bg-white/[0.07] hover:border-[#FE3C01]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  >
                    <div className={`flex items-start gap-4`}>
                      <div className="h-11 w-11 rounded-xl bg-white/10 text-[#F4EDE1] flex items-center justify-center flex-shrink-0 border border-white/10">
                        <Inbox className="h-5 w-5" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <p className="font-display font-bold text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[1] tabular-nums">
                          <StatNumber loading={loadingIncomingOffers}>{incomingOffers.filter(o => o.status === 'pending').length}</StatNumber>
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
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 transition-colors max-md:transition-[background-color,border-color,transform] max-md:active:scale-[0.98] max-md:active:bg-white/[0.10] hover:bg-white/[0.07] hover:border-[#FE3C01]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  >
                    <div className={`flex items-start gap-4`}>
                      <div className="h-11 w-11 rounded-xl bg-white/10 text-[#F4EDE1] flex items-center justify-center flex-shrink-0 border border-white/10">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
                        <p className="font-display font-bold text-5xl text-[#F4EDE1] tracking-[-0.04em] leading-[1] tabular-nums">
                          <StatNumber loading={loadingVendors}>{vendors.length}</StatNumber>
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
                  <div className={`flex items-center gap-4 mb-5`}>
                    <div className="h-11 w-11 rounded-2xl bg-[#FE3C01] flex items-center justify-center flex-shrink-0 shadow-[0_8px_18px_-6px_rgba(254,60,1,0.45)]">
                      <Handshake className="h-5 w-5 text-white" />
                    </div>
                    <div className={`min-w-0 ${isRtl ? 'text-right' : ''}`}>
                      <h3 className="font-display font-bold text-xl text-[#1A1613] dark:text-foreground tracking-[-0.02em]">{t('dashboard.readyToNegotiateTitle')}</h3>
                      <p className="text-sm text-[#8A8078] max-md:text-[#6B635B] dark:text-muted-foreground dark:max-md:text-muted-foreground mt-0.5">
                        {t('dashboard.readyToNegotiateDesc').replace('{count}', String(tendersReadyToNegotiate.length))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {tendersReadyToNegotiate.slice(0, 3).map(tender => (
                      <div key={tender.id} className={`[background:var(--spotlight-card-bg)] rounded-2xl border border-[#FE3C01]/10 px-4 py-3 flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-3 shadow-[0_8px_20px_-12px_rgba(11,9,7,0.12)]`}>
                        <div className={`min-w-0 ${isRtl ? 'text-right' : ''}`}>
                          <p dir="auto" className="font-semibold text-sm text-[#1A1613] dark:text-foreground max-md:line-clamp-2 [overflow-wrap:anywhere]">{tender.title}</p>
                          <p className="text-xs text-[#8A8078] max-md:text-[#6B635B] dark:text-muted-foreground dark:max-md:text-muted-foreground mt-0.5">
                            {t('dashboard.proposalsCount').replace('{count}', String(tender.offersCount))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#1A1613] hover:bg-[#FE3C01] text-[#F4EDE1] rounded-full px-4 flex-shrink-0 transition-colors max-md:h-11 max-md:w-full"
                          onClick={() => setLocation(`/tenders/${tender.id}`)}
                        >
                          {t('dashboard.negotiateNowBtn')} {isRtl ? '←' : '→'}
                        </Button>
                      </div>
                    ))}
                    {tendersReadyToNegotiate.length > 3 && (
                      <button
                        type="button"
                        className={`block w-full text-xs text-[#FE3C01] cursor-pointer hover:underline font-medium ${isRtl ? 'text-right' : 'text-start'} px-1 pt-1 max-md:min-h-11 max-md:py-2 max-md:active:opacity-60`}
                        onClick={() => setActiveTab('tenders')}
                      >
                        {t('dashboard.moreTenders', { count: tendersReadyToNegotiate.length - 3 })} {isRtl ? '←' : '→'}
                      </button>
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
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 sm:px-6`}>
                <div className={`flex items-center gap-3.5 min-w-0`}>
                  <div className="h-9 w-9 rounded-xl bg-[#FE3C01]/10 flex items-center justify-center flex-shrink-0">
                    <Play className="h-4 w-4 text-[#FE3C01] fill-[#FE3C01]" />
                  </div>
                  <div className={`min-w-0 ${isRtl ? 'text-right' : ''}`}>
                    <h3 className="font-display font-bold text-base text-[#1A1613] dark:text-foreground tracking-[-0.02em]">{t('dashboard.bookDemoTitle')}</h3>
                    <p className="text-sm text-[#8A8078] max-md:text-[#6B635B] dark:text-muted-foreground dark:max-md:text-muted-foreground mt-0.5">{t('dashboard.bookDemoDesc')}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full px-5 flex-shrink-0 border-[#1A1613]/20 text-[#1A1613] dark:text-foreground hover:bg-[#FE3C01] hover:text-white hover:border-[#FE3C01] transition-colors"
                  data-testid="button-book-demo"
                  onClick={() => window.open('https://cal.com/abdulrahman-alsaleh-bid/15min', '_blank', 'noopener,noreferrer')}
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
              <div className="px-4 sm:px-8 pt-7 pb-6 sm:pt-8 sm:pb-8">
                <div className={`mb-6 ${isRtl ? 'text-right' : ''}`}>
                      <span className="inline-block text-xs font-semibold text-[#FE3C01] bg-[#FFE4D7] dark:bg-[#FE3C01]/15 px-3 py-1.5 rounded-full mb-3 tracking-wide">
                        02
                      </span>
                      <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#1A1613] dark:text-foreground tracking-[-0.035em] leading-[1.05] max-md:rtl:leading-[1.3]">{t('dashboard.getStartedTitle')}<span className="text-[#FE3C01]">.</span></h2>
                      <p className="text-sm text-[#8A8078] max-md:text-[#6B635B] dark:text-muted-foreground dark:max-md:text-muted-foreground mt-2 max-w-xl">{t('dashboard.getStartedDesc')}</p>
                    </div>

                    {/* Animated progress bar */}
                    <div className="mb-6">
                      {(() => {
                        // One entry per task below, gated by the *same* condition
                        // that renders it. Keep these in step with the
                        // AccordionItems — a hand-kept parallel list drifts, and
                        // then the progress text counts tasks nobody can see (or
                        // misses ones they can).
                        const allFlags = checklistFlags;
                        const localCount = allFlags.filter(Boolean).length;
                        const total = allFlags.length;
                        const pct = total > 0 ? Math.round((localCount / total) * 100) : 0;
                        if (showChecklistSkeleton) return (
                          <div aria-busy="true">
                            <div className="flex items-center justify-between mb-2">
                              <span className="block h-5 w-40 rounded-md bg-[#1A1613]/10 dark:bg-white/10 animate-pulse" />
                              <span className="block h-5 w-10 rounded-md bg-[#1A1613]/10 dark:bg-white/10 animate-pulse" />
                            </div>
                            <div className="h-2 rounded-full bg-[#1A1613]/10 dark:bg-white/10 animate-pulse" />
                          </div>
                        );
                        return (
                          <>
                            <div className={`flex items-center justify-between mb-2`}>
                              <span className="text-sm text-[#8A8078] max-md:text-[#6B635B] dark:text-muted-foreground dark:max-md:text-muted-foreground font-medium">
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
                    {showChecklistSkeleton ? (
                      <div aria-busy="true" className="space-y-3">
                        {checklistFlags.map((_, i) => (
                          <div key={i} className="h-16 rounded-2xl bg-[#1A1613]/[0.06] dark:bg-white/[0.06] animate-pulse" />
                        ))}
                      </div>
                    ) : (
                    <Accordion type="single" collapsible defaultValue={canManage && !isIndividual ? "task-1" : "task-4"} className="space-y-3">

                      {/* Task 1: Get Verified (admins/owners only — individuals are auto-verified and never need this) */}
                      {canManage && requiresLegalVerification && (
                      <AccordionItem value="task-1" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${isCompanyVerified ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCompanyVerified ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {isCompanyVerified ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${isCompanyVerified ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task1Title')}</span>
                            {isCompanyVerified && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {isCompanyVerified ? (
                                <StepDone>{t('dashboard.task1Done')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task1Desc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={() => setLocation('/settings?tab=company&highlight=verification')}
                                    data-testid="button-task-get-verified"
                                  >
                                    {t('dashboard.task1Action')}
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <GetVerifiedVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 2: Complete Company Profile (only for owners/admins) */}
                      {canManage && (isBuyerAccount || isTeam) && (
                      <AccordionItem value="task-2" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${onboardingTasks?.hasCompletedProfile ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasCompletedProfile ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasCompletedProfile ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${onboardingTasks?.hasCompletedProfile ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{isTeam ? t('dashboard.task2TitleTeam') : t('dashboard.task2Title')}</span>
                            {onboardingTasks?.hasCompletedProfile && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {onboardingTasks?.hasCompletedProfile ? (
                                <StepDone>{t('dashboard.stepDone')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{isTeam ? t('dashboard.task2DescTeam') : t('dashboard.task2Desc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={() => setLocation('/settings?tab=company')}
                                    data-testid="button-task-complete-profile"
                                  >
                                    {t('dashboard.task2Action')}
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <CompanyProfileVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 3: Set Your Vendors Base (admins/owners only) */}
                      {canManage && isBuyerAccount && (
                      <AccordionItem value="task-3" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${onboardingTasks?.hasVendors ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasVendors ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasVendors ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${onboardingTasks?.hasVendors ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task3Title')}</span>
                            {onboardingTasks?.hasVendors && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {onboardingTasks?.hasVendors ? (
                                <StepDone>{t('dashboard.stepDone')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task3Desc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={() => setActiveTab('vendors')}
                                    data-testid="button-task-set-vendors"
                                  >
                                    {t('dashboard.task3Action')}
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <VendorsBaseVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      )}

                      {/* Task 4: Create your First RFP (company/team only) */}
                      {isBuyerAccount && <AccordionItem value="task-4" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${onboardingTasks?.hasTender ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasTender ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasTender ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${onboardingTasks?.hasTender ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task4Title')}</span>
                            {onboardingTasks?.hasTender && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {onboardingTasks?.hasTender ? (
                                <StepDone>{t('dashboard.stepDone')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task4Desc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={handleCreateTender}
                                    data-testid="button-task-create-rfp"
                                  >
                                    {t('dashboard.task4Action')}
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <CreateTenderVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                      {/* Task 4b: Complete your profile (individual only) */}
                      {isIndividual && <AccordionItem value="task-4b" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${hasProfileComplete ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${hasProfileComplete ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {hasProfileComplete ? <Check className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${hasProfileComplete ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task4bTitle')}</span>
                            {hasProfileComplete && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {hasProfileComplete ? (
                                <StepDone>{t('dashboard.stepDone')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task4bDesc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={() => setLocation('/company/edit')}
                                    data-testid="button-task-complete-profile"
                                  >
                                    {t('dashboard.task4bAction')}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                      {/* Task 5: Submit your First Proposal */}
                      <AccordionItem value="task-5" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${onboardingTasks?.hasReviewedProposal ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasReviewedProposal ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasReviewedProposal ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${onboardingTasks?.hasReviewedProposal ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{isIndividual ? t('dashboard.task5TitleIndividual') : t('dashboard.task5Title')}</span>
                            {onboardingTasks?.hasReviewedProposal && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {onboardingTasks?.hasReviewedProposal ? (
                                <StepDone>{t('dashboard.stepDone')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{isIndividual ? t('dashboard.task5DescIndividual') : t('dashboard.task5Desc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={() => setActiveTab('proposals')}
                                    data-testid="button-task-submit-proposal"
                                  >
                                    {t('dashboard.task5Action')}
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <SubmitProposalVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Task 6: Explore Tenders Marketplace */}
                      <AccordionItem value="task-6" className={`border-2 rounded-2xl px-4 md:px-5 transition-all duration-300 ${onboardingTasks?.hasExploredMarketplace ? 'border-[#FE3C01] [background:var(--spotlight-card-bg)] dark:bg-[#FE3C01]/10 shadow-[0_8px_20px_-12px_rgba(254,60,1,0.22)]' : '[background:var(--spotlight-card-bg)] border-[#FE3C01]/10 hover:border-[#FE3C01]/30 dark:border-border dark:hover:border-gray-600 shadow-[0_8px_20px_-16px_rgba(11,9,7,0.18)]'}`}>
                        <AccordionTrigger className={`hover:no-underline py-3 max-md:active:opacity-60`}>
                          <div className={`flex items-center gap-3 max-md:flex-1 max-md:min-w-0`}>
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${onboardingTasks?.hasExploredMarketplace ? 'bg-[#FE3C01] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {onboardingTasks?.hasExploredMarketplace ? <Check className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                            </div>
                            <span className={`font-semibold flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-start'} ${onboardingTasks?.hasExploredMarketplace ? 'text-[#FE3C01]' : 'text-gray-900 dark:text-foreground'}`}>{t('dashboard.task6Title')}</span>
                            {onboardingTasks?.hasExploredMarketplace && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] max-md:text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                                <Check className="h-2.5 w-2.5" /><span className="max-[400px]:sr-only">{t('dashboard.completed')}</span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className={`flex items-center gap-8`}>
                            <div className={`flex-1 min-w-0 max-w-md space-y-4 ${isRtl ? 'text-right' : ''}`}>
                              {onboardingTasks?.hasExploredMarketplace ? (
                                <StepDone>{t('dashboard.stepDone')}</StepDone>
                              ) : (
                                <>
                                  <p className="text-[15px] leading-relaxed text-muted-foreground dark:text-muted-foreground">{t('dashboard.task6Desc')}</p>
                                  <Button
                                    className="bg-[#FE3C01] hover:bg-[#D44D3A] text-white max-md:w-full"
                                    onClick={handleExploreMarketplace}
                                    data-testid="button-task-explore-marketplace"
                                  >
                                    {t('dashboard.task6Action')}
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="hidden md:block w-[220px] flex-shrink-0 ms-auto pointer-events-none select-none">
                              <TendersMarketplaceVisual />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                    </Accordion>
                    )}
                  </div>
                </motion.div>

          </TabsContent>

          {/* Tenders Tab — buyer-only, same reasoning as the Vendors Base tab. */}
          {canManage && isBuyerAccount && (
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
                className="max-md:flex-col max-md:items-stretch max-md:gap-4"
                action={isPhone && !loadingTenders && filteredTenders.length === 0 ? undefined : (
                  <ParticleButton
                    onSuccess={handleCreateTender}
                    successDuration={600}
                    particleColor="bg-blue-400"
                    className="bg-[#FE3C01] hover:bg-[#1A1613] text-white rounded-full shadow-[0_10px_24px_-8px_rgba(254,60,1,0.5)] transition-colors max-md:w-full max-md:active:bg-[#1A1613]"
                    data-testid="button-create-tender-header"
                  >
                    <Plus className={`h-4 w-4 me-2`} />
                    {t('dashboard.newTender')}
                  </ParticleButton>
                )}
              />
              </motion.div>

              {/* Filters. On phones an empty workspace skips them: nothing to search yet, and
                  the one thing to do (create the first RFP) stays on the first screen. */}
              {!(isPhone && !loadingTenders && tenders.length === 0) && (
              <Card {...brandCardProps()}>
                <CardContent className="pt-6 max-md:p-4">
                  <div className={`flex flex-col sm:flex-row gap-4 max-md:gap-3`}>
                    <div className="relative flex-1">
                      <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                      <Input
                        placeholder={t('dashboard.searchTenders')}
                        value={tenderSearchQuery}
                        onChange={(e) => setTenderSearchQuery(e.target.value)}
                        className="ps-10 text-start"
                        data-testid="input-tender-search"
                      />
                    </div>
                    <Tabs dir={isRtl ? 'rtl' : 'ltr'} value={tenderFilter} onValueChange={(v) => withViewTransition(() => setTenderFilter(v as any))} className="w-full sm:w-auto">
                      <TabsList className="grid grid-cols-4 w-full sm:w-auto max-md:h-auto">
                        <TabsTrigger value="all" className="max-md:min-h-11 max-md:active:opacity-70" data-testid="filter-all">{t('dashboard.all')}</TabsTrigger>
                        <TabsTrigger value="published" className="max-md:min-h-11 max-md:active:opacity-70" data-testid="filter-published">{t('dashboard.published')}</TabsTrigger>
                        <TabsTrigger value="draft" className="max-md:min-h-11 max-md:active:opacity-70" data-testid="filter-draft">{t('dashboard.draft')}</TabsTrigger>
                        <TabsTrigger value="closed" className="max-md:min-h-11 max-md:active:opacity-70" data-testid="filter-closed">{t('dashboard.closed')}</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="grid grid-cols-2 gap-3 sm:contents">
                    <Select dir={isPhone && isRtl ? 'rtl' : undefined} value={tenderTypeFilter} onValueChange={(v) => withViewTransition(() => setTenderTypeFilter(v))}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9 max-md:h-11 max-md:active:bg-accent" data-testid="filter-tender-type">
                        <SelectValue placeholder={t('dashboard.allTypes')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="max-md:min-h-11">{t('dashboard.allTypes')}</SelectItem>
                        {Object.entries(SUBMISSION_TYPE_LABEL_KEYS).map(([value, labelKey]) => (
                          <SelectItem key={value} value={value} className="max-md:min-h-11">{t(labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select dir={isPhone && isRtl ? 'rtl' : undefined} value={tenderOffersFilter} onValueChange={(v) => withViewTransition(() => setTenderOffersFilter(v))}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9 max-md:h-11 max-md:active:bg-accent" data-testid="filter-tender-offers">
                        <SelectValue placeholder={t('dashboard.offersReceived')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="max-md:min-h-11">{t('dashboard.offersReceived')}</SelectItem>
                        <SelectItem value="none" className="max-md:min-h-11">{t('dashboard.noOffers')}</SelectItem>
                        <SelectItem value="1-5" className="max-md:min-h-11">1-5 {t('dashboard.offers')}</SelectItem>
                        <SelectItem value="6-10" className="max-md:min-h-11">6-10 {t('dashboard.offers')}</SelectItem>
                        <SelectItem value="10+" className="max-md:min-h-11">10+ {t('dashboard.offers')}</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Tenders List */}
              {loadingTenders ? (
                isPhone ? (
                  <div className="space-y-3" data-testid="skeleton-rfps">
                    <RfpRowSkeleton />
                    <RfpRowSkeleton />
                    <RfpRowSkeleton />
                  </div>
                ) : (
                  <SkeletonList items={3} />
                )
              ) : filteredTenders.length === 0 ? (
                <Card {...brandCardProps()}>
                  <CardContent className={`flex flex-col items-center justify-center py-16 max-md:px-4 ${isPhone && tenders.length > 0 ? 'max-md:py-6' : 'max-md:py-10'}`}>
                    {/* Phones, filters on, nothing matched: no big icon tile, so the message and
                        "Clear filters" stay on the first screen above the tab bar. */}
                    {!(isPhone && tenders.length > 0) && (
                    <div className="h-16 w-16 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-4 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                      <FileText className="h-8 w-8" />
                    </div>
                    )}
                    <h3 className={`font-display font-black text-2xl mb-2 tracking-[-0.03em] max-md:text-center max-md:text-balance max-md:leading-snug ${isPhone && tenders.length > 0 ? 'max-md:text-xl' : ''}`} data-testid="text-no-tenders-title">
                      {isPhone && tenders.length > 0 ? t('dashboard.rfpNoMatches') : t('dashboard.noTenders')}
                    </h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6 max-md:text-balance" data-testid="text-no-tenders-description">
                      {isPhone && tenders.length > 0 ? t('dashboard.rfpNoMatchesDesc') : t('dashboard.noTendersDesc')}
                    </p>
                    {isPhone && tenders.length > 0 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => withViewTransition(() => { setTenderSearchQuery(""); setTenderFilter('all'); setTenderTypeFilter('all'); setTenderOffersFilter('all'); })}
                        data-testid="button-clear-rfp-filters"
                      >
                        {t('dashboard.rfpClearFilters')}
                      </Button>
                    )}
                    {!tenderSearchQuery && tenderFilter === 'all' && tenderTypeFilter === 'all' && tenderOffersFilter === 'all' && (
                      <Button
                        onClick={handleCreateTender}
                        className="bg-[var(--bid-orange)] hover:bg-[var(--bid-orange)]/90 text-white max-md:w-full max-md:active:bg-[#C93000]"
                        data-testid="button-create-first-tender"
                      >
                        <Plus className={`h-4 w-4 me-2`} />
                        {t('dashboard.createTender')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-md:space-y-3">
                      {isPhone && (
                        <p className="text-sm text-[#6B635B] dark:text-muted-foreground tabular-nums" aria-live="polite" data-testid="text-rfp-count">
                          {t('dashboard.rfpShowing', { shown: Math.min(rfpVisible, filteredTenders.length), total: filteredTenders.length })}
                        </p>
                      )}
                      {(isPhone ? filteredTenders.slice(0, rfpVisible) : filteredTenders).map((tender) => {
                        const statusBadge = getStatusBadge(tender.status, tender.deadline);
                        const isDeadlineSoon = new Date(tender.deadline).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                        const isReadyToNegotiate = tender.status === 'closed' && tender.offersCount >= 2 && !incomingOffers.some(o => o.tenderId === tender.id && o.status === 'accepted');
                        const getSpotlightColor = (status: string): 'green' | 'red' | 'orange' => {
                          switch (status) {
                            case 'cancelled': return 'red';
                            default: return 'orange';
                          }
                        };
                        
                        if (isPhone) {
                          return (
                            <RfpRowMobile
                              key={tender.id}
                              tender={tender}
                              statusBadge={statusBadge}
                              showNegotiate={isReadyToNegotiate}
                              isDeadlineSoon={isDeadlineSoon}
                              dateText={formatDate(tender.deadline)}
                              onOpen={() => setLocation(`/tenders/${tender.id}`)}
                              onEdit={() => setLocation(`/tenders/${tender.id}/edit`)}
                              onDelete={() => { setTenderToDelete(tender); setDeleteDialogOpen(true); }}
                            />
                          );
                        }

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
                                        {type === 'company' ? t('tenderFlow.audienceCompanies')
                                          : type === 'team' ? t('tenderFlow.audienceTeams')
                                          : t('tenderFlow.audienceIndividuals')}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-sm font-medium text-muted-foreground line-clamp-2" data-testid={`text-tender-description-${tender.id}`}>
                                    {tender.description}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                  <Calendar className="h-4 w-4" />
                                  <span className={`font-mono rtl:font-sans ${isDeadlineSoon ? 'text-[var(--state-lost)] font-semibold' : ''}`}>
                                    {formatDate(tender.deadline)}
                                  </span>
                                </div>
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                  <Send className="h-4 w-4" />
                                  <span data-testid={`text-proposals-count-${tender.id}`}>
                                    <span className="font-mono">{tender.offersCount}</span> {t('dashboard.offers')}
                                  </span>
                                </div>
                                {tender.submissionType && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                  <FileText className="h-4 w-4" />
                                  <span>{tender.submissionType && SUBMISSION_TYPE_LABEL_KEYS[tender.submissionType] ? t(SUBMISSION_TYPE_LABEL_KEYS[tender.submissionType]) : tender.submissionType}</span>
                                </div>
                                )}
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                  <FileText className="h-4 w-4" />
                                  <span>{tender.budgetRange || tender.budget || t('dashboard.budget')}</span>
                                </div>
                              </div>
                              
                              <div className={`flex flex-wrap gap-2`}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setLocation(`/tenders/${tender.id}`)}
                                  data-testid={`button-view-${tender.id}`}
                                >
                                  <Eye className={`h-4 w-4 me-2`} />
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
                                    <Edit className={`h-4 w-4 me-2`} />
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
                                  <Trash2 className={`h-4 w-4 me-2`} />
                                  {t('dashboard.delete')}
                                </Button>
                              </div>
                            </div>
                          </SpotlightCard>
                        );
                      })}
                      {isPhone && filteredTenders.length > rfpVisible && (
                        <Button
                          variant="outline"
                          className="h-12 w-full text-base"
                          onClick={() => withViewTransition(() => setRfpVisible((n) => n + RFP_PAGE_SIZE))}
                          data-testid="button-show-more-rfps"
                        >
                          {t('dashboard.rfpShowMore', { count: filteredTenders.length - rfpVisible })}
                        </Button>
                      )}
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

            <Tabs dir={isRtl ? 'rtl' : 'ltr'} value={(isIndividual || isTeam) ? 'submitted' : proposalsSubTab} onValueChange={(v) => withViewTransition(() => { setProposalsSubTab(v); localStorage.setItem('dashboard-proposals-tab', v); })} className="space-y-4">
              {!isIndividual && !isTeam && (
              <TabsList className={`grid w-full max-w-md grid-cols-2 max-md:h-auto ${BRAND_TABSLIST}`}>
                <TabsTrigger value="submitted" className={`gap-2 max-md:min-h-11 max-md:gap-1.5 max-md:px-2 max-md:active:opacity-70 ${BRAND_TABTRIGGER}`} data-testid="tab-submitted-proposals">
                  <Send className="h-4 w-4 max-[400px]:hidden" />
                  <span>{t('dashboard.myProposals')} <TabCount loading={loadingMyOffers} count={myOffers.length} /></span>
                </TabsTrigger>
                <TabsTrigger value="received" className={`gap-2 max-md:min-h-11 max-md:gap-1.5 max-md:px-2 max-md:active:opacity-70 ${BRAND_TABTRIGGER}`} data-testid="tab-received-proposals">
                  <Inbox className="h-4 w-4 max-[400px]:hidden" />
                  <span>{t('dashboard.incomingOffers')} <TabCount loading={loadingIncomingOffers} count={incomingOffers.length} /></span>
                </TabsTrigger>
              </TabsList>
              )}

              {/* Submitted Proposals Sub-Tab */}
              <TabsContent value="submitted" className="space-y-4">
                {loadingMyOffers ? (
                  isPhone ? (
                    <div className="space-y-3" data-testid="skeleton-my-offers">
                      <ProposalRowSkeleton />
                      <ProposalRowSkeleton />
                      <ProposalRowSkeleton />
                    </div>
                  ) : (
                    <SkeletonList items={3} />
                  )
                ) : myOffers.length === 0 ? (
                  <Card {...brandCardProps()}>
                    <CardContent className="flex flex-col items-center justify-center py-12 max-md:px-4 max-md:py-8">
                      <div className="h-14 w-14 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-3 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                        <Send className="h-7 w-7" />
                      </div>
                      <p className="font-display font-black text-2xl tracking-[-0.03em] max-md:text-center max-md:text-balance max-md:leading-snug">{t('dashboard.noProposals')}</p>
                      <p className="text-sm text-muted-foreground mt-1 max-md:text-center max-md:text-balance">
                        {t('dashboard.noProposalsDesc')}
                      </p>
                      <Button
                        className="mt-5 w-full bg-[#FE3C01] text-white hover:bg-[#d54d35] active:bg-[#C93000] md:hidden"
                        onClick={handleExploreMarketplace}
                        data-testid="button-explore-marketplace-empty"
                      >
                        <Globe />
                        {t('dashboard.task6Action')}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 max-md:space-y-3">
                        {isPhone && myOffers.length > RFP_PAGE_SIZE && (
                          <p className="text-sm text-[#6B635B] dark:text-muted-foreground tabular-nums" aria-live="polite" data-testid="text-my-offers-count">
                            {t('dashboard.rfpShowing', { shown: Math.min(sentVisible, myOffers.length), total: myOffers.length })}
                          </p>
                        )}
                        {(isPhone ? myOffers.slice(0, sentVisible) : myOffers).map((offer) => {
                          const isExpired = new Date(offer.tender.deadline) < new Date();
                          const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                          if (isPhone) {
                            return (
                              <ProposalRowMobile
                                key={offer.id}
                                kind="sent"
                                offer={offer}
                                dateText={formatDate(offer.submittedAt)}
                                tenderBadge={getStatusBadge(offer.tender.status)}
                                onOpenTender={() => setLocation(`/tenders/${offer.tender.id}`)}
                                onViewFile={(url) => viewAuthenticatedFile(url)}
                              />
                            );
                          }

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
                                    label={getStatusBadge(offer.tender.status).label}
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
                                  {offer.status === 'superseded' && (
                                    <StatusBadge state="idle" label={t('dashboard.superseded')} />
                                  )}
                                </div>
                                <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                                  {offer.tender.description || t('dashboard.noDescription')}
                                </p>
                              </div>
                            </div>

                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${isRtl ? 'text-right' : ''}`}>
                              <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {t('dashboard.submitted')} {formatDate(offer.submittedAt)}
                                </span>
                              </div>
                              <div className={`flex items-center gap-2 font-medium ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                <Clock className="h-4 w-4" />
                                <span>
                                  {isExpired ? t('dashboard.deadlinePassed') : daysLeftText(t, daysRemaining)}
                                </span>
                              </div>
                              {offer.notes && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium col-span-2`}>
                                  <FileText className="h-4 w-4" />
                                  <span className="italic line-clamp-1">"{offer.notes}"</span>
                                </div>
                              )}
                            </div>

                            <div className={`flex flex-wrap gap-2`}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                data-testid={`button-view-tender-${offer.id}`}
                              >
                                <Eye className={`h-4 w-4 me-2`} />
                                {t('dashboard.viewTender')}
                              </Button>
                              {offer.combinedFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)}
                                  title={t('dashboard.combinedProposal')}
                                >
                                  <FileText className={`h-4 w-4 me-2`} />
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
                                  <FileText className={`h-4 w-4 me-2`} />
                                </Button>
                              )}
                              {offer.financialFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                  title={t('dashboard.financialProposal')}
                                >
                                  <DollarSign className={`h-4 w-4 me-2`} />
                                </Button>
                              )}
                              {offer.videoUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(offer.videoUrl!, '_blank')}
                                  title={t('dashboard.videoPitchLabel')}
                                >
                                  <Video className={`h-4 w-4 me-2`} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </SpotlightCard>
                          );
                        })}
                        {isPhone && myOffers.length > sentVisible && (
                          <Button
                            variant="outline"
                            className="h-12 w-full text-base"
                            onClick={() => withViewTransition(() => setSentVisible((n) => n + RFP_PAGE_SIZE))}
                            data-testid="button-show-more-my-offers"
                          >
                            {t('dashboard.rfpShowMore', { count: myOffers.length - sentVisible })}
                          </Button>
                        )}
                  </div>
                )}
              </TabsContent>

              {/* Received Proposals Sub-Tab — company only */}
              {!isIndividual && !isTeam && <TabsContent value="received" className="space-y-4">
                {loadingIncomingOffers ? (
                  isPhone ? (
                    <div className="space-y-3" data-testid="skeleton-incoming-offers">
                      <ProposalRowSkeleton />
                      <ProposalRowSkeleton />
                      <ProposalRowSkeleton />
                    </div>
                  ) : (
                    <SkeletonList items={3} />
                  )
                ) : incomingOffers.length === 0 ? (
                  <Card {...brandCardProps()}>
                    <CardContent className="flex flex-col items-center justify-center py-12 max-md:px-4 max-md:py-8">
                      <div className="h-14 w-14 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-3 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                        <Inbox className="h-7 w-7" />
                      </div>
                      <p className="font-display font-black text-2xl tracking-[-0.03em] max-md:text-center max-md:text-balance max-md:leading-snug">{t('dashboard.noIncomingOffers')}</p>
                      <p className="text-sm text-muted-foreground mt-1 max-md:text-center max-md:text-balance">
                        {t('dashboard.noIncomingOffersDesc')}
                      </p>
                      {/* Offers come from RFPs: with none yet, creating one is the one thing to do. */}
                      {!loadingTenders && tenders.length === 0 && (
                        <Button
                          className="mt-5 w-full bg-[#FE3C01] text-white hover:bg-[#d54d35] active:bg-[#C93000] md:hidden"
                          onClick={handleCreateTender}
                          data-testid="button-create-tender-from-offers"
                        >
                          <Plus />
                          {t('dashboard.createTender')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 max-md:space-y-3">
                        {isPhone && incomingOffers.length > RFP_PAGE_SIZE && (
                          <p className="text-sm text-[#6B635B] dark:text-muted-foreground tabular-nums" aria-live="polite" data-testid="text-incoming-offers-count">
                            {t('dashboard.rfpShowing', { shown: Math.min(incomingVisible, incomingOffers.length), total: incomingOffers.length })}
                          </p>
                        )}
                        {(isPhone ? incomingOffers.slice(0, incomingVisible) : incomingOffers).map((offer) => {
                      const isExpired = new Date(offer.tender.deadline) < new Date();
                      const daysRemaining = Math.ceil((new Date(offer.tender.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                      if (isPhone) {
                        return (
                          <ProposalRowMobile
                            key={offer.id}
                            kind="incoming"
                            offer={offer}
                            dateText={formatDate(offer.submittedAt)}
                            onOpenTender={() => setLocation(`/tenders/${offer.tender.id}`)}
                            onViewFile={(url) => viewAuthenticatedFile(url)}
                            onOpenProfile={() => {
                              if (offer.company?.slug) {
                                window.open(`/company/${offer.company.slug}`, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          />
                        );
                      }

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
                                      <CheckCircle className={`h-3 w-3 me-1`} />
                                      {t('dashboard.accepted')}
                                    </Badge>
                                  )}
                                  {offer.status === 'rejected' && (
                                    <Badge className="bg-muted text-muted-foreground text-xs">
                                      <XCircle className={`h-3 w-3 me-1`} />
                                      {t('dashboard.rejected')}
                                    </Badge>
                                  )}
                                  {offer.status === 'shortlisted' && (
                                    <Badge className="bg-[#FE3C01]/10 text-[#FE3C01] dark:text-[#FE3C01] text-xs">
                                      <Bookmark className={`h-3 w-3 me-1`} />
                                      {t('dashboard.shortlisted')}
                                    </Badge>
                                  )}
                                  {offer.status === 'superseded' && (
                                    <Badge variant="secondary" className="text-xs">
                                      {t('dashboard.superseded')}
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
                              <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {t('dashboard.received')} {formatDate(offer.submittedAt)}
                                </span>
                              </div>
                              <div className={`flex items-center gap-2 font-medium ${isExpired ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                <Clock className="h-4 w-4" />
                                <span>
                                  {isExpired ? t('dashboard.deadlinePassed') : daysLeftText(t, daysRemaining)}
                                </span>
                              </div>
                              {offer.company.category && (
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                  <Building2 className="h-4 w-4" />
                                  <span>{categoryLabel(offer.company.category, isRtl)}</span>
                                </div>
                              )}
                              {offer.quotePrice && (
                                <div className={`flex items-center gap-2 font-medium`}>
                                  <DollarSign className="h-4 w-4 text-[var(--state-won)]" />
                                  <span className="text-[var(--state-won)]">{t('dashboard.sarAmount', { amount: offer.quotePrice.toLocaleString('en-US') })}</span>
                                </div>
                              )}
                            </div>

                            {offer.notes && (
                              <p className="text-sm mb-4 text-muted-foreground italic">"{offer.notes}"</p>
                            )}

                            <div className={`flex flex-wrap gap-2`}>
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
                                <Eye className={`h-4 w-4 me-2`} />
                                {t('dashboard.view')}
                              </Button>
                              {offer.combinedFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.combinedFileUrl!)}
                                  title={t('dashboard.combinedProposalLabel')}
                                >
                                  <FileText className={`h-4 w-4 me-2`} />
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
                                  <FileText className={`h-4 w-4 me-2`} />
                                </Button>
                              )}
                              {offer.financialFileUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}
                                  title={t('dashboard.financialProposal')}
                                >
                                  <DollarSign className={`h-4 w-4 me-2`} />
                                </Button>
                              )}
                              {offer.videoUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(offer.videoUrl!, '_blank')}
                                  title={t('dashboard.videoPitchLabel')}
                                >
                                  <Video className={`h-4 w-4 me-2`} />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="bg-[#FE3C01] hover:bg-[#d54d35] text-white"
                                onClick={() => setLocation(`/tenders/${offer.tender.id}`)}
                                data-testid={`button-review-tender-${offer.id}`}
                              >
                                <ExternalLink className={`h-4 w-4 me-2`} />
                                {t('dashboard.viewTender')}
                              </Button>
                            </div>
                          </div>
                        </SpotlightCard>
                        );
                        })}
                        {isPhone && incomingOffers.length > incomingVisible && (
                          <Button
                            variant="outline"
                            className="h-12 w-full text-base"
                            onClick={() => withViewTransition(() => setIncomingVisible((n) => n + RFP_PAGE_SIZE))}
                            data-testid="button-show-more-incoming-offers"
                          >
                            {t('dashboard.rfpShowMore', { count: incomingOffers.length - incomingVisible })}
                          </Button>
                        )}
                  </div>
                )}
              </TabsContent>}
            </Tabs>
          </TabsContent>

          {/* Vendors Base Tab — buyer-only. The tab BUTTON is already gated the
              same way; gating only the button left the panel reachable by
              setActiveTab('vendors') with no way back via the tab bar. */}
          {canManage && isBuyerAccount && (
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
                      <div className={`flex items-center gap-2`}>
                        <div className="w-8 h-8 rounded-lg bg-[#FE3C01]/10 flex items-center justify-center">
                          <Link2 className="h-4 w-4 text-[#FE3C01]" />
                        </div>
                        <div className={isRtl ? 'text-right' : ''}>
                          <p className="text-sm font-semibold">{t('dashboard.yourTractionLink')}</p>
                          <p className="text-xs text-muted-foreground">{t('dashboard.shareLinkWithVendors')}</p>
                        </div>
                      </div>
                      {isPhone ? (
                        <TractionLinkActionsMobile slug={activeCompany.profile.tractionSlug} />
                      ) : (
                      <div className={`flex items-center gap-2`}>
                        <div dir="ltr" className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
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
                      )}
                    </div>
                  ) : (
                    <TractionSlugSetup companyName={activeCompany?.name || ''} isRtl={isRtl} />
                  )}
                </CardContent>
              </Card>

              <Tabs dir={isRtl ? 'rtl' : 'ltr'} value={vendorsSubTab} onValueChange={(v) => withViewTransition(() => { setVendorsSubTab(v); localStorage.setItem('dashboard-vendors-tab', v); })} className="space-y-4">
                <TabsList className={`grid grid-cols-2 w-full max-w-2xl max-md:h-auto ${BRAND_TABSLIST}`} data-tour="vendors-tabs">
                  <TabsTrigger value="vendors-list" className={`gap-2 flex-shrink-0 sm:flex-1 whitespace-nowrap max-md:whitespace-normal max-md:min-h-11 max-md:gap-1.5 max-md:px-1.5 max-md:active:opacity-70 ${BRAND_TABTRIGGER}`} data-testid="tab-vendors-list">
                    <Users className="h-4 w-4 max-[400px]:hidden" />
                    <span>{t('dashboard.vendorsBase')} <TabCount loading={loadingVendors} count={vendors.length} /></span>
                  </TabsTrigger>
                  <TabsTrigger value="join-requests" className={`gap-2 flex-shrink-0 sm:flex-1 whitespace-nowrap max-md:whitespace-normal max-md:min-h-11 max-md:gap-1.5 max-md:px-1.5 max-md:active:opacity-70 ${BRAND_TABTRIGGER}`} data-testid="tab-join-requests" data-tour="vendors-requests-tab">
                    <UserPlus className="h-4 w-4 max-[400px]:hidden" />
                    {t('dashboard.pendingRequests')}
                    {pendingRequests.length > 0 && (
                      <Badge variant="destructive" className="ms-2 max-md:ms-1.5" data-testid="badge-pending-count">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Vendors List Sub-Tab */}
                <TabsContent value="vendors-list" className="space-y-4">
                  {/* Search */}
                  {/* On phones a workspace with no vendors yet skips search and filters: nothing to search,
                      and the one thing to do (share the joining link) stays on the first screen. */}
                  {!(isPhone && vendorsEmptyWorkspace && !vendorsTourActive) && (
                  <Card {...brandCardProps()} data-tour="vendors-search">
                    <CardContent className="pt-6 max-md:p-4">
                      <div className="relative">
                        <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                        <Input
                          placeholder={t('dashboard.searchVendors')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="ps-10 text-start"
                          enterKeyHint="search"
                          data-testid="input-vendor-search"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  )}

                  {/* Vendor Filters */}
                  {!(isPhone && vendorsEmptyWorkspace) && (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                    <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                      <Filter className="h-4 w-4" />
                    </div>
                    <Select dir={isPhone && isRtl ? 'rtl' : undefined} value={categoryFilter} onValueChange={(v) => withViewTransition(() => setCategoryFilter(v))}>
                      <SelectTrigger className="w-full sm:w-[160px] h-9 max-md:h-11 max-md:active:bg-accent" data-testid="filter-category">
                        <SelectValue placeholder={t('dashboard.allCategories')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="max-md:min-h-11">{t('dashboard.allCategories')}</SelectItem>
                        {uniqueCategories.map(cat => (
                          <SelectItem key={cat} value={cat} className="max-md:min-h-11">{vendorCategoryText(cat)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select dir={isPhone && isRtl ? 'rtl' : undefined} value={cityFilter} onValueChange={(v) => withViewTransition(() => setCityFilter(v))}>
                      <SelectTrigger className="w-full sm:w-[160px] h-9 max-md:h-11 max-md:active:bg-accent" data-testid="filter-city">
                        <SelectValue placeholder={t('dashboard.allCities')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="max-md:min-h-11">{t('dashboard.allCities')}</SelectItem>
                        {uniqueCities.map(city => (
                          <SelectItem key={city} value={city} className="max-md:min-h-11">{cityLabel(city, isRtl)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select dir={isPhone && isRtl ? 'rtl' : undefined} value={verificationFilter} onValueChange={(v) => withViewTransition(() => setVerificationFilter(v))}>
                      <SelectTrigger className="col-span-2 w-full sm:w-[160px] h-9 max-md:h-11 max-md:active:bg-accent" data-testid="filter-verification">
                        <SelectValue placeholder={t('dashboard.allStatuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="max-md:min-h-11">{t('dashboard.allStatuses')}</SelectItem>
                        <SelectItem value="verified" className="max-md:min-h-11">{t('dashboard.verified')}</SelectItem>
                        <SelectItem value="unverified" className="max-md:min-h-11">{t('dashboard.unverified')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="col-span-2 h-9 px-2 text-muted-foreground hover:text-foreground max-md:h-11 max-md:text-[#6B635B] max-md:dark:text-muted-foreground"
                        onClick={() => withViewTransition(clearVendorFilters)}
                        data-testid="button-clear-filters"
                      >
                        <X className="h-3.5 w-3.5 me-1" />
                        {t('dashboard.clearFilters')}
                      </Button>
                    )}
                  </div>
                  )}

                  {/* Active Filter Badges. Not on phones: the three dropdowns above already show what is chosen,
                      and these chips' remove buttons are 20px. */}
                  <AnimatePresence>
                    {activeFilterCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2 max-md:hidden"
                      >
                        {categoryFilter !== 'all' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge variant="secondary" className="gap-1 pe-1">
                              {t('dashboard.filterByCategory')}: {vendorCategoryText(categoryFilter)}
                              <button
                                onClick={() => withViewTransition(() => setCategoryFilter('all'))}
                                className="ms-1 rounded-full hover:bg-muted p-0.5"
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
                            <Badge variant="secondary" className="gap-1 pe-1">
                              {t('dashboard.filterByCity')}: {cityLabel(cityFilter, isRtl)}
                              <button
                                onClick={() => withViewTransition(() => setCityFilter('all'))}
                                className="ms-1 rounded-full hover:bg-muted p-0.5"
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
                            <Badge variant="secondary" className="gap-1 pe-1">
                              {t('dashboard.filterByStatus')}: {t(`dashboard.${verificationFilter}`)}
                              <button
                                onClick={() => withViewTransition(() => setVerificationFilter('all'))}
                                className="ms-1 rounded-full hover:bg-muted p-0.5"
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
                    isPhone ? (
                      <div className="space-y-3" data-testid="skeleton-vendors">
                        <VendorRowSkeleton />
                        <VendorRowSkeleton />
                        <VendorRowSkeleton />
                      </div>
                    ) : (
                      <SkeletonList items={4} />
                    )
                  ) : filteredVendors.length === 0 ? (
                    <Card {...brandCardProps()}>
                      <CardContent className={`flex flex-col items-center justify-center py-16 max-md:px-4 ${isPhone && !vendorsEmptyWorkspace ? 'max-md:py-6' : 'max-md:py-10'}`}>
                        {/* Phones, search or filters on, nothing matched: no big icon tile, so the message and
                            "Clear filters" stay on the first screen above the tab bar. */}
                        {!(isPhone && !vendorsEmptyWorkspace) && (
                        <div className="h-16 w-16 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-4 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                          <Users className="h-8 w-8" />
                        </div>
                        )}
                        <h3 className={`font-display font-black text-2xl mb-2 tracking-[-0.03em] max-md:text-center max-md:text-balance max-md:leading-snug ${isPhone && !vendorsEmptyWorkspace ? 'max-md:text-xl' : ''}`} data-testid="text-empty-vendors-title">
                          {isPhone && !vendorsEmptyWorkspace ? t('dashboard.vendorNoMatches') : t('dashboard.noVendors')}
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md max-md:text-balance" data-testid="text-empty-vendors-description">
                          {isPhone && !vendorsEmptyWorkspace ? t('dashboard.rfpNoMatchesDesc') : t('dashboard.noVendorsDesc')}
                        </p>
                        {isPhone && !vendorsEmptyWorkspace && (
                          <Button
                            variant="outline"
                            className="mt-6 w-full"
                            onClick={() => withViewTransition(() => { setSearchQuery(""); clearVendorFilters(); })}
                            data-testid="button-clear-vendor-filters"
                          >
                            {t('dashboard.rfpClearFilters')}
                          </Button>
                        )}
                        {isPhone && vendorsEmptyWorkspace && activeCompany?.profile?.tractionSlug && (
                          <CopyLinkButton
                            url={`${window.location.origin}/traction/${activeCompany.profile.tractionSlug}`}
                            className="mt-6 w-full max-md:h-auto max-md:min-h-11 border-transparent bg-[#FE3C01] text-white hover:bg-[#E83501] hover:text-white active:bg-[#C93000]"
                            testId="button-copy-traction-link-empty"
                          />
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 max-md:gap-3">
                      {isPhone && filteredVendors.length > RFP_PAGE_SIZE && (
                        <p className="text-sm text-[#6B635B] dark:text-muted-foreground tabular-nums" aria-live="polite" data-testid="text-vendors-count">
                          {t('dashboard.rfpShowing', { shown: Math.min(vendorVisible, filteredVendors.length), total: filteredVendors.length })}
                        </p>
                      )}
                      {(isPhone ? filteredVendors.slice(0, vendorVisible) : filteredVendors).map((vendor) => isPhone ? (
                        <VendorRowMobile
                          key={vendor.id}
                          vendor={vendor}
                          categoryText={vendorCategoryText(vendor.category)}
                          cityText={cityLabel(vendor.city, isRtl)}
                          joinText={vendorJoinText(vendor.joinMethod)}
                          onRemove={() => setVendorToRemove({ id: vendor.id, companyId: vendor.companyId, name: vendor.company })}
                        />
                      ) : (
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
                                    {vendor.category || t('dashboard.noCategory')}
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
                                <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                  <Building2 className="h-4 w-4" />
                                  <span>{vendor.city}</span>
                                </div>
                              )}
                            </div>

                            <div className={`flex flex-wrap gap-2`}>
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
                                <Eye className={`h-4 w-4 me-2`} />
                                {t('dashboard.view')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
                                onClick={() => setVendorToRemove({ id: vendor.id, companyId: vendor.companyId, name: vendor.company })}
                                data-testid={`button-remove-vendor-${vendor.id}`}
                              >
                                <Trash2 className={`h-4 w-4 me-2`} />
                                {t('dashboard.remove')}
                              </Button>
                            </div>
                          </div>
                        </SpotlightCard>
                      ))}
                      {isPhone && filteredVendors.length > vendorVisible && (
                        <Button
                          variant="outline"
                          className="h-12 w-full text-base"
                          onClick={() => withViewTransition(() => setVendorVisible((n) => n + RFP_PAGE_SIZE))}
                          data-testid="button-show-more-vendors"
                        >
                          {t('dashboard.rfpShowMore', { count: filteredVendors.length - vendorVisible })}
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Join Requests Sub-Tab */}
                <TabsContent value="join-requests" className="space-y-4">
                  {isPhone && loadingRequests ? (
                    <div className="space-y-3" data-testid="skeleton-requests">
                      <VendorRowSkeleton />
                      <VendorRowSkeleton />
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <Card {...brandCardProps()}>
                      <CardContent className="flex flex-col items-center justify-center py-16 max-md:px-4 max-md:py-10">
                        <div className="h-14 w-14 rounded-2xl bg-[#FE3C01] text-white flex items-center justify-center mb-3 shadow-[0_12px_24px_-10px_rgba(254,60,1,0.5)]">
                          <UserPlus className="h-7 w-7" />
                        </div>
                        <p className="font-display font-black text-2xl tracking-[-0.03em] max-md:text-center max-md:text-balance max-md:leading-snug" data-testid="text-no-requests">
                          {t('dashboard.noPendingRequests')}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className={isRtl ? 'text-right' : ''}>
                        <h3 className={`text-lg font-semibold flex items-center gap-2`} data-testid="text-pending-title">
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
                          const timeAgo = request.createdAt ? formatDate(request.createdAt) : '';
                          if (isPhone) {
                            return (
                              <JoinRequestRowMobile
                                key={request.id}
                                request={request}
                                dateText={timeAgo}
                                onReject={() => rejectRequest.mutate(request.id)}
                                onApprove={() => approveRequest.mutate(request.id)}
                                rejecting={rejectRequest.isPending}
                                approving={approveRequest.isPending}
                              />
                            );
                          }
                          return (
                            <SpotlightCard
                              key={request.id}
                              {...brandSpotlightProps()}
                              spotlightColor={request.vendor?.verificationStatus === 'verified' ? 'green' : 'orange'}
                              data-testid={`card-request-${request.id}`}
                            >
                              <div className="p-6">
                                <div className={`flex items-start justify-between mb-4`}>
                                  <div className={`flex items-start gap-4`}>
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
                                      <div className={`flex items-center gap-3 mb-2`}>
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
                                          {request.vendor?.verificationStatus === 'verified' && <ShieldCheck className="h-3 w-3 me-1" />}
                                          {request.vendor?.verificationStatus === 'under_review' && <Clock className="h-3 w-3 me-1" />}
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
                                    <div className={`flex items-center gap-2 text-muted-foreground font-medium`} data-testid={`text-request-category-${request.id}`}>
                                      <Briefcase className="h-4 w-4" />
                                      <span>{request.vendor.expertise}</span>
                                    </div>
                                  )}
                                  {request.vendor?.websiteUrl && (
                                    <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
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
                                    <div className={`flex items-center gap-2 text-muted-foreground font-medium`}>
                                      <Calendar className="h-4 w-4" />
                                      <span>{timeAgo}</span>
                                    </div>
                                  )}
                                </div>

                                <div className={`flex flex-wrap gap-2`}>
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
                                    <Eye className={`h-4 w-4 me-2`} />
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
                                    <XCircle className={`h-4 w-4 me-2`} />
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
                                      <Loader2 className={`h-4 w-4 animate-spin me-2`} />
                                    ) : (
                                      <CheckCircle className={`h-4 w-4 me-2`} />
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
            const profileRelativePath = profilePath({ slug: activeCompany.slug, accountType: workspaceKind });
            const profileUrl = `${window.location.origin}${profileRelativePath}`;
            const pl = profileLinkData?.profile;

            // Completion items — labels/descriptions adapt to account type
            const completionItems = isIndividual ? [
              { section: 'basics', label: t('dashboard.completionBasicsFreelancer'), description: t('dashboard.completionBasicsFreelancerDesc'), complete: !!(pl?.bio && pl.bio.length > 0) },
              { section: 'media',  label: t('dashboard.completionPhotoFreelancer'),  description: t('dashboard.completionPhotoFreelancerDesc'),  complete: !!(pl?.logoUrl) },
              { section: 'field',  label: t('dashboard.completionFieldFreelancer'),  description: t('dashboard.completionFieldFreelancerDesc'),  complete: !!(profileLinkData?.company.category) },
              { section: 'links',  label: t('dashboard.completionLinksFreelancer'),  description: t('dashboard.completionLinksFreelancerDesc'),  complete: !!(pl?.socialLinks && Object.values(pl.socialLinks).some((v) => !!v)) },
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
                      <div className={`flex items-center gap-2 flex-wrap`}>
                        <div dir="ltr" className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                          {profileUrl}
                        </div>
                        <Button variant="outline" size="sm" onClick={copyProfileLink} className="flex-shrink-0 gap-1.5">
                          {profileLinkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {profileLinkCopied ? t('dashboard.copied') : t('dashboard.copyLink')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(profileRelativePath, '_blank')} className="flex-shrink-0 gap-1.5">
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
                              className={`px-2 py-2 rounded-lg text-[10px] font-semibold transition-all active:opacity-70 ${
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
                      <div className={`flex items-center justify-between mb-2`}>
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
                            <div className={`flex items-center gap-3 min-w-0`}>
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

      {/* Delete RFP confirmation (phones; desktop keeps the browser confirm) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-md:w-[calc(100%-2rem)] max-md:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.rfpDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              <UserClamp className="mx-auto font-medium text-foreground">{tenderToDelete?.title}</UserClamp>
              <span className="mt-1 block">{t('dashboard.rfpDeleteWarning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="max-md:gap-2">
            <AlertDialogCancel className="mt-0" data-testid="button-cancel-delete-rfp">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 active:bg-destructive/80 text-destructive-foreground"
              onClick={() => tenderToDelete && deleteTender.mutate(tenderToDelete.id)}
              data-testid="button-confirm-delete-rfp"
            >
              {t('dashboard.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Vendor Confirmation */}
      <AlertDialog open={!!vendorToRemove} onOpenChange={(open) => !open && setVendorToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.removeVendorTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.removeVendorDesc', { name: `\u2068${vendorToRemove?.name ?? ''}\u2069` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="max-md:gap-2">
            <AlertDialogCancel className="max-md:mt-0">{t('dashboard.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 active:bg-destructive/80 text-destructive-foreground"
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
                      <FileText className="h-4 w-4 me-2" />
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
                      <FileText className="h-4 w-4 me-2" />
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
                      <DollarSign className="h-4 w-4 me-2" />
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
                      <Video className="h-4 w-4 me-2" />
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
                    <Check className="h-4 w-4 me-2" />
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
                      <BookmarkPlus className="h-4 w-4 me-2" />
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
                    <X className="h-4 w-4 me-2" />
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
                    <CheckCircle className="h-3 w-3 me-1" />
                    {t('dashboard.verifiedCompany')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 me-1" />
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
                  <ShieldCheck className="h-3 w-3 me-1" />
                  {t('dashboard.verified')}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 me-1" />
                  {t('dashboard.underReviewStatus')}
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {t(`dashboard.${userRole}`)}
              </Badge>
              {activeCompany.onboardingState === 'completed' && (
                <Badge className="bg-[var(--bid-orange)]/10 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  <CheckCircle className="h-3 w-3 me-1" />
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
                  setLocation('/settings?tab=company');
                }}
              >
                <Edit className="h-4 w-4 me-2" />
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
                <Settings className="h-4 w-4 me-2" />
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
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('dashboard.primaryNav')}
    >
      <div className={`flex items-stretch`}>
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
              className={`group flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 text-[11px] transition-colors active:bg-accent ${
                active ? 'text-[#FE3C01] font-semibold' : 'text-muted-foreground font-medium'
              }`}
            >
              <ActiveIcon className="h-5 w-5 transition-transform duration-100 group-active:scale-90" aria-hidden />
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
                : t('dashboard.verificationRequired')}
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
                    {t('dashboard.verificationUnderReviewDesc')}
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
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{t('dashboard.verificationRequired')}</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {t('dashboard.verificationNotVerifiedDesc')}
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
    </>
  );
}
