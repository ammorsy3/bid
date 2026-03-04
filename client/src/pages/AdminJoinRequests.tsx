import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";

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

  const pendingRequests = joinRequests?.filter((r: any) => r.status === "pending") || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
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
            {t('admin.joinRequestsManagement')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('admin.joinRequestsManagementDesc')}
          </p>
        </div>

        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600" data-testid="text-empty-state">
                {t('admin.noPendingJoinRequests')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => (
              <Card key={request.id} data-testid={`card-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {request.vendor?.name || "Unknown Vendor"}
                        <Badge variant="secondary" data-testid={`badge-status-${request.id}`}>
                          {t('admin.pendingBadge')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="space-y-1">
                          <div>{t('admin.vendorEmail')} {request.vendor?.email || t('admin.na')}</div>
                          <div>{t('admin.requesterId')} {request.requesterId}</div>
                          <div>
                            {t('admin.submittedAt')} {request.createdAt ? format(new Date(request.createdAt), "PPP") : t('admin.na')}
                          </div>
                          <div>{t('admin.vendorStatusLabel')} {request.vendor?.verificationStatus || t('admin.na')}</div>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType("approve");
                      }}
                      data-testid={`button-approve-${request.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('admin.approve')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType("reject");
                      }}
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
              </Card>
            ))}
          </div>
        )}
      </div>

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
              <p className="text-sm font-medium mb-2">{t('admin.vendorLabel')} {selectedRequest?.vendor?.name}</p>
              <p className="text-sm text-gray-600">{t('admin.emailLabel')} {selectedRequest?.vendor?.email}</p>
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
    </div>
  );
}
