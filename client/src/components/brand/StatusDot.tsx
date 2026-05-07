import type { CSSProperties, HTMLAttributes } from "react";

/**
 * Bid dot states — Brand Identity Volume 01, panel "Six colors. One shape. Every context."
 *
 *   Idle     · Stone   · static
 *   Live     · Orange  · pulse
 *   Decision · Ink     · stamped
 *   Won      · Green   · +
 *   Lost     · Red     · −
 *   Pending  · Amber   · blink
 *
 * The dot is the only graphic primitive that varies; its color and motion
 * carry the meaning. Always solid fill, always a perfect circle, always 0°.
 */

export type BidState =
  | "idle"
  | "live"
  | "decision"
  | "won"
  | "lost"
  | "pending";

const STATE: Record<BidState, { color: string; motion: "none" | "pulse" | "blink"; label: string }> = {
  idle:     { color: "var(--state-idle)",     motion: "none",  label: "Idle" },
  live:     { color: "var(--state-live)",     motion: "pulse", label: "Live" },
  decision: { color: "var(--state-decision)", motion: "none",  label: "Decision" },
  won:      { color: "var(--state-won)",      motion: "none",  label: "Won" },
  lost:     { color: "var(--state-lost)",     motion: "none",  label: "Lost" },
  pending:  { color: "var(--state-pending)",  motion: "blink", label: "Pending" },
};

export interface StatusDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  state: BidState;
  /** Dot diameter in px. Defaults to 8. */
  size?: number;
  /** Force-disable motion even on Live/Pending states. */
  static?: boolean;
}

export function StatusDot({
  state,
  size = 8,
  static: isStatic = false,
  className = "",
  style,
  ...rest
}: StatusDotProps) {
  const { color, motion, label } = STATE[state];
  const motionClass =
    isStatic || motion === "none"
      ? ""
      : motion === "pulse"
        ? "bid-dot-pulse"
        : "bid-dot-blink";

  const dotStyle: CSSProperties = {
    width: size,
    height: size,
    background: color,
    ...style,
  };

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-block rounded-full shrink-0 ${motionClass} ${className}`}
      style={dotStyle}
      {...rest}
    />
  );
}

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  state: BidState;
  /** Override the default state label (e.g. localised). */
  label?: string;
  /** "soft" = tinted background + ink text (default).  "ghost" = transparent + colored text. */
  tone?: "soft" | "ghost";
  /** Force-disable motion. */
  static?: boolean;
}

const SOFT_TINT: Record<BidState, string> = {
  idle:     "rgba(138, 128, 120, 0.12)",
  live:     "rgba(254, 60, 1, 0.10)",
  decision: "rgba(26, 22, 19, 0.08)",
  won:      "rgba(31, 165, 106, 0.12)",
  lost:     "rgba(215, 50, 31, 0.10)",
  pending:  "rgba(240, 168, 0, 0.14)",
};

// Foreground uses --foreground (Ink in light, Cream in dark) so badge labels
// stay readable in dark mode. won/lost keep their state hex since those colors
// have enough luminance contrast against both light and dark soft tints.
const FOREGROUND: Record<BidState, string> = {
  idle:     "var(--foreground)",
  live:     "var(--foreground)",
  decision: "var(--foreground)",
  won:      "var(--state-won)",
  lost:     "var(--state-lost)",
  pending:  "var(--foreground)",
};

export function StatusBadge({
  state,
  label,
  tone = "soft",
  static: isStatic,
  className = "",
  ...rest
}: StatusBadgeProps) {
  const text = label ?? STATE[state].label;
  const bg = tone === "soft" ? SOFT_TINT[state] : "transparent";
  const fg = FOREGROUND[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium font-sans ${className}`}
      style={{ background: bg, color: fg }}
      {...rest}
    >
      <StatusDot state={state} size={6} static={isStatic} />
      <span>{text}</span>
    </span>
  );
}
