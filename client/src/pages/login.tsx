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
import { Building2, Shield, Users, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

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
      setForgotSent(true); // still show success to prevent enumeration
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
      // On marketplace subdomain, redirect to main domain for dashboard/onboarding
      if (isMarketplaceSubdomain()) {
        const mainDomain = window.location.hostname.replace(/^marketplace\./, '');
        const mainOrigin = `${window.location.protocol}//${mainDomain}${window.location.port ? ':' + window.location.port : ''}`;
        const target = activeCompany ? '/dashboard' : '/onboarding';
        window.location.href = `${mainOrigin}${target}`;
        return;
      }

      // If OTP not verified for this session, go to verification
      if (!user.otpVerified) {
        if (redirectUrl) {
          localStorage.setItem('postOnboardingRedirect', decodeURIComponent(redirectUrl));
        } else if (invitationToken) {
          localStorage.setItem('postOnboardingRedirect', `/invite/${invitationToken}`);
        }
        setLocation("/verify-email");
        return;
      }
      // If user has a company, go to redirect or dashboard
      if (activeCompany) {
        if (invitationToken) {
          setLocation(`/invite/${invitationToken}`);
        } else if (redirectUrl) {
          setLocation(decodeURIComponent(redirectUrl));
        } else {
          setLocation("/dashboard");
        }
      } else {
        // User needs to create a company
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
      // Pass trusted browser token if one exists
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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-2xl font-bold tracking-tight">Bid</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Welcome back
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Sign in to manage your tenders, track proposals, and collaborate with your team.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Company Workspaces</h3>
                <p className="text-sm text-white/60">Organize your team and manage multiple projects under one roof.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Vendor Management</h3>
                <p className="text-sm text-white/60">Build your vendor base and invite suppliers to bid on your projects.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Secure & Compliant</h3>
                <p className="text-sm text-white/60">Built for Saudi businesses with CR verification and compliance tools.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-neutral-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold text-neutral-900">Bid</span>
          </div>

          {forgotMode ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('auth.forgotPasswordTitle')}</h2>
                <p className="text-neutral-500">{t('auth.forgotPasswordDesc')}</p>
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
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
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
                              <Input placeholder={t('auth.emailPlaceholder')} {...field} />
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
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Sign in to your account</h2>
                <p className="text-neutral-500">Enter your credentials to continue.</p>
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
                          <Input data-testid="input-email" placeholder={t('auth.emailPlaceholder')} {...field} />
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
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                          >
                            {t('auth.forgotPassword')}
                          </button>
                        </div>
                        <FormControl>
                          <Input data-testid="input-password" type="password" placeholder={t('auth.passwordPlaceholder')} {...field} />
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
                  <Link href="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                    {t('auth.signUp')}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
