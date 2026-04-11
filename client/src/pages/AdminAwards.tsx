import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Unlock, ShieldCheck, Eye, XCircle, Building2, FileText, ExternalLink, Download, User, Mail, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import { viewAuthenticatedFile, downloadAuthenticatedFile } from "@/lib/downloadFile";

const DOC_TYPE_LABELS: Record<string, string> = {
  cr_certificate: "Commercial Registration (CR)",
  vat_certificate: "VAT Certificate",
  gosi_certificate: "GOSI Certificate",
  national_address_certificate: "National Address Certificate",
  other: "Other Document",
};

export default function AdminAwards() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [selectedAward, setSelectedAward] = useState<any>(null);
  const [actionType, setActionType] = useState<"verify_unblock" | "reject_award" | "view_vendor" | null>(null);
  const [notes, setNotes] = useState("");

  // Fetch vendor documents when viewing a vendor
  const viewingCompanyId = actionType === "view_vendor" ? selectedAward?.company?.id : null;

  const { data: vendorDocs, isLoading: docsLoading } = useQuery<any[]>({
    queryKey: ["/api/companies", viewingCompanyId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/companies/${viewingCompanyId}/documents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!viewingCompanyId,
  });

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
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.failedUnblockAward'),
        variant: "destructive",
      });
    },
  });

  const verifyAndUnblockMutation = useMutation({
    mutationFn: async ({ companyId, awardId, notes }: { companyId: string; awardId: string; notes?: string }) => {
      await apiRequest("POST", `/api/admin/companies/${companyId}/verify`, { notes });
      await apiRequest("POST", `/api/admin/awards/${awardId}/unblock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/awards/blocked"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({
        title: "Company verified & award unblocked",
        description: "The vendor has been verified and their award has been released.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || "Failed to verify and unblock",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedAward(null);
    setActionType(null);
    setNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px]"><ShieldCheck className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px]">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[11px]">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px]">Not Verified</Badge>;
    }
  };

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
            {(awards as any[]).map((award: any) => {
              const isVendorVerified = award.company?.verificationStatus === 'verified';

              return (
                <Card key={award.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" data-testid={`card-award-${award.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
                          {award.tender?.title || "Unknown Tender"}
                          <Badge variant="destructive" className="text-xs">Blocked</Badge>
                        </CardTitle>

                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            <strong>Vendor:</strong> {award.company?.name || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <strong>Verification:</strong>
                            {getStatusBadge(award.company?.verificationStatus)}
                          </div>
                          <div><strong>Tender deadline:</strong> {award.tender?.deadline ? format(new Date(award.tender.deadline), 'PP') : 'N/A'}</div>
                          <div><strong>Blocked since:</strong> {award.createdAt ? format(new Date(award.createdAt), 'PP') : 'N/A'}</div>
                        </div>

                        {award.blockReason && (
                          <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg text-xs border border-red-100 dark:border-red-900/50">
                            <strong className="text-red-800 dark:text-red-300">Block reason:</strong>{" "}
                            <span className="text-red-700 dark:text-red-400">{award.blockReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedAward(award); setActionType("view_vendor"); }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Vendor
                      </Button>

                      {isVendorVerified ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => unblockMutation.mutate(award.id)}
                          disabled={unblockMutation.isPending}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Unblock Award
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => { setSelectedAward(award); setActionType("verify_unblock"); }}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Verify Vendor & Unblock
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setSelectedAward(award); setActionType("reject_award"); }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Dismiss Award
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Vendor Dialog */}
      <Dialog open={actionType === "view_vendor"} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
            <DialogDescription>Company information and verification documents</DialogDescription>
          </DialogHeader>
          {selectedAward?.company && (
            <div className="space-y-5">
              {/* Company Info */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Company Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Name:</strong> {selectedAward.company.name}</div>
                  <div><strong>Legal Name:</strong> {selectedAward.company.legalName || 'N/A'}</div>
                  <div><strong>CR #:</strong> {selectedAward.company.crNumber || 'N/A'}</div>
                  <div><strong>VAT #:</strong> {selectedAward.company.vatNumber || 'N/A'}</div>
                  <div><strong>City:</strong> {selectedAward.company.city || 'N/A'}</div>
                  <div><strong>Category:</strong> {selectedAward.company.category || 'N/A'}</div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Status</h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAward.company.verificationStatus)}
                  {selectedAward.company.rejectionReason && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Rejected: {selectedAward.company.rejectionReason}
                    </span>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Verification Documents</h3>
                {docsLoading ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading documents...</span>
                  </div>
                ) : !vendorDocs || vendorDocs.length === 0 ? (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1.5" />
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">No documents uploaded</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">This vendor has not submitted any verification documents.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vendorDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {DOC_TYPE_LABELS[doc.documentType] || doc.label || doc.documentType}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {doc.originalName || 'Document'} &middot; {format(new Date(doc.uploadedAt), 'PP')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            onClick={() => viewAuthenticatedFile(doc.fileUrl)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => downloadAuthenticatedFile(doc.fileUrl, doc.originalName || undefined)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Download</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify & Unblock Dialog */}
      <Dialog open={actionType === "verify_unblock"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Vendor & Unblock Award</DialogTitle>
            <DialogDescription>
              This will verify <strong>{selectedAward?.company?.name}</strong> and release their blocked award for <strong>{selectedAward?.tender?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50">
              <p className="text-xs text-purple-700 dark:text-purple-300">
                <strong>What happens:</strong> The vendor's company will be marked as verified, and their award will be unblocked and released immediately.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any verification notes..."
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                if (selectedAward) {
                  verifyAndUnblockMutation.mutate({
                    companyId: selectedAward.company.id,
                    awardId: selectedAward.id,
                    notes: notes || undefined,
                  });
                }
              }}
              disabled={verifyAndUnblockMutation.isPending}
            >
              {verifyAndUnblockMutation.isPending ? "Processing..." : "Verify & Unblock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Award Dialog */}
      <Dialog open={actionType === "reject_award"} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Blocked Award</DialogTitle>
            <DialogDescription>
              This will remove the blocked award for <strong>{selectedAward?.tender?.title}</strong>. The vendor will not receive the award.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <p className="text-xs text-red-700 dark:text-red-300">
              This action cannot be undone. The requester will need to award the tender to a different vendor.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedAward) {
                  unblockMutation.mutate(selectedAward.id);
                }
              }}
              disabled={unblockMutation.isPending}
            >
              {unblockMutation.isPending ? "Dismissing..." : "Dismiss Award"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
