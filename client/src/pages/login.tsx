import { NeonButton } from "@/components/ui/neon-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { isMarketplaceSubdomain } from "@/lib/subdomain";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { BidLogo } from "@/components/brand/BidLogo";
import { ClerkSocialButtons } from "@/components/ClerkSocialButtons";
import { OnboardingLeftPanelAnimation } from "@/components/OnboardingLeftPanelAnimation";
import { useForceLightMode } from "@/hooks/useForceLightMode";

type LoginForm = { email: string; password: string };
type ForgotForm = { email: string };

export default function Login() {
  useForceLightMode();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { login, isLoading, user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [rememberDevice, setRememberDevice] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const forgotForm = useForm<ForgotForm>({
    resolver: zodResolver(z.object({
      email: z.string().email(t('validation.invalidEmail')),
    })),
    defaultValues: { email: "" },
  });

  const onForgotSubmit = async (data: ForgotForm) => {
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: data.email });
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    }
  };

  const urlParams = new URLSearchParams(search);
  const invitationToken = urlParams.get('token');
  const redirectUrl = urlParams.get('redirect');

  const form = useForm<LoginForm>({
    resolver: zodResolver(z.object({
      email: z.string().email(t('validation.invalidEmail')),
      password: z.string().min(6, t('validation.passwordMin')),
    })),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      if (isMarketplaceSubdomain()) {
        const mainDomain = window.location.hostname.replace(/^marketplace\./, '');
        const mainOrigin = `${window.location.protocol}//${mainDomain}${window.location.port ? ':' + window.location.port : ''}`;
        const target = activeCompany ? '/dashboard' : '/onboarding';
        window.location.href = `${mainOrigin}${target}`;
        return;
      }

      if (!user.otpVerified) {
        if (redirectUrl) {
          localStorage.setItem('postOnboardingRedirect', decodeURIComponent(redirectUrl));
        } else if (invitationToken) {
          localStorage.setItem('postOnboardingRedirect', `/invite/${invitationToken}`);
        }
        setLocation("/verify-email");
        return;
      }
      if (activeCompany) {
        if (invitationToken) {
          setLocation(`/invite/${invitationToken}`);
        } else if (redirectUrl) {
          setLocation(decodeURIComponent(redirectUrl));
        } else {
          setLocation("/dashboard");
        }
      } else {
        if (redirectUrl) {
          localStorage.setItem('postOnboardingRedirect', decodeURIComponent(redirectUrl));
        } else if (invitationToken) {
          localStorage.setItem('postOnboardingRedirect', `/invite/${invitationToken}`);
        }
        setLocation("/onboarding");
      }
    }
  }, [user, activeCompany, setLocation, invitationToken, redirectUrl]);

  const onSubmit = async (data: LoginForm) => {
    setLoginError(null);
    try {
      const trustedToken = localStorage.getItem('trustedBrowserToken');
      sessionStorage.setItem('otp_sent_by_login', 'true');
      if (rememberDevice) {
        sessionStorage.setItem('remember_browser', 'true');
      }
      await login(data.email, data.password, trustedToken || undefined);
      toast({
        title: t('common.success'),
        description: t('auth.loginSuccess'),
      });
    } catch (error) {
      sessionStorage.removeItem('otp_sent_by_login');
      sessionStorage.removeItem('remember_browser');
      // Map the failure to a specific, persistent inline message.
      const status = error instanceof ApiError ? error.statusCode : undefined;
      const message =
        status === 401 ? t('auth.loginError')
        : status === 429 ? t('auth.loginErrorRateLimit')
        : t('auth.loginErrorGeneric');
      setLoginError(message);
      toast({
        title: t('common.error'),
        description: message,
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
            {forgotMode ? (
              <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 sm:p-8">
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-bold text-foreground mb-1">{t('auth.forgotPasswordTitle')}</h2>
                  <p className="text-sm text-muted-foreground">{t('auth.forgotPasswordDesc')}</p>
                </div>

                {forgotSent ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-7 w-7 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('auth.resetLinkSent')}</h3>
                    <p className="text-sm text-muted-foreground">{t('auth.resetLinkSentDesc')}</p>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(false); setForgotSent(false); }}
                      className="text-sm text-[#FE3C01] hover:text-[#d54d35] font-medium transition-colors"
                    >
                      {t('auth.backToLogin')}
                    </button>
                  </div>
                ) : (
                  <>
                    <Form {...forgotForm}>
                      <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
                        <FormField
                          control={forgotForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.email')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('auth.emailPlaceholder')} className="bg-card" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <NeonButton type="submit" size="lg" className="w-full mt-2" disabled={forgotForm.formState.isSubmitting}>
                          {forgotForm.formState.isSubmitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
                        </NeonButton>
                      </form>
                    </Form>
                    <div className="mt-5 text-center">
                      <button
                        type="button"
                        onClick={() => setForgotMode(false)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t('auth.backToLogin')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 sm:p-8">
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-bold text-foreground mb-1">{t('authPanel.signInTitle')}</h2>
                  <p className="text-sm text-muted-foreground">{t('authPanel.signInDesc')}</p>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    data-testid="login-error"
                    className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth.email')}</FormLabel>
                          <FormControl>
                            <Input data-testid="input-email" placeholder={t('auth.emailPlaceholder')} className="bg-card" {...field} onChange={(e) => { field.onChange(e); if (loginError) setLoginError(null); }} />
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
                          <div className="flex items-center justify-between">
                            <FormLabel>{t('auth.password')}</FormLabel>
                            <button
                              type="button"
                              onClick={() => setForgotMode(true)}
                              className="text-xs text-[#FE3C01] hover:text-[#d54d35] font-medium transition-colors"
                            >
                              {t('auth.forgotPassword')}
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input
                                data-testid="input-password"
                                type={showPassword ? "text" : "password"}
                                placeholder={t('auth.passwordPlaceholder')}
                                className="bg-card pr-10"
                                {...field}
                                onChange={(e) => { field.onChange(e); if (loginError) setLoginError(null); }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(s => !s)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-muted-foreground p-1"
                                aria-label={showPassword ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                                tabIndex={-1}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-2 mt-4">
                      <Checkbox
                        id="rememberDevice"
                        checked={rememberDevice}
                        onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                        data-testid="checkbox-remember"
                      />
                      <label htmlFor="rememberDevice" className="text-sm text-muted-foreground cursor-pointer select-none">
                        {t('auth.rememberDevice')}
                      </label>
                    </div>

                    <NeonButton data-testid="button-submit" type="submit" size="lg" className="w-full mt-4" disabled={isLoading}>
                      {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                    </NeonButton>
                  </form>
                </Form>

                <ClerkSocialButtons mode="signin" />

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.noAccount')}{" "}
                    <Link href="/signup" className="text-[#FE3C01] hover:text-[#d54d35] font-medium">
                      {t('auth.signUp')}
                    </Link>
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <Link href="/terms" className="hover:text-foreground" data-testid="link-terms">{t('terms.pageTitle')}</Link>
                    <span className="mx-2">·</span>
                    <Link href="/privacy" className="hover:text-foreground" data-testid="link-privacy">{t('privacy.pageTitle')}</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
