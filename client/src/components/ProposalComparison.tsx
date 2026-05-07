import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  Check,
  Minus,
  X,
  RotateCcw,
  CheckCircle,
  MoreHorizontal,
  DollarSign,
  FileText,
  Award,
  Percent,
  Phone,
  Mail,
  Clock,
  MousePointerClick,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { viewAuthenticatedFile } from "@/lib/downloadFile";
import { useI18n } from "@/lib/i18n";
import ResubmissionDialog from "./negotiation/ResubmissionDialog";
import DiscountDialog from "./negotiation/DiscountDialog";
import AwardDialog from "./negotiation/AwardDialog";
import ContactDialog from "./negotiation/ContactDialog";
import FreeMessageDialog from "./negotiation/FreeMessageDialog";

interface OfferAnalysis {
  id: string;
  offerId: string;
  status: string;
  executiveSummary: string | null;
  tableOfContents: { section: string; pageRange: string }[] | null;
  criteriaMapping: Record<string, string> | null;
  deliverables: string[] | null;
  financial: {
    total?: number;
    breakdown?: { item: string; amount: number }[];
    paymentTerms?: string;
    vat?: number;
  } | null;
  errorMessage: string | null;
  analyzedAt: string | null;
}

interface Offer {
  id: string;
  companyId: string;
  technicalFileUrl: string | null;
  financialFileUrl: string | null;
  combinedFileUrl?: string | null;
  quotePrice: number | null;
  videoUrl: string | null;
  submittedAt: string;
  status: string;
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

interface NegotiationActionData {
  id: string;
  offerId: string;
  companyId: string;
  actionType: string;
  message: string;
  status: string;
  createdAt: string;
}

interface ProposalComparisonProps {
  tenderId: string;
  offers: Offer[];
  analyses?: OfferAnalysis[];
  negotiationMode?: boolean;
  tenderTitle?: string;
  tenderCompanyName?: string;
  negotiationActions?: NegotiationActionData[];
  submissionType?: string;
}

const VENDOR_COLORS = [
  'from-[#FE3C01] to-[#FF8A6B]',
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-400',
  'from-sky-500 to-blue-500',
];

export default function ProposalComparison({
  tenderId, offers, analyses = [],
  negotiationMode = false, tenderTitle = '', tenderCompanyName = '', negotiationActions = [],
  submissionType = '',
}: ProposalComparisonProps) {
  const { toast } = useToast();
  const { language, t } = useI18n();
  const [hiddenOffers, setHiddenOffers] = useState<Set<string>>(new Set());
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  // Negotiation state
  const [checkedVendors, setCheckedVendors] = useState<Set<string>>(new Set());
  const [activeDialog, setActiveDialog] = useState<'resubmission' | 'discount' | 'award' | 'contact' | 'free_message' | null>(null);
  const [directAwardOfferId, setDirectAwardOfferId] = useState<string | null>(null);

  const toggleVendor = (offerId: string) => {
    setCheckedVendors(prev => {
      const next = new Set(prev);
      if (next.has(offerId)) next.delete(offerId);
      else next.add(offerId);
      return next;
    });
  };

  const checkedOffers = offers.filter(o => checkedVendors.has(o.id));

  const getActionBadges = (offerId: string) => {
    const offerActions = negotiationActions.filter(a => a.offerId === offerId);
    const types = new Set(offerActions.map(a => a.actionType));
    const badges: { label: string; color: string }[] = [];
    if (types.has('resubmission_request')) badges.push({ label: t('tenderFlow.resubmissionRequested'), color: 'bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-200' });
    if (types.has('discount_request')) badges.push({ label: t('tenderFlow.discountRequested'), color: 'bg-[var(--bid-orange)]/10 text-[var(--bid-orange)] border-purple-200' });
    if (types.has('award')) badges.push({ label: t('tenderFlow.awardedBadge'), color: 'bg-[var(--state-won)]/10 text-[var(--state-won)] border-emerald-200' });
    if (types.has('rejection')) badges.push({ label: t('tenderFlow.rejectedBadge'), color: 'bg-red-100 text-red-700 dark:text-red-300 border-red-200' });
    if (types.has('free_message')) badges.push({ label: t('tenderFlow.messageSentBadge'), color: 'bg-[var(--bid-orange)]/10 text-[var(--bid-orange)] border-[var(--bid-orange)]/20' });
    return badges;
  };

  const isOfferAwarded = (offerId: string) =>
    negotiationActions.some(a => a.offerId === offerId && a.actionType === 'award');

  const ACTION_META: Record<string, { icon: any; color: string; label: () => string }> = {
    resubmission_request: { icon: RotateCcw, color: 'text-amber-600 bg-amber-50 border-amber-200', label: () => t('tenderFlow.resubmissionRequested') },
    discount_request:     { icon: Percent,   color: 'text-[var(--bid-orange)] bg-[var(--bid-orange)]/5 border-purple-200', label: () => t('tenderFlow.discountRequested') },
    award:                { icon: Award,     color: 'text-[var(--state-won)] bg-[var(--state-won)]/5 border-emerald-200', label: () => t('tenderFlow.awardedBadge') },
    rejection:            { icon: X,         color: 'text-red-600 bg-red-50 border-red-200', label: () => t('tenderFlow.rejectedBadge') },
    free_message:         { icon: Mail,      color: 'text-[var(--bid-orange)] bg-[var(--bid-orange)]/5 border-[var(--bid-orange)]/20', label: () => t('tenderFlow.messageSentBadge') },
  };

  const sortedNegotiationActions = [...negotiationActions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const negotiationMutation = useMutation({
    mutationFn: async (data: { actions: any[] }) => {
      const response = await apiRequest("POST", `/api/tenders/${tenderId}/negotiation-actions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenders', tenderId, 'negotiation-actions'] });
      setCheckedVendors(new Set());
      setActiveDialog(null);
      setDirectAwardOfferId(null);
      toast({ title: t('tenderFlow.actionSentTitle'), description: t('tenderFlow.actionSentDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.actionFailedTitle'), description: error.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/ai/analyze-proposals/${tenderId}`, { language });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/proposal-analysis", tenderId] });
      toast({ title: t('tenderFlow.analysisCompleteTitle'), description: t('tenderFlow.allProposalsAnalyzedDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.analysisFailedDesc'), description: error.message, variant: "destructive" });
    },
  });

  const savingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/tenders/${tenderId}/savings`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('tenderFlow.vendorSelected'),
        description: `${t('tenderFlow.savingsRecorded')}: ${t('tenderFlow.sarCurrency')} ${data.savingsAmount?.toLocaleString() || 0} (${data.savingsPercentage || 0}% ${t('tenderFlow.savingsAmount')})`,
      });
    },
    onError: (error: Error) => {
      toast({ title: t('tenderFlow.failedRecordSavings'), description: error.message, variant: "destructive" });
    },
  });

  const completedAnalyses = analyses.filter(a => a.status === "completed");
  const hasAnalyses = completedAnalyses.length > 0;
  const isVideoOnlyFormat = submissionType === 'video_only';
  const isQuoteOnly = submissionType === 'quote_only';
  const allSkipped = analyses.length > 0 && analyses.every(a => a.status === 'skipped');
  const cannotAnalyze = isVideoOnlyFormat || allSkipped || isQuoteOnly;
  const visibleOffers = offers.filter(o => !hiddenOffers.has(o.id));
  const removedOffers = offers.filter(o => hiddenOffers.has(o.id));

  const allDeliverables = new Set<string>();
  completedAnalyses.forEach(a => {
    if (a.deliverables) a.deliverables.forEach(d => allDeliverables.add(d));
  });

  const allCriteria = new Set<string>();
  completedAnalyses.forEach(a => {
    if (a.criteriaMapping) Object.keys(a.criteriaMapping).forEach(k => allCriteria.add(k));
  });

  const getFinancial = (offerId: string) => completedAnalyses.find(a => a.offerId === offerId)?.financial || null;
  const getTotal = (offerId: string): number | null => {
    const quote = offers.find(o => o.id === offerId)?.quotePrice;
    if (quote != null) return quote;
    const fin = getFinancial(offerId);
    return fin?.total ?? null;
  };

  const totals = visibleOffers.map(o => ({ id: o.id, total: getTotal(o.id) })).filter(t => t.total != null) as { id: string; total: number }[];
  const cheapestId = totals.length > 1 ? totals.reduce((min, t) => t.total < min.total ? t : min, totals[0]).id : null;
  const mostExpensiveId = totals.length > 1 ? totals.reduce((max, t) => t.total > max.total ? t : max, totals[0]).id : null;
  const highestPrice = totals.length > 0 ? Math.max(...totals.map(t => t.total)) : 0;
  const lowestPrice = totals.length > 0 ? Math.min(...totals.map(t => t.total)) : 0;

  const getVendorName = (offer: Offer) => offer.profile?.displayName || offer.company.name;

  const handleSelectVendor = (offer: Offer) => {
    const selectedPrice = getTotal(offer.id);
    if (selectedPrice == null) return;
    setSelectedVendor(offer.id);
    savingsMutation.mutate({ selectedOfferId: offer.id, selectedCompanyId: offer.companyId, selectedPrice, highestPrice, lowestPrice });
  };

  // ─── No-analysis state (simplified table with direct award) ─────────────────
  // quote_only bypasses this: it always renders the full table using offer.quotePrice
  if (!hasAnalyses && !isQuoteOnly) {
    const directAwardOffer = directAwardOfferId ? visibleOffers.find(o => o.id === directAwardOfferId) : null;
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FE3C01] text-white text-xs font-bold">
              <Sparkles className="h-3 w-3" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">{t('tenderFlow.proposalComparisonTitle')}</span>
              <span className="text-xs text-gray-400 ml-2">{t('tenderFlow.vendorsCount').replace('{count}', String(visibleOffers.length))}</span>
            </div>
          </div>
          {!cannotAnalyze && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
                {t('tenderFlow.aiBetaBadge')}
              </span>
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || offers.length < 2}
                className="bg-[#FE3C01] hover:bg-[#d54d35] text-white text-xs h-7"
                size="sm"
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-1" />{t('tenderFlow.analyzingProposals').replace('{count}', String(offers.length))}</>
                ) : (
                  <><Sparkles className="h-3 w-3 mr-1" />{t('tenderFlow.analyzeCompareAll')}</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Banner */}
        {cannotAnalyze ? (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {isVideoOnlyFormat
                ? t('tenderFlow.videoOnlyAnalysisNotice')
                : t('tenderFlow.allSkippedAnalysisNotice')}
            </span>
          </div>
        ) : (
          <div className="px-5 py-3 bg-[var(--bid-orange)]/5 border-b border-blue-100 flex items-center gap-2 text-sm text-[var(--bid-orange)]">
            <Sparkles className="h-4 w-4 shrink-0 text-blue-500" />
            <span>{t('tenderFlow.proposalComparisonEmptyDesc').replace('{count}', String(offers.length))}</span>
          </div>
        )}

        {/* Simplified proposals list */}
        <div className="divide-y divide-gray-50">
          {visibleOffers.map((offer, idx) => {
            const gradient = VENDOR_COLORS[idx % VENDOR_COLORS.length];
            const name = getVendorName(offer);
            const awarded = isOfferAwarded(offer.id);

            return (
              <div key={offer.id} className={`flex items-center gap-4 px-5 py-4 ${awarded ? 'bg-[var(--state-won)]/5/40' : 'hover:bg-muted/50'}`}>
                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {offer.profile?.logoUrl ? (
                    <img src={offer.profile.logoUrl} alt={`${name} logo`} className="h-9 w-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-gray-200" />
                  ) : (
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-[10px] font-bold leading-none">{name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    {offer.company.category && (
                      <p className="text-xs text-gray-400 truncate">{offer.company.category}</p>
                    )}
                  </div>
                </div>

                {/* Submission details */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {offer.videoUrl && (
                    <a
                      href={offer.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--bid-orange)] hover:text-blue-800 dark:text-blue-300 border border-[var(--bid-orange)]/20 rounded-md px-2 py-1 hover:bg-[var(--bid-orange)]/5"
                    >
                      <FileText className="h-3 w-3" /> {t('tenderFlow.watchVideo')}
                    </a>
                  )}
                  {(offer.combinedFileUrl || offer.technicalFileUrl) && (
                    <button
                      onClick={() => { const f = offer.combinedFileUrl || offer.technicalFileUrl; if (f) viewAuthenticatedFile(f); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 hover:bg-muted"
                    >
                      <FileText className="h-3 w-3" /> {t('tenderFlow.viewProposal')}
                    </button>
                  )}
                  {offer.quotePrice != null && (
                    <span className="text-xs font-bold text-foreground">{t('tenderFlow.sarCurrency')} {offer.quotePrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Negotiation history badges */}
                {negotiationMode && getActionBadges(offer.id).length > 0 && (
                  <div className="flex flex-wrap gap-0.5 flex-shrink-0">
                    {getActionBadges(offer.id).map((badge, i) => (
                      <span key={i} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Award button (negotiation mode only) */}
                {negotiationMode && (
                  awarded ? (
                    <span className="text-[10px] font-bold bg-[var(--state-won)]/10 text-[var(--state-won)] px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1 flex-shrink-0">
                      <Award className="h-3 w-3" /> {t('tenderFlow.awardedBadge')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-emerald-200 text-[var(--state-won)] hover:bg-[var(--state-won)]/5 flex-shrink-0"
                      onClick={() => { setDirectAwardOfferId(offer.id); setActiveDialog('award'); }}
                    >
                      <Award className="h-3 w-3" /> {t('tenderFlow.awardBtn')}
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Negotiation history log */}
        {negotiationMode && negotiationActions.length > 0 && (
          <div className="mx-5 mt-4 mb-4 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('tenderFlow.negotiationHistory')}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {sortedNegotiationActions.map((action) => {
                const meta = ACTION_META[action.actionType];
                const vendor = offers.find(o => o.id === action.offerId);
                const vendorName = vendor ? getVendorName(vendor) : '—';
                const Icon = meta?.icon || Mail;
                return (
                  <div key={action.id} className="px-4 py-3 flex items-start gap-3">
                    <div className={`mt-0.5 h-6 w-6 rounded-full border flex items-center justify-center flex-shrink-0 ${meta?.color || 'text-muted-foreground bg-muted border-border'}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{vendorName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta?.color || 'text-muted-foreground bg-muted border-border'}`}>
                          {meta?.label() || action.actionType}
                        </span>
                      </div>
                      {action.message && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{action.message}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5">
                      {new Date(action.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AwardDialog for direct award (no-analysis path) */}
        {negotiationMode && directAwardOffer && (
          <AwardDialog
            open={activeDialog === 'award'}
            onOpenChange={(open) => { if (!open) { setActiveDialog(null); setDirectAwardOfferId(null); } }}
            vendorName={getVendorName(directAwardOffer)}
            otherVendorNames={visibleOffers.filter(o => o.id !== directAwardOffer.id).map(o => getVendorName(o))}
            tenderTitle={tenderTitle}
            tenderCompanyName={tenderCompanyName}
            tenderId={tenderId}
            isPending={negotiationMutation.isPending}
            onSubmit={(data) => {
              negotiationMutation.mutate({
                actions: [{
                  offerId: directAwardOffer.id,
                  companyId: directAwardOffer.companyId,
                  actionType: 'award',
                  message: data.message,
                  comment: data.comment,
                  metadata: data.metadata,
                }],
              });
            }}
          />
        )}
      </div>
    );
  }

  const SectionHeader = ({ label, icon: Icon }: { label: string; icon: any }) => (
    <tr>
      <td colSpan={visibleOffers.length + 1} className="px-0 pb-0 pt-0">
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-muted border-y border-border">
          <div className="h-3.5 w-0.5 rounded-full bg-[#FE3C01]" />
          <Icon className="h-3 w-3 text-gray-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        </div>
      </td>
    </tr>
  );

  const isScrollable = visibleOffers.length >= 3;
  const LABEL_W = "w-40 min-w-[160px] max-w-[160px]";
  const COL_W = isScrollable ? "w-[200px] min-w-[200px] max-w-[200px]" : "";

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Coral gradient top strip */}
      <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FE3C01] text-white text-xs font-bold">
            <Sparkles className="h-3 w-3" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">{t('tenderFlow.proposalComparisonTitle')}</span>
            <span className="text-xs text-gray-400 ml-2">{t('tenderFlow.vendorsCount').replace('{count}', String(visibleOffers.length))}</span>
          </div>
        </div>
        {isQuoteOnly ? (
          <span className="text-xs text-gray-400 bg-muted border border-border rounded-lg px-3 py-1">
            {t('tenderFlow.priceComparisonLabel')}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
              {t('tenderFlow.aiBetaBadge')}
            </span>
            <Button variant="outline" size="sm" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} className="text-xs h-7">
              {analyzeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
              {t('tenderFlow.reAnalyze')}
            </Button>
          </div>
        )}
      </div>

      {/* ── Savings banner ──────────────────────────────────────────────── */}
      {totals.length > 1 && highestPrice > lowestPrice && (
        <div className="mx-5 mt-4 flex items-center gap-3 bg-[var(--state-won)]/5 border border-emerald-200 rounded-xl px-4 py-2.5">
          <TrendingUp className="h-4 w-4 text-[var(--state-won)] flex-shrink-0" />
          <span className="text-sm text-emerald-800 dark:text-emerald-300">
            <span className="font-bold">{t('tenderFlow.sarCurrency')} {(highestPrice - lowestPrice).toLocaleString()}</span>
            {" "}{t('tenderFlow.potentialSavings')} · {Math.round(((highestPrice - lowestPrice) / highestPrice) * 100)}% {t('tenderFlow.spreadAcrossOffers')}
          </span>
        </div>
      )}

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto mt-4">
        <table
          className="border-collapse table-fixed w-full"
          style={isScrollable ? { width: `${160 + visibleOffers.length * 200}px` } : undefined}
        >
          <thead>
            <tr className="border-b border-border">
              {/* Empty label cell */}
              <th className={`${LABEL_W} sticky left-0 z-20 bg-card border-r border-border`} />

              {/* Vendor compact header cells */}
              {visibleOffers.map((offer, idx) => {
                const gradient = VENDOR_COLORS[idx % VENDOR_COLORS.length];
                const total = getTotal(offer.id);
                const isCheapest = cheapestId === offer.id;
                const isSelected = selectedVendor === offer.id;
                const name = getVendorName(offer);

                return (
                  <th
                    key={offer.id}
                    className={`${COL_W} p-0 align-top border-r border-border last:border-r-0 ${isOfferAwarded(offer.id) ? 'border-t-2 border-t-emerald-500' : ''}`}
                  >
                    <div className={`px-3 py-3 ${isOfferAwarded(offer.id) ? 'bg-[var(--state-won)]/5/60' : negotiationMode && checkedVendors.has(offer.id) ? 'bg-[#FE3C01]/5 ring-2 ring-[#FE3C01]/20 ring-inset' : isSelected ? 'bg-[var(--bid-orange)]/5/60' : 'bg-card'}`}>
                      {/* Avatar + name row */}
                      <div className="flex items-center gap-2 mb-2">
                        {negotiationMode && (
                          <Checkbox
                            checked={checkedVendors.has(offer.id)}
                            onCheckedChange={() => toggleVendor(offer.id)}
                            className="flex-shrink-0"
                          />
                        )}
                        {offer.profile?.logoUrl ? (
                          <img src={offer.profile.logoUrl} alt={`${name} logo`} className="h-8 w-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-gray-200" />
                        ) : (
                          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <span className="text-white text-[10px] font-bold leading-none">{name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate leading-tight">{name}</p>
                          {offer.company.category && (
                            <p className="text-[10px] text-gray-400 truncate leading-tight">{offer.company.category}</p>
                          )}
                        </div>
                      </div>

                      {/* Negotiation history badges */}
                      {negotiationMode && getActionBadges(offer.id).length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mb-1.5">
                          {getActionBadges(offer.id).map((badge, i) => (
                            <span key={i} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Price + badges on one line */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        {total != null ? (
                          <span className={`text-xs font-bold ${isCheapest ? 'text-[var(--state-won)]' : 'text-foreground'}`}>
                            {t('tenderFlow.sarCurrency')} {total.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">{t('tenderFlow.noPrice')}</span>
                        )}
                        <div className="flex gap-0.5 flex-shrink-0">
                          {isCheapest && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-[var(--state-won)]/10 text-[var(--state-won)] px-1.5 py-0.5 rounded-full border border-emerald-200">
                              <Award className="h-2 w-2" /> {t('tenderFlow.bestLabel')}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-bold bg-[var(--bid-orange)]/10 text-[var(--bid-orange)] px-1.5 py-0.5 rounded-full border border-[var(--bid-orange)]/20">
                              ✓ {t('tenderFlow.selectedLabel')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price bar */}
                      {total != null && highestPrice > 0 && (
                        <div className="h-1 bg-muted rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${isCheapest ? 'bg-[var(--state-won)]' : isSelected ? 'bg-blue-400' : 'bg-gray-300'}`}
                            style={{ width: `${(total / highestPrice) * 100}%` }}
                          />
                        </div>
                      )}

                      {/* Watch Video link — always visible when videoUrl exists */}
                      {offer.videoUrl && (
                        <a
                          href={offer.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-1.5 flex items-center justify-center gap-1 text-[10px] text-[var(--bid-orange)] hover:text-blue-800 dark:text-blue-300 border border-[var(--bid-orange)]/20 rounded-md px-2 py-1 hover:bg-[var(--bid-orange)]/5 w-full"
                        >
                          <FileText className="h-2.5 w-2.5" /> {t('tenderFlow.watchVideo')}
                        </a>
                      )}

                      {/* Actions - hidden in negotiation mode */}
                      {!negotiationMode && (
                        <div className="flex items-center gap-1">
                          {isSelected ? (
                            <div className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-[var(--bid-orange)] bg-[var(--bid-orange)]/5 border border-[var(--bid-orange)]/20 rounded-md py-1 px-2">
                              <CheckCircle className="h-2.5 w-2.5" /> {t('tenderFlow.selectedLabel')}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="flex-1 h-6 text-[10px] bg-[#FE3C01] hover:bg-[#d54d35] text-white px-2 font-medium"
                              onClick={() => handleSelectVendor(offer)}
                              disabled={savingsMutation.isPending || total == null || isOfferAwarded(offer.id)}
                            >
                              <CheckCircle className="h-2.5 w-2.5 mr-1" /> {t('tenderFlow.selectBtn')}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-6 w-6 p-0 border-border" disabled={isOfferAwarded(offer.id)}>
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => { const f = offer.combinedFileUrl || offer.technicalFileUrl; if (f) viewAuthenticatedFile(f); }}
                                disabled={!offer.combinedFileUrl && !offer.technicalFileUrl}
                              >
                                <FileText className="h-4 w-4 mr-2" /> {t('tenderFlow.viewProposal')}
                              </DropdownMenuItem>
                              {offer.financialFileUrl && (
                                <DropdownMenuItem onClick={() => viewAuthenticatedFile(offer.financialFileUrl!)}>
                                  <DollarSign className="h-4 w-4 mr-2" /> {t('tenderFlow.viewFinancial')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setHiddenOffers(prev => new Set([...Array.from(prev), offer.id]))}
                                className="text-red-500 focus:text-red-500"
                              >
                                <X className="h-4 w-4 mr-2" /> {t('tenderFlow.removeLabel')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* ─── Financial section ──────────────────────────────────── */}
            <SectionHeader label={t('tenderFlow.financialSection')} icon={DollarSign} />

            {/* Total Price */}
            <tr className="border-b border-border hover:bg-muted/40 transition-colors">
              <td className={`${LABEL_W} sticky left-0 bg-card px-4 py-3 text-xs font-semibold text-muted-foreground border-r border-border`}>
                {t('tenderFlow.totalPrice')}
              </td>
              {visibleOffers.map(offer => {
                const total = getTotal(offer.id);
                const isCheapest = cheapestId === offer.id;
                const isMostExp = mostExpensiveId === offer.id && cheapestId !== mostExpensiveId;
                return (
                  <td key={offer.id} className={`${COL_W} px-4 py-3 text-center border-r border-border last:border-r-0 ${selectedVendor === offer.id ? 'bg-[var(--bid-orange)]/5/30' : ''}`}>
                    {total != null ? (
                      <span className={`text-sm font-bold ${isCheapest ? 'text-[var(--state-won)]' : isMostExp ? 'text-red-500' : 'text-foreground'}`}>
                        {t('tenderFlow.sarCurrency')} {total.toLocaleString()}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                );
              })}
            </tr>

            {/* VAT */}
            <tr className="border-b border-border hover:bg-muted/40 transition-colors">
              <td className={`${LABEL_W} sticky left-0 bg-card px-4 py-3 text-xs font-medium text-muted-foreground border-r border-border`}>{t('tenderFlow.vatLabel')}</td>
              {visibleOffers.map(offer => {
                const fin = getFinancial(offer.id);
                return (
                  <td key={offer.id} className={`${COL_W} px-4 py-3 text-center text-sm border-r border-border last:border-r-0 ${selectedVendor === offer.id ? 'bg-[var(--bid-orange)]/5/30' : ''}`}>
                    {fin?.vat != null ? <span className="font-medium text-foreground">{fin.vat}%</span> : <span className="text-gray-300">—</span>}
                  </td>
                );
              })}
            </tr>

            {/* Payment Terms */}
            <tr className="border-b border-border hover:bg-muted/40 transition-colors">
              <td className={`${LABEL_W} sticky left-0 bg-card px-4 py-3 text-xs font-medium text-muted-foreground border-r border-border`}>{t('tenderFlow.paymentTerms')}</td>
              {visibleOffers.map(offer => {
                const fin = getFinancial(offer.id);
                return (
                  <td key={offer.id} className={`${COL_W} px-4 py-3 text-center text-xs border-r border-border last:border-r-0 ${selectedVendor === offer.id ? 'bg-[var(--bid-orange)]/5/30' : ''}`}>
                    {fin?.paymentTerms ? <span className="text-muted-foreground">{fin.paymentTerms}</span> : <span className="text-gray-300">—</span>}
                  </td>
                );
              })}
            </tr>

            {/* ─── Deliverables section ───────────────────────────────── */}
            {allDeliverables.size > 0 && (
              <>
                <SectionHeader label={t('tenderFlow.deliverablesCoverage')} icon={Check} />
                {Array.from(allDeliverables).map((deliverable, dIdx) => (
                  <tr key={deliverable} className={`border-b border-border hover:bg-muted/40 transition-colors ${dIdx % 2 === 1 ? 'bg-muted/20' : ''}`}>
                    <td className={`${LABEL_W} sticky left-0 ${dIdx % 2 === 1 ? 'bg-muted/80' : 'bg-card'} px-4 py-2.5 text-xs text-muted-foreground border-r border-border leading-snug`}>
                      {deliverable}
                    </td>
                    {visibleOffers.map(offer => {
                      const analysis = completedAnalyses.find(a => a.offerId === offer.id);
                      const hasIt = analysis?.deliverables?.some(d =>
                        d.toLowerCase().includes(deliverable.toLowerCase()) ||
                        deliverable.toLowerCase().includes(d.toLowerCase())
                      );
                      return (
                        <td key={offer.id} className={`${COL_W} px-4 py-2.5 text-center border-r border-border last:border-r-0 ${selectedVendor === offer.id ? 'bg-[var(--bid-orange)]/5/30' : ''}`}>
                          <div className="flex justify-center">
                            {hasIt ? (
                              <div className="h-5 w-5 rounded-full bg-[var(--state-won)]/10 border border-emerald-200 flex items-center justify-center">
                                <Check className="h-3 w-3 text-[var(--state-won)]" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center">
                                <Minus className="h-3 w-3 text-gray-300" />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            {/* ─── Requirements coverage section ──────────────────────── */}
            {allCriteria.size > 0 && (
              <>
                <SectionHeader label={t('tenderFlow.requirementsCoverage')} icon={Sparkles} />
                {Array.from(allCriteria).map((criterion, cIdx) => (
                  <tr key={criterion} className={`border-b border-border hover:bg-muted/40 transition-colors ${cIdx % 2 === 1 ? 'bg-muted/20' : ''}`}>
                    <td className={`${LABEL_W} sticky left-0 ${cIdx % 2 === 1 ? 'bg-muted/80' : 'bg-card'} px-4 py-2.5 text-xs text-muted-foreground border-r border-border leading-snug`}>
                      {criterion}
                    </td>
                    {visibleOffers.map(offer => {
                      const analysis = completedAnalyses.find(a => a.offerId === offer.id);
                      const ref = analysis?.criteriaMapping?.[criterion];
                      const found = ref && ref !== 'Not Found' && ref !== 'غير موجود';
                      return (
                        <td key={offer.id} className={`${COL_W} px-4 py-2.5 text-center border-r border-border last:border-r-0 ${selectedVendor === offer.id ? 'bg-[var(--bid-orange)]/5/30' : ''}`}>
                          {found ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="h-5 w-5 rounded-full bg-[var(--state-won)]/10 border border-emerald-200 flex items-center justify-center">
                                <Check className="h-3 w-3 text-[var(--state-won)]" />
                              </div>
                              <span className="text-[9px] font-mono text-[var(--state-won)]">{ref}</span>
                            </div>
                          ) : ref === 'Not Found' ? (
                            <div className="h-5 w-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto">
                              <X className="h-3 w-3 text-red-500" />
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}

            <tr><td colSpan={visibleOffers.length + 1} className="h-2" /></tr>
          </tbody>
        </table>
      </div>

      {/* ── Negotiation Action Bar ──────────────────────────────────────── */}
      {negotiationMode && checkedVendors.size > 0 && (
        <div className="mx-5 mt-3 mb-1 flex items-center gap-2 bg-muted border border-border rounded-xl px-4 py-2.5 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground mr-1">
            {t('tenderFlow.vendorsSelected').replace('{count}', String(checkedVendors.size))}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveDialog('resubmission')}>
              <RotateCcw className="h-3 w-3" /> {t('tenderFlow.requestResubmission')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveDialog('discount')}>
              <Percent className="h-3 w-3" /> {t('tenderFlow.requestDiscount')}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActiveDialog('free_message')}>
              <Mail className="h-3 w-3" /> {t('tenderFlow.sendMessage')}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-emerald-200 text-[var(--state-won)] hover:bg-[var(--state-won)]/5"
                      onClick={() => setActiveDialog('award')}
                      disabled={checkedVendors.size !== 1}
                    >
                      <Award className="h-3 w-3" /> {t('tenderFlow.awardBtn')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {checkedVendors.size !== 1 && (
                  <TooltipContent side="top" className="text-xs">
                    {t('tenderFlow.awardTooltip')}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setActiveDialog('contact')}
                      disabled={checkedVendors.size !== 1}
                    >
                      <Phone className="h-3 w-3" /> {t('tenderFlow.contactBtn')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {checkedVendors.size !== 1 && (
                  <TooltipContent side="top" className="text-xs">
                    {t('tenderFlow.contactTooltip')}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* ── Negotiation hint ────────────────────────────────────────────── */}
      {negotiationMode && checkedVendors.size === 0 && (
        <div className="mx-5 mt-3 mb-1 flex items-center gap-2 text-xs text-gray-400">
          <MousePointerClick className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('tenderFlow.negotiationHint')}</span>
        </div>
      )}

      {/* ── Negotiation history log ──────────────────────────────────────── */}
      {negotiationMode && negotiationActions.length > 0 && (
        <div className="mx-5 mt-4 mb-1 border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-muted border-b border-border flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('tenderFlow.negotiationHistory')}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {sortedNegotiationActions.map((action) => {
              const meta = ACTION_META[action.actionType];
              const vendor = offers.find(o => o.id === action.offerId);
              const vendorName = vendor ? getVendorName(vendor) : '—';
              const Icon = meta?.icon || Mail;
              return (
                <div key={action.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`mt-0.5 h-6 w-6 rounded-full border flex items-center justify-center flex-shrink-0 ${meta?.color || 'text-muted-foreground bg-muted border-border'}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{vendorName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta?.color || 'text-muted-foreground bg-muted border-border'}`}>
                        {meta?.label() || action.actionType}
                      </span>
                    </div>
                    {action.message && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{action.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5">
                    {new Date(action.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Negotiation Dialogs ──────────────────────────────────────────── */}
      {negotiationMode && (
        <>
          <ResubmissionDialog
            open={activeDialog === 'resubmission'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            vendorNames={checkedOffers.map(o => getVendorName(o))}
            tenderTitle={tenderTitle}
            tenderCompanyName={tenderCompanyName}
            tenderId={tenderId}
            isPending={negotiationMutation.isPending}
            onSubmit={(data) => {
              negotiationMutation.mutate({
                actions: checkedOffers.map(o => ({
                  offerId: o.id,
                  companyId: o.companyId,
                  actionType: 'resubmission_request',
                  message: data.message,
                  comment: data.comment,
                  metadata: data.metadata,
                })),
              });
            }}
          />
          <DiscountDialog
            open={activeDialog === 'discount'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            vendorNames={checkedOffers.map(o => getVendorName(o))}
            tenderTitle={tenderTitle}
            tenderCompanyName={tenderCompanyName}
            tenderId={tenderId}
            isPending={negotiationMutation.isPending}
            onSubmit={(data) => {
              negotiationMutation.mutate({
                actions: checkedOffers.map(o => ({
                  offerId: o.id,
                  companyId: o.companyId,
                  actionType: 'discount_request',
                  message: data.message,
                  comment: data.comment,
                  metadata: data.metadata,
                })),
              });
            }}
          />
          {checkedOffers.length === 1 && (
            <>
              <AwardDialog
                open={activeDialog === 'award'}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                vendorName={getVendorName(checkedOffers[0])}
                otherVendorNames={visibleOffers.filter(o => o.id !== checkedOffers[0].id).map(o => getVendorName(o))}
                tenderTitle={tenderTitle}
                tenderCompanyName={tenderCompanyName}
                tenderId={tenderId}
                isPending={negotiationMutation.isPending}
                onSubmit={(data) => {
                  negotiationMutation.mutate({
                    actions: [{
                      offerId: checkedOffers[0].id,
                      companyId: checkedOffers[0].companyId,
                      actionType: 'award',
                      message: data.message,
                      comment: data.comment,
                      metadata: data.metadata,
                    }],
                  });
                }}
              />
              <ContactDialog
                open={activeDialog === 'contact'}
                onOpenChange={(open) => !open && setActiveDialog(null)}
                offerId={checkedOffers[0].id}
                vendorName={getVendorName(checkedOffers[0])}
              />
            </>
          )}
          <FreeMessageDialog
            open={activeDialog === 'free_message'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            vendorNames={checkedOffers.map(o => getVendorName(o))}
            isPending={negotiationMutation.isPending}
            onSubmit={(data) => {
              negotiationMutation.mutate({
                actions: checkedOffers.map(o => ({
                  offerId: o.id,
                  companyId: o.companyId,
                  actionType: 'free_message',
                  message: data.message,
                  comment: data.comment,
                })),
              });
            }}
          />
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {(removedOffers.length > 0 || completedAnalyses[0]?.analyzedAt) && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-4 flex-wrap">
          {removedOffers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">{t('tenderFlow.removedLabel')}</span>
              {removedOffers.map(o => (
                <Button key={o.id} variant="outline" size="sm" className="text-xs h-6 px-2"
                  onClick={() => setHiddenOffers(prev => { const n = new Set(prev); n.delete(o.id); return n; })}
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-1" /> {getVendorName(o)}
                </Button>
              ))}
            </div>
          )}
          {completedAnalyses[0]?.analyzedAt && (
            <p className="text-xs text-gray-400 ml-auto">
              {t('tenderFlow.analyzedLabel')} {new Date(completedAnalyses[0].analyzedAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </p>
          )}
        </div>
      )}
      {hasAnalyses && (
        <p className="text-[11px] text-gray-400 text-center py-3">{t('tenderFlow.aiDisclaimer')}</p>
      )}
    </div>
  );
}
