import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, User as UserIcon, Users } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import { AdminPage, AdminHeader, AdminCard, AdminEmpty, SkeletonList } from "@/components/admin/AdminUI";

export default function AdminJoinRequests() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const { data: joinRequests, isLoading } = useQuery({
    queryKey: ["/api/admin/join-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest("POST", `/api/admin/join-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: t('admin.joinRequestApproved'),
        description: t('admin.joinRequestApprovedDesc'),
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: t('admin.error'),
        description: t('admin.failedApproveJoin'),
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/join-requests/${requestId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: t('admin.joinRequestRejected'),
        description: t('admin.joinRequestRejectedDesc'),
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: t('admin.error'),
        description: t('admin.failedRejectJoin'),
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedRequest(null);
    setActionType(null);
    setReason("");
  };

  const handleApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const handleReject = () => {
    if (selectedRequest && reason.trim()) {
      rejectMutation.mutate({ requestId: selectedRequest.id, reason });
    }
  };

  const pendingRequests = (joinRequests as any[])?.filter((r: any) => r.status === "pending") || [];

  return (
    <AdminLayout>
      <AdminPage>
        <AdminHeader
          eyebrow={t('admin.adminPanel')}
          eyebrowIcon={Users}
          title={t('admin.joinRequestsManagement')}
          subtitle={t('admin.joinRequestsManagementDesc')}
        />

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : pendingRequests.length === 0 ? (
          <AdminEmpty
            icon={UserIcon}
            title={t('admin.noPendingJoinRequests')}
            subtitle={t('admin.allJoinRequestsProcessed')}
            tone="positive"
          />
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => (
              <AdminCard key={request.id} hover data-testid={`card-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {request.vendorCompany?.name || t('admin.na')}
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${request.id}`}>
                          {t('admin.pendingBadge')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 text-xs">
                        {/* Reads vendorCompany/requesterCompany, which is what
                            getAllJoinRequests actually returns. This page said
                            request.vendor and printed a raw requesterId UUID —
                            invisible until it was routed. Companies have no
                            email column, so that line could never show one. */}
                        <div className="space-y-1">
                          <div>{t('admin.requestedBy')} {request.requesterCompany?.name || t('admin.na')}</div>
                          <div>
                            {t('admin.submittedAt')} {request.createdAt ? format(new Date(request.createdAt), "PPP") : t('admin.na')}
                          </div>
                          <div>{t('admin.vendorStatusLabel')} {request.vendorCompany?.verificationStatus || t('admin.na')}</div>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => { setSelectedRequest(request); setActionType("approve"); }}
                      data-testid={`button-approve-${request.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('admin.approve')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setSelectedRequest(request); setActionType("reject"); }}
                      data-testid={`button-reject-${request.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('admin.reject')}
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-view-profile-${request.id}`}>
                      {t('admin.viewProfile')}
                    </Button>
                  </div>
                </CardContent>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminPage>

      <Dialog open={actionType !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent data-testid="dialog-action">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {actionType === "approve" ? t('admin.approveJoinRequest') : t('admin.rejectJoinRequest')}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? t('admin.approveJoinDesc')
                : t('admin.rejectJoinDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">{t('admin.vendorLabel')} {selectedRequest?.vendorCompany?.name || t('admin.na')}</p>
              <p className="text-sm text-muted-foreground">{t('admin.requestedBy')} {selectedRequest?.requesterCompany?.name || t('admin.na')}</p>
            </div>
            {actionType === "reject" && (
              <div>
                <label className="text-sm font-medium" htmlFor="reason-input">
                  {t('admin.rejectionReasonInput')}
                </label>
                <Textarea
                  id="reason-input"
                  placeholder={t('admin.rejectionInputPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-2"
                  data-testid="input-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
              {t('admin.cancel')}
            </Button>
            <Button
              onClick={actionType === "approve" ? handleApprove : handleReject}
              disabled={
                (actionType === "reject" && !reason.trim()) ||
                approveMutation.isPending ||
                rejectMutation.isPending
              }
              className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              variant={actionType === "reject" ? "destructive" : "default"}
              data-testid="button-confirm"
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? t('admin.processing')
                : actionType === "approve"
                ? t('admin.approve')
                : t('admin.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
