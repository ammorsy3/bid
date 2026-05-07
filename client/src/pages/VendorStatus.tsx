import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Edit, FileCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

interface VendorQualification {
  id: string;
  vendorId: string;
  updatedAt?: string;
  reviewerNote?: string;
}

export default function VendorStatus() {
  const { user } = useAuthStore();
  const { t } = useI18n();

  const { data: qualification, isLoading } = useQuery<VendorQualification>({
    queryKey: ['/api/vendor/qualification'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-1/3" />
            <div className="h-64 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    switch (user?.verificationStatus) {
      case 'verified':
        return {
          icon: <CheckCircle2 className="h-12 w-12 text-success-600" />,
          badge: (
            <Badge className="bg-success-600 text-white px-4 py-2 text-base">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('vendorStatus.badgeVerified')}
            </Badge>
          ),
          title: t('vendorStatus.titleVerified'),
          description: t('vendorStatus.descVerified'),
          bgColor: "bg-success-50",
          borderColor: "border-success-200"
        };
      case 'under_review':
        return {
          icon: <Clock className="h-12 w-12 text-primary-600" />,
          badge: (
            <Badge className="bg-primary-600 text-white px-4 py-2 text-base">
              <Clock className="h-4 w-4 mr-2" />
              {t('vendorStatus.badgeUnderReview')}
            </Badge>
          ),
          title: t('vendorStatus.titleUnderReview'),
          description: t('vendorStatus.descUnderReview'),
          bgColor: "bg-primary-50",
          borderColor: "border-primary-200"
        };
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-muted-foreground" />,
          badge: (
            <Badge variant="outline" className="border-neutral-400 text-muted-foreground px-4 py-2 text-base">
              <AlertCircle className="h-4 w-4 mr-2" />
              {t('vendorStatus.badgeNotVerified')}
            </Badge>
          ),
          title: t('vendorStatus.titleDefault'),
          description: t('vendorStatus.descDefault'),
          bgColor: "bg-muted",
          borderColor: "border-border"
        };
    }
  };

  const statusInfo = getStatusInfo();
  const lastUpdated = qualification?.updatedAt
    ? format(new Date(qualification.updatedAt), "PPpp")
    : t('vendorStatus.notAvailable');

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl text-foreground mb-2 tracking-[-0.04em]">{t('vendorStatus.accountStatusTitle')}</h1>
          <p className="text-muted-foreground">{t('vendorStatus.accountStatusDesc')}</p>
        </div>

        <Card className={`mb-6 border-2 ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                {statusInfo.icon}
              </div>
              <div className="flex-1">
                <div className="mb-3">
                  {statusInfo.badge}
                </div>
                <h2 className="font-display font-black text-2xl text-foreground mb-2 tracking-[-0.03em]">
                  {statusInfo.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {statusInfo.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('vendorStatus.lastUpdatedTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid="text-last-updated">
                {lastUpdated}
              </p>
            </CardContent>
          </Card>

          {qualification?.reviewerNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('vendorStatus.reviewerNoteTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground" data-testid="text-reviewer-note">
                  {qualification.reviewerNote}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('vendorStatus.quickActionsTitle')}</CardTitle>
            <CardDescription>{t('vendorStatus.quickActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/vendor-prequalification">
                <a className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto transition-colors cursor-pointer" data-testid="button-edit-profile">
                  <Edit className="h-4 w-4 mr-2" />
                  {t('vendorStatus.editProfile')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Link>

              <Link href="/vendor-prequalification">
                <a className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto transition-colors cursor-pointer" data-testid="button-update-compliance">
                  <FileCheck className="h-4 w-4 mr-2" />
                  {t('vendorStatus.updateCompliance')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>

        {user?.verificationStatus !== 'verified' && (
          <Card className="mt-6 bg-[var(--bid-orange)]/5 border-[var(--bid-orange)]/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--bid-orange)]/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-[var(--bid-orange)]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">{t('vendorStatus.whatsNextTitle')}</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {user?.verificationStatus === 'under_review'
                      ? t('vendorStatus.whatsNextUnderReview')
                      : t('vendorStatus.whatsNextDefault')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
