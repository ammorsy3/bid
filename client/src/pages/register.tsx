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
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Eye, EyeOff } from "lucide-react";

type RegisterForm = { email: string; password: string; confirmPassword: string; name: string };

function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; barClass: string; textClass: string } {
  if (!pw) return { score: 0, label: "", barClass: "bg-neutral-200", textClass: "text-neutral-400" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const barClasses = ["bg-red-500", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const textClasses = ["text-red-600", "text-red-600", "text-orange-600", "text-yellow-700", "text-emerald-600"];
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
  const passwordValue = form.watch("password");
  const strength = scorePassword(passwordValue || "");

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
      try {
        const raw = error?.message ?? '';
        const jsonStr = raw.includes(': ') ? raw.slice(raw.indexOf(': ') + 2) : raw;
        const parsed = JSON.parse(jsonStr);
        if (parsed?.message) description = parsed.message;
      } catch {}
      toast({
        title: t('common.error'),
        description,
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/60 shadow-sm p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-neutral-900 mb-1">{t('authPanel.createAccountTitle')}</h2>
              <p className="text-sm text-neutral-500">{t('authPanel.createAccountDesc')}</p>
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
                        <Input data-testid="input-name" placeholder={t('auth.fullNamePlaceholder')} className="bg-white" {...field} />
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
                        <Input data-testid="input-email" type="email" placeholder={t('auth.emailPlaceholder')} className="bg-white" {...field} />
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
                            className="bg-white pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
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
                            className="bg-white pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(s => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
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

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                {t('auth.haveAccount')}{" "}
                <Link href="/login" className="text-[#E25E45] hover:text-[#d54d35] font-medium">
                  {t('auth.signInLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
