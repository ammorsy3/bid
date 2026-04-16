import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [location] = useLocation();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard">
              <h1 className="text-2xl font-bold mr-8 cursor-pointer text-[#f75600]">{t('landing.brand')}</h1>
            </Link>
            <nav className="flex space-x-8">
              <Link
                href="/dashboard"
                className="px-1 py-4 text-sm font-medium border-b-2 border-primary-600 text-[#f06800]"
              >
                {t('nav.dashboard')}
              </Link>
              {user?.role === 'requester' && (
                <>
                  <Link
                    href="/vendors-base"
                    className="text-neutral-500 hover:text-neutral-700 px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.vendors')}
                  </Link>
                  <Link
                    href="/analytics"
                    className="text-neutral-500 hover:text-neutral-700 px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.analytics')}
                  </Link>
                </>
              )}
              {user?.role === 'vendor' && (
                <>
                  <Link
                    href="/my-offers"
                    className="text-neutral-500 hover:text-neutral-700 px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.myOffers')}
                  </Link>
                  <Link
                    href="/profile"
                    className="text-neutral-500 hover:text-neutral-700 px-1 py-4 text-sm font-medium transition-colors"
                  >
                    {t('nav.profile')}
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative p-2 text-neutral-400 hover:text-neutral-500">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-error-500"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-neutral-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-neutral-600" />
                  </div>
                  <span className="text-sm font-medium text-neutral-700">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
