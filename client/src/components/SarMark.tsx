import { cn } from "@/lib/utils";

/** Small "SAR" label used where a money field used to show a dollar icon (amounts are Saudi riyals). */
export function SarMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" dir="ltr" className={cn("inline-block shrink-0 text-[9px] font-bold leading-none tracking-tight", className)}>
      SAR
    </span>
  );
}
