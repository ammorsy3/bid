import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SmartTextarea } from "@/components/ui/smart-input";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useDebouncedSave } from "@/lib/autosave";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ArrowRight, ArrowLeft, Palette, Upload, Building2 } from "lucide-react";
import type { UploadResult } from "@/components/ObjectUploader";
import OnboardingLayout from "@/components/onboarding-layout";

const DRAFT_KEY = "onboarding-draft";

const BIO_MAX = 250;

const makeCompanyProfileSchema = (t: (k: string) => string) => z.object({
  logoUrl: z.string().optional(),
  bio: z.string().max(BIO_MAX, `Bio must not exceed ${BIO_MAX} characters`).optional(),
  websiteUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal("")),
  linkedinUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal("")),
});

type CompanyProfileForm = z.infer<ReturnType<typeof makeCompanyProfileSchema>>;

function getDraft(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDraft(data: Partial<CompanyProfileForm>) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data }));
}

export default function CompanyProfile() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const draft = getDraft();

  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    if (!draft.step1Complete) { setLocation("/onboarding/company-basics"); return; }
  }, [user, setLocation]);

  useEffect(() => {
    if (draft.logoUrl && !logoPreviewUrl) {
      const token = localStorage.getItem("token");
      fetch(draft.logoUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => setLogoPreviewUrl(URL.createObjectURL(blob)))
        .catch(() => {});
    }
  }, []);

  const form = useForm<CompanyProfileForm>({
    resolver: zodResolver(makeCompanyProfileSchema(t)),
    defaultValues: {
      logoUrl: draft.logoUrl || "",
      bio: draft.bio || "",
      websiteUrl: draft.websiteUrl || "",
      linkedinUrl: draft.linkedinUrl || user?.linkedinUrl || "",
    },
  });

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleLogoUpload = async (result: UploadResult) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metadataResponse.json();
      form.setValue('logoUrl', objectPath, { shouldValidate: true });

      // Fetch the stored image with auth to generate a local preview URL
      try {
        const token = localStorage.getItem("token");
        const imgRes = await fetch(objectPath, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await imgRes.blob();
        const prev = URL.createObjectURL(blob);
        setLogoPreviewUrl(prev);
      } catch {
        // preview failed — not critical
      }
    }
  };

  const watched = form.watch();
  const autosave = useCallback((values: CompanyProfileForm) => {
    saveDraft(values);
  }, []);
  useDebouncedSave(watched, autosave);

  const onSubmit = (data: CompanyProfileForm) => {
    const existing = getDraft();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data, step2Complete: true }));
    setLocation("/onboarding/invite-team");
  };

  const handleSkip = () => {
    const existing = getDraft();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...existing, logoUrl: "", bio: "", websiteUrl: "", linkedinUrl: "", step2Complete: true })
    );
    setLocation("/onboarding/invite-team");
  };

  if (!user) return null;

  return (
    <OnboardingLayout step={3}>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">{t('onboarding.companyProfileHeading')}</h2>
              <p className="text-sm text-neutral-500">{t('onboarding.companyProfileOptionalDesc')}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="logoUrl"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('onboarding.companyLogoLabel')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        {/* Logo preview */}
                        <div className="w-20 h-20 rounded-2xl border-2 border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
                          {logoPreviewUrl ? (
                            <img
                              src={logoPreviewUrl}
                              alt="Company logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-8 h-8 text-neutral-300" />
                          )}
                        </div>

                        {/* Upload control */}
                        <div className="flex-1 space-y-1.5">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={5242880}
                            allowedFileTypes={['.jpg', '.jpeg', '.png']}
                            onGetUploadParameters={handleGetUploadURL}
                            onComplete={handleLogoUpload}
                            buttonVariant="outline"
                            buttonClassName="w-full"
                          >
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              <span>{logoPreviewUrl ? "Change Logo" : "Upload Logo"}</span>
                            </div>
                          </ObjectUploader>
                          <p className="text-xs text-neutral-400">JPG or PNG, max 5MB</p>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('onboarding.shortBioLabel')}</FormLabel>
                    <FormControl>
                      <SmartTextarea
                        {...field}
                        rows={3}
                        maxLength={BIO_MAX}
                        placeholder="Briefly describe your company and services"
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      <span className="text-neutral-400">
                        {(field.value || "").length} / {BIO_MAX} characters
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('onboarding.websiteLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('onboarding.yourLinkedin')}</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/yourname" {...field} data-testid="input-linkedin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation("/onboarding/company-documents")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    Skip for now
                  </button>
                  <Button type="submit" size="lg" className="bg-[#E25E45] hover:bg-[#d04a32]">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
