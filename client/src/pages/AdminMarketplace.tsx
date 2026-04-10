import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Calendar, Clock, CheckCircle, XCircle, Loader2, FileText, Tag, ExternalLink, AlertTriangle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface PurchaseOrder {
  id: string;
  tenderId: string;
  status: string;
  createdAt: string;
}

interface PendingTender {
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

  const tenderTypeLabels: Record<string, string> = {
    open_tender: t('marketplace.openTender'),
    direct_purchase: t('marketplace.directPurchase'),
    framework_agreement: t('marketplace.frameworkAgreement'),
  };

  const { data: pendingTenders = [], isLoading } = useQuery<PendingTender[]>({
    queryKey: ["/api/admin/marketplace/pending"],
  });

  const [poStatusMap, setPoStatusMap] = useState<Record<string, PurchaseOrder[]>>({});

  useEffect(() => {
    pendingTenders.forEach(tender => {
      if (!poStatusMap[tender.id]) {
        fetchPOsForTender(tender.id);
      }
    });
  }, [pendingTenders]);

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
      const res = await apiRequest("POST", `/api/admin/marketplace/${tenderId}/approve`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace/pending"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/metrics"] });
      setRejectDialog(null);
      setRejectionReason("");
      toast({ title: t('marketplace.rejected'), description: t('marketplace.rejectedDesc') });
    },
    onError: () => {
      toast({ title: t('marketplace.error'), description: t('marketplace.rejectError'), variant: "destructive" });
    },
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('marketplace.requests')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('marketplace.requestsSubtitle')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : pendingTenders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600">
                {t('marketplace.noPendingRequests')}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {t('marketplace.allReviewed')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingTenders.map((tender) => (
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
                      </div>

                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {tender.description}
                      </p>

                      {poStatusMap[tender.id] !== undefined && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          {poStatusMap[tender.id].length === 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>{t('marketplace.poRequired')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              {poStatusMap[tender.id].map(po => (
                                <Badge key={po.id} className={`text-xs ${
                                  po.status === 'verified' ? 'bg-green-100 text-green-700' :
                                  po.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {po.status === 'verified' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                                  PO: {po.status}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 lg:flex-col lg:items-end shrink-0">
                      <Link href={`/invite/${tender.invitationToken}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {t('marketplace.viewRfp')}
                        </Button>
                      </Link>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
}
