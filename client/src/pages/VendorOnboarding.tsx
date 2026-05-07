import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SmartTextarea } from "@/components/ui/smart-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { VENDOR_CATEGORIES } from "@shared/schema";
import type { UploadResult } from "@/components/ObjectUploader";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const makeStep1Schema = (t: (k: string) => string) => z.object({
  username: z.string().min(3, t('validation.usernameMin')),
  email: z.string().email(t('validation.invalidEmail')),
  password: z.string().min(6, t('validation.passwordMin')),
  name: z.string().min(2, t('validation.nameMin')),
  company: z.string().min(2, t('validation.companyNameRequired')),
});

const makeStep2Schema = (t: (k: string) => string) => z.object({
  legalCompanyName: z.string().min(2, t('validation.companyNameRequired')).max(120),
  crNumber: z.string().regex(/^\d+$/, t('validation.crNumberFormat')),
  vatCertificateUrl: z.string().optional(),
  vatNumber: z.string().optional(),
  gosiCertificateUrl: z.string().min(1, t('validation.gosiRequired')),
  nationalAddressCertificateUrl: z.string().min(1, t('validation.nationalAddressRequired')),
  displayName: z.string().min(2, t('validation.displayNameRequired')).max(60),
  logoUrl: z.string().min(1, t('validation.logoRequired')),
  headerUrl: z.string().optional(),
  bio: z.string().min(5, t('validation.bioMin')).max(100, t('validation.bioMax')),
  category: z.string().min(1, t('validation.categoryRequired')),
  profileFileUrl: z.string().min(1, t('validation.profileRequired')),
  linkedinUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal("")),
  xUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal("")),
  websiteUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal("")),
});

type Step1Form = z.infer<ReturnType<typeof makeStep1Schema>>;
type Step2Form = z.infer<ReturnType<typeof makeStep2Schema>>;

// Helper to count words in bio
const countWords = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;

