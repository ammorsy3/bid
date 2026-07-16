import { useQuery } from "@tanstack/react-query";
import {
  Users, FileText, Package, AlertTriangle, Store,
  ClipboardList, Send, ArrowUpRight, CheckCircle2, Building2, Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { format, isValid } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import {
  AdminPage, AdminHeader, AdminSectionTitle, SkeletonKpis, Skeleton, statusStyle,
} from "@/components/admin/AdminUI";

interface AdminMetrics {
  pendingVerifications: number;
  pendingJoinRequests: number;
  proposalsLast24h: number;
  blockedAwards: number;
  pendingMarketplace: number;
  totalCompanies: number;
  verifiedCompanies: number;
  totalTenders: number;
  totalProposals: number;
}

interface TenderRow {
  id: string;
  title: string;
  status: string;
  isMarketplace: boolean;
  marketplaceStatus: string | null;
  createdAt: string;
  companyName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  offerCount: number;
}
interface TendersOverview {
  summary: { total: number; published: number; draft: number; closed: number; cancelled: number; marketplace: number; totalOffers: number };
  tenders: TenderRow[];
}

type Tf = (k: string, vars?: Record<string, string | number>) => string;

function useStatCards(metrics: AdminMetrics | undefined, t: Tf) {
  return [
    { key: "verifications", title: t("admin.pendingVerifications"), value: metrics?.pendingVerifications || 0, icon: Users, accent: "#2563eb", link: "/admin/vendors" },
    { key: "proposals", title: t("admin.proposals24h"), value: metrics?.proposalsLast24h || 0, icon: Package, accent: "#1FA56A", link: "/admin/dashboard" },
    { key: "blocked", title: t("admin.blockedAwards"), value: metrics?.blockedAwards || 0, icon: AlertTriangle, accent: "#D7321F", link: "/admin/awards" },
    { key: "marketplace", title: t("admin.marketplaceRequests"), value: metrics?.pendingMarketplace || 0, icon: Store, accent: "#FE3C01", link: "/admin/marketplace" },
  ];
}

export default function AdminDashboard() {
  const { t } = useI18n();

  const { data: metrics, isLoading } = useQuery<AdminMetrics>({ queryKey: ["/api/admin/metrics"] });
  const { data: tendersOverview, isLoading: tendersLoading } = useQuery<TendersOverview>({ queryKey: ["/api/admin/tenders-overview"] });

  const statCards = useStatCards(metrics, t);
  const attentionItems = statCards.filter((c) => c.value > 0);

  const glance = [
    { label: t("admin.totalCompanies"), value: metrics?.totalCompanies, Icon: Building2 },
    { label: t("admin.activeVendors"), value: metrics?.verifiedCompanies, Icon: CheckCircle2 },
    { label: t("admin.activeTenders"), value: metrics?.totalTenders, Icon: ClipboardList },
    { label: t("admin.totalProposals"), value: metrics?.totalProposals, Icon: Send },
  ];

  return (
    <AdminLayout>
      <AdminPage>
        <AdminHeader
          eyebrow={t("admin.adminPanel")}
          eyebrowIcon={Sparkles}
          title={t("admin.adminDashboard")}
          subtitle={t("admin.adminDashboardDesc")}
        />

        {/* Attention hero */}
        {!isLoading && attentionItems.length > 0 && (
          <div className="mb-8 rounded-3xl border border-[#FE3C01]/15 bg-gradient-to-br from-[#FE3C01]/[0.06] to-[#F19A8F]/[0.08] dark:from-[#FE3C01]/10 dark:to-transparent px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FE3C01] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FE3C01]" />
              </span>
              <span className="text-sm font-semibold text-[#1A1613] dark:text-foreground">
                {attentionItems.length === 1 ? t("admin.itemNeedsAttention", { count: attentionItems.length }) : t("admin.itemsNeedAttention", { count: attentionItems.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attentionItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.link}
                  className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-card border border-[#FE3C01]/15 px-3 py-1.5 text-xs font-medium text-[#1A1613] dark:text-foreground hover:border-[#FE3C01]/40 hover:shadow-sm transition-all"
                >
                  <span className="tabular-nums font-bold text-[#FE3C01]">{item.value}</span>
                  {item.title}
                  <ArrowUpRight className="h-3 w-3 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hero KPI cards */}
        {isLoading ? (
          <SkeletonKpis count={4} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              const hasItems = card.value > 0;
              return (
                <Link key={card.key} href={card.link} className="block group">
                  <div className="relative h-full rounded-3xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#FE3C01]/25 hover:shadow-[0_24px_48px_-24px_rgba(254,60,1,0.25)]">
                    <div className="flex items-start justify-between mb-6">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${card.accent}14`, color: card.accent }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {hasItems && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FE3C01]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FE3C01]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#FE3C01] animate-pulse" />
                          {t("admin.actionNeeded")}
                        </span>
                      )}
                    </div>
                    <div className="font-display font-bold text-5xl text-[#1A1613] dark:text-foreground tracking-[-0.04em] leading-[1] tabular-nums">
                      {card.value}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight">{card.title}</p>
                      <ArrowUpRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-[#FE3C01] transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Platform at a glance */}
        <div className="mb-8 rounded-3xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#FE3C01]/10 dark:divide-border">
            {glance.map((g) => (
              <div key={g.label} className="p-6">
                <div className="flex items-center gap-2 mb-3 text-gray-400 dark:text-gray-500">
                  <g.Icon className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{g.label}</span>
                </div>
                <div className="font-display font-bold text-3xl text-[#1A1613] dark:text-foreground tracking-[-0.03em] tabular-nums">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : (g.value ?? "--")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {[
            { href: "/admin/vendors", label: t("admin.verifyVendors"), desc: t("admin.verifyVendorsDesc"), Icon: Users, accent: "#2563eb", badge: metrics?.pendingVerifications || 0 },
            { href: "/admin/marketplace", label: t("admin.reviewMarketplace"), desc: t("admin.reviewMarketplaceDesc"), Icon: Store, accent: "#FE3C01", badge: metrics?.pendingMarketplace || 0 },
            { href: "/admin/audit-logs", label: t("admin.viewAuditLogs"), desc: t("admin.viewAuditLogsDesc"), Icon: FileText, accent: "#8A8078", badge: 0 },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="group">
              <div className="h-full rounded-2xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(254,60,1,0.22)] hover:border-[#FE3C01]/25">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${a.accent}14`, color: a.accent }}>
                    <a.Icon className="h-4 w-4" />
                  </div>
                  {a.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-full text-[11px] font-bold tabular-nums text-white" style={{ backgroundColor: a.accent }}>
                      {a.badge}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[#1A1613] dark:text-foreground flex items-center gap-1">
                  {a.label}
                  <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-[#FE3C01] transition-colors" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Tenders section */}
        <RefinedTenders tendersOverview={tendersOverview} tendersLoading={tendersLoading} t={t} />
      </AdminPage>
    </AdminLayout>
  );
}

function RefinedTenders({ tendersOverview, tendersLoading, t }: { tendersOverview: TendersOverview | undefined; tendersLoading: boolean; t: Tf }) {
  const s = tendersOverview?.summary;
  const summary = [
    { label: t("adminTenders.totalTenders"), value: s?.total ?? 0, accent: "#8A8078" },
    { label: t("adminTenders.published"), value: s?.published ?? 0, accent: "#1FA56A" },
    { label: t("adminTenders.marketplace"), value: s?.marketplace ?? 0, accent: "#FE3C01" },
    { label: t("adminTenders.totalOffers"), value: s?.totalOffers ?? 0, accent: "#7C3AED" },
  ];

  return (
    <div>
      <AdminSectionTitle icon={ClipboardList} title={t("adminTenders.title")} subtitle={t("adminTenders.subtitle")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {summary.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card p-5">
            <div className="font-display font-bold text-4xl tracking-[-0.04em] tabular-nums leading-none" style={{ color: tile.accent }}>
              {tendersLoading ? "–" : tile.value}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-[#FE3C01]/10 dark:border-border bg-white dark:bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#FE3C01]/10 dark:border-border">
          <h3 className="text-sm font-semibold text-[#1A1613] dark:text-foreground">{t("adminTenders.recentTenders")}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("adminTenders.recentTendersDesc")}</p>
        </div>

        {tendersLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !tendersOverview || tendersOverview.tenders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("adminTenders.noTenders")}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#FE3C01]/[0.07] dark:divide-border">
            {tendersOverview.tenders.slice(0, 10).map((tn) => {
              const d = new Date(tn.createdAt ?? "");
              return (
                <Link key={tn.id} href={`/tenders/${tn.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#FE3C01]/[0.03] dark:hover:bg-gray-800/30 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[#1A1613] dark:text-foreground group-hover:text-[#FE3C01] transition-colors line-clamp-1">{tn.title}</span>
                      {tn.isMarketplace && <Store className="h-3 w-3 text-[#FE3C01] flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {tn.companyName || "—"}{tn.ownerName ? ` · ${tn.ownerName}` : ""}
                    </div>
                  </div>
                  <span className={`hidden sm:inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium flex-shrink-0 ${statusStyle(tn.status)}`}>{tn.status}</span>
                  <div className="text-end flex-shrink-0 w-16">
                    <div className="font-display font-bold text-lg text-[#1A1613] dark:text-foreground tabular-nums leading-none">{tn.offerCount}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-0.5">{t("adminTenders.colOffers")}</div>
                  </div>
                  <div className="hidden md:block text-end text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap w-20 flex-shrink-0">
                    {isValid(d) ? format(d, "PP") : "—"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
