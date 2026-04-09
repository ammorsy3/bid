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

const requesterProfileSchema = z.object({
  companyName: z.string().min(2, "Company name is required").max(120),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().optional(),
  logoUrl: z.string().optional(),
  bio: z.string().min(5, "Bio must be at least 5 characters").max(100, "Bio must not exceed 100 characters"),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  contactPerson: z.string().min(2, "Contact person name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
});

type RequesterProfileForm = z.infer<typeof requesterProfileSchema>;

const FORM_ID = 'requester-profile';
const REQUIRED_FIELDS: (keyof RequesterProfileForm)[] = [
  'companyName', 'industry', 'bio', 'contactPerson', 'contactEmail'
];

const INDUSTRIES = [
  "Construction & Infrastructure",
  "Information Technology",
  "Healthcare & Medical",
  "Finance & Banking",
  "Government & Public Sector",
  "Manufacturing",
  "Energy & Utilities",
  "Education",
  "Telecommunications",
  "Real Estate",
  "Transportation & Logistics",
  "Retail",
  "Professional Services",
  "Other",
];

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
];

export default function RequesterProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [uploadedLogo, setUploadedLogo] = useState<string | undefined>(undefined);

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
        setUploadedLogo("Company Logo");
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
        title: "Success!",
        description: "Your profile has been saved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requester/profile'] });
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
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
            <h1 className="text-3xl font-bold text-neutral-900">Company Profile</h1>
          </div>
          <p className="text-neutral-600">
            Complete your company profile to start creating tenders and inviting vendors.
          </p>
        </div>

        <div className="mb-6">
          <FormProgress 
            progress={progress}
            steps={[
              { label: 'Company Info', completed: progress >= 50 },
              { label: 'Contact Details', completed: progress >= 100 },
            ]}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-semibold text-neutral-900">Company Information</h2>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
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
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-industry">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
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
                        <FormLabel>Company Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company-size">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPANY_SIZES.map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
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
                      <FormLabel>Company Description *</FormLabel>
                      <FormControl>
                        <SmartTextarea 
                          {...field} 
                          rows={4}
                          maxLength={100}
                          placeholder="Brief description of your company (5-100 characters)"
                          error={form.formState.errors.bio}
                          isDirty={form.formState.dirtyFields.bio}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        <div className="flex items-center justify-between">
                          <span>Keep it concise and informative</span>
                          <span className="text-neutral-500">
                            {(field.value || "").length} / 100 characters
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
                      <FormLabel>Company Logo</FormLabel>
                      <FormControl>
                        <ObjectUploader
                          onGetUploadParameters={handleGetUploadURL}
                          onComplete={handleLogoUpload}
                          allowedFileTypes={['image/*']}
                          maxFileSize={5 * 1024 * 1024}
                        >
                          {uploadedLogo || "Upload Logo"}
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
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <SmartInput 
                            {...field} 
                            placeholder="https://example.com"
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
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <SmartInput 
                            {...field} 
                            placeholder="https://linkedin.com/company/..."
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
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Contact Information</h2>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person *</FormLabel>
                      <FormControl>
                        <SmartInput 
                          {...field} 
                          placeholder="Full name"
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
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <SmartInput 
                            {...field} 
                            type="email"
                            placeholder="contact@company.com"
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
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <SmartInput 
                            {...field} 
                            placeholder="+966 XX XXX XXXX"
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
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700"
                disabled={submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
