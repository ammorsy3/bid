import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Menu, X, ArrowLeft, Moon, Sun, Search, Sparkles, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { groupedDocs } from "@/lib/docs-manifest";
import { BidLogo } from "@/components/brand/BidLogo";
function useDarkToggle() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      try { localStorage.setItem("docs-theme", next ? "dark" : "light"); } catch {}
      return next;
    });
  };
  return { dark, toggle };
}

export function DocsLayout({
  children,
  activeSlug,
  rightPanel,
}: {
  children: ReactNode;
  activeSlug?: string;
  rightPanel?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sections = groupedDocs();
  const user = useAuthStore((s) => s.user);
  const { dark, toggle } = useDarkToggle();

  const filteredSections = useMemo(() => {
    if (!query.trim()) return sections;
    const q = query.toLowerCase();
    return sections
      .map((s) => ({
        ...s,
        entries: s.entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.blurb ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.entries.length > 0);
  }, [sections, query]);

  // Cmd/Ctrl+K focuses the sidebar search input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById("docs-search-input") as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="docs-scope min-h-screen">
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{
          background: "color-mix(in srgb, var(--docs-bg) 85%, transparent)",
          borderBottom: "1px solid var(--docs-border)",
        }}
      >
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8 grid grid-cols-[1fr_auto_1fr] items-center h-14 gap-4">
          {/* Left: logo + section label */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-1.5 -ml-1 rounded-md"
              style={{ color: "var(--docs-fg-muted)" }}
              aria-label="Toggle nav"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <BidLogo size={24} />
              <span
                className="hidden sm:block text-[13px] font-medium pl-2.5 ml-1 truncate"
                style={{ color: "var(--docs-fg-faint)", borderLeft: "1px solid var(--docs-border)" }}
              >
                API reference
              </span>
            </Link>
          </div>

          {/* Center: search button */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              className="docs-search-btn"
              onClick={() => document.getElementById("docs-search-input")?.focus()}
            >
              <Search size={14} />
              <span className="flex-1 text-left">Search docs…</span>
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded font-sans"
                style={{
                  background: "var(--docs-bg)",
                  border: "1px solid var(--docs-border)",
                  color: "var(--docs-fg-faint)",
                }}
              >
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              className="docs-cta-ghost"
              onClick={() => document.getElementById("docs-search-input")?.focus()}
            >
              <Sparkles size={14} />
              Ask AI
            </button>
          </div>

          {/* Right: theme + dashboard */}
          <nav className="flex items-center gap-2 justify-end">
            <Link
              href="/docs/getting-started"
              className="hidden lg:inline text-[13px] font-medium"
              style={{ color: "var(--docs-fg-muted)" }}
            >
              Support
            </Link>
            <Link href={user ? "/dashboard" : "/login"} className="docs-cta-primary">
              {user ? (
                <>
                  <ArrowLeft size={14} />
                  Dashboard
                </>
              ) : (
                <>
                  Log in
                  <Zap size={13} />
                </>
              )}
            </Link>
            <button
              onClick={toggle}
              className="p-2 rounded-md"
              style={{ color: "var(--docs-fg-muted)" }}
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8 flex gap-12">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-60 shrink-0 py-8",
            "lg:block",
            mobileOpen
              ? "fixed inset-0 top-14 z-30 p-6 overflow-y-auto"
              : "hidden",
          )}
          style={mobileOpen ? { background: "var(--docs-bg)" } : undefined}
        >
          {/* Search input — also focused by ⌘K */}
          <div className="mb-5">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--docs-fg-faint)" }}
              />
              <input
                id="docs-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="w-full pl-7 pr-2 py-1.5 text-[13px] rounded-md outline-none"
                style={{
                  background: "var(--docs-bg-subtle)",
                  border: "1px solid var(--docs-border)",
                  color: "var(--docs-fg)",
                }}
              />
            </div>
          </div>

          <nav className="space-y-6">
            {filteredSections.map(({ section, entries }) => (
              <div key={section}>
                <div
                  className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-2"
                  style={{ color: "var(--docs-fg-faint)" }}
                >
                  {section}
                </div>
                <ul
                  className="space-y-0.5"
                  style={{ borderLeft: "1px solid var(--docs-border)", paddingLeft: 0 }}
                >
                  {entries.map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        href={`/docs/${entry.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="docs-nav-link"
                        data-active={entry.slug === activeSlug ? "true" : "false"}
                      >
                        {entry.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {filteredSections.length === 0 && (
              <div className="text-[13px] px-2" style={{ color: "var(--docs-fg-faint)" }}>
                No results for "{query}".
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-10 lg:py-14">{children}</main>

        {/* Right TOC */}
        <aside className="hidden xl:block w-56 shrink-0 py-14">
          <div className="sticky top-20">{rightPanel}</div>
        </aside>
      </div>
    </div>
  );
}
