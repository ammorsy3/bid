import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface BackPillButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Shared "orange pill" back affordance used across settings, the company
 * editor, and the tender wizard so every in-flow page shares one back
 * pattern instead of each screen reimplementing its own variant.
 */
export function BackPillButton({ onClick, label, className, ...rest }: BackPillButtonProps) {
  const { t, isRtl } = useI18n();
  const text = label ?? t('common.back');
  const Icon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <Button
      onClick={onClick}
      className={cn("group relative overflow-hidden h-8", className)}
      data-testid={rest["data-testid"] ?? "button-back"}
    >
      <span className="translate-x-2 transition-opacity duration-500 group-hover:opacity-0 text-sm px-1">
        {text}
      </span>
      <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
        <Icon className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
      </i>
    </Button>
  );
}
