import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, AlertTriangle, FileText,
  Shield, LogOut, ArrowLeft, Store, Bug, Bell, UserPlus, Megaphone, CreditCard, Menu
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { BidLogo } from "@/components/brand/BidLogo";
import { TopLoadingBar } from "@/components/admin/AdminUI";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuthStore();
  const doLogout = useLogout();
  const { t, isRtl } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

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
    unreadNotifications: number;
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
        {
          href: "/admin/notifications",
          label: t('admin.navNotifications'),
          icon: Bell,
          count: metrics?.unreadNotifications || 0,
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
        {
          href: "/admin/join-requests",
          label: t('admin.navJoinRequests'),
          icon: UserPlus,
          count: metrics?.pendingJoinRequests || 0,
        },
      ],
    },
    {
      label: t('admin.navGrowth'),
      items: [
        {
          href: "/admin/campaigns",
          label: t('admin.navCampaigns'),
          icon: Megaphone,
          count: 0,
        },
        {
          href: "/admin/checkouts",
          label: t('admin.navCheckouts'),
          icon: CreditCard,
          count: 0,
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

  const handleLogout = () => doLogout("/login");

  const totalCount = navSections.reduce((sum, sec) => sum + sec.items.reduce((n, i) => n + i.count, 0), 0);
  const currentLabel = navSections.flatMap((sec) => sec.items).find((i) => i.href === location)?.label ?? t('admin.adminPanel');

  // Same sidebar content for the desktop aside and the phone drawer.
  // `mobile` only adds 44px tap rows and closes the drawer on tap.
  const sidebarBody = (mobile: boolean) => (
    <>
      {/* Brand accent strip */}
      <div className="h-0.5 bg-gradient-to-r from-[var(--bid-orange)] to-[#F19A8F] flex-shrink-0" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 [@media(max-height:900px)]:pt-3 [@media(max-height:900px)]:pb-3 border-b border-border dark:border-border">
        <Link
          href="/dashboard"
          onClick={mobile ? () => setMenuOpen(false) : undefined}
          className={`inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-muted-foreground dark:hover:text-gray-300 active:opacity-70 transition-colors mb-3 ${mobile ? 'min-h-11 -my-2' : ''}`}
        >
          <ArrowLeft className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          {t('admin.backToDashboard')}
        </Link>
        <div className="mb-2">
          <BidLogo variant="orange" size={24} />
        </div>
        <h1 className="font-display font-black text-xl text-gray-900 dark:text-foreground tracking-[-0.03em] rtl:tracking-normal rtl:leading-snug">
          {t('admin.adminPanel')}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('admin.platformManagement')}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 lg:overflow-y-auto py-4 px-3 space-y-6 [@media(max-height:900px)]:py-2 [@media(max-height:900px)]:space-y-3">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 rtl:normal-case rtl:tracking-normal">
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
                    onClick={mobile ? () => setMenuOpen(false) : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-3 ps-4 pe-3 py-2.5 [@media(max-height:900px)]:py-1.5 ${mobile ? 'min-h-11' : ''} rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r rtl:bg-gradient-to-l from-[var(--bid-orange)]/[0.12] to-[var(--bid-orange)]/[0.02] text-[var(--bid-orange)] shadow-[inset_0_0_0_1px_rgba(254,60,1,0.12)]"
                        : "text-gray-600 dark:text-gray-400 hover:bg-muted dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 active:bg-muted dark:active:bg-gray-800/50"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute start-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-[var(--bid-orange)]" />
                    )}
                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${
                      isActive ? "text-[var(--bid-orange)]" : "text-gray-400 dark:text-gray-500"
                    }`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.count > 0 && (
                      <span dir="ltr" className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold font-mono tabular-nums ${
                        isActive
                          ? "bg-[var(--bid-orange)] text-white"
                          : "bg-[var(--state-lost)]/15 text-[var(--state-lost)]"
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
      <div className={`border-t border-border dark:border-border px-4 py-4 [@media(max-height:900px)]:py-3 ${mobile ? 'mt-auto ' + 'pb-[max(1rem,env(safe-area-inset-bottom))]' : ''}`}>
        <div className="flex items-center gap-3 mb-3">
          {user.profilePictureUrl ? (
            <img
              src={user.profilePictureUrl}
              alt={user.name || user.username}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[var(--bid-orange)]/15 flex items-center justify-center text-[var(--bid-orange)] text-sm font-semibold flex-shrink-0 font-display">
              {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-foreground truncate">
              {user.name || user.username}
            </p>
            <p dir="ltr" className="text-[11px] text-gray-500 dark:text-gray-400 truncate text-start rtl:text-end">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 ${mobile ? 'min-h-11' : ''} rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-muted dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200 active:bg-muted dark:active:bg-gray-800/50 transition-colors`}
        >
          <LogOut className="h-4 w-4 rtl:-scale-x-100" />
          {t('admin.navLogout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh lg:min-h-0 lg:h-screen bg-gray-50 dark:bg-gray-950">
      <TopLoadingBar />

      {/* Phone top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-2 h-14 box-content pt-[env(safe-area-inset-top)] ps-[max(0.5rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] bg-white dark:bg-background border-b border-border">
        <button
          type="button"
          data-testid="button-admin-menu"
          onClick={() => setMenuOpen(true)}
          aria-label={t('admin.openMenu')}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="h-11 w-11 flex-shrink-0 inline-flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-muted active:bg-muted active:opacity-70"
        >
          <Menu className="h-6 w-6" />
        </button>
        <BidLogo variant="orange" size={22} />
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-foreground">
          {currentLabel}
        </span>
        {totalCount > 0 && (
          <span dir="ltr" data-testid="text-admin-total-count" className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-semibold font-mono tabular-nums bg-[var(--state-lost)]/15 text-[var(--state-lost)]">
            {totalCount}
          </span>
        )}
      </header>

      {/* Phone menu drawer (slides in from the start side) */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side={isRtl ? "right" : "left"}
          className="lg:hidden p-0 w-[85vw] max-w-sm gap-0 flex flex-col overflow-y-auto overscroll-contain bg-white dark:bg-background"
        >
          <SheetTitle className="sr-only">{t('admin.adminPanel')}</SheetTitle>
          <SheetDescription className="sr-only">{t('admin.platformManagement')}</SheetDescription>
          {sidebarBody(true)}
        </SheetContent>
      </Sheet>

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-[272px] flex-shrink-0 bg-white dark:bg-background border-e border-border dark:border-border flex-col">
        {sidebarBody(false)}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 lg:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
