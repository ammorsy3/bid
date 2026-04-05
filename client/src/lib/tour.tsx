import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  target: string; // CSS selector e.g. '[data-tour="create-tender"]'
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const tourKey = (userId: string) => `bid-guide-${userId}`;

function markDismissed(userId: string) {
  localStorage.setItem(tourKey(userId), JSON.stringify({ dismissed: true }));
}

export function isTourDismissed(userId: string): boolean {
  try {
    const raw = localStorage.getItem(tourKey(userId));
    if (!raw) return false;
    return JSON.parse(raw).dismissed === true;
  } catch {
    return false;
  }
}

export function resetTour(userId: string) {
  localStorage.removeItem(tourKey(userId));
}

// ─── Card position calculation ────────────────────────────────────────────────

const CARD_W = 320;
const CARD_H = 200;
const MARGIN = 16;
const SPOTLIGHT_PAD = 8;

function getCardPosition(
  rect: SpotlightRect,
  placement: TourStep['placement'],
  isRtl: boolean,
  viewportW: number,
  viewportH: number
): { top: number; left: number; transformOrigin: string } {
  let effectivePlacement = placement;
  if (isRtl) {
    if (placement === 'left') effectivePlacement = 'right';
    else if (placement === 'right') effectivePlacement = 'left';
  }

  let top = 0;
  let left = 0;
  let transformOrigin = 'top left';

  const spotTop = rect.top - SPOTLIGHT_PAD;
  const spotBottom = rect.top + rect.height + SPOTLIGHT_PAD;
  const spotLeft = rect.left - SPOTLIGHT_PAD;
  const spotRight = rect.left + rect.width + SPOTLIGHT_PAD;
  const centerY = rect.top + rect.height / 2;
  const centerX = rect.left + rect.width / 2;

  switch (effectivePlacement) {
    case 'right':
      top = Math.max(MARGIN, Math.min(centerY - CARD_H / 2, viewportH - CARD_H - MARGIN));
      left = Math.min(spotRight + MARGIN, viewportW - CARD_W - MARGIN);
      transformOrigin = 'left center';
      break;
    case 'left':
      top = Math.max(MARGIN, Math.min(centerY - CARD_H / 2, viewportH - CARD_H - MARGIN));
      left = Math.max(MARGIN, spotLeft - CARD_W - MARGIN);
      transformOrigin = 'right center';
      break;
    case 'bottom':
      top = Math.min(spotBottom + MARGIN, viewportH - CARD_H - MARGIN);
      left = Math.max(MARGIN, Math.min(centerX - CARD_W / 2, viewportW - CARD_W - MARGIN));
      transformOrigin = 'top center';
      break;
    case 'top':
    default:
      top = Math.max(MARGIN, spotTop - CARD_H - MARGIN);
      left = Math.max(MARGIN, Math.min(centerX - CARD_W / 2, viewportW - CARD_W - MARGIN));
      transformOrigin = 'bottom center';
      break;
  }

  return { top, left, transformOrigin };
}

// ─── TourOverlay ──────────────────────────────────────────────────────────────

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  isRtl: boolean;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
}

