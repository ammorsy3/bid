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
import { apiRequest } from "@/lib/queryClient";
import { ArrowRight, ArrowLeft, User, Loader2 } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const schema = z.object({
  name: z.string().min(2, "Your name or display name is required"),
});

type FormValues = z.infer<typeof schema>;

export default function IndividualBasics() {
  const [, setLocation] = useLocation();
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
  }, [user, setLocation]);

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/companies", {
        name: data.name,
        accountType: "individual",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create profile");
      }
      const result = await response.json();
      localStorage.setItem("token", result.token);
      await checkAuth();
      setLocation("/onboarding/individual-verify");
    } catch (error: any) {
      toast({
        title: "Couldn't create profile",
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
            <div className="w-10 h-10 bg-[var(--state-won)]/10 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--state-won)]" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">
                Your freelancer profile
              </h2>
              <p className="text-sm text-muted-foreground">
                This name will appear on your public profile.
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ahmed Al-Mansouri" {...field} autoFocus />
                    </FormControl>
                    <FormDescription>
                      Use your real name or a professional alias — visible to clients.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg bg-muted border border-border p-3 text-xs text-muted-foreground">
                Next, you'll add your National ID number to verify your account. You can explore Bid first and verify later from <span className="font-medium">Settings</span>.
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/onboarding/account-type")}
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-[#FE3C01] hover:bg-[#E83501]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating profile…
                    </>
                  ) : (
                    <>
                      Continue
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
