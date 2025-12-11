import { Router, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CompanyOnboarding from "@/pages/CompanyOnboarding";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminVendors from "@/pages/AdminVendors";
import AdminJoinRequests from "@/pages/AdminJoinRequests";
import TenderDetails from "@/pages/tender-details";
import TenderTitleStep from "@/pages/TenderTitleStep";
import TenderSkillsStep from "@/pages/TenderSkillsStep";
import TenderScopeStep from "@/pages/TenderScopeStep";
import TenderBudgetStep from "@/pages/TenderBudgetStep";
import TenderDescriptionStep from "@/pages/TenderDescriptionStep";
import TractionLink from "@/pages/TractionLink";
import Landing from "@/pages/Landing";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Router>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Register} />
          <Route path="/onboarding" component={CompanyOnboarding} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/vendors" component={AdminVendors} />
          <Route path="/admin/join-requests" component={AdminJoinRequests} />
          <Route path="/tenders/new" component={TenderTitleStep} />
          <Route path="/tenders/new/skills" component={TenderSkillsStep} />
          <Route path="/tenders/new/scope" component={TenderScopeStep} />
          <Route path="/tenders/new/budget" component={TenderBudgetStep} />
          <Route path="/tenders/new/description" component={TenderDescriptionStep} />
          <Route path="/tenders/:id" component={TenderDetails} />
          <Route path="/traction/:slug" component={TractionLink} />
          <Toaster />
        </Router>
      </I18nProvider>
    </QueryClientProvider>
  );
}
