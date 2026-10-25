// An item image. /objects/* needs the Authorization header, so the image is
// fetched and shown from a blob URL. Anonymous invitation-link visitors cannot
// load item images (Amendment A9.5): they see a sign-in prompt instead.
import { useEffect, useState } from "react";
import { ImageOff, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { authUrlWithReturn } from "@/lib/return-to";

type State = { kind: "loading" } | { kind: "ok"; url: string } | { kind: "signin" } | { kind: "denied" } | { kind: "error" };

export function BoqImage({ path, alt, invitationToken, className = "h-16 w-16" }: { path: string; alt: string; invitationToken?: string | null; className?: string }) {
  const { t } = useI18n();
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const [state, setState] = useState<State>(token ? { kind: "loading" } : { kind: "signin" });

  useEffect(() => {
    if (!token) return setState({ kind: "signin" });
    let url: string | null = null;
    let cancelled = false;
    setState({ kind: "loading" });
    fetch(path, { headers: { Authorization: `Bearer ${token}`, ...(invitationToken ? { "X-Invitation-Token": invitationToken } : {}) } })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return setState({ kind: "signin" });
        if (res.status === 403) return setState({ kind: "denied" });
        if (!res.ok) return setState({ kind: "error" });
        url = URL.createObjectURL(await res.blob());
        if (!cancelled) setState({ kind: "ok", url });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [path, token, invitationToken]);

  if (state.kind === "ok") return <img src={state.url} alt={alt} className={`${className} rounded-lg object-cover border border-border`} />;
  if (state.kind === "signin") {
    return (
      <div className={`${className} min-w-[8rem] flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-1.5 text-center text-[11px] leading-tight text-muted-foreground`} data-testid="boq-image-signin">
        <span>{t("images.signInRequired")}</span>
        <a href={authUrlWithReturn("/login", window.location.pathname + window.location.search)} className="inline-flex items-center gap-1 font-semibold text-[#FE3C01] underline-offset-2 hover:underline min-h-6">
          <LogIn className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />{t("images.signInAction")}
        </a>
      </div>
    );
  }
  if (state.kind === "denied" || state.kind === "error") {
    return (
      <div className={`${className} flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground`} title={t("images.accessDenied")} data-testid="boq-image-denied">
        <ImageOff className="h-4 w-4" aria-label={t("images.accessDenied")} />
      </div>
    );
  }
  return <div className={`${className} animate-pulse rounded-lg bg-muted`} aria-busy="true" />;
}
