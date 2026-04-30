import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@/components/ObjectUploader";
import { Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { COMPANY_DOCUMENT_SLOTS } from "@/lib/company-documents";

interface CompanyDocumentsFormProps {
  // API mode — provide companyId; component queries and saves to the API.
  companyId?: string;
  // Draft mode — provide these when the company doesn't exist yet (onboarding).
  uploaded?: Record<string, string>;
  fileNames?: Record<string, string>;
  onDraftUpload?: (docType: string, objectPath: string, fileName: string) => void;
  // Visual options
  showRequiredBadge?: boolean;
  layout?: "onboarding" | "compact";
}

export function CompanyDocumentsForm({
  companyId,
  uploaded: draftUploaded = {},
  fileNames: draftFileNames = {},
  onDraftUpload,
  showRequiredBadge = true,
  layout = "onboarding",
}: CompanyDocumentsFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [justUploadedTypes, setJustUploadedTypes] = useState<Set<string>>(new Set());

  // API mode: fetch existing docs from the server
  const { data: existingDocs = [] } = useQuery<
    { id: string; documentType: string; originalName: string | null }[]
  >({
    queryKey: ["/api/companies", companyId, "documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/companies/${companyId}/documents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!companyId,
  });

  const saveDocumentMutation = useMutation({
    mutationFn: async ({
      documentType,
      fileUrl,
      originalName,
    }: {
      documentType: string;
      fileUrl: string;
      originalName?: string;
    }) => {
      const res = await apiRequest("POST", `/api/companies/${companyId}/documents`, {
        documentType,
        fileUrl,
        originalName,
      });
      if (!res.ok) throw new Error("Failed to save document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "documents"] });
    },
  });

  const handleGetUploadURL = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleUploadComplete = (docType: string) => async (result: UploadResult) => {
    if (!result.successful?.[0]) return;
    try {
      const uploadURL = result.successful[0].uploadURL;
      const fileName = result.successful[0].name || docType;
      const metaRes = await apiRequest("PUT", "/api/objects/metadata", { fileURL: uploadURL });
      const { objectPath } = await metaRes.json();

      if (companyId) {
        // API mode: persist to server
        await saveDocumentMutation.mutateAsync({ documentType: docType, fileUrl: objectPath, originalName: fileName });
        setJustUploadedTypes((prev) => new Set(Array.from(prev).concat(docType)));
        toast({
          title: t("onboardingPanel.documentUploadedTitle"),
          description: t("onboardingPanel.documentUploadedDesc").replace("{name}", fileName),
        });
      } else {
        // Draft mode: hand off to parent
        onDraftUpload?.(docType, objectPath, fileName);
      }
    } catch {
      toast({
        title: t("onboardingPanel.uploadFailedTitle"),
        description: t("onboardingPanel.uploadFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const isCompact = layout === "compact";

  return (
    <div className={`space-y-${isCompact ? "3" : "4"}`}>
      {COMPANY_DOCUMENT_SLOTS.map((slot) => {
        let isUploaded: boolean;
        let uploadedName: string | undefined;

        if (companyId) {
          const existingDoc = existingDocs.find((d) => d.documentType === slot.type);
          isUploaded = !!existingDoc || justUploadedTypes.has(slot.type);
          uploadedName = existingDoc?.originalName ?? undefined;
        } else {
          isUploaded = !!draftUploaded[slot.type];
          uploadedName = draftFileNames[slot.type];
        }

        return (
          <div
            key={slot.type}
            className={`border rounded-xl p-4 bg-white transition-colors ${
              isUploaded ? "border-green-200 bg-green-50/40" : "border-neutral-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-neutral-900">
                    {t(`onboardingPanel.${slot.labelKey}`)}
                  </span>
                  {showRequiredBadge && slot.required && !isUploaded && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      isCompact
                        ? "text-[#E25E45] bg-[#E25E45]/10"
                        : "text-red-600 bg-red-50 border border-red-100"
                    }`}>
                      {t("onboardingPanel.requiredBadge")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400">{t(`onboardingPanel.${slot.descKey}`)}</p>
                {isUploaded && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {uploadedName || t("onboardingPanel.uploadedLabel")}
                  </p>
                )}
              </div>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                allowedFileTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                onGetUploadParameters={handleGetUploadURL}
                onComplete={handleUploadComplete(slot.type)}
                buttonVariant="outline"
                buttonClassName="shrink-0"
              >
                <div className="flex items-center gap-1.5 text-sm">
                  <Upload className="h-3.5 w-3.5" />
                  {isUploaded ? t("onboardingPanel.replaceBtn") : t("onboardingPanel.uploadBtn")}
                </div>
              </ObjectUploader>
            </div>
          </div>
        );
      })}
    </div>
  );
}
