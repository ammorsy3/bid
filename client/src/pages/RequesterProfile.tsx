import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SmartInput, SmartTextarea } from "@/components/ui/smart-input";
import { FormProgress } from "@/components/ui/form-progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateFormProgress } from "@/lib/form-validation";
import { Building2, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import type { UploadResult } from "@/components/ObjectUploader";
import { useI18n } from "@/lib/i18n";

const FORM_ID = 'requester-profile';

const INDUSTRY_KEYS = [
  "industryConstruction",
  "industryIT",
  "industryHealthcare",
  "industryFinance",
  "industryGovernment",
  "industryManufacturing",
  "industryEnergy",
  "industryEducation",
  "industryTelecom",
  "industryRealEstate",
  "industryTransport",
  "industryRetail",
  "industryProfessional",
  "industryOther",
];

const COMPANY_SIZE_KEYS = [
  "size1to10",
  "size11to50",
  "size51to200",
  "size201to500",
  "size500plus",
];

export default function RequesterProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const [uploadedLogo, setUploadedLogo] = useState<string | undefined>(undefined);

  const requesterProfileSchema = z.object({
    companyName: z.string().min(2, t('requesterProfile.companyNameRequired')).max(120),
    industry: z.string().min(1, t('requesterProfile.industryRequired')),
    companySize: z.string().optional(),
    logoUrl: z.string().optional(),
    bio: z.string().min(5, t('requesterProfile.bioMin')).max(100, t('requesterProfile.bioMax')),
    websiteUrl: z.string().url(t('requesterProfile.invalidUrl')).optional().or(z.literal("")),
    linkedinUrl: z.string().url(t('requesterProfile.invalidUrl')).optional().or(z.literal("")),
    contactPerson: z.string().min(2, t('requesterProfile.contactPersonRequired')),
    contactEmail: z.string().email(t('requesterProfile.invalidEmail')),
    contactPhone: z.string().optional(),
  });

  type RequesterProfileForm = z.infer<typeof requesterProfileSchema>;

  const REQUIRED_FIELDS: (keyof RequesterProfileForm)[] = [
    'companyName', 'industry', 'bio', 'contactPerson', 'contactEmail'
  ];

  const form = useForm<RequesterProfileForm>({
    resolver: zodResolver(requesterProfileSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "",
      logoUrl: "",
      bio: "",
      websiteUrl: "",
      linkedinUrl: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  // Check if requester has existing profile
  const { data: existingProfile } = useQuery({
    queryKey: ['/api/requester/profile'],
  });

  useEffect(() => {
    if (existingProfile && typeof existingProfile === 'object') {
      const profile = existingProfile as any;
      form.reset({
        ...profile,
        websiteUrl: profile.websiteUrl || "",
        linkedinUrl: profile.linkedinUrl || "",
        companySize: profile.companySize || "",
        logoUrl: profile.logoUrl || "",
        contactPhone: profile.contactPhone || "",
      });
      if (profile.logoUrl) {
        setUploadedLogo(t('requesterProfile.companyLogoLabel'));
      }
    }
  }, [existingProfile, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: RequesterProfileForm) => {
      const response = await apiRequest('POST', '/api/requester/profile', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('requesterProfile.successTitle'),
        description: t('requesterProfile.successDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requester/profile'] });
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: t('requesterProfile.errorTitle'),
        description: error.message || t('requesterProfile.failedToSave'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequesterProfileForm) => {
    submitMutation.mutate(data);
  };

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleLogoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;

      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', {
        fileURL: uploadURL,
      });
      const { objectPath } = await metadataResponse.json();

      form.setValue('logoUrl', objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedLogo(result.successful[0].name);

      toast({
        title: t('requesterProfile.uploadedTitle'),
        description: t('requesterProfile.uploadedDesc', { name: result.successful[0].name }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary-600" />
            <h1 className="font-display font-black text-3xl text-foreground tracking-[-0.04em]">{t('requesterProfile.heading')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('requesterProfile.subheading')}
          </p>
        </div>

        <div className="mb-6">
          <FormProgress
            progress={progress}
            steps={[
              { label: t('requesterProfile.stepCompanyInfo'), completed: progress >= 50 },
              { label: t('requesterProfile.stepContactDetails'), completed: progress >= 100 },
            ]}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-foreground">{t('requesterProfile.companyInformation')}</h2>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('requesterProfile.companyNameLabel')}</FormLabel>
                      <FormControl>
                        <SmartInput
                          {...field}
                          error={form.formState.errors.companyName}
                          isDirty={form.formState.dirtyFields.companyName}
                          data-testid="input-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('requesterProfile.industryLabel')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-industry">
                              <SelectValue placeholder={t('requesterProfile.selectIndustry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRY_KEYS.map((key) => (
                              <SelectItem key={key} value={t(`requesterProfile.${key}`)}>
                                {t(`requesterProfile.${key}`)}
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
                    name="companySize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('requesterProfile.companySizeLabel')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company-size">
                              <SelectValue placeholder={t('requesterProfile.selectSize')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPANY_SIZE_KEYS.map((key) => (
                              <SelectItem key={key} value={t(`requesterProfile.${key}`)}>
                                {t(`requesterProfile.${key}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('requesterProfile.companyDescLabel')}</FormLabel>
                      <FormControl>
                        <SmartTextarea
                          {...field}
                          rows={4}
                          maxLength={100}
                          placeholder={t('requesterProfile.companyDescPlaceholder')}
                          error={form.formState.errors.bio}
                          isDirty={form.formState.dirtyFields.bio}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        <div className="flex items-center justify-between">
                          <span>{t('requesterProfile.keepConcise')}</span>
                          <span className="text-muted-foreground">
                            {t('requesterProfile.charsCount', { current: (field.value || "").length })}
                          </span>
                        </div>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('requesterProfile.companyLogoLabel')}</FormLabel>
                      <FormControl>
                        <ObjectUploader
                          onGetUploadParameters={handleGetUploadURL}
                          onComplete={handleLogoUpload}
                          allowedFileTypes={['image/*']}
                          maxFileSize={5 * 1024 * 1024}
                        >
                          {uploadedLogo || t('requesterProfile.uploadLogo')}
                        </ObjectUploader>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('requesterProfile.websiteUrlLabel')}</FormLabel>
                        <FormControl>
                          <SmartInput
                            {...field}
                            placeholder={t('requesterProfile.websitePlaceholder')}
                            error={form.formState.errors.websiteUrl}
                            isDirty={form.formState.dirtyFields.websiteUrl}
                            data-testid="input-website"
                          />
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
                        <FormLabel>{t('requesterProfile.linkedinUrlLabel')}</FormLabel>
                        <FormControl>
                          <SmartInput
                            {...field}
                            placeholder={t('requesterProfile.linkedinPlaceholder')}
                            error={form.formState.errors.linkedinUrl}
                            isDirty={form.formState.dirtyFields.linkedinUrl}
                            data-testid="input-linkedin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">{t('requesterProfile.contactInformation')}</h2>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('requesterProfile.contactPersonLabel')}</FormLabel>
                      <FormControl>
                        <SmartInput
                          {...field}
                          placeholder={t('requesterProfile.fullNamePlaceholder')}
                          error={form.formState.errors.contactPerson}
                          isDirty={form.formState.dirtyFields.contactPerson}
                          data-testid="input-contact-person"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('requesterProfile.contactEmailLabel')}</FormLabel>
                        <FormControl>
                          <SmartInput
                            {...field}
                            type="email"
                            placeholder={t('requesterProfile.contactEmailPlaceholder')}
                            error={form.formState.errors.contactEmail}
                            isDirty={form.formState.dirtyFields.contactEmail}
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('requesterProfile.contactPhoneLabel')}</FormLabel>
                        <FormControl>
                          <SmartInput
                            {...field}
                            placeholder={t('requesterProfile.contactPhonePlaceholder')}
                            error={form.formState.errors.contactPhone}
                            isDirty={form.formState.dirtyFields.contactPhone}
                            data-testid="input-contact-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                data-testid="button-cancel"
              >
                {t('requesterProfile.cancelBtn')}
              </Button>
              <Button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700"
                disabled={submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? t('requesterProfile.savingBtn') : t('requesterProfile.saveProfileBtn')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
