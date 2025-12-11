import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { Building2, ExternalLink, CheckCircle2, Loader2, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [, params] = useRoute("/traction/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Fetch traction link data
  const { data, isLoading, error } = useQuery<TractionLinkData>({
    queryKey: ['/api/r', slug],
    enabled: !!slug
  });

  // Join vendors base mutation
  const joinBase = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/r/${slug}/apply`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted!",
        description: `Your request to join ${data?.profile.companyName}'s Vendors Base has been sent.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-page" />
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

  // Determine if user is logged in and can apply
  const isLoggedIn = !!user;

  // Success state - shown after joining
  if (joinBase.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl" data-testid="text-success-title">Request Submitted!</CardTitle>
            <CardDescription className="text-base">
              Your request to join {data.profile.companyName}'s Vendors Base has been sent. 
              You'll be notified if approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              The requester will review your profile and get back to you.
            </p>
            <Button 
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
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

        {/* Join Action Card - Contextual based on user status */}
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-join-title">Join Our Vendors Base</CardTitle>
            <CardDescription>
              Get access to future tender opportunities from {data.profile.companyName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* If not logged in */}
            {!isLoggedIn && (
              <>
                <p className="text-sm text-muted-foreground">
                  To join this Vendors Base, you need an account. Sign in or create one to continue.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate("/login?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    data-testid="button-login"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate("/signup?redirect=" + encodeURIComponent(`/traction/${slug}`))}
                    size="lg"
                    className="flex-1"
                    data-testid="button-register"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </Button>
                </div>
              </>
            )}

            {/* If logged in - ONE CLICK JOIN */}
            {isLoggedIn && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Ready to join!</strong> Click the button below to send your request. 
                    Your company profile will be shared with {data.profile.companyName}.
                  </p>
                </div>
                <Button
                  onClick={() => joinBase.mutate()}
                  disabled={joinBase.isPending}
                  size="lg"
                  className="w-full"
                  data-testid="button-join-base"
                >
                  {joinBase.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Join Vendors Base
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Your company details will be shared with {data.profile.companyName}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>What happens next?</strong> After your request is submitted, {data.profile.companyName} will 
              review your vendor profile. If approved, you'll be added to their Vendors Base and can access 
              future tender opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
