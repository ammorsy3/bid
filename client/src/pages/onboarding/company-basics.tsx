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

const companyBasicsSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  category: z.string().min(1, "Please select a category"),
});

type CompanyBasicsForm = z.infer<typeof companyBasicsSchema>;

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
        throw new Error(error.message || "Failed to create workspace");
      }
      const result = await response.json();
      localStorage.setItem('token', result.token);
      localStorage.removeItem(DRAFT_KEY);
      await checkAuth();
      toast({
        title: "Workspace ready",
        description: "You can verify your company anytime to unlock tenders and offers.",
      });
      setLocation(getPostOnboardingRedirect());
    } catch (error: any) {
      toast({
        title: "Couldn't create workspace",
        description: error.message || "Please try again.",
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
            <div className="w-10 h-10 bg-[#E25E45]/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#E25E45]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t('onboardingPanel.companyDetailsTitle')}</h2>
              <p className="text-sm text-neutral-500">Tell us the basics. You can verify your company later from settings.</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Display Name *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingPanel.companyNamePh')} {...field} data-testid="input-company-name" />
                    </FormControl>
                    <FormDescription>This is what other users will see on Bid.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Category *</FormLabel>
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
                    <FormDescription>Helps us recommend relevant tenders.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-500">
                Legal info (CR number, legal name, VAT) and verification documents are collected later from <span className="font-medium text-neutral-700">Settings → Company</span> when you're ready. You can browse Bid and explore right after this step.
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/onboarding")}
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-[#E25E45] hover:bg-[#d04a32]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating workspace…
                    </>
                  ) : (
                    <>
                      Go to dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
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
