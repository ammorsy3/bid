import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Handshake, Layers, FileText, DollarSign, CheckCircle,
  Calendar, MapPin, Building, ArrowLeft, ArrowRight, Store,
  Lock, AlertCircle, ArrowRightCircle, Clock, Users,
} from "lucide-react";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";

interface MarketplaceGuideTender {
  title: string;
  deadline: string;
  createdAt: string | Date;
  category?: string | null;
  referenceNumber?: string | null;
}

interface MarketplaceGuideProps {
  tender: MarketplaceGuideTender;
  activeCompany: {
    name: string;
    profile?: { displayName?: string; logoUrl?: string | null } | null;
  } | null;
  onContinue: () => void;
  onCancel: () => void;
  isRtl: boolean;
  language: string;
  t: (key: string) => string;
}

// Inlined from Marketplace.tsx
function CircleProgress({ percent, days, expired, size = 56 }: { percent: number; days: number; expired: boolean; size?: number }) {
  const isLarge = size >= 80;
  const stroke = isLarge ? 5 : 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = expired ? '#ef4444' : percent < 25 ? '#f59e0b' : '#FE3C01';
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${isLarge ? 'text-2xl' : 'text-base'} font-bold leading-none`} style={{ color }}>{expired ? 0 : days}</span>
      </div>
    </div>
  );
}

function getTenderProgress(createdAt: string, deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const remaining = end - now;
  if (remaining <= 0) return { days: 0, expired: true, percent: 0 };
  const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
  const maxDays = 100;
  const percent = Math.min(100, Math.max(0, (days / maxDays) * 100));
  return { days, expired: false, percent };
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

const TOTAL_SLIDES = 6;

export default function MarketplaceGuide({ tender, activeCompany, onContinue, onCancel, isRtl, language, t }: MarketplaceGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };
  const next = () => { if (currentSlide < TOTAL_SLIDES - 1) goTo(currentSlide + 1); };
  const back = () => { if (currentSlide > 0) goTo(currentSlide - 1); };

  const dateLocale = language === 'ar' ? arLocale : undefined;
  const createdAtStr = typeof tender.createdAt === 'string' ? tender.createdAt : tender.createdAt.toISOString();
  const { days, expired, percent } = getTenderProgress(createdAtStr, tender.deadline);
  const companyName = activeCompany?.profile?.displayName || activeCompany?.name || '—';

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const slides = [
    // Slide 1: Mock tender card
    {
      title: t('marketplace.guideSlide1Title') || 'Your tender on the marketplace',
      caption: t('marketplace.guideSlide1Caption') || 'This is a preview of how your tender will look on the public marketplace page. Anyone can see it — suppliers will browse this and decide whether to submit a proposal.',
      visual: (
        <div className="bg-[#FFF8F6] rounded-xl p-4 flex items-center justify-center">
          <div className="origin-top" style={{ transform: 'scale(0.78)', width: '520px' }}>
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Main content area */}
              <div className="flex items-stretch">
                {/* Left: Circle progress */}
                <div className="flex flex-col items-center justify-center px-6 py-6 border-e border-border min-w-[130px]">
                  <CircleProgress percent={percent} days={days} expired={expired} size={80} />
                  <p className={`text-[10px] mt-2 ${expired ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {expired ? t('marketplace.deadlinePassed') : `${days} ${t('marketplace.daysRemaining')}`}
                  </p>
                </div>
                {/* Right: Tender info */}
                <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{t('marketplace.publishDate')}:</span>
                      <span className="font-medium text-muted-foreground">{formatDate(tender.createdAt)}</span>
                    </div>
                    <Badge className="bg-[#FE3C01] text-white border-0 text-[9px] font-medium px-2 py-0.5 rounded">
                      {t('marketplace.openTender')}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-snug mb-1.5 line-clamp-2">
                    {tender.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Building className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{companyName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {tender.category && <span className="text-[10px] text-[#FE3C01] font-medium">{tender.category}</span>}
                    <span className="text-[10px] text-muted-foreground underline underline-offset-2">{t('marketplace.viewDetails')}</span>
                  </div>
                </div>
              </div>
              {/* Metadata row */}
              <div className="grid grid-cols-4 gap-px bg-muted border-t border-border">
                <div className="bg-card px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.refNumber')}</p>
                  <p className="text-xs font-semibold text-foreground font-mono">BID-XXXX</p>
                </div>
                <div className="bg-card px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.inquiryDeadline')}</p>
                  <p className="text-xs font-semibold text-gray-400">—</p>
                </div>
                <div className="bg-card px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.submissionDeadline')}</p>
                  <p className="text-xs font-semibold text-foreground">{formatDate(tender.deadline)}</p>
                </div>
                <div className="bg-card px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.documentFee')}</p>
                  <p className="text-xs font-semibold text-gray-400">—</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 2: Tender types
    {
      title: t('marketplace.guideSlide2Title') || 'What type of tender is this?',
      caption: t('marketplace.guideSlide2Caption') || 'Pick the one that best describes what you\'re looking for. Not sure? Open Tender works for most cases.',
      visual: (
        <div className="grid grid-cols-3 gap-3 px-2">
          {[
            { icon: Globe, name: t('marketplace.openTender') || 'Open Tender', desc: t('marketplace.guideTenderTypeOpen') || 'Anyone can apply. Best when you want the most options and competition.', color: 'border-[var(--bid-orange)]/20 bg-[var(--bid-orange)]/5', iconColor: 'text-[var(--bid-orange)]', dotColor: 'bg-[var(--bid-orange)]' },
            { icon: Handshake, name: t('marketplace.directPurchase') || 'Direct Purchase', desc: t('marketplace.guideTenderTypeDirect') || 'You already know roughly who you want. Smaller scope, quicker process.', color: 'border-amber-200 bg-amber-50', iconColor: 'text-amber-600', dotColor: 'bg-amber-500' },
            { icon: Layers, name: t('marketplace.frameworkAgreement') || 'Framework Agreement', desc: t('marketplace.guideTenderTypeFramework') || 'An ongoing deal — you\'ll place multiple orders over time with the chosen supplier.', color: 'border-purple-200 bg-[var(--bid-orange)]/5', iconColor: 'text-[var(--bid-orange)]', dotColor: 'bg-[var(--bid-orange)]' },
          ].map((type, i) => (
            <div key={i} className={`rounded-xl border-2 ${type.color} p-4 flex flex-col items-center text-center`}>
              <div className={`h-10 w-10 rounded-lg ${type.color} flex items-center justify-center mb-3`}>
                <type.icon className={`h-5 w-5 ${type.iconColor}`} />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{type.name}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{type.desc}</p>
            </div>
          ))}
        </div>
      ),
    },

    // Slide 3: Document fee
    {
      title: t('marketplace.guideSlide3Title') || 'Do you want to set a document fee?',
      caption: t('marketplace.guideSlide3Caption') || 'A document fee is a price displayed on your listing that tells suppliers how much the tender documents cost. This amount is collected outside the platform (e.g. bank transfer). It\'s completely optional.',
      visual: (
        <div className="flex items-center justify-center gap-6 px-4">
          {/* Paid */}
          <div className="flex-1 rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="h-14 w-14 rounded-xl bg-card border border-amber-200 flex items-center justify-center shadow-sm">
                <FileText className="h-7 w-7 text-amber-600" />
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                {t('marketplace.sar') || 'SAR'}
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">{t('marketplace.guideDocFeePaid') || 'Set a fee'}</p>
            <p className="text-[11px] text-muted-foreground">{t('marketplace.guideDocFeePaidDesc') || 'The fee amount is shown on your listing — payment is handled outside the platform'}</p>
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <div className="h-8 w-px bg-gray-200" />
            <span className="text-[10px] font-medium text-gray-400">{t('marketplace.guideDocFeeOr') || 'OR'}</span>
            <div className="h-8 w-px bg-gray-200" />
          </div>

          {/* Free */}
          <div className="flex-1 rounded-xl border-2 border-green-200 bg-green-50/50 p-5 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="h-14 w-14 rounded-xl bg-card border border-green-200 flex items-center justify-center shadow-sm">
                <FileText className="h-7 w-7 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2 bg-green-500 text-white flex items-center justify-center h-5 w-5 rounded-full shadow">
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">{t('marketplace.guideDocFeeFree') || 'Keep it free'}</p>
            <p className="text-[11px] text-muted-foreground">{t('marketplace.guideDocFeeFreeDesc') || 'No fee shown — documents are open to all suppliers'}</p>
          </div>
        </div>
      ),
    },

    // Slide 4: Inquiry deadline timeline
    {
      title: t('marketplace.guideSlide4Title') || 'When should suppliers stop asking questions?',
      caption: t('marketplace.guideSlide4Caption') || 'Before suppliers submit their proposals, they might have questions about your requirements. Set a cutoff date for questions so you have time to respond before the final deadline.',
      visual: (
        <div className="px-6 py-4">
          {/* Timeline - 3 column grid for precise alignment */}
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center mx-2">
            {/* Now dot */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-4 w-4 rounded-full bg-[#FE3C01] border-2 border-white shadow" />
            </div>
            {/* Line: Now → Questions cutoff (active/coral) */}
            <div className="h-0.5 bg-[#FE3C01]/40" />
            {/* Questions cutoff dot */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-5 w-5 rounded-full border-2 border-dashed border-amber-400 bg-card flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
            </div>
            {/* Line: Questions cutoff → Final deadline (gray) */}
            <div className="h-0.5 bg-gray-200" />
            {/* Final deadline dot */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-4 w-4 rounded-full bg-gray-700 border-2 border-white shadow" />
            </div>
          </div>

          {/* Labels row - same 3 column grid */}
          <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-start mx-2 mt-2">
            <div className="flex flex-col items-center" style={{ minWidth: '16px' }}>
              <span className="text-[10px] font-semibold text-[#FE3C01]">{t('marketplace.guideTimelineNow') || 'Now'}</span>
            </div>
            <div />
            <div className="flex flex-col items-center text-center px-1">
              <span className="text-[10px] font-semibold text-amber-600">{t('marketplace.guideTimelineInquiry') || 'Questions cutoff'}</span>
              <span className="text-[9px] text-amber-500 italic">{t('marketplace.guideTimelineYoullSet') || "You'll choose this date"}</span>
            </div>
            <div />
            <div className="flex flex-col items-center text-center" style={{ minWidth: '16px' }}>
              <span className="text-[10px] font-semibold text-muted-foreground">{t('marketplace.guideTimelineSubmission') || 'Final deadline'}</span>
              <span className="text-[9px] text-muted-foreground font-medium">{format(new Date(tender.deadline), 'MMM d, yyyy', { locale: dateLocale })}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-6 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-2.5 w-6 rounded-full bg-[#FE3C01]/30 border border-[#FE3C01]/50" />
              <span>{t('marketplace.guideTimelineQuestionsOpen') || 'Suppliers can ask questions'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-2.5 w-6 rounded-full bg-muted border border-border" />
              <span>{t('marketplace.guideTimelineSubmissionsOnly') || 'Only proposals accepted'}</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 5: Purchase Order
    {
      title: t('marketplace.guideSlide5Title') || "You'll need to upload a Purchase Order",
      caption: t('marketplace.guideSlide5Caption') || "This is a signed document from your company that confirms you'll actually pay the supplier you choose. It proves this tender is real and serious. Only you and the Bid team can see it — suppliers never will.",
      visual: (
        <div className="flex items-center justify-center px-4">
          <div className="flex items-start gap-5">
            {/* Document mockup */}
            <div className="relative w-[160px]">
              <div className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-2.5">
                {/* Header lines */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded bg-muted" />
                  <div className="h-2.5 w-20 bg-gray-200 rounded-full" />
                </div>
                {/* Content lines */}
                <div className="h-2 w-full bg-muted rounded-full" />
                <div className="h-2 w-4/5 bg-muted rounded-full" />
                <div className="h-2 w-full bg-muted rounded-full" />
                <div className="h-2 w-3/5 bg-muted rounded-full" />
                {/* Amount highlight */}
                <div className="mt-3 p-2 bg-[#FE3C01]/5 rounded border border-[#FE3C01]/20">
                  <div className="h-2 w-16 bg-[#FE3C01]/30 rounded-full" />
                </div>
                {/* Signature area */}
                <div className="mt-3 pt-3 border-t border-dashed border-border">
                  <div className="h-2 w-12 bg-gray-200 rounded-full mb-1" />
                  <div className="h-1.5 w-20 bg-muted rounded-full" />
                </div>
              </div>
              {/* Stamp */}
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-[#FE3C01]/10 border-2 border-[#FE3C01]/40 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[#FE3C01]" />
              </div>
            </div>

            {/* Info badges */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-muted rounded-lg border border-border">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('marketplace.guidePoOnlyYou') || 'Private to you'}</p>
                  <p className="text-[10px] text-gray-400">{t('marketplace.guidePoOnlyYouDesc') || 'Only you and Bid admin can see it'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-muted rounded-lg border border-border">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('marketplace.guidePoNeverPublic') || 'Never shown publicly'}</p>
                  <p className="text-[10px] text-gray-400">{t('marketplace.guidePoNeverPublicDesc') || 'Suppliers will never see this document'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#FE3C01]/5 rounded-lg border border-[#FE3C01]/20">
                <FileText className="h-4 w-4 text-[#FE3C01]" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('marketplace.guidePoSigned') || 'Signed & stamped'}</p>
                  <p className="text-[10px] text-gray-400">{t('marketplace.guidePoSignedDesc') || 'Proves your company will pay the winning supplier'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 6: Binding commitment
    {
      title: t('marketplace.guideSlide6Title') || 'Once you publish, there\'s no going back',
      caption: t('marketplace.guideSlide6Caption') || 'This isn\'t a draft — once your tender is live, you can\'t cancel it. Suppliers will spend time preparing proposals, so you\'re expected to pick a winner.',
      visual: (
        <div className="px-4">
          {/* Flow diagram */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {[
              { icon: Store, label: t('marketplace.guideFlowPublish') || 'You publish', color: 'bg-[var(--bid-orange)]/5 border-[var(--bid-orange)]/20 text-[var(--bid-orange)]' },
              { icon: Users, label: t('marketplace.guideFlowBid') || 'Suppliers apply', color: 'bg-amber-50 border-amber-200 text-amber-700 dark:text-amber-300' },
              { icon: CheckCircle, label: t('marketplace.guideFlowAward') || 'You pick a winner', color: 'bg-green-50 border-green-200 text-green-700 dark:text-green-300' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${step.color}`}>
                  <step.icon className="h-4 w-4" />
                  <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
                </div>
                {i < 2 && <ArrowRightCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Important note */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  {t('marketplace.guideBindingMerged') || 'Once published, this tender cannot be cancelled. You are expected to review proposals and award it to a vendor. Accounts that don\'t follow through may be permanently banned.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;

  return (
    <>
      {/* Animated slide content */}
      <div className="overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {/* Title */}
            <div className="px-6 pt-6 pb-3">
              <h3 className="text-base font-semibold text-foreground">{slide.title}</h3>
            </div>

            {/* Visual area */}
            <div className="px-4 min-h-[220px] flex items-center">
              <div className="w-full">{slide.visual}</div>
            </div>

            {/* Caption */}
            <div className="px-6 pt-2 pb-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{slide.caption}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-3">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-200 ${
              i === currentSlide
                ? 'bg-[#FE3C01] w-5 h-2'
                : 'bg-gray-200 hover:bg-gray-300 w-2 h-2'
            }`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-6 pb-5 pt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
          {t('marketplace.cancel') || 'Cancel'}
        </Button>
        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {currentSlide > 0 && (
            <Button variant="outline" size="sm" onClick={back}>
              {isRtl ? <ArrowRight className="h-3.5 w-3.5 me-1" /> : <ArrowLeft className="h-3.5 w-3.5 me-1" />}
              {t('marketplace.guideBack') || 'Back'}
            </Button>
          )}
          <Button
            className={`bg-[#FE3C01] hover:bg-[#d54d35] text-white ${isLastSlide ? 'px-5' : ''}`}
            onClick={isLastSlide ? onContinue : next}
          >
            {isLastSlide ? (
              <>
                <Store className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                {t('marketplace.introContinue') || 'Continue'}
              </>
            ) : (
              <>
                {t('marketplace.guideNext') || 'Next'}
                {isRtl ? <ArrowLeft className="h-3.5 w-3.5 ms-1" /> : <ArrowRight className="h-3.5 w-3.5 ms-1" />}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
