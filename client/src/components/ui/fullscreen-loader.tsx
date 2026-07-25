import { BidLogo } from "@/components/brand/BidLogo";

/**
 * A branded full-screen loading veil. Used for deliberate "hold" moments — e.g.
 * right after sign-in, before the workspace comes up — so the transition feels
 * like the app is actually preparing something rather than teleporting you in.
 */
export function FullscreenLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-6 bg-background">
      <div className="relative flex items-center justify-center">
        {/* Pulsing halo behind the mark */}
        <span className="absolute h-20 w-20 rounded-full bg-[#FE3C01]/15 animate-ping" />
        <span className="absolute h-14 w-14 rounded-full bg-[#FE3C01]/10" />
        <BidLogo variant="orange" size={44} className="relative" />
      </div>

      {/* Sweeping progress rail */}
      <div className="relative h-1 w-40 overflow-hidden rounded-full bg-muted">
        <span className="loader-sweep absolute inset-y-0 left-0 w-1/2 rounded-full bg-[#FE3C01]" />
      </div>

      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}

      <style>{`
        @keyframes loaderSweep {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(240%); }
        }
        .loader-sweep {
          animation: loaderSweep 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
