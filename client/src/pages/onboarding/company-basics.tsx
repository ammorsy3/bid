import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { ArrowRight, ArrowLeft, Building2 } from "lucide-react";

const DRAFT_KEY = "onboarding-draft";

const companyBasicsSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  legalName: z.string().min(2, "Legal name is required"),
  crNumber: z.string().regex(/^\d+$/, "CR number must contain only numbers"),
  vatNumber: z.string().optional(),
  city: z.string().min(1, "City is required"),
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

function saveDraft(data: Partial<CompanyBasicsForm>) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data, step1Complete: true }));
}

export default function CompanyBasics() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { t } = useI18n();

  const draft = getDraft();

  const form = useForm<CompanyBasicsForm>({
    resolver: zodResolver(companyBasicsSchema),
    defaultValues: {
      name: draft.name || "",
      legalName: draft.legalName || "",
      crNumber: draft.crNumber || "",
      vatNumber: draft.vatNumber || "",
      city: draft.city || "",
      category: draft.category || "",
    },
  });

  useEffect(() => {
    if (!user) setLocation("/signup");
    else if (!user.otpVerified) setLocation("/verify-email");
  }, [user, setLocation]);

  const onSubmit = (data: CompanyBasicsForm) => {
    saveDraft(data);
    setLocation("/onboarding/company-profile");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-2 justify-center mb-6">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-lg font-bold text-neutral-900">Bid</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
              <span className="text-sm font-medium text-neutral-900">Basics</span>
            </div>
            <div className="w-8 h-px bg-neutral-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-200 text-neutral-500 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
              <span className="text-sm text-neutral-400">Profile</span>
            </div>
            <div className="w-8 h-px bg-neutral-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-200 text-neutral-500 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
              <span className="text-sm text-neutral-400">Team</span>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Company Details</h2>
                <p className="text-sm text-neutral-500">Tell us about your company</p>
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
                        <Input placeholder="How your company appears publicly" {...field} data-testid="input-company-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="As registered in CR" {...field} data-testid="input-legal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="crNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CR Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Numeric only"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                            data-testid="input-cr-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vatNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} data-testid="input-vat-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Riyadh, Jeddah" {...field} data-testid="input-city" />
                      </FormControl>
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
                            <SelectValue placeholder="Select your industry" />
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
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" size="lg">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
