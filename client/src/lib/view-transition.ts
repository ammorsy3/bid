import type { AroundNavHandler } from "wouter";

// Wraps a state update in the View Transitions API so the browser animates
// between the two DOM states on its own — a soft cross-fade by default,
// instead of a hard instant cut when content swaps (quality-bar.md section 6:
// "Motion feels deliberate, not instant cuts... prefer a transition over a
// hard flash when content swaps").
//
// Falls back to running the update with no transition at all when the
// browser doesn't support it yet (pre-2024 Safari/iOS — still a meaningful
// slice of Bid's traffic) or when the visitor has asked for reduced motion.
// Either way the update itself always runs; this only ever adds motion, it
// never blocks or delays the actual state change.
export function withViewTransition(update: () => void): void {
  const supportsViewTransitions =
    typeof document !== "undefined" && "startViewTransition" in document;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!supportsViewTransitions || prefersReducedMotion) {
    update();
    return;
  }

  // TypeScript's lib.dom doesn't have startViewTransition yet in this
  // project's target; the `"startViewTransition" in document` check above is
  // the real feature test, this cast just satisfies the compiler.
  const transition = (
    document as Document & {
      startViewTransition: (cb: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    }
  ).startViewTransition(update);

  // The browser rejects `ready`/`finished` with "Transition was skipped"
  // whenever a second transition starts before the first settles — routine
  // here, since e.g. Radix's Tabs fires onValueChange twice per click (once
  // via its focus-activation path, once via click). Left uncaught, that
  // rejection becomes an unhandled promise rejection; nothing else in this
  // function awaits these promises, so without this they'd otherwise go
  // unhandled. Swallow it: it only means the animation was skipped, the
  // state update itself already ran either way.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

// wouter's Router accepts an `aroundNav` hook that wraps every navigate()
// call — a <Link> click or an imperative setLocation — before it runs
// (wouter/src/index.js: `aroundNav: (n, t, o) => n(t, o)` is the no-op
// default). Passing this as `aroundNav` gives every page-to-page navigation
// in the app the same soft cross-fade the dashboard's tab switches already
// have, without touching each of the app's Link/setLocation call sites
// individually.
export const withViewTransitionNav: AroundNavHandler = (navigate, to, options) => {
  withViewTransition(() => navigate(to, options));
};
