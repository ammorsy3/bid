// "On this page" TOC. Extracts H2 headings from raw markdown, slugifies them
// the same way rehype-slug does (github-style) so the anchors match the IDs
// rehype-slug puts on the rendered headings. Tracks the active section using
// IntersectionObserver against the rendered article.
import { useEffect, useMemo, useState } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

interface TocEntry { id: string; text: string; }

export function DocsTOC({ markdown }: { markdown: string }) {
  const entries = useMemo<TocEntry[]>(() => {
    const out: TocEntry[] = [];
    // Strip code fences first so '## ' inside code isn't picked up.
    const stripped = markdown.replace(/```[\s\S]*?```/g, "");
    const re = /^##\s+(.+?)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      const text = m[1].replace(/[*_`]/g, "");
      out.push({ id: slugify(text), text });
    }
    return out;
  }, [markdown]);

  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);

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

  return (
    <div className="text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--docs-fg-muted)] mb-2 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2.5 4h11M2.5 8h11M2.5 12h7" strokeLinecap="round" />
        </svg>
        On this page
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
