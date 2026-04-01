import { ReactNode } from "react";
import { FileText, BarChart3, Shield, Zap } from "lucide-react";

interface OnboardingLayoutProps {
  children: ReactNode;
  step?: number; // 0 = choice, 1 = basics, 2 = profile, 3 = team
}

const STEPS = [
  { label: "Basics", num: 1 },
  { label: "Profile", num: 2 },
  { label: "Team", num: 3 },
];

export default function OnboardingLayout({ children, step }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[480px] bg-gradient-to-br from-[#E25E45] via-[#d04a32] to-[#b83a24] relative overflow-hidden flex-shrink-0">
        {/* Decorative shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-16 -left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-16">
              <img src="/bid-logo.png" alt="Bid" className="h-8 brightness-0 invert" />
            </div>

            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Set up your workspace in minutes
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              Create your company profile, invite your team, and start managing tenders on the most modern procurement platform in Saudi Arabia.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-5 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-0.5">Create RFPs with AI</h3>
                <p className="text-sm text-white/50">Draft professional tenders in seconds with our AI copilot.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-0.5">Compare proposals</h3>
                <p className="text-sm text-white/50">Side-by-side vendor comparison with scoring and analytics.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-0.5">Saudi-ready compliance</h3>
                <p className="text-sm text-white/50">CR verification, VAT handling, and local business standards built in.</p>
              </div>
            </div>
          </div>

          {/* Bottom trust line */}
          <div className="mt-12 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Zap className="w-4 h-4" />
              <span>Trusted by companies across Saudi Arabia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-neutral-50">
        {/* Top bar with logo (mobile) + step indicator */}
        <div className="p-6 pb-0">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <img src="/bid-logo.png" alt="Bid" className="h-7" />
          </div>

          {/* Step indicator — only show for steps 1-3 */}
          {step && step >= 1 && (
            <div className="flex items-center justify-center gap-1 mb-2 max-w-xl mx-auto w-full">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center gap-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step > s.num
                        ? 'bg-green-500 text-white'
                        : step === s.num
                          ? 'bg-[#E25E45] text-white'
                          : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      {step > s.num ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : s.num}
                    </div>
                    <span className={`text-sm hidden sm:inline ${
                      step === s.num ? 'font-medium text-neutral-900' : 'text-neutral-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-10 h-px mx-1 ${step > s.num ? 'bg-green-300' : 'bg-neutral-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
