import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Building2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

export default function AdminVendors() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "view" | null>(null);
  const [notes, setNotes] = useState("");

  const { data: companies, isLoading } = useQuery({
    queryKey: ["/api/admin/companies/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ companyId, notes }: { companyId: string; notes?: string }) => {
      return await apiRequest("POST", `/api/admin/companies/${companyId}/verify`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: t('admin.companyVerified'),
        description: t('admin.companyVerifiedDesc'),
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: t('admin.error'),
        description: t('admin.failedVerifyCompany'),
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ companyId, reason }: { companyId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/companies/${companyId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: t('admin.companyRejected'),
        description: t('admin.companyRejectedDesc'),
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: t('admin.error'),
        description: t('admin.failedRejectCompany'),
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedCompany(null);
    setActionType(null);
    setNotes("");
  };

  const handleApprove = () => {
    if (selectedCompany) {
      approveMutation.mutate({ companyId: selectedCompany.id, notes });
    }
  };

  const handleReject = () => {
    if (selectedCompany && notes.trim()) {
      rejectMutation.mutate({ companyId: selectedCompany.id, reason: notes });
    }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-page-title">
            {t('admin.companyVerificationQueue')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.companyVerificationQueueDesc')}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !companies || (companies as any[]).length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-empty-state">
                {t('admin.noPendingVerifications')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All companies have been reviewed</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(companies as any[]).map((company: any) => (
              <Card key={company.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" data-testid={`card-company-${company.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {company.name}
                        <Badge variant="outline" className="ml-1 text-xs">
                          {company.verificationStatus}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2 space-y-1 text-xs">
                        <div><strong>{t('admin.legalName')}</strong> {company.legalName}</div>
                        <div><strong>{t('admin.crNumber')}</strong> {company.crNumber}</div>
                        {company.vatNumber && <div><strong>{t('admin.vatNumber')}</strong> {company.vatNumber}</div>}
                        <div><strong>{t('admin.city')}</strong> {company.city || t('admin.na')}</div>
                        {company.category && <div><strong>{t('admin.categoryLabel')}</strong> {company.category}</div>}
                        <div><strong>{t('admin.submitted')}</strong> {format(new Date(company.createdAt), 'PPp')}</div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedCompany(company); setActionType("view"); }}
                      data-testid={`button-view-${company.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('admin.viewDetails')}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => { setSelectedCompany(company); setActionType("approve"); }}
                      data-testid={`button-approve-${company.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('admin.verify')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setSelectedCompany(company); setActionType("reject"); }}
                      data-testid={`button-reject-${company.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('admin.reject')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={actionType === "view"} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.companyDetails')}</DialogTitle>
            <DialogDescription>{t('admin.companyDetailsDesc')}</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">{t('admin.basicInfo')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>{t('admin.companyNameLabel')}</strong> {selectedCompany.name}</div>
                  <div><strong>{t('admin.legalName')}</strong> {selectedCompany.legalName}</div>
                  <div><strong>{t('admin.crNumber')}</strong> {selectedCompany.crNumber}</div>
                  <div><strong>{t('admin.vatNumber')}</strong> {selectedCompany.vatNumber || t('admin.na')}</div>
                  <div><strong>{t('admin.city')}</strong> {selectedCompany.city || t('admin.na')}</div>
                  <div><strong>{t('admin.categoryLabel')}</strong> {selectedCompany.category || t('admin.na')}</div>
                </div>
              </div>
              {selectedCompany.profile && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">{t('admin.profileSection')}</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>{t('admin.displayNameLabel')}</strong> {selectedCompany.profile.displayName}</div>
                    {selectedCompany.profile.bio && <div><strong>{t('admin.bioLabel')}</strong> {selectedCompany.profile.bio}</div>}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2 text-sm">{t('admin.statusSection')}</h3>
                <div className="text-sm space-y-1">
                  <div><strong>{t('admin.verificationLabel')}</strong> {selectedCompany.verificationStatus}</div>
                  <div><strong>{t('admin.onboardingLabel')}</strong> {selectedCompany.onboardingState}</div>
                  <div><strong>{t('admin.createdLabel')}</strong> {format(new Date(selectedCompany.createdAt), 'PPp')}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-close-view">
              {t('admin.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={actionType === "approve"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.verifyCompany')}</DialogTitle>
            <DialogDescription>{t('admin.verifyCompanyDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('admin.notesOptional')}</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.addVerificationNotes')}
                className="mt-2"
                data-testid="textarea-approve-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-approve">
              {t('admin.cancel')}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? t('admin.verifying') : t('admin.verifyCompanyBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === "reject"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.rejectCompany')}</DialogTitle>
            <DialogDescription>{t('admin.rejectCompanyDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('admin.rejectionReason')}</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.rejectionReasonPlaceholder')}
                className="mt-2"
                required
                data-testid="textarea-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-reject">
              {t('admin.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!notes.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? t('admin.rejecting') : t('admin.rejectCompanyBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
