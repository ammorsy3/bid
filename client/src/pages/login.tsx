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
import { CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});
type ForgotForm = z.infer<typeof forgotSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { login, isLoading, user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [rememberDevice, setRememberDevice] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const forgotForm = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
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
    resolver: zodResolver(loginSchema),
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
      toast({
        title: t('common.error'),
        description: t('auth.loginError'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-white flex flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          className="size-full"
          squareSize={4}
          gridGap={6}
          color="rgb(226, 94, 69)"
          maxOpacity={0.15}
          flickerChance={0.1}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <header className="mb-10">
          <Link href="/">
            <h1 className="text-center text-4xl font-bold text-[#E25E45] tracking-tight cursor-pointer hover:opacity-80 transition-opacity">Bid</h1>
          </Link>
        </header>

        <div className="w-full max-w-md">
          {forgotMode ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/60 shadow-sm p-8">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-neutral-900 mb-1">{t('auth.forgotPasswordTitle')}</h2>
                <p className="text-sm text-neutral-500">{t('auth.forgotPasswordDesc')}</p>
              </div>

              {forgotSent ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-7 w-7 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('auth.resetLinkSent')}</h3>
                  <p className="text-sm text-neutral-500">{t('auth.resetLinkSentDesc')}</p>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setForgotSent(false); }}
                    className="text-sm text-[#E25E45] hover:text-[#d54d35] font-medium transition-colors"
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
                              <Input placeholder={t('auth.emailPlaceholder')} className="bg-white" {...field} />
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
                      className="text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                      {t('auth.backToLogin')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/60 shadow-sm p-8">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-neutral-900 mb-1">{t('authPanel.signInTitle')}</h2>
                <p className="text-sm text-neutral-500">{t('authPanel.signInDesc')}</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.email')}</FormLabel>
                        <FormControl>
                          <Input data-testid="input-email" placeholder={t('auth.emailPlaceholder')} className="bg-white" {...field} />
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
                            className="text-xs text-[#E25E45] hover:text-[#d54d35] font-medium transition-colors"
                          >
                            {t('auth.forgotPassword')}
                          </button>
                        </div>
                        <FormControl>
                          <Input data-testid="input-password" type="password" placeholder={t('auth.passwordPlaceholder')} className="bg-white" {...field} />
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
                    <label htmlFor="rememberDevice" className="text-sm text-neutral-600 cursor-pointer select-none">
                      Remember this device for 7 days
                    </label>
                  </div>

                  <NeonButton data-testid="button-submit" type="submit" size="lg" className="w-full mt-4" disabled={isLoading}>
                    {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                  </NeonButton>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-sm text-neutral-500">
                  {t('auth.noAccount')}{" "}
                  <Link href="/signup" className="text-[#E25E45] hover:text-[#d54d35] font-medium">
                    {t('auth.signUp')}
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
