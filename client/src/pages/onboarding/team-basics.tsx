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
import { ArrowRight, ArrowLeft, UsersRound, Loader2 } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";
import { useI18n } from "@/lib/i18n";

export default function TeamBasics() {
  const [, setLocation] = useLocation();
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRtl ? ArrowLeft : ArrowRight;

  const teamBasicsSchema = z.object({
    teamName: z.string().min(2, t('onboardingTeamBasics.teamNameRequired')),
    category: z.string().min(1, t('onboardingTeamBasics.selectCategoryRequired')),
  });
  type TeamBasicsForm = z.infer<typeof teamBasicsSchema>;

  const form = useForm<TeamBasicsForm>({
    resolver: zodResolver(teamBasicsSchema),
    defaultValues: {
      teamName: "",
      category: "",
    },
  });

  useEffect(() => {
    if (!user) setLocation("/signup");
    else if (!user.otpVerified) setLocation("/verify-email");
  }, [user, setLocation]);

  const onSubmit = async (data: TeamBasicsForm) => {
    setSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/companies', {
        name: data.teamName,
        category: data.category,
        accountType: 'team',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('onboardingTeamBasics.createFailedDesc'));
      }
      const result = await response.json();
      localStorage.setItem('token', result.token);
      await checkAuth();
      toast({
        title: t('onboardingTeamBasics.teamCreatedTitle'),
        description: t('onboardingTeamBasics.teamCreatedDesc'),
      });
      setLocation('/onboarding/team-invite');
    } catch (error: any) {
      toast({
        title: t('onboardingTeamBasics.couldNotCreateTitle'),
        description: error.message || t('onboardingTeamBasics.tryAgain'),
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
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t('onboardingTeamBasics.heading')}</h2>
              <p className="text-sm text-neutral-500">{t('onboardingTeamBasics.subheading')}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingTeamBasics.teamNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingTeamBasics.teamNamePlaceholder')} {...field} data-testid="input-team-name" />
                    </FormControl>
                    <FormDescription>{t('onboardingTeamBasics.teamNameDesc')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboardingTeamBasics.teamCategoryLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team-category">
                          <SelectValue placeholder={t('onboardingTeamBasics.teamCategoryPlaceholder')} />
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

              <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-700">
                {t('onboardingTeamBasics.inviteNote')}
              </div>

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
                  className="bg-sky-600 hover:bg-sky-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('onboardingTeamBasics.creating')}
                    </>
                  ) : (
                    <>
                      {t('onboardingTeamBasics.continue')}
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
