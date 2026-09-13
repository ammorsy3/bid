import { Link } from "wouter";
import "./site-footer.css";
import { BidLogo } from "@/components/brand/BidLogo";
import { SupportContactLinks } from "@/components/support-contact";

/**
 * The single marketing footer shared across the public pages (Landing, Pricing,
 * Marketplace). One source of truth for the brand line, nav columns, support
 * contacts, and the Saudi Tech badge, so a change lands everywhere at once.
 *
 * `lang` is passed explicitly because Landing and Pricing keep their own AR/EN
 * toggle outside the I18nProvider.
 */
type Lang = "en" | "ar";

const T: Record<Lang, Record<string, string>> = {
  en: {
    brand:
      "Bid turns messy sourcing into a clear workflow: create the RFP, invite the right vendors, and receive proposals in a unified format.",
    forRequesters: "For Requesters",
    forVendors: "For Vendors",
    company: "Company",
    support: "Support",
    rfp: "RFP Crafting",
    marketplace: "Marketplace",
    traction: "Traction Link",
    receiveBriefs: "Receive briefs",
    exploreTenders: "Explore tenders",
    connect: "Connect with clients",
    pricing: "Pricing",
    contact: "Contact",
    terms: "Terms",
    privacy: "Privacy",
    cookies: "Cookies",
    copy: `© ${new Date().getFullYear()} Bid, Sourcing Redefined.`,
  },
  ar: {
    brand:
      "Bid يرتّب لك رحلة التوريد: أنشئ طلب العروض، وادعُ الموردين المناسبين، واستقبل عروضهم بصيغة موحّدة.",
    forRequesters: "للمشترين",
    forVendors: "للموردين",
    company: "الشركة",
    support: "الدعم",
    rfp: "تجهيز طلب العروض",
    marketplace: "السوق",
    traction: "رابط الانضمام",
    receiveBriefs: "استلام البريفات",
    exploreTenders: "استكشف المناقصات",
    connect: "تواصل مع العملاء",
    pricing: "الأسعار",
    contact: "تواصل معنا",
    terms: "الشروط",
    privacy: "الخصوصية",
    cookies: "الكوكيز",
    copy: `© ${new Date().getFullYear()} Bid، التوريد بشكل جديد.`,
  },
};

export function SiteFooter({ lang = "en" }: { lang?: Lang }) {
  const t = T[lang];
  const isRtl = lang === "ar";

  return (
    <footer
      className={`site-footer${isRtl ? " site-footer--rtl" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="site-footer-inner">
        <div className="site-footer-row">
          <div className="site-footer-brand">
            <BidLogo variant="orange" size={32} />
            <p>{t.brand}</p>
          </div>

          <div className="site-footer-col">
            <h5>{t.forRequesters}</h5>
            {/* The section anchors live on the landing page; from other pages
                these navigate home and scroll to the section. */}
            <a href="/#rfp">{t.rfp}</a>
            <Link href="/marketplace">{t.marketplace}</Link>
            <a href="/#traction">{t.traction}</a>
          </div>

          <div className="site-footer-col">
            <h5>{t.forVendors}</h5>
            <a href="/#vendors">{t.receiveBriefs}</a>
            <Link href="/marketplace">{t.exploreTenders}</Link>
            <a href="/#vendors">{t.connect}</a>
          </div>

          <div className="site-footer-col">
            <h5>{t.company}</h5>
            <a href="mailto:hello@bid.sa">{t.contact}</a>
            <Link href="/terms">{t.terms}</Link>
            <Link href="/privacy">{t.privacy}</Link>
          </div>

          <div className="site-footer-col">
            <h5>{t.support}</h5>
            <SupportContactLinks lang={lang} className="site-footer-support" />
          </div>
        </div>

        <div className="site-footer-bot">
          <span>{t.copy}</span>
          <span className="site-footer-partner">
            <img src="/saudi-tech-logo.png" alt="Saudi Tech" />
          </span>
          <span>
            <Link href="/terms">{t.terms}</Link>
            {" · "}
            <Link href="/privacy">{t.privacy}</Link>
            {" · "}
            <a href="#">{t.cookies}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
