import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft, Loader2, Save, Send, RotateCcw, Plus, X, Copy,
  FileText, Calendar, DollarSign, ClipboardList, MessageSquare,
  ListChecks, Target, Tag, Eye, EyeOff
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { Tender } from "@shared/schema";
import { VENDOR_CATEGORIES } from "@shared/schema";

// ─── Schema ──────────────────────────────────────────────────────────────────

const makeEditTenderSchema = (t: (k: string) => string) => z.object({
  title: z.string().min(3, t('validation.titleMin')),
  description: z.string().min(10, t('validation.descriptionMin')),
  objective: z.string().optional(),
  category: z.string().optional(),
  deadline: z.string().min(1, t('validation.deadlineRequired')),
  duration: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  showPriceToVendors: z.boolean().optional(),
  submissionType: z.string().optional(),
  videoRequired: z.boolean().optional(),
  videoUrl: z.string().optional(),
  inquiryType: z.string().optional(),
  whatsappContact: z.string().optional(),
  emailContact: z.string().optional(),
});

type EditTenderForm = z.infer<ReturnType<typeof makeEditTenderSchema>>;

interface Deliverable {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
}

// ─── Section Header ──────────────────────────────────────────────────────────

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

export default function TenderEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const DURATION_OPTIONS = [
    { value: "1to3", label: t('tenderFlow.editDuration1to3') },
    { value: "3to6", label: t('tenderFlow.editDuration3to6') },
    { value: "6plus", label: t('tenderFlow.editDuration6plus') },
  ];

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

  const [budgetType, setBudgetType] = useState<"exact" | "range">("exact");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  const { data: tender, isLoading } = useQuery<Tender>({
    queryKey: ["/api/tenders", id],
    queryFn: async () => {
      const response = await fetch(`/api/tenders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch tender");
      return response.json();
    },
    enabled: !!user && !!id,
  });

  const form = useForm<EditTenderForm>({
    resolver: zodResolver(makeEditTenderSchema(t)),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      objective: "",
      category: "",
      deadline: "",
      duration: "",
      startDate: "",
      endDate: "",
      budget: "",
      budgetMin: undefined,
      budgetMax: undefined,
      showPriceToVendors: true,
      submissionType: "",
      videoRequired: false,
      videoUrl: "",
      inquiryType: "",
      whatsappContact: "",
      emailContact: "",
    },
  });

  const submissionType = form.watch("submissionType");
  const inquiryType = form.watch("inquiryType");

  useEffect(() => {
    if (!tender) return;

    setBudgetType(tender.budgetMin != null || tender.budgetMax != null ? "range" : "exact");

    if (tender.skills && Array.isArray(tender.skills)) {
      setSkills(tender.skills as string[]);
    }
    if (tender.deliverables && Array.isArray(tender.deliverables)) {
      setDeliverables(tender.deliverables as Deliverable[]);
    }

    const formattedDeadline = new Date(tender.deadline).toISOString().slice(0, 16);

    form.reset({
      title: tender.title,
      description: tender.description || "",
      objective: (tender.objective as string) || "",
      category: tender.category || "",
      deadline: formattedDeadline,
      duration: tender.duration || "",
      startDate: tender.startDate || "",
      endDate: tender.endDate || "",
      budget: tender.budget || "",
      budgetMin: tender.budgetMin ?? undefined,
      budgetMax: tender.budgetMax ?? undefined,
      showPriceToVendors: tender.showPriceToVendors !== false,
      submissionType: tender.submissionType || "",
      videoRequired: tender.videoRequired || false,
      videoUrl: tender.videoUrl || "",
      inquiryType: tender.inquiryType || "",
      whatsappContact: tender.whatsappContact || "",
      emailContact: tender.emailContact || "",
    });
  }, [tender]);

  const updateTenderMutation = useMutation({
    mutationFn: async (data: EditTenderForm) => {
      const payload: Record<string, any> = { ...data, skills, deliverables };

      if (budgetType === "exact") {
        delete payload.budgetMin;
        delete payload.budgetMax;
      } else {
        delete payload.budget;
      }

      // Convert empty strings to null so backend doesn't reject them
      for (const key of Object.keys(payload)) {
        if (payload[key] === "") payload[key] = null;
      }

      const response = await apiRequest("PATCH", `/api/tenders/${id}`, payload);
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onSuccess: (updatedTender) => {
      queryClient.setQueryData(["/api/tenders", id], updatedTender);
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: t('tenderFlow.editSaved'), description: t('tenderFlow.editSavedDesc') });
      setLocation(`/tenders/${id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || t('tenderFlow.editFailed'), variant: "destructive" });
    },
  });

  const publishTenderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${id}/status`, { status: "published" });
      if (!response.ok) throw await response.json();
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      const tenderData = queryClient.getQueryData<any>(["/api/tenders", id]);
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
      setLocation(`/tenders/${id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to publish tender", variant: "destructive" });
    },
  });

  const revertToDraftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tenders/${id}/status`, { status: "draft" });
      if (!response.ok) throw await response.json();
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      toast({ title: t('tenderFlow.editReverted'), description: t('tenderFlow.editRevertedDesc') });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || t('tenderFlow.editFailedRevert'), variant: "destructive" });
    },
  });

  // Skills helpers
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  // Deliverable helpers
  const addDeliverable = () => {
    setDeliverables([
      ...deliverables,
      { id: Date.now().toString(), name: "", description: "", unit: "unit", quantity: 1 },
    ]);
  };
  const updateDeliverable = (did: string, field: keyof Deliverable, value: any) => {
    setDeliverables(deliverables.map((d) => (d.id === did ? { ...d, [field]: value } : d)));
  };
  const removeDeliverable = (did: string) => {
    setDeliverables(deliverables.filter((d) => d.id !== did));
  };

  const onSubmit = (data: EditTenderForm) => {
    updateTenderMutation.mutate(data);
  };

  const isOwner = tender?.companyId === activeCompany?.id;
  const canEdit = isOwner && ["draft", "published"].includes(tender?.status || "");
  const isDraft = tender?.status === "draft";
  const isPublished = tender?.status === "published";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tender || !canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {!tender ? t('tenderFlow.tenderNotFoundTitle') : !isOwner ? t('tenderFlow.editNoPermission') : t('tenderFlow.editClosedCannotEdit')}
              </p>
              <Button variant="outline" onClick={() => setLocation(`/tenders/${id}`)} className="mt-4">
                {t('tenderFlow.backToTender')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/tenders/${id}`)}
          className="mb-6 -ml-2"
          data-testid="button-back"
        >
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ── 1. Basics ─────────────────────────────────────────────── */}
            <SectionCard
              icon={<FileText className="h-4 w-4 text-[#E25E45]" />}
              title={t('tenderFlow.editSectionBasicsTitle')}
              description={t('tenderFlow.editSectionBasicsDesc')}
              color="bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editTitleLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('tenderFlow.editTitlePlaceholder')} data-testid="input-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editDescriptionLabel')}</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder={t('tenderFlow.editDescriptionPlaceholder')} data-testid="input-description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editObjectiveLabel')}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder={t('tenderFlow.editObjectivePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editCategoryLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('tenderFlow.editDurationPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VENDOR_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SectionCard>

            {/* ── 2. Timeline ───────────────────────────────────────────── */}
            <SectionCard
              icon={<Calendar className="h-4 w-4 text-blue-600" />}
              title={t('tenderFlow.editSectionTimelineTitle')}
              description={t('tenderFlow.editSectionTimelineDesc')}
              color="bg-gradient-to-r from-blue-500 to-blue-400"
            >
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editDeadlineLabel')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" data-testid="input-deadline" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editDurationLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('tenderFlow.editDurationPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editStartDateLabel')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editEndDateLabel')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SectionCard>

            {/* ── 3. Budget ─────────────────────────────────────────────── */}
            <SectionCard
              icon={<DollarSign className="h-4 w-4 text-green-600" />}
              title={t('tenderFlow.editSectionBudgetTitle')}
              description={t('tenderFlow.editSectionBudgetDesc')}
              color="bg-gradient-to-r from-green-500 to-emerald-400"
            >
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBudgetType("exact")}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    budgetType === "exact"
                      ? "bg-[#E25E45] text-white border-[#E25E45]"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  {t('tenderFlow.editBudgetExact')}
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetType("range")}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    budgetType === "range"
                      ? "bg-[#E25E45] text-white border-[#E25E45]"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  {t('tenderFlow.editBudgetRange')}
                </button>
              </div>

              {budgetType === "exact" ? (
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tenderFlow.editBudgetAmountLabel')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">SAR</span>
                          <Input className="pl-12" placeholder={t('tenderFlow.editBudgetAmountPlaceholder')} data-testid="input-budget" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budgetMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('tenderFlow.editBudgetMinLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t('tenderFlow.editBudgetMinPlaceholder')}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="budgetMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('tenderFlow.editBudgetMaxLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t('tenderFlow.editBudgetMaxPlaceholder')}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="showPriceToVendors"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        {field.value ? <Eye className="h-4 w-4 text-gray-500" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
                        <div>
                          <p className="text-sm font-medium">{t('tenderFlow.editShowBudgetLabel')}</p>
                          <p className="text-xs text-muted-foreground">
                            {field.value ? t('tenderFlow.editBudgetVisible') : t('tenderFlow.editBudgetHidden')}
                          </p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </SectionCard>

            {/* ── 4. Submission ─────────────────────────────────────────── */}
            <SectionCard
              icon={<ClipboardList className="h-4 w-4 text-purple-600" />}
              title={t('tenderFlow.editSubmissionsTitle')}
              description={t('tenderFlow.editSectionSubmHowDesc')}
              color="bg-gradient-to-r from-purple-500 to-purple-400"
            >
              <FormField
                control={form.control}
                name="submissionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editSubmTypeLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('tenderFlow.editSubmTypePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBMISSION_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submissionType === "tech_fin_with_video" && (
                <FormField
                  control={form.control}
                  name="videoRequired"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div>
                          <p className="text-sm font-medium text-orange-900 dark:text-orange-200">{t('tenderFlow.editRequireVideoLabel')}</p>
                          <p className="text-xs text-orange-700 dark:text-orange-400">{t('tenderFlow.editRequireVideoDesc')}</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editVideoUrlLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('tenderFlow.editVideoUrlPlaceholder')} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t('tenderFlow.editVideoNote')}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SectionCard>

            {/* ── 5. Contact & Q&A ──────────────────────────────────────── */}
            <SectionCard
              icon={<MessageSquare className="h-4 w-4 text-green-600" />}
              title={t('tenderFlow.editSectionQaTitle')}
              description={t('tenderFlow.editSectionQaDesc')}
              color="bg-gradient-to-r from-green-500 to-teal-400"
            >
              <FormField
                control={form.control}
                name="inquiryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenderFlow.editQaMethodLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('tenderFlow.editQaMethodPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INQUIRY_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {inquiryType === "email_whatsapp" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emailContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('tenderFlow.editContactEmailLabel')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('tenderFlow.editContactEmailPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsappContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('tenderFlow.editWhatsappLabel')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('tenderFlow.editWhatsappPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </SectionCard>

            {/* ── 6. Skills ─────────────────────────────────────────────── */}
            <SectionCard
              icon={<Tag className="h-4 w-4 text-amber-600" />}
              title={t('tenderFlow.editSectionSkillsTitle')}
              description={t('tenderFlow.editSectionSkillsDesc')}
              color="bg-gradient-to-r from-amber-500 to-orange-400"
            >
              <div className="flex gap-2">
                <Input
                  placeholder={t('tenderFlow.editSkillsPlaceholder')}
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1 pr-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((s) => s !== skill))}
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── 7. Deliverables ───────────────────────────────────────── */}
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
                        <span className="text-xs font-bold text-white bg-indigo-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <Input
                          placeholder={t('tenderFlow.editDeliverableNamePlaceholder')}
                          value={d.name}
                          onChange={(e) => updateDeliverable(d.id, "name", e.target.value)}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeDeliverable(d.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <Input
                        placeholder={t('tenderFlow.editDeliverableDescPlaceholder')}
                        value={d.description}
                        onChange={(e) => updateDeliverable(d.id, "description", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('tenderFlow.quantity')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={d.quantity}
                            onChange={(e) => updateDeliverable(d.id, "quantity", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('tenderFlow.editUnitLabel')}</Label>
                          <Input
                            placeholder={t('tenderFlow.editUnitPlaceholder')}
                            value={d.unit}
                            onChange={(e) => updateDeliverable(d.id, "unit", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={addDeliverable}>
                <Plus className="h-4 w-4 mr-2" />
                {t('tenderFlow.addDeliverable')}
              </Button>
            </SectionCard>

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/tenders/${id}`)}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  {t('tenderFlow.editCancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#E25E45] hover:bg-[#d54d35] text-white"
                  disabled={updateTenderMutation.isPending}
                  data-testid="button-save"
                >
                  {updateTenderMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.editSaving')}</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />{t('tenderFlow.editSaveChanges')}</>
                  )}
                </Button>
              </div>

              {isDraft && (
                <>
                  <Button
                    type="button"
                    onClick={() => publishTenderMutation.mutate()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={publishTenderMutation.isPending}
                    data-testid="button-publish"
                  >
                    {publishTenderMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.editPublishing')}</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" />{t('tenderFlow.editPublishTender')}</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t('tenderFlow.editPublishHint')}
                  </p>
                </>
              )}

              {isPublished && (
                <>
                  <Button
                    type="button"
                    onClick={() => revertToDraftMutation.mutate()}
                    variant="outline"
                    className="w-full border-amber-500 text-amber-600 hover:bg-amber-50"
                    disabled={revertToDraftMutation.isPending}
                    data-testid="button-revert"
                  >
                    {revertToDraftMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('tenderFlow.editReverting')}</>
                    ) : (
                      <><RotateCcw className="h-4 w-4 mr-2" />{t('tenderFlow.editRevertToDraft')}</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t('tenderFlow.editRevertHint')}
                  </p>
                </>
              )}
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
}
