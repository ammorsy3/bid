import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

/**
 * Copy text, reporting whether it really reached the clipboard. The async
 * clipboard API can refuse (Safari drops the tap gesture after an await, some
 * in-app browsers have none, insecure contexts), so the old copy command is
 * tried next. Callers show "copied" only when this resolves true.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  try {
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.cssText = "position:fixed;top:0;opacity:0;font-size:16px";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(box);
    return ok;
  } catch {
    return false;
  }
}

/** Shows the link selected in a read-only field so it can be copied by hand. */
export function ManualCopyDialog({ text, onClose }: { text: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (text) requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
  }, [text]);
  return (
    <Dialog open={!!text} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="manual-copy-dialog">
        <DialogHeader>
          <DialogTitle>{t("tenderFlow.copyManualTitle")}</DialogTitle>
          <DialogDescription>{t("tenderFlow.copyManualDesc")}</DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          readOnly
          dir="ltr"
          value={text ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={t("tenderFlow.invitationLink")}
          className="w-full min-h-11 px-3 py-2 text-sm border border-border rounded-lg bg-muted font-mono"
          data-testid="manual-copy-input"
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * copy(text) → true when copied; when the browser refuses, the manual-copy
 * dialog opens instead (render `dialog` once in the component).
 */
export function useCopyWithFallback() {
  const [manual, setManual] = useState<string | null>(null);
  const copy = async (text: string) => {
    const ok = await copyText(text);
    if (!ok) setManual(text);
    return ok;
  };
  return { copy, dialog: <ManualCopyDialog text={manual} onClose={() => setManual(null)} /> };
}
