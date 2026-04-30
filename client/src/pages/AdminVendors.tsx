import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Building2, FileText, Download, ExternalLink, User, AlertTriangle, RotateCcw, Mail, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";
import { viewAuthenticatedFile, downloadAuthenticatedFile } from "@/lib/downloadFile";

interface CompanyDoc {
  id: string;
  companyId: string;
  documentType: string;
  fileUrl: string;
  originalName: string | null;
  label: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

interface CompanyOwner {
  id: string;
  name: string;
  email: string;
}

interface PendingCompany {
  id: string;
  name: string;
  legalName: string;
  crNumber: string;
  vatNumber: string | null;
  city: string | null;
  category: string | null;
  verificationStatus: string;
  onboardingState: string;
  rejectionReason: string | null;
  createdAt: string;
  documents?: CompanyDoc[];
  owner?: CompanyOwner;
  profile?: {
    displayName: string;
    bio: string | null;
    logoUrl: string | null;
  };
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cr_certificate: "Commercial Registration (CR)",
  vat_certificate: "VAT Certificate",
  gosi_certificate: "GOSI Certificate",
  national_address_certificate: "National Address Certificate",
  other: "Other Document",
};

type StatusFilter = 'under_review' | 'all' | 'verified' | 'rejected' | 'not_verified';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'under_review', label: 'Pending Review' },
  { value: 'all', label: 'All Companies' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'not_verified', label: 'Not Verified' },
];