export default function VendorOnboarding() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { t } = useI18n();
  const { checkAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    vat?: string;
    gosi?: string;
    nationalAddress?: string;
    logo?: string;
    header?: string;
    companyProfile?: string;
  }>({});

  const urlParams = new URLSearchParams(search);
  const redirectUrl = urlParams.get('redirect');

  // Step 1 form
  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(makeStep1Schema(t)),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
      company: "",
    },
  });

  // Step 2 form
  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(makeStep2Schema(t)),
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

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, fieldName: keyof Step2Form, fileKey: string) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', {
        fileURL: uploadURL,
      });
      const { objectPath } = await metadataResponse.json();
      
      step2Form.setValue(fieldName, objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, [fileKey]: result.successful![0].name }));
      
      toast({
        title: t('onboarding.uploaded'),
        description: `${result.successful[0].name} uploaded successfully`,
      });
    }
  };

  const handleStep1Submit = async (data: Step1Form) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/vendor-register-step1", data);
      const result = await response.json();
      
      setUserId(result.userId);
      setToken(result.token);
      
      // Store token in localStorage
      localStorage.setItem('token', result.token);
      
      toast({
        title: t('onboarding.accountCreated'),
        description: t('onboarding.accountCreatedDesc'),
      });
      
      // Pre-fill step 2 form with company name from step 1
      step2Form.setValue('legalCompanyName', data.company);
      step2Form.setValue('displayName', data.company);
      
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        title: t('onboarding.registrationFailed'),
        description: error.message || t('onboarding.failedToCreateAccount'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async (data: Step2Form) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/vendor-register-step2", data);
      await response.json();

      toast({
        title: t('onboarding.profileCreated'),
        description: t('onboarding.profileCreatedDesc'),
      });
      
      // Refresh auth state before redirecting to ensure onboardingState is updated
      await checkAuth();
      
      // Small delay to ensure auth state propagates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to traction link or dashboard
      if (redirectUrl) {
        setLocation(decodeURIComponent(redirectUrl));
      } else {
        setLocation("/vendor-dashboard");
      }
    } catch (error: any) {
      toast({
        title: t('onboarding.profileCreationFailed'),
        description: error.message || t('onboarding.failedToCreateProfile'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 2) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress indicator */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className={currentStep === 1 ? "text-primary" : "text-muted-foreground"}>
                  {t('onboarding.step1')}
                </span>
                <span className={currentStep === 2 ? "text-primary" : "text-muted-foreground"}>
                  {t('onboarding.step2')}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Account creation */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('onboarding.createVendorAccount')}</CardTitle>
              <CardDescription>
                {t('onboarding.step1Desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                  <FormField
                    control={step1Form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('onboarding.fullName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.fullNamePlaceholder')} {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.username')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth.usernamePlaceholder')} {...field} data-testid="input-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.email')} *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.password')} *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="At least 6 characters" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('onboarding.companyDisplayName')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('onboarding.companyDisplayNamePlaceholder')} {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting} size="lg" data-testid="button-next-step">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('onboarding.creatingAccount')}
                        </>
                      ) : (
                        <>
                          {t('onboarding.nextStep')}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Vendor profile (identical to VendorPreQualification) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('onboarding.step2Title')}</CardTitle>
                <CardDescription>
                  {t('onboarding.step2Desc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Form {...step2Form}>
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
                {/* Legal & Compliance Section */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="font-display font-black text-lg tracking-[-0.02em]">{t('onboarding.legalCompliance')}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={step2Form.control}
                      name="legalCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('onboarding.companyNameAsCR')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-legal-company-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="crNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CR Number *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                              placeholder="Numeric only"
                              data-testid="input-cr-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="vatCertificateUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Certificate (if applicable)</FormLabel>
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
                                  <span>{t('onboarding.uploadVatCertificate')}</span>
                                </div>
                              </ObjectUploader>
                              {uploadedFiles.vat && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
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
                      control={step2Form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Number (if applicable)</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-vat-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="gosiCertificateUrl"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>GOSI Certificate *</FormLabel>
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
                                  <span>{t('onboarding.uploadGosiCertificate')}</span>
                                </div>
                              </ObjectUploader>
                              {uploadedFiles.gosi && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
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
                      control={step2Form.control}
                      name="nationalAddressCertificateUrl"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t('onboarding.nationalAddressCertificate')}</FormLabel>
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
                                  <span>{t('onboarding.uploadNationalAddress')}</span>
                                </div>
                              </ObjectUploader>
                              {uploadedFiles.nationalAddress && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
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
                    <h3 className="font-display font-black text-lg tracking-[-0.02em]">{t('onboarding.publicProfile')}</h3>
                  </div>

                  <div className="space-y-6">
                    <FormField
                      control={step2Form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('onboarding.displayNamePublic')}</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-display-name" />
                          </FormControl>
                          <FormDescription>{t('onboarding.displayNameDesc')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={step2Form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('onboarding.logo')}</FormLabel>
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
                                    <span>{t('onboarding.uploadLogo')}</span>
                                  </div>
                                </ObjectUploader>
                                {uploadedFiles.logo && (
                                  <p className="text-sm text-green-600 flex items-center gap-1">
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
                        control={step2Form.control}
                        name="headerUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('onboarding.headerImage')}</FormLabel>
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
                                    <span>{t('onboarding.uploadHeaderImage')}</span>
                                  </div>
                                </ObjectUploader>
                                {uploadedFiles.header && (
                                  <p className="text-sm text-green-600 flex items-center gap-1">
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
                      control={step2Form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('onboarding.shortBio')}</FormLabel>
                          <FormControl>
                            <SmartTextarea 
                              {...field} 
                              rows={4}
                              maxLength={100}
                              placeholder="Describe your company, services, and expertise (5-100 characters)"
                              data-testid="input-bio"
                            />
                          </FormControl>
                          <FormDescription>
                            <div className="flex items-center justify-between">
                              <span>{t('onboarding.shortBioDesc')}</span>
                              <span className="text-muted-foreground">
                                {(field.value || "").length} / 100 characters
                              </span>
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('onboarding.category')} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select a category" />
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
                          <FormDescription>{t('onboarding.categoryDesc')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="profileFileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('onboarding.companyProfile')}</FormLabel>
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
                                  <Upload className="h-4 w-4" />
                                  <span>{t('onboarding.uploadCompanyProfile')}</span>
                                </div>
                              </ObjectUploader>
                              {uploadedFiles.companyProfile && (
                                <p className="text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {uploadedFiles.companyProfile}
                                </p>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>{t('onboarding.companyProfileDesc')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={step2Form.control}
                        name="linkedinUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('onboarding.linkedinUrl')}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://linkedin.com/company/..." data-testid="input-linkedin" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step2Form.control}
                        name="xUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>X (Twitter) URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://x.com/..." data-testid="input-x" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={step2Form.control}
                        name="websiteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('onboarding.websiteUrl')}</FormLabel>
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

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                    data-testid="button-back"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting} size="lg" data-testid="button-complete">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete Profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
