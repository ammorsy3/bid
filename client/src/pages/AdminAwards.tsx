import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Unlock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";

export default function AdminAwards() {
  const { toast } = useToast();
  const { t } = useI18n();

  const { data: awards, isLoading } = useQuery({
    queryKey: ["/api/admin/awards/blocked"],
  });

  const unblockMutation = useMutation({
    mutationFn: async (awardId: string) => {
      return await apiRequest("POST", `/api/admin/awards/${awardId}/unblock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/awards/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: t('admin.awardUnblocked'),
        description: t('admin.awardUnblockedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.failedUnblockAward'),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
            {t('admin.blockedAwardsManagement')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('admin.blockedAwardsDesc')}
          </p>
        </div>

        {!awards || awards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600" data-testid="text-empty-state">
                {t('admin.noBlockedAwards')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {awards.map((award: any) => (
              <Card key={award.id} data-testid={`card-award-${award.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {award.tender?.title || "Unknown Tender"}
                        <Badge variant="destructive" data-testid={`badge-status-${award.id}`}>
                          {t('admin.blocked')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <div>{t('admin.vendorLabel')} {award.vendor?.name || t('common.notFound')}</div>
                          <div>{t('admin.vendorStatusLabel')} {award.vendor?.verificationStatus || t('admin.na')}</div>
                          <div>{t('admin.tenderDeadline')} {award.tender?.deadline || t('admin.na')}</div>
                          <div>
                            {t('admin.blockedSince')} {award.createdAt ? format(new Date(award.createdAt), "PPP") : t('admin.na')}
                          </div>
                          {award.blockReason && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                              <strong>{t('admin.reason')}</strong> {award.blockReason}
                            </div>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unblockMutation.mutate(award.id)}
                    disabled={
                      unblockMutation.isPending ||
                      award.vendor?.verificationStatus !== "verified"
                    }
                    data-testid={`button-unblock-${award.id}`}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    {award.vendor?.verificationStatus === "verified"
                      ? t('admin.unblockAward')
                      : t('admin.cannotUnblock')}
                  </Button>
                  {award.vendor?.verificationStatus !== "verified" && (
                    <p className="text-sm text-gray-600 mt-2">
                      {t('admin.cannotUnblockDesc')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
