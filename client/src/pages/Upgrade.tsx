// /upgrade — the upgrade journey, outside Settings.
//
// People arrive here from the dashboard plan card, the upgrade dialog (when a
// limit stops them, with ?reason=<feature>), or the pricing page (with
// ?plan=&term=). It looks like /pricing on purpose (same cream page, plan boxes
// and free strip, from landing.css + pricing.css), marks the plan that unlocks
// what sent them here, and runs the same checkout as Settings once they pick.
// After paying, it says what's now unlocked and sends them back to where they were.

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Check, GitCompare, Infinity as InfinityIcon, Layers, LayoutTemplate, Link2, Loader2, Lock,
  MessageCircleQuestion, Plug, RotateCcw, ShieldCheck, Sparkles, Store, Users, type LucideIcon,
} from "lucide-react";
import "./landing.css";
import "./pricing.css";
import "./upgrade.css";
import { BidLogo } from "@/components/brand/BidLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutFlow } from "@/components/billing/CheckoutFlow";
import type { BillingSummary } from "@/components/billing/shared";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { usePlan } from "@/lib/usePlan";
import { clearReturnPath, takeReturnPath } from "@/lib/upgrade-return";
import { FEATURE_MIN_PLAN, isFeature, planAllows, type Feature } from "@shared/entitlements";
import { MONTHLY_PRICE, PAID_PLANS, monthlyRate, periodPrice, type BillingTerm, type PaidPlan } from "@shared/billing-plans";

type Reason = Feature | "tenders";
type Step = "pick" | "opening" | "details";

/** What each paid box lists, with the pricing page's icons. `reason` ties a row to ?reason=. */
const FEATURES: Record<PaidPlan, { key: string; Icon: LucideIcon; reason?: Reason }[]> = {
  pro: [
    { key: "upgrade.valUnlimitedTenders", Icon: InfinityIcon, reason: "tenders" },
    { key: "upgrade.feat_seats", Icon: Users, reason: "seats" },
    { key: "upgrade.row_marketplace", Icon: Store, reason: "marketplace" },
    { key: "upgrade.row_aiBuilder", Icon: Sparkles, reason: "aiBuilder" },
    { key: "upgrade.row_ownTemplates", Icon: LayoutTemplate, reason: "ownTemplates" },
    { key: "upgrade.row_qa", Icon: MessageCircleQuestion, reason: "qa" },
    { key: "upgrade.row_traction", Icon: Link2, reason: "traction" },
  ],
  business: [
    { key: "upgrade.everythingPro", Icon: Layers },
    { key: "upgrade.row_aiAnalysis", Icon: Sparkles, reason: "aiAnalysis" },
    { key: "upgrade.row_comparison", Icon: GitCompare, reason: "comparison" },
    { key: "upgrade.row_api", Icon: Plug, reason: "api" },
  ],
};

const FREE_ROWS = ["upgrade.free_tenders", "upgrade.free_seats", "upgrade.free_private", "upgrade.free_templates", "upgrade.free_contact"];
const UNLOCK_ROWS: Feature[] = ["seats", "marketplace", "aiBuilder", "ownTemplates", "qa", "traction", "aiAnalysis", "comparison", "api"];

/** SAR in Western digits, like the pricing page. */
const sar = (n: number) => <span dir="ltr">SAR {n.toLocaleString("en-US")}</span>;

