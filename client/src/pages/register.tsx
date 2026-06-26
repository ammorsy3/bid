import { NeonButton } from "@/components/ui/neon-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { BidLogo } from "@/components/brand/BidLogo";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { ClerkSocialButtons } from "@/components/ClerkSocialButtons";
import { OnboardingLeftPanelAnimation } from "@/components/OnboardingLeftPanelAnimation";

type RegisterForm = { email: string; password: string; confirmPassword: string; name: string };

type PasswordChecks = {
  min8: boolean;
  min12: boolean;
  mixedCase: boolean;
  numberSymbol: boolean;
};

function checkPassword(pw: string): PasswordChecks {
  return {
    min8: pw.length >= 8,
    min12: pw.length >= 12,
    mixedCase: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    numberSymbol: /\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw),
  };
}

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; barClass: string; textClass: string } {
  if (!pw) return { score: 0, label: "", barClass: "bg-neutral-200", textClass: "text-neutral-400" };
  const checks = checkPassword(pw);
  const s = Number(checks.min8) + Number(checks.min12) + Number(checks.mixedCase) + Number(checks.numberSymbol);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const barClasses = ["bg-red-500", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-[var(--state-won)]"];
  const textClasses = ["text-red-600", "text-red-600", "text-orange-600", "text-yellow-700 dark:text-yellow-300", "text-[var(--state-won)]"];
  return {
    score: s as 0 | 1 | 2 | 3 | 4,
    label: labels[s],
    barClass: barClasses[s],
    textClass: textClasses[s],
  };
}

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { register, isLoading, user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const urlParams = new URLSearchParams(search);
  const invitationToken = urlParams.get('token');
  const redirectUrl = urlParams.get('redirect');

  const form = useForm<RegisterForm>({
    resolver: zodResolver(
      z.object({
        email: z.string().email(t('validation.invalidEmail')),
        password: z.string().min(8, t('validation.passwordMin')),
        confirmPassword: z.string(),
        name: z.string().min(2, t('validation.nameMin')),
      }).refine((data) => data.password === data.confirmPassword, {
        message: t('validation.passwordsNoMatch'),
        path: ["confirmPassword"],
      })
    ),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordValue = form.watch("password");
  const strength = scorePassword(passwordValue || "");
  const checks = checkPassword(passwordValue || "");
  const requirements: { key: keyof PasswordChecks; label: string }[] = [
    { key: "min8", label: t('auth.passwordReqMin8') },
    { key: "min12", label: t('auth.passwordReqMin12') },
    { key: "mixedCase", label: t('auth.passwordReqMixedCase') },
    { key: "numberSymbol", label: t('auth.passwordReqNumberSymbol') },
  ];
  const allMet = requirements.every(({ key }) => checks[key]);
  // Only show the requirements list when the user is actively interacting
  // with the password field AND hasn't satisfied all rules yet. Once the
  // password is strong enough, collapse it to keep the form compact.
  const showRequirements = passwordFocused && !!passwordValue && !allMet;

  useEffect(() => {
    if (user && user.otpVerified) {
      const { activeCompany } = useAuthStore.getState();
      if (activeCompany) {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
    }
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword: _, ...registerData } = data;
      await register(registerData);
      toast({
        title: t('common.success'),
        description: t('auth.registerSuccess'),
      });
      if (redirectUrl) {
        localStorage.setItem('postOnboardingRedirect', decodeURIComponent(redirectUrl));
      } else if (invitationToken) {
        localStorage.setItem('postOnboardingRedirect', `/invite/${invitationToken}`);
      }
      setLocation("/verify-email");
    } catch (error: any) {
      let description = t('auth.registerError');
      if (error?.message === 'User already exists') {
        description = t('auth.userAlreadyExists');
      } else if (error?.message) {
        description = error.message;
      }
      toast({
        title: t('common.error'),
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">

      {/* Left panel — warm cream with animated illustration */}
      <div
        className="hidden lg:flex lg:w-[440px] xl:w-[480px] relative overflow-hidden flex-shrink-0"
        style={{ background: "radial-gradient(ellipse at 60% 25%, #FCE9DC 0%, #F4EDE1 68%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 -left-20 w-96 h-96 bg-[#FE3C01]/[0.07] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-0 w-80 h-80 bg-[#FE3C01]/[0.05] rounded-full blur-3xl" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(11,9,7,0.45) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: 0.045,
            }}
          />
        </div>
        <div className="relative z-10 flex items-center justify-center w-full h-full p-8 xl:p-10">
          <OnboardingLeftPanelAnimation />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col bg-muted overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <header className="mb-6">
            <Link href="/">
              <BidLogo variant="orange" size={48} className="cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
          </header>

          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 sm:p-8">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-foreground mb-1">{t('authPanel.createAccountTitle')}</h2>
                <p className="text-sm text-muted-foreground">{t('authPanel.createAccountDesc')}</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.fullName')}</FormLabel>
                        <FormControl>
                          <Input data-testid="input-name" placeholder={t('auth.fullNamePlaceholder')} className="bg-card" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.email')}</FormLabel>
                        <FormControl>
                          <Input data-testid="input-email" type="email" placeholder={t('auth.emailPlaceholder')} className="bg-card" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.password')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              data-testid="input-password"
                              type={showPassword ? "text" : "password"}
                              placeholder={t('auth.passwordCreatePlaceholder')}
                              className="bg-card pr-10"
                              {...field}
                              onFocus={() => setPasswordFocused(true)}
                              onBlur={(e) => { field.onBlur(); setPasswordFocused(false); }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(s => !s)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-muted-foreground p-1"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        {passwordValue && (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex gap-1" aria-hidden="true">
                              {[1, 2, 3, 4].map(i => (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-colors ${
                                    i <= strength.score ? strength.barClass : "bg-neutral-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className={`text-xs ${strength.textClass}`}>{strength.label}</p>
                          </div>
                        )}
                        {showRequirements && (
                          <ul className="mt-2 space-y-1" data-testid="password-requirements">
                            {requirements.map(({ key, label }) => {
                              const passed = checks[key];
                              return (
                                <li
                                  key={key}
                                  data-testid={`pw-req-${key}`}
                                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                                    passed ? "text-[var(--state-won)]" : "text-muted-foreground"
                                  }`}
                                >
                                  {passed ? (
                                    <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  ) : (
                                    <X className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden="true" />
                                  )}
                                  <span>{label}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('authPanel.confirmPasswordLabel')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              data-testid="input-confirm-password"
                              type={showConfirm ? "text" : "password"}
                              placeholder={t('authPanel.reenterPassword')}
                              className="bg-card pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(s => !s)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-muted-foreground p-1"
                              aria-label={showConfirm ? "Hide password" : "Show password"}
                              tabIndex={-1}
                            >
                              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <NeonButton data-testid="button-submit" type="submit" size="lg" className="w-full mt-6" disabled={isLoading}>
                    {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                  </NeonButton>
                </form>
              </Form>

              <ClerkSocialButtons mode="signup" />

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('auth.haveAccount')}{" "}
                  <Link href="/login" className="text-[#FE3C01] hover:text-[#d54d35] font-medium">
                    {t('auth.signInLink')}
                  </Link>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  By creating an account you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-foreground" data-testid="link-terms">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="underline hover:text-foreground" data-testid="link-privacy">Privacy Policy</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
