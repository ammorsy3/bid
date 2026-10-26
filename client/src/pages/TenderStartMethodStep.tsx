// One template gallery (RFQ brief §3, AC1): Bid Simple RFP, RFQ, Create Your
// Own and the user's saved templates, each with its purpose, an explicit
// "Use This Template" action and a journey preview (§8). The entries come from
// the registry in lib/template-gallery.ts. Choosing a card establishes the
// starting configuration and moves on — no second selection screen. A choice
// that would replace entered information asks first.

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { ArrowLeft, Check, Loader2, Play, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BidLogo } from "@/components/brand/BidLogo";
import { useLocation } from "wouter";
import { useWizardNav } from "@/lib/wizard-nav";
import { getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useStructuredPricing } from "@/lib/structured-pricing";
import { currentTemplateId, hasDraftContent, startDraft } from "@/lib/request-template";
import { SEARCH_THRESHOLD, builtInEntries, filterEntries, savedEntries, type GalleryEntry, type Journey, type SavedTemplate } from "@/lib/template-gallery";

const HOVER_DELAY_MS = 1000;

// 1 column on phones, 2 on tablets (≥ 640 px), 3 on laptops (≥ 1024 px), 4 on wide desktops (≥ 1400 px).
const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-4";

/** Overlays the card body (never adds height): the three steps of the journey. */
function JourneyPreview({ journey, open, id }: { journey: Journey; open: boolean; id: string }) {
  const { t } = useI18n();
  const steps = [1, 2, 3].map((n) => t(`preview.${journey}Step${n}`));
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`absolute inset-0 flex items-center rounded-lg bg-[#FFF6F2] dark:bg-muted px-2.5 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      data-testid={`journey-${journey}`}
      data-open={open ? "true" : "false"}
    >
      <ol className="w-full space-y-1.5">
        {steps.map((label, i) => (
          <li
            key={i}
            style={{ transitionDelay: open ? `${150 + i * 220}ms` : "0ms" }}
            className={`flex items-center gap-2 rounded-md bg-white/90 dark:bg-card px-2 py-1.5 text-xs font-medium leading-snug text-gray-900 dark:text-foreground shadow-sm transition-all duration-300 motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:opacity-100 ${open ? "opacity-100 translate-x-0" : "opacity-0 ltr:-translate-x-2 rtl:translate-x-2"}`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FE3C01] text-[11px] font-bold text-white">{i + 1}</span>
            <span className="min-w-0">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GalleryCard({ entry, onUse }: { entry: GalleryEntry; onUse: (entry: GalleryEntry) => void }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState(false);
  const timer = useRef<number | null>(null);
  const clear = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => clear, []);
  const previewId = `journey-preview-${entry.id}`;
  const Icon = entry.icon;

  return (
    <li
      className="flex flex-col rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[#FE3C01]/60 hover:shadow-md focus-within:border-[#FE3C01]/60"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") { clear(); timer.current = window.setTimeout(() => setPreview(true), HOVER_DELAY_MS); } }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") { clear(); setPreview(false); } }}
      data-testid={`gallery-card-${entry.id}`}
    >
      {/* The preview overlays this body, so opening it never changes the card's size. */}
      <div className="relative flex-1 min-h-[6.75rem]" data-testid={`gallery-body-${entry.id}`}>
        <div className={`transition-opacity duration-200 motion-reduce:transition-none ${preview ? "opacity-0" : "opacity-100"}`} aria-hidden={preview}>
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FE3C01]/10" aria-hidden="true">
              <Icon className="h-[18px] w-[18px] text-[#FE3C01]" />
            </span>
            <div className="flex min-w-0 flex-wrap gap-1 pt-1">
              {entry.badges.map((b) => (
                <span
                  key={b.key}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ${b.tone === "accent" ? "bg-[#FE3C01]/10 text-[#C42E00] dark:text-[#FF8A66]" : "bg-gray-100 text-gray-700 dark:bg-muted dark:text-muted-foreground"}`}
                >
                  {t(b.key)}
                </span>
              ))}
            </div>
          </div>
          <h3 className="mt-3 text-base font-bold leading-snug text-gray-900 dark:text-foreground break-words">{entry.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400 break-words line-clamp-3">{entry.description}</p>
        </div>
        <JourneyPreview journey={entry.journey} open={preview} id={previewId} />
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          className="min-h-11 flex-1 bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
          onClick={() => onUse(entry)}
          aria-label={`${t("gallery.useTemplate")}: ${entry.title}`}
          data-testid={`gallery-use-${entry.id}`}
        >
          {t("gallery.useTemplate")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-11 shrink-0 p-0 text-gray-700 dark:text-gray-300"
          aria-label={`${t("preview.action")}: ${entry.title}`}
          title={t("preview.action")}
          aria-expanded={preview}
          aria-controls={previewId}
          onClick={() => { clear(); setPreview((p) => !p); }}
          data-testid={`gallery-preview-${entry.id}`}
        >
          <Play className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export default function TenderStartMethodStep() {
  const [, navigate] = useLocation();
  const { goNext, goBack } = useWizardNav();
  const { theme } = useTheme();
  const { t } = useI18n();
  const rfqAvailable = useStructuredPricing();
  const [pending, setPending] = useState<GalleryEntry | null>(null);

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | "builtin" | "saved">("all");
  const searchId = useId();

  const { data: savedTemplates, isLoading } = useQuery<SavedTemplate[]>({
    queryKey: ["/api/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const builtIn = builtInEntries(t, rfqAvailable);
  const saved = savedEntries(savedTemplates ?? [], t, rfqAvailable);
  const searchable = builtIn.length + saved.length >= SEARCH_THRESHOLD;
  const q = searchable ? query : "";
  // One continuous grid: built-ins first, then saved templates.
  const shown = filterEntries(group === "builtin" ? builtIn : group === "saved" ? saved : [...builtIn, ...saved], q, t);

  const proceed = (entry: GalleryEntry) => {
    const { config, cards, to } = entry.start();
    startDraft(config, cards);
    setPending(null);
    goNext(to);
  };

  const use = (entry: GalleryEntry) => {
    // Same template as the draft already uses: keep the draft and continue.
    if (currentTemplateId() === entry.id) return goNext(entry.start().to);
    if (hasDraftContent()) return setPending(entry);
    proceed(entry);
  };

  const dotColor = theme === "dark" ? "rgba(244, 237, 225, 0.10)" : "rgba(138, 128, 120, 0.22)";

  return (
    <div
      className="min-h-[100dvh] py-6 px-4 bg-gray-50 dark:bg-background"
      style={{ backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`, backgroundSize: "20px 20px" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 max-sm:mb-4">
          <BidLogo variant="orange" size={64} className="cursor-pointer hover:opacity-80 transition-opacity max-sm:!text-[40px]" onClick={() => navigate("/dashboard")} />
          <Button type="button" variant="outline" className="min-h-11" onClick={() => goBack("/tenders/new")} data-testid="button-cancel">
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" aria-hidden="true" />
            {t("tenderFlow.back")}
          </Button>
        </div>

        <header className="text-center mb-6 max-sm:mb-5">
          <h1 className="font-display font-black text-4xl max-sm:text-[28px] text-gray-900 dark:text-foreground leading-tight tracking-[-0.03em] mb-2">
            {t("gallery.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl mx-auto">{t("gallery.subtitle")}</p>
        </header>

        {searchable && (
          <div className="mx-auto mb-5 max-w-md" role="search">
            <label htmlFor={searchId} className="sr-only">{t("gallery.searchLabel")}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("gallery.searchLabel")}
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-input bg-white dark:bg-card ps-9 pe-11 text-base text-gray-900 dark:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01] [&::-webkit-search-cancel-button]:hidden"
                data-testid="gallery-search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("gallery.clearSearch")}
                  className="absolute end-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01]"
                  data-testid="gallery-search-clear"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="sr-only" role="status" aria-live="polite">{q.trim() ? t("gallery.resultCount", { count: shown.length }) : ""}</p>
          </div>
        )}

        {saved.length > 0 && (
          <div className="mb-4 flex flex-wrap justify-center gap-2" role="group" aria-label={t("gallery.filterLabel")} data-testid="gallery-filters">
            {([["all", t("gallery.filterAll"), builtIn.length + saved.length], ["builtin", t("gallery.filterBuiltIn"), builtIn.length], ["saved", t("gallery.savedTemplates"), saved.length]] as const).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                aria-pressed={group === key}
                onClick={() => setGroup(key)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE3C01] ${group === key ? "border-[#FE3C01] bg-[#FE3C01]/10 text-[#C42E00] dark:text-[#FF8A66]" : "border-border bg-white dark:bg-card text-gray-700 dark:text-gray-300 hover:border-[#FE3C01]/60"}`}
                data-testid={`gallery-filter-${key}`}
              >
                {label} <span className="text-xs opacity-70">({n})</span>
              </button>
            ))}
          </div>
        )}

        <section aria-label={t("gallery.title")} data-testid="gallery">
          {shown.length > 0 && (
            <ul className={GRID} data-testid="gallery-list">
              {shown.map((entry) => <GalleryCard key={entry.id} entry={entry} onUse={use} />)}
            </ul>
          )}

          {isLoading && group !== "builtin" && (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#FE3C01]" aria-label={t("common.loading")} /></div>
          )}

          {shown.length === 0 && !isLoading && q.trim() && (
            <div className="py-10 text-center" data-testid="gallery-no-results">
              <p className="text-gray-700 dark:text-gray-300 break-words">{t("gallery.noResults").replace("{query}", () => q.trim())}</p>
              <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => setQuery("")}>{t("gallery.clearSearch")}</Button>
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="gallery-change-warning">
          <DialogHeader>
            <DialogTitle>{t("gallery.changeTemplate")}</DialogTitle>
            <DialogDescription>{t("gallery.changeWarning")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" className="min-h-11" onClick={() => setPending(null)} data-testid="gallery-keep-editing">
              {t("gallery.keepEditing")}
            </Button>
            <Button className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white" onClick={() => pending && proceed(pending)} data-testid="gallery-confirm-change">
              <Check className="h-4 w-4 me-2" aria-hidden="true" />
              {t("gallery.changeTemplate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
