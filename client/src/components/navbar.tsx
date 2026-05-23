import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { Link, useLocation } from "wouter";
import { Bell, User, Menu, X, LayoutDashboard, Users, BarChart2, FileText, CircleUserRound, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { BidLogo } from "@/components/brand/BidLogo";

export default function Navbar() {
  const { user } = useAuthStore();
  const [location] = useLocation();
  const { t } = useI18n();
  const doLogout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => doLogout("/login");
  const userRole = (user as any)?.role as string | undefined;

  const mobileNavLinks = [
    { href: "/dashboard", label: t('nav.dashboard'), icon: LayoutDashboard },
    ...(userRole === 'requester' ? [
      { href: "/vendors-base", label: t('nav.vendors'), icon: Users },
      { href: "/analytics", label: t('nav.analytics'), icon: BarChart2 },
    ] : []),
    ...(userRole === 'vendor' ? [
      { href: "/my-offers", label: t('nav.myOffers'), icon: FileText },
      { href: "/profile", label: t('nav.profile'), icon: CircleUserRound },
    ] : []),
  ];

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard">
              <div className="mr-8 cursor-pointer">
                <BidLogo variant="orange" size={28} />
              </div>
            </Link>
            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden sm:flex space-x-8">
              <Link
                href="/dashboard"
                className="px-1 py-4 text-sm font-medium border-b-2 border-[var(--bid-orange)] text-[var(--bid-orange)]"
              >
                {t('nav.dashboard')}
              </Link>
              {user?.role === 'requester' && (
                <>
                  <Link
                    href="/vendors-base"
                    className="text-muted-foreground hover:text-muted-foreground px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.vendors')}
                  </Link>
                  <Link
                    href="/analytics"
                    className="text-muted-foreground hover:text-muted-foreground px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.analytics')}
                  </Link>
                </>
              )}
              {user?.role === 'vendor' && (
                <>
                  <Link
                    href="/my-offers"
                    className="text-muted-foreground hover:text-muted-foreground px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.myOffers')}
                  </Link>
                  <Link
                    href="/profile"
                    className="text-muted-foreground hover:text-muted-foreground px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.profile')}
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Desktop right side */}
          <div className="hidden sm:flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative p-2 text-neutral-400 hover:text-muted-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-error-500"></span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile right side — bell + hamburger */}
          <div className="flex sm:hidden items-center gap-1">
            <Button variant="ghost" size="sm" className="relative p-2 text-neutral-400">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 block h-1.5 w-1.5 rounded-full bg-error-500"></span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile slide-in drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <BidLogo variant="orange" size={24} />
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* User info */}
            <div className="flex items-center gap-3 mt-4">
              <div className="h-10 w-10 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </SheetHeader>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {mobileNavLinks.map((link) => {
              const isActive = location === link.href || (link.href !== '/dashboard' && location.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--bid-orange)]/10 text-[var(--bid-orange)]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <link.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-[var(--bid-orange)]' : ''}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border">
            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {t('nav.logout')}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
