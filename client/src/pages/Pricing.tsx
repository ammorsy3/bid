import { useState } from "react";
import { Link } from "wouter";
import "./landing.css";
import "./pricing.css";
import { BidLogo } from "@/components/brand/BidLogo";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { SUPPORT_WHATSAPP_URL } from "@/components/support-contact";
import { SiteFooter } from "@/components/site-footer";
import {
  Infinity as InfinityIcon,
  Users,
  Sparkles,
  LayoutTemplate,
  MessageCircleQuestion,
  Link2,
  Layers,
  GitCompare,
  BarChart3,
  Plug,
  ShieldCheck,
  LifeBuoy,
  GraduationCap,
  Store,
  Check,
  type LucideIcon,
} from "lucide-react";

type Lang = "en" | "ar";
type Billing = "monthly" | "yearly";

/* The riyal is pegged at 3.75 to the dollar, so the USD line is a fixed
   display conversion. There is no FX handling anywhere. Billing charges SAR. */
const USD_PEG = 3.75;
const usd = (sar: number) => Math.round(sar / USD_PEG);

/* Billing terms. The headline price is always the effective monthly rate so
   the three plans stay comparable across terms; the billed total is shown
   underneath. Longer commitment, bigger discount. */
type Term = { id: Billing; months: number; discount: number };
const TERMS: Term[] = [
  { id: "monthly", months: 1, discount: 0 },
  { id: "yearly", months: 12, discount: 0.2 },
];

const rateFor = (base: number, term: Term) => Math.round(base * (1 - term.discount));
const billedFor = (base: number, term: Term) => rateFor(base, term) * term.months;
const savedFor = (base: number, term: Term) => base * term.months - billedFor(base, term);

type PlanId = "pro" | "business" | "enterprise";

/* `base` is the undiscounted monthly rate in SAR; every term derives from it. */
const PLANS: {
  id: PlanId;
  base: number | null;
  featured?: boolean;
}[] = [
  { id: "pro", base: 79 },
  { id: "business", base: 179, featured: true },
  { id: "enterprise", base: null },
];

/* Per-feature icons. `soon` marks a feature that is priced into the plan but
   not shipped yet; it renders a "Coming soon" pill. */
type Feat = { key: string; Icon: LucideIcon; soon?: boolean };
/* Feature lists describe the tendering workflow across the three tiers. Wording
   stays role-neutral where it can; the free tier below covers everything that
   sits outside a paid plan. */
const FEATURES: Record<PlanId, Feat[]> = {
  pro: [
    { key: "fUnlimitedTenders", Icon: InfinityIcon },
    { key: "fMarketplace", Icon: Store },
    { key: "fVendorBase", Icon: Users },
    { key: "fAiBuilder", Icon: Sparkles },
    { key: "fTemplates", Icon: LayoutTemplate },
    { key: "fQa", Icon: MessageCircleQuestion },
    { key: "fTraction", Icon: Link2 },
  ],
  business: [
    { key: "fEverythingPro", Icon: Layers },
    { key: "fAnalyser", Icon: Sparkles },
    { key: "fCompare", Icon: GitCompare },
    { key: "fAnalytics", Icon: BarChart3, soon: true },
    { key: "fApi", Icon: Plug },
  ],
  enterprise: [
    { key: "fEverythingBiz", Icon: Layers },
    { key: "fSso", Icon: ShieldCheck },
    { key: "fSla", Icon: LifeBuoy },
    { key: "fOnboarding", Icon: GraduationCap },
  ],
};

const FAQ_KEYS = ["q1", "q8", "q3", "q4", "q5", "q6"] as const;

