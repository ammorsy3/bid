import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SmartInput, SmartTextarea } from "@/components/ui/smart-input";
import { FormProgress } from "@/components/ui/form-progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutosave } from "@/lib/autosave";
import { calculateFormProgress } from "@/lib/form-validation";
import { CheckCircle2, Building2, FileText, User, Sparkles, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { VENDOR_CATEGORIES } from "@shared/schema";
import type { UploadResult } from "@/components/ObjectUploader";

const countWords = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;

const preQualificationSchema = z.object({
  legalCompanyName: z.string().min(2, "Company name is required").max(120),
  crNumber: z.string().regex(/^\d+$/, "CR number must contain only numbers"),
  vatCertificateUrl: z.string().optional(),
  vatNumber: z.string().optional(),
  gosiCertificateUrl: z.string().min(1, "GOSI certificate is required"),
  nationalAddressCertificateUrl: z.string().min(1, "National Address certificate is required"),
  displayName: z.string().min(2, "Display name is required").max(60),
  logoUrl: z.string().min(1, "Company logo is required"),
  headerUrl: z.string().optional(),
  bio: z.string().min(5, "Bio must be at least 5 characters").max(100, "Bio must not exceed 100 characters"),
  category: z.string().min(1, "Please select a category"),
  profileFileUrl: z.string().min(1, "Company profile is required"),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  xUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type PreQualificationForm = z.infer<typeof preQualificationSchema>;

const FORM_ID = 'vendor-prequalification';
const REQUIRED_FIELDS: (keyof PreQualificationForm)[] = [
  'legalCompanyName', 'crNumber', 'gosiCertificateUrl', 'nationalAddressCertificateUrl',
  'displayName', 'logoUrl', 'bio', 'category', 'profileFileUrl'
];

export default function VendorPreQualification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkAuth } = useAuthStore();
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [uploadedFiles, setUploadedFiles] = useState<{
    vat?: string;
    gosi?: string;
    nationalAddress?: string;
    logo?: string;
    header?: string;
    companyProfile?: string;
  }>({});

  const form = useForm<PreQualificationForm>({
    resolver: zodResolver(preQualificationSchema),
    defaultValues: {
      legalCompanyName: "",
      crNumber: "",
      vatCertificateUrl: "",
      vatNumber: "",
      gosiCertificateUrl: "",
      nationalAddressCertificateUrl: "",
      displayName: "",
      logoUrl: "",
      headerUrl: "",
      bio: "",
      category: "",
      profileFileUrl: "",
      linkedinUrl: "",
      xUrl: "",
      websiteUrl: "",
    },
  });

  const formValues = form.watch();
  const { lastSaved, isSaving } = useAutosave(FORM_ID, formValues, true);
  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  const { data: existingQualification } = useQuery({
    queryKey: ['/api/vendor/qualification'],
  });

  useEffect(() => {
    if (existingQualification && typeof existingQualification === 'object') {
      const qual = existingQualification as any;
      form.reset({
        ...qual,
        linkedinUrl: qual.linkedinUrl || "",
        xUrl: qual.xUrl || "",
        websiteUrl: qual.websiteUrl || "",
      });
    }
  }, [existingQualification, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: PreQualificationForm) => {
      const response = await apiRequest('POST', '/api/vendor/prequalification', data);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: t('vendorPreQual.toastSuccess'),
        description: t('vendorPreQual.toastSuccessDesc'),
      });
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      navigate('/vendor-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: t('vendorPreQual.toastError'),
        description: error.message || t('vendorPreQual.toastErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PreQualificationForm) => {
    submitMutation.mutate(data);
  };

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, fieldName: keyof PreQualificationForm, fileKey: string) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;

      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metadataResponse.json();

      form.setValue(fieldName, objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, [fileKey]: result.successful![0].name }));

      toast({
        title: t('vendorPreQual.uploadedTitle'),
        description: t('vendorPreQual.uploadedDesc', { name: result.successful[0].name }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-900">{t('vendorPreQual.pageTitle')}</h1>
          </div>
          <p className="text-neutral-600">
            {t('vendorPreQual.pageDesc')}
          </p>
        </div>

        <div className="mb-6">
          <FormProgress
            progress={progress}
            steps={[
              { label: t('vendorPreQual.stepLegal'), completed: progress >= 50 },
              { label: t('vendorPreQual.stepPublic'), completed: progress >= 100 },
            ]}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Legal & Compliance Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="h-5 w-5 text-neutral-700" />
                <h2 className="text-xl font-semibold text-neutral-900">{t('vendorPreQual.sectionLegalTitle')}</h2>
                <Badge variant="outline" className="ml-auto">{t('vendorPreQual.sectionPrivate')}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="legalCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldCompanyName')}</FormLabel>
                      <FormControl>
                        <SmartInput
                          {...field}
                          error={form.formState.errors.legalCompanyName}
                          isDirty={form.formState.dirtyFields.legalCompanyName}
                          data-testid="input-legal-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldCrNumber')}</FormLabel>
                      <FormControl>
                        <SmartInput
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                          error={form.formState.errors.crNumber}
                          isDirty={form.formState.dirtyFields.crNumber}
                          data-testid="input-cr-number"
                          placeholder={t('vendorPreQual.crNumericOnly')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vatCertificateUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldVatCert')}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760}
                            allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                            onGetUploadParameters={handleGetUploadURL}
                            onComplete={(result) => handleFileUpload(result, 'vatCertificateUrl', 'vat')}
                            buttonVariant="outline"
                            buttonClassName="w-full"
                          >
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              <span>{t('vendorPreQual.uploadVatCert')}</span>
                            </div>
                          </ObjectUploader>
                          {uploadedFiles.vat && (
                            <p className="text-sm text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedFiles.vat}
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
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldVatNumber')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-vat-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gosiCertificateUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t('vendorPreQual.fieldGosiCert')}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760}
                            allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                            onGetUploadParameters={handleGetUploadURL}
                            onComplete={(result) => handleFileUpload(result, 'gosiCertificateUrl', 'gosi')}
                            buttonVariant="outline"
                            buttonClassName="w-full"
                          >
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              <span>{t('vendorPreQual.uploadGosiCert')}</span>
                            </div>
                          </ObjectUploader>
                          {uploadedFiles.gosi && (
                            <p className="text-sm text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedFiles.gosi}
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
                  name="nationalAddressCertificateUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t('vendorPreQual.fieldNatAddressCert')}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760}
                            allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                            onGetUploadParameters={handleGetUploadURL}
                            onComplete={(result) => handleFileUpload(result, 'nationalAddressCertificateUrl', 'nationalAddress')}
                            buttonVariant="outline"
                            buttonClassName="w-full"
                          >
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              <span>{t('vendorPreQual.uploadNatAddressCert')}</span>
                            </div>
                          </ObjectUploader>
                          {uploadedFiles.nationalAddress && (
                            <p className="text-sm text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedFiles.nationalAddress}
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Public Profile Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-neutral-700" />
                <h2 className="text-xl font-semibold text-neutral-900">{t('vendorPreQual.sectionPublicTitle')}</h2>
                <Badge className="ml-auto bg-primary-600">{t('vendorPreQual.visibleToRequesters')}</Badge>
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldDisplayName')}</FormLabel>
                      <FormControl>
                        <SmartInput
                          {...field}
                          error={form.formState.errors.displayName}
                          isDirty={form.formState.dirtyFields.displayName}
                          data-testid="input-display-name"
                        />
                      </FormControl>
                      <FormDescription>{t('vendorPreQual.displayNameHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vendorPreQual.fieldLogo')}</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              allowedFileTypes={['.jpg', '.jpeg', '.png']}
                              onGetUploadParameters={handleGetUploadURL}
                              onComplete={(result) => handleFileUpload(result, 'logoUrl', 'logo')}
                              buttonVariant="outline"
                              buttonClassName="w-full"
                            >
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                <span>{t('vendorPreQual.uploadLogo')}</span>
                              </div>
                            </ObjectUploader>
                            {uploadedFiles.logo && (
                              <p className="text-sm text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                {uploadedFiles.logo}
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
                    name="headerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vendorPreQual.fieldHeader')}</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              allowedFileTypes={['.jpg', '.jpeg', '.png']}
                              onGetUploadParameters={handleGetUploadURL}
                              onComplete={(result) => handleFileUpload(result, 'headerUrl', 'header')}
                              buttonVariant="outline"
                              buttonClassName="w-full"
                            >
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                <span>{t('vendorPreQual.uploadHeader')}</span>
                              </div>
                            </ObjectUploader>
                            {uploadedFiles.header && (
                              <p className="text-sm text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                {uploadedFiles.header}
                              </p>
                            )}
                          </div>
                        </FormControl>
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
                      <FormLabel>{t('vendorPreQual.fieldBio')}</FormLabel>
                      <FormControl>
                        <SmartTextarea
                          {...field}
                          rows={6}
                          maxLength={100}
                          placeholder={t('vendorPreQual.bioPlaceholder')}
                          error={form.formState.errors.bio}
                          isDirty={form.formState.dirtyFields.bio}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        <div className="flex items-center justify-between">
                          <span>{t('vendorPreQual.bioHint')}</span>
                          <span className="text-neutral-500">
                            {t('vendorPreQual.bioCharCount', { count: (field.value || "").length })}
                          </span>
                        </div>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldCategory')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder={t('vendorPreQual.categoryPlaceholder')} />
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
                      <FormDescription>{t('vendorPreQual.categoryHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileFileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vendorPreQual.fieldCompanyProfile')}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760}
                            allowedFileTypes={['.pdf']}
                            onGetUploadParameters={handleGetUploadURL}
                            onComplete={(result) => handleFileUpload(result, 'profileFileUrl', 'companyProfile')}
                            buttonVariant="outline"
                            buttonClassName="w-full"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>{t('vendorPreQual.uploadCompanyProfile')}</span>
                            </div>
                          </ObjectUploader>
                          {uploadedFiles.companyProfile && (
                            <p className="text-sm text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedFiles.companyProfile}
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>{t('vendorPreQual.companyProfileHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vendorPreQual.fieldLinkedin')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/company/..." data-testid="input-linkedin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="xUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vendorPreQual.fieldX')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://x.com/..." data-testid="input-x" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vendorPreQual.fieldWebsite')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com" data-testid="input-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-neutral-600">
                {isSaving
                  ? t('vendorPreQual.saving')
                  : lastSaved
                  ? t('vendorPreQual.lastSaved', { time: lastSaved })
                  : ""}
              </div>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/vendor-dashboard')}
                  data-testid="button-cancel"
                >
                  {t('vendorPreQual.buttonCancel')}
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700"
                  disabled={submitMutation.isPending || progress < 100}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? t('vendorPreQual.buttonSubmitting') : t('vendorPreQual.buttonSubmit')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
