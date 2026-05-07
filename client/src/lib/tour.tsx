import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';

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

// ─── localStorage helpers (local cache) ──────────────────────────────────────

const tourKey = (tourId: string, userId: string) => `bid-guide-${tourId}-${userId}`;

function markDismissedLocal(tourId: string, userId: string) {
  localStorage.setItem(tourKey(tourId, userId), JSON.stringify({ dismissed: true }));
}

export function isTourDismissed(tourId: string, userId: string): boolean {
  try {
    const raw = localStorage.getItem(tourKey(tourId, userId));
    if (!raw) return false;
    return JSON.parse(raw).dismissed === true;
  } catch {
    return false;
  }
}

export function resetTour(tourId: string, userId: string) {
  localStorage.removeItem(tourKey(tourId, userId));
}

// ─── API helpers ──────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('token');
}

/** Fetch all dismissed tour IDs for the user and cache them in localStorage. */
async function syncTourProgressFromServer(userId: string): Promise<void> {
  const token = getToken();
  if (!token || !userId) return;
  try {
    const res = await fetch('/api/tour-progress', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const dismissed: string[] = await res.json();
    dismissed.forEach(tourId => markDismissedLocal(tourId, userId));
  } catch {
    // Silently fail — localStorage cache is still the fallback
  }
}

/** Persist a single tour dismissal to the server. */
async function persistDismissalToServer(tourId: string): Promise<void> {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`/api/tour-progress/${tourId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Silently fail — local state is already updated
  }
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
              boxShadow: '0 0 0 3px #FE3C01, 0 0 20px rgba(232, 97, 77, 0.35)',
              transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      {/* Tour card */}
      <AnimatePresence mode="wait">
        {cardPos && (
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bg-white dark:bg-background rounded-2xl shadow-2xl border border-border dark:border-border overflow-hidden"
            style={{ width: CARD_W, top: cardPos.top, left: cardPos.left, transformOrigin: cardPos.transformOrigin }}
          >
            {/* Progress bar */}
            <div className="relative h-1 bg-gray-100 dark:bg-card">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FE3C01] to-[#F19A8F]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>

            <div className="p-5">
              <div className={`flex items-center justify-between mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <p className="text-[11px] font-bold text-[#FE3C01] uppercase tracking-widest">
                  {isRtl ? `خطوة ${currentStep + 1} من ${steps.length}` : `Step ${currentStep + 1} of ${steps.length}`}
                </p>
                <button
                  onClick={onDismiss}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#FE3C01] hover:bg-[#D44D3A] transition-all px-3 py-1.5 rounded-lg shadow-sm"
                >
                  <X className="h-3.5 w-3.5" />
                  {isRtl ? 'تخطي' : 'Skip'}
                </button>
              </div>

              <h3 className={`font-bold text-gray-900 dark:text-foreground text-[15px] mb-2 leading-snug ${isRtl ? 'text-right' : ''}`}>
                {step.title}
              </h3>

              <p className={`text-sm text-gray-500 dark:text-gray-400 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
                {step.body}
              </p>

              <div className={`flex items-center gap-3 mt-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {!isFirst && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-muted-foreground dark:hover:text-gray-200 transition-colors"
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
                        background: i === currentStep ? '#FE3C01' : '#E5E7EB',
                      }}
                    />
                  ))}
                </div>

                <div className="flex-1" />

                <button
                  onClick={isLast ? onDismiss : onNext}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#FE3C01] hover:bg-[#D44D3A] px-4 py-2 rounded-lg transition-colors"
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

// ─── usePageTour hook ─────────────────────────────────────────────────────────
// Generic spotlight tour for any page. Each tourId tracks dismissal independently.

interface UsePageTourOptions {
  tourId: string; // unique key per page/tour e.g. 'dashboard', 'tender-create'
  userId: string;
  steps: TourStep[];
  isRtl: boolean;
  autoStart?: boolean;
  autoStartDelay?: number;
}

export function usePageTour({
  tourId,
  userId,
  steps,
  isRtl,
  autoStart = true,
  autoStartDelay = 1200,
}: UsePageTourOptions) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourDismissed, setTourDismissed] = useState(() => isTourDismissed(tourId, userId));

  // Sync dismissal state from server on mount (populates localStorage cache)
  useEffect(() => {
    if (!userId) return;
    syncTourProgressFromServer(userId).then(() => {
      const dismissed = isTourDismissed(tourId, userId);
      if (dismissed) {
        setTourDismissed(true);
        setIsActive(false);
      }
    });
  }, [tourId, userId]);

  // Auto-start after delay if not dismissed (uses localStorage as fast check)
  useEffect(() => {
    if (!autoStart || !userId || isTourDismissed(tourId, userId)) return;
    const t = setTimeout(() => {
      // Re-check after sync may have updated localStorage
      if (!isTourDismissed(tourId, userId)) {
        setCurrentStep(0);
        setIsActive(true);
      }
    }, autoStartDelay);
    return () => clearTimeout(t);
  }, [tourId, userId, autoStart, autoStartDelay]);

  const dismiss = useCallback(() => {
    setIsActive(false);
    markDismissedLocal(tourId, userId);  // instant local update
    setTourDismissed(true);
    persistDismissalToServer(tourId);    // async DB write
  }, [tourId, userId]);

  const next = useCallback(() => {
    setCurrentStep(s => (s >= steps.length - 1 ? s : s + 1));
  }, [steps.length]);

  const prev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), []);

  const retake = useCallback(() => {
    resetTour(tourId, userId);              // clear localStorage
    // Clear from DB too (DELETE then re-enable)
    const token = getToken();
    if (token) {
      fetch(`/api/tour-progress/${tourId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setTourDismissed(false);
    setCurrentStep(0);
    setIsActive(true);
  }, [tourId, userId]);

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

// Backwards-compatible alias used by Dashboard
export const useDashboardTour = (opts: Omit<UsePageTourOptions, 'tourId'>) =>
  usePageTour({ ...opts, tourId: 'dashboard' });

// ─── TourBanner ───────────────────────────────────────────────────────────────
// Lightweight dismissible hint banner for wizard-step pages (no spotlight).

interface TourBannerProps {
  tourId: string;
  userId: string;
  title: string;
  body: string;
  isRtl?: boolean;
}

export function TourBanner({ tourId, userId, title, body, isRtl = false }: TourBannerProps) {
  const [visible, setVisible] = useState(() => !isTourDismissed(tourId, userId));

  // Sync from server on mount — hide if already dismissed on another device
  useEffect(() => {
    if (!userId) return;
    syncTourProgressFromServer(userId).then(() => {
      if (isTourDismissed(tourId, userId)) setVisible(false);
    });
  }, [tourId, userId]);

  const dismiss = useCallback(() => {
    markDismissedLocal(tourId, userId);
    setVisible(false);
    persistDismissalToServer(tourId);
  }, [tourId, userId]);

  if (!visible || !userId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={`flex items-start gap-3 px-4 py-3 mb-5 rounded-xl border border-[#FE3C01]/20 bg-[#FFF8F6] dark:bg-[#FE3C01]/10 dark:border-[#FE3C01]/25 ${isRtl ? 'flex-row-reverse text-right' : ''}`}
      >
        <div className="flex-shrink-0 mt-0.5">
          <Lightbulb className="h-4 w-4 text-[#FE3C01]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground dark:text-foreground">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{body}</p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-gray-400 hover:text-muted-foreground dark:hover:text-gray-200 transition-colors mt-0.5"
          aria-label="Dismiss hint"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
