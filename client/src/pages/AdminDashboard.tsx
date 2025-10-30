import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck, Package, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/admin/metrics"],
  });

  const cards = [
    {
      title: "Pending Verifications",
      value: metrics?.pendingVerifications || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/admin/vendors",
      dataTestId: "card-pending-verifications"
    },
    {
      title: "Join Requests",
      value: metrics?.pendingJoinRequests || 0,
      icon: FileCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/admin/join-requests",
      dataTestId: "card-join-requests"
    },
    {
      title: "Proposals (24h)",
      value: metrics?.proposalsLast24h || 0,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/admin/analytics",
      dataTestId: "card-proposals-24h"
    },
    {
      title: "Blocked Awards",
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
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage platform operations and monitor key metrics</p>
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
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used admin operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link 
                href="/admin/vendors"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors" 
                data-testid="link-verify-vendors"
              >
                <div className="font-medium">Verify Vendors</div>
                <div className="text-sm text-gray-600">Review and approve pending vendor applications</div>
              </Link>
              <Link 
                href="/admin/join-requests"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors" 
                data-testid="link-join-requests"
              >
                <div className="font-medium">Manage Join Requests</div>
                <div className="text-sm text-gray-600">Approve or reject vendor base applications</div>
              </Link>
              <Link 
                href="/admin/audit-logs"
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors" 
                data-testid="link-audit-logs"
              >
                <div className="font-medium">View Audit Logs</div>
                <div className="text-sm text-gray-600">Track all administrative actions</div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Platform health and activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Vendors</span>
                <span className="font-semibold" data-testid="text-active-vendors">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Tenders</span>
                <span className="font-semibold" data-testid="text-active-tenders">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Proposals</span>
                <span className="font-semibold" data-testid="text-total-proposals">--</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
