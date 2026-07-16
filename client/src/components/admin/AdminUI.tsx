import { useIsFetching } from "@tanstack/react-query";
import type { ReactNode, ElementType, HTMLAttributes } from "react";

// ============================================================================
// Shared "refined" admin design primitives.
// The whole admin panel is built from these so every page reads as one system:
// warm brand-orange accents, rounded-3xl cards, big display headings, and
// consistent skeletons that remove the blank-white flash while data loads.
// ============================================================================

export const BID_ORANGE = "#FE3C01";

// Card surfaces
export const ADMIN_CARD =
  "rounded-3xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card";
export const ADMIN_CARD_HOVER =
  "transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FE3C01]/25 hover:shadow-[0_18px_40px_-24px_rgba(254,60,1,0.22)]";

// Status pill colours, shared across dashboard + tenders + marketplace.
export function statusStyle(status: string): string {
  switch (status) {
    case "published":
    case "approved":
    case "verified":
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300";
    case "closed":
    case "under_review":
    case "pending":
      return "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300";
    case "cancelled":
    case "rejected":
    case "blocked":
      return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
    default:
      return "bg-gray-100 dark:bg-card text-gray-600 dark:text-gray-400";
  }
}

// ---------------------------------------------------------------------------
// Page shell — warm top wash + centered container
// ---------------------------------------------------------------------------
export function AdminPage({ children, width = "wide" }: { children: ReactNode; width?: "wide" | "narrow" }) {
  const max = width === "narrow" ? "max-w-4xl" : "max-w-7xl";
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#FE3C01]/[0.04] to-transparent dark:from-[#FE3C01]/[0.06]" />
      <div className={`relative p-6 sm:p-10 ${max} mx-auto`}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page header — eyebrow pill + display title + subtitle + optional action
// ---------------------------------------------------------------------------
export function AdminHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  eyebrowIcon?: ElementType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FE3C01] bg-[#FFE4D7] dark:bg-[#FE3C01]/15 px-3 py-1 rounded-full mb-3 tracking-wide uppercase">
            {EyebrowIcon && <EyebrowIcon className="h-3 w-3" />}
            {eyebrow}
          </span>
        )}
        <h1 className="font-display font-bold text-4xl sm:text-[2.75rem] text-[#1A1613] dark:text-foreground tracking-[-0.04em] leading-[1]">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function AdminCard({ children, className = "", hover = false, ...rest }: { children: ReactNode; className?: string; hover?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`${ADMIN_CARD} ${hover ? ADMIN_CARD_HOVER : ""} ${className}`} {...rest}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Section heading (smaller than page header) with an icon chip
// ---------------------------------------------------------------------------
export function AdminSectionTitle({ icon: Icon, title, subtitle }: { icon: ElementType; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl bg-[#FE3C01]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-[#FE3C01]" />
      </div>
      <div>
        <h2 className="font-display font-bold text-2xl text-[#1A1613] dark:text-foreground tracking-[-0.03em] leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons — the antidote to the blank-white flash
// ---------------------------------------------------------------------------
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gradient-to-r from-gray-100 via-gray-100/60 to-gray-100 dark:from-card dark:via-card/60 dark:to-card rounded-2xl animate-pulse ${className}`} />;
}

// A row of KPI card skeletons.
export function SkeletonKpis({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-3xl" />
      ))}
    </div>
  );
}

// A card containing stacked list-row skeletons.
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className={`${ADMIN_CARD} p-4 space-y-3`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function AdminEmpty({ icon: Icon, title, subtitle, tone = "neutral" }: { icon: ElementType; title: string; subtitle?: string; tone?: "neutral" | "positive" }) {
  const chip = tone === "positive"
    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500"
    : "bg-[#FE3C01]/10 text-[#FE3C01]";
  return (
    <div className={`${ADMIN_CARD} py-16 text-center`}>
      <div className={`h-14 w-14 rounded-2xl ${chip} flex items-center justify-center mx-auto mb-4`}>
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium text-[#1A1613] dark:text-foreground">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top loading bar — a thin brand-orange bar that animates whenever ANY
// react-query request is in flight. Immediate feedback, no blank white.
// ---------------------------------------------------------------------------
export function TopLoadingBar() {
  const fetching = useIsFetching();
  if (!fetching) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 h-0.5 overflow-hidden bg-transparent" role="progressbar" aria-label="Loading">
      <div className="h-full w-full bg-gradient-to-r from-transparent via-[#FE3C01] to-transparent admin-loading-bar" />
    </div>
  );
}
