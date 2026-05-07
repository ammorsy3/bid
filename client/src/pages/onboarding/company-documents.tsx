import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ArrowLeft, ArrowRight, FileCheck2, Upload, CheckCircle2, SkipForward } from "lucide-react";
import type { UploadResult } from "@/components/ObjectUploader";
import OnboardingLayout from "@/components/onboarding-layout";
import { useI18n } from "@/lib/i18n";

const DRAFT_KEY = "onboarding-draft";

function getDraft(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDraft(data: Record<string, any>) {
  const existing = getDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...data, step2Complete: true }));
}

interface DocumentSlot {
  type: string;
  label: string;
  description: string;
  required: boolean;
}

export default function CompanyDocuments() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const DOCUMENT_SLOTS: DocumentSlot[] = [
    {
      type: 'cr_certificate',
      label: t('onboarding.docCrLabel'),
      description: t('onboarding.docCrDesc'),
      required: true,
    },
    {
      type: 'vat_certificate',
      label: t('onboarding.docVatLabel'),
      description: t('onboarding.docVatDesc'),
      required: false,
    },
    {
      type: 'gosi_certificate',
      label: t('onboarding.docGosiLabel'),
      description: t('onboarding.docGosiDesc'),
      required: false,
    },
    {
      type: 'national_address_certificate',
      label: t('onboarding.docNatLabel'),
      description: t('onboarding.docNatDesc'),
      required: false,
    },
  ];

  useEffect(() => {
    if (!user) { setLocation("/"); return; }
    if (!user.otpVerified) { setLocation("/verify-email"); return; }
    const draft = getDraft();
    if (!draft.step1Complete) { setLocation("/onboarding/company-basics"); return; }
    if (draft.documents) setUploaded(draft.documents);
    if (draft.documentNames) setFileNames(draft.documentNames);
  }, [user, setLocation]);

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleUploadComplete = (docType: string) => async (result: UploadResult) => {
    if (!result.successful || !result.successful[0]) return;
    try {
      const uploadURL = result.successful[0].uploadURL;
      const fileName = result.successful[0].name || docType;

      const metaRes = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metaRes.json();

      setUploaded(prev => {
        const next = { ...prev, [docType]: objectPath };
        const names = fileNames;
        saveDraft({ documents: next, documentNames: { ...names, [docType]: fileName } });
        return next;
      });
      setFileNames(prev => {
        const next = { ...prev, [docType]: fileName };
        return next;
      });
    } catch {
      toast({ title: t('onboarding.uploadFailed'), description: t('onboarding.uploadFailedDesc'), variant: "destructive" });
    }
  };

  const handleNext = () => {
    if (Object.keys(uploaded).length === 0) {
      saveDraft({ documents: {}, documentNames: {} });
    }
    setLocation("/onboarding/company-profile");
  };

  if (!user) return null;

  return (
    <OnboardingLayout step={2}>
      <Card>
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--bid-orange)]/5 rounded-xl flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-[var(--bid-orange)]" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-foreground tracking-[-0.03em]">{t('onboarding.verificationDocsTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('onboarding.verificationDocsOptional')}</p>
            </div>
          </div>

          <div className="bg-muted border border-border rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              {t('onboarding.skipNote1')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.skipNote2')}
            </p>
          </div>

          <div className="space-y-4">
            {DOCUMENT_SLOTS.map((slot) => {
              const isUploaded = !!uploaded[slot.type];
              return (
                <div
                  key={slot.type}
                  className={`border rounded-xl p-4 transition-colors ${
                    isUploaded ? 'border-green-200 bg-green-50/40' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">{slot.label}</span>
                        {slot.required && (
                          <span className="text-xs font-medium text-[var(--bid-orange)] bg-[var(--bid-orange)]/5 px-1.5 py-0.5 rounded">
                            {t('onboarding.neededForVerification')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">{slot.description}</p>
                      {isUploaded && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {fileNames[slot.type] || t('onboarding.uploadedStatus')}
                        </p>
                      )}
                    </div>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      allowedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                      onGetUploadParameters={handleGetUploadURL}
                      onComplete={handleUploadComplete(slot.type)}
                      buttonVariant="outline"
                      buttonClassName="shrink-0"
                    >
                      <div className="flex items-center gap-1.5 text-sm">
                        <Upload className="h-3.5 w-3.5" />
                        {isUploaded ? t('onboarding.replaceBtn') : t('onboarding.uploadBtn')}
                      </div>
                    </ObjectUploader>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLocation("/onboarding/company-basics")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('onboarding.backBtn')}
            </Button>
            {Object.keys(uploaded).length === 0 ? (
              <Button
                onClick={handleNext}
                size="lg"
                variant="outline"
                className="text-muted-foreground"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                {t('onboarding.skipForNow')}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-[#FE3C01] hover:bg-[#E83501]"
              >
                {t('onboarding.continueBtn')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
