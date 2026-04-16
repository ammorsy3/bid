import { NeonButton } from "@/components/ui/neon-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

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
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });

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
                        <Input data-testid="input-password" type="password" placeholder={t('auth.passwordCreatePlaceholder')} className="bg-white" {...field} />
                      </FormControl>
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
                        <Input data-testid="input-confirm-password" type="password" placeholder={t('authPanel.reenterPassword')} className="bg-white" {...field} />
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
