import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileCheck, AlertTriangle, FileText, LogOut, Shield } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { Button } from "./ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout, user } = useAuthStore();

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      dataTestId: "link-admin-dashboard",
    },
    {
      href: "/admin/vendors",
      label: "Vendor Verification",
      icon: Users,
      dataTestId: "link-admin-vendors",
    },
    {
      href: "/admin/join-requests",
      label: "Join Requests",
      icon: FileCheck,
      dataTestId: "link-admin-join-requests",
    },
    {
      href: "/admin/awards",
      label: "Blocked Awards",
      icon: AlertTriangle,
      dataTestId: "link-admin-awards",
    },
    {
      href: "/admin/users",
      label: "User Management",
      icon: Shield,
      dataTestId: "link-admin-users",
    },
    {
      href: "/admin/audit-logs",
      label: "Audit Logs",
      icon: FileText,
      dataTestId: "link-admin-audit-logs",
    },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900" data-testid="text-admin-title">
              Admin Panel
            </h1>
            <p className="text-sm text-gray-600 mt-1" data-testid="text-admin-user">
              {user?.name || user?.email}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid={item.dataTestId}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