const copy = {
  en: {
    navAbout: "About Bid",
    navMarketplace: "Marketplace",
    navPricing: "Pricing",
    btnSignIn: "Sign in",
    btnCreateAccount: "Create an Account →",
    btnDashboard: "Dashboard",

    heroTitle1: "Flexible pricing",
    heroTitle2: "that fits you.",
    heroSub:
      "Everything the sourcing workflow needs, from the first brief to the signed award. Bidding is always free.",

    billMonthly: "Monthly",
    billYearly: "Yearly",
    termNoteMonthly: "",
    termNoteYearly: "Save 20%",

    perUserMo: "per user / month",
    billedMonthly: "billed monthly",
    billedYearly: "billed yearly",
    youSave: "You save",
    perYear: "a year",
    popular: "Most popular",
    soon: "Coming soon",

    proName: "Pro",
    proTagline: "For teams working on tenders regularly, with AI handling the first draft.",
    proCta: "Start with Pro",

    bizName: "Business",
    bizTagline: "For teams that want the full evaluation and analytics layer, not just the basics.",
    bizCta: "Start with Business",

    entName: "Enterprise",
    entTagline: "For organisations that need control, compliance and scale.",
    entPrice: "Custom",
    entPriceSub: "Priced to your volume and terms.",
    entCta: "Contact sales",

    fUnlimitedTenders: "Unlimited tenders and RFPs",
    fVendorBase: "A private company network",
    fAiBuilder: "AI writes your tender from a brief",
    fTemplates: "Reusable templates",
    fQa: "Structured Q&A rounds",
    fTraction: "Traction Link for inbound connections",
    fEverythingPro: "Everything in Pro",
    fAnalyser: "AI scores and ranks every proposal",
    fCompare: "Side-by-side proposal comparison",
    fAnalytics: "Analytics across every tender",
    fApi: "API access and integrations",
    fMarketplace: "Access to the marketplace",
    fEverythingBiz: "Everything in Business",
    fSso: "Single sign-on (SSO) and detailed access controls",
    fSla: "A dedicated contact with guaranteed response times",
    fOnboarding: "We set your team up and train them",

    freeName: "Free",
    freeSub: "No card, no time limit. Use it for as long as you need.",
    freeCta: "Start free",
    freeReqTenders: "Up to 3 published tenders",
    freeReqPrivate: "Invite-only private tenders",
    freeReqSeat: "One seat",
    freeVenProposals: "Around 10 proposals a month",
    freeVenProfile: "A free company profile",

    faqTitle: "FAQ",
    faqSub: "The common questions, answered.",
    faqContactPre: "Still have a question?",
    faqContactLink: "Talk to us",
    q1: "Can a vendor submit a proposal without paying?",
    a1: "Yes. Bidding on Bid is free. The free plan covers around 10 proposals a month, and there is no subscription in the way of submitting one.",
    q3: "Is the free plan time-limited?",
    a3: "No. There is no countdown. The free plan is limited by usage, not by time, and stays available for as long as you need.",
    q8: "What's the difference between private tenders and the marketplace?",
    a8: "A private tender goes only to the vendors you invite by link. Publishing to the marketplace puts it in front of vendors you have not met yet, which is where most new suppliers come from. The free plan covers private tenders; marketplace publishing starts on Pro.",
    q4: "Do you charge per user?",
    a4: "Yes, per user per month. Your whole team works from one workspace, so you only pay for the seats you use.",
    q5: "Which currency am I billed in?",
    a5: "Saudi riyals. The dollar figures here are a fixed reference conversion, since the riyal is pegged to the dollar.",
    q6: "Can I change or cancel my plan?",
    a6: "Any time. Upgrades apply immediately and are prorated; downgrades take effect at the end of the current billing period.",

    ctaTitle: "Better sourcing starts here.",
    ctaSub: "Three tenders, no card required. Upgrade the day Bid pays for itself.",
    ctaMockTitle: "New tender published",
    ctaMockChip: "8 proposals",
    ctaBtn: "Create an account →",
  },
  ar: {
    navAbout: "عن Bid",
    navMarketplace: "السوق",
    navPricing: "الأسعار",
    btnSignIn: "تسجيل الدخول",
    btnCreateAccount: "إنشاء حساب ←",
    btnDashboard: "لوحة التحكم",

    heroTitle1: "أسعار مرنة",
    heroTitle2: "تناسبك.",
    heroSub:
      "كل ما تحتاجه عملية التوريد، من أول بريف إلى الترسية. التقديم مجاني دائماً.",

    billMonthly: "شهري",
    billYearly: "سنوي",
    termNoteMonthly: "",
    termNoteYearly: "وفّر ٢٠٪",

    perUserMo: "لكل مستخدم / شهرياً",
    billedMonthly: "تُحصّل شهرياً",
    billedYearly: "تُحصّل سنوياً",
    youSave: "توفّر",
    perYear: "في السنة",

    popular: "الأكثر اختياراً",
    soon: "قريباً",

    proName: "برو",
    proTagline: "للفرق التي تعمل على المناقصات بانتظام، مع ذكاء اصطناعي يتولّى المسودة الأولى.",
    proCta: "ابدأ مع برو",

    bizName: "بزنس",
    bizTagline: "للفرق التي تريد طبقة التقييم والتحليلات كاملةً، لا الأساسيات فقط.",
    bizCta: "ابدأ مع بزنس",

    entName: "إنتربرايز",
    entTagline: "للمؤسسات التي تحتاج التحكّم والامتثال والتوسّع.",
    entPrice: "حسب الطلب",
    entPriceSub: "بسعرٍ يناسب حجمك وشروطك.",
    entCta: "تواصل مع المبيعات",

    fUnlimitedTenders: "مناقصات وطلبات عروض غير محدودة",
    fVendorBase: "شبكة شركات خاصة",
    fAiBuilder: "الذكاء الاصطناعي يكتب مناقصتك من بريف",
    fTemplates: "قوالب قابلة لإعادة الاستخدام",
    fQa: "جولات أسئلة وأجوبة منظّمة",
    fTraction: "رابط انضمام للتواصل الوارد",
    fEverythingPro: "كل ما في برو",
    fAnalyser: "الذكاء الاصطناعي يقيّم العروض ويرتّبها",
    fCompare: "مقارنة العروض جنباً إلى جنب",
    fAnalytics: "تحليلات تشمل كل المناقصات",
    fApi: "الوصول إلى الواجهة البرمجية والتكاملات",
    fMarketplace: "الوصول إلى السوق",
    fEverythingBiz: "كل ما في بزنس",
    fSso: "تسجيل دخول موحّد (SSO) وضبط دقيق للصلاحيات",
    fSla: "مسؤول تواصل مخصّص بأوقات استجابة مضمونة",
    fOnboarding: "نُجهّز فريقك وندرّبه",

    freeName: "مجاني",
    freeSub: "بدون بطاقة، وبدون حدّ زمني. استخدمها ما دمت تحتاجها.",
    freeCta: "ابدأ مجاناً",
    freeReqTenders: "حتى ٣ مناقصات منشورة",
    freeReqPrivate: "مناقصات خاصة بالدعوة فقط",
    freeReqSeat: "مستخدم واحد",
    freeVenProposals: "نحو ١٠ عروض شهرياً",
    freeVenProfile: "ملف شركة مجاني",

    faqTitle: "الأسئلة الشائعة",
    faqSub: "الأسئلة الشائعة، بإجابات واضحة.",
    faqContactPre: "ما زال لديك سؤال؟",
    faqContactLink: "تواصل معنا",
    q1: "هل يستطيع المورّد تقديم عرض دون دفع؟",
    a1: "نعم. التقديم على Bid مجاني. الباقة المجانية تغطي نحو ١٠ عروض شهرياً، ولا يوجد اشتراك يقف بينك وبين تقديم عرض.",
    q3: "هل الباقة المجانية محدودة بمدة؟",
    a3: "لا. لا يوجد عدّاد تنازلي. الباقة المجانية محدودة بالاستخدام لا بالمدة، وتبقى متاحة لك ما دمت تحتاجها.",
    q8: "ما الفرق بين المناقصات الخاصة والسوق؟",
    a8: "المناقصة الخاصة تصل فقط للمورّدين الذين تدعوهم برابط. أما النشر في السوق فيضع مناقصتك أمام مورّدين لم تلتقِ بهم بعد، وهو مصدر معظم المورّدين الجدد. الباقة المجانية تغطي المناقصات الخاصة، والنشر في السوق يبدأ من باقة برو.",
    q4: "هل السعر لكل مستخدم؟",
    a4: "نعم، لكل مستخدم شهرياً. فريقك كله يعمل في مساحة عمل واحدة، فلا تدفع إلا مقابل المقاعد التي تستخدمها.",
    q5: "بأي عملة تتم الفوترة؟",
    a5: "بالريال السعودي. المبالغ بالدولار هنا تحويل مرجعي ثابت، لأن الريال مربوط بالدولار.",
    q6: "هل يمكنني تغيير باقتي أو إلغاؤها؟",
    a6: "في أي وقت. الترقية تُطبّق فوراً وتُحتسب بالتناسب، والتخفيض يسري في نهاية دورة الفوترة الحالية.",

    ctaTitle: "توريد أفضل يبدأ من هنا.",
    ctaSub: "٣ مناقصات، بدون بطاقة. ارتقِ يوم تُغطّي Bid تكلفتها.",
    ctaMockTitle: "مناقصة جديدة منشورة",
    ctaMockChip: "٨ عروض",
    ctaBtn: "أنشئ حساباً ←",
  },
};

