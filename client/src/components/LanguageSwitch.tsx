import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * AR/EN switch for screens without the app's navigation (sign-in, sign-up).
 * It names the other language in that language ("العربية" on English pages,
 * "English" on Arabic ones), so someone who can't read the current one still
 * finds it. The button is a 44px tap target around a smaller visible pill;
 * callers position it (e.g. `absolute top-2 end-2`, which mirrors in Arabic).
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  const other = language === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => setLanguage(other)}
      data-testid="button-language-switch"
      className={cn("group inline-flex min-h-11 items-center justify-center px-1 outline-none", className)}
    >
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span lang={other}>{t("common.otherLanguage")}</span>
      </span>
    </button>
  );
}
