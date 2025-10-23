import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";

interface TractionLinkData {
  requester: {
    id: string;
    name: string;
    company: string;
  };
  profile: {
    companyName: string;
    industry: string | null;
    bio: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
  };
}

export default function TractionLink() {
  const [, params] = useRoute("/r/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    category: "",
    message: ""
  });

  // Fetch traction link data
  const { data, isLoading, error } = useQuery<TractionLinkData>({
    queryKey: [`/api/r/${slug}`],
    enabled: !!slug
  });

  // Submit application mutation
  const submitApplication = useMutation({
    mutationFn: async (applicationData: any) => {
      const response = await fetch(`/api/r/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit application");
      }

      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application submitted!",
        description: "We'll notify you if your request is approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitApplication.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-destructive">Link Not Found</CardTitle>
            <CardDescription>
              This traction link doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            <CardDescription className="text-base">
              Your request to join {data.profile.companyName}'s Vendors Base has been sent. 
              We'll notify you at <span className="font-medium">{formData.contactEmail}</span> if approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              You can safely close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Company Header */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-start gap-6">
              {data.profile.logoUrl ? (
                <img 
                  src={data.profile.logoUrl} 
                  alt={data.profile.companyName}
                  className="w-20 h-20 rounded-lg object-cover border shadow-sm"
                  data-testid="img-company-logo"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2" data-testid="text-company-name">
                  {data.profile.companyName}
                </CardTitle>
                {data.profile.industry && (
                  <p className="text-sm text-muted-foreground mb-3" data-testid="text-industry">
                    {data.profile.industry}
                  </p>
                )}
                {data.profile.bio && (
                  <CardDescription className="text-base leading-relaxed" data-testid="text-bio">
                    {data.profile.bio}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          {(data.profile.websiteUrl || data.profile.linkedinUrl) && (
            <CardContent className="border-t pt-4">
              <div className="flex gap-4">
                {data.profile.websiteUrl && (
                  <a
                    href={data.profile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-website"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
                {data.profile.linkedinUrl && (
                  <a
                    href={data.profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    data-testid="link-linkedin"
                  >
                    <ExternalLink className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-form-title">Join Our Vendors Base</CardTitle>
            <CardDescription>
              Submit your request to become an approved vendor and access future tender opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Your company name"
                    data-testid="input-company-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., IT Services, Construction"
                    data-testid="input-category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="your@email.com"
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    required
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+966 xxx xxx xxx"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us about your company and why you'd like to join..."
                  rows={4}
                  data-testid="input-message"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitApplication.isPending}
                  className="flex-1"
                  data-testid="button-submit"
                >
                  {submitApplication.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>What happens next?</strong> After submitting, {data.profile.companyName} will 
              review your request. If approved, you'll be added to their Vendors Base and can access 
              future tender opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