const Pricing = () => {
  // Mirrors Landing.tsx: the app-wide language, so this page and the signup
  // flow it feeds into always speak the same language.
  const { language: lang, setLanguage } = useI18n();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();

  const c = copy[lang];
  const isRtl = lang === "ar";

  const toggleLang = () => setLanguage(lang === "en" ? "ar" : "en");

  const featLabel = (key: string) => (c as Record<string, string>)[key] ?? key;

  const termCopy = (t: Term) => {
    if (t.id === "monthly") return { label: c.billMonthly, note: c.termNoteMonthly, billed: c.billedMonthly };
    return { label: c.billYearly, note: c.termNoteYearly, billed: c.billedYearly };
  };

  const planCopy = (id: PlanId) => {
    if (id === "pro") return { name: c.proName, tagline: c.proTagline, cta: c.proCta };
    if (id === "business") return { name: c.bizName, tagline: c.bizTagline, cta: c.bizCta };
    return { name: c.entName, tagline: c.entTagline, cta: c.entCta };
  };

  const faqPair = (k: (typeof FAQ_KEYS)[number]) => {
    const answers: Record<string, string> = {
      q1: c.a1,
      q3: c.a3,
      q4: c.a4,
      q5: c.a5,
      q6: c.a6,
      q8: c.a8,
    };
    return { q: c[k], a: answers[k] };
  };

  return (
    <div
      style={{ background: "var(--cream)" }}
      dir={isRtl ? "rtl" : "ltr"}
      className={`landing-page surface-cream${isRtl ? " landing-rtl" : ""}`}
    >
      <div className="page">
        {/* ===== TOPBAR ===== */}
        <div className="topbar">
          <Link href="/" style={{ textDecoration: "none" }} data-testid="link-home">
            <BidLogo variant="orange" size={28} />
          </Link>

          <nav className="topbar-nav-desktop">
            <Link href="/">{c.navAbout}</Link>
            <Link href="/marketplace">{c.navMarketplace}</Link>
            <Link href="/pricing">{c.navPricing}</Link>
          </nav>

          <div className="topbar-right">
            <button className="lang-toggle" onClick={toggleLang} aria-label="Switch language">
              {lang === "en" ? "AR" : "EN"}
            </button>

            <div className="topbar-auth-desktop">
              {user?.otpVerified ? (
                <Link href="/dashboard">
                  <button className="btn btn-primary">{c.btnDashboard}</button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <button className="btn btn-ghost">{c.btnSignIn}</button>
                  </Link>
                  <Link href="/signup">
                    <button className="btn btn-primary" data-testid="button-signup">
                      <span className="arrow">{c.btnCreateAccount}</span>
                    </button>
                  </Link>
                </>
              )}
            </div>

            <button
              className="hamburger"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu" dir={isRtl ? "rtl" : "ltr"}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              {c.navAbout}
            </Link>
            <Link href="/marketplace" onClick={() => setMobileMenuOpen(false)}>
              {c.navMarketplace}
            </Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
              {c.navPricing}
            </Link>
            <div className="mobile-menu-btns">
              {user?.otpVerified ? (
                <Link href="/dashboard">
                  <button className="btn btn-primary" style={{ width: "100%" }}>
                    {c.btnDashboard}
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <button className="btn btn-ghost" style={{ width: "100%" }}>
                      {c.btnSignIn}
                    </button>
                  </Link>
                  <Link href="/signup">
                    <button className="btn btn-primary" style={{ width: "100%" }}>
                      {c.btnCreateAccount}
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===== HERO ===== */}
        <section className="pricing-hero">
          <h1>
            {c.heroTitle1} <span className="o">{c.heroTitle2}</span>
          </h1>
          <p>{c.heroSub}</p>

          <div className="billing-toggle" role="group" aria-label={c.billMonthly}>
            {TERMS.map((t) => {
              const tc = termCopy(t);
              const active = billing === t.id;
              return (
                <button
                  key={t.id}
                  className={active ? "active" : ""}
                  onClick={() => setBilling(t.id)}
                  aria-pressed={active}
                  data-testid={`toggle-${t.id}`}
                >
                  <span className="term-label">{tc.label}</span>
                  {tc.note && <span className="term-note">{tc.note}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== THE THREE BOXES ===== */}
        <div className="plan-grid">
          {PLANS.map((plan) => {
            const pc = planCopy(plan.id);
            const isEnterprise = plan.id === "enterprise";
            const term = TERMS.find((t) => t.id === billing)!;
            const rate = plan.base === null ? null : rateFor(plan.base, term);
            const billed = plan.base === null ? null : billedFor(plan.base, term);
            const saved = plan.base === null ? 0 : savedFor(plan.base, term);

            return (
              <div
                key={plan.id}
                className={`plan${plan.featured ? " featured" : ""}`}
                data-testid={`plan-${plan.id}`}
              >
                {plan.featured && <span className="plan-badge">{c.popular}</span>}

                <div className="plan-name">{pc.name}</div>
                <div className="plan-tagline">{pc.tagline}</div>

                {isEnterprise ? (
                  <>
                    <div className="plan-price-row">
                      <span className="plan-price">{c.entPrice}</span>
                    </div>
                    <div className="plan-usd">{c.entPriceSub}</div>
                  </>
                ) : (
                  <>
                    <div className="plan-price-row">
                      <span className="plan-price">
                        <span dir="ltr">SAR {(rate as number).toLocaleString("en-US")}</span>
                      </span>
                      <span className="plan-period">{c.perUserMo}</span>
                    </div>
                    <div className="plan-usd">
                      <span dir="ltr">≈ ${usd(rate as number)}</span>
                      {" · "}
                      {/* On monthly the billed total equals the rate, so repeating
                          it just reads as a stutter. */}
                      {term.months > 1 && (
                        <>
                          <span dir="ltr">SAR {(billed as number).toLocaleString("en-US")}</span>{" "}
                        </>
                      )}
                      {termCopy(term).billed}
                    </div>
                    {saved > 0 && (
                      <div className="plan-save">
                        {c.youSave} <span dir="ltr">SAR {saved.toLocaleString("en-US")}</span>{" "}
                        {c.perYear}
                      </div>
                    )}
                  </>
                )}

                {isEnterprise ? (
                  <a
                    href={SUPPORT_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    data-testid="link-enterprise-sales"
                  >
                    {pc.cta}
                  </a>
                ) : (
                  <Link href="/signup">
                    <button className={`btn ${plan.featured ? "btn-orange" : "btn-primary"}`}>
                      {pc.cta}
                    </button>
                  </Link>
                )}

                <div className="plan-feat-list">
                  {FEATURES[plan.id].map((f) => (
                    <div className="plan-feat" key={f.key}>
                      <f.Icon className="feat-icon" aria-hidden="true" />
                      <span>
                        {featLabel(f.key)}
                        {f.soon && <span className="soon">{c.soon}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Free stays OUT of the three boxes on purpose. A fourth box would
            reintroduce the "no" the three-box technique exists to remove. It
            gets a slim strip instead, which still carries the real terms. */}
        <div className="free-strip">
          <div className="free-strip-head">
            <div className="free-strip-title">
              <span className="free-strip-name">{c.freeName}</span>
              <span className="free-strip-sub">{c.freeSub}</span>
            </div>
            <Link href="/signup" data-testid="link-free">
              <button className="btn btn-orange free-strip-btn">{c.freeCta}</button>
            </Link>
          </div>

          <ul className="free-list">
            {[
              c.freeReqTenders,
              c.freeReqPrivate,
              c.freeReqSeat,
              c.freeVenProposals,
              c.freeVenProfile,
            ].map((item) => (
              <li key={item}>
                <Check className="feat-icon" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ===== FAQ ===== */}
        <section className="pricing-section">
          <h2>{c.faqTitle}</h2>
          <p className="sub">{c.faqSub}</p>
          <div className="pricing-faq">
            {FAQ_KEYS.map((k) => {
              const { q, a } = faqPair(k);
              return (
                <details key={k}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              );
            })}
          </div>
          <p className="faq-contact">
            {c.faqContactPre}{" "}
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-faq-whatsapp"
            >
              {c.faqContactLink}
            </a>
          </p>
        </section>

        {/* ===== CLOSING CTA ===== */}
        <section className="cta--split">
          <div className="cta-split-text">
            <h2>{c.ctaTitle}</h2>
            <p>{c.ctaSub}</p>
            <Link href="/signup">
              <button className="cta-btn" data-testid="button-cta-signup">
                {c.ctaBtn}
              </button>
            </Link>
          </div>
          <div className="cta-split-panel">
            <div className="cta-fx" aria-hidden="true" />
            <div className="cta-mock" aria-hidden="true">
              <div className="cta-mock-top">
                <span className="cta-mock-dot" />
                <span className="cta-mock-title">{c.ctaMockTitle}</span>
              </div>
              <span className="cta-mock-bar w-85" />
              <span className="cta-mock-bar w-60" />
              <span className="cta-mock-bar w-70" />
              <div className="cta-mock-foot">
                <span className="cta-mock-chip">{c.ctaMockChip}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter lang={lang} />
    </div>
  );
};

export default Pricing;
