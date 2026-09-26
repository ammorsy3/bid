// Single source of truth for the public API docs site. Adding a new page
// means: drop a markdown file in docs/integrations/, then add one entry here.
// The sidebar nav and routing both read from this manifest.

// Vite's `?raw` import returns the file contents as a string at build time.
import gettingStarted from "../../../docs/integrations/getting-started.md?raw";
import authentication from "../../../docs/integrations/authentication.md?raw";
import webhook from "../../../docs/integrations/webhook.md?raw";
import mcp from "../../../docs/integrations/mcp.md?raw";
import rateLimits from "../../../docs/integrations/rate-limits.md?raw";

// Arabic translations (docs/integrations/ar/). Prose is translated; code blocks
// are identical to the English.
import gettingStartedAr from "../../../docs/integrations/ar/getting-started.md?raw";
import authenticationAr from "../../../docs/integrations/ar/authentication.md?raw";
import webhookAr from "../../../docs/integrations/ar/webhook.md?raw";
import mcpAr from "../../../docs/integrations/ar/mcp.md?raw";
import rateLimitsAr from "../../../docs/integrations/ar/rate-limits.md?raw";

export type DocLang = "en" | "ar";

interface DocText {
  title: string;
  section: string;
  /** Short blurb shown under the title. */
  blurb?: string;
  source: string;
}

export interface DocEntry extends DocText {
  slug: string;
  ar: DocText;
}

/** One doc in one language, flattened for the pages that render it. */
export type LocalizedDoc = DocText & { slug: string };

export function localizeDoc(d: DocEntry, lang: DocLang): LocalizedDoc {
  const text = lang === "ar" ? d.ar : d;
  return { slug: d.slug, title: text.title, section: text.section, blurb: text.blurb, source: text.source };
}

export const DOCS: DocEntry[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    section: "Introduction",
    blurb: "From zero to a working integration in 15 minutes.",
    source: gettingStarted,
    ar: {
      title: "البدء السريع",
      section: "مقدمة",
      blurb: "من الصفر إلى تكامل يعمل خلال 15 دقيقة.",
      source: gettingStartedAr,
    },
  },
  {
    slug: "authentication",
    title: "Authentication",
    section: "Reference",
    blurb: "API keys, scopes, and rotation.",
    source: authentication,
    ar: {
      title: "المصادقة",
      section: "المرجع",
      blurb: "مفاتيح API والصلاحيات وتدويرها.",
      source: authenticationAr,
    },
  },
  {
    slug: "webhook",
    title: "Webhook API",
    section: "Reference",
    blurb: "n8n, Make.com, custom chatbots.",
    source: webhook,
    ar: {
      title: "واجهة Webhook",
      section: "المرجع",
      blurb: "n8n وMake.com وروبوتات المحادثة المخصصة.",
      source: webhookAr,
    },
  },
  {
    slug: "mcp",
    title: "MCP Server",
    section: "Reference",
    blurb: "Claude Desktop, Cursor, AI clients.",
    source: mcp,
    ar: {
      title: "خادم MCP",
      section: "المرجع",
      blurb: "Claude Desktop وCursor وعملاء الذكاء الاصطناعي.",
      source: mcpAr,
    },
  },
  {
    slug: "rate-limits",
    title: "Rate limits & errors",
    section: "Reference",
    blurb: "Limits, error codes, idempotency.",
    source: rateLimits,
    ar: {
      title: "حدود الاستخدام والأخطاء",
      section: "المرجع",
      blurb: "الحدود ورموز الأخطاء وتكرار الطلبات بأمان.",
      source: rateLimitsAr,
    },
  },
];

export const DEFAULT_DOC_SLUG = "getting-started";

export function findDoc(slug: string | undefined): DocEntry | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function groupedDocs(lang: DocLang): { section: string; entries: LocalizedDoc[] }[] {
  const order: string[] = [];
  const map = new Map<string, LocalizedDoc[]>();
  for (const d of DOCS) {
    const doc = localizeDoc(d, lang);
    if (!map.has(doc.section)) {
      map.set(doc.section, []);
      order.push(doc.section);
    }
    map.get(doc.section)!.push(doc);
  }
  return order.map((section) => ({ section, entries: map.get(section)! }));
}
