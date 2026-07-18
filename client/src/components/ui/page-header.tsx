import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Two-digit section number, e.g. "01". Optional. */
  num?: string;
  /** Title text. The orange full-stop is appended automatically. */
  title: string;
  description?: ReactNode;
  /** Right-aligned action (button, etc.). */
  action?: ReactNode;
  isRtl?: boolean;
  className?: string;
  titleTestId?: string;
  descTestId?: string;
  /** Omit the signature orange period after the title. */
  noPeriod?: boolean;
}

/**
 * The canonical internal-page header — the "01 / Overview." editorial motif
 * (number chip → display title → orange full-stop → subtitle). Extracted from
 * the dashboard so every internal screen speaks the same visual language.
 */
export function PageHeader({
  num,
  title,
  description,
  action,
  isRtl = false,
  className,
  titleTestId,
  descTestId,
  noPeriod = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-6",
        isRtl && "flex-row-reverse",
        className,
      )}
    >
      <div className={cn("min-w-0", isRtl && "text-right")}>
        {num && (
          <span className="inline-block text-xs font-semibold text-[var(--bid-orange)] bg-[#FFE4D7] dark:bg-[var(--bid-orange)]/15 px-3 py-1.5 rounded-full mb-4 tracking-wide tabular-nums">
            {num}
          </span>
        )}
        <h1
          className="font-display font-bold text-3xl sm:text-4xl text-[var(--bid-ink)] dark:text-foreground tracking-[-0.04em] leading-[1.05]"
          data-testid={titleTestId}
        >
          {title}
          {!noPeriod && <span className="text-[var(--bid-orange)]">.</span>}
        </h1>
        {description && (
          <p
            className="text-sm sm:text-base text-[var(--bid-stone)] dark:text-muted-foreground mt-3 max-w-xl leading-relaxed"
            data-testid={descTestId}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
