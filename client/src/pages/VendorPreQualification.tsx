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
import { Badge } from "@/components/ui/badge";
import { useAutosave } from "@/lib/autosave";
import { calculateFormProgress } from "@/lib/form-validation";
import { CheckCircle2, Building2, FileText, User, Sparkles, Upload } from "lucide-react";
import { useLocation } from "wouter";
import type { UploadResult } from "@uppy/core";

const preQualificationSchema = z.object({
  // Legal & Compliance
  legalCompanyName: z.string().min(2, "Company name is required").max(120),
  crNumber: z.string().min(1, "CR number is required"),
  vatCertificateUrl: z.string().optional(),
  vatNumber: z.string().optional(),
  gosiCertificateUrl: z.string().optional(),
  nationalAddressLine1: z.string().min(1, "Address is required"),
  nationalAddressCity: z.string().min(1, "City is required"),
  nationalAddressRegion: z.string().min(1, "Region is required"),
  nationalAddressPostalCode: z.string().min(1, "Postal code is required"),
  nationalAddressCountry: z.string().default("Saudi Arabia"),
  
  // Public Profile
  displayName: z.string().min(2, "Display name is required").max(60),
  logoUrl: z.string().optional(),
  headerUrl: z.string().optional(),
  headerColor: z.string().optional(),
  bio: z.string().min(100, "Bio must be at least 100 characters").max(1500, "Bio is too long"),
  categories: z.string().min(1, "Categories are required (comma-separated, 3-7 items)"),
  profileFileUrl: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  xUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type PreQualificationForm = z.infer<typeof preQualificationSchema>;

const FORM_ID = 'vendor-prequalification';
const REQUIRED_FIELDS: (keyof PreQualificationForm)[] = [
  'legalCompanyName', 'crNumber', 'nationalAddressLine1', 'nationalAddressCity', 
  'nationalAddressRegion', 'nationalAddressPostalCode', 'displayName', 'bio', 'categories'
];

export default function VendorPreQualification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [uploadedFiles, setUploadedFiles] = useState<{
    vat?: string;
    gosi?: string;
    logo?: string;
    header?: string;
    profilePdf?: string;
  }>({});

  const form = useForm<PreQualificationForm>({
    resolver: zodResolver(preQualificationSchema),
    defaultValues: {
      legalCompanyName: "",
      crNumber: "",
      vatCertificateUrl: "",
      vatNumber: "",
      gosiCertificateUrl: "",
      nationalAddressLine1: "",
      nationalAddressCity: "",
      nationalAddressRegion: "",
      nationalAddressPostalCode: "",
      nationalAddressCountry: "Saudi Arabia",
      displayName: "",
      logoUrl: "",
      headerUrl: "",
      headerColor: "",
      bio: "",
      categories: "",
      profileFileUrl: "",
      linkedinUrl: "",
      xUrl: "",
      websiteUrl: "",
    },
  });

  const formValues = form.watch();
  const { lastSaved, isSaving } = useAutosave(FORM_ID, formValues, true);
  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  // Check if vendor has existing qualification
  const { data: existingQualification } = useQuery({
    queryKey: ['/api/vendor/qualification'],
  });

  useEffect(() => {
    if (existingQualification && typeof existingQualification === 'object') {
      // Convert categories array to comma-separated string
      const qual = existingQualification as any;
      const categoriesString = Array.isArray(qual.categories) ? qual.categories.join(', ') : '';
      
      form.reset({
        ...qual,
        categories: categoriesString,
        linkedinUrl: qual.linkedinUrl || "",
        xUrl: qual.xUrl || "",
        websiteUrl: qual.websiteUrl || "",
      });
    }
  }, [existingQualification, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: PreQualificationForm) => {
      // Convert categories string to array
      const categoriesArray = data.categories
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0);

      if (categoriesArray.length < 3 || categoriesArray.length > 7) {
        throw new Error("Please provide 3-7 categories");
      }

      const response = await apiRequest('POST', '/api/vendor/prequalification', {
        ...data,
        categories: categoriesArray,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your pre-qualification has been submitted for review",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      navigate('/vendor-dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit pre-qualification",
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
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, fieldName: keyof PreQualificationForm, fileKey: string) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', {
        fileURL: uploadURL,
      });
      const { objectPath } = await metadataResponse.json();
      
      form.setValue(fieldName, objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, [fileKey]: result.successful![0].name }));
      
      toast({
        title: "Uploaded!",
        description: `${result.successful[0].name} uploaded successfully`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-neutral-900">Vendor Pre-Qualification</h1>
          </div>
          <p className="text-neutral-600">
            Complete your profile to start receiving tender invitations. All legal documents are private and used only for verification.
          </p>
        </div>

        <div className="mb-6">
          <FormProgress 
            progress={progress}
            steps={[
              { label: 'Legal & Compliance', completed: progress >= 50 },
              { label: 'Public Profile', completed: progress >= 100 },
            ]}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Legal & Compliance Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="h-5 w-5 text-neutral-700" />
                <h2 className="text-xl font-semibold text-neutral-900">Legal & Compliance</h2>
                <Badge variant="outline" className="ml-auto">Private</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="legalCompanyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name (as per CR) *</FormLabel>
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
                      <FormLabel>CR Number *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          error={form.formState.errors.crNumber}
                          isDirty={form.formState.dirtyFields.crNumber}
                          data-testid="input-cr-number"
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
                              <span>Upload VAT Certificate</span>
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
                      <FormLabel>VAT Number (if applicable)</FormLabel>
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
                      <FormLabel>GOSI Certificate</FormLabel>
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
                              <span>Upload GOSI Certificate</span>
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
                  name="nationalAddressLine1"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>National Address *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          placeholder="Street address"
                          error={form.formState.errors.nationalAddressLine1}
                          isDirty={form.formState.dirtyFields.nationalAddressLine1}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationalAddressCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          error={form.formState.errors.nationalAddressCity}
                          isDirty={form.formState.dirtyFields.nationalAddressCity}
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationalAddressRegion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          error={form.formState.errors.nationalAddressRegion}
                          isDirty={form.formState.dirtyFields.nationalAddressRegion}
                          data-testid="input-region"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationalAddressPostalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          error={form.formState.errors.nationalAddressPostalCode}
                          isDirty={form.formState.dirtyFields.nationalAddressPostalCode}
                          data-testid="input-postal-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationalAddressCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled data-testid="input-country" />
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
                <h2 className="text-xl font-semibold text-neutral-900">Public Profile</h2>
                <Badge className="ml-auto bg-primary-600">Visible to Requesters</Badge>
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name (Public) *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          error={form.formState.errors.displayName}
                          isDirty={form.formState.dirtyFields.displayName}
                          data-testid="input-display-name"
                        />
                      </FormControl>
                      <FormDescription>How your company will appear to requesters</FormDescription>
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
                        <FormLabel>Logo</FormLabel>
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
                                <span>Upload Logo (512x512 min)</span>
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
                        <FormLabel>Header Image or Color</FormLabel>
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
                                <span>Upload Header Image</span>
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
                      <FormLabel>Short Bio *</FormLabel>
                      <FormControl>
                        <SmartTextarea 
                          {...field} 
                          rows={6}
                          maxLength={1500}
                          placeholder="Describe your company, services, and expertise (100-1500 characters)"
                          error={form.formState.errors.bio}
                          isDirty={form.formState.dirtyFields.bio}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>Keep it clear and focused on your services</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories/Tags *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          placeholder="e.g., Construction, IT Services, Consulting (3-7 categories, comma-separated)"
                          error={form.formState.errors.categories}
                          isDirty={form.formState.dirtyFields.categories}
                          data-testid="input-categories"
                        />
                      </FormControl>
                      <FormDescription>Add 3-7 categories that best describe your work</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileFileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile File (PDF Brochure)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={10485760}
                            allowedFileTypes={['.pdf']}
                            onGetUploadParameters={handleGetUploadURL}
                            onComplete={(result) => handleFileUpload(result, 'profileFileUrl', 'profilePdf')}
                            buttonVariant="outline"
                            buttonClassName="w-full"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>Upload Company Brochure (PDF, 1-5 pages recommended)</span>
                            </div>
                          </ObjectUploader>
                          {uploadedFiles.profilePdf && (
                            <p className="text-sm text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {uploadedFiles.profilePdf}
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>Optional: upload a one-pager PDF to introduce your company</FormDescription>
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
                        <FormLabel>LinkedIn URL</FormLabel>
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
                        <FormLabel>X (Twitter) URL</FormLabel>
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
                        <FormLabel>Website URL</FormLabel>
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
                {isSaving ? "Saving..." : lastSaved ? `Last saved: ${lastSaved}` : ""}
              </div>
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/vendor-dashboard')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700"
                  disabled={submitMutation.isPending || progress < 100}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
