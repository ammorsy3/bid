import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth";
import {
  ArrowLeft, Loader2, Save, Send, RotateCcw, Plus, X, Check, Copy,
  FileText, Calendar, CalendarIcon, DollarSign, ClipboardList, MessageSquare,
  ListChecks, Flag, Eye, EyeOff, Scale, Briefcase, Clock as ClockIcon, Shield, ChevronDown,
  Upload, Paperclip
} from "lucide-react";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import VoiceRecorder from "@/components/voice-recorder";
import VendorRequirementsEditor from "@/components/VendorRequirementsEditor";
import type { Tender } from "@shared/schema";

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── Eval Criteria Constants ──────────────────────────────────────────────────

interface CriterionRequirement {
  id: string; label: string; description: string;
  options?: { value: string; label: string }[];
  type: "select" | "checkbox";
}
interface CriteriaCategory {
  id: string; name: string; icon: React.ReactNode; description: string;
  defaultWeight: number; requirements: CriterionRequirement[];
}
interface SelectedRequirement { categoryId: string; requirementId: string; value: string | boolean; }
interface CategoryWeight { categoryId: string; weight: number; }
interface CustomCriterion { id: string; text: string; weight: number; }
interface VendorRequirement { id: string; text: string; type: "mandatory" | "preferred"; }

const WEIGHT_RING_COLORS = ['#3b82f6','#10b981','#a855f7','#f59e0b','#f43f5e','#f97316','#06b6d4','#14b8a6','#6366f1','#d946ef'];

const ENTERPRISE_CRITERIA_CATEGORIES: CriteriaCategory[] = [
  {
    id: "experience", name: "Relevant Experience",
    icon: <Briefcase className="h-5 w-5" />, description: "Assess track record in similar projects", defaultWeight: 30,
    requirements: [
      { id: "years_in_market", label: "Minimum years in market", description: "", type: "select", options: [{ value: "1", label: "1+ years" }, { value: "3", label: "3+ years" }, { value: "5", label: "5+ years" }, { value: "10", label: "10+ years" }] },
      { id: "similar_projects_count", label: "Minimum similar projects completed", description: "", type: "select", options: [{ value: "1", label: "At least 1 project" }, { value: "3", label: "At least 3 projects" }, { value: "5", label: "At least 5 projects" }, { value: "10", label: "At least 10 projects" }] },
      { id: "min_project_value", label: "Minimum previous project value", description: "", type: "select", options: [{ value: "50000", label: "50,000+ SAR" }, { value: "100000", label: "100,000+ SAR" }, { value: "250000", label: "250,000+ SAR" }, { value: "500000", label: "500,000+ SAR" }, { value: "1000000", label: "1,000,000+ SAR" }] },
      { id: "client_references", label: "Client references required", description: "", type: "checkbox" },
    ],
  },
  {
    id: "financial", name: "Financial Evaluation",
    icon: <Scale className="h-5 w-5" />, description: "Price competitiveness and value for money", defaultWeight: 30,
    requirements: [
      { id: "financial_statements", label: "Financial statements required", description: "", type: "checkbox" },
      { id: "bank_guarantee", label: "Bank guarantee capability", description: "", type: "checkbox" },
    ],
  },
  {
    id: "technical", name: "Technical Capability",
    icon: <ClockIcon className="h-5 w-5" />, description: "Technical approach and delivery capability", defaultWeight: 25,
    requirements: [
      { id: "methodology", label: "Detailed methodology required", description: "", type: "checkbox" },
      { id: "timeline", label: "Project timeline required", description: "", type: "checkbox" },
      { id: "team_cvs", label: "Team CVs required", description: "", type: "checkbox" },
      { id: "industry_certifications", label: "Industry-specific certifications", description: "", type: "checkbox" },
    ],
  },
];

// ─── Schema ──────────────────────────────────────────────────────────────────

const editTenderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().refine(val => val.trim().split(/\s+/).filter(Boolean).length >= 50, "Description must be at least 50 words"),
  deadline: z.string().min(1, "Deadline is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.string().optional(),
  budget: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  showPriceToVendors: z.boolean().optional(),
  submissionType: z.string().optional(),
  videoRequired: z.boolean().optional(),
  videoUrl: z.string().optional(),
  voiceNoteUrl: z.string().optional(),
  inquiryType: z.string().optional(),
  whatsappContact: z.string().optional(),
  emailContact: z.string().optional(),
});

type EditTenderForm = z.infer<typeof editTenderSchema>;

interface Deliverable {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date | undefined;
}


