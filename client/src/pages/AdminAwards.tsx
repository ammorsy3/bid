import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Unlock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

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

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-page-title">
            {t('admin.blockedAwardsManagement')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.blockedAwardsDesc')}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !awards || (awards as any[]).length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-empty-state">
                {t('admin.noBlockedAwards')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No awards are currently blocked</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(awards as any[]).map((award: any) => (
              <Card key={award.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" data-testid={`card-award-${award.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {award.tender?.title || "Unknown Tender"}
                        <Badge variant="destructive" className="text-xs" data-testid={`badge-status-${award.id}`}>
                          {t('admin.blocked')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs">
                        <div className="space-y-1">
                          <div>{t('admin.vendorLabel')} {award.vendor?.name || t('common.notFound')}</div>
                          <div>{t('admin.vendorStatusLabel')} {award.vendor?.verificationStatus || t('admin.na')}</div>
                          <div>{t('admin.tenderDeadline')} {award.tender?.deadline || t('admin.na')}</div>
                          <div>
                            {t('admin.blockedSince')} {award.createdAt ? format(new Date(award.createdAt), "PPP") : t('admin.na')}
                          </div>
                          {award.blockReason && (
                            <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm border border-red-100 dark:border-red-900/50">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {t('admin.cannotUnblockDesc')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
