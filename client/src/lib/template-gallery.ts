// The creation gallery's data (RFQ brief §3, AC1). Built-in templates are
// entries in BUILT_IN_TEMPLATES: adding a template means adding an entry here,
// with its copy keys and starting configuration — the page renders whatever
// the registry and the user's saved templates contain.

import { FileText, PencilRuler, Sheet, Bookmark, type LucideIcon } from "lucide-react";
import { CARD_LIBRARY, createFormCard } from "@/lib/form-builder-types";
import type { TemplateConfig } from "@/lib/request-template";

export type Journey = "simple" | "rfq" | "custom";

export interface GalleryBadge { key: string; tone: "accent" | "neutral" }

export interface TemplateStart { config: TemplateConfig; cards: unknown[] | null; to: string }

/** One card in the gallery, already translated. */
export interface GalleryEntry {
  id: string;
  title: string;
  description: string;
  badges: GalleryBadge[];
  icon: LucideIcon;
  journey: Journey;
  saved: boolean;
  start: () => TemplateStart;
}

export interface BuiltInTemplate {
  id: string;
  titleKey: string;
  descriptionKey: string;
  badges: GalleryBadge[];
  icon: LucideIcon;
  journey: Journey;
  /** Shown only while structured pricing (STRUCTURED_PRICING_ENABLED) is on. */
  requiresStructuredPricing?: boolean;
  start: () => TemplateStart;
}

// The Simple RFP and RFQ templates start from the standard card set.
const STANDARD_TYPES = ["project-description", "project-dates", "budget", "key-deliverables", "submission-deadline", "evaluation-criteria", "attachments"];
export const standardCards = () =>
  [...CARD_LIBRARY.required, ...CARD_LIBRARY.standard.filter((c) => STANDARD_TYPES.includes(c.type))].map((def) => createFormCard(def));

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "bid-simple",
    titleKey: "gallery.simpleTitle",
    descriptionKey: "gallery.simpleDescription",
    badges: [{ key: "gallery.badgeRecommended", tone: "accent" }],
    icon: FileText,
    journey: "simple",
    start: () => ({ config: { templateId: "bid-simple", requestType: "rfp", itemizedPricing: false }, cards: standardCards(), to: "/tenders/new/title" }),
  },
  {
    id: "bid-rfq",
    titleKey: "gallery.rfqTitle",
    descriptionKey: "gallery.rfqDescription",
    badges: [{ key: "gallery.badgeItemized", tone: "accent" }],
    icon: Sheet,
    journey: "rfq",
    requiresStructuredPricing: true,
    // P7: itemized_only is the RFQ default (prices only, no documents).
    start: () => ({ config: { templateId: "bid-rfq", requestType: "rfq", itemizedPricing: true, submissionType: "itemized_only" }, cards: standardCards(), to: "/tenders/new/title" }),
  },
  {
    id: "custom",
    titleKey: "gallery.customTitle",
    descriptionKey: "gallery.customDescription",
    badges: [{ key: "gallery.badgeCustom", tone: "neutral" }],
    icon: PencilRuler,
    journey: "custom",
    start: () => ({ config: { templateId: "custom", requestType: "rfp", itemizedPricing: false }, cards: null, to: "/tenders/new/form-builder" }),
  },
];

export interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  cards: { id: string; type: string; label: string; isRequired: boolean; value?: unknown }[];
  requestType?: "rfp" | "rfq" | null;
  itemizedPricing?: boolean | null;
  isPublic: boolean;
  createdAt: string;
}

type Translate = (key: string) => string;

export function builtInEntries(t: Translate, rfqAvailable: boolean): GalleryEntry[] {
  return BUILT_IN_TEMPLATES
    .filter((b) => rfqAvailable || !b.requiresStructuredPricing)
    .map((b) => ({ id: b.id, title: t(b.titleKey), description: t(b.descriptionKey), badges: b.badges, icon: b.icon, journey: b.journey, saved: false, start: b.start }));
}

export function savedEntries(templates: SavedTemplate[], t: Translate, rfqAvailable: boolean): GalleryEntry[] {
  return templates
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
        saved: true,
        start: () => ({
          config: { templateId: tmpl.id, requestType: rfq ? "rfq" : "rfp", itemizedPricing: rfq && rfqAvailable, ...(rfq ? { submissionType: "itemized_only" } : {}) },
          cards: tmpl.cards.map((card) => ({ ...card, value: card.value !== undefined ? card.value : null })),
          to: "/tenders/new/form-builder",
        }),
      };
    });
}

/** The gallery shows search once it holds this many entries. */
export const SEARCH_THRESHOLD = 8;

/**
 * Text for matching: case and width folded (NFKC), Arabic diacritics and
 * tatweel removed, alef/yaa/taa-marbuta variants unified, so "إنشاء" finds
 * "انشاء" and "Maintenance" finds "maintenance".
 */
export function normalizeSearch(s: string): string {
  return s
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** Entries whose title, description or badges contain every word of the query. */
export function filterEntries(entries: GalleryEntry[], query: string, t: Translate): GalleryEntry[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return entries;
  return entries.filter((e) => {
    const hay = normalizeSearch([e.title, e.description, ...e.badges.map((b) => t(b.key))].join(" "));
    return words.every((w) => hay.includes(w));
  });
}
