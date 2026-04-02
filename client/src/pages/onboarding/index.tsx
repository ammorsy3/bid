import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Building2, UserPlus, ArrowRight } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

export default function OnboardingChoice() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { t } = useI18n();

  useEffect(() => {
    if (!user) {
      setLocation("/signup");
      return;
    }
    if (!user.otpVerified) {
      setLocation("/verify-email");
      return;
    }
    if (activeCompany) {
      setLocation("/dashboard");
      return;
    }
    // If invite redirect is stored and points to /invite/*, go straight there
    const redirect = localStorage.getItem('postOnboardingRedirect');
    if (redirect && redirect.startsWith('/invite/')) {
      setLocation(redirect);
      localStorage.removeItem('postOnboardingRedirect');
      return;
    }
  }, [user, activeCompany, setLocation]);

  if (!user) return null;

  return (
    <OnboardingLayout step={0}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Welcome, {user.name.split(' ')[0]}!
        </h1>
        <p className="text-neutral-500 text-lg">
          How would you like to get started?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Create Company */}
        <Card
          className="cursor-pointer group hover:border-[#E25E45]/40 hover:shadow-lg transition-all duration-200 border-2 border-transparent"
          onClick={() => setLocation("/onboarding/company-basics")}
        >
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="mx-auto w-14 h-14 bg-[#E25E45]/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#E25E45]/15 transition-colors">
              <Building2 className="w-7 h-7 text-[#E25E45]" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Create a new company
            </h3>
            <p className="text-sm text-neutral-500 mb-5">
              Set up your company workspace, add your team, and start managing tenders.
            </p>
            <div className="flex items-center justify-center text-sm font-medium text-[#E25E45] group-hover:gap-2 transition-all">
              <span>Get started</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>

        {/* Join Existing */}
        <Card className="border-2 border-transparent">
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5">
              <UserPlus className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Join an existing company
            </h3>
            <p className="text-sm text-neutral-500 mb-5">
              You'll need an invitation link from your company admin. Check your email for an invite.
            </p>
            <div
              className="flex items-center justify-center text-sm font-medium text-neutral-400 cursor-default"
            >
              <span>Requires an invitation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </OnboardingLayout>
  );
}
