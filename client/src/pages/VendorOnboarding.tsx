import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";

// Step 1: Account credentials
const step1Schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().min(2, "Company name is required"),
});

// Step 2: Vendor pre-qualification (files temporarily optional for smooth onboarding)
const step2Schema = z.object({
  legalCompanyName: z.string().min(1, "Legal company name is required"),
  crNumber: z.string().regex(/^\d+$/, "CR number must contain only numbers").min(10, "CR number must be at least 10 digits"),
  vatCertificateUrl: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  gosiCertificateUrl: z.string().optional().or(z.literal("")), // Temporarily optional
  nationalAddressCertificateUrl: z.string().optional().or(z.literal("")), // Temporarily optional
  displayName: z.string().min(1, "Display name is required"),
  logoUrl: z.string().optional().or(z.literal("")), // Temporarily optional
  headerUrl: z.string().optional().or(z.literal("")),
  bio: z.string().min(20, "Bio must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  profileFileUrl: z.string().optional().or(z.literal("")), // Temporarily optional
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  xUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

const CATEGORIES = [
  "Construction & Infrastructure",
  "IT & Technology",
  "Consulting & Professional Services",
  "Manufacturing & Industrial",
  "Healthcare & Medical",
  "Transportation & Logistics",
  "Energy & Utilities",
  "Food & Hospitality",
  "Marketing & Communications",
  "Other"
];

export default function VendorOnboarding() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const urlParams = new URLSearchParams(search);
  const redirectUrl = urlParams.get('redirect');

  // Step 1 form
  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
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
    resolver: zodResolver(step2Schema),
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
        title: "Account created!",
        description: "Now let's complete your vendor profile.",
      });
      
      // Pre-fill step 2 form with company name from step 1
      step2Form.setValue('legalCompanyName', data.company);
      step2Form.setValue('displayName', data.company);
      
      setCurrentStep(2);
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
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
        title: "Profile completed!",
        description: "Your vendor profile has been created successfully.",
      });
      
      // Redirect to traction link or dashboard
      if (redirectUrl) {
        setLocation(decodeURIComponent(redirectUrl));
      } else {
        setLocation("/vendor-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Profile creation failed",
        description: error.message || "Failed to create profile",
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
                  1. Account Details
                </span>
                <span className={currentStep === 2 ? "text-primary" : "text-muted-foreground"}>
                  2. Vendor Profile
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
              <CardTitle>Create Vendor Account</CardTitle>
              <CardDescription>
                Step 1 of 2: Set up your account credentials
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
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} data-testid="input-name" />
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
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} data-testid="input-username" />
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
                        <FormLabel>Email *</FormLabel>
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
                        <FormLabel>Password *</FormLabel>
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
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company name" {...field} data-testid="input-company" />
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
                          Creating account...
                        </>
                      ) : (
                        <>
                          Next Step
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

        {/* Step 2: Vendor profile - simplified for now, will expand */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Vendor Profile</CardTitle>
              <CardDescription>
                Step 2 of 2: Provide your company details and qualifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step2Form}>
                <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
                  {/* Legal & Compliance Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Legal & Compliance</h3>
                    
                    <FormField
                      control={step2Form.control}
                      name="legalCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name (as per CR) *</FormLabel>
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
                            <Input placeholder="Numeric only" {...field} data-testid="input-cr-number" />
                          </FormControl>
                          <FormDescription>Enter numbers only</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Public Profile Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Public Profile</h3>
                    
                    <FormField
                      control={step2Form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name (Public) *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-display-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Bio *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell requesters about your company..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="input-bio"
                            />
                          </FormControl>
                          <FormDescription>Minimum 20 characters</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={step2Form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select your primary category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* File uploads - simplified message for now */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> File uploads for documents, certificates, and images will be required.
                      For now, you can complete this step and upload files later from your profile settings.
                    </p>
                  </div>

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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
