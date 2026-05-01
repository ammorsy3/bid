import { useCallback, useEffect, useRef, useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { useDebouncedSave } from "@/lib/autosave";
import { VENDOR_CATEGORIES } from "@shared/schema";
import { ArrowRight, ArrowLeft, Building2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import OnboardingLayout from "@/components/onboarding-layout";

const DRAFT_KEY = "onboarding-draft";

const makeCompanyBasicsSchema = (t: (k: string) => string) => z.object({
  name: z.string().min(2, t('validation.companyNameRequired')),
  legalName: z.string().min(2, t('validation.legalNameRequired')),
  crNumber: z.string().regex(/^\d{10}$/, t('validation.crNumberFormat')),
  vatNumber: z.string().optional(),
  city: z.string().min(1, t('validation.cityRequired')),
  category: z.string().min(1, t('validation.categoryRequired')),
});

type CompanyBasicsForm = z.infer<ReturnType<typeof makeCompanyBasicsSchema>>;

function getDraft(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDraft(data: Partial<CompanyBasicsForm>) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data }));
}

export default function CompanyBasics() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { t } = useI18n();

  const draft = getDraft();

  const form = useForm<CompanyBasicsForm>({
    resolver: zodResolver(makeCompanyBasicsSchema(t)),
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

  const crValue = form.watch("crNumber");
  const [crStatus, setCrStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const crCheckTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCheckedCrRef = useRef<string>("");

  useEffect(() => {
    if (crCheckTimeoutRef.current) clearTimeout(crCheckTimeoutRef.current);
    if (!/^\d{10}$/.test(crValue || "")) {
      setCrStatus('idle');
      return;
    }
    if (crValue === lastCheckedCrRef.current) return;
    setCrStatus('checking');
    crCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiRequest('GET', `/api/companies/check-cr/${crValue}`);
        const { taken } = await res.json();
        lastCheckedCrRef.current = crValue;
        setCrStatus(taken ? 'taken' : 'available');
      } catch {
        setCrStatus('idle');
      }
    }, 500);
    return () => {
      if (crCheckTimeoutRef.current) clearTimeout(crCheckTimeoutRef.current);
    };
  }, [crValue]);

  const watched = form.watch();
  const autosave = useCallback((values: CompanyBasicsForm) => {
    saveDraft(values);
  }, []);
  useDebouncedSave(watched, autosave);

  const onSubmit = (data: CompanyBasicsForm) => {
    if (crStatus === 'taken') return;
    const existing = getDraft();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data, step1Complete: true }));
    setLocation("/onboarding/company-documents");
  };

  if (!user) return null;

  return (
    <OnboardingLayout step={1}>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#E25E45]/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#E25E45]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t('onboardingPanel.companyDetailsTitle')}</h2>
              <p className="text-sm text-neutral-500">{t('onboardingPanel.companyDetailsSubtitle')}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboarding.companyDisplayName')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingPanel.companyNamePh')} {...field} data-testid="input-company-name" />
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
                    <FormLabel>{t('onboarding.legalName')} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t('onboardingPanel.legalNamePh')} {...field} data-testid="input-legal-name" />
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
                          placeholder="10-digit CR number"
                          inputMode="numeric"
                          maxLength={10}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          data-testid="input-cr-number"
                        />
                      </FormControl>
                      {crStatus === 'checking' && (
                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking availability…
                        </p>
                      )}
                      {crStatus === 'available' && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Available
                        </p>
                      )}
                      {crStatus === 'taken' && (
                        <p className="text-xs text-red-600 flex items-start gap-1 mt-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>This CR is already registered to a workspace on Bid. Ask one of its admins to invite you.</span>
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('onboardingPanel.vatNumberLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('onboardingPanel.optionalPh')} {...field} data-testid="input-vat-number" />
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
                    <FormLabel>{t('onboarding.city')} *</FormLabel>
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
                    <FormLabel>{t('onboarding.industryCategory')} *</FormLabel>
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
                <Button
                  type="submit"
                  size="lg"
                  disabled={crStatus === 'taken' || crStatus === 'checking'}
                  className="bg-[#E25E45] hover:bg-[#d04a32]"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
