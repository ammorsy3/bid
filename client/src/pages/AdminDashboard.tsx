import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Package, AlertTriangle, Store, TrendingUp, Activity, ClipboardList, Send } from "lucide-react";
import { Link } from "wouter";
import { format, isValid } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

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

const statusStyle = (status: string): string => {
  switch (status) {
    case "published": return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300";
    case "closed": return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
    case "cancelled": return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
    default: return "bg-gray-100 dark:bg-card text-gray-600 dark:text-gray-400"; // draft
  }
};

export default function AdminDashboard() {
  const { t } = useI18n();

  const { data: metrics, isLoading } = useQuery<{
    pendingVerifications: number;
    pendingJoinRequests: number;
    proposalsLast24h: number;
    blockedAwards: number;
    pendingMarketplace: number;
    totalCompanies: number;
    verifiedCompanies: number;
    totalTenders: number;
    totalProposals: number;
  }>({
    queryKey: ["/api/admin/metrics"],
  });

  const { data: tendersOverview, isLoading: tendersLoading } = useQuery<TendersOverview>({
    queryKey: ["/api/admin/tenders-overview"],
  });

  const statCards = [
    {
      title: t('admin.pendingVerifications'),
      value: metrics?.pendingVerifications || 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      ringColor: "ring-blue-200 dark:ring-blue-800",
      link: "/admin/vendors",
    },
    {
      title: t('admin.proposals24h'),
      value: metrics?.proposalsLast24h || 0,
      icon: Package,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      ringColor: "ring-purple-200 dark:ring-purple-800",
      link: "/admin/dashboard",
    },
    {
      title: t('admin.blockedAwards'),
      value: metrics?.blockedAwards || 0,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/40",
      ringColor: "ring-red-200 dark:ring-red-800",
      link: "/admin/awards",
    },
    {
      title: t('admin.marketplaceRequests'),
      value: metrics?.pendingMarketplace || 0,
      icon: Store,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
      ringColor: "ring-orange-200 dark:ring-orange-800",
      link: "/admin/marketplace",
    },
  ];

  // Items that need attention (non-zero counts)
  const attentionItems = statCards.filter(c => c.value > 0);

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display font-black text-3xl text-gray-900 dark:text-foreground tracking-[-0.04em]">
            {t('admin.adminDashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.adminDashboardDesc')}
          </p>
        </div>

        {/* Attention banner */}
        {!isLoading && attentionItems.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {attentionItems.length === 1 ? t('admin.itemNeedsAttention', { count: attentionItems.length }) : t('admin.itemsNeedAttention', { count: attentionItems.length })}
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 pl-6">
              {attentionItems.map(item => `${item.value} ${item.title.toLowerCase()}`).join(' \u00B7 ')}
            </p>
          </div>
        )}

        {/* Metric cards */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[120px] bg-gray-100 dark:bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              const hasItems = card.value > 0;
              return (
                <Link key={card.title} href={card.link} className="block group">
                  <div className={`relative rounded-xl border bg-white dark:bg-background p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    hasItems ? 'border-border dark:border-border' : 'border-border dark:border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`${card.bgColor} rounded-lg p-2`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                      {hasItems && (
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-foreground mb-0.5">
                      {card.value}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      {card.title}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick actions + System overview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border dark:border-border bg-white dark:bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('admin.quickActions')}</CardTitle>
              <CardDescription className="text-xs">{t('admin.quickActionsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                href="/admin/vendors"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-foreground">{t('admin.verifyVendors')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.verifyVendorsDesc')}</div>
                </div>
                {(metrics?.pendingVerifications || 0) > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {metrics?.pendingVerifications}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/marketplace"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 transition-colors">
                  <Store className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-foreground">{t('admin.reviewMarketplace')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.reviewMarketplaceDesc')}</div>
                </div>
                {(metrics?.pendingMarketplace || 0) > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    {metrics?.pendingMarketplace}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/audit-logs"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-card flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                  <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-foreground">{t('admin.viewAuditLogs')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.viewAuditLogsDesc')}</div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border dark:border-border bg-white dark:bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('admin.systemOverview')}</CardTitle>
              <CardDescription className="text-xs">{t('admin.systemOverviewDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border dark:border-border">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalCompanies')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-foreground">{metrics?.totalCompanies ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border dark:border-border">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.activeVendors')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-foreground">{metrics?.verifiedCompanies ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border dark:border-border">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.activeTenders')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-foreground">{metrics?.totalTenders ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border dark:border-border">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalProposals')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-foreground">{metrics?.totalProposals ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.proposals24hLabel')}</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
                    {metrics?.proposalsLast24h || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenders & RFP tracking */}
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="font-display font-bold text-xl text-gray-900 dark:text-foreground tracking-[-0.02em] flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[var(--bid-orange)]" />
              {t('adminTenders.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('adminTenders.subtitle')}</p>
          </div>

          {/* Summary tiles */}
          {tendersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-card rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
              {[
                { label: t('adminTenders.totalTenders'), value: tendersOverview?.summary.total ?? 0, Icon: ClipboardList, fg: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-card" },
                { label: t('adminTenders.published'), value: tendersOverview?.summary.published ?? 0, Icon: FileText, fg: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
                { label: t('adminTenders.marketplace'), value: tendersOverview?.summary.marketplace ?? 0, Icon: Store, fg: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
                { label: t('adminTenders.totalOffers'), value: tendersOverview?.summary.totalOffers ?? 0, Icon: Send, fg: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
              ].map((tile) => (
                <div key={tile.label} className="rounded-xl border border-border dark:border-border bg-white dark:bg-background p-5">
                  <div className={`${tile.bg} rounded-lg p-2 w-fit mb-3`}>
                    <tile.Icon className={`h-4 w-4 ${tile.fg}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-foreground mb-0.5">{tile.value}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{tile.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent tenders table */}
          <Card className="border-border dark:border-border bg-white dark:bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('adminTenders.recentTenders')}</CardTitle>
              <CardDescription className="text-xs">{t('adminTenders.recentTendersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {tendersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-card rounded-lg animate-pulse" />)}
                </div>
              ) : !tendersOverview || tendersOverview.tenders.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('adminTenders.noTenders')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        <th className="text-start font-semibold px-2 pb-2">{t('adminTenders.colTender')}</th>
                        <th className="text-start font-semibold px-2 pb-2">{t('adminTenders.colOwner')}</th>
                        <th className="text-start font-semibold px-2 pb-2">{t('adminTenders.colStatus')}</th>
                        <th className="text-end font-semibold px-2 pb-2">{t('adminTenders.colOffers')}</th>
                        <th className="text-end font-semibold px-2 pb-2">{t('adminTenders.colCreated')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {tendersOverview.tenders.slice(0, 12).map((tn) => {
                        const d = new Date(tn.createdAt ?? "");
                        return (
                          <tr key={tn.id} className="hover:bg-muted/40 dark:hover:bg-gray-800/30">
                            <td className="px-2 py-3">
                              <Link href={`/tenders/${tn.id}`} className="font-medium text-gray-900 dark:text-foreground hover:text-[var(--bid-orange)] line-clamp-1">
                                {tn.title}
                              </Link>
                              {tn.isMarketplace && (
                                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                                  <Store className="h-2.5 w-2.5" /> {t('adminTenders.marketplace')}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <div className="text-gray-700 dark:text-gray-300 line-clamp-1">{tn.companyName || '—'}</div>
                              {tn.ownerName && <div className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{tn.ownerName}</div>}
                            </td>
                            <td className="px-2 py-3">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle(tn.status)}`}>
                                {tn.status}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-end font-semibold tabular-nums text-gray-900 dark:text-foreground">
                              {tn.offerCount}
                            </td>
                            <td className="px-2 py-3 text-end text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {isValid(d) ? format(d, 'PP') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
