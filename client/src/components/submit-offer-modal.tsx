import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SmartTextarea, SmartInput } from "@/components/ui/smart-input";
import { FormProgress, DraftIndicator } from "@/components/ui/form-progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { FileText, DollarSign, AlertTriangle, Clock, ClipboardList, Check, X, ShieldAlert, Video, Info, Files, File } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAutosave, DraftStorage } from "@/lib/autosave";
import { calculateFormProgress } from "@/lib/form-validation";
import { useFormKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UploadResult } from "@uppy/core";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";

type SubmissionType = 'quote_only' | 'tech_fin_proposal' | 'video_only' | 'tech_fin_with_video';
type UploadMode = 'combined' | 'separate';

const baseSchema = z.object({
  notes: z.string().optional(),
});

const quoteOnlySchema = baseSchema.extend({
  quotePrice: z.number().min(1, "Price quote is required"),
});

const videoOnlySchema = baseSchema.extend({
  videoUrl: z.string().url("Please enter a valid video URL").min(1, "Video URL is required"),
});

const techFinSeparateSchema = baseSchema.extend({
  technicalFileUrl: z.string().min(1, "Technical proposal is required"),
  financialFileUrl: z.string().min(1, "Financial proposal is required"),
});

const techFinCombinedSchema = baseSchema.extend({
  combinedFileUrl: z.string().min(1, "Combined proposal file is required"),
});

const techFinWithVideoSeparateSchema = baseSchema.extend({
  technicalFileUrl: z.string().min(1, "Technical proposal is required"),
  financialFileUrl: z.string().min(1, "Financial proposal is required"),
  videoUrl: z.string().url("Please enter a valid video URL").optional(),
});

const techFinWithVideoCombinedSchema = baseSchema.extend({
  combinedFileUrl: z.string().min(1, "Combined proposal file is required"),
  videoUrl: z.string().url("Please enter a valid video URL").optional(),
});

function getSchema(submissionType?: SubmissionType, videoRequired?: boolean, uploadMode?: UploadMode) {
  switch (submissionType) {
    case 'quote_only':
      return quoteOnlySchema;
    case 'video_only':
      return videoOnlySchema;
    case 'tech_fin_with_video': {
      const base = uploadMode === 'combined' ? techFinWithVideoCombinedSchema : techFinWithVideoSeparateSchema;
      if (videoRequired) {
        return base.extend({
          videoUrl: z.string().url("Please enter a valid video URL").min(1, "Video is required for this tender"),
        });
      }
      return base;
    }
    case 'tech_fin_proposal':
    default:
      return uploadMode === 'combined' ? techFinCombinedSchema : techFinSeparateSchema;
  }
}

type SubmitOfferForm = {
  technicalFileUrl?: string;
  financialFileUrl?: string;
  combinedFileUrl?: string;
  quotePrice?: number;
  videoUrl?: string;
  notes?: string;
};

const SUBMISSION_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: {
    quote_only: "Price Quote Only",
    tech_fin_proposal: "Full Proposal (Technical + Financial)",
    video_only: "Video Pitch Only",
    tech_fin_with_video: "Full Proposal + Video",
    document: "Document Submission",
  },
  ar: {
    quote_only: "عرض سعر فقط",
    tech_fin_proposal: "عرض كامل (فني + مالي)",
    video_only: "عرض فيديو فقط",
    tech_fin_with_video: "عرض كامل + فيديو",
    document: "تقديم مستند",
  },
};

