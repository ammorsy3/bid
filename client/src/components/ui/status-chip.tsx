import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// The Bid dot-state vocabulary, promoted to a chip used identically everywhere
// (dashboard lists, marketplace cards, admin tables). Each state maps to its
// brand token plus a soft wash background.
export type BidState = "idle" | "live" | "decision" | "won" | "lost" | "pending";

const STATE_STYLES: Record<BidState, { dot: string; text: string; wash: string }> = {
  idle:     { dot: "var(--state-idle)",     text: "var(--state-idle)",     wash: "rgba(138,128,120,0.12)" },
  live:     { dot: "var(--state-live)",     text: "#C23000",               wash: "rgba(254,60,1,0.10)" },
  decision: { dot: "var(--state-decision)", text: "var(--state-decision)", wash: "rgba(26,22,19,0.08)" },
  won:      { dot: "var(--state-won)",      text: "#177E51",               wash: "rgba(31,165,106,0.12)" },
  lost:     { dot: "var(--state-lost)",     text: "var(--state-lost)",     wash: "rgba(215,50,31,0.10)" },
  pending:  { dot: "var(--state-pending)",  text: "#9A6D00",               wash: "rgba(240,168,0,0.14)" },
};

interface StatusChipProps {
  state: BidState;
  children: ReactNode;
  /** Animate the dot (use for "live"). */
  pulse?: boolean;
  className?: string;
}

export function StatusChip({ state, children, pulse = false, className }: StatusChipProps) {
  const s = STATE_STYLES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        className,
      )}
      style={{ background: s.wash, color: s.text }}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", pulse && "animate-pulse")}
        style={{ background: s.dot }}
      />
      {children}
    </span>
  );
}
