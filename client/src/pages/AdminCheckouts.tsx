// Admin → Growth → Checkouts: every attempt to buy a plan, newest activity
// first. It's the lead list behind the automatic "you didn't finish" email —
// with a phone number and a WhatsApp link, so someone can also follow up by hand.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { CreditCard, Mail, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import { AdminPage, AdminHeader, AdminCard, AdminEmpty, SkeletonList, SkeletonKpis } from "@/components/admin/AdminUI";

interface CheckoutRow {
  id: string;
  plan: "pro" | "business";
  term: "monthly" | "yearly";
  status: "draft" | "redirected" | "paid" | "failed" | "abandoned";
  failureReason: string | null;
  lastActivityAt: string;
  followupSentAt: string | null;
  createdAt: string;
  companyId: string;
  companyName: string;
  userName: string;
  email: string;
  phone: string | null;
  total: number;
}

const STATUS_TONE: Record<CheckoutRow["status"], string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  abandoned: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  redirected: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const FILTERS = ["all", "open", "paid"] as const;
type Filter = typeof FILTERS[number];

export default function AdminCheckouts() {
  const { t, language } = useI18n();
  const locale = language === "ar" ? arSA : enUS;
  const [filter, setFilter] = useState<Filter>("open");

  const { data, isLoading } = useQuery<CheckoutRow[]>({ queryKey: ["/api/admin/billing/checkouts"] });
  const rows = data ?? [];

  const kpis = useMemo(() => ({
    started: rows.length,
    paid: rows.filter((r) => r.status === "paid").length,
    open: rows.filter((r) => r.status !== "paid").length,
    followedUp: rows.filter((r) => r.followupSentAt).length,
  }), [rows]);

  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "paid" ? r.status === "paid" : r.status !== "paid",
  );

  return (
    <AdminLayout>
      <AdminPage>
        <AdminHeader
          eyebrow={t("admin.adminPanel")}
          eyebrowIcon={CreditCard}
          title={t("admin.checkoutsTitle")}
          subtitle={t("admin.checkoutsSubtitle")}
        />

        {isLoading ? (
          <>
            <SkeletonKpis count={4} />
            <div className="mt-6"><SkeletonList rows={5} /></div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {([
                ["checkoutsKpiStarted", kpis.started],
                ["checkoutsKpiPaid", kpis.paid],
                ["checkoutsKpiOpen", kpis.open],
                ["checkoutsKpiFollowedUp", kpis.followedUp],
              ] as const).map(([k, v]) => (
                <AdminCard key={k} className="p-4">
                  <p className="text-xs text-gray-500 dark:text-muted-foreground">{t(`admin.${k}`)}</p>
                  <p className="font-display font-black text-2xl mt-1">{v.toLocaleString()}</p>
                </AdminCard>
              ))}
            </div>

            <div className="flex gap-2 mb-4" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-sm ${filter === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
                  data-testid={`filter-checkouts-${f}`}
                >
                  {t(`admin.checkoutsFilter_${f}`)}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <AdminEmpty icon={CreditCard} title={t("admin.noCheckouts")} subtitle={t("admin.noCheckoutsDesc")} />
            ) : (
              <div className="space-y-3">
                {shown.map((r) => {
                  const wa = r.phone ? `https://wa.me/${r.phone.replace(/\D/g, "")}` : null;
                  return (
                    <AdminCard key={r.id} className="p-4" data-testid={`row-checkout-${r.id}`}>
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold truncate">{r.companyName}</span>
                            <Badge className={`text-[11px] font-medium border-0 ${STATUS_TONE[r.status]}`}>
                              {t(`admin.checkoutStatus_${r.status}`)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {r.plan === "pro" ? "Pro" : "Business"} · {t(r.term === "yearly" ? "billing.termYearly" : "billing.termMonthly")} ·{" "}
                              <span dir="ltr">SAR {r.total.toLocaleString("en-US")}</span>
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {r.userName} · <span dir="ltr">{r.email}</span>{r.phone && <> · <span dir="ltr">{r.phone}</span></>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("admin.checkoutsLastActivity", { when: formatDistanceToNow(new Date(r.lastActivityAt), { addSuffix: true, locale }) })}
                            {r.followupSentAt && <> · {t("admin.checkoutsFollowupSent")}</>}
                            {r.failureReason && <> · <span dir="auto">{t("billing.reasonLabel", { reason: r.failureReason })}</span></>}
                          </p>
                        </div>
                        {r.status !== "paid" && (
                          <div className="flex gap-2 shrink-0">
                            <a
                              href={`mailto:${r.email}`}
                              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                            >
                              <Mail className="h-4 w-4" />{t("admin.checkoutsEmail")}
                            </a>
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                              >
                                <MessageCircle className="h-4 w-4" />WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </AdminCard>
                  );
                })}
              </div>
            )}
          </>
        )}
      </AdminPage>
    </AdminLayout>
  );
}
