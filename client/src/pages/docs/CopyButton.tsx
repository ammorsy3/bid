import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className }: { value: string; className?: string }) {
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
        "absolute top-2 right-2 p-1.5 rounded-md text-xs",
        "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 opacity-0 group-hover:opacity-100",
        "transition-opacity border border-zinc-700",
        className,
      )}
      aria-label="Copy code"
      type="button"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
