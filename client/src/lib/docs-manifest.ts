// Single source of truth for the public API docs site. Adding a new page
// means: drop a markdown file in docs/integrations/, then add one entry here.
// The sidebar nav and routing both read from this manifest.

// Vite's `?raw` import returns the file contents as a string at build time.
import gettingStarted from "../../../docs/integrations/getting-started.md?raw";
import authentication from "../../../docs/integrations/authentication.md?raw";
import webhook from "../../../docs/integrations/webhook.md?raw";
import mcp from "../../../docs/integrations/mcp.md?raw";
import rateLimits from "../../../docs/integrations/rate-limits.md?raw";

export interface DocEntry {
  slug: string;
  title: string;
  section: string;
  /** Short blurb shown in the sidebar under the title. */
  blurb?: string;
  source: string;
}

export const DOCS: DocEntry[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    section: "Introduction",
    blurb: "From zero to a working integration in 15 minutes.",
    source: gettingStarted,
  },
  {
    slug: "authentication",
    title: "Authentication",
    section: "Reference",
    blurb: "API keys, scopes, and rotation.",
    source: authentication,
  },
  {
    slug: "webhook",
    title: "Webhook API",
    section: "Reference",
    blurb: "n8n, Make.com, custom chatbots.",
    source: webhook,
  },
  {
    slug: "mcp",
    title: "MCP Server",
    section: "Reference",
    blurb: "Claude Desktop, Cursor, AI clients.",
    source: mcp,
  },
  {
    slug: "rate-limits",
    title: "Rate limits & errors",
    section: "Reference",
    blurb: "Limits, error codes, idempotency.",
    source: rateLimits,
  },
];

export const DEFAULT_DOC_SLUG = "getting-started";

export function findDoc(slug: string | undefined): DocEntry | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function groupedDocs(): { section: string; entries: DocEntry[] }[] {
  const order: string[] = [];
  const map = new Map<string, DocEntry[]>();
  for (const d of DOCS) {
    if (!map.has(d.section)) {
      map.set(d.section, []);
      order.push(d.section);
    }
    map.get(d.section)!.push(d);
  }
  return order.map((section) => ({ section, entries: map.get(section)! }));
}
