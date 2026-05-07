import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { Building2, CheckCircle2, Loader2, CalendarClock, ArrowRight, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";

interface InvitationData {
  requester: {
    id: string;
    name: string;
    company: string;
  };
  vendorEmail: string;
  tender: {
    id: string;
    title: string;
    deadline: string;
  } | null;
}

export default function VendorInvitation() {
  const [, params] = useRoute("/vendor-invitation/:token");
  const token = params?.token;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { t, language, isRtl } = useI18n();
  const [accepted, setAccepted] = useState(false);
  const isAuthenticated = !!user;

  // Fetch invitation link data
  const { data, isLoading, error } = useQuery<InvitationData>({
    queryKey: [`/api/invitation-links/${token}`],
    enabled: !!token,
    retry: false
  });

  // Accept invitation mutation
  const acceptInvitation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/invitation-links/${token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('vendorInvitation.failedToAccept'));
      }

      return response.json();
    },
    onSuccess: (result) => {
      setAccepted(true);
      toast({
        title: t('vendorInvitation.welcomeToast'),
        description: result.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('vendorInvitation.failedToAccept'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAccept = () => {
    if (!isAuthenticated || user?.role !== 'vendor') {
      toast({
        title: t('vendorInvitation.loginRequired'),
        description: t('vendorInvitation.loginRequiredDesc'),
        variant: "destructive",
      });
      navigate(`/login?redirect=/vendor-invitation/${token}`);
      return;
    }

    if (user.email !== data?.vendorEmail) {
      toast({
        title: t('vendorInvitation.emailMismatchTitle'),
        description: t('vendorInvitation.emailMismatchDesc', { email: data?.vendorEmail || '' }),
        variant: "destructive",
      });
      return;
    }

    acceptInvitation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error?.message || t('vendorInvitation.invitationNotFound');
    const isExpired = errorMessage.includes("expired") || errorMessage.includes("already accepted");

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-center text-destructive">
              {isExpired ? t('vendorInvitation.invitationExpired') : t('vendorInvitation.invitationNotFound')}
            </CardTitle>
            <CardDescription className="text-center">
              {errorMessage}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('vendorInvitation.welcomeTitle')}</CardTitle>
            <CardDescription className="text-base">
              {t('vendorInvitation.welcomeConnected', { company: data.requester.company })} {data.tender ? t('vendorInvitation.canSubmitNow') : t('vendorInvitation.futureOpportunities')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tender && (
              <Button
                onClick={() => navigate(`/tenders/${data.tender!.id}`)}
                className="w-full"
                size="lg"
                data-testid="button-view-tender"
              >
                {t('vendorInvitation.viewTender')}
                <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>
            )}
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
              data-testid="button-dashboard"
            >
              {t('vendorInvitation.goToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deadlineDate = data.tender ? new Date(data.tender.deadline) : null;
  const isDeadlineSoon = deadlineDate ? deadlineDate.getTime() - Date.now() < 24 * 60 * 60 * 1000 : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Invitation Header */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl" data-testid="text-requester-name">
                  {data.requester.company}
                </CardTitle>
                <CardDescription data-testid="text-inviter-name">
                  {t('vendorInvitation.invitedBy', { name: data.requester.name })}
                </CardDescription>
              </div>
            </div>
            <CardDescription className="text-base">
              {t('vendorInvitation.joinDescription')}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Tender Info (if linked) */}
        {data.tender && (
          <Card className={isDeadlineSoon ? "border-2 border-orange-400 bg-orange-50" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg" data-testid="text-tender-title">
                    {t('vendorInvitation.tenderLabel', { title: data.tender.title })}
                  </CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-2" data-testid="text-deadline">
                    <CalendarClock className="h-4 w-4" />
                    {t('vendorInvitation.deadlineLabel', { when: formatDistanceToNow(deadlineDate!, { addSuffix: true, locale: language === 'ar' ? ar : enUS }) })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {isDeadlineSoon && (
              <CardContent className="border-t pt-4">
                <p className="text-sm text-orange-900 dark:text-orange-200 font-medium">
                  {t('vendorInvitation.urgent')}
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Email Verification Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              {t('vendorInvitation.importantEmail', { email: data.vendorEmail })}
            </p>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('vendorInvitation.acceptInvitation')}</CardTitle>
            <CardDescription>
              {t('vendorInvitation.acceptDescription', { company: data.requester.company })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('vendorInvitation.pleaseLogin')}
                </p>
                <Button
                  onClick={() => navigate(`/login?redirect=/vendor-invitation/${token}`)}
                  className="w-full"
                  size="lg"
                  data-testid="button-login"
                >
                  {t('vendorInvitation.loginToAccept')}
                </Button>
              </div>
            ) : user?.role !== 'vendor' ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  {t('vendorInvitation.mustBeVendor')}
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full"
                  data-testid="button-switch-account"
                >
                  {t('vendorInvitation.switchAccount')}
                </Button>
              </div>
            ) : user.email !== data.vendorEmail ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  {t('vendorInvitation.wrongEmail', { email: data.vendorEmail })}
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  variant="outline"
                  className="w-full"
                  data-testid="button-switch-account"
                >
                  {t('vendorInvitation.switchAccount')}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAccept}
                disabled={acceptInvitation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-accept"
              >
                {acceptInvitation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('vendorInvitation.accepting')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('vendorInvitation.acceptInvitation')}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
