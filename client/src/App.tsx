import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/Dashboard";
import CompanyOnboarding from "@/pages/CompanyOnboarding";
import TenderDetails from "@/pages/tender-details";
import TenderEdit from "@/pages/tender-edit";
import CreateTender from "@/pages/CreateTender";
import TenderTitleStep from "@/pages/TenderTitleStep";
import TenderSkillsStep from "@/pages/TenderSkillsStep";
import TenderScopeStep from "@/pages/TenderScopeStep";
import TenderBudgetStep from "@/pages/TenderBudgetStep";
import TractionLink from "@/pages/TractionLink";
import InvitationSignup from "@/pages/invitation-signup";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminVendors from "@/pages/AdminVendors";
import AdminJoinRequests from "@/pages/AdminJoinRequests";
import AdminAwards from "@/pages/AdminAwards";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import AdminUsers from "@/pages/AdminUsers";
import AdminLayout from "@/components/AdminLayout";
import Settings from "@/pages/Settings";
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
        pathname.startsWith('/invite/') || // Invitation links
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
        pathname.startsWith('/invite/') ||
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
      <Route path="/invite/:id" component={InvitationSignup} />
      
      {/* Company onboarding (requires auth, no active company needed) */}
      <Route path="/company-onboarding" component={CompanyOnboarding} />
      
      {/* Main dashboard (requires active company) */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/tenders/new" component={CreateTender} />
      <Route path="/tenders/title" component={TenderTitleStep} />
      <Route path="/tenders/skills" component={TenderSkillsStep} />
      <Route path="/tenders/scope" component={TenderScopeStep} />
      <Route path="/tenders/budget" component={TenderBudgetStep} />
      <Route path="/tenders/:id" component={TenderDetails} />
      <Route path="/tenders/:id/edit" component={TenderEdit} />
      
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
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