export default function AdminVendors() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [selectedCompany, setSelectedCompany] = useState<PendingCompany | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "view" | null>(null);
  const [notes, setNotes] = useState("");
  const [showApproveWarning, setShowApproveWarning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('under_review');
  const [searchQuery, setSearchQuery] = useState("");

  // Pending companies (existing endpoint — includes documents & owner)
  const { data: pendingCompanies, isLoading: pendingLoading } = useQuery<PendingCompany[]>({
    queryKey: ["/api/admin/companies/pending"],
  });

  // All companies (new endpoint — for other status filters)
  const { data: allCompanies, isLoading: allLoading } = useQuery<PendingCompany[]>({
    queryKey: ["/api/admin/companies", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/companies?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: statusFilter !== 'under_review',
  });

  const companies = statusFilter === 'under_review' ? pendingCompanies : allCompanies;
  const isLoading = statusFilter === 'under_review' ? pendingLoading : allLoading;

  // Client-side search filter
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.legalName.toLowerCase().includes(q) ||
      c.crNumber.toLowerCase().includes(q) ||
      (c.owner?.name || '').toLowerCase().includes(q) ||
      (c.owner?.email || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

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
    setShowApproveWarning(false);
  };

  const handleApproveClick = (company: PendingCompany) => {
    setSelectedCompany(company);
    const docs = company.documents || [];
    const hasCR = docs.some(d => d.documentType === 'cr_certificate');
    if (docs.length === 0 || !hasCR) {
      setShowApproveWarning(true);
    }
    setActionType("approve");
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

  const isResubmission = (company: PendingCompany) => !!company.rejectionReason;

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

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setSearchQuery(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {tab.value === 'under_review' && pendingCompanies && pendingCompanies.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  {pendingCompanies.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('admin.searchVendorsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-empty-state">
                {t('admin.noPendingVerifications')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {searchQuery ? t('admin.noResultsFor', { query: searchQuery }) : statusFilter === 'under_review' ? t('admin.allCompaniesReviewed') : t('admin.noCompaniesStatus')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCompanies.map((company) => {
              const docs = company.documents || [];
              const hasCR = docs.some(d => d.documentType === 'cr_certificate');
              const resubmission = isResubmission(company);

              return (
                <Card key={company.id} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" data-testid={`card-company-${company.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-base flex-wrap">
                          {company.name}
                          <Badge variant="outline" className="text-[11px]">
                            {company.verificationStatus}
                          </Badge>
                          {resubmission && (
                            <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px]">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              {t('admin.resubmission')}
                            </Badge>
                          )}
                          {docs.length === 0 && (
                            <Badge className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[11px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t('admin.noDocumentsBadge')}
                            </Badge>
                          )}
                          {docs.length > 0 && !hasCR && (
                            <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t('admin.missingCr')}
                            </Badge>
                          )}
                        </CardTitle>

                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div><strong>{t('admin.legalName')}</strong> {company.legalName}</div>
                          <div><strong>{t('admin.crHash')}</strong> {company.crNumber}</div>
                          {company.vatNumber && <div><strong>{t('admin.vatHash')}</strong> {company.vatNumber}</div>}
                          <div><strong>{t('admin.city')}</strong> {company.city || t('admin.na')}</div>
                          {company.category && <div><strong>{t('admin.categoryLabel')}</strong> {company.category}</div>}
                          <div><strong>{t('admin.submitted')}</strong> {format(new Date(company.createdAt), 'PPp')}</div>
                        </div>

                        {/* Owner info */}
                        {company.owner && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <User className="h-3.5 w-3.5" />
                            <span>{company.owner.name}</span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <Mail className="h-3.5 w-3.5" />
                            <span>{company.owner.email}</span>
                          </div>
                        )}

                        {/* Previous rejection reason (for resubmissions) */}
                        {resubmission && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs">
                            <strong className="text-amber-800 dark:text-amber-300">{t('admin.previousRejection')}</strong>{" "}
                            <span className="text-amber-700 dark:text-amber-400">{company.rejectionReason}</span>
                          </div>
                        )}

                        {/* Document summary */}
                        {docs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {docs.map(doc => (
                              <Badge
                                key={doc.id}
                                variant="outline"
                                className="text-[11px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => viewAuthenticatedFile(doc.fileUrl)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {DOC_TYPE_LABELS[doc.documentType] || doc.label || doc.documentType}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
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
                      {company.verificationStatus === 'under_review' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApproveClick(company)}
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
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={actionType === "view"} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.companyDetails')}</DialogTitle>
            <DialogDescription>{t('admin.companyDetailsDesc')}</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-5">
              {/* Basic Info */}
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

              {/* Owner Info */}
              {selectedCompany.owner && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">{t('admin.ownerSection')}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>{t('admin.nameLabel')}</strong> {selectedCompany.owner.name}</div>
                    <div><strong>{t('admin.emailLabel')}</strong> {selectedCompany.owner.email}</div>
                  </div>
                </div>
              )}

              {/* Profile */}
              {selectedCompany.profile && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">{t('admin.profileSection')}</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>{t('admin.displayNameLabel')}</strong> {selectedCompany.profile.displayName}</div>
                    {selectedCompany.profile.bio && <div><strong>{t('admin.bioLabel')}</strong> {selectedCompany.profile.bio}</div>}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">{t('admin.statusSection')}</h3>
                <div className="text-sm space-y-1">
                  <div><strong>{t('admin.verificationLabel')}</strong> {selectedCompany.verificationStatus}</div>
                  <div><strong>{t('admin.onboardingLabel')}</strong> {selectedCompany.onboardingState}</div>
                  <div><strong>{t('admin.createdLabel')}</strong> {format(new Date(selectedCompany.createdAt), 'PPp')}</div>
                </div>
              </div>

              {/* Previous Rejection */}
              {selectedCompany.rejectionReason && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <h3 className="font-semibold mb-1 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4" />
                    {t('admin.previousRejectionReason')}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{selectedCompany.rejectionReason}</p>
                </div>
              )}

              {/* Documents */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">{t('admin.verificationDocuments')}</h3>
                {!selectedCompany.documents || selectedCompany.documents.length === 0 ? (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1.5" />
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{t('admin.noDocumentsUploaded')}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{t('admin.noDocumentsUploadedDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCompany.documents.map(doc => (
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
                              {doc.originalName || t('admin.documentLabel')} &middot; {format(new Date(doc.uploadedAt), 'PP')}
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
                            <span className="text-xs">{t('admin.viewBtn')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => downloadAuthenticatedFile(doc.fileUrl, doc.originalName || undefined)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">{t('admin.downloadBtn')}</span>
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
            {/* Warning: no documents or missing CR */}
            {showApproveWarning && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {!selectedCompany?.documents?.length
                        ? t('admin.warnNoDocuments')
                        : t('admin.warnNoCRCertificate')
                      }
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      {!selectedCompany?.documents?.length
                        ? t('admin.warnVerifyWithoutDocuments')
                        : t('admin.warnVerifyWithoutCR')}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
              {approveMutation.isPending ? t('admin.verifying') : (showApproveWarning ? 'Verify Anyway' : t('admin.verifyCompanyBtn'))}
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
