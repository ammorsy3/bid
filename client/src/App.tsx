import { Switch, Route } from "wouter";
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
import TenderDetails from "@/pages/tender-details";
import InvitationLinks from "@/pages/invitation-links";
import InvitationSignup from "@/pages/invitation-signup";
import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";

function Router() {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
      <Route path="/tenders/:id" component={TenderDetails} />
      <Route path="/tenders/:id/invitations" component={InvitationLinks} />
      <Route path="/invite/:token" component={InvitationSignup} />
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
