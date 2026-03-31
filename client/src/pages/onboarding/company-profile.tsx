import { useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ArrowRight, ArrowLeft, Palette, Upload, CheckCircle2 } from "lucide-react";
import type { UploadResult } from "@uppy/core";

const DRAFT_KEY = "onboarding-draft";

const companyProfileSchema = z.object({
  logoUrl: z.string().optional(),
  bio: z.string().max(100, "Bio must not exceed 100 characters").optional(),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type CompanyProfileForm = z.infer<typeof companyProfileSchema>;

function getDraft(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDraft(data: Partial<CompanyProfileForm>) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data, step2Complete: true }));
}

export default function CompanyProfile() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);

  const draft = getDraft();

  // Redirect if step 1 not completed
  useEffect(() => {
    if (!user) { setLocation("/signup"); return; }
    if (!user.emailVerified) { setLocation("/verify-email"); return; }
    if (!draft.step1Complete) { setLocation("/onboarding/company-basics"); return; }
  }, [user, setLocation]);

  const form = useForm<CompanyProfileForm>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      logoUrl: draft.logoUrl || "",
      bio: draft.bio || "",
      websiteUrl: draft.websiteUrl || "",
      linkedinUrl: draft.linkedinUrl || "",
    },
  });

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleLogoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metadataResponse.json();
      form.setValue('logoUrl', objectPath, { shouldValidate: true });
      setUploadedLogo(result.successful[0].name || 'Logo uploaded');
    }
  };

  const onSubmit = (data: CompanyProfileForm) => {
    saveDraft(data);
    setLocation("/onboarding/invite-team");
  };

  const handleSkip = () => {
    saveDraft({ logoUrl: "", bio: "", websiteUrl: "", linkedinUrl: "" });
    setLocation("/onboarding/invite-team");
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
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-sm text-neutral-500">Basics</span>
            </div>
            <div className="w-8 h-px bg-primary-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</div>
              <span className="text-sm font-medium text-neutral-900">Profile</span>
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
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Palette className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Company Profile</h2>
                <p className="text-sm text-neutral-500">Make your company stand out (optional)</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
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
                              <span>Upload Logo</span>
                            </div>
                          </ObjectUploader>
                          {uploadedLogo && (
                            <p className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedLogo}
                            </p>
                          )}
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
                      <FormLabel>Short Bio</FormLabel>
                      <FormControl>
                        <SmartTextarea
                          {...field}
                          rows={3}
                          maxLength={100}
                          placeholder="Briefly describe your company and services"
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        <span className="text-neutral-400">
                          {(field.value || "").length} / 100 characters
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
                        <FormLabel>Website</FormLabel>
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
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/company/..." {...field} data-testid="input-linkedin" />
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
                    onClick={() => setLocation("/onboarding/company-basics")}
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
                    <Button type="submit" size="lg">
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
