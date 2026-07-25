import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

/**
 * A thin top progress bar that runs a short animation on every route change —
 * the NProgress / GitHub / Vercel pattern. It gives navigation a deliberate
 * "something is loading" beat (~450ms) so buttons that move you between screens
 * feel like they're doing real work, instead of snapping instantly.
 *
 * Mounted once at the app root; it watches wouter's location and needs no wiring
 * at individual call sites. The bar itself is a CSS keyframe that replays each
 * time `runId` bumps — driving the fill in CSS (not JS timers) keeps it immune
 * to the effect-cleanup races that a setTimeout trickle is prone to.
 */
export function NavigationProgress() {
  const [location] = useLocation();
  const [runId, setRunId] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => {
    // Skip the very first paint so the bar doesn't flash on initial load.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setRunId((id) => id + 1);
  }, [location]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
    >
      {runId > 0 && (
        <div
          key={runId}
          className="nav-progress-fill h-full rounded-r-full bg-[#FE3C01]"
          style={{ boxShadow: "0 0 8px rgba(254,60,1,0.7), 0 0 4px rgba(254,60,1,0.5)" }}
        />
      )}
      <style>{`
        @keyframes navProgressFill {
          0%   { width: 0%;   opacity: 1; }
          55%  { width: 88%;  opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        .nav-progress-fill {
          animation: navProgressFill 0.45s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