const modalStrings: Record<string, Record<string, string>> = {
  en: {
    submitProposal: "Submit Proposal",
    pressToSubmit: "Press",
    toSubmit: "to submit",
    toClose: "to close",
    unsavedDraft: "You have an unsaved draft from earlier",
    discard: "Discard",
    loadDraft: "Load Draft",
    alreadySubmitted: "Already Submitted",
    alreadySubmittedDesc: "Your offer for this tender has already been submitted. You cannot submit multiple offers for the same tender.",
    close: "Close",
    submissionType: "Submission Type:",
    videoRequired: "(Video required)",
    priceQuote: "Price quote",
    videoPitch: "Video pitch",
    combinedProposal: "Combined proposal",
    technicalProposal: "Technical proposal",
    financialProposal: "Financial proposal",
    tenderBudget: "Tender Budget:",
    priceCompetitively: "Price your offer competitively",
    verificationRequired: "Verification Required",
    completePreQual: "Complete your pre-qualification to submit offers.",
    completeProfile: "Complete Profile",
    priceQuoteLabel: "Your Price Quote (SAR) *",
    enterPrice: "Enter your price in SAR",
    videoPitchUrl: "Video Pitch URL",
    optional: "(Optional)",
    videoPlaceholder: "https://youtube.com/watch?v=... or https://vimeo.com/...",
    videoHelp: "Share a video explaining your approach, qualifications, and why you're the right fit for this project.",
    uploadQuestion: "How would you like to upload your proposal?",
    singleFile: "Single File",
    singleFileDesc: "Both technical & financial in one document",
    separateFiles: "Separate Files",
    separateFilesDesc: "Upload technical & financial separately",
    combinedLabel: "Combined Proposal (Technical + Financial) *",
    uploadCombined: "Upload your combined proposal",
    combinedHint: "One file containing both technical and financial sections \u2022 PDF, DOC, DOCX \u2022 Max 10MB",
    technicalLabel: "Technical Proposal *",
    uploadTechnical: "Upload technical proposal",
    technicalHint: "PDF, DOC, DOCX \u2022 Max 10MB",
    financialLabel: "Financial Proposal *",
    uploadFinancial: "Upload financial proposal",
    financialHint: "PDF, DOC, XLS \u2022 Max 10MB",
    additionalNotes: "Additional Notes",
    notesPlaceholder: "Any additional information, clarifications, or value propositions...",
    submissionSummary: "Submission Summary",
    tender: "Tender:",
    client: "Client:",
    deadline: "Deadline:",
    uploadFormat: "Upload format:",
    singleCombined: "Single combined file",
    separateTechFin: "Separate technical & financial files",
    warning: "Once submitted, you cannot modify your offer. Please review all documents carefully.",
    cancel: "Cancel",
    submitting: "Submitting...",
    submitProposalBtn: "Submit Proposal",
    draftLoaded: "Draft loaded",
    draftLoadedDesc: "Your previous work has been restored",
    draftDiscarded: "Draft discarded",
    draftDiscardedDesc: "Starting with a fresh form",
    uploadedTech: "Technical proposal uploaded successfully",
    uploadedFin: "Financial proposal uploaded successfully",
    uploadedCombined: "Proposal file uploaded successfully",
    uploaded: "Uploaded!",
    success: "Success!",
    offerSubmitted: "Offer submitted successfully",
  },
  ar: {
    submitProposal: "تقديم العرض",
    pressToSubmit: "اضغط",
    toSubmit: "للتقديم",
    toClose: "للإغلاق",
    unsavedDraft: "لديك مسودة غير محفوظة من قبل",
    discard: "تجاهل",
    loadDraft: "تحميل المسودة",
    alreadySubmitted: "تم التقديم مسبقاً",
    alreadySubmittedDesc: "تم تقديم عرضك لهذا المناقصة بالفعل. لا يمكنك تقديم عروض متعددة لنفس المناقصة.",
    close: "إغلاق",
    submissionType: "نوع التقديم:",
    videoRequired: "(الفيديو مطلوب)",
    priceQuote: "عرض السعر",
    videoPitch: "فيديو العرض",
    combinedProposal: "العرض المدمج",
    technicalProposal: "العرض الفني",
    financialProposal: "العرض المالي",
    tenderBudget: "ميزانية المناقصة:",
    priceCompetitively: "قدّم سعراً تنافسياً",
    verificationRequired: "التحقق مطلوب",
    completePreQual: "أكمل التأهيل المسبق لتقديم العروض.",
    completeProfile: "إكمال الملف",
    priceQuoteLabel: "عرض السعر (ريال سعودي) *",
    enterPrice: "أدخل السعر بالريال السعودي",
    videoPitchUrl: "رابط فيديو العرض",
    optional: "(اختياري)",
    videoPlaceholder: "https://youtube.com/watch?v=... أو https://vimeo.com/...",
    videoHelp: "شارك فيديو يوضح منهجيتك ومؤهلاتك ولماذا أنت الأنسب لهذا المشروع.",
    uploadQuestion: "كيف تود رفع عرضك؟",
    singleFile: "ملف واحد",
    singleFileDesc: "العرض الفني والمالي في مستند واحد",
    separateFiles: "ملفات منفصلة",
    separateFilesDesc: "رفع العرض الفني والمالي بشكل منفصل",
    combinedLabel: "العرض المدمج (فني + مالي) *",
    uploadCombined: "ارفع العرض المدمج",
    combinedHint: "ملف واحد يحتوي على القسمين الفني والمالي \u2022 PDF, DOC, DOCX \u2022 حد أقصى 10 ميغابايت",
    technicalLabel: "العرض الفني *",
    uploadTechnical: "ارفع العرض الفني",
    technicalHint: "PDF, DOC, DOCX \u2022 حد أقصى 10 ميغابايت",
    financialLabel: "العرض المالي *",
    uploadFinancial: "ارفع العرض المالي",
    financialHint: "PDF, DOC, XLS \u2022 حد أقصى 10 ميغابايت",
    additionalNotes: "ملاحظات إضافية",
    notesPlaceholder: "أي معلومات إضافية أو توضيحات أو مقترحات قيمة...",
    submissionSummary: "ملخص التقديم",
    tender: "المناقصة:",
    client: "العميل:",
    deadline: "الموعد النهائي:",
    uploadFormat: "صيغة الرفع:",
    singleCombined: "ملف واحد مدمج",
    separateTechFin: "ملفات فنية ومالية منفصلة",
    warning: "بعد التقديم، لا يمكنك تعديل عرضك. يرجى مراجعة جميع المستندات بعناية.",
    cancel: "إلغاء",
    submitting: "جاري التقديم...",
    submitProposalBtn: "تقديم العرض",
    draftLoaded: "تم تحميل المسودة",
    draftLoadedDesc: "تم استعادة عملك السابق",
    draftDiscarded: "تم تجاهل المسودة",
    draftDiscardedDesc: "بدء نموذج جديد",
    uploadedTech: "تم رفع العرض الفني بنجاح",
    uploadedFin: "تم رفع العرض المالي بنجاح",
    uploadedCombined: "تم رفع ملف العرض بنجاح",
    uploaded: "تم الرفع!",
    success: "تم بنجاح!",
    offerSubmitted: "تم تقديم العرض بنجاح",
  },
};

