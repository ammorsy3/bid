import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ArrowLeft, ArrowRight, FileCheck2, Upload, CheckCircle2 } from "lucide-react";
import type { UploadResult } from "@/components/ObjectUploader";
import OnboardingLayout from "@/components/onboarding-layout";

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

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    type: 'cr_certificate',
    label: 'Commercial Registration (CR)',
    description: 'Saudi CR certificate issued by the Ministry of Commerce',
    required: true,
  },
  {
    type: 'vat_certificate',
    label: 'VAT Certificate',
    description: 'VAT registration certificate from ZATCA',
    required: false,
  },
  {
    type: 'gosi_certificate',
    label: 'GOSI Certificate',
    description: 'General Organization for Social Insurance certificate',
    required: false,
  },
  {
    type: 'national_address_certificate',
    label: 'National Address Certificate',
    description: 'Registered national address from Saudi Post',
    required: false,
  },
];

export default function CompanyDocuments() {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  // Load any previously saved documents from draft
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

      // Update local state
      setUploaded(prev => {
        const next = { ...prev, [docType]: objectPath };
        // Persist to draft immediately
        const names = fileNames;
        saveDraft({ documents: next, documentNames: { ...names, [docType]: fileName } });
        return next;
      });
      setFileNames(prev => {
        const next = { ...prev, [docType]: fileName };
        return next;
      });
    } catch {
      toast({ title: "Upload failed", description: "Could not process the file. Please try again.", variant: "destructive" });
    }
  };

  const handleNext = () => {
    // Draft already saved on each upload — just navigate
    // If no documents uploaded, save empty so the draft is still marked as complete
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
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Verification Documents</h2>
              <p className="text-sm text-neutral-500">Upload your company documents for review</p>
            </div>
          </div>

          <p className="text-sm text-neutral-400 mb-6">
            These documents are used to verify your company. You can skip this step and upload them later — you'll need them before creating your first tender.
          </p>

          <div className="space-y-4">
            {DOCUMENT_SLOTS.map((slot) => {
              const isUploaded = !!uploaded[slot.type];
              return (
                <div
                  key={slot.type}
                  className={`border rounded-xl p-4 transition-colors ${
                    isUploaded ? 'border-green-200 bg-green-50/40' : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-neutral-900">{slot.label}</span>
                        {slot.required && (
                          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                            For verification
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">{slot.description}</p>
                      {isUploaded && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {fileNames[slot.type] || 'Uploaded'}
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
                        {isUploaded ? 'Replace' : 'Upload'}
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
              Back
            </Button>
            <Button
              onClick={handleNext}
              size="lg"
              className="bg-[#E25E45] hover:bg-[#d04a32]"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
