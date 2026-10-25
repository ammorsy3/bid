// One template gallery (RFQ brief §3, AC1): Bid Simple RFP, RFQ, the user's
// saved templates and Create Your Own, each with its purpose, an explicit
// "Use This Template" action and a journey preview (§8). Choosing a card
// establishes the starting configuration and moves on — no second selection
// screen. A choice that would replace entered information asks first.

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { ArrowLeft, Check, FileText, LayoutGrid, Loader2, PencilRuler, Play, Sheet, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BidLogo } from "@/components/brand/BidLogo";
import { useLocation } from "wouter";
import { useWizardNav } from "@/lib/wizard-nav";
import { getQueryFn } from "@/lib/queryClient";
import { CARD_LIBRARY, createFormCard } from "@/lib/form-builder-types";
import { useI18n } from "@/lib/i18n";
import { useStructuredPricing } from "@/lib/structured-pricing";
import { currentTemplateId, hasDraftContent, startDraft, type TemplateConfig } from "@/lib/request-template";

interface TemplateCard {
  id: string;
  type: string;
  label: string;
  isRequired: boolean;
  placeholder?: string;
  options?: string[];
  value?: any;
}

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  cards: TemplateCard[];
  requestType?: "rfp" | "rfq" | null;
  itemizedPricing?: boolean | null;
  isPublic: boolean;
  createdAt: string;
}

type Journey = "simple" | "rfq" | "custom";

interface GalleryEntry {
  id: string;
  title: string;
  description: string;
  badges: { key: string; tone: "accent" | "neutral" }[];
  icon: React.ComponentType<{ className?: string }>;
  journey: Journey;
  /** Where the choice leads and what it starts with. */
  start: () => { config: TemplateConfig; cards: unknown[] | null; to: string };
}

// The Simple RFP and RFQ templates start from the standard card set.
const STANDARD_TYPES = ["project-description", "project-dates", "budget", "key-deliverables", "submission-deadline", "evaluation-criteria", "attachments"];
const standardCards = () =>
  [...CARD_LIBRARY.required, ...CARD_LIBRARY.standard.filter((c) => STANDARD_TYPES.includes(c.type))].map((def) => createFormCard(def));

const HOVER_DELAY_MS = 1000;

