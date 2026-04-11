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
  const color = expired ? '#ef4444' : percent < 25 ? '#f59e0b' : '#E8614D';
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
      title: t('marketplace.guideSlide1Title') || 'This is how suppliers will see your tender',
      caption: t('marketplace.guideSlide1Caption') || 'Your listing will appear like this on the public marketplace for all suppliers to browse.',
      visual: (
        <div className="bg-[#FFF8F6] rounded-xl p-4 flex items-center justify-center">
          <div className="origin-top" style={{ transform: 'scale(0.78)', width: '520px' }}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Main content area */}
              <div className="flex items-stretch">
                {/* Left: Circle progress */}
                <div className="flex flex-col items-center justify-center px-6 py-6 border-e border-gray-100 min-w-[130px]">
                  <CircleProgress percent={percent} days={days} expired={expired} size={80} />
                  <p className={`text-[10px] mt-2 ${expired ? 'text-red-500' : 'text-gray-500'}`}>
                    {expired ? t('marketplace.deadlinePassed') : `${days} ${t('marketplace.daysRemaining')}`}
                  </p>
                </div>
                {/* Right: Tender info */}
                <div className="flex-1 min-w-0 px-5 py-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{t('marketplace.publishDate')}:</span>
                      <span className="font-medium text-gray-700">{formatDate(tender.createdAt)}</span>
                    </div>
                    <Badge className="bg-[#E8614D] text-white border-0 text-[9px] font-medium px-2 py-0.5 rounded">
                      {t('marketplace.openTender')}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2">
                    {tender.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    <Building className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{companyName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {tender.category && <span className="text-[10px] text-[#E8614D] font-medium">{tender.category}</span>}
                    <span className="text-[10px] text-gray-500 underline underline-offset-2">{t('marketplace.viewDetails')}</span>
                  </div>
                </div>
              </div>
              {/* Metadata row */}
              <div className="grid grid-cols-4 gap-px bg-gray-100 border-t border-gray-100">
                <div className="bg-white px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.refNumber')}</p>
                  <p className="text-xs font-semibold text-gray-800 font-mono">BID-XXXX</p>
                </div>
                <div className="bg-white px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.inquiryDeadline')}</p>
                  <p className="text-xs font-semibold text-gray-400">—</p>
                </div>
                <div className="bg-white px-3 py-2.5 text-center">
                  <p className="text-[9px] text-gray-400 mb-0.5">{t('marketplace.submissionDeadline')}</p>
                  <p className="text-xs font-semibold text-gray-800">{formatDate(tender.deadline)}</p>
                </div>
                <div className="bg-white px-3 py-2.5 text-center">
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
      title: t('marketplace.guideSlide2Title') || 'Choose your tender type',
      caption: t('marketplace.guideSlide2Caption') || 'Different types serve different procurement needs. You\'ll pick one in the next step.',
      visual: (
        <div className="grid grid-cols-3 gap-3 px-2">
          {[
            { icon: Globe, name: t('marketplace.openTender') || 'Open Tender', desc: t('marketplace.guideTenderTypeOpen') || 'Open to all qualified suppliers', color: 'border-blue-200 bg-blue-50', iconColor: 'text-blue-600', dotColor: 'bg-blue-500' },
            { icon: Handshake, name: t('marketplace.directPurchase') || 'Direct Purchase', desc: t('marketplace.guideTenderTypeDirect') || 'Targeted procurement, faster turnaround', color: 'border-amber-200 bg-amber-50', iconColor: 'text-amber-600', dotColor: 'bg-amber-500' },
            { icon: Layers, name: t('marketplace.frameworkAgreement') || 'Framework Agreement', desc: t('marketplace.guideTenderTypeFramework') || 'Long-term agreement, multiple orders', color: 'border-purple-200 bg-purple-50', iconColor: 'text-purple-600', dotColor: 'bg-purple-500' },
          ].map((type, i) => (
            <div key={i} className={`rounded-xl border-2 ${type.color} p-4 flex flex-col items-center text-center`}>
              <div className={`h-10 w-10 rounded-lg ${type.color} flex items-center justify-center mb-3`}>
                <type.icon className={`h-5 w-5 ${type.iconColor}`} />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{type.name}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{type.desc}</p>
            </div>
          ))}
        </div>
      ),
    },

    // Slide 3: Document fee
    {
      title: t('marketplace.guideSlide3Title') || 'Set a document fee (optional)',
      caption: t('marketplace.guideSlide3Caption') || 'Suppliers pay this fee to access your tender documents — similar to Etimad\'s system. Leave it empty for free access.',
      visual: (
        <div className="flex items-center justify-center gap-6 px-4">
          {/* Paid */}
          <div className="flex-1 rounded-xl border-2 border-amber-200 bg-amber-50/50 p-5 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="h-14 w-14 rounded-xl bg-white border border-amber-200 flex items-center justify-center shadow-sm">
                <FileText className="h-7 w-7 text-amber-600" />
              </div>
              <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                {t('marketplace.sar') || 'SAR'}
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-0.5">{t('marketplace.guideDocFeePaid') || 'Paid access'}</p>
            <p className="text-[11px] text-gray-500">{t('marketplace.guideDocFeePaidDesc') || 'Suppliers pay to access documents'}</p>
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
              <div className="h-14 w-14 rounded-xl bg-white border border-green-200 flex items-center justify-center shadow-sm">
                <FileText className="h-7 w-7 text-green-600" />
              </div>
              <div className="absolute -top-2 -right-2 bg-green-500 text-white flex items-center justify-center h-5 w-5 rounded-full shadow">
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-0.5">{t('marketplace.guideDocFeeFree') || 'Open access'}</p>
            <p className="text-[11px] text-gray-500">{t('marketplace.guideDocFeeFreeDesc') || 'Free for all suppliers'}</p>
          </div>
        </div>
      ),
    },

    // Slide 4: Inquiry deadline timeline
    {
      title: t('marketplace.guideSlide4Title') || 'Set an inquiry deadline',
      caption: t('marketplace.guideSlide4Caption') || 'Suppliers can ask questions until this date. After it passes, only submissions are accepted.',
      visual: (
        <div className="px-6 py-4">
          {/* Timeline */}
          <div className="relative flex items-center justify-between mx-4">
            {/* Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#E8614D]/40" style={{ width: '30%' }} />

            {/* Now dot */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-4 w-4 rounded-full bg-[#E8614D] border-2 border-white shadow" />
              <span className="text-[10px] font-semibold text-[#E8614D] mt-2">{t('marketplace.guideTimelineNow') || 'Now'}</span>
            </div>

            {/* Inquiry deadline dot */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-5 w-5 rounded-full border-2 border-dashed border-amber-400 bg-white flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] font-semibold text-amber-600 block">{t('marketplace.guideTimelineInquiry') || 'Inquiry Deadline'}</span>
                <span className="text-[9px] text-amber-500 italic">{t('marketplace.guideTimelineYoullSet') || "You'll set this"}</span>
              </div>
            </div>

            {/* Submission deadline dot */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-4 w-4 rounded-full bg-gray-700 border-2 border-white shadow" />
              <div className="mt-2 text-center">
                <span className="text-[10px] font-semibold text-gray-700 block">{t('marketplace.guideTimelineSubmission') || 'Submission Deadline'}</span>
                <span className="text-[9px] text-gray-500 font-medium">{format(new Date(tender.deadline), 'MMM d, yyyy', { locale: dateLocale })}</span>
              </div>
            </div>
          </div>

          {/* Annotation */}
          <div className="mt-8 flex items-center justify-center gap-6 text-[11px]">
            <div className="flex items-center gap-1.5 text-gray-500">
              <div className="h-2.5 w-2.5 rounded-full bg-[#E8614D]/30 border border-[#E8614D]" />
              <span>{t('marketplace.guideTimelineQuestionsOpen') || 'Questions open'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <div className="h-2.5 w-2.5 rounded-full bg-gray-200 border border-gray-400" />
              <span>{t('marketplace.guideTimelineSubmissionsOnly') || 'Submissions only'}</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 5: Purchase Order
    {
      title: t('marketplace.guideSlide5Title') || "You'll need a Purchase Order",
      caption: t('marketplace.guideSlide5Caption') || "A signed PO confirms your payment commitment to the awarded vendor. It's only visible to you and Bid admin — never public.",
      visual: (
        <div className="flex items-center justify-center px-4">
          <div className="flex items-start gap-5">
            {/* Document mockup */}
            <div className="relative w-[160px]">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-2.5">
                {/* Header lines */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded bg-gray-100" />
                  <div className="h-2.5 w-20 bg-gray-200 rounded-full" />
                </div>
                {/* Content lines */}
                <div className="h-2 w-full bg-gray-100 rounded-full" />
                <div className="h-2 w-4/5 bg-gray-100 rounded-full" />
                <div className="h-2 w-full bg-gray-100 rounded-full" />
                <div className="h-2 w-3/5 bg-gray-100 rounded-full" />
                {/* Amount highlight */}
                <div className="mt-3 p-2 bg-[#E8614D]/5 rounded border border-[#E8614D]/20">
                  <div className="h-2 w-16 bg-[#E8614D]/30 rounded-full" />
                </div>
                {/* Signature area */}
                <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
                  <div className="h-2 w-12 bg-gray-200 rounded-full mb-1" />
                  <div className="h-1.5 w-20 bg-gray-100 rounded-full" />
                </div>
              </div>
              {/* Stamp */}
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-[#E8614D]/10 border-2 border-[#E8614D]/40 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[#E8614D]" />
              </div>
            </div>

            {/* Info badges */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <Lock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs font-medium text-gray-700">{t('marketplace.guidePoOnlyYou') || 'Only visible to you'}</p>
                  <p className="text-[10px] text-gray-400">{t('marketplace.guidePoOnlyYouDesc') || 'And Bid admin'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <Lock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs font-medium text-gray-700">{t('marketplace.guidePoNeverPublic') || 'Never public'}</p>
                  <p className="text-[10px] text-gray-400">{t('marketplace.guidePoNeverPublicDesc') || 'Suppliers cannot see this'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#E8614D]/5 rounded-lg border border-[#E8614D]/20">
                <FileText className="h-4 w-4 text-[#E8614D]" />
                <div>
                  <p className="text-xs font-medium text-gray-700">{t('marketplace.guidePoSigned') || 'Signed & stamped'}</p>
                  <p className="text-[10px] text-gray-400">{t('marketplace.guidePoSignedDesc') || 'Official payment commitment'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 6: Binding commitment
    {
      title: t('marketplace.guideSlide6Title') || 'This is a binding commitment',
      caption: t('marketplace.guideSlide6Caption') || 'Once published, this tender cannot be cancelled. You must evaluate proposals and award it to a vendor.',
      visual: (
        <div className="px-4">
          {/* Flow diagram */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {[
              { icon: Store, label: t('marketplace.guideFlowPublish') || 'Publish', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { icon: Users, label: t('marketplace.guideFlowBid') || 'Suppliers Bid', color: 'bg-amber-50 border-amber-200 text-amber-700' },
              { icon: CheckCircle, label: t('marketplace.guideFlowAward') || 'You Award', color: 'bg-green-50 border-green-200 text-green-700' },
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

          {/* Warning box */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/60">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">{t('marketplace.introBindingTitle') || 'This is a binding commitment'}</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  {t('marketplace.introBindingDesc') || 'Marketplace tenders cannot be cancelled once published. You are required to evaluate proposals and award the tender to a participating vendor.'}
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
              <h3 className="text-base font-semibold text-gray-900">{slide.title}</h3>
            </div>

            {/* Visual area */}
            <div className="px-4 min-h-[220px] flex items-center">
              <div className="w-full">{slide.visual}</div>
            </div>

            {/* Caption */}
            <div className="px-6 pt-2 pb-1">
              <p className="text-sm text-gray-500 leading-relaxed">{slide.caption}</p>
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
                ? 'bg-[#E8614D] w-5 h-2'
                : 'bg-gray-200 hover:bg-gray-300 w-2 h-2'
            }`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-6 pb-5 pt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500">
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
            className={`bg-[#E25E45] hover:bg-[#d54d35] text-white ${isLastSlide ? 'px-5' : ''}`}
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
