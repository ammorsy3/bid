import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/Dashboard";
import CompanyOnboarding from "@/pages/CompanyOnboarding";
import TenderDetails from "@/pages/tender-details";
import TractionLink from "@/pages/TractionLink";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminVendors from "@/pages/AdminVendors";
import AdminJoinRequests from "@/pages/AdminJoinRequests";
import AdminAwards from "@/pages/AdminAwards";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import AdminUsers from "@/pages/AdminUsers";
import AdminLayout from "@/components/AdminLayout";
import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";

function Router() {
  const { user, activeCompany, checkAuth } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect authenticated users from landing page to dashboard
  useEffect(() => {
    if (user && activeCompany && location === '/') {
      setLocation('/dashboard');
    }
  }, [user, activeCompany, location, setLocation]);

  // Redirect authenticated users without active company to company creation
  useEffect(() => {
    if (user && !activeCompany) {
      const pathname = location.split('?')[0];
      
      // Exclude public pages and company onboarding from redirect
      const isPublicPage = 
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/register' ||
        pathname.startsWith('/r/') || // Traction links
        pathname === '/company-onboarding';
      
      if (!isPublicPage) {
        setLocation('/company-onboarding');
      }
    }
  }, [user, activeCompany, location, setLocation]);

  // Redirect users with draft company onboarding to complete profile
  useEffect(() => {
    if (user && activeCompany && activeCompany.onboardingState === 'draft') {
      const pathname = location.split('?')[0];
      
      // Exclude public pages and onboarding page itself
      const isPublicPage = 
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/register' ||
        pathname.startsWith('/r/') ||
        pathname === '/company-onboarding';
      
      if (!isPublicPage) {
        setLocation('/company-onboarding');
      }
    }
  }, [user, activeCompany, location, setLocation]);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/r/:slug" component={TractionLink} />
      
      {/* Company onboarding (requires auth, no active company needed) */}
      <Route path="/company-onboarding" component={CompanyOnboarding} />
      
      {/* Main dashboard (requires active company) */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tenders/:id" component={TenderDetails} />
      
      {/* Admin routes */}
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/vendors">
        <AdminLayout>
          <AdminVendors />
        </AdminLayout>
      </Route>
      <Route path="/admin/join-requests">
        <AdminLayout>
          <AdminJoinRequests />
        </AdminLayout>
      </Route>
      <Route path="/admin/awards">
        <AdminLayout>
          <AdminAwards />
        </AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout>
          <AdminUsers />
        </AdminLayout>
      </Route>
      <Route path="/admin/audit-logs">
        <AdminLayout>
          <AdminAuditLogs />
        </AdminLayout>
      </Route>
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