function JourneyPreview({ journey, open, id }: { journey: Journey; open: boolean; id: string }) {
  const { t } = useI18n();
  const steps = [1, 2, 3].map((n) => t(`preview.${journey}Step${n}`));
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={`absolute inset-0 flex items-center justify-center rounded-xl bg-[#FFF6F2] dark:bg-muted px-4 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      data-testid={`journey-${journey}`}
      data-open={open ? "true" : "false"}
    >
      <ol className="w-full space-y-2">
        {steps.map((label, i) => (
          <li
            key={i}
            style={{ transitionDelay: open ? `${150 + i * 220}ms` : "0ms" }}
            className={`flex items-center gap-3 rounded-lg bg-white/90 dark:bg-card px-3 py-2 text-sm font-medium text-gray-900 dark:text-foreground shadow-sm transition-all duration-300 motion-reduce:transition-none motion-reduce:translate-x-0 motion-reduce:opacity-100 ${open ? "opacity-100 translate-x-0" : "opacity-0 ltr:-translate-x-2 rtl:translate-x-2"}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FE3C01] text-xs font-bold text-white">{i + 1}</span>
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
      className="group flex flex-col rounded-2xl border-2 border-border bg-white dark:bg-card p-5 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-[#FE3C01]/60 hover:shadow-lg focus-within:border-[#FE3C01]/60"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") { clear(); timer.current = window.setTimeout(() => setPreview(true), HOVER_DELAY_MS); } }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") { clear(); setPreview(false); } }}
      data-testid={`gallery-card-${entry.id}`}
    >
      {/* Fixed-height stage: the preview overlays the icon, so nothing shifts. */}
      <div className="relative mb-4 h-36 rounded-xl bg-[#F7F7F7] dark:bg-muted">
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none ${preview ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
          <Icon className="h-14 w-14 text-[#FE3C01]" />
        </div>
        <JourneyPreview journey={entry.journey} open={preview} id={previewId} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-2 min-h-6">
        {entry.badges.map((b) => (
          <span
            key={b.key}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${b.tone === "accent" ? "bg-[#FE3C01]/10 text-[#C42E00] dark:text-[#FF8A66]" : "bg-gray-100 text-gray-700 dark:bg-muted dark:text-muted-foreground"}`}
          >
            {t(b.key)}
          </span>
        ))}
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-foreground break-words">{entry.title}</h2>
      <p className="mt-1 mb-5 text-sm text-gray-600 dark:text-gray-400 break-words">{entry.description}</p>

      <div className="mt-auto flex flex-col gap-2">
        <Button
          type="button"
          className="min-h-11 bg-[#FE3C01] hover:bg-[#D44D3A] text-white"
          onClick={() => onUse(entry)}
          aria-label={`${t("gallery.useTemplate")}: ${entry.title}`}
          data-testid={`gallery-use-${entry.id}`}
        >
          {t("gallery.useTemplate")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 text-gray-700 dark:text-gray-300"
          aria-expanded={preview}
          aria-controls={previewId}
          onClick={() => { clear(); setPreview((p) => !p); }}
          data-testid={`gallery-preview-${entry.id}`}
        >
          <Play className="h-4 w-4 me-2 rtl:rotate-180" aria-hidden="true" />
          {t("preview.action")}
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

  const { data: savedTemplates, isLoading } = useQuery<SavedTemplate[]>({
    queryKey: ["/api/templates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const builtIn: GalleryEntry[] = [
    {
      id: "bid-simple",
      title: t("gallery.simpleTitle"),
      description: t("gallery.simpleDescription"),
      badges: [{ key: "gallery.badgeRecommended", tone: "accent" }],
      icon: FileText,
      journey: "simple",
      start: () => ({ config: { templateId: "bid-simple", requestType: "rfp", itemizedPricing: false }, cards: standardCards(), to: "/tenders/new/title" }),
    },
    ...(rfqAvailable ? [{
      id: "bid-rfq",
      title: t("gallery.rfqTitle"),
      description: t("gallery.rfqDescription"),
      badges: [{ key: "gallery.badgeItemized", tone: "accent" as const }],
      icon: Sheet,
      journey: "rfq" as const,
      // P7: itemized_only is the RFQ default (prices only, no documents).
      start: () => ({ config: { templateId: "bid-rfq", requestType: "rfq" as const, itemizedPricing: true, submissionType: "itemized_only" }, cards: standardCards(), to: "/tenders/new/title" }),
    }] : []),
    {
      id: "custom",
      title: t("gallery.customTitle"),
      description: t("gallery.customDescription"),
      badges: [{ key: "gallery.badgeCustom", tone: "neutral" }],
      icon: PencilRuler,
      journey: "custom",
      start: () => ({ config: { templateId: "custom", requestType: "rfp", itemizedPricing: false }, cards: null, to: "/tenders/new/form-builder" }),
    },
  ];

  const saved: GalleryEntry[] = (savedTemplates ?? [])
    // A saved RFQ template needs structured pricing switched on.
    .filter((tmpl) => rfqAvailable || tmpl.requestType !== "rfq")
    .map((tmpl) => {
      const rfq = tmpl.requestType === "rfq";
      // A saved template is itemized when it carries a bill of quantities.
      const itemized = rfq || tmpl.itemizedPricing === true || tmpl.cards.some((c) => c.type === "bill-of-quantities");
      return {
        id: tmpl.id,
        title: tmpl.name,
        description: tmpl.description || t("tenderFlow.yourSavedTemplate"),
        badges: [{ key: "gallery.badgeSaved", tone: "neutral" as const }, ...(itemized && rfqAvailable ? [{ key: "gallery.badgeItemized", tone: "accent" as const }] : [])],
        icon: Bookmark,
        journey: rfq ? ("rfq" as const) : ("custom" as const),
        start: () => ({
          config: { templateId: tmpl.id, requestType: rfq ? "rfq" : "rfp", itemizedPricing: rfq && rfqAvailable, ...(rfq ? { submissionType: "itemized_only" } : {}) },
          cards: tmpl.cards.map((card) => ({ ...card, value: card.value !== undefined ? card.value : null })),
          to: "/tenders/new/form-builder",
        }),
      };
    });

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
      className="min-h-[100dvh] py-8 px-4 bg-gray-50 dark:bg-background"
      style={{ backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`, backgroundSize: "20px 20px" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10 max-sm:mb-6">
          <BidLogo variant="orange" size={64} className="cursor-pointer hover:opacity-80 transition-opacity max-sm:!text-[40px]" onClick={() => navigate("/dashboard")} />
          <Button type="button" variant="outline" className="min-h-11" onClick={() => goBack("/tenders/new")} data-testid="button-cancel">
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" aria-hidden="true" />
            {t("tenderFlow.back")}
          </Button>
        </div>

        <header className="text-center mb-10 max-sm:mb-6">
          <h1 className="font-display font-black text-5xl max-sm:text-3xl text-gray-900 dark:text-foreground leading-[0.95] tracking-[-0.045em] mb-3">
            {t("gallery.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-sm:text-base max-w-2xl mx-auto">{t("gallery.subtitle")}</p>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("gallery.title")} data-testid="gallery-builtin">
          {builtIn.map((entry) => <GalleryCard key={entry.id} entry={entry} onUse={use} />)}
        </ul>

        {(isLoading || saved.length > 0) && (
          <section className="mt-10" aria-labelledby="gallery-saved-heading">
            <h2 id="gallery-saved-heading" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
              <LayoutGrid className="h-5 w-5 text-[#FE3C01]" aria-hidden="true" />
              {t("gallery.savedTemplates")}
            </h2>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#FE3C01]" aria-label={t("common.loading")} /></div>
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="gallery-saved">
                {saved.map((entry) => <GalleryCard key={entry.id} entry={entry} onUse={use} />)}
              </ul>
            )}
          </section>
        )}
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
