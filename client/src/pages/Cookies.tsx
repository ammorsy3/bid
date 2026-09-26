import { Link } from "wouter";
import { BidLogo } from "@/components/brand/BidLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n } from "@/lib/i18n";

type K = string;
interface Item {
  names: string[];
  purpose: K;
  types: K[];
  by: K;
  kept: K;
}
interface Group {
  title: K;
  desc: K;
  items: Item[];
}

// Every name here is a real key the app writes (checked against the code and
// against what bidapp.sa sets for a first-time visitor). Keep it in step when
// adding a cookie or a localStorage/sessionStorage key.
const GROUPS: Group[] = [
  {
    title: "catEssential",
    desc: "catEssentialDesc",
    items: [
      { names: ["__client_uat", "__client_uat_…"], purpose: "itemClerkUat", types: ["typeCookie"], by: "byClerk", kept: "keptYear" },
      { names: ["__session"], purpose: "itemClerkSession", types: ["typeCookie"], by: "byClerk", kept: "keptMinute" },
      { names: ["__clerk_environment"], purpose: "itemClerkEnv", types: ["typeLocal"], by: "byClerk", kept: "keptUntilCleared" },
      { names: ["token", "auth-storage"], purpose: "itemToken", types: ["typeLocal"], by: "byBid", kept: "keptUntilSignOut" },
      { names: ["trustedBrowserToken"], purpose: "itemTrusted", types: ["typeLocal"], by: "byBid", kept: "kept7Days" },
      { names: ["otp_sent_by_login", "remember_browser"], purpose: "itemOtp", types: ["typeSession"], by: "byBid", kept: "keptTab" },
    ],
  },
  {
    title: "catPreferences",
    desc: "catPreferencesDesc",
    items: [
      { names: ["language"], purpose: "itemLanguage", types: ["typeLocal"], by: "byBid", kept: "keptUntilCleared" },
      { names: ["theme"], purpose: "itemTheme", types: ["typeLocal"], by: "byBid", kept: "keptUntilCleared" },
      { names: ["sidebar_state"], purpose: "itemSidebar", types: ["typeCookie"], by: "byBid", kept: "kept7Days" },
      { names: ["tender_sidebar_width", "dashboard-proposals-tab", "dashboard-vendors-tab"], purpose: "itemLayout", types: ["typeLocal"], by: "byBid", kept: "keptUntilCleared" },
      { names: ["just_signed_in", "desktop_recommendation_dismissed", "bid-guide-…"], purpose: "itemDismissed", types: ["typeSession", "typeLocal"], by: "byBid", kept: "keptUntilCleared" },
    ],
  },
  {
    title: "catDrafts",
    desc: "catDraftsDesc",
    items: [
      { names: ["tender_form_state", "tenderDraft", "onboarding-draft", "draft_…", "bid_brief_draft"], purpose: "itemDrafts", types: ["typeLocal", "typeSession"], by: "byBid", kept: "keptUntilDone" },
      { names: ["postLoginRedirect", "postOnboardingRedirect", "pendingJoinCode"], purpose: "itemRedirect", types: ["typeLocal"], by: "byBid", kept: "keptUntilUsed" },
    ],
  },
  {
    title: "catMeasurement",
    desc: "catMeasurementDesc",
    items: [
      { names: ["bid_attrib", "bid_visitor"], purpose: "itemAttribution", types: ["typeLocal"], by: "byBid", kept: "keptAttribution" },
      { names: ["Vercel Web Analytics", "Speed Insights"], purpose: "itemVercel", types: ["typeNothing"], by: "byVercel", kept: "keptNothing" },
    ],
  },
];

export default function Cookies() {
  const { t } = useI18n();
  const c = (k: string) => t(`cookiePolicy.${k}`);

  return (
    <div className="min-h-dvh bg-card">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-h-11 min-w-11 items-center" data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground active:opacity-60"
              data-testid="link-login"
            >
              {c("signIn")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-[15px] sm:text-sm leading-relaxed text-foreground">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-balance">{c("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{c("lastUpdated")}</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s1Title")}</h2>
            <p>{c("s1Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s2Title")}</h2>
            <ul className="list-disc ps-6 space-y-1">
              <li>{c("s2Li1")}</li>
              <li>{c("s2Li2")}</li>
              <li>{c("s2Li3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s3Title")}</h2>
            <p>{c("s3Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">{c("s4Title")}</h2>
            <div className="space-y-8">
              {GROUPS.map((g) => (
                <div key={g.title} data-testid={`cookie-group-${g.title}`}>
                  <h3 className="text-base font-semibold">{c(g.title)}</h3>
                  <p className="text-muted-foreground mt-1 mb-3">{c(g.desc)}</p>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {g.items.map((item) => (
                      <li key={item.purpose} className="rounded-xl border border-border bg-background p-4">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {item.names.map((n) => (
                            <code key={n} dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">
                              {n}
                            </code>
                          ))}
                        </div>
                        <p>{c(item.purpose)}</p>
                        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <dt className="font-medium">{c("labelType")}</dt>
                          <dd>{item.types.map((k) => c(k)).join(" · ")}</dd>
                          <dt className="font-medium">{c("labelSetBy")}</dt>
                          <dd>{c(item.by)}</dd>
                          <dt className="font-medium">{c("labelKept")}</dt>
                          <dd>{c(item.kept)}</dd>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s5Title")}</h2>
            <ul className="list-disc ps-6 space-y-1">
              <li>{c("s5Li1")}</li>
              <li>{c("s5Li2")}</li>
              <li>{c("s5Li3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s6Title")}</h2>
            <p>{c("s6Intro")}</p>
            <ul className="list-disc ps-6 mt-2 space-y-1">
              <li><strong>{c("s6Li1Strong")}</strong> {c("s6Li1")}</li>
              <li><strong>{c("s6Li2Strong")}</strong> {c("s6Li2")}</li>
              <li><strong>{c("s6Li3Strong")}</strong> {c("s6Li3")}</li>
            </ul>
            <p className="mt-3 text-muted-foreground">{c("s6Note")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s7Title")}</h2>
            <p>{c("s7Body")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{c("s8Title")}</h2>
            <p>
              {c("s8Pre")}{" "}
              <a href="mailto:info@bidapp.sa" dir="ltr" className="text-primary hover:underline">info@bidapp.sa</a>.
            </p>
          </section>
        </div>

        <nav className="mt-12 pt-4 border-t border-border flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-foreground" data-testid="link-privacy">
            {c("privacyLink")}
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-foreground" data-testid="link-terms">
            {c("termsLink")}
          </Link>
        </nav>
      </main>
    </div>
  );
}
