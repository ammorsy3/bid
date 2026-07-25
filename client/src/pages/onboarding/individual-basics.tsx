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
import { ArrowRight, ArrowLeft, User, Loader2 } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const individualBasicsSchema = z.object({
  displayName: z.string().min(2, "Display name is required"),
  specialization: z.string().min(1, "Please select a specialization"),
});

type IndividualBasicsForm = z.infer<typeof individualBasicsSchema>;

export default function IndividualBasics() {
  const [, setLocation] = useLocation();
  const { user, checkAuth } = useAuthStore();
  const { t, isRtl } = useI18n();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRtl ? ArrowLeft : ArrowRight;

  const form = useForm<IndividualBasicsForm>({
    resolver: zodResolver(individualBasicsSchema),
    defaultValues: {
      displayName: user?.name || "",
      specialization: "",
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
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('indBasics.couldntCreate'));
      }
      const result = await response.json();
      localStorage.setItem('token', result.token);
      await checkAuth();
      toast({
        title: t('indBasics.accountCreated'),
        description: t('indBasics.letsSetup'),
      });
      // Individuals must set up their public profile before reaching the
      // dashboard. Honour an invite redirect if one is pending, otherwise send
      // them straight to the profile-creation step.
      const pending = localStorage.getItem('postOnboardingRedirect');
      if (pending) {
        localStorage.removeItem('postOnboardingRedirect');
        setLocation(pending);
      } else {
        setLocation('/onboarding/individual-profile');
      }
    } catch (error: any) {
      toast({
        title: t('indBasics.couldntCreate'),
        description: error.message || t('profEditor.tryAgain'),
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
              <h2 className="text-xl font-bold text-neutral-900">{t('indBasics.heading')}</h2>
              <p className="text-sm text-neutral-500">{t('indBasics.subtitle')}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('indBasics.displayName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('indBasics.displayNamePlaceholder')} {...field} data-testid="input-display-name" />
                    </FormControl>
                    <FormDescription>{t('indBasics.displayNameHelp')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('indBasics.specialization')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-specialization">
                          <SelectValue placeholder={t('indBasics.selectExpertise')} />
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

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/onboarding")}
                  disabled={submitting}
                >
                  <BackArrow className="mr-2 h-4 w-4" />
                  {t('indBasics.back')}
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
                      {t('indBasics.creating')}
                    </>
                  ) : (
                    <>
                      {t('indBasics.goToDashboard')}
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
