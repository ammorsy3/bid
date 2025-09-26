import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";
import type { Tender, User } from "@shared/schema";

export default function InvitationSignup() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();

  const { data: tender, isLoading, error } = useQuery<Tender & { requester: User }>({
    queryKey: ['/api/tenders/by-token', token],
    enabled: !!token,
  });

  useEffect(() => {
    // If user is already logged in and is a vendor, redirect to tender details
    if (user && user.role === 'vendor' && tender) {
      setLocation(`/tenders/${tender.id}`);
    }
  }, [user, tender, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-600">Loading invitation...</p>
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-error-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-neutral-600 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <Link href="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && user.role !== 'vendor') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-warning-600">Wrong Account Type</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-neutral-600 mb-4">
              You're logged in as a requester. Please log out and sign in with a vendor account to access this tender.
            </p>
            <Button variant="outline" onClick={() => setLocation('/login')}>
              Switch Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-neutral-900">
              You've Been Invited to Submit an Offer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h3 className="font-semibold text-primary-900 mb-2">{tender.title}</h3>
              <p className="text-primary-800 text-sm mb-3">{tender.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium text-primary-900">Budget:</span>
                  <p className="text-primary-700">{tender.budget || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-primary-900">Deadline:</span>
                  <p className="text-primary-700">{tender.deadline}</p>
                </div>
                <div>
                  <span className="font-medium text-primary-900">Duration:</span>
                  <p className="text-primary-700">{tender.duration || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <p className="text-sm text-neutral-600 mb-3">
                <strong>From:</strong> {tender.requester.name} ({tender.requester.company})
              </p>
              <p className="text-xs text-neutral-500">
                This is a private tender. Only invited vendors can submit offers.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-neutral-900">
              {user ? 'Access Tender' : 'Get Started'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="text-center space-y-4">
                <p className="text-neutral-600">
                  Welcome back, {user.name}! Click below to access this tender and submit your offer.
                </p>
                <Button 
                  onClick={() => setLocation(`/tenders/${tender.id}`)}
                  className="w-full"
                  data-testid="button-access-tender"
                >
                  Access Tender
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-neutral-600 mb-6">
                  To submit an offer for this tender, you need to sign in or create a vendor account.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/login">
                    <Button variant="outline" className="w-full" data-testid="button-login">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full" data-testid="button-register">
                      Create Vendor Account
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-center text-neutral-500 mt-4">
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