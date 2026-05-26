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

const teamBasicsSchema = z.object({
  teamName: z.string().min(2, "Team name is required"),
  category: z.string().min(1, "Please select a category"),
});

type TeamBasicsForm = z.infer<typeof teamBasicsSchema>;

export default function TeamBasics() {
  const [, setLocation] = useLocation();
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

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
        throw new Error(error.message || "Failed to create team");
      }
      const result = await response.json();
      localStorage.setItem('token', result.token);
      await checkAuth();
      toast({
        title: "Team workspace created",
        description: "Now invite your teammates to join.",
      });
      setLocation('/onboarding/team-invite');
    } catch (error: any) {
      toast({
        title: "Couldn't create team",
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
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Create your team workspace</h2>
              <p className="text-sm text-neutral-500">Set up your team's shared profile to apply to tenders together.</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Alpha Consulting Group" {...field} data-testid="input-team-name" />
                    </FormControl>
                    <FormDescription>This is the name other users will see when your team applies to tenders.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-team-category">
                          <SelectValue placeholder="Select your team's main area of work" />
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
                After creating the team workspace, you'll be able to invite teammates and assign them roles.
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
                  className="bg-sky-600 hover:bg-sky-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating team…
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
