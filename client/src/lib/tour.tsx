import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  target: string; // CSS selector e.g. '[data-tour="create-tender"]'
  title: string;
  body: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** Target lives inside the off-canvas mobile sidebar drawer — consumer must open it while this step is active. */
  requiresMobileSidebar?: boolean;
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

/**
 * Clear dismissal state for every tour/banner (local cache + server), not just one
 * tourId. Used by a global "Take a tour" action so re-arming guides on one page also
 * re-arms the ones on every other page — otherwise a user who already dismissed all
 * of them would see nothing when they later visit those other pages.
 */
export async function resetAllTours(userId: string): Promise<void> {
  const prefix = 'bid-guide-';
  const suffix = `-${userId}`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key.endsWith(suffix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  const token = getToken();
  if (!token) return;
  try {
    await fetch('/api/tour-progress', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Local cache is already cleared — guides will still re-arm on this device
  }
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
const MOBILE_BP = 768; // matches the app's shared sidebar breakpoint (client/src/hooks/use-mobile.tsx)
const MOBILE_CARD_MARGIN = 12;

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
  const cardRef = useRef<HTMLDivElement>(null);
  // Real card height varies with each step's title/body length. CARD_H is only a
  // fallback for the first paint before the card has rendered — using it as a fixed
  // assumption for the mobile clear-zone left a gap of un-dimmed page content showing
  // through whenever the actual card was shorter than 200px.
  const [cardHeight, setCardHeight] = useState(CARD_H);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCardHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentStep]);

  const updateSpotlight = useCallback(() => {
    const el = document.querySelector(step.target);
    if (!el) {
      setSpotlight(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setSpotlight({ top: r.top, left: r.left, width: r.width, height: r.height });
    setVp({ w: window.innerWidth, h: window.innerHeight });
  }, [step.target]);

  // Re-measure on every frame for a short settle window instead of a single fixed-delay
  // read. The target may still be animating in (e.g. the mobile sidebar drawer sliding
  // open, which takes ~500ms) or mid smooth-scroll, so one guessed delay was unreliable.
  useEffect(() => {
    let rafId: number;
    let cancelled = false;
    const start = performance.now();
    const SETTLE_MS = 700;

    const tick = () => {
      if (cancelled) return;
      updateSpotlight();
      const elapsed = performance.now() - start;
      if (elapsed < SETTLE_MS) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      // Target never showed up for this step even after settling — it depends on data
      // that doesn't exist yet (e.g. AI Copilot's preview toggle before any draft has
      // been created). Skip forward instead of leaving a blank spotlight-less overlay.
      if (!document.querySelector(step.target)) {
        if (currentStep >= steps.length - 1) onDismiss();
        else onNext();
      }
    };

    const el = document.querySelector(step.target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [step.target, currentStep, updateSpotlight, steps.length, onNext, onDismiss]);

  // Keep the spotlight synced if the user manually scrolls mid-step (common on mobile,
  // where touch-scroll is the primary way to reveal content). `capture: true` lets a
  // single window listener catch scroll events from nested scroll containers too, since
  // scroll doesn't bubble but does propagate in the capture phase.
  useEffect(() => {
    const onReflow = () => updateSpotlight();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [updateSpotlight]);

  const isMobile = vp.w < MOBILE_BP;
  const cardPos = !isMobile && spotlight
    ? getCardPosition(spotlight, step.placement, isRtl, vp.w, vp.h)
    : null;
  const showCard = isMobile || cardPos !== null;

  // On mobile the card is normally pinned to the bottom of the screen. If the
  // spotlighted target itself sits low enough that the pinned card would cover it
  // (e.g. the user-menu step, which highlights the sidebar footer), float the card
  // above the target instead so the highlighted element stays visible.
  const mobileCardBottom = (() => {
    if (!spotlight) return MOBILE_CARD_MARGIN;
    const spaceBelowSpotlight = vp.h - (spotlight.top + spotlight.height + SPOTLIGHT_PAD);
    if (spaceBelowSpotlight >= cardHeight) return MOBILE_CARD_MARGIN;
    return Math.max(MOBILE_CARD_MARGIN, vp.h - (spotlight.top - SPOTLIGHT_PAD) + MOBILE_CARD_MARGIN);
  })();

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
          <div className="absolute bg-black/55" style={{ top: spotlight.top + spotlight.height + SPOTLIGHT_PAD, left: 0, right: 0, bottom: isMobile ? mobileCardBottom + cardHeight : 0 }} />
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
        {showCard && (
          <motion.div
            key={`step-${currentStep}`}
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.94, y: isMobile ? 16 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: isMobile ? 16 : 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bg-white dark:bg-background shadow-2xl border border-border dark:border-border overflow-hidden"
            style={
              isMobile
                ? { left: 12, right: 12, bottom: mobileCardBottom, borderRadius: 24, transformOrigin: 'bottom center' }
                : { width: CARD_W, top: cardPos!.top, left: cardPos!.left, borderRadius: 16, transformOrigin: cardPos!.transformOrigin }
            }
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
              <div className={`flex items-center justify-between mb-2`}>
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

              <div className={`flex items-center gap-3 mt-5`}>
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
                <div className={`flex items-center gap-1`}>
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
  // Tours are opt-in: they no longer auto-launch on first visit (that stacked
  // 4+ interrupting tours across the app). Users start one via "Take a tour".
  autoStart = false,
  autoStartDelay = 1200,
}: UsePageTourOptions) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourDismissed, setTourDismissed] = useState(() => isTourDismissed(tourId, userId));

  // Sync dismissal state from server on mount (populates localStorage cache). Must set
  // tourDismissed in both directions — a "Take a tour" reset on another page clears this
  // tour's dismissal server-side, and if that hasn't propagated by the time this sync GET
  // fires, an if-dismissed-only check would leave tourDismissed stuck true with nothing to
  // ever correct it back.
  useEffect(() => {
    if (!userId) return;
    syncTourProgressFromServer(userId).then(() => {
      const dismissed = isTourDismissed(tourId, userId);
      setTourDismissed(dismissed);
      if (dismissed) setIsActive(false);
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

  const activeStep = isActive ? steps[currentStep] ?? null : null;

  return { overlay, isActive, tourDismissed, retake, activeStep };
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

  // Sync from server on mount — must set visible in both directions (not just hide when
  // dismissed), otherwise a "Take a tour" reset done from another page can't ever bring
  // this banner back if this sync happens to run before that reset's DELETE has propagated.
  useEffect(() => {
    if (!userId) return;
    syncTourProgressFromServer(userId).then(() => {
      setVisible(!isTourDismissed(tourId, userId));
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
        className={`flex items-start gap-3 px-4 py-3 mb-5 rounded-xl border border-[#FE3C01]/20 bg-[#FFF8F6] dark:bg-[#FE3C01]/10 dark:border-[#FE3C01]/25 ${isRtl ? 'text-right' : ''}`}
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
