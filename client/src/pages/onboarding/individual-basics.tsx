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
import { apiRequest } from "@/lib/queryClient";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { ArrowRight, ArrowLeft, User, Loader2, Info } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";
import { useI18n } from "@/lib/i18n";

const getPostOnboardingRedirect = () => {
  const redirect = localStorage.getItem('postOnboardingRedirect');
  if (redirect) {
    localStorage.removeItem('postOnboardingRedirect');
    return redirect;
  }
  return '/dashboard';
};

export default function IndividualBasics() {
  const [, setLocation] = useLocation();
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRtl ? ArrowLeft : ArrowRight;

  const individualBasicsSchema = z.object({
    displayName: z.string().min(2, t('onboardingIndividualBasics.displayNameRequired')),
    specialization: z.string().min(1, t('onboardingIndividualBasics.selectSpecializationRequired')),
    nationalIdNumber: z.string().optional(),
  });
  type IndividualBasicsForm = z.infer<typeof individualBasicsSchema>;

  const form = useForm<IndividualBasicsForm>({
    resolver: zodResolver(individualBasicsSchema),
    defaultValues: {
      displayName: user?.name || "",
      specialization: "",
      nationalIdNumber: "",
    },
  });

  useEffect(() => {
    if (!user) setLocation("/signup");
    else if (!user.otpVerified) setLocation("/verify-email");
  }, [user, setLocation]);

  const onSubmit = async (data: IndividualBasicsForm) => {
    setSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/companies', {
        name: data.displayName,
        category: data.specialization,
        accountType: 'individual',
        nationalIdNumber: data.nationalIdNumber?.trim() || undefined,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('onboardingIndividualBasics.createProfileFailedDesc'));
      }
      const result = await response.json();
      localStorage.setItem('token', result.token);
      await checkAuth();
      toast({
        title: t('onboardingIndividualBasics.profileReadyTitle'),
        description: t('onboardingIndividualBasics.profileReadyDesc'),
      });
      setLocation(getPostOnboardingRedirect());
    } catch (error: any) {
      toast({
        title: t('onboardingIndividualBasics.couldNotCreateProfileTitle'),
        description: error.message || t('onboardingIndividualBasics.tryAgain'),
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
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t('onboardingIndividualBasics.heading')}</h2>
              <p className="text-sm text-neutral-500">{t('onboardingIndividualBasics.subheading')}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingIndividualBasics.displayNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingIndividualBasics.displayNamePlaceholder')} {...field} data-testid="input-display-name" />
                    </FormControl>
                    <FormDescription>{t('onboardingIndividualBasics.displayNameDesc')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingIndividualBasics.specializationLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-specialization">
                          <SelectValue placeholder={t('onboardingIndividualBasics.specializationPlaceholder')} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationalIdNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingIndividualBasics.nationalIdLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingIndividualBasics.nationalIdPlaceholder')} {...field} data-testid="input-national-id" />
                    </FormControl>
                    <FormDescription className="flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>{t('onboardingIndividualBasics.nationalIdDesc')}</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/onboarding")}
                  disabled={submitting}
                >
                  <BackArrow className="mr-2 h-4 w-4" />
                  {t('common.back')}
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('onboardingIndividualBasics.creatingProfile')}
                    </>
                  ) : (
                    <>
                      {t('onboardingIndividualBasics.goToDashboard')}
                      <ForwardArrow className="ml-2 h-4 w-4" />
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