export default function Upgrade() {
  const { t, isRtl, language, setLanguage } = useI18n();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { loaded, gated, tier, entitlements } = usePlan();

  const reasonParam = new URLSearchParams(window.location.search).get("reason");
  const reason: Reason | null = reasonParam === "tenders" ? "tenders" : isFeature(reasonParam) ? reasonParam : null;

  const [term, setTerm] = useState<BillingTerm>("monthly");
  const [request, setRequest] = useState<{ plan: PaidPlan; term: BillingTerm; key: number } | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const onStepChange = useCallback((s: Step) => {
    setStep(s);
    if (s === "details") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const queryKey = ["/api/billing", activeCompany?.id ?? "none"];
  const { data, refetch } = useQuery<BillingSummary>({
    queryKey,
    queryFn: async () => (await apiRequest("GET", "/api/billing")).json(),
    enabled: !!activeCompany?.id,
  });

  // Plans are for company workspaces; teams and individuals aren't gated.
  useEffect(() => {
    if (!user) setLocation("/login");
    else if (loaded && !gated) setLocation("/dashboard");
  }, [user, loaded, gated, setLocation]);

  if (!user || !activeCompany) return null;

  const goBack = () => {
    const to = takeReturnPath();
    clearReturnPath();
    setLocation(to);
  };

  const live = !!data?.subscription?.live;
  const canManage = !!data?.canManage;
  const recommended: PaidPlan = reason && reason !== "tenders" && FEATURE_MIN_PLAN[reason] === "business" ? "business" : "pro";
  const planName = (p: PaidPlan | "free") => t(p === "business" ? "billing.planBusiness" : p === "pro" ? "billing.planPro" : "billing.planFree");
  const showCards = !!data && !live && step !== "details";

  return (
    <div
      className={`upgrade-page surface-cream${isRtl ? " landing-rtl" : ""}`}
      style={{ background: "var(--cream)" }}
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="upgrade-page"
    >
      {/* Top: bar, headline, what sent them here, billing switch */}
      <div className="landing-page pricing-page">
        <div className="page">
          <div className="topbar">
            <Link href="/dashboard" style={{ textDecoration: "none" }} data-testid="link-dashboard">
              <BidLogo variant="orange" size={28} />
            </Link>
            <div className="topbar-right">
              <button className="lang-toggle" onClick={() => setLanguage(language === "en" ? "ar" : "en")} aria-label="Language">
                {language === "en" ? "AR" : "EN"}
              </button>
              <button className="btn btn-ghost upgrade-back" onClick={goBack} data-testid="button-upgrade-back">
                <ArrowLeft aria-hidden="true" />
                {t("common.back")}
              </button>
            </div>
          </div>

          {live && data?.subscription ? (
            <div className="upgrade-unlocked" data-testid="upgrade-unlocked">
              <h1>{t("upgrade.unlockedTitle", { plan: planName(data.subscription.plan) })}</h1>
              <p>{t("upgrade.unlockedDesc")}</p>
              <ul>
                <li><Check aria-hidden="true" />{t("upgrade.valUnlimitedTenders")}</li>
                {UNLOCK_ROWS.filter((r) => (entitlements ? entitlements.features[r] : planAllows(data.subscription!.plan, r))).map((r) => (
                  <li key={r}><Check aria-hidden="true" />{t(r === "seats" ? "upgrade.feat_seats" : `upgrade.row_${r}`)}</li>
                ))}
              </ul>
              <div className="upgrade-unlocked-actions">
                <button className="btn btn-orange" onClick={goBack} data-testid="upgrade-continue">{t("upgrade.continue")}</button>
                <Link href="/settings?tab=billing">{t("upgrade.planCardManage")}</Link>
              </div>
            </div>
          ) : (
            <section className="pricing-hero">
              <h1>
                {t("upgrade.heroTitle1")} <span className="o">{t("upgrade.heroTitle2")}</span>
              </h1>
              <p>{t("upgrade.pageSubtitle")}</p>

              {reason && step !== "details" && (
                <div className="upgrade-reason" data-testid="upgrade-reason">
                  <span className="upgrade-reason-icon"><Lock aria-hidden="true" /></span>
                  <div>
                    <strong>{t(`upgrade.title_${reason}`)}</strong>
                    <span>{t(`upgrade.desc_${reason}`)}</span>
                  </div>
                </div>
              )}

              {showCards && (
                <div className="billing-toggle" role="group" aria-label={t("billing.billingTerm")} data-billing={term}>
                  {(["monthly", "yearly"] as const).map((x) => (
                    <button
                      key={x}
                      className={term === x ? "active" : ""}
                      onClick={() => setTerm(x)}
                      aria-pressed={term === x}
                      data-testid={`billing-term-${x}`}
                    >
                      <span className="term-label">{t(x === "yearly" ? "billing.termYearly" : "billing.termMonthly")}</span>
                      {x === "yearly" && <span className="term-note">{t("billing.save20")}</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Checkout: the details step after a pick, or the return from StreamPay.
          Outside .landing-page, whose reset would strip the form's spacing. */}
      {data && (
        <div className="upgrade-checkout">
          <CheckoutFlow
            returnTo="upgrade"
            summary={data}
            onSummaryChanged={refetch}
            keepParams={{}}
            defaultPlan={recommended}
            hidePicker
            request={request}
            onStepChange={onStepChange}
          />
        </div>
      )}

      {/* Bottom: the plan boxes, the free strip, the small print */}
      <div className="landing-page pricing-page">
        <div className="page upgrade-bottom">
          {!data && !live && (
            <div className="plan-grid upgrade-grid">
              {[0, 1].map((i) => <Skeleton key={i} className="h-[34rem] w-full rounded-[20px]" />)}
            </div>
          )}

          {showCards && (
            <>
              <div className="plan-grid upgrade-grid" data-testid="upgrade-compare">
                {PAID_PLANS.map((p) => {
                  const featured = p === recommended;
                  const saved = MONTHLY_PRICE[p] * 12 - periodPrice(p, "yearly");
                  return (
                    <div key={p} className={`plan${featured ? " featured" : ""}`} data-testid={`upgrade-plan-${p}`}>
                      {featured && <span className="plan-badge">{t("upgrade.recommended")}</span>}
                      <div className="plan-name">{planName(p)}</div>
                      <div className="plan-tagline">{t(`upgrade.tagline_${p}`)}</div>

                      <div className="plan-price-row">
                        <span className="plan-price">{sar(monthlyRate(p, term))}</span>
                        <span className="plan-period">{t("upgrade.perMonthPlusVat")}</span>
                      </div>
                      <div className="plan-usd">
                        {term === "yearly"
                          ? <>{sar(periodPrice(p, term))} {t("billing.billedYearly")}</>
                          : t("upgrade.billedMonthly")}
                      </div>
                      {term === "yearly" && (
                        <div className="plan-save">{t("upgrade.youSave")} {sar(saved)} {t("upgrade.perYear")}</div>
                      )}

                      {canManage && (
                        <button
                          className={`btn ${featured ? "btn-orange" : "btn-primary"}`}
                          onClick={() => setRequest({ plan: p, term, key: Date.now() })}
                          disabled={step === "opening"}
                          data-testid={`billing-plan-${p}`}
                        >
                          {step === "opening" && request?.plan === p && <Loader2 className="upgrade-spin" aria-hidden="true" />}
                          {t("billing.upgradeTo", { plan: planName(p) })}
                        </button>
                      )}

                      <div className="plan-feat-list">
                        {FEATURES[p].map((f) => {
                          const needed = !!reason && f.reason === reason;
                          return (
                            <div className={`plan-feat${needed ? " needed" : ""}`} key={f.key} data-testid={needed ? "upgrade-needed-row" : undefined}>
                              <f.Icon className="feat-icon" aria-hidden="true" />
                              <span>{t(f.key)}</span>
                              {needed && <span className="upgrade-needed-tag">{t("upgrade.youNeedThis")}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="free-strip" data-testid="upgrade-plan-free">
                <div className="free-strip-head">
                  <div className="free-strip-title">
                    <span className="free-strip-name">{planName("free")}</span>
                    <span className="free-strip-sub">{t("upgrade.freeSub")}</span>
                  </div>
                  {tier === "free" && <span className="upgrade-current">{t("upgrade.currentPlan")}</span>}
                </div>
                <ul className="free-list">
                  {FREE_ROWS.map((k) => (
                    <li key={k}><Check className="feat-icon" aria-hidden="true" />{t(k)}</li>
                  ))}
                </ul>
              </div>

              <ul className="upgrade-trust">
                <li><RotateCcw aria-hidden="true" />{t("upgrade.trustCancel")}</li>
                <li><Users aria-hidden="true" />{t("upgrade.trustTeam")}</li>
                <li><ShieldCheck aria-hidden="true" />{t("upgrade.trustSecure")}</li>
              </ul>
              <p className="upgrade-vat">{t("upgrade.vatNote")}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
