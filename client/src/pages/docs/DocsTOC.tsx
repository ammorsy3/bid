// "On this page" TOC. Extracts H2 headings from raw markdown, slugifies them
// the same way rehype-slug does (github-style) so the anchors match the IDs
// rehype-slug puts on the rendered headings. Tracks the active section using
// IntersectionObserver against the rendered article.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { slugifyHeading } from "@/lib/docs-slug";

interface TocEntry { id: string; text: string; }

// "rail": the desktop right-hand column. "collapsible": phones and tablets,
// a one-line bar above the article that opens into the list when tapped.
export function DocsTOC({ markdown, variant = "rail" }: { markdown: string; variant?: "rail" | "collapsible" }) {
  const { t } = useI18n();
  const entries = useMemo<TocEntry[]>(() => {
    const out: TocEntry[] = [];
    // Strip code fences first so '## ' inside code isn't picked up.
    const stripped = markdown.replace(/```[\s\S]*?```/g, "");
    const re = /^##\s+(.+?)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      const text = m[1].replace(/[*_`]/g, "");
      out.push({ id: slugifyHeading(text), text });
    }
    return out;
  }, [markdown]);

  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (entries.length === 0) return;
    const observers: IntersectionObserver[] = [];
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (records) => {
        records.forEach((r) => {
          if (r.isIntersecting) visible.add(r.target.id);
          else visible.delete(r.target.id);
        });
        // Pick the first entry (in document order) that's currently visible.
        const firstVisible = entries.find((e) => visible.has(e.id));
        if (firstVisible) setActiveId(firstVisible.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    entries.forEach((e) => {
      const el = document.getElementById(e.id);
      if (el) observer.observe(el);
    });
    observers.push(observer);

    return () => observers.forEach((o) => o.disconnect());
  }, [entries]);

  if (entries.length === 0) return null;

  if (variant === "collapsible") {
    return (
      <div className="docs-toc-collapsible rounded-xl" style={{ border: "1px solid var(--docs-border)" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="docs-toc-collapsible-list"
          className="docs-tap flex w-full items-center gap-2 min-h-11 px-3.5 rounded-xl text-sm font-medium"
          style={{ color: "var(--docs-fg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--docs-fg-muted)" }}>
            <path d="M2.5 4h11M2.5 8h11M2.5 12h7" strokeLinecap="round" />
          </svg>
          {t("docs.onThisPage")}
          <ChevronDown
            size={16}
            className={`ms-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            style={{ color: "var(--docs-fg-muted)" }}
          />
        </button>
        {open && (
          <nav id="docs-toc-collapsible-list" className="px-3.5 pb-2">
            {entries.map((e) => (
              <a
                key={e.id}
                href={`#${e.id}`}
                onClick={() => setOpen(false)}
                className="docs-toc-link"
                data-active={activeId === e.id ? "true" : "false"}
              >
                {e.text}
              </a>
            ))}
          </nav>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide rtl:tracking-normal text-[var(--docs-fg-muted)] mb-2 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2.5 4h11M2.5 8h11M2.5 12h7" strokeLinecap="round" />
        </svg>
        {t("docs.onThisPage")}
      </div>
      <nav className="space-y-0.5">
        {entries.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            className="docs-toc-link"
            data-active={activeId === e.id ? "true" : "false"}
          >
            {e.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
