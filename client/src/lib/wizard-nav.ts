import { useLocation } from "wouter";

/**
 * Navigation between request-wizard steps (BID-UX-BUGFIX item 4).
 *
 * Moving forward pushes the next step and records where it came from. Going
 * back from a step that was reached that way is a real browser Back — so the
 * wizard's Back button and the browser's Back button do the same thing, and a
 * later browser Back never jumps forward again. When there is no such entry
 * (the step was opened directly, or after a reload), Back replaces the current
 * entry instead of stacking another one.
 *
 * Every step keeps its draft in localStorage on each change, so going back
 * never loses entered data, and Back never runs the forward-only validation.
 */
export function useWizardNav() {
  const [location, navigate] = useLocation();

  const goNext = (to: string) => navigate(to, { state: { wizardFrom: location } });

  const goBack = (to: string) => {
    const state = typeof window !== "undefined" ? (window.history.state as { wizardFrom?: string } | null) : null;
    if (state?.wizardFrom === to) window.history.back();
    else navigate(to, { replace: true });
  };

  return { goNext, goBack };
}
