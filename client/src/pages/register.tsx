import { NeonButton } from "@/components/ui/neon-button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Building2, Shield, Users, Zap } from "lucide-react";
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

  // If user is already logged in and verified, send them where they need to go.
  // But don't redirect if they just arrived — let them create a new account (they can log out).
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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-white relative overflow-hidden">
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
        <div className="relative z-10 flex flex-col justify-center px-16 text-gray-900">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#E25E45]/15 rounded-xl flex items-center justify-center">
                <span className="text-[#E25E45] font-bold text-lg">B</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#E25E45]">Bid</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4 drop-shadow-sm">
              {t('authPanel.streamlineProcurement')}
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              {t('authPanel.streamlineDesc')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#E25E45]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 className="w-5 h-5 text-[#E25E45]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('authPanel.companyWorkspaces')}</h3>
                <p className="text-sm text-gray-500">{t('authPanel.companyWorkspacesDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#E25E45]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-5 h-5 text-[#E25E45]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('authPanel.vendorManagement')}</h3>
                <p className="text-sm text-gray-500">{t('authPanel.vendorManagementDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#E25E45]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-5 h-5 text-[#E25E45]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('authPanel.secureCompliant')}</h3>
                <p className="text-sm text-gray-500">{t('authPanel.secureCompliantDesc')}</p>
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

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t('authPanel.createAccountTitle')}</h2>
            <p className="text-neutral-500">{t('authPanel.createAccountDesc')}</p>
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
                      <Input data-testid="input-name" placeholder={t('auth.fullNamePlaceholder')} {...field} />
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
                      <Input data-testid="input-email" type="email" placeholder={t('auth.emailPlaceholder')} {...field} />
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
                      <Input data-testid="input-password" type="password" placeholder={t('auth.passwordCreatePlaceholder')} {...field} />
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
                      <Input data-testid="input-confirm-password" type="password" placeholder={t('authPanel.reenterPassword')} {...field} />
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
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                {t('auth.signInLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
