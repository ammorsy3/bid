import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface TenderInvite {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  budgetRange: string | null;
  deadline: string;
  duration: string | null;
  status: string;
  company: {
    id: string;
    name: string;
  };
  profile?: {
    displayName: string | null;
  };
}

export default function InvitationSignup() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();

  const { data: tender, isLoading, error } = useQuery<TenderInvite>({
    queryKey: ['/api/tenders', id, 'public'],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}/invite`);
      if (!response.ok) {
        throw new Error("Tender not found");
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              This invitation link is invalid or the tender has expired.
            </p>
            <Link href="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const companyName = tender.profile?.displayName || tender.company.name;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Tender Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-center" data-testid="text-invitation-title">
              You've Been Invited to Submit an Offer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tender Info Box */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-1" data-testid="text-tender-title">{tender.title}</h3>
              <p className="text-muted-foreground text-sm mb-4" data-testid="text-tender-description">
                {tender.description}
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Budget:</span>
                  <p className="font-medium" data-testid="text-budget">
                    {tender.budgetRange || tender.budget || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Deadline:</span>
                  <p className="font-medium" data-testid="text-deadline">{formatDate(tender.deadline)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium" data-testid="text-duration">
                    {tender.duration || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* From Company Box */}
            <div className="border rounded-lg p-4">
              <p className="text-sm" data-testid="text-company-name">
                <span className="text-muted-foreground">From:</span>{' '}
                <span className="font-medium">{companyName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This is a private tender. Only invited vendors can submit offers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Get Started Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg" data-testid="text-get-started-title">
              {user && activeCompany ? 'Access Tender' : 'Get Started'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user && activeCompany ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-sm">
                  Welcome back! Click below to access this tender and submit your offer.
                </p>
                <Button 
                  onClick={() => setLocation(`/tenders/${tender.id}`)}
                  className="bg-blue-500 hover:bg-blue-600"
                  data-testid="button-access-tender"
                >
                  Access Tender
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground text-sm">
                  To submit an offer for this tender, you need to sign in or create a Bid account.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href={`/login?redirect=/invite/${id}`}>
                    <Button variant="outline" className="min-w-32" data-testid="button-sign-in">
                      Sign In
                    </Button>
                  </Link>
                  <Link href={`/register?redirect=/invite/${id}`}>
                    <Button className="min-w-48 bg-blue-500 hover:bg-blue-600" data-testid="button-create-account">
                      Create a Bid Account
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  After signing in, you'll be automatically redirected to this tender.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
