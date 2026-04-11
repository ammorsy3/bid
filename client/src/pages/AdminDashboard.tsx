import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, FileText, Package, AlertTriangle, Store, TrendingUp, Activity } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

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
      title: t('admin.joinRequests'),
      value: metrics?.pendingJoinRequests || 0,
      icon: FileCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      ringColor: "ring-emerald-200 dark:ring-emerald-800",
      link: "/admin/join-requests",
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
      title: t('admin.marketplaceRequests') || 'Marketplace Requests',
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                {attentionItems.length} {attentionItems.length === 1 ? 'item needs' : 'items need'} your attention
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
              <div key={i} className="h-[120px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              const hasItems = card.value > 0;
              return (
                <Link key={card.title} href={card.link} className="block group">
                  <div className={`relative rounded-xl border bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    hasItems ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`${card.bgColor} rounded-lg p-2`}>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                      {hasItems && (
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
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
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('admin.quickActions')}</CardTitle>
              <CardDescription className="text-xs">{t('admin.quickActionsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                href="/admin/vendors"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.verifyVendors')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.verifyVendorsDesc')}</div>
                </div>
                {(metrics?.pendingVerifications || 0) > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {metrics?.pendingVerifications}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/join-requests"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                  <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.manageJoinRequests')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.manageJoinRequestsDesc')}</div>
                </div>
                {(metrics?.pendingJoinRequests || 0) > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    {metrics?.pendingJoinRequests}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/marketplace"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 transition-colors">
                  <Store className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Review Marketplace</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Approve or reject marketplace submissions</div>
                </div>
                {(metrics?.pendingMarketplace || 0) > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    {metrics?.pendingMarketplace}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/audit-logs"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                  <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('admin.viewAuditLogs')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.viewAuditLogsDesc')}</div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('admin.systemOverview')}</CardTitle>
              <CardDescription className="text-xs">{t('admin.systemOverviewDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Companies</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metrics?.totalCompanies ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.activeVendors')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metrics?.verifiedCompanies ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.activeTenders')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metrics?.totalTenders ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('admin.totalProposals')}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{metrics?.totalProposals ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Proposals (24h)</span>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {metrics?.proposalsLast24h || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
