import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, AlertTriangle, FileText,
  Shield, LogOut, ArrowLeft, Store, Bug
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuthStore();
  const { t, isRtl } = useI18n();

  // Guard: redirect non-admins
  useEffect(() => {
    if (!user?.isAdmin) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  if (!user?.isAdmin) return null;

  // Fetch metrics for badge counts
  const { data: metrics } = useQuery<{
    pendingVerifications: number;
    pendingJoinRequests: number;
    proposalsLast24h: number;
    blockedAwards: number;
    pendingMarketplace: number;
  }>({
    queryKey: ["/api/admin/metrics"],
    refetchInterval: 30000,
  });

  const navSections = [
    {
      label: t('admin.navOverview'),
      items: [
        {
          href: "/admin/dashboard",
          label: t('admin.navDashboard'),
          icon: LayoutDashboard,
          count: 0,
        },
      ],
    },
    {
      label: t('admin.navOperations'),
      items: [
        {
          href: "/admin/vendors",
          label: t('admin.navCompanyVerification'),
          icon: Users,
          count: metrics?.pendingVerifications || 0,
        },
        {
          href: "/admin/marketplace",
          label: t('admin.navMarketplace'),
          icon: Store,
          count: metrics?.pendingMarketplace || 0,
        },
        {
          href: "/admin/awards",
          label: t('admin.navBlockedAwards'),
          icon: AlertTriangle,
          count: metrics?.blockedAwards || 0,
        },
      ],
    },
    {
      label: t('admin.navSystem'),
      items: [
        {
          href: "/admin/users",
          label: t('admin.navUserManagement'),
          icon: Shield,
          count: 0,
        },
        {
          href: "/admin/audit-logs",
          label: t('admin.navAuditLogs'),
          icon: FileText,
          count: 0,
        },
        {
          href: "/admin/errors",
          label: t('admin.navErrorLogs'),
          icon: Bug,
          count: 0,
        },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-[272px] flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Brand accent strip */}
        <div className="h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 flex-shrink-0" />

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-3"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            {t('admin.backToDashboard')}
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('admin.adminPanel')}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('admin.platformManagement')}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${
                        isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"
                      }`} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count > 0 && (
                        <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                          isActive
                            ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — user info */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            {user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.name || user.username}
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 text-sm font-semibold flex-shrink-0">
                {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.name || user.username}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('admin.navLogout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
