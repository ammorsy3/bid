import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { ArrowRight, ArrowLeft, Building2, Loader2 } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const DRAFT_KEY = "onboarding-draft";

type CompanyBasicsForm = {
  name: string;
  category: string;
};

function getDraft(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

const getPostOnboardingRedirect = () => {
  const redirect = localStorage.getItem('postOnboardingRedirect');
  if (redirect) {
    localStorage.removeItem('postOnboardingRedirect');
    return redirect;
  }
  return '/dashboard';
};

export default function CompanyBasics() {
  const [, setLocation] = useLocation();
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  const companyBasicsSchema = z.object({
    name: z.string().min(2, t('validation.companyNameRequired')),
    category: z.string().min(1, t('validation.categoryRequired')),
  });

  const draft = getDraft();

  const form = useForm<CompanyBasicsForm>({
    resolver: zodResolver(companyBasicsSchema),
    defaultValues: {
      name: draft.name || "",
      category: draft.category || "",
    },
  });

  useEffect(() => {
    if (!user) setLocation("/signup");
    else if (!user.otpVerified) setLocation("/verify-email");
  }, [user, setLocation]);

  const onSubmit = async (data: CompanyBasicsForm) => {
    setSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/companies', {
        name: data.name,
        category: data.category,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('onboardingPanel.workspaceCreateError'));
      }
      const result = await response.json();
      localStorage.setItem('token', result.token);
      localStorage.removeItem(DRAFT_KEY);
      await checkAuth();
      toast({
        title: t('onboardingPanel.workspaceReadyTitle'),
        description: t('onboardingPanel.workspaceReadyDesc'),
      });
      setLocation(getPostOnboardingRedirect());
    } catch (error: any) {
      toast({
        title: t('onboardingPanel.workspaceCreateError'),
        description: error.message || t('onboardingPanel.workspaceCreateErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <OnboardingLayout>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#FE3C01]/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#FE3C01]" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">{t('onboardingPanel.companyDetailsTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('onboardingPanel.companyBasicsDesc')}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingPanel.companyDisplayNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingPanel.companyNamePh')} {...field} data-testid="input-company-name" />
                    </FormControl>
                    <FormDescription>{t('onboardingPanel.companyDisplayNameDesc')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingPanel.companyCategoryLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder={t('onboardingPanel.selectIndustryPh')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VENDOR_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('onboardingPanel.companyCategoryDesc')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg bg-muted border border-border p-3 text-xs text-muted-foreground">
                {t('onboardingPanel.companyLegalInfoNote')}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/company-onboarding?addAccount=1")}
                  disabled={submitting}
                >
                  <ArrowLeft className="me-2 h-4 w-4" />
                  {t('onboardingPanel.backBtn')}
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-[#FE3C01] hover:bg-[#E83501]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('onboardingPanel.creatingWorkspace')}
                    </>
                  ) : (
                    <>
                      {t('onboardingPanel.goToDashboard')}
                      <ArrowRight className="ms-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
