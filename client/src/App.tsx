import { Router, Route, Switch } from "wouter";
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
import TenderEditPage from "@/pages/TenderEditPage";
import TenderCreateChoice from "@/pages/TenderCreateChoice";
import TenderTitleStep from "@/pages/TenderTitleStep";
import TenderProjectScopeStep from "@/pages/TenderProjectScopeStep";
import TenderAIBudgetStep from "@/pages/TenderAIBudgetStep";
import TenderSubmissionProcessStep from "@/pages/TenderSubmissionProcessStep";
import TenderEvaluationCriteriaStep from "@/pages/TenderEvaluationCriteriaStep";
import TenderInviteLink from "@/pages/TenderInviteLink";
import TractionLink from "@/pages/TractionLink";
import Landing from "@/pages/Landing";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Router>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Register} />
            <Route path="/onboarding" component={CompanyOnboarding} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/admin/vendors" component={AdminVendors} />
            <Route path="/admin/join-requests" component={AdminJoinRequests} />
            <Route path="/tenders/new" component={TenderCreateChoice} />
            <Route path="/tenders/new/manual" component={TenderTitleStep} />
            <Route path="/tenders/new/project-scope" component={TenderProjectScopeStep} />
            <Route path="/tenders/new/ai-budget" component={TenderAIBudgetStep} />
            <Route path="/tenders/new/submission-process" component={TenderSubmissionProcessStep} />
            <Route path="/tenders/new/evaluation-criteria" component={TenderEvaluationCriteriaStep} />
            <Route path="/invite/:id" component={TenderInviteLink} />
            <Route path="/tenders/:id/edit" component={TenderEditPage} />
            <Route path="/tenders/:id" component={TenderDetails} />
            <Route path="/traction/:slug" component={TractionLink} />
            <Route path="/settings" component={Settings} />
          </Switch>
          <Toaster />
        </Router>
      </I18nProvider>
    </QueryClientProvider>
  );
}
