import type { CSSProperties, HTMLAttributes } from "react";

/**
 * Bid wordmark — built per Brand Identity Volume 01.
 *  - Inter 900 (Black), letter-spacing −0.055 em
 *  - Lowercase dotless ı (U+0131); B and d are native font geometry
 *  - Dot = perfect circle, diameter 0.255 em, centered on the ı stem
 *  - Approved colorways only (01–04) + outline for single-ink reproduction
 *  - Minimum digital size 24px wide; below that switch to <BidMonogram />
 */

type BidLogoVariant = "default" | "onInk" | "onOrange" | "onCream" | "outline";

const COLORWAY: Record<BidLogoVariant, { word: string; dot: string }> = {
  // 01 · BLACK ON WHITE — default on White and Cream surfaces.
  // Word color follows --foreground so the logo flips automatically in dark
  // mode to colorway 02 (Cream on Ink) without forcing pages to opt in.
  default: { word: "var(--foreground)", dot: "var(--bid-orange)" },
  // 02 · CREAM ON INK — explicit dark-surface lockup (e.g. an Ink banner inside light mode)
  onInk: { word: "var(--bid-cream)", dot: "var(--bid-orange)" },
  // 03 · CREAM ON ORANGE — signal surface
  onOrange: { word: "var(--bid-cream)", dot: "var(--bid-ink)" },
  // 04 · BLACK ON CREAM — everyday surface
  onCream: { word: "var(--bid-ink)", dot: "var(--bid-orange)" },
  // OUTLINE — single-ink reproduction (engraving, foil)
  outline: { word: "currentColor", dot: "currentColor" },
};

export interface BidLogoProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: BidLogoVariant;
  /** Logo height in px. Translates to font-size. */
  size?: number;
}

export function BidLogo({
  variant = "default",
  size,
  className = "",
  style,
  ...rest
}: BidLogoProps) {
  const { word, dot } = COLORWAY[variant];

  const rootStyle: CSSProperties = {
    color: word,
    letterSpacing: "-0.055em",
    ...(size != null ? { fontSize: `${size}px` } : {}),
    ...style,
  };

  const dotStyle: CSSProperties = {
    width: "0.255em",
    height: "0.255em",
    top: "0.06em",
    left: "50%",
    transform: "translateX(-50%)",
    background: variant === "outline" ? "transparent" : dot,
    border: variant === "outline" ? "0.045em solid currentColor" : "none",
  };

  return (
    <span
      role="img"
      aria-label="Bid"
      dir="ltr"
      className={`inline-flex items-baseline font-display font-black leading-none select-none ${className}`}
      style={rootStyle}
      {...rest}
    >
      <span aria-hidden="true">B</span>
      <span aria-hidden="true" className="relative inline-block">
        {"ı"}
        <span
          aria-hidden="true"
          className="absolute rounded-full"
          style={dotStyle}
        />
      </span>
      <span aria-hidden="true">d</span>
    </span>
  );
}

/**
 * B monogram — used below 24px wide (favicon, app icon, dense list rows).
 * The letter B in Inter 900 with the Signal Orange dot stamped at the
 * upper-right shoulder. Renders as a square mark.
 */
export interface BidMonogramProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: BidLogoVariant;
  /** Mark size in px (square). */
  size?: number;
}

export function BidMonogram({
  variant = "default",
  size = 32,
  className = "",
  style,
  ...rest
}: BidMonogramProps) {
  const { word, dot } = COLORWAY[variant];

  const surface =
    variant === "onInk"
      ? "var(--bid-ink)"
      : variant === "onOrange"
        ? "var(--bid-orange)"
        : "transparent";

  return (
    <span
      role="img"
      aria-label="Bid"
      dir="ltr"
      className={`inline-flex items-center justify-center relative font-display font-black leading-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: surface,
        color: word,
        fontSize: size * 0.78,
        letterSpacing: "-0.055em",
        borderRadius: size * 0.18,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true">B</span>
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          width: size * 0.18,
          height: size * 0.18,
          right: size * 0.14,
          top: size * 0.18,
          background: variant === "outline" ? "transparent" : dot,
          border: variant === "outline" ? "1.5px solid currentColor" : "none",
        }}
      />
    </span>
  );
}
