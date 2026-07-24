import { useEffect, useMemo } from "react";
import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider as AriaI18nProvider } from "react-aria-components";
import { queryClient } from "@/lib/queryClient";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import Dashboard from "@/pages/Dashboard";
import DashboardGuard from "@/pages/DashboardGuard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";
import CompanyOnboarding from "@/pages/CompanyOnboarding";
import VerifyEmail from "@/pages/verify-email";
import OnboardingChoice from "@/pages/onboarding/index";
import AccountTypeChoice from "@/pages/onboarding/account-type";
import CompanyBasics from "@/pages/onboarding/company-basics";
import CompanyProfile from "@/pages/onboarding/company-profile";
import InviteTeam from "@/pages/onboarding/invite-team";
import CompanyDocuments from "@/pages/onboarding/company-documents";
import IndividualBasics from "@/pages/onboarding/individual-basics";
import IndividualVerify from "@/pages/onboarding/individual-verify";
import TeamBasics from "@/pages/onboarding/team-basics";
import TeamInviteOnboarding from "@/pages/onboarding/team-invite";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminVendors from "@/pages/AdminVendors";
import AdminFreelancers from "@/pages/AdminFreelancers";
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
import SettingsIntegrations from "@/pages/SettingsIntegrations";
import DocsPage from "@/pages/docs/DocsPage";
import CompanyProfilePage from "@/pages/CompanyProfilePage";
import CompanyProfileEditor from "@/pages/CompanyProfileEditor";
import ProfileEditorRouter from "@/pages/ProfileEditorRouter";
import IndividualProfileEditor from "@/pages/IndividualProfileEditor";
import JoinByCode from "@/pages/JoinByCode";
import Marketplace from "@/pages/Marketplace";
import AdminMarketplace from "@/pages/AdminMarketplace";
import AdminAwards from "@/pages/AdminAwards";
import AdminUsers from "@/pages/AdminUsers";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import AdminErrors from "@/pages/AdminErrors";
import AdminNotifications from "@/pages/AdminNotifications";
import ClerkCallback from "@/pages/ClerkCallback";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import GettingStarted from "@/pages/GettingStarted";
import FAQ from "@/pages/FAQ";

import { isMarketplaceSubdomain } from "@/lib/subdomain";

// react-aria's date pickers default to the Hijri calendar for Arabic locales;
// force Gregorian regardless of language so dates never render as Hijri.
function AriaLocaleProvider({ children }: { children: React.ReactNode }) {
  const { language } = useI18n();
  return (
    <AriaI18nProvider locale={language === "ar" ? "ar-SA-u-ca-gregory" : "en-US"}>
      {children}
    </AriaI18nProvider>
  );
}

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
          <AriaLocaleProvider>
            <Router>
              <Switch>
                <Route path="/" component={Marketplace} />
                <Route path="/invite/:id" component={TenderInviteLink} />
                <Route path="/login" component={Login} />
                <Route path="/signup" component={Register} />
                <Route path="/auth/clerk-callback" component={ClerkCallback} />
                <Route path="/sso-callback" component={ClerkCallback} />
                <Route path="/terms" component={Terms} />
                <Route path="/privacy" component={Privacy} />
                <Route path="/:rest*">{() => { window.location.href = '/'; return null; }}</Route>
              </Switch>
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </Router>
          </AriaLocaleProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AriaLocaleProvider>
          <Router>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/login" component={Login} />
              <Route path="/signup" component={Register} />
              <Route path="/join/:code" component={JoinByCode} />
              <Route path="/auth/clerk-callback" component={ClerkCallback} />
              <Route path="/sso-callback" component={ClerkCallback} />
              <Route path="/reset-password" component={ResetPassword} />
              <Route path="/company-onboarding" component={CompanyOnboarding} />
              <Route path="/verify-email" component={VerifyEmail} />
              <Route path="/onboarding" component={OnboardingChoice} />
              <Route path="/onboarding/account-type" component={AccountTypeChoice} />
              <Route path="/onboarding/company-basics" component={CompanyBasics} />
              <Route path="/onboarding/company-profile" component={CompanyProfile} />
              <Route path="/onboarding/invite-team" component={InviteTeam} />
              <Route path="/onboarding/company-documents" component={CompanyDocuments} />
              <Route path="/onboarding/individual-basics" component={IndividualBasics} />
              <Route path="/onboarding/individual-profile" component={IndividualProfileEditor} />
              <Route path="/onboarding/individual-verify" component={IndividualVerify} />
              <Route path="/onboarding/team-basics" component={TeamBasics} />
              <Route path="/onboarding/team-invite" component={TeamInviteOnboarding} />
              <Route path="/dashboard" component={DashboardGuard} />
              <Route path="/admin/dashboard" component={AdminDashboard} />
              <Route path="/admin/notifications" component={AdminNotifications} />
              <Route path="/admin/vendors" component={AdminVendors} />
              <Route path="/admin/freelancers" component={AdminFreelancers} />
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
              <Route path="/company/edit" component={ProfileEditorRouter} />
              <Route path="/company/:slug" component={CompanyProfilePage} />
              <Route path="/traction/:slug/edit" component={TractionLinkEditor} />
              <Route path="/traction/:slug" component={TractionLink} />
              <Route path="/marketplace" component={Marketplace} />
              <Route path="/admin/marketplace" component={AdminMarketplace} />
              <Route path="/admin/awards" component={AdminAwards} />
              <Route path="/admin/users" component={AdminUsers} />
              <Route path="/admin/audit-logs" component={AdminAuditLogs} />
              <Route path="/admin/errors" component={AdminErrors} />
              <Route path="/settings/integrations" component={SettingsIntegrations} />
              <Route path="/settings" component={Settings} />
              <Route path="/docs" component={DocsPage} />
              <Route path="/docs/:slug" component={DocsPage} />
              <Route path="/getting-started" component={GettingStarted} />
              <Route path="/faq" component={FAQ} />
              <Route path="/terms" component={Terms} />
              <Route path="/privacy" component={Privacy} />
            </Switch>
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </Router>
        </AriaLocaleProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
