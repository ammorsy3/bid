import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, XCircle, Upload, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BidLogo } from "@/components/brand/BidLogo";
import { useI18n } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@/components/ObjectUploader";

export default function TenderCreateChoice() {
  const [, setLocation] = useLocation();
  const { activeCompany } = useAuthStore();
  const { t } = useI18n();

  const DOCUMENT_SLOTS = [
    { type: 'cr_certificate', label: t('onboardingPanel.docCrLabel'), description: t('onboardingPanel.docCrDesc'), required: true },
    { type: 'vat_certificate', label: t('onboardingPanel.docVatLabel'), description: t('onboardingPanel.docVatDesc'), required: false },
    { type: 'gosi_certificate', label: t('onboardingPanel.docGosiLabel'), description: t('onboardingPanel.docGosiDesc'), required: false },
    { type: 'national_address_certificate', label: t('onboardingPanel.docNationalAddressLabel'), description: t('onboardingPanel.docNationalAddressDesc'), required: false },
  ];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [docUploadedTypes, setDocUploadedTypes] = useState<Set<string>>(new Set());

  const verificationStatus = activeCompany?.verificationStatus;
  const activeCompanyId = activeCompany?.id;

  // Only company workspaces may create tenders (POST /api/tenders is behind
  // requireAccountType('company')). Individual and team workspaces are
  // auto-verified at creation, so without this check they'd satisfy the
  // isVerified branch below and get pushed straight into the wizard.
  const isCompanyAccount = (activeCompany?.accountType ?? 'company') === 'company';
  useEffect(() => {
    if (activeCompany && !isCompanyAccount) {
      toast({
        title: t('dashboard.individualRestrictedTitle'),
        description: t('dashboard.individualRestrictedDesc'),
      });
      setLocation('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, isCompanyAccount, setLocation]);

  // The old create-choice screen offered "AI" vs "manual". With AI removed there
  // is only one path, so a verified company skips this page entirely and lands
  // straight in the wizard. This page now exists solely to host the verification
  // gate below for companies that aren't verified yet (RequireVerified bounces
  // unverified users back here). Only redirect when actually verified — never on
  // an undefined status — so we can't ping-pong with RequireVerified.
  const isVerified = isCompanyAccount && verificationStatus === 'verified';
  useEffect(() => {
    if (isVerified) {
      setLocation('/tenders/new/manual', { replace: true });
    }
  }, [isVerified, setLocation]);

  const { data: existingDocs = [] } = useQuery<{ id: string; documentType: string; originalName: string | null }[]>({
    queryKey: ['/api/companies', activeCompanyId, 'documents'],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const res = await apiRequest('GET', `/api/companies/${activeCompanyId}/documents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeCompanyId && verificationStatus !== 'verified' && verificationStatus !== 'under_review',
  });

  const saveDocumentMutation = useMutation({
    mutationFn: async ({ documentType, fileUrl, originalName }: { documentType: string; fileUrl: string; originalName?: string }) => {
      const res = await apiRequest('POST', `/api/companies/${activeCompanyId}/documents`, { documentType, fileUrl, originalName });
      if (!res.ok) throw new Error('Failed to save document');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', activeCompanyId, 'documents'] });
    },
  });

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleDocumentUploadComplete = (docType: string) => async (result: UploadResult) => {
    if (!result.successful?.[0]) return;
    try {
      const uploadURL = result.successful[0].uploadURL;
      const fileName = result.successful[0].name || docType;
      const metaRes = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metaRes.json();
      await saveDocumentMutation.mutateAsync({ documentType: docType, fileUrl: objectPath, originalName: fileName });
      setDocUploadedTypes(prev => new Set([...prev, docType]));
      toast({ title: t('settings.documentUploadedToast'), description: t('tenderFlow.docUploadedReviewDesc', { name: fileName }) });
    } catch {
      toast({ title: t('settings.uploadFailedToast'), description: t('settings.uploadFailedDesc'), variant: "destructive" });
    }
  };

  if (verificationStatus && verificationStatus !== 'verified') {
    const isUnderReview = verificationStatus === 'under_review';
    const isRejected = verificationStatus === 'rejected';
    const showUploader = !isUnderReview;

    return (
      <div className="relative min-h-screen bg-card flex flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <FlickeringGrid
            className="size-full"
            squareSize={4}
            gridGap={6}
            color="rgb(254, 60, 1)"
            maxOpacity={0.08}
            flickerChance={0.1}
          />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-16">
          <header className="absolute top-0 left-0 right-0 pt-12 pb-8">
            <button onClick={() => setLocation('/dashboard')} className="w-full flex justify-center cursor-pointer">
              <BidLogo variant="orange" size={48} className="hover:opacity-80 transition-opacity" />
            </button>
          </header>

          <div className="max-w-lg w-full">
            <div className="text-center mb-8">
              <div className={`mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center ${
                isRejected ? 'bg-red-100' : isUnderReview ? 'bg-blue-100' : 'bg-amber-100'
              }`}>
                {isRejected ? (
                  <XCircle className="h-8 w-8 text-red-500" />
                ) : isUnderReview ? (
                  <Clock className="h-8 w-8 text-blue-500" />
                ) : (
                  <ShieldAlert className="h-8 w-8 text-amber-500" />
                )}
              </div>

              <h2 className="font-display font-black text-2xl text-foreground mb-2 tracking-[-0.03em]">
                {isRejected
                  ? t('onboardingPanel.verificationRejectedTitle')
                  : isUnderReview
                  ? t('onboardingPanel.verificationInProgressTitle')
                  : t('onboardingPanel.verifyToContinueTitle')}
              </h2>

              <p className="text-muted-foreground text-sm">
                {isRejected
                  ? t('onboardingPanel.verificationRejectedDesc')
                  : isUnderReview
                  ? t('onboardingPanel.verificationInProgressDesc')
                  : t('onboardingPanel.verifyToContinueDesc')}
              </p>
            </div>

            {showUploader && (
              <div className="space-y-3 mb-6">
                {DOCUMENT_SLOTS.map((slot) => {
                  const existingDoc = existingDocs.find(d => d.documentType === slot.type);
                  const justUploaded = docUploadedTypes.has(slot.type);
                  const isUploaded = !!existingDoc || justUploaded;
                  return (
                    <div
                      key={slot.type}
                      className={`border rounded-xl p-4 bg-card transition-colors ${
                        isUploaded ? 'border-green-200 bg-green-50/40' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-foreground">{slot.label}</span>
                            {slot.required && !isUploaded && (
                              <span className="text-xs font-medium text-[#FE3C01] bg-[#FE3C01]/10 px-1.5 py-0.5 rounded">
                                {t('onboardingPanel.requiredBadge')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400">{slot.description}</p>
                          {isUploaded && (
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {existingDoc?.originalName || t('onboardingPanel.uploadedLabel')}
                            </p>
                          )}
                        </div>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={52428800}
                          allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                          onGetUploadParameters={handleGetUploadURL}
                          onComplete={handleDocumentUploadComplete(slot.type)}
                          buttonVariant="outline"
                          buttonClassName="shrink-0"
                        >
                          <div className="flex items-center gap-1.5 text-sm">
                            <Upload className="h-3.5 w-3.5" />
                            {isUploaded ? t('onboardingPanel.replaceBtn') : t('onboardingPanel.uploadBtn')}
                          </div>
                        </ObjectUploader>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setLocation('/dashboard')}
              className="w-full h-11 border-border text-muted-foreground text-sm font-medium rounded-lg"
            >
              {t('onboardingPanel.backToDashboard')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Verified: the effect above is redirecting to the wizard — render nothing so
  // the removed choice screen never flashes.
  return null;
}
