import { NeonButton } from "@/components/ui/neon-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useFormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { emailInputProps } from "@/lib/form-validation";
import { BidLogo } from "@/components/brand/BidLogo";
import { AlertCircle, Check, Eye, EyeOff, X } from "lucide-react";
import { ClerkSocialButtons } from "@/components/ClerkSocialButtons";
import { OnboardingLeftPanelAnimation } from "@/components/OnboardingLeftPanelAnimation";
import { useForceLightMode } from "@/hooks/useForceLightMode";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ApiError } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; labelKey: string; barClass: string; textClass: string } {
  if (!pw) return { score: 0, labelKey: "", barClass: "bg-neutral-200", textClass: "text-neutral-400" };
  const checks = checkPassword(pw);
  const s = Number(checks.min8) + Number(checks.min12) + Number(checks.mixedCase) + Number(checks.numberSymbol);
  const labelKeys = [
    "auth.passwordStrengthTooShort",
    "auth.passwordStrengthWeak",
    "auth.passwordStrengthFair",
    "auth.passwordStrengthGood",
    "auth.passwordStrengthStrong",
  ];
  const barClasses = ["bg-red-500", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-[var(--state-won)]"];
  const textClasses = ["text-red-600", "text-red-600", "text-orange-600", "text-yellow-700 dark:text-yellow-300", "text-[var(--state-won)]"];
  return {
    score: s as 0 | 1 | 2 | 3 | 4,
    labelKey: labelKeys[s],
    barClass: barClasses[s],
    textClass: textClasses[s],
  };
}

// Under the email field: the usual validation message, or — when the email
// already has an account — the same message with "sign in" as a link, since the
// page's own sign-in link is far below the fold on a phone.
function EmailFieldMessage() {
  const { error, formMessageId } = useFormField();
  const { t } = useI18n();
  if (error?.type !== "taken") return <FormMessage />;
  const [before, after = ""] = t("auth.userAlreadyExists").split("{link}");
  return (
    <p id={formMessageId} data-testid="email-taken" className="text-sm font-medium text-destructive">
      {before}
      <Link href="/login" className="underline underline-offset-2 hover:text-destructive/80">
        {t("auth.userAlreadyExistsLink")}
      </Link>
      {after}
    </p>
  );
}

export default function Register() {
  useForceLightMode();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { register, isLoading, sessionConfirmed } = useAuthStore();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();

  const urlParams = new URLSearchParams(search);
  const invitationToken = urlParams.get('token');
  const redirectUrl = urlParams.get('redirect');

  const form = useForm<RegisterForm>({
    resolver: zodResolver(
      z.object({
        email: z.string().trim().email(t('validation.invalidEmail')),
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
  const [transitioning, setTransitioning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const signedUpHere = useRef(false);
  // Password fields type left-to-right even in Arabic, so the room kept for the
  // eye button is a physical side: the end of the row (left in Arabic).
  const passwordPadding = isRtl ? "pl-11 md:pl-10" : "pr-11 md:pr-10";
  const eyeButtonClass =
    "absolute end-0 top-1/2 -translate-y-1/2 flex h-11 w-11 md:h-10 md:w-10 items-center justify-center text-neutral-400 hover:text-muted-foreground";
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

  // Someone already signed in doesn't need this page, but only once the server
  // has confirmed the session this device remembers: an expired one must see
  // the form, not bounce through the dashboard back to /login.
  useEffect(() => {
    if (!sessionConfirmed || signedUpHere.current) return;
    const { user, activeCompany } = useAuthStore.getState();
    if (user?.otpVerified) {
      if (activeCompany) {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
    }
  }, [sessionConfirmed, setLocation]);

  const onSubmit = async (data: RegisterForm) => {
    setFormError(null);
    try {
      const { confirmPassword: _, ...registerData } = data;
      signedUpHere.current = true;
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
      // Hold a branded veil for a beat so account creation lands deliberately,
      // mirroring the sign-in flow, before routing on to verification.
      setTransitioning(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setLocation("/verify-email");
    } catch (error: any) {
      signedUpHere.current = false;
      // Say what went wrong inside the form rather than in a toast: toasts
      // covered the logo on phones and the social buttons on desktop, and the
      // server's own wording is English only.
      if (error?.message === 'User already exists') {
        form.setError('email', {
          type: 'taken',
          message: t('auth.userAlreadyExists', { link: t('auth.userAlreadyExistsLink') }),
        });
      } else {
        const status = error instanceof ApiError ? error.statusCode : undefined;
        setFormError(status === 429 ? t('auth.tooManyAttempts') : t('auth.registerError'));
      }
    }
  };

  return (
    <div className="min-h-dvh flex lg:h-screen lg:overflow-hidden">
      {transitioning && <FullscreenLoader label={t('auth.preparingWorkspace')} />}

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

      {/* Right panel — form. Phones scroll the page itself; the locked,
          screen-high layout with its own scroller is for lg: and up. */}
      <div className="flex-1 min-w-0 flex flex-col bg-muted lg:overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <header className="relative mb-6 flex w-full justify-center">
            <Link href="/" className="inline-flex">
              <BidLogo variant="orange" size={48} className="cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
            <LanguageSwitch className="absolute end-0 top-1/2 -translate-y-1/2 -me-1" />
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
                          <Input data-testid="input-email" {...emailInputProps} autoComplete="email" placeholder={t('auth.emailPlaceholder')} className="bg-card" {...field} />
                        </FormControl>
                        <EmailFieldMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.password')}</FormLabel>
                        <div className="relative">
                          {/* Typed left-to-right in Arabic too, so its padding sides are
                              physical: keep the eye button's side (the end of the row) clear. */}
                          <FormControl>
                            <Input
                              data-testid="input-password"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              dir="ltr"
                              placeholder={t('auth.passwordCreatePlaceholder')}
                              className={cn("bg-card", passwordPadding)}
                              {...field}
                              onFocus={() => setPasswordFocused(true)}
                              onBlur={(e) => { field.onBlur(); setPasswordFocused(false); }}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            className={eyeButtonClass}
                            aria-label={showPassword ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
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
                            <p className={`text-xs ${strength.textClass}`}>{strength.labelKey ? t(strength.labelKey) : ""}</p>
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
                        <div className="relative">
                          <FormControl>
                            <Input
                              data-testid="input-confirm-password"
                              type={showConfirm ? "text" : "password"}
                              autoComplete="new-password"
                              dir="ltr"
                              placeholder={t('authPanel.reenterPassword')}
                              className={cn("bg-card", passwordPadding)}
                              {...field}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowConfirm(s => !s)}
                            className={eyeButtonClass}
                            aria-label={showConfirm ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                            tabIndex={-1}
                          >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {formError && (
                    <div
                      role="alert"
                      data-testid="signup-error"
                      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <NeonButton data-testid="button-submit" type="submit" size="lg" className="w-full mt-6" disabled={isLoading}>
                    {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                  </NeonButton>
                </form>
              </Form>

              <ClerkSocialButtons mode="signup" />

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('auth.haveAccount')}{" "}
                  {/* 44px tap area without moving anything (padding taken back
                      out of the margins; the 12px gap below is its limit). */}
                  <Link href="/login" className="inline-block py-3 -my-3 text-[#FE3C01] hover:text-[#d54d35] font-medium">
                    {t('auth.signInLink')}
                  </Link>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('auth.accountAgreementPrefix')}{" "}
                  <Link href="/terms" className="underline whitespace-nowrap hover:text-foreground" data-testid="link-terms">{t('terms.pageTitle')}</Link>
                  {/* Arabic "و" attaches to the next word: no space after it. */}
                  {" "}{t('auth.accountAgreementAnd')}{isRtl ? "" : " "}
                  <Link href="/privacy" className="underline whitespace-nowrap hover:text-foreground" data-testid="link-privacy">{t('privacy.pageTitle')}</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
