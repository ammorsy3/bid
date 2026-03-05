import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import VendorInvitationCard from "@/components/vendor-invitation-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Trophy, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { Tender, Offer } from "@shared/schema";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function VendorDashboard() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const { t } = useI18n();

  // Redirect to pre-qualification if vendor is not verified or under review
  useEffect(() => {
    if (user && user.verificationStatus === 'not_verified') {
      navigate('/vendor-prequalification');
    }
  }, [user, navigate]);

  const { data: invitations, isLoading } = useQuery<Tender[]>({
    queryKey: ['/api/tenders'],
    enabled: !!user,
  });

  const { data: myOffers } = useQuery<Offer[]>({
    queryKey: ['/api/my-offers'],
    enabled: !!user,
  });

  const newInvitations = invitations?.filter((inv: any) => inv.status === 'pending') || [];
  const offersSubmitted = myOffers?.length || 0;
  const awardsWon = 0; // This would need additional logic to track awards

  if (!user) return null;

  const verificationStatus = user.verificationStatus || 'not_verified';

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{t('dashboard.tenderInvitations')}</h1>
              <p className="text-neutral-600 mt-1">{t('dashboard.tenderInvitationsDesc')}</p>
            </div>
            {verificationStatus === 'verified' && (
              <Badge className="bg-success-600 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {t('dashboard.verified')}
              </Badge>
            )}
          </div>

          {/* Verification Status Alerts */}
          {verificationStatus === 'not_verified' && (
            <Alert className="bg-warning-50 border-warning-200 mb-6">
              <AlertCircle className="h-4 w-4 text-warning-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-warning-800">
                  {t('dashboard.completePreQual')}
                </span>
                <Button
                  onClick={() => navigate('/vendor-prequalification')}
                  className="bg-primary-600 hover:bg-primary-700"
                  data-testid="button-start-prequalification"
                >
                  {t('dashboard.startPreQual')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus === 'under_review' && (
            <Alert className="bg-primary-50 border-primary-200 mb-6">
              <Clock className="h-4 w-4 text-primary-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-primary-800">
                  {t('dashboard.underReviewAlert')}
                </span>
                <Button
                  variant="outline"
                  onClick={() => navigate('/vendor-prequalification')}
                  data-testid="button-update-prequalification"
                >
                  {t('dashboard.updateProfile')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Mail className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">{t('dashboard.newInvitations')}</p>
                  <p className="text-2xl font-bold text-neutral-900">{newInvitations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Send className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">{t('dashboard.offersSubmitted')}</p>
                  <p className="text-2xl font-bold text-neutral-900">{offersSubmitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Trophy className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-neutral-600">{t('dashboard.awardsWon')}</p>
                  <p className="text-2xl font-bold text-neutral-900">{awardsWon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">{t('dashboard.loadingInvitations')}</p>
          </div>
        ) : invitations?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">{t('dashboard.noInvitationsYet')}</p>
            <p className="text-sm text-neutral-500 mt-2">{t('dashboard.noInvitationsDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {invitations?.map((invitation: any) => (
              <VendorInvitationCard key={invitation.id} invitation={invitation} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