interface SubmitOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender: {
    id: string;
    title: string;
    deadline: string;
    budget?: string;
    submissionType?: SubmissionType;
    videoRequired?: boolean;
  };
  requester: {
    name: string;
    company?: string;
  };
}

const FORM_ID_PREFIX = 'submit-offer-';

function getRequiredFields(submissionType?: SubmissionType, uploadMode?: UploadMode): string[] {
  switch (submissionType) {
    case 'quote_only':
      return ['quotePrice'];
    case 'video_only':
      return ['videoUrl'];
    case 'tech_fin_with_video':
      return uploadMode === 'combined' ? ['combinedFileUrl'] : ['technicalFileUrl', 'financialFileUrl'];
    case 'tech_fin_proposal':
    default:
      return uploadMode === 'combined' ? ['combinedFileUrl'] : ['technicalFileUrl', 'financialFileUrl'];
  }
}

export default function SubmitOfferModal({ isOpen, onClose, tender, requester }: SubmitOfferModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany, user } = useAuthStore();
  const [, navigate] = useLocation();
  const { language, isRtl } = useI18n();
  const s = (key: string) => modalStrings[language]?.[key] || modalStrings.en[key] || key;
  const stLabel = (type: string) => SUBMISSION_TYPE_LABELS[language]?.[type] || SUBMISSION_TYPE_LABELS.en[type] || type;
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    technical?: string;
    financial?: string;
    combined?: string;
  }>({});
  const [uploadMode, setUploadMode] = useState<UploadMode>('separate');

  const showQuoteField = tender.submissionType === 'quote_only';
  const showVideoField = tender.submissionType === 'video_only' || tender.submissionType === 'tech_fin_with_video';
  const showTechFinFields = !showQuoteField && tender.submissionType !== 'video_only';
  const showUploadModeChoice = showTechFinFields;

  const FORM_ID = `${FORM_ID_PREFIX}${tender.id}`;
  
  const { data: existingOffers } = useQuery({
    queryKey: ['/api/my-offers', tender.id],
    enabled: isOpen && !!user && !!activeCompany,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return [];
      const res = await fetch('/api/my-offers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const offers = await res.json();
      return offers.filter((offer: any) => offer.tenderId === tender.id);
    },
  });

  const hasExistingOffer = existingOffers && existingOffers.length > 0;

  const verificationStatus = activeCompany?.verificationStatus || 'not_verified';
  const canSubmitOffer = verificationStatus === 'verified' || verificationStatus === 'under_review';

  const requiredFields = useMemo(() => getRequiredFields(tender.submissionType, uploadMode), [tender.submissionType, uploadMode]);

  const schemaRef = useRef(getSchema(tender.submissionType, tender.videoRequired, uploadMode));
  schemaRef.current = getSchema(tender.submissionType, tender.videoRequired, uploadMode);

  const form = useForm<SubmitOfferForm>({
    resolver: async (values, context, options) => {
      return zodResolver(schemaRef.current)(values, context, options);
    },
    defaultValues: {
      technicalFileUrl: "",
      financialFileUrl: "",
      combinedFileUrl: "",
      quotePrice: undefined,
      videoUrl: "",
      notes: "",
    },
  });

  useEffect(() => {
    form.clearErrors();
  }, [uploadMode]);

  const formValues = form.watch();
  const { lastSaved, isSaving, clearDraft, loadDraft } = useAutosave(
    FORM_ID,
    formValues,
    isOpen
  );

  const progress = useMemo(() => {
    let completed = 0;
    requiredFields.forEach((field) => {
      const value = formValues[field as keyof SubmitOfferForm];
      const isFilled = value !== undefined && value !== null && value !== '' &&
        (typeof value !== 'number' || (value > 0 && !isNaN(value)));
      if (isFilled) completed++;
    });
    return requiredFields.length > 0 ? Math.round((completed / requiredFields.length) * 100) : 100;
  }, [formValues, requiredFields]);

  const deadlineDate = new Date(tender.deadline);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const remaining = formatDistanceToNow(deadlineDate, { addSuffix: true, locale: language === 'ar' ? ar : enUS });
      const urgent = deadlineDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
      
      setTimeRemaining(remaining);
      setIsUrgent(urgent);
    };
    
    if (isOpen) {
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen, deadlineDate]);

  useEffect(() => {
    if (isOpen) {
      const draft = DraftStorage.load<SubmitOfferForm>(FORM_ID);
      if (draft) {
        setHasDraft(true);
        setShowDraftPrompt(true);
      } else {
        setHasDraft(false);
        setShowDraftPrompt(false);
      }
    }
  }, [isOpen, FORM_ID]);

  useFormKeyboardShortcuts({
    onSubmit: () => {
      form.handleSubmit(onSubmit)();
    },
    onCancel: handleClose,
    enabled: isOpen,
  });

  const submitOfferMutation = useMutation({
    mutationFn: async (data: SubmitOfferForm) => {
      const response = await apiRequest('POST', `/api/tenders/${tender.id}/offers`, data);
      return response.json();
    },
    onSuccess: () => {
      clearDraft();
      toast({
        title: s('success'),
        description: s('offerSubmitted'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-offers'] });
      onClose();
      form.reset();
      setUploadedFiles({});
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to submit offer";
      toast({
        title: message.includes("already submitted") ? "Already Submitted" : "Error",
        description: message,
        variant: "destructive",
      });
      if (message.includes("already submitted")) {
        queryClient.invalidateQueries({ queryKey: ['/api/my-offers', tender.id] });
      }
    },
  });

  const onSubmit = (data: SubmitOfferForm) => {
    submitOfferMutation.mutate(data);
  };

  function handleClose() {
    onClose();
    form.reset();
    setUploadedFiles({});
    setShowDraftPrompt(false);
    setHasDraft(false);
  }

  function handleLoadDraft() {
    const draft = loadDraft();
    if (draft) {
      form.reset(draft.data);
      setShowDraftPrompt(false);
      toast({
        title: s('draftLoaded'),
        description: s('draftLoadedDesc'),
      });
    }
  }

  function handleDiscardDraft() {
    clearDraft();
    setShowDraftPrompt(false);
    setHasDraft(false);
    toast({
      title: s('draftDiscarded'),
      description: s('draftDiscardedDesc'),
    });
  }

  const handleGetUploadURL = async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleTechnicalUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metadataResponse.json();
      form.setValue('technicalFileUrl', objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, technical: result.successful![0].name }));
      toast({ title: s('uploaded'), description: s('uploadedTech') });
    }
  };

  const handleFinancialUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metadataResponse.json();
      form.setValue('financialFileUrl', objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, financial: result.successful![0].name }));
      toast({ title: s('uploaded'), description: s('uploadedFin') });
    }
  };

  const handleCombinedUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metadataResponse.json();
      form.setValue('combinedFileUrl', objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, combined: result.successful![0].name }));
      toast({ title: s('uploaded'), description: s('uploadedCombined') });
    }
  };

  function handleUploadModeChange(mode: UploadMode) {
    setUploadMode(mode);
    setUploadedFiles({});
    form.setValue('technicalFileUrl', '', { shouldValidate: false });
    form.setValue('financialFileUrl', '', { shouldValidate: false });
    form.setValue('combinedFileUrl', '', { shouldValidate: false });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={`max-w-3xl max-h-[90vh] overflow-y-auto ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
            <DialogTitle className={`text-2xl font-semibold text-neutral-900 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <ClipboardList className="h-6 w-6 text-[#E25E45]" />
              {s('submitProposal')}
            </DialogTitle>
            <DraftIndicator
              lastSaved={lastSaved}
              isSaving={isSaving}
              hasDraft={hasDraft}
              onLoadDraft={handleLoadDraft}
              language={language}
            />
          </div>
          <p className="text-neutral-600 mt-2">{tender.title} - {requester.company || requester.name}</p>
          <p className="text-sm text-neutral-600 mt-1">
            {s('pressToSubmit')} <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-xs">Ctrl+Enter</kbd> {s('toSubmit')} • <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-xs">Esc</kbd> {s('toClose')}
          </p>
        </DialogHeader>

        {showDraftPrompt && !hasExistingOffer && (
          <Alert className="bg-primary-50 border-primary-200">
            <ClipboardList className="h-4 w-4 text-primary-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-primary-900">{s('unsavedDraft')}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
                  {s('discard')}
                </Button>
                <Button size="sm" onClick={handleLoadDraft} className="bg-primary-600 hover:bg-primary-700">
                  {s('loadDraft')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {hasExistingOffer ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 mb-4">
              <Check className="h-8 w-8 text-success-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">{s('alreadySubmitted')}</h3>
            <p className="text-center text-neutral-600 mb-6">
              {s('alreadySubmittedDesc')}
            </p>
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              {s('close')}
            </Button>
          </div>
        ) : (
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {tender.submissionType && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <strong className="text-blue-900">{s('submissionType')}</strong>{' '}
                  <span className="text-blue-800">{stLabel(tender.submissionType)}</span>
                  {tender.videoRequired && tender.submissionType === 'tech_fin_with_video' && (
                    <span className={`text-orange-600 ${isRtl ? 'mr-2' : 'ml-2'}`}>{s('videoRequired')}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <FormProgress
                  progress={progress}
                  language={language}
                  steps={
                    showQuoteField
                      ? [{ label: s('priceQuote'), completed: !!formValues.quotePrice }]
                      : showVideoField && !showTechFinFields
                      ? [{ label: s('videoPitch'), completed: !!formValues.videoUrl }]
                      : showVideoField && showTechFinFields
                      ? uploadMode === 'combined'
                        ? [
                            { label: s('combinedProposal'), completed: !!formValues.combinedFileUrl },
                            { label: s('videoPitch'), completed: !!formValues.videoUrl || !tender.videoRequired },
                          ]
                        : [
                            { label: s('technicalProposal'), completed: !!formValues.technicalFileUrl && !form.formState.errors.technicalFileUrl },
                            { label: s('financialProposal'), completed: !!formValues.financialFileUrl && !form.formState.errors.financialFileUrl },
                            { label: s('videoPitch'), completed: !!formValues.videoUrl || !tender.videoRequired },
                          ]
                      : uploadMode === 'combined'
                        ? [{ label: s('combinedProposal'), completed: !!formValues.combinedFileUrl }]
                        : [
                            { label: s('technicalProposal'), completed: !!formValues.technicalFileUrl && !form.formState.errors.technicalFileUrl },
                            { label: s('financialProposal'), completed: !!formValues.financialFileUrl && !form.formState.errors.financialFileUrl },
                          ]
                  }
                />
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isUrgent ? 'bg-error-50 text-error-700' : 'bg-neutral-100 text-neutral-700'}`}>
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{timeRemaining}</span>
              </div>
            </div>

            {tender.budget && (
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  <strong>{s('tenderBudget')}</strong> {tender.budget} • {s('priceCompetitively')}
                </AlertDescription>
              </Alert>
            )}

            {!canSubmitOffer && (
              <Alert className="bg-error-50 border-error-200">
                <ShieldAlert className="h-4 w-4 text-error-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-error-900">{s('verificationRequired')}</strong>
                      <p className="text-sm text-error-800 mt-1">{s('completePreQual')}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-primary-600 hover:bg-primary-700"
                      onClick={() => {
                        handleClose();
                        navigate('/company-onboarding');
                      }}
                      data-testid="button-prequalify"
                    >
                      {s('completeProfile')}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            


            {showQuoteField && (
              <FormField
                control={form.control}
                name="quotePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{s('priceQuoteLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400`} />
                        <input
                          type="number"
                          placeholder={s('enterPrice')}
                          className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                          dir="ltr"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              field.onChange(undefined);
                            } else {
                              const num = Number(val);
                              field.onChange(isNaN(num) ? undefined : num);
                            }
                          }}
                          data-testid="input-quote-price"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showVideoField && (
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {s('videoPitchUrl')} {tender.videoRequired || tender.submissionType === 'video_only' ? '*' : s('optional')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Video className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400`} />
                        <input
                          type="url"
                          placeholder={s('videoPlaceholder')}
                          dir="ltr"
                          className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                          data-testid="input-video-url"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-neutral-500 mt-1">
                      {s('videoHelp')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showUploadModeChoice && (
              <>
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-3">{s('uploadQuestion')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleUploadModeChange('combined')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        uploadMode === 'combined'
                          ? 'border-[#E25E45] bg-[#E25E45]/5'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${uploadMode === 'combined' ? 'bg-[#E25E45]/10' : 'bg-neutral-100'}`}>
                        <File className={`h-5 w-5 ${uploadMode === 'combined' ? 'text-[#E25E45]' : 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${uploadMode === 'combined' ? 'text-[#E25E45]' : 'text-neutral-700'}`}>{s('singleFile')}</p>
                        <p className="text-xs text-neutral-500">{s('singleFileDesc')}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUploadModeChange('separate')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        uploadMode === 'separate'
                          ? 'border-[#E25E45] bg-[#E25E45]/5'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${uploadMode === 'separate' ? 'bg-[#E25E45]/10' : 'bg-neutral-100'}`}>
                        <Files className={`h-5 w-5 ${uploadMode === 'separate' ? 'text-[#E25E45]' : 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${uploadMode === 'separate' ? 'text-[#E25E45]' : 'text-neutral-700'}`}>{s('separateFiles')}</p>
                        <p className="text-xs text-neutral-500">{s('separateFilesDesc')}</p>
                      </div>
                    </button>
                  </div>
                </div>

                {uploadMode === 'combined' && (
                  <FormField
                    control={form.control}
                    name="combinedFileUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{s('combinedLabel')}</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={10485760}
                              allowedFileTypes={['.pdf', '.doc', '.docx']}
                              onGetUploadParameters={handleGetUploadURL}
                              onComplete={handleCombinedUploadComplete}
                              buttonVariant="outline"
                              buttonClassName="w-full h-24 border-2 border-dashed"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <File className="h-6 w-6 text-neutral-400" />
                                <div className="text-center">
                                  <p className="text-sm text-neutral-600">{s('uploadCombined')}</p>
                                  <p className="text-xs text-neutral-500">{s('combinedHint')}</p>
                                </div>
                              </div>
                            </ObjectUploader>
                            {uploadedFiles.combined && (
                              <div className="flex items-center gap-2 text-sm text-success-600">
                                <Check className="h-4 w-4" />
                                <span>{uploadedFiles.combined}</span>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {uploadMode === 'separate' && (
                  <>
                    <FormField
                      control={form.control}
                      name="technicalFileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{s('technicalLabel')}</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={10485760}
                                allowedFileTypes={['.pdf', '.doc', '.docx']}
                                onGetUploadParameters={handleGetUploadURL}
                                onComplete={handleTechnicalUploadComplete}
                                buttonVariant="outline"
                                buttonClassName="w-full h-24 border-2 border-dashed"
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <FileText className="h-6 w-6 text-neutral-400" />
                                  <div className="text-center">
                                    <p className="text-sm text-neutral-600">{s('uploadTechnical')}</p>
                                    <p className="text-xs text-neutral-500">{s('technicalHint')}</p>
                                  </div>
                                </div>
                              </ObjectUploader>
                              {uploadedFiles.technical && (
                                <div className="flex items-center gap-2 text-sm text-success-600">
                                  <Check className="h-4 w-4" />
                                  <span>{uploadedFiles.technical}</span>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="financialFileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{s('financialLabel')}</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <ObjectUploader
                                maxNumberOfFiles={1}
                                maxFileSize={10485760}
                                allowedFileTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx']}
                                onGetUploadParameters={handleGetUploadURL}
                                onComplete={handleFinancialUploadComplete}
                                buttonVariant="outline"
                                buttonClassName="w-full h-24 border-2 border-dashed"
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <DollarSign className="h-6 w-6 text-neutral-400" />
                                  <div className="text-center">
                                    <p className="text-sm text-neutral-600">{s('uploadFinancial')}</p>
                                    <p className="text-xs text-neutral-500">{s('financialHint')}</p>
                                  </div>
                                </div>
                              </ObjectUploader>
                              {uploadedFiles.financial && (
                                <div className="flex items-center gap-2 text-sm text-success-600">
                                  <Check className="h-4 w-4" />
                                  <span>{uploadedFiles.financial}</span>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{s('additionalNotes')}</FormLabel>
                  <FormControl>
                    <SmartTextarea
                      rows={4}
                      maxLength={500}
                      placeholder={s('notesPlaceholder')} 
                      error={form.formState.errors.notes}
                      isDirty={form.formState.dirtyFields.notes}
                      data-testid="input-notes"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">{s('submissionSummary')}</h4>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{s('tender')}</span>
                  <span className="font-medium">{tender.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>{s('client')}</span>
                  <span className="font-medium">{requester.company || requester.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{s('deadline')}</span>
                  <span className={`font-medium ${isUrgent ? 'text-error-600' : 'text-warning-600'}`}>
                    {format(deadlineDate, 'MMM d, yyyy h:mm a', { locale: language === 'ar' ? ar : enUS })}
                  </span>
                </div>
                {showTechFinFields && (
                  <div className="flex justify-between">
                    <span>{s('uploadFormat')}</span>
                    <span className="font-medium">{uploadMode === 'combined' ? s('singleCombined') : s('separateTechFin')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-warning-50 rounded-lg border border-warning-200">
              <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0" />
              <p className="text-sm text-warning-800">
                {s('warning')}
              </p>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-neutral-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel"
              >
                {s('cancel')}
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1 bg-[#E25E45] hover:bg-[#d54d35] text-white"
                disabled={submitOfferMutation.isPending || progress < 100 || !canSubmitOffer}
                data-testid="button-submit-offer"
              >
                {submitOfferMutation.isPending ? s('submitting') : !canSubmitOffer ? s('verificationRequired') : s('submitProposalBtn')}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
