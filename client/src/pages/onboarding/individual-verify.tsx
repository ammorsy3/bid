import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { ShieldCheck, Loader2, ArrowRight, Clock } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const schema = z.object({
  nationalIdNumber: z
    .string()
    .regex(/^\d{10}$/, "National ID must be exactly 10 digits"),
});

type FormValues = z.infer<typeof schema>;

export default function IndividualVerify() {
  const [, setLocation] = useLocation();
  const { user, activeCompany, checkAuth } = useAuthStore();
  const { t } = useI18n();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nationalIdNumber: "" },
  });

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    if (!activeCompany) { setLocation("/onboarding/individual-basics"); return; }
    // Already submitted or verified — nothing to do here.
    if (activeCompany.verificationStatus !== "not_verified") { setLocation("/dashboard"); return; }
  }, [user, activeCompany, setLocation]);

  const onSubmit = async (data: FormValues) => {
    if (!activeCompany) return;
    setSubmitting(true);
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/companies/${activeCompany.id}/verify-national-id`,
        { nationalIdNumber: data.nationalIdNumber }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to submit verification");
      }
      // Refresh the store so activeCompany.verificationStatus is 'under_review'
      // before we navigate — otherwise the dashboard gate bounces us back here.
      await checkAuth();
      toast({
        title: t('indVerify.submittedTitle'),
        description: t('indVerify.submittedDesc'),
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: t('indVerify.failedTitle'),
        description: error.message || t('indVerify.failedDesc'),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !activeCompany) return null;

  return (
    <OnboardingLayout>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--state-won)]/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[var(--state-won)]" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">
                {t('indVerify.heading')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('indVerify.subtitle')}
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nationalIdNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('indVerify.nationalId')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('indVerify.nationalIdPlaceholder')}
                        maxLength={10}
                        inputMode="numeric"
                        dir="ltr"
                        {...field}
                        autoFocus
                      />
                    </FormControl>
                    <FormDescription>
                      {t('indVerify.nationalIdHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-800">
                <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  {t('indVerify.reviewNote')}
                </span>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-[#FE3C01] hover:bg-[#E83501]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('indVerify.submitting')}
                    </>
                  ) : (
                    <>
                      {t('indVerify.submit')}
                      <ArrowRight className="ml-2 h-4 w-4 rtl:rotate-180" />
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
