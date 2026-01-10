import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileCheck, AlertTriangle, FileText, LogOut, Shield } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { Button } from "./ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable";
import { useState, useEffect } from "react";

const SIDEBAR_MIN_SIZE = 15;
const SIDEBAR_MAX_SIZE = 30;
const SIDEBAR_DEFAULT_SIZE = 20;
const STORAGE_KEY = "admin-sidebar-size";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout, user } = useAuthStore();
  
  const [sidebarSize, setSidebarSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : SIDEBAR_DEFAULT_SIZE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sidebarSize.toString());
  }, [sidebarSize]);

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
    <div className="h-screen bg-gray-50">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Sidebar Panel */}
        <ResizablePanel
          defaultSize={sidebarSize}
          minSize={SIDEBAR_MIN_SIZE}
          maxSize={SIDEBAR_MAX_SIZE}
          onResize={(size) => setSidebarSize(size)}
        >
          <aside className="h-full bg-white border-r border-gray-200">
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
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      data-testid={item.dataTestId}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
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
                  <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="truncate">Logout</span>
                </Button>
              </div>
            </div>
          </aside>
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle withHandle className="hover:bg-blue-100 transition-colors" />

        {/* Main Content Panel */}
        <ResizablePanel defaultSize={100 - sidebarSize}>
          <main className="h-full overflow-auto">{children}</main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
