// BID-UX-BUGFIX item 11: no LinkedIn on the homepage. The homepage footer renders
// SupportContactLinks with showLinkedIn={false}; every other caller keeps the default.
// Rendered to static markup in node (no DOM needed); the provider hook is stubbed.

import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import path from "path";

vi.mock("@/lib/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/i18n")>()),
  useI18n: () => ({ language: "en" }),
}));

import { SupportContactLinks, SUPPORT_LINKEDIN_URL, SUPPORT_INSTAGRAM_URL } from "@/components/support-contact";

const render = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(SupportContactLinks, props));

describe("SupportContactLinks social links", () => {
  it("by default shows phone, WhatsApp, Instagram and LinkedIn (other public footers are unchanged)", () => {
    const html = render({ lang: "en" });
    for (const id of ["link-support-phone", "link-support-whatsapp", "link-support-instagram", "link-support-linkedin"]) {
      expect(html).toContain(`data-testid="${id}"`);
    }
    expect(html).toContain(SUPPORT_LINKEDIN_URL);
  });

  it("showLinkedIn={false} drops only LinkedIn, in both languages", () => {
    for (const lang of ["en", "ar"]) {
      const html = render({ lang, showLinkedIn: false });
      expect(html).not.toContain("link-support-linkedin");
      expect(html).not.toContain(SUPPORT_LINKEDIN_URL);
      expect(html).not.toMatch(/linkedin/i);
      expect(html).toContain(SUPPORT_INSTAGRAM_URL);
      expect(html).toContain('data-testid="link-support-whatsapp"');
      expect(html).toContain('data-testid="link-support-phone"');
    }
  });

  it("showSocial={false} (dashboard support card) still shows neither social link", () => {
    const html = render({ lang: "en", showSocial: false });
    expect(html).not.toContain("link-support-instagram");
    expect(html).not.toContain("link-support-linkedin");
  });

  it("the homepage footer is the caller that hides LinkedIn", () => {
    const landing = readFileSync(path.join(__dirname, "..", "client", "src", "pages", "Landing.tsx"), "utf8");
    const calls = landing.match(/<SupportContactLinks\b[^>]*\/>/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("showLinkedIn={false}");
  });
});
