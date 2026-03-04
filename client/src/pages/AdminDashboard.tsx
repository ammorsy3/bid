import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Package, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

export default function AdminDashboard() {
  const { t } = useI18n();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/admin/metrics"],
  });

  const cards = [
    {
      title: t('admin.pendingVerifications'),
      value: metrics?.pendingVerifications || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/admin/vendors",
      dataTestId: "card-pending-verifications"
    },
    {
      title: t('admin.joinRequests'),
      value: metrics?.pendingJoinRequests || 0,
      icon: FileCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/admin/join-requests",
      dataTestId: "card-join-requests"
    },
    {
      title: t('admin.proposals24h'),
      value: metrics?.proposalsLast24h || 0,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/admin/analytics",
      dataTestId: "card-proposals-24h"
    },
    {
      title: t('admin.blockedAwards'),
      value: metrics?.blockedAwards || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      link: "/admin/awards",
      dataTestId: "card-blocked-awards"
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">{t('admin.adminDashboard')}</h1>
          <p className="text-gray-600 mt-2">{t('admin.adminDashboardDesc')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link 
                key={card.title} 
                href={card.link}
                className="block"
                data-testid={card.dataTestId}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {card.title}
                    </CardTitle>
                    <div className={`${card.bgColor} p-2 rounded-lg`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" data-testid={`text-${card.dataTestId}-value`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.quickActions')}</CardTitle>
              <CardDescription>{t('admin.quickActionsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link 
                href="/admin/vendors"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors" 
                data-testid="link-verify-vendors"
              >
                <div className="font-medium">{t('admin.verifyVendors')}</div>
                <div className="text-sm text-gray-600">{t('admin.verifyVendorsDesc')}</div>
              </Link>
              <Link 
                href="/admin/join-requests"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors" 
                data-testid="link-join-requests"
              >
                <div className="font-medium">{t('admin.manageJoinRequests')}</div>
                <div className="text-sm text-gray-600">{t('admin.manageJoinRequestsDesc')}</div>
              </Link>
              <Link 
                href="/admin/audit-logs"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors" 
                data-testid="link-audit-logs"
              >
                <div className="font-medium">{t('admin.viewAuditLogs')}</div>
                <div className="text-sm text-gray-600">{t('admin.viewAuditLogsDesc')}</div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.systemOverview')}</CardTitle>
              <CardDescription>{t('admin.systemOverviewDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('admin.activeVendors')}</span>
                <span className="font-semibold" data-testid="text-active-vendors">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('admin.activeTenders')}</span>
                <span className="font-semibold" data-testid="text-active-tenders">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('admin.totalProposals')}</span>
                <span className="font-semibold" data-testid="text-total-proposals">--</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
