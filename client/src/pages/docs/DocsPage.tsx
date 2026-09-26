import { useEffect, useMemo } from "react";
import { Link, useRoute } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { ChevronRight, ArrowRight, ArrowLeft } from "lucide-react";
import { DocsLayout } from "./DocsLayout";
import { CopyButton } from "./CopyButton";
import { DocsTOC } from "./DocsTOC";
import { MethodBadge, isHttpMethod } from "./MethodBadge";
import { DEFAULT_DOC_SLUG, DOCS, findDoc, localizeDoc } from "@/lib/docs-manifest";
import { useI18n } from "@/lib/i18n";
import "highlight.js/styles/github-dark.css";

function useDocTitle(title: string, suffix: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} — ${suffix}`;
    return () => { document.title = prev; };
  }, [title, suffix]);
}

function extractText(children: unknown): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in (children as any)) {
    return extractText((children as any).props?.children);
  }
  return "";
}

function extractLang(children: unknown): string | null {
  // ReactMarkdown passes <code class="language-bash">…</code> inside <pre>.
  if (children && typeof children === "object" && "props" in (children as any)) {
    const cls = (children as any).props?.className as string | undefined;
    const match = cls?.match(/language-([\w-]+)/);
    if (match) return match[1];
  }
  if (Array.isArray(children)) {
    for (const c of children) {
      const l = extractLang(c);
      if (l) return l;
    }
  }
  return null;
}

export default function DocsPage() {
  const [, params] = useRoute("/docs/:slug");
  const slug = params?.slug ?? DEFAULT_DOC_SLUG;
  const { t, language } = useI18n();
  const entry = findDoc(slug);
  const doc = useMemo(() => (entry ? localizeDoc(entry, language) : undefined), [entry, language]);

  useDocTitle(doc ? doc.title : t("docs.notFoundTitle"), t("docs.pageTitleSuffix"));

  const markdown = useMemo(() => doc?.source ?? "", [doc]);

  // Strip the first H1 from the source — we render it as the page title block instead.
  const bodyMarkdown = useMemo(() => {
    if (!markdown) return "";
    return markdown.replace(/^#\s+.+\n+/, "");
  }, [markdown]);

  // Prev / next from manifest order.
  const { prev, next } = useMemo(() => {
    const idx = DOCS.findIndex((d) => d.slug === slug);
    return {
      prev: idx > 0 ? localizeDoc(DOCS[idx - 1], language) : undefined,
      next: idx >= 0 && idx < DOCS.length - 1 ? localizeDoc(DOCS[idx + 1], language) : undefined,
    };
  }, [slug, language]);

  if (!doc) {
    return (
      <DocsLayout activeSlug={slug}>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-3">{t("docs.notFoundTitle")}</h1>
          <p className="mb-4" style={{ color: "var(--docs-fg-muted)" }}>
            {t("docs.notFoundBody")}{" "}
            <code dir="ltr">/docs/{slug}</code>.
          </p>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-1.5 font-medium"
            style={{ color: "var(--docs-primary)" }}
          >
            {t("docs.backToStart")} <ArrowRight size={14} className="rtl:-scale-x-100" />
          </Link>
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout activeSlug={slug} rightPanel={<DocsTOC markdown={markdown} />}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] mb-4" style={{ color: "var(--docs-fg-faint)" }}>
        <Link href="/docs" className="inline-flex items-center min-h-11 -my-3 px-2 -mx-2 lg:min-h-0 lg:m-0 lg:p-0" style={{ color: "var(--docs-fg-muted)" }}>{t("docs.docsCrumb")}</Link>
        <ChevronRight size={12} className="rtl:-scale-x-100" />
        <span style={{ color: "var(--docs-primary)" }}>{doc.section}</span>
      </div>

      {/* Title + description */}
      <header className="mb-10 pb-8" style={{ borderBottom: "1px solid var(--docs-border)" }}>
        <h1 className="text-[40px] leading-[1.1] font-bold tracking-tight mb-3" style={{ color: "var(--docs-fg)" }}>
          {doc.title}
        </h1>
        {doc.blurb && (
          <p className="text-[17px] leading-relaxed" style={{ color: "var(--docs-fg-muted)" }}>
            {doc.blurb}
          </p>
        )}
      </header>

      {/* Phones and tablets: the on-page contents, folded away until tapped */}
      <div className="xl:hidden -mt-4 mb-8">
        <DocsTOC markdown={markdown} variant="collapsible" />
      </div>

      <article className="docs-article max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "wrap" }],
            [rehypeHighlight, { ignoreMissing: true }],
          ]}
          components={{
            pre: ({ children }) => {
              const text = extractText(children);
              const lang = extractLang(children);
              return (
                <div className="docs-codeblock group" dir="ltr">
                  {lang && <span className="docs-codeblock-lang">{lang}</span>}
                  <pre>{children}</pre>
                  <CopyButton value={text} />
                </div>
              );
            },
            // Wide tables scroll sideways inside themselves, never the page.
            table: ({ children, node: _node, ...rest }) => (
              <div className="docs-table-wrap">
                <table {...rest}>{children}</table>
              </div>
            ),
            td: ({ children, ...rest }) => {
              const raw = extractText(children).trim();
              if (isHttpMethod(raw)) {
                return <td {...rest}><MethodBadge method={raw} /></td>;
              }
              return <td {...rest}>{children}</td>;
            },
            a: ({ href, children, node: _node, ...rest }) => {
              const isInternal = href?.startsWith("/");
              // Links to other docs pages stay in the app (no full page reload).
              if (isInternal && href) {
                return <Link href={href} {...rest}>{children}</Link>;
              }
              return (
                <a
                  href={href}
                  target={isInternal ? undefined : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  {...rest}
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {bodyMarkdown}
        </ReactMarkdown>
      </article>

      {/* Prev / Next */}
      {(prev || next) && (
        <div className="mt-16 pt-8 flex flex-col sm:flex-row gap-3" style={{ borderTop: "1px solid var(--docs-border)" }}>
          {prev ? (
            <Link href={`/docs/${prev.slug}`} className="docs-pager">
              <ArrowLeft size={16} className="rtl:-scale-x-100" style={{ color: "var(--docs-fg-faint)" }} />
              <div className="min-w-0">
                <div className="docs-pager-label">{t("docs.previous")}</div>
                <div className="docs-pager-title truncate">{prev.title}</div>
              </div>
            </Link>
          ) : <div className="flex-1" />}
          {next ? (
            <Link href={`/docs/${next.slug}`} className="docs-pager justify-end text-end">
              <div className="min-w-0">
                <div className="docs-pager-label">{t("docs.next")}</div>
                <div className="docs-pager-title truncate">{next.title}</div>
              </div>
              <ArrowRight size={16} className="rtl:-scale-x-100" style={{ color: "var(--docs-fg-faint)" }} />
            </Link>
          ) : <div className="flex-1" />}
        </div>
      )}
    </DocsLayout>
  );
}