function computeDurationFromDates(start: string, end: string): string | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months <= 0) return null;
  if (months <= 3) return "1to3";
  if (months <= 6) return "3to6";
  return "6plus";
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  description,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${color}`} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TenderEditPage() {
  const [, params] = useRoute("/tenders/:id/edit");
  const [, navigate] = useLocation();
  const { activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { language, t } = useI18n();
  const dateLocale = language === 'ar' ? arLocale : undefined;

  const SUBMISSION_TYPE_OPTIONS = [
    { value: "quote_only", label: t('tenderFlow.editSubmTypeQuoteOnly') },
    { value: "tech_fin_proposal", label: t('tenderFlow.editSubmTypeTechFin') },
    { value: "video_only", label: t('tenderFlow.editSubmTypeVideoOnly') },
    { value: "tech_fin_with_video", label: t('tenderFlow.editSubmTypeTechFinVideo') },
    { value: "document_only", label: t('tenderFlow.editSubmTypeDocOnly') },
  ];
  const INQUIRY_TYPE_OPTIONS = [
    { value: "inside_bid", label: t('tenderFlow.editInquiryAnonymousQA') },
    { value: "email_whatsapp", label: t('tenderFlow.editInquiryDirectContact') },
  ];
  const DURATION_LABELS: Record<string, string> = {
    "6plus": t('tenderFlow.editDuration6plus'),
    "3to6": t('tenderFlow.editDuration3to6'),
    "1to3": t('tenderFlow.editDuration1to3'),
  };
  const PRESET_REQUIREMENTS = [
    { id: "legal_registration", text: t('tenderFlow.editPresetLegalReg') },
    { id: "cr_certificate", text: t('tenderFlow.editPresetCrCert') },
    { id: "business_license", text: t('tenderFlow.editPresetBizLicense') },
    { id: "zakat_certificate", text: t('tenderFlow.editPresetZakat') },
    { id: "gosi_certificate", text: t('tenderFlow.editPresetGosi') },
    { id: "no_legal_disputes", text: t('tenderFlow.editPresetNoDisputes') },
    { id: "reg_compliance", text: t('tenderFlow.editPresetRegCompliance') },
    { id: "nda", text: t('tenderFlow.editPresetNda') },
    { id: "data_protection", text: t('tenderFlow.editPresetDataProt') },
    { id: "local_content", text: t('tenderFlow.editPresetLocalContent') },
  ];
  const evalCategoryNames: Record<string, string> = {
    experience: t('tenderFlow.evalCatExperienceName'),
    financial: t('tenderFlow.evalCatFinancialName'),
    technical: t('tenderFlow.evalCatTechnicalName'),
  };
  const evalReqLabels: Record<string, string> = {
    years_in_market: t('tenderFlow.evalReqYearsInMarket'),
    similar_projects_count: t('tenderFlow.evalReqSimilarProjects'),
    min_project_value: t('tenderFlow.evalReqMinProjectValue'),
    client_references: t('tenderFlow.evalReqClientRefs'),
    financial_statements: t('tenderFlow.evalReqFinancialStatements'),
    bank_guarantee: t('tenderFlow.evalReqBankGuarantee'),
    methodology: t('tenderFlow.evalReqMethodology'),
    timeline: t('tenderFlow.evalReqProjectTimeline'),
    team_cvs: t('tenderFlow.evalReqTeamCVs'),
    industry_certifications: t('tenderFlow.evalReqCertifications'),
  };
  const evalReqOptionLabels: Record<string, Record<string, string>> = {
    years_in_market: { "1": t('tenderFlow.evalOpt1Year'), "3": t('tenderFlow.evalOpt3Year'), "5": t('tenderFlow.evalOpt5Year'), "10": t('tenderFlow.evalOpt10Year') },
    similar_projects_count: { "1": t('tenderFlow.evalOptProj1'), "3": t('tenderFlow.evalOptProj3'), "5": t('tenderFlow.evalOptProj5'), "10": t('tenderFlow.evalOptProj10') },
    min_project_value: { "50000": t('tenderFlow.evalOptVal50k'), "100000": t('tenderFlow.evalOptVal100k'), "250000": t('tenderFlow.evalOptVal250k'), "500000": t('tenderFlow.evalOptVal500k'), "1000000": t('tenderFlow.evalOptVal1m') },
  };
  const tenderId = params?.id;

  const [budgetType, setBudgetType] = useState<"exact" | "range">("exact");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [formCards, setFormCards] = useState<Array<{ id: string; type: string; label: string; isRequired: boolean; options?: string[]; value?: any }>>([]);
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; url: string; size: number; type: string }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentFileInputRef = React.useRef<HTMLInputElement>(null);

  // Evaluation criteria state
  const [expandedEvalCategories, setExpandedEvalCategories] = useState<string[]>(["experience"]);
  const [selectedRequirements, setSelectedRequirements] = useState<SelectedRequirement[]>([]);
  const [categoryWeights, setCategoryWeights] = useState<CategoryWeight[]>(
    ENTERPRISE_CRITERIA_CATEGORIES.map(cat => ({ categoryId: cat.id, weight: cat.defaultWeight }))
  );
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([]);
  const [newCriterionText, setNewCriterionText] = useState("");
  const [newCriterionWeight, setNewCriterionWeight] = useState(5);

  // Vendor requirements state — rendering handled by <VendorRequirementsEditor />
  const [vendorRequirements, setVendorRequirements] = useState<VendorRequirement[]>([]);

  const { data: tender, isLoading } = useQuery<Tender>({
    queryKey: ["/api/tenders", tenderId],
    enabled: !!tenderId,
  } as any);

  const form = useForm<EditTenderForm>({
    resolver: zodResolver(editTenderSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      startDate: "",
      endDate: "",
      duration: "",
      budget: "",
      budgetMin: undefined,
      budgetMax: undefined,
      showPriceToVendors: true,
      submissionType: "",
      videoRequired: false,
      videoUrl: "",
      voiceNoteUrl: "",
      inquiryType: "",
      whatsappContact: "",
      emailContact: "",
    },
  });

  const submissionType = form.watch("submissionType");
  const inquiryType = form.watch("inquiryType");
  const startDateVal = form.watch("startDate");
  const endDateVal = form.watch("endDate");

  useEffect(() => {
    const computed = computeDurationFromDates(startDateVal || "", endDateVal || "");
    if (computed) form.setValue("duration", computed);
  }, [startDateVal, endDateVal]);

  useEffect(() => {
    if (!tender) return;

    setBudgetType((tender as any).budgetMin != null || (tender as any).budgetMax != null ? "range" : "exact");

    if ((tender as any).deliverables && Array.isArray((tender as any).deliverables)) {
      setDeliverables((tender as any).deliverables as Deliverable[]);
    }
    if ((tender as any).milestones && Array.isArray((tender as any).milestones)) {
      setMilestones(
        ((tender as any).milestones as any[]).map((m) => ({
          id: m.id || Date.now().toString(),
          name: m.name || "",
          description: m.description || "",
          dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
        }))
      );
    }
    const ec = (tender as any).evaluationCriteria;
    if (ec && typeof ec === "object" && !Array.isArray(ec)) {
      if (ec.requirements) setSelectedRequirements(ec.requirements);
      if (ec.weights) setCategoryWeights(ec.weights);
      if (ec.customCriteria) setCustomCriteria(ec.customCriteria);
    }
    if ((tender as any).vendorRequirements && Array.isArray((tender as any).vendorRequirements)) {
      setVendorRequirements((tender as any).vendorRequirements as VendorRequirement[]);
    }
    if ((tender as any).formCards && Array.isArray((tender as any).formCards)) {
      setFormCards((tender as any).formCards);
    }
    if (Array.isArray((tender as any).attachments)) {
      setAttachments((tender as any).attachments);
    }

    const formattedDeadline = new Date((tender as any).deadline).toISOString().slice(0, 16);

    form.reset({
      title: (tender as any).title || "",
      description: (tender as any).description || "",
      deadline: formattedDeadline,
      startDate: (tender as any).startDate || "",
      endDate: (tender as any).endDate || "",
      duration: (tender as any).duration || "",
      budget: (tender as any).budget || "",
      budgetMin: (tender as any).budgetMin ?? undefined,
      budgetMax: (tender as any).budgetMax ?? undefined,
      showPriceToVendors: (tender as any).showPriceToVendors !== false,
      submissionType: (tender as any).submissionType || "",
      videoRequired: (tender as any).videoRequired || false,
      videoUrl: (tender as any).videoUrl || "",
      voiceNoteUrl: (tender as any).voiceNoteUrl || "",
      inquiryType: (tender as any).inquiryType || "",
      whatsappContact: (tender as any).whatsappContact || "",
      emailContact: (tender as any).emailContact || "",
    });
  }, [tender]);

  const updateTenderMutation = useMutation({
    mutationFn: async (data: EditTenderForm) => {
      const milestonesPayload = milestones.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        dueDate: m.dueDate ? m.dueDate.toISOString() : undefined,
      }));
      const hasAnyCriteria = selectedRequirements.length > 0 || customCriteria.length > 0;
      const evaluationCriteriaPayload = hasAnyCriteria
        ? { requirements: selectedRequirements, weights: categoryWeights, customCriteria }
        : null;
      const payload: Record<string, any> = {
        ...data, deliverables, milestones: milestonesPayload,
        evaluationCriteria: evaluationCriteriaPayload,
        vendorRequirements: vendorRequirements.length > 0 ? vendorRequirements : null,
        formCards: formCards.length > 0 ? formCards : null,
        attachments: attachments.length > 0 ? attachments : null,
      };

      if (budgetType === "exact") {
        delete payload.budgetMin;
        delete payload.budgetMax;
      } else {
        delete payload.budget;
      }

      for (const key of Object.keys(payload)) {
        if (payload[key] === "") payload[key] = null;
      }

      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}`, payload);
      return response.json();
    },
    onSuccess: (updatedTender) => {
      queryClient.setQueryData(["/api/tenders", tenderId], updatedTender);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: t('tenderFlow.editSaved'), description: t('tenderFlow.editSavedDesc') });
      navigate(`/tenders/${tenderId}`);
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error?.message || t('tenderFlow.editFailed'), variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}/status`, { status: "published" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", tenderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      const tenderData = queryClient.getQueryData<any>(["/api/tenders", tenderId]);
      const invToken = tenderData?.invitationToken;
      if (invToken) {
        const inviteLink = `${window.location.origin}/invite/${invToken}`;
        toast({
          title: t('tenderFlow.publishedToast'),
          description: t('tenderFlow.publishedToastDesc'),
          action: (
            <ToastAction altText={t('tenderFlow.copyLinkAlt')} onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: t('tenderFlow.linkCopiedToast') }); }}>
              <Copy className="h-3 w-3 mr-1" /> {t('tenderFlow.editCopyLink')}
            </ToastAction>
          ),
          duration: 10000,
        });
      } else {
        toast({ title: t('tenderFlow.publishedToast'), description: t('tenderFlow.publishedToastDesc') });
      }
      navigate(`/tenders/${tenderId}`);
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error?.message || t('tenderFlow.editFailedPublish'), variant: "destructive" });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${tenderId}/status`, { status: "draft" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", tenderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: t('tenderFlow.editReverted') });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error?.message || t('tenderFlow.editFailedRevert'), variant: "destructive" });
    },
  });

  const addMilestone = () => {
    setMilestones([...milestones, { id: Date.now().toString(), name: "", description: "", dueDate: undefined }]);
  };
  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };
  const removeMilestone = (id: string) => setMilestones(milestones.filter((m) => m.id !== id));

  // Eval criteria handlers
  const handleRequirementChange = (categoryId: string, requirementId: string, value: string | boolean) => {
    setSelectedRequirements(prev => {
      const idx = prev.findIndex(r => r.categoryId === categoryId && r.requirementId === requirementId);
      if (idx >= 0) {
        if (value === false || value === "") return prev.filter((_, i) => i !== idx);
        const updated = [...prev]; updated[idx] = { categoryId, requirementId, value }; return updated;
      } else if (value !== false && value !== "") {
        return [...prev, { categoryId, requirementId, value }];
      }
      return prev;
    });
  };
  const getRequirementValue = (categoryId: string, requirementId: string): string | boolean =>
    selectedRequirements.find(r => r.categoryId === categoryId && r.requirementId === requirementId)?.value ?? false;
  const handleWeightChange = (categoryId: string, weight: number) =>
    setCategoryWeights(prev => prev.map(cw => cw.categoryId === categoryId ? { ...cw, weight } : cw));
  const addCustomCriterion = () => {
    if (newCriterionText.trim()) {
      setCustomCriteria(prev => [...prev, { id: `custom-${Date.now()}`, text: newCriterionText.trim(), weight: newCriterionWeight }]);
      setNewCriterionText(""); setNewCriterionWeight(5);
    }
  };
  const removeCustomCriterion = (id: string) => setCustomCriteria(prev => prev.filter(c => c.id !== id));
  const updateCustomCriterionWeight = (id: string, weight: number) =>
    setCustomCriteria(prev => prev.map(c => c.id === id ? { ...c, weight } : c));

  // Attachments handlers (mirror the canonical pattern in TenderAICopilot.uploadOne).
  // After PUTting bytes to the presigned GCS URL, PUT /api/objects/metadata to
  // register ACL ownership and get the canonical "/objects/<entity-id>" path —
  // the only URL form the public RFP page can fetch back later.
  const handleUploadAttachment = async (file: File) => {
    setUploadingAttachment(true);
    try {
      const res = await apiRequest('POST', '/api/objects/upload', { fileSize: file.size, fileType: file.type });
      const { uploadURL } = await res.json();
      if (!uploadURL) throw new Error('Failed to get upload URL');
      const put = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!put.ok) throw new Error('Upload failed');
      const metaRes = await apiRequest('PUT', '/api/objects/metadata', { fileURL: uploadURL });
      const { objectPath } = await metaRes.json();
      setAttachments(prev => [...prev, {
        id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        url: objectPath,
        size: file.size,
        type: file.type || 'application/octet-stream',
      }]);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Could not upload file', variant: 'destructive' });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatAttachmentSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const customCriteriaWeight = customCriteria.reduce((sum, c) => sum + c.weight, 0);
  const totalWeight = categoryWeights.reduce((sum, cw) => sum + cw.weight, 0) + customCriteriaWeight;

  const addDeliverable = () => {
    setDeliverables([...deliverables, { id: Date.now().toString(), name: "", description: "", unit: "unit", quantity: 1 }]);
  };
  const updateDeliverable = (did: string, field: keyof Deliverable, value: any) => {
    setDeliverables(deliverables.map((d) => (d.id === did ? { ...d, [field]: value } : d)));
  };
  const removeDeliverable = (did: string) => setDeliverables(deliverables.filter((d) => d.id !== did));

  const isOwner = (tender as any)?.companyId === activeCompany?.id;
  const isDraft = (tender as any)?.status === "draft";
  const isPublished = (tender as any)?.status === "published";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('tenderFlow.tenderNotFoundTitle')}</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">{t('tenderFlow.backToDashboard')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const editTenderLanguage = (tender as any)?.language || 'en';
  const isEditRtl = editTenderLanguage === 'ar';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={isEditRtl ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(`/tenders/${tenderId}`)} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('tenderFlow.backToTender')}
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('tenderFlow.editTenderTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPublished ? t('tenderFlow.tenderIsLive') : t('tenderFlow.tenderIsDraft')}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            if ((selectedRequirements.length > 0 || customCriteria.length > 0) && totalWeight !== 100) return;
            updateTenderMutation.mutate(data);
          })} className="space-y-6">

            {/* 1. Basics */}
            <SectionCard
              icon={<FileText className="h-4 w-4 text-[#E25E45]" />}
              title={t('tenderFlow.editSectionBasicsTitle')}
              description={t('tenderFlow.editSectionBasicsDesc')}
              color="bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]"
            >
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tenderFlow.editTitleLabel')}</FormLabel>
                  <FormControl><Input placeholder={t('tenderFlow.editTitlePlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => {
                const wc = field.value?.trim().split(/\s+/).filter(Boolean).length ?? 0;
                return (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editDescriptionLabel')}</FormLabel>
                    <FormControl><Textarea rows={5} placeholder={t('tenderFlow.editDescriptionPlaceholder')} {...field} /></FormControl>
                    <div className="flex justify-end">
                      <span className={`text-xs ${wc < 50 ? "text-amber-600" : "text-green-600"}`}>
                        {wc < 50 ? t('tenderFlow.editWordsMoreNeeded', { n: 50 - wc }) : "✓"} {t('tenderFlow.editWordsMinCount', { wc })}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }} />

            </SectionCard>

            {/* 2. Timeline */}
            <SectionCard
              icon={<Calendar className="h-4 w-4 text-blue-600" />}
              title={t('tenderFlow.editSectionTimelineTitle')}
              description={t('tenderFlow.editSectionTimelineDesc')}
              color="bg-gradient-to-r from-blue-500 to-blue-400"
            >
              <FormField control={form.control} name="deadline" render={({ field }) => {
                const dateVal = field.value ? field.value.slice(0, 10) : "";
                const timeVal = field.value && field.value.length > 10 ? field.value.slice(11, 16) : "12:00";
                return (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editDeadlineLabel')}</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <button type="button" className={cn(
                              "flex-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm text-left hover:bg-accent transition-colors",
                              !dateVal && "text-muted-foreground"
                            )}>
                              <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                              {dateVal ? format(new Date(dateVal), "MMM d, yyyy", { locale: dateLocale }) : t('tenderFlow.editPickDate')}
                            </button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <ShadcnCalendar
                            mode="single"
                            selected={dateVal ? new Date(dateVal) : undefined}
                            onSelect={(date) => field.onChange(date ? `${date.toISOString().slice(0, 10)}T${timeVal}` : "")}
                            locale={dateLocale}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={timeVal}
                        onChange={(e) => field.onChange(dateVal ? `${dateVal}T${e.target.value}` : "")}
                        className="w-32"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }} />

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">{t('tenderFlow.editProjectDurationTitle')}</p>
                <p className="text-xs text-muted-foreground mb-3">{t('tenderFlow.editProjectDurationDesc')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editStartDateLabel')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <button type="button" className={cn(
                              "w-full flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm text-left hover:bg-accent transition-colors",
                              !field.value && "text-muted-foreground"
                            )}>
                              <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                              {field.value ? format(new Date(field.value), "MMM d, yyyy") : t('tenderFlow.editPickDate')}
                            </button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <ShadcnCalendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? date.toISOString().slice(0, 10) : "")}
                            locale={dateLocale}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editEndDateLabel')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <button type="button" className={cn(
                              "w-full flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm text-left hover:bg-accent transition-colors",
                              !field.value && "text-muted-foreground"
                            )}>
                              <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                              {field.value ? format(new Date(field.value), "MMM d, yyyy") : t('tenderFlow.editPickDate')}
                            </button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <ShadcnCalendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? date.toISOString().slice(0, 10) : "")}
                            disabled={(date) => startDateVal ? date < new Date(startDateVal) : false}
                            locale={dateLocale}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                {startDateVal && endDateVal && (() => {
                  const computed = computeDurationFromDates(startDateVal, endDateVal);
                  return computed ? (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{t('tenderFlow.editComputedDuration')}</span>
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{DURATION_LABELS[computed]}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </SectionCard>

            {/* 3. Budget */}
            <SectionCard
              icon={<DollarSign className="h-4 w-4 text-green-600" />}
              title={t('tenderFlow.editSectionBudgetTitle')}
              description={t('tenderFlow.editSectionBudgetDesc')}
              color="bg-gradient-to-r from-green-500 to-emerald-400"
            >
              <div className="flex gap-2">
                {["exact", "range"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBudgetType(type as "exact" | "range")}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      budgetType === type
                        ? "bg-[#E25E45] text-white border-[#E25E45]"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {type === "exact" ? t('tenderFlow.editBudgetExact') : t('tenderFlow.editBudgetRange')}
                  </button>
                ))}
              </div>

              {budgetType === "exact" ? (
                <FormField control={form.control} name="budget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editBudgetAmountLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">SAR</span>
                        <Input className="pl-12" placeholder={t('tenderFlow.editBudgetAmountPlaceholder')} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="budgetMin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editBudgetMinLabel')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={t('tenderFlow.editBudgetMinPlaceholder')} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="budgetMax" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editBudgetMaxLabel')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={t('tenderFlow.editBudgetMaxPlaceholder')} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <FormField control={form.control} name="showPriceToVendors" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      {field.value ? <Eye className="h-4 w-4 text-gray-500" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
                      <div>
                        <p className="text-sm font-medium">{t('tenderFlow.editShowBudgetLabel')}</p>
                        <p className="text-xs text-muted-foreground">{field.value ? t('tenderFlow.editBudgetVisible') : t('tenderFlow.editBudgetHidden')}</p>
                      </div>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </div>
                </FormItem>
              )} />
            </SectionCard>

            {/* 4. Submission */}
            <SectionCard
              icon={<ClipboardList className="h-4 w-4 text-purple-600" />}
              title={t('tenderFlow.editSubmissionsTitle')}
              description={t('tenderFlow.editSectionSubmHowDesc')}
              color="bg-gradient-to-r from-purple-500 to-purple-400"
            >
              <FormField control={form.control} name="submissionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tenderFlow.editSubmTypeLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('tenderFlow.editSubmTypePlaceholder')} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUBMISSION_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {submissionType === "tech_fin_with_video" && (
                <FormField control={form.control} name="videoRequired" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div>
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-200">{t('tenderFlow.editRequireVideoLabel')}</p>
                        <p className="text-xs text-orange-700 dark:text-orange-400">{t('tenderFlow.editRequireVideoDesc')}</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </div>
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="videoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tenderFlow.editVideoUrlLabel')}</FormLabel>
                  <FormControl><Input placeholder={t('tenderFlow.editVideoUrlPlaceholder')} {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">{t('tenderFlow.editVideoUrlHint')}</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="voiceNoteUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tenderFlow.voiceNoteOptionalLabel')}</FormLabel>
                  <FormControl>
                    <VoiceRecorder
                      onRecordingComplete={(url) => field.onChange(url)}
                      onRecordingDeleted={() => field.onChange("")}
                      existingUrl={field.value || undefined}
                    />
                  </FormControl>
                  <FormDescription>{t('tenderFlow.voiceNoteOptionalDesc')}</FormDescription>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => field.onChange("")}
                    >
                      Remove voice note
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            </SectionCard>

            {/* 5. Contact & Q&A */}
            <SectionCard
              icon={<MessageSquare className="h-4 w-4 text-green-600" />}
              title={t('tenderFlow.editSectionQaTitle')}
              description={t('tenderFlow.editSectionQaDesc')}
              color="bg-gradient-to-r from-green-500 to-teal-400"
            >
              <FormField control={form.control} name="inquiryType" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tenderFlow.editQaMethodLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('tenderFlow.editQaMethodPlaceholder')} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INQUIRY_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {inquiryType === "email_whatsapp" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="emailContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editContactEmailLabel')}</FormLabel>
                      <FormControl><Input type="email" placeholder={t('tenderFlow.editContactEmailPlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="whatsappContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editWhatsappLabel')}</FormLabel>
                      <FormControl><Input placeholder={t('tenderFlow.editWhatsappPlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </SectionCard>

            {/* 6. Evaluation Criteria */}
            <SectionCard
              icon={<Scale className="h-4 w-4 text-amber-600" />}
              title={t('tenderFlow.editSectionEvalTitle')}
              description={t('tenderFlow.editSectionEvalDesc')}
              color="bg-gradient-to-r from-amber-500 to-orange-400"
            >
              {/* Weight indicator */}
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${totalWeight === 100 ? "bg-green-50 border-green-200" : totalWeight > 100 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    {(() => {
                      const circ = 175.93;
                      const segs = [
                        ...categoryWeights.map((cw, i) => ({ weight: cw.weight, colorIndex: i })),
                        ...customCriteria.map((c, j) => ({ weight: c.weight, colorIndex: categoryWeights.length + j })),
                      ].filter(s => s.weight > 0);
                      let acc = 0;
                      return segs.map((seg, idx) => {
                        const len = (seg.weight / 100) * circ;
                        const offset = -acc;
                        acc += len;
                        return (
                          <circle key={idx} cx="32" cy="32" r="28"
                            stroke={WEIGHT_RING_COLORS[seg.colorIndex % WEIGHT_RING_COLORS.length]}
                            strokeWidth="8" fill="none" strokeLinecap="butt"
                            strokeDasharray={`${len} ${circ}`}
                            strokeDashoffset={offset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${totalWeight === 100 ? "text-green-600" : totalWeight > 100 ? "text-red-600" : "text-amber-600"}`}>{totalWeight}%</span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-medium ${totalWeight === 100 ? "text-green-700" : totalWeight > 100 ? "text-red-700" : "text-amber-700"}`}>
                    {totalWeight === 100 ? t('tenderFlow.editWeightPerfect') : totalWeight > 100 ? t('tenderFlow.editWeightOver', { n: totalWeight - 100 }) : t('tenderFlow.editWeightRemaining', { n: 100 - totalWeight })}
                  </p>
                </div>
              </div>

              {/* Category accordions */}
              <div className="space-y-2">
                {ENTERPRISE_CRITERIA_CATEGORIES.map((category) => {
                  const isExpanded = expandedEvalCategories.includes(category.id);
                  const currentWeight = categoryWeights.find(cw => cw.categoryId === category.id)?.weight || 0;
                  const hasSelections = selectedRequirements.some(r => r.categoryId === category.id);
                  return (
                    <div key={category.id} className={`border rounded-lg overflow-hidden transition-all ${hasSelections ? "border-[#E25E45]/50 bg-[#E25E45]/5" : "border-gray-200"}`}>
                      <button type="button" onClick={() => setExpandedEvalCategories(prev => prev.includes(category.id) ? prev.filter(id => id !== category.id) : [...prev, category.id])}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${hasSelections ? "bg-[#E25E45]/10 text-[#E25E45]" : "bg-gray-100 text-gray-500"}`}>{category.icon}</div>
                          <span className="font-medium text-sm text-gray-900">{evalCategoryNames[category.id] ?? category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{currentWeight}%</span>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      <div className={`grid transition-all duration-200 ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <div className="border-t border-gray-200 p-3 space-y-3 bg-white">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-500">{t('tenderFlow.editWeightLabel', { n: currentWeight })}</label>
                              <input type="range" min="0" max="100" step="5" value={currentWeight}
                                onChange={(e) => handleWeightChange(category.id, parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]" />
                            </div>
                            {category.requirements.map((req) => {
                              const currentValue = getRequirementValue(category.id, req.id);
                              return (
                                <div key={req.id} className="flex items-start gap-2">
                                  {req.type === "checkbox" && (
                                    <button type="button" onClick={() => handleRequirementChange(category.id, req.id, !currentValue)}
                                      className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${currentValue ? "border-[#E25E45] bg-[#E25E45]" : "border-gray-300"}`}>
                                      {currentValue && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                                    </button>
                                  )}
                                  <div className="flex-1">
                                    <label className="text-sm text-gray-900">{evalReqLabels[req.id] ?? req.label}</label>
                                    {req.type === "select" && req.options && (
                                      <Select value={(currentValue as string) || "none"} onValueChange={(v) => handleRequirementChange(category.id, req.id, v === "none" ? "" : v)}>
                                        <SelectTrigger className="mt-1 w-full text-sm"><SelectValue placeholder={t('tenderFlow.editNotRequired')} /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">{t('tenderFlow.editNotRequired')}</SelectItem>
                                          {req.options.map(opt => <SelectItem key={opt.value} value={opt.value}>{evalReqOptionLabels[req.id]?.[opt.value] ?? opt.label}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom criteria */}
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">{t('tenderFlow.editCustomCriteriaTitle')} <span className="text-gray-400 font-normal text-xs">{t('tenderFlow.editCustomCriteriaOptional')}</span></p>
                {customCriteria.length > 0 && (
                  <div className="space-y-2">
                    {customCriteria.map(c => (
                      <div key={c.id} className="px-3 py-2 bg-[#E25E45]/5 border border-[#E25E45]/20 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-gray-900">{c.text}</span>
                          <span className="text-xs font-medium text-[#E25E45]">{c.weight}%</span>
                          <button type="button" onClick={() => removeCustomCriterion(c.id)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                        </div>
                        <input type="range" min="0" max="50" step="5" value={c.weight}
                          onChange={(e) => updateCustomCriterionWeight(c.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="text" value={newCriterionText} onChange={(e) => setNewCriterionText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCriterion())}
                      placeholder={t('tenderFlow.editCustomCriteriaPlaceholder')}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E25E45]" />
                    <Button type="button" onClick={addCustomCriterion} disabled={!newCriterionText.trim()} size="sm" className="bg-[#E25E45] hover:bg-[#d54d35]"><Plus className="h-4 w-4" /></Button>
                  </div>
                  {newCriterionText.trim() && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t('tenderFlow.editWeightLabelShort')}</span>
                      <input type="range" min="0" max="50" step="5" value={newCriterionWeight}
                        onChange={(e) => setNewCriterionWeight(parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E25E45]" />
                      <span className="text-xs font-medium text-[#E25E45] w-8">{newCriterionWeight}%</span>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* 7. Vendor Requirements */}
            <SectionCard
              icon={<Shield className="h-4 w-4 text-blue-600" />}
              title={t('tenderFlow.editSubmissionsTitle')}
              description={t('tenderFlow.editSectionEligDesc')}
              color="bg-gradient-to-r from-blue-500 to-indigo-400"
            >
              <VendorRequirementsEditor
                value={vendorRequirements}
                onChange={setVendorRequirements}
                isRtl={isEditRtl}
                compact
              />
            </SectionCard>

            {/* 8. Milestones */}
            <SectionCard
              icon={<Flag className="h-4 w-4 text-violet-600" />}
              title={t('tenderFlow.milestones')}
              description={t('tenderFlow.editSectionMilestonesDesc')}
              color="bg-gradient-to-r from-violet-500 to-purple-400"
            >
              {milestones.length > 0 && (
                <div className="space-y-2">
                  {milestones.map((m, index) => (
                    <div key={m.id} className="group flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-shrink-0 mt-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${m.name.trim() ? "bg-violet-500" : "bg-gray-300"}`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMilestone(m.id, "name", e.target.value)}
                          placeholder={t('tenderFlow.milestoneName')}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-400 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0 pb-1"
                        />
                        <input
                          type="text"
                          value={m.description}
                          onChange={(e) => updateMilestone(m.id, "description", e.target.value)}
                          placeholder={t('tenderFlow.editMilestoneDescOptional')}
                          className="w-full bg-transparent border-0 text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 focus:outline-none focus:ring-0"
                        />
                      </div>
                      <div className="flex-shrink-0">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className={cn(
                              "flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors",
                              m.dueDate ? "bg-violet-100 text-violet-700 hover:bg-violet-200" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                            )}>
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {m.dueDate ? format(m.dueDate, "MMM d", { locale: dateLocale }) : t('tenderFlow.date')}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            {startDateVal || endDateVal ? (
                              <ShadcnCalendar
                                mode="single"
                                selected={m.dueDate}
                                onSelect={(date) => updateMilestone(m.id, "dueDate", date)}
                                locale={dateLocale}
                                initialFocus
                                fromDate={startDateVal ? new Date(startDateVal + 'T00:00:00') : undefined}
                                toDate={endDateVal ? new Date(endDateVal + 'T00:00:00') : undefined}
                                disabled={(date) => {
                                  if (startDateVal && date < new Date(startDateVal + 'T00:00:00')) return true;
                                  if (endDateVal && date > new Date(endDateVal + 'T00:00:00')) return true;
                                  return false;
                                }}
                              />
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500 w-48">
                                <CalendarIcon className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                                {t('tenderFlow.editMilestoneSetDates')}
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMilestone(m.id)}
                        className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addMilestone}
                className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-all group"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 group-hover:bg-violet-400 transition-colors" />
                <Plus className="h-4 w-4" />
                <span className="text-sm">{t('tenderFlow.addMilestone')}</span>
              </button>
            </SectionCard>

            {/* 9. Deliverables */}
            <SectionCard
              icon={<ListChecks className="h-4 w-4 text-indigo-600" />}
              title={t('tenderFlow.editSectionDeliverablesTitle')}
              description={t('tenderFlow.editSectionDeliverablesDesc')}
              color="bg-gradient-to-r from-indigo-500 to-indigo-400"
            >
              {deliverables.length > 0 && (
                <div className="space-y-3">
                  {deliverables.map((d, index) => (
                    <div key={d.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-indigo-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                        <Input placeholder={t('tenderFlow.editDeliverableNamePlaceholder')} value={d.name} onChange={(e) => updateDeliverable(d.id, "name", e.target.value)} className="flex-1" />
                        <button type="button" onClick={() => removeDeliverable(d.id)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                      <Input placeholder={t('tenderFlow.editDeliverableDescPlaceholder')} value={d.description} onChange={(e) => updateDeliverable(d.id, "description", e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('tenderFlow.quantity')}</Label>
                          <Input type="number" min={1} value={d.quantity} onChange={(e) => updateDeliverable(d.id, "quantity", Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('tenderFlow.editUnitLabel')}</Label>
                          <Input placeholder={t('tenderFlow.editUnitPlaceholder')} value={d.unit} onChange={(e) => updateDeliverable(d.id, "unit", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={addDeliverable}>
                <Plus className="h-4 w-4 mr-2" />{t('tenderFlow.addDeliverable')}
              </Button>
            </SectionCard>

            {/* Attachments — supporting documents the requester uploaded */}
            <SectionCard
              icon={<Paperclip className="h-4 w-4 text-sky-600" />}
              title={t('tenderFlow.editSectionDocsTitle')}
              description={t('tenderFlow.editSectionDocsDesc')}
              color="bg-gradient-to-r from-sky-500 to-cyan-400"
            >
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <FileText className="h-4 w-4 text-sky-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-sky-600 truncate block"
                        >
                          {a.name}
                        </a>
                        <p className="text-xs text-muted-foreground">{formatAttachmentSize(a.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(a.id)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={t('tenderFlow.editRemoveAttachment')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={attachmentFileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAttachment(file);
                  if (e.target) e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => attachmentFileInputRef.current?.click()}
                disabled={uploadingAttachment}
              >
                {uploadingAttachment ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.uploading')}</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />{attachments.length > 0 ? "Upload another" : "Upload document"}</>
                )}
              </Button>
            </SectionCard>

            {/* Custom Fields (from form builder) */}
            {formCards.length > 0 && (
              <SectionCard
                icon={<ClipboardList className="h-4 w-4 text-violet-600" />}
                title={t('tenderFlow.editSectionCustomFieldsTitle')}
                description={t('tenderFlow.editSectionCustomFieldsDesc')}
                color="bg-gradient-to-r from-violet-500 to-violet-400"
              >
                {formCards.map((card) => (
                  <div key={card.id} className="space-y-1">
                    <Label>
                      {card.label}
                      {card.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {card.type === 'custom-textarea' ? (
                      <Textarea
                        value={card.value ?? ''}
                        onChange={(e) => setFormCards(prev => prev.map(c => c.id === card.id ? { ...c, value: e.target.value } : c))}
                        placeholder={t('tenderFlow.editEnterField', { field: card.label.toLowerCase() })}
                        rows={3}
                      />
                    ) : card.type === 'custom-date' ? (
                      <Input
                        type="date"
                        value={card.value ?? ''}
                        onChange={(e) => setFormCards(prev => prev.map(c => c.id === card.id ? { ...c, value: e.target.value } : c))}
                      />
                    ) : card.type === 'custom-select' ? (
                      <Select
                        value={card.value ?? ''}
                        onValueChange={(val) => setFormCards(prev => prev.map(c => c.id === card.id ? { ...c, value: val } : c))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('tenderFlow.editSelectField', { field: card.label.toLowerCase() })} />
                        </SelectTrigger>
                        <SelectContent>
                          {(card.options ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={card.value ?? ''}
                        onChange={(e) => setFormCards(prev => prev.map(c => c.id === card.id ? { ...c, value: e.target.value } : c))}
                        placeholder={t('tenderFlow.editEnterField', { field: card.label.toLowerCase() })}
                      />
                    )}
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              {(selectedRequirements.length > 0 || customCriteria.length > 0) && totalWeight !== 100 && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="mt-0.5 flex-shrink-0">⚠</span>
                  <span>
                    {t('tenderFlow.editWeightWarning')}{" "}
                    {totalWeight > 100
                      ? t('tenderFlow.editWeightOverWarning', { n: totalWeight - 100 })
                      : t('tenderFlow.editWeightUnderWarning', { n: totalWeight, m: 100 - totalWeight })}
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate(`/tenders/${tenderId}`)} className="flex-1">
                  {t('tenderFlow.cancelBtn')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#E25E45] hover:bg-[#d54d35] text-white disabled:opacity-50"
                  disabled={updateTenderMutation.isPending || ((selectedRequirements.length > 0 || customCriteria.length > 0) && totalWeight !== 100)}
                >
                  {updateTenderMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.editSaving')}</> : <><Save className="h-4 w-4 mr-2" />{t('tenderFlow.editSaveChanges')}</>}
                </Button>
              </div>

              {isDraft && (
                <>
                  <Button type="button" onClick={() => publishMutation.mutate()} className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={publishMutation.isPending}>
                    {publishMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.editPublishing')}</> : <><Send className="h-4 w-4 mr-2" />{t('tenderFlow.editPublishTender')}</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">{t('tenderFlow.editPublishHint')}</p>
                </>
              )}

              {isPublished && (
                <>
                  <Button type="button" onClick={() => revertMutation.mutate()} variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-50" disabled={revertMutation.isPending}>
                    {revertMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.editReverting')}</> : <><RotateCcw className="h-4 w-4 mr-2" />{t('tenderFlow.editRevertToDraft')}</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">{t('tenderFlow.editRevertHint')}</p>
                </>
              )}
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
}
