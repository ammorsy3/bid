import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import Navbar from "@/components/navbar";
import TenderCard from "@/components/tender-card";
import CreateTenderModal from "@/components/create-tender-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, Users, Clock, User, Copy, ExternalLink, UserPlus, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { Tender } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

interface RequesterProfile {
  id: string;
  requesterId: string;
  tractionSlug: string;
  companyName: string;
  bio: string;
  logoUrl: string | null;
  industry: string | null;
  companySize: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function RequesterDashboard() {
  const { user, activeCompany } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showUnverifiedDialog, setShowUnverifiedDialog] = useState(false);

  const isVerified = activeCompany?.verificationStatus === 'verified';

  function handleCreateTenderClick() {
    if (!isVerified) {
      setShowUnverifiedDialog(true);
    } else {
      setIsCreateModalOpen(true);
    }
  }

  const { data: tenders, isLoading } = useQuery<Tender[]>({
    queryKey: ['/api/tenders'],
    enabled: !!user,
  });

  // Fetch requester profile for traction slug
  const { data: requesterProfile, isLoading: loadingProfile, error: profileError } = useQuery<RequesterProfile>({
    queryKey: ['/api/requester/profile'],
    enabled: !!user,
    retry: false, // Don't retry on 404
  });

  // Redirect to profile creation if no profile exists (404 error)
  useEffect(() => {
    if (user && profileError && !loadingProfile) {
      toast({
        title: t('dashboard.welcomeSetup'),
        description: t('dashboard.welcomeSetupDesc'),
      });
      navigate('/requester-profile');
    }
  }, [user, profileError, loadingProfile, navigate, toast]);

  // Fetch pending join requests count
  const { data: pendingData } = useQuery<{ count: number }>({
    queryKey: ['/api/join-requests/pending-count'],
    enabled: !!user,
  });

  const activeTenders = tenders?.filter((t: any) => t.status === 'active') || [];
  const totalOffers = tenders?.reduce((sum: number, t: any) => sum + (t.offersCount || 0), 0) || 0;
  const closingSoon = tenders?.filter((t: any) => {
    const deadline = new Date(t.deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  }).length || 0;

  const pendingCount = pendingData?.count || 0;
  const tractionLink = requesterProfile?.tractionSlug
    ? `${window.location.origin}/r/${requesterProfile.tractionSlug}`
    : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.copied'),
      description: t('dashboard.linkCopiedDesc'),
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display font-black text-3xl text-foreground tracking-[-0.04em]">{t('dashboard.myTenders')}</h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.myTendersDesc')}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/requester-profile')}
              variant="outline"
              className="px-4 py-3 rounded-lg font-semibold"
              data-testid="button-manage-profile"
            >
              <User className="h-4 w-4 mr-2" />
              {t('dashboard.manageProfile')}
            </Button>
            <Button
              onClick={handleCreateTenderClick}
              className="bg-[#f33c20] hover:bg-[#d63519] text-white px-6 py-3 rounded-lg font-semibold"
              data-testid="button-create-tender"
            >
              {t('dashboard.createTender')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.activeTendersLabel')}</p>
                  <p className="text-2xl font-bold text-foreground">{activeTenders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Send className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalOffers')}</p>
                  <p className="text-2xl font-bold text-foreground">{totalOffers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Users className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.avgInvitations')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {tenders?.length ? Math.round(tenders.reduce((sum: number, t: any) => sum + (t.invitedCount || 0), 0) / tenders.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#f33c20]/10 rounded-lg flex items-center justify-center">
                    <Clock className="text-[#f33c20] h-5 w-5" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.closingSoon')}</p>
                  <p className="text-2xl font-bold text-foreground">{closingSoon}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Your Vendors Section */}
        {tractionLink && (
          <Card className="mb-8 border-2 border-[#f33c20]/20 bg-gradient-to-br from-white to-[#f33c20]/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2" data-testid="text-invite-title">
                    <UserPlus className="h-6 w-6 text-[#f33c20]" />
                    {t('dashboard.inviteYourVendors')}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {t('dashboard.inviteVendorsDesc')}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate('/vendors-base')}
                  variant="outline"
                  data-testid="button-vendors-base"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {t('dashboard.vendorsBase')}
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2" data-testid="badge-pending">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('dashboard.shareYourTractionLink')}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={tractionLink}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-traction-link"
                  />
                  <Button
                    onClick={() => copyToClipboard(tractionLink)}
                    variant="outline"
                    size="icon"
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => window.open(tractionLink, '_blank')}
                    variant="outline"
                    size="icon"
                    data-testid="button-open-link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('dashboard.tractionLinkHelper')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tenders Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('dashboard.loadingTenders')}</p>
          </div>
        ) : tenders?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{t('dashboard.noTendersCreated')}</p>
            <Button
              onClick={handleCreateTenderClick}
              className="bg-[#f33c20] hover:bg-[#d63519]"
            >
              {t('dashboard.createFirstTender')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tenders?.map((tender: any) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}
      </main>

      <CreateTenderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <Dialog open={showUnverifiedDialog} onOpenChange={setShowUnverifiedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              {activeCompany?.verificationStatus === 'under_review'
                ? t('dashboard.verificationPending')
                : activeCompany?.verificationStatus === 'rejected'
                  ? t('dashboard.verificationRejected')
                  : t('dashboard.verificationRequired')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                {activeCompany?.verificationStatus === 'under_review' ? (
                  <>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{t('dashboard.verificationPending')}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">{t('dashboard.verificationUnderReviewDesc')}</p>
                  </>
                ) : activeCompany?.verificationStatus === 'rejected' ? (
                  <>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{t('dashboard.verificationRejected')}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">{t('dashboard.verificationRejectedDesc')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">{t('dashboard.verificationRequired')}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">{t('dashboard.verificationNotVerifiedDesc')}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowUnverifiedDialog(false)}
                className="flex-1"
              >
                {t('dashboard.goBack')}
              </Button>
              {activeCompany?.verificationStatus !== 'under_review' && (
                <Button
                  onClick={() => { setShowUnverifiedDialog(false); navigate('/settings?tab=company'); }}
                  className="flex-1 bg-[#f33c20] hover:bg-[#d63519]"
                >
                  {t('dashboard.uploadDocuments')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
