import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { Building2, Users, User, ArrowRight } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const CHOICES = [
  {
    key: "company",
    icon: Building2,
    title: "I'm a Company",
    description: "Registered business looking to post tenders, manage vendors, and evaluate proposals.",
    route: "/onboarding/company-basics",
    color: "text-[#FE3C01]",
    bg: "bg-[#FE3C01]/10",
    hover: "hover:border-[#FE3C01]/40",
  },
  {
    key: "team",
    icon: Users,
    title: "I'm a Team",
    description: "A group of freelancers working together. Collaborate and respond to RFPs as a team.",
    route: "/onboarding/team-basics",
    color: "text-[var(--bid-blue,#2563EB)]",
    bg: "bg-blue-50",
    hover: "hover:border-blue-300",
  },
  {
    key: "individual",
    icon: User,
    title: "I'm a Freelancer",
    description: "Solo professional. Build your profile, showcase your work, and respond to opportunities.",
    route: "/onboarding/individual-basics",
    color: "text-[var(--state-won)]",
    bg: "bg-[var(--state-won)]/10",
    hover: "hover:border-[var(--state-won)]/40",
  },
] as const;

export default function AccountTypeChoice() {
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    if (activeCompany) { setLocation("/dashboard"); return; }
  }, [user, activeCompany, setLocation]);

  if (!user) return null;

  return (
    <OnboardingLayout>
      <div className="text-center mb-8">
        <h1 className="font-display font-black text-3xl text-foreground mb-2 tracking-[-0.04em]">
          How are you joining Bid?
        </h1>
        <p className="text-muted-foreground text-base">
          Choose the account type that best describes you.
        </p>
      </div>

      <div className="space-y-3">
        {CHOICES.map(({ key, icon: Icon, title, description, route, color, bg, hover }) => (
          <Card
            key={key}
            className={`cursor-pointer group ${hover} hover:shadow-md transition-all duration-200 border-2 border-transparent`}
            onClick={() => setLocation(route)}
          >
            <CardContent className="pt-5 pb-5 px-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
                </div>
                <ArrowRight className={`w-5 h-5 ${color} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </OnboardingLayout>
  );
}
