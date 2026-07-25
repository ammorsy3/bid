import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Icon element (e.g. a lucide icon). Rendered inside an orange-wash squircle. */
  icon?: ReactNode;
  /** Headline in the display face — the orange period is appended automatically. */
  title: string;
  description?: ReactNode;
  /** Single primary action. */
  action?: ReactNode;
  className?: string;
  noPeriod?: boolean;
}

/**
 * The one empty-state pattern: icon in an orange-wash squircle, display-font
 * headline with the signature orange full-stop, one line of Stone subcopy, and
 * a single primary action. Used for every "nothing here yet" surface.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  noPeriod = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-14",
        className,
      )}
    >
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bid-orange)]/10 text-[var(--bid-orange)]">
          {icon}
        </div>
      )}
      <h3 className="font-display font-bold text-2xl text-[var(--bid-ink)] dark:text-foreground tracking-[-0.03em]">
        {title}
        {!noPeriod && <span className="text-[var(--bid-orange)]">.</span>}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-[var(--bid-stone)] dark:text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
