import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ArrowLeft, Moon, Sun, Search, Sparkles, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { groupedDocs } from "@/lib/docs-manifest";
import { LanguageSwitch } from "@/components/LanguageSwitch";
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
      // Shares the main app's "theme" key (not a separate "docs-theme") so a
      // preference set from either surface persists across both on reload.
      try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
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
  const { t, language } = useI18n();
  const sections = useMemo(() => groupedDocs(language), [language]);
  const user = useAuthStore((s) => s.user);
  const { dark, toggle } = useDarkToggle();

  // The phone drawer is lg:hidden; don't leave it open (and the page
  // scroll-locked) if the window grows to the desktop layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (mq.matches) setMobileOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  // Search box + section links: the desktop sidebar and the phone drawer.
  const renderNav = (inDrawer: boolean) => (
    <>
          {/* Search input — also focused by ⌘K */}
          <div className="mb-5">
            <div className="relative">
              <Search
                size={inDrawer ? 16 : 13}
                className={inDrawer ? "absolute start-3 top-1/2 -translate-y-1/2" : "absolute start-2.5 top-1/2 -translate-y-1/2"}
                style={{ color: "var(--docs-fg-faint)" }}
              />
              <input
                id={inDrawer ? "docs-drawer-search-input" : "docs-search-input"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("docs.filterPlaceholder")}
                aria-label={t("docs.filterAria")}
                enterKeyHint={inDrawer ? "search" : undefined}
                autoComplete={inDrawer ? "off" : undefined}
                className={inDrawer
                  ? "w-full h-11 ps-10 pe-3 text-base rounded-lg outline-none"
                  : "w-full ps-7 pe-2 py-1.5 text-[13px] rounded-md outline-none"}
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
                  className="text-[11px] font-semibold uppercase tracking-wider rtl:tracking-normal mb-2 px-2"
                  style={{ color: inDrawer ? "var(--docs-fg-muted)" : "var(--docs-fg-faint)" }}
                >
                  {section}
                </div>
                <ul
                  className="space-y-0.5"
                  style={{ borderInlineStart: "1px solid var(--docs-border)", paddingInlineStart: 0 }}
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
                {t("docs.noResults", { query })}
              </div>
            )}
          </nav>
    </>
  );

  return (
    <div className="docs-scope min-h-dvh">
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
              type="button"
              onClick={() => setMobileOpen(true)}
              className="docs-tap lg:hidden inline-flex items-center justify-center size-11 -ms-3 rounded-lg"
              style={{ color: "var(--docs-fg-muted)" }}
              aria-label={t("docs.openNav")}
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="flex items-center gap-2.5 min-w-11 min-h-11 lg:min-w-0 lg:min-h-0">
              <BidLogo variant="orange" size={24} />
              <span
                className="hidden sm:block text-[13px] font-medium ps-2.5 ms-1 truncate"
                style={{ color: "var(--docs-fg-faint)", borderInlineStart: "1px solid var(--docs-border)" }}
              >
                {t("docs.apiReference")}
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
              <span className="flex-1 text-start">{t("docs.searchDocs")}</span>
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded font-sans"
                style={{
                  background: "var(--docs-bg)",
                  border: "1px solid var(--docs-border)",
                  color: "var(--docs-fg-faint)",
                }}
              >
                <bdi dir="ltr">⌘K</bdi>
              </kbd>
            </button>
            <button
              type="button"
              className="docs-cta-ghost"
              onClick={() => document.getElementById("docs-search-input")?.focus()}
            >
              <Sparkles size={14} />
              {t("docs.askAi")}
            </button>
          </div>

          {/* Right: theme + dashboard */}
          <nav className="col-start-3 flex items-center gap-2 justify-end">
            <Link
              href="/docs/getting-started"
              className="hidden lg:inline text-[13px] font-medium"
              style={{ color: "var(--docs-fg-muted)" }}
            >
              {t("docs.support")}
            </Link>
            <LanguageSwitch className="hidden sm:inline-flex" />
            <Link href={user ? "/dashboard" : "/login"} className="docs-cta-primary min-h-11 lg:min-h-0">
              {user ? (
                <>
                  <ArrowLeft size={14} className="rtl:-scale-x-100" />
                  {t("docs.dashboard")}
                </>
              ) : (
                <>
                  {t("docs.logIn")}
                  <Zap size={13} />
                </>
              )}
            </Link>
            <button
              onClick={toggle}
              className="docs-tap inline-flex items-center justify-center size-11 -me-3 p-2 rounded-md lg:size-auto lg:me-0"
              style={{ color: "var(--docs-fg-muted)" }}
              aria-label={t("docs.toggleTheme")}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 py-8">
          {renderNav(false)}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-10 lg:py-14">{children}</main>

        {/* Right TOC */}
        <aside className="hidden xl:block w-56 shrink-0 py-14">
          <div className="sticky top-20">{rightPanel}</div>
        </aside>
      </div>

      {/* Phone / tablet navigation: a drawer from the start edge (right in Arabic) */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 lg:hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            className="docs-scope docs-drawer fixed inset-y-0 start-0 z-50 flex w-[85vw] max-w-80 flex-col pt-[env(safe-area-inset-top)] shadow-2xl outline-none lg:hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=closed]:duration-200 rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right"
            style={{ borderInlineEnd: "1px solid var(--docs-border)" }}
          >
            <div
              className="flex items-center justify-between h-14 shrink-0 px-4"
              style={{ borderBottom: "1px solid var(--docs-border)" }}
            >
              <Dialog.Title className="flex items-center gap-2.5 text-[13px] font-medium" style={{ color: "var(--docs-fg-muted)" }}>
                <BidLogo variant="orange" size={24} />
                {t("docs.apiReference")}
              </Dialog.Title>
              <Dialog.Close
                className="docs-tap inline-flex items-center justify-center size-11 -me-3 rounded-lg"
                style={{ color: "var(--docs-fg-muted)" }}
                aria-label={t("docs.closeNav")}
              >
                <X size={20} />
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mb-4 sm:hidden -ms-1">
                <LanguageSwitch />
              </div>
              {renderNav(true)}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
