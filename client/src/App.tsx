import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import RequesterDashboard from "@/pages/requester-dashboard";
import RequesterProfile from "@/pages/RequesterProfile";
import VendorDashboard from "@/pages/vendor-dashboard";
import VendorPreQualification from "@/pages/VendorPreQualification";
import VendorOnboarding from "@/pages/VendorOnboarding";
import VendorStatus from "@/pages/VendorStatus";
import TenderDetails from "@/pages/tender-details";
import InvitationLinks from "@/pages/invitation-links";
import InvitationSignup from "@/pages/invitation-signup";
import TractionLink from "@/pages/TractionLink";
import VendorInvitation from "@/pages/VendorInvitation";
import VendorsBase from "@/pages/VendorsBase";
import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";

function Router() {
  const { user, checkAuth } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect vendors with draft onboarding state to complete onboarding
  useEffect(() => {
    if (user && user.role === 'vendor' && user.onboardingState === 'draft') {
      // Strip query params to correctly identify public pages
      const pathname = location.split('?')[0];
      
      // Exclude auth pages and onboarding page itself from redirect
      const isPublicPage = 
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/register' ||
        pathname.startsWith('/vendor-onboarding');
      
      if (!isPublicPage) {
        // Preserve the intended destination as a redirect parameter
        const redirectParam = encodeURIComponent(location);
        setLocation(`/vendor-onboarding?redirect=${redirectParam}`);
      }
    }
  }, [user, location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        {user?.role === 'requester' ? <RequesterDashboard /> : <VendorDashboard />}
      </Route>
      <Route path="/requester-profile" component={RequesterProfile} />
      <Route path="/vendor-dashboard" component={VendorDashboard} />
      <Route path="/vendor-prequalification" component={VendorPreQualification} />
      <Route path="/vendor-onboarding" component={VendorOnboarding} />
      <Route path="/vendor-status" component={VendorStatus} />
      <Route path="/tenders/:id" component={TenderDetails} />
      <Route path="/tenders/:id/invitations" component={InvitationLinks} />
      <Route path="/invite/:token" component={InvitationSignup} />
      <Route path="/r/:slug" component={TractionLink} />
      <Route path="/vendor-invitation/:token" component={VendorInvitation} />
      <Route path="/vendors-base" component={VendorsBase} />
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
