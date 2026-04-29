import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Calendar, Clock, CheckCircle, XCircle, Loader2, FileText, Tag, ExternalLink, AlertTriangle, ShieldCheck, Store } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AdminLayout from "@/components/AdminLayout";

interface PurchaseOrder {
  id: string;
  tenderId: string;
  status: string;
  originalName: string | null;
  fileUrl: string | null;
  createdAt: string;
}

interface MarketplaceTender {
  id: string;
  title: string;
  description: string;
  category: string | null;
  deadline: string;
  budget: string | null;
  status: string;
  invitationToken: string;
  referenceNumber: string | null;
  tenderType: string | null;
  documentFee: number | null;
  inquiryDeadline: string | null;
  marketplaceStatus: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    city: string | null;
    verificationStatus: string;
  };
  profile?: {
    displayName: string | null;
    logoUrl: string | null;
  };
}

export default function AdminMarketplace() {
  const { t, language, isRtl } = useI18n();
  const { toast } = useToast();
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const tenderTypeLabels: Record<string, string> = {
    open_tender: t('marketplace.openTender'),
    direct_purchase: t('marketplace.directPurchase'),
    framework_agreement: t('marketplace.frameworkAgreement'),
  };

  const { data: pendingTenders = [], isLoading: pendingLoading } = useQuery<MarketplaceTender[]>({
    queryKey: ["/api/admin/marketplace/pending"],
  });

  const { data: approvedTenders = [], isLoading: approvedLoading } = useQuery<MarketplaceTender[]>({
    queryKey: ["/api/admin/marketplace/approved"],
  });

  const [poStatusMap, setPoStatusMap] = useState<Record<string, PurchaseOrder[]>>({});

  const allTenders = activeTab === 'pending' ? pendingTenders : approvedTenders;
  const isLoading = activeTab === 'pending' ? pendingLoading : approvedLoading;

  useEffect(() => {
    allTenders.forEach(tender => {
      if (!poStatusMap[tender.id]) {
        fetchPOsForTender(tender.id);
      }
    });
  }, [allTenders]);

  const fetchPOsForTender = async (tenderId: string) => {
    try {
      const res = await fetch(`/api/tenders/${tenderId}/purchase-orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const pos = await res.json();
        setPoStatusMap(prev => ({ ...prev, [tenderId]: pos }));
      }
    } catch {}
  };

  const approveMutation = useMutation({
    mutationFn: async (tenderId: string) => {
      return await apiRequest("POST", `/api/admin/marketplace/${tenderId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      toast({ title: t('marketplace.approved'), description: t('marketplace.approvedDesc') });
    },
    onError: (error: Error) => {
      const msg = error.message || '';
      if (msg.includes('Purchase Order')) {
        toast({ title: t('marketplace.error'), description: t('marketplace.poRequired'), variant: "destructive" });
      } else {
        toast({ title: t('marketplace.error'), description: t('marketplace.approveError'), variant: "destructive" });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ tenderId, reason }: { tenderId: string; reason: string }) => {
      await apiRequest("POST", `/api/admin/marketplace/${tenderId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setRejectDialog(null);
      setRejectionReason("");
      toast({ title: t('marketplace.rejected'), description: t('marketplace.rejectedDesc') });
    },
    onError: () => {
      toast({ title: t('marketplace.error'), description: t('marketplace.rejectError'), variant: "destructive" });
    },
  });

  const verifyPOMutation = useMutation({
    mutationFn: async ({ poId, status }: { poId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/purchase-orders/${poId}`, { status });
    },
    onSuccess: (_, variables) => {
      Object.keys(poStatusMap).forEach(tenderId => {
        const pos = poStatusMap[tenderId];
        if (pos?.some(po => po.id === variables.poId)) {
          fetchPOsForTender(tenderId);
        }
      });
      toast({
        title: variables.status === 'verified'
          ? (t('marketplace.poVerified') || 'PO Verified')
          : (t('marketplace.poRejected') || 'PO Rejected'),
      });
    },
    onError: (error: Error) => {
      toast({ title: t('marketplace.error'), description: error.message, variant: "destructive" });
    },
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const renderTenderCard = (tender: MarketplaceTender) => {
    const pos = poStatusMap[tender.id] || [];
    const hasVerifiedPO = pos.some(po => po.status === 'verified');
    const isExpired = new Date(tender.deadline) < new Date();

    return (
      <Card key={tender.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {tenderTypeLabels[tender.tenderType || ''] || t('marketplace.openTender')}
                </Badge>
                {tender.referenceNumber && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {tender.referenceNumber}
                  </Badge>
                )}
                <Badge className={`text-xs ${
                  tender.company.verificationStatus === 'verified'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {tender.company.verificationStatus === 'verified' ? t('marketplace.verifiedCompany') : t('marketplace.unverified')}
                </Badge>
                {activeTab === 'approved' && (
                  <Badge className="text-xs bg-green-100 text-green-700">
                    <Store className="h-3 w-3 mr-1" />
                    {t('marketplace.liveOnMarketplace')}
                  </Badge>
                )}
                {isExpired && (
                  <Badge className="text-xs bg-red-100 text-red-700">
                    {t('tenderFlow.expiredLabel') || 'Expired'}
                  </Badge>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {tender.title}
              </h3>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="h-4 w-4" />
                <span>{tender.profile?.displayName || tender.company.name}</span>
                {tender.company.city && (
                  <span className="text-gray-400">· {tender.company.city}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {tender.category && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{tender.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{t('marketplace.deadline')} {formatDate(tender.deadline)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t('marketplace.submitted')} {formatDate(tender.createdAt)}</span>
                </div>
                {tender.budget && (
                  <span>{t('marketplace.budget')} {tender.budget} {t('marketplace.sar')}</span>
                )}
                <span>
                  {t('marketplace.docFee')} {tender.documentFee ? `${tender.documentFee} ${t('marketplace.sar')}` : t('marketplace.free')}
                </span>
                {tender.inquiryDeadline && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t('marketplace.inquiryDeadlineLabel') || 'Questions Cutoff'}: {formatDate(tender.inquiryDeadline)}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                {tender.description}
              </p>

              <div className="mt-3 pt-2 border-t border-gray-100">
                {pos.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{t('marketplace.noPo') || 'No Purchase Order uploaded'}</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pos.map(po => (
                      <div key={po.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-700 truncate">{po.originalName || 'PO Document'}</span>
                          <Badge className={`text-[10px] ${
                            po.status === 'verified' ? 'bg-green-100 text-green-700' :
                            po.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {po.status === 'verified' ? <ShieldCheck className="h-3 w-3 mr-0.5" /> : null}
                            {po.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {po.fileUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                // Open window immediately so browser doesn't block popup
                                const win = window.open('', '_blank');
                                if (!win) {
                                  toast({ title: 'Error', description: 'Popup blocked — please allow popups', variant: 'destructive' });
                                  return;
                                }
                                win.document.write(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666">${t('admin.loadingFile')}</body></html>`);

                                const token = localStorage.getItem('token');
                                fetch(`/api/purchase-orders/${po.id}/file`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                  .then(r => {
                                    if (!r.ok) throw new Error('Failed to fetch');
                                    const ct = r.headers.get('content-type') || 'application/octet-stream';
                                    return r.arrayBuffer().then(buf => ({ buf, ct }));
                                  })
                                  .then(({ buf, ct }) => {
                                    const blob = new Blob([buf], { type: ct });
                                    win.location.href = URL.createObjectURL(blob);
                                  })
                                  .catch(() => {
                                    win.close();
                                    toast({ title: 'Error', description: 'Could not open file', variant: 'destructive' });
                                  });
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-0.5" />
                              <span className="text-xs">{t('admin.viewBtn')}</span>
                            </Button>
                          )}
                          {po.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => verifyPOMutation.mutate({ poId: po.id, status: 'verified' })}
                                disabled={verifyPOMutation.isPending}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-0.5" />
                                <span className="text-xs">{t('marketplace.verifyPo') || 'Verify'}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => verifyPOMutation.mutate({ poId: po.id, status: 'rejected' })}
                                disabled={verifyPOMutation.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-0.5" />
                                <span className="text-xs">{t('marketplace.rejectPo') || 'Reject'}</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 lg:flex-col lg:items-end shrink-0">
              <Link href={`/invite/${tender.invitationToken}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {t('marketplace.viewRfp')}
                </Button>
              </Link>
              {activeTab === 'pending' && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveMutation.mutate(tender.id)}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    {t('marketplace.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejectDialog(tender.id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {t('marketplace.reject')}
                  </Button>
                </>
              )}
              {activeTab === 'approved' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectDialog(tender.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t('marketplace.removeFromMarketplace') || 'Remove'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className={`p-8 max-w-6xl mx-auto ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('marketplace.requests')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('marketplace.requestsSubtitle')}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'bg-[#E8614D] hover:bg-[#d54d35]' : ''}
          >
            <Clock className="h-4 w-4 mr-1.5" />
            {t('marketplace.pendingReview')}
            {pendingTenders.length > 0 && (
              <Badge className="ml-2 bg-white/20 text-white text-xs">{pendingTenders.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'approved' ? 'default' : 'outline'}
            onClick={() => setActiveTab('approved')}
            className={activeTab === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Store className="h-4 w-4 mr-1.5" />
            {t('marketplace.liveOnMarketplace')}
            {approvedTenders.length > 0 && (
              <Badge className="ml-2 bg-white/20 text-white text-xs">{approvedTenders.length}</Badge>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : allTenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              {activeTab === 'pending' ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">
                    {t('marketplace.noPendingRequests')}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('marketplace.allReviewed')}
                  </p>
                </>
              ) : (
                <>
                  <Store className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">
                    {t('marketplace.noApprovedTenders') || 'No approved tenders yet'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('marketplace.approveToShow') || 'Approved tenders will appear on the public marketplace.'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {allTenders.map(renderTenderCard)}
          </div>
        )}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('marketplace.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('marketplace.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t('marketplace.rejectionPlaceholder')}
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectionReason(""); }}>
              {t('marketplace.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && rejectMutation.mutate({ tenderId: rejectDialog, reason: rejectionReason })}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t('marketplace.confirmReject')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
