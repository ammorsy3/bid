import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore — some browsers deny clipboard in insecure contexts */
    }
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        // Phones: always visible (no hover), a 44px target in the code block's top bar.
        "absolute top-0 end-0 inline-flex items-center justify-center size-11 rounded-md text-xs",
        "text-zinc-300 active:bg-zinc-700/70 active:scale-90 transition-[opacity,transform,background-color]",
        // Desktop: the small chip that appears on hover, as before.
        "lg:top-2 lg:end-2 lg:size-auto lg:p-1.5 lg:bg-zinc-800/80 lg:hover:bg-zinc-700 lg:text-zinc-200",
        "lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 lg:border lg:border-zinc-700",
        copied && "text-emerald-400",
        className,
      )}
      aria-label={copied ? t("docs.copied") : t("docs.copyCode")}
      type="button"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