export function TourOverlay({ steps, currentStep, isRtl, onNext, onPrev, onDismiss }: TourOverlayProps) {
  const step = steps[currentStep];
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  const updateSpotlight = useCallback(() => {
    const el = document.querySelector(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSpotlight({ top: r.top, left: r.left, width: r.width, height: r.height });
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, [step.target]);

  useEffect(() => {
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const t = setTimeout(updateSpotlight, 150);
      return () => clearTimeout(t);
    } else {
      updateSpotlight();
    }
  }, [step.target, currentStep, updateSpotlight]);

  useEffect(() => {
    const onResize = () => updateSpotlight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateSpotlight]);

  const cardPos = spotlight
    ? getCardPosition(spotlight, step.placement, isRtl, vp.w, vp.h)
    : null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ pointerEvents: 'all' }}
      role="dialog"
      aria-modal="true"
      aria-label="Product tour"
    >
      {/* Spotlight overlay using 4 strips */}
      {spotlight ? (
        <>
          <div className="absolute bg-black/55" style={{ top: 0, left: 0, right: 0, height: Math.max(0, spotlight.top - SPOTLIGHT_PAD) }} />
          <div className="absolute bg-black/55" style={{ top: spotlight.top + spotlight.height + SPOTLIGHT_PAD, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/55" style={{ top: spotlight.top - SPOTLIGHT_PAD, left: 0, width: Math.max(0, spotlight.left - SPOTLIGHT_PAD), height: spotlight.height + SPOTLIGHT_PAD * 2 }} />
          <div className="absolute bg-black/55" style={{ top: spotlight.top - SPOTLIGHT_PAD, left: spotlight.left + spotlight.width + SPOTLIGHT_PAD, right: 0, height: spotlight.height + SPOTLIGHT_PAD * 2 }} />
          {/* Spotlight ring */}
          <div
            className="absolute rounded-xl pointer-events-none"
            style={{
              top: spotlight.top - SPOTLIGHT_PAD,
              left: spotlight.left - SPOTLIGHT_PAD,
              width: spotlight.width + SPOTLIGHT_PAD * 2,
              height: spotlight.height + SPOTLIGHT_PAD * 2,
              boxShadow: '0 0 0 3px #E8614D, 0 0 20px rgba(232, 97, 77, 0.35)',
              transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      {/* Skip tour */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        style={{ zIndex: 1 }}
      >
        <X className="h-3.5 w-3.5" />
        {isRtl ? 'تخطي الجولة' : 'Skip tour'}
      </button>

      {/* Tour card */}
      <AnimatePresence mode="wait">
        {cardPos && (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{ width: CARD_W, top: cardPos.top, left: cardPos.left, transformOrigin: cardPos.transformOrigin }}
          >
            {/* Progress bar */}
            <div className="relative h-1 bg-gray-100 dark:bg-gray-800">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#E8614D] to-[#F19A8F]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>

            <div className="p-5">
              <p className="text-[11px] font-bold text-[#E8614D] uppercase tracking-widest mb-2">
                {isRtl ? `خطوة ${currentStep + 1} من ${steps.length}` : `Step ${currentStep + 1} of ${steps.length}`}
              </p>

              <h3 className={`font-bold text-gray-900 dark:text-white text-[15px] mb-2 leading-snug ${isRtl ? 'text-right' : ''}`}>
                {step.title}
              </h3>

              <p className={`text-sm text-gray-500 dark:text-gray-400 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
                {step.body}
              </p>

              <div className={`flex items-center gap-3 mt-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {!isFirst && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {isRtl ? 'رجوع' : 'Back'}
                  </button>
                )}

                <div className="flex-1" />

                {/* Dot indicators */}
                <div className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === currentStep ? 18 : 6,
                        height: 6,
                        background: i === currentStep ? '#E8614D' : '#E5E7EB',
                      }}
                    />
                  ))}
                </div>

                <div className="flex-1" />

                <button
                  onClick={isLast ? onDismiss : onNext}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#E8614D] hover:bg-[#D44D3A] px-4 py-2 rounded-lg transition-colors"
                >
                  {isLast
                    ? (isRtl ? 'تم' : 'Done')
                    : (isRtl ? 'التالي' : 'Next')}
                  {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── useDashboardTour hook ────────────────────────────────────────────────────
// Self-contained hook — no Provider needed. Returns overlay JSX + control functions.

interface UseDashboardTourOptions {
  userId: string;
  steps: TourStep[];
  isRtl: boolean;
  autoStart?: boolean; // start automatically if not dismissed (default: true)
  autoStartDelay?: number; // ms before auto-starting (default: 1200)
}

export function useDashboardTour({
  userId,
  steps,
  isRtl,
  autoStart = true,
  autoStartDelay = 1200,
}: UseDashboardTourOptions) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourDismissed, setTourDismissed] = useState(() => isTourDismissed(userId));

  // Auto-start on mount if not dismissed
  useEffect(() => {
    if (!autoStart || isTourDismissed(userId)) return;
    const t = setTimeout(() => {
      setCurrentStep(0);
      setIsActive(true);
    }, autoStartDelay);
    return () => clearTimeout(t);
  }, [userId, autoStart, autoStartDelay]);

  const dismiss = useCallback(() => {
    setIsActive(false);
    markDismissed(userId);
    setTourDismissed(true);
  }, [userId]);

  const next = useCallback(() => {
    setCurrentStep(s => {
      if (s >= steps.length - 1) return s;
      return s + 1;
    });
  }, [steps.length]);

  const prev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), []);

  const retake = useCallback(() => {
    resetTour(userId);
    setTourDismissed(false);
    setCurrentStep(0);
    setIsActive(true);
  }, [userId]);

  const overlay =
    isActive && steps.length > 0 ? (
      <TourOverlay
        steps={steps}
        currentStep={currentStep}
        isRtl={isRtl}
        onNext={next}
        onPrev={prev}
        onDismiss={dismiss}
      />
    ) : null;

  return { overlay, isActive, tourDismissed, retake };
}
