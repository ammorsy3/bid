import { useEffect, useMemo } from "react";
import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CompanyOnboarding from "@/pages/CompanyOnboarding";
import VerifyEmail from "@/pages/verify-email";
import OnboardingChoice from "@/pages/onboarding/index";
import CompanyBasics from "@/pages/onboarding/company-basics";
import CompanyProfile from "@/pages/onboarding/company-profile";
import InviteTeam from "@/pages/onboarding/invite-team";
import CompanyDocuments from "@/pages/onboarding/company-documents";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminVendors from "@/pages/AdminVendors";
import AdminJoinRequests from "@/pages/AdminJoinRequests";
import TenderDetails from "@/pages/tender-details";
import TenderEditPage from "@/pages/TenderEditPage";
import TenderCreateChoice from "@/pages/TenderCreateChoice";
import TenderTitleStep from "@/pages/TenderTitleStep";
import TenderStartMethodStep from "@/pages/TenderStartMethodStep";
import TenderProjectScopeStep from "@/pages/TenderProjectScopeStep";
import TenderAIBudgetStep from "@/pages/TenderAIBudgetStep";
import TenderSubmissionProcessStep from "@/pages/TenderSubmissionProcessStep";
import TenderEvaluationCriteriaStep from "@/pages/TenderEvaluationCriteriaStep";
import TenderVendorRequirementsStep from "@/pages/TenderVendorRequirementsStep";
import TenderBriefStep from "@/pages/TenderBriefStep";
import TenderFormBuilder from "@/pages/TenderFormBuilder";
import TenderFormFill from "@/pages/TenderFormFill";
import TenderReview from "@/pages/TenderReview";
import TenderAICopilot from "@/pages/TenderAICopilot";
import TenderInviteLink from "@/pages/TenderInviteLink";
import TeamInvite from "@/pages/team-invite";
import TractionLink from "@/pages/TractionLink";
import TractionLinkEditor from "@/pages/TractionLinkEditor";
import Landing from "@/pages/Landing";
import Settings from "@/pages/Settings";
import Marketplace from "@/pages/Marketplace";
import AdminMarketplace from "@/pages/AdminMarketplace";
import AdminAwards from "@/pages/AdminAwards";
import AdminUsers from "@/pages/AdminUsers";
import AdminAuditLogs from "@/pages/AdminAuditLogs";

import { isMarketplaceSubdomain } from "@/lib/subdomain";

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isMarketplace = useMemo(() => isMarketplaceSubdomain(), []);

  if (isMarketplace) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <Router>
            <Switch>
              <Route path="/" component={Marketplace} />
              <Route path="/invite/:id" component={TenderInviteLink} />
              <Route path="/login" component={Login} />
              <Route path="/signup" component={Register} />
              <Route path="/:rest*">{() => { window.location.href = '/'; return null; }}</Route>
            </Switch>
            <Toaster />
          </Router>
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Router>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Register} />
            <Route path="/company-onboarding" component={CompanyOnboarding} />
            <Route path="/verify-email" component={VerifyEmail} />
            <Route path="/onboarding" component={OnboardingChoice} />
            <Route path="/onboarding/company-basics" component={CompanyBasics} />
            <Route path="/onboarding/company-profile" component={CompanyProfile} />
            <Route path="/onboarding/invite-team" component={InviteTeam} />
            <Route path="/onboarding/company-documents" component={CompanyDocuments} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/admin/dashboard" component={AdminDashboard} />
            <Route path="/admin/vendors" component={AdminVendors} />
            <Route path="/admin/join-requests" component={AdminJoinRequests} />
            <Route path="/tenders/new" component={TenderCreateChoice} />
            <Route path="/tenders/new/ai" component={TenderAICopilot} />
            <Route path="/tenders/new/manual" component={TenderStartMethodStep} />
            <Route path="/tenders/new/title" component={TenderTitleStep} />
            <Route path="/tenders/new/project-scope" component={TenderProjectScopeStep} />
            <Route path="/tenders/new/ai-budget" component={TenderAIBudgetStep} />
            <Route path="/tenders/new/submission-process" component={TenderSubmissionProcessStep} />
            <Route path="/tenders/new/evaluation-criteria" component={TenderEvaluationCriteriaStep} />
            <Route path="/tenders/new/vendor-requirements" component={TenderVendorRequirementsStep} />
            <Route path="/tenders/new/brief" component={TenderBriefStep} />
            <Route path="/tenders/new/form-builder" component={TenderFormBuilder} />
            <Route path="/tenders/new/fill" component={TenderFormFill} />
            <Route path="/tenders/new/review" component={TenderReview} />
            <Route path="/invite/:id" component={TenderInviteLink} />
            <Route path="/team-invite/:token" component={TeamInvite} />
            <Route path="/tenders/:id/edit" component={TenderEditPage} />
            <Route path="/tenders/:id" component={TenderDetails} />
            <Route path="/traction/:slug/edit" component={TractionLinkEditor} />
            <Route path="/traction/:slug" component={TractionLink} />
            <Route path="/marketplace" component={Marketplace} />
            <Route path="/admin/marketplace" component={AdminMarketplace} />
            <Route path="/admin/awards" component={AdminAwards} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/audit-logs" component={AdminAuditLogs} />
            <Route path="/settings" component={Settings} />
          </Switch>
          <Toaster />
        </Router>
      </I18nProvider>
    </QueryClientProvider>
  );
}
