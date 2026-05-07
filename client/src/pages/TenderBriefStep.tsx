import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Loader2, Calendar, DollarSign, Clock, Users, FileText, Video, MessageSquare, Mail, Phone, Eye, EyeOff, Mic, Flag, BarChart, Target, Layers, Package, ClipboardCheck, Send, ChevronRight, ChevronDown, Shield, Copy, Languages, Paperclip, Upload, X } from "lucide-react";
import { BidLogo } from "@/components/brand/BidLogo";
import { useLocation } from "wouter";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth";
import { format } from "date-fns";
import { useI18n, type Language } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VoiceRecorder from "@/components/voice-recorder";
import { MarketplacePublishOption, type MarketplaceOptions } from "@/components/MarketplacePublishOption";
import VendorRequirementsEditor, { type VendorRequirement } from "@/components/VendorRequirementsEditor";

const formatLabel = (value: string, labels?: Record<string, string>): string => {
  if (labels && labels[value]) {
    return labels[value];
  }
  if (labels && labels[value.toLowerCase()]) {
    return labels[value.toLowerCase()];
  }
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export default function TenderBriefStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { activeCompany } = useAuthStore();
  const { t, language, isRtl } = useI18n();
  const [rfpLanguage, setRfpLanguage] = useState<Language>("en");
  const [allowTranslation, setAllowTranslation] = useState(false);
  const [marketplaceOptions, setMarketplaceOptions] = useState<MarketplaceOptions>({
    enabled: false,
    tenderType: 'open_tender',
    documentFee: '',
    inquiryDeadline: '',
    poFiles: [],
    confirmed: false,
  });
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; url: string; size: number; type: string }>>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Mirrors the canonical pattern in TenderAICopilot.uploadOne: POST upload to
  // get a presigned URL, PUT the bytes to GCS, then PUT /api/objects/metadata
  // to register ACL ownership and get the canonical "/objects/<entity-id>"
  // path — the only URL form the public RFP page can fetch back later.
  const handleUpload = async (file: File) => {
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
      toast({
        title: t('voiceRecorder.uploadFailedTitle'),
        description: err?.message || t('voiceRecorder.uploadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const CRITERIA_LABELS: Record<string, string> = {
    financial_offer: t('tenderFlow.criteriaFinancialOffer'),
    previous_work: t('tenderFlow.criteriaPreviousWork'),
    clear_timeline: t('tenderFlow.criteriaClearTimeline'),
    technical_approach: t('tenderFlow.criteriaTechnicalApproach'),
    team_expertise: t('tenderFlow.criteriaTeamExpertise'),
  };

  const SUBMISSION_TYPE_LABELS: Record<string, string> = {
    quote_only: t('tenderFlow.submissionQuoteOnly'),
    tech_fin_proposal: t('tenderFlow.submissionTechFin'),
    video_only: t('tenderFlow.submissionVideoOnly'),
    tech_fin_with_video: t('tenderFlow.submissionTechFinVideo'),
    document_only: t('tenderFlow.submissionDocOnly'),
    both: t('tenderFlow.submissionBoth'),
  };

  const INQUIRY_TYPE_LABELS: Record<string, string> = {
    inside_bid: t('tenderFlow.inquiryInsideBid'),
    email_whatsapp: t('tenderFlow.inquiryEmailWhatsapp'),
    whatsapp: t('tenderFlow.inquiryWhatsapp'),
    email: t('tenderFlow.inquiryEmail'),
    phone: t('tenderFlow.inquiryPhone'),
  };

  const DURATION_LABELS: Record<string, string> = {
    "6plus": t('tenderFlow.durationMoreThan6'),
    "3to6": t('tenderFlow.duration3to6'),
    "1to3": t('tenderFlow.duration1to3'),
  };

  const PROJECT_SIZE_LABELS: Record<string, string> = {
    small: t('tenderFlow.smallProject'),
    medium: t('tenderFlow.mediumProject'),
    large: t('tenderFlow.largeProject'),
  };

  const EVAL_CATEGORY_LABELS: Record<string, string> = {
    experience: t('tenderFlow.evalCategoryExperience'),
    financial: t('tenderFlow.evalCategoryFinancial'),
    technical: t('tenderFlow.evalCategoryTechnical'),
  };

  const EVAL_REQUIREMENT_LABELS: Record<string, string> = {
    years_in_market: t('tenderFlow.evalReqYearsInMarket'),
    similar_projects_count: t('tenderFlow.evalReqSimilarProjects'),
    min_project_value: t('tenderFlow.evalReqMinProjectValue'),
    client_references: t('tenderFlow.evalReqClientReferences'),
    financial_statements: t('tenderFlow.evalReqFinancialStatements'),
    bank_guarantee: t('tenderFlow.evalReqBankGuarantee'),
    methodology: t('tenderFlow.evalReqMethodology'),
    timeline: t('tenderFlow.evalReqTimeline'),
    team_cvs: t('tenderFlow.evalReqTeamCvs'),
    industry_certifications: t('tenderFlow.evalReqIndustryCertifications'),
  };

  const [draft, setDraft] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  });

  // Mirror writes back to localStorage so going Back to earlier steps and
  // returning to the brief does not drop voice/video edits made here.
  const updateDraft = (patch: Record<string, any>) => {
    setDraft((prev: any) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("tenderDraft", JSON.stringify(next));
      } catch {
        // localStorage may be full / disabled — UI state still updates.
      }
      return next;
    });
  };

  const [expandedDeliverables, setExpandedDeliverables] = useState<Record<number, boolean>>({});
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});

  // Vendor requirements: editable inline on the Brief so they can be added/changed
  // without re-walking the wizard. Mirrors writes back to the draft so other
  // steps (and the localStorage-driven submit body below) stay in sync.
  const [vendorRequirements, setVendorRequirements] = useState<VendorRequirement[]>(
    Array.isArray(draft.vendorRequirements) ? draft.vendorRequirements : []
  );

  const handleVendorRequirementsChange = (next: VendorRequirement[]) => {
    setVendorRequirements(next);
    updateDraft({ vendorRequirements: next });
  };

  const toggleDeliverable = (index: number) => {
    setExpandedDeliverables(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleCriteria = (key: string) => {
    setExpandedCriteria(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const submitTender = useMutation({
    mutationFn: async (tenderData: any) => {
      const response = await apiRequest("POST", "/api/tenders", tenderData);
      return await response.json();
    },
    onSuccess: (data: any) => {
      localStorage.removeItem("tenderDraft");
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      const inviteLink = `${window.location.origin}/invite/${data.invitationToken}`;
      toast({
        title: t('tenderFlow.rfpPublished'),
        description: t('tenderFlow.rfpPublishedDesc'),
        action: (
          <ToastAction altText={t('tenderFlow.copyInviteLink')} onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: t('tenderFlow.linkCopied') }); }}>
            <Copy className="h-3 w-3 mr-1" /> {t('common.copyLink')}
          </ToastAction>
        ),
        duration: 10000,
      });
      navigate("/dashboard?tab=tenders");
    },
    onError: (error: Error) => {
      toast({
        title: t('tenderFlow.failedPublishRfp'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    if (marketplaceOptions.enabled && !marketplaceOptions.confirmed) {
      toast({
        title: t('marketplace.confirmRequired') || 'Confirmation required',
        description: t('marketplace.confirmRequiredDesc') || 'Please confirm the marketplace binding commitment before publishing.',
        variant: "destructive",
      });
      return;
    }

    const tenderData: Record<string, any> = {
      title: draft.title || "Untitled RFP",
      description: draft.description || draft.projectDescription || draft.title || "No description provided",
      category: draft.category || undefined,
      skills: draft.skills || [],
      scope: draft.scope || undefined,
      deadline: draft.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: draft.duration || "1-3 months",
      budget: draft.budget || "",
      budgetMin: draft.budgetMin || undefined,
      budgetMax: draft.budgetMax || undefined,
      projectSize: draft.projectSize || undefined,
      showPriceToVendors: draft.showPriceToVendors !== false,
      projectTimeline: draft.projectTimeline || draft.duration || "1-3 months",
      submissionType: draft.submissionType || undefined,
      videoRequired: draft.videoRequired || undefined,
      inquiryType: draft.inquiryType || undefined,
      inquiryDeadline: draft.inquiryDeadline || undefined,
      whatsappContact: draft.whatsappContact || undefined,
      emailContact: draft.emailContact || undefined,
      evaluationCriteria: draft.evaluationCriteria && (
        Array.isArray(draft.evaluationCriteria)
          ? draft.evaluationCriteria.length > 0
          : (draft.evaluationCriteria.requirements?.length > 0 || draft.evaluationCriteria.customCriteria?.length > 0)
      ) ? draft.evaluationCriteria : undefined,
      objective: draft.projectObjective || undefined,
      deliverables: draft.keyDeliverables && draft.keyDeliverables.length > 0 ? draft.keyDeliverables : undefined,
      voiceNoteUrl: draft.voiceNoteUrl || undefined,
      videoUrl: draft.videoUrl?.trim() || undefined,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      milestones: draft.milestones && draft.milestones.length > 0 ? draft.milestones : undefined,
      vendorRequirements: vendorRequirements.length > 0 ? vendorRequirements : undefined,
      language: rfpLanguage,
      allowTranslation,
    };

    if (marketplaceOptions.enabled) {
      tenderData.publishToMarketplace = true;
      tenderData.marketplaceTenderType = marketplaceOptions.tenderType;
      if (marketplaceOptions.documentFee !== '') {
        tenderData.marketplaceDocumentFee = parseInt(marketplaceOptions.documentFee, 10);
      }
      if (marketplaceOptions.inquiryDeadline) {
        tenderData.marketplaceInquiryDeadline = new Date(marketplaceOptions.inquiryDeadline).toISOString();
      }
      if (marketplaceOptions.poFiles.length > 0) {
        tenderData.marketplacePoFiles = marketplaceOptions.poFiles;
      }
    }

    if (attachments.length > 0) {
      tenderData.attachments = attachments;
    }

    submitTender.mutate(tenderData);
  };

  const handleBack = () => {
    navigate("/tenders/new/evaluation-criteria");
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "PPP");
    } catch {
      return dateStr;
    }
  };

  const getDurationDisplay = () => {
    if (draft.duration && DURATION_LABELS[draft.duration]) return DURATION_LABELS[draft.duration];
    if (draft.duration) return draft.duration;
    if (draft.startDate && draft.endDate) {
      const start = new Date(draft.startDate);
      const end = new Date(draft.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months <= 3) return t('tenderFlow.duration1to3');
      if (months <= 6) return t('tenderFlow.duration3to6');
      return t('tenderFlow.durationMoreThan6');
    }
    return t('tenderFlow.notSpecified');
  };

  const getBudgetDisplay = () => {
    if (draft.budgetMin && draft.budgetMax) {
      return `SAR ${Number(draft.budgetMin).toLocaleString()} – ${Number(draft.budgetMax).toLocaleString()}`;
    }
    if (draft.budget) {
      const num = Number(draft.budget);
      return !isNaN(num) && num > 0 ? `SAR ${num.toLocaleString()}` : draft.budget;
    }
    return t('tenderFlow.notSpecified');
  };

  const hasSkills = draft.skills && draft.skills.length > 0;
  const hasDeliverables = draft.keyDeliverables && draft.keyDeliverables.length > 0;
  const hasMilestones = draft.milestones && draft.milestones.length > 0;
  const hasEvalCriteria = draft.evaluationCriteria && (
    Array.isArray(draft.evaluationCriteria)
      ? draft.evaluationCriteria.length > 0
      : (draft.evaluationCriteria.weights?.length > 0 || draft.evaluationCriteria.requirements?.length > 0 || draft.evaluationCriteria.customCriteria?.length > 0)
  );
  const hasDescription = !!(draft.description || draft.projectDescription);
  const hasObjective = !!draft.projectObjective;
  const hasContactInfo = !!(draft.emailContact || draft.whatsappContact);

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <BidLogo size={40} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/dashboard")} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={submitTender.isPending}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t('tenderFlow.backToEdit')}
          </Button>
        </div>
      </header>

      <div className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className="bg-amber-100 text-amber-800 dark:text-amber-300 text-sm px-3 py-1">
                  {t('tenderFlow.reviewDraft')}
                </Badge>
                {draft.skills?.[0] && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {draft.skills[0]}
                  </Badge>
                )}
              </div>
              <h1 className="font-display font-black text-3xl text-foreground mb-2 tracking-[-0.04em]" data-testid="brief-title">
                {draft.title || "Untitled RFP"}
              </h1>
              {activeCompany && (
                <p className="text-sm text-muted-foreground">
                  {t('tenderFlow.publishingAs')} <span className="font-medium text-muted-foreground">{activeCompany.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{t('tenderFlow.submissionDeadline')}</span>
              </div>
              <p className="font-semibold text-sm text-foreground" data-testid="brief-deadline">
                {draft.deadline ? formatDate(draft.deadline) : t('tenderFlow.notSet')}
              </p>
            </div>

            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{t('tenderFlow.budgetColumn')}</span>
              </div>
              <p className="font-semibold text-sm text-foreground" data-testid="brief-budget">
                {getBudgetDisplay()}
              </p>
              {draft.showPriceToVendors === false && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> {t('tenderFlow.hiddenFromVendors')}
                </p>
              )}
            </div>

            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{t('tenderFlow.projectDuration')}</span>
              </div>
              <p className="font-semibold text-sm text-foreground" data-testid="brief-duration">
                {getDurationDisplay()}
              </p>
              {(draft.startDate || draft.endDate) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {draft.startDate && formatDate(draft.startDate)}
                  {draft.startDate && draft.endDate && ' → '}
                  {draft.endDate && formatDate(draft.endDate)}
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {hasDescription && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#FE3C01]" />
                    {t('tenderFlow.projectDescriptionTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="brief-description">
                    {draft.description || draft.projectDescription}
                  </p>
                </CardContent>
              </Card>
            )}

            {hasObjective && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-[var(--bid-orange)]" />
                    {t('tenderFlow.projectObjectiveTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed" data-testid="brief-objective">
                    {draft.projectObjective}
                  </p>
                </CardContent>
              </Card>
            )}

            {hasDeliverables && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-[var(--state-won)]" />
                    {t('tenderFlow.keyDeliverablesTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="brief-deliverables">
                    {draft.keyDeliverables.map((deliverable: any, index: number) => {
                      if (typeof deliverable === 'string') {
                        return (
                          <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[var(--state-won)]/10 text-[var(--state-won)] flex items-center justify-center text-xs font-bold">{index + 1}</span>
                            <span className="text-foreground pt-0.5">{deliverable}</span>
                          </div>
                        );
                      }
                      const isExpanded = expandedDeliverables[index];
                      const hasDetails = deliverable.description || (deliverable.quantity && deliverable.unit);
                      return (
                        <div key={deliverable.id || index} className="bg-muted rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => hasDetails && toggleDeliverable(index)}
                            className={`w-full p-4 flex items-center justify-between gap-4 text-left ${hasDetails ? 'cursor-pointer hover:bg-muted' : ''} transition-colors`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-[var(--state-won)]/10 text-[var(--state-won)] flex items-center justify-center text-xs font-bold">{index + 1}</span>
                              <p className="font-medium text-foreground">{deliverable.name}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {deliverable.quantity && deliverable.unit && (
                                <Badge variant="outline" className="font-medium">
                                  {deliverable.quantity} × {deliverable.unit}
                                </Badge>
                              )}
                              {hasDetails && (
                                <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              )}
                            </div>
                          </button>
                          <div className={`grid transition-all duration-200 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                              {deliverable.description && (
                                <div className="px-4 pb-4 pt-0 ml-12">
                                  <p className="text-sm text-muted-foreground leading-relaxed">{deliverable.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasMilestones && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-violet-600" />
                    {t('tenderFlow.milestonesTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="brief-milestones">
                    {draft.milestones.map((milestone: any, index: number) => (
                      <div key={milestone.id || index} className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:text-violet-300 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{milestone.name}</p>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{milestone.description}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right space-y-0.5">
                          {milestone.dueDate && (
                            <p className="text-sm font-medium text-muted-foreground">{formatDate(milestone.dueDate)}</p>
                          )}
                          {milestone.amount && (
                            <p className="text-sm font-semibold text-[var(--state-won)]">SAR {Number(milestone.amount).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasEvalCriteria && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-amber-600" />
                    {t('tenderFlow.evaluationCriteriaTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(draft.evaluationCriteria) ? (
                    <div className="space-y-2" data-testid="brief-criteria">
                      {draft.evaluationCriteria.map((criteria: any, index: number) => {
                        if (typeof criteria === 'string') {
                          const isOpen = expandedCriteria[`arr-${index}`];
                          return (
                            <div key={index} className="bg-muted rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCriteria(`arr-${index}`)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                  <span className="text-sm font-medium text-foreground">{CRITERIA_LABELS[criteria] || criteria}</span>
                                </div>
                                <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                              </button>
                              <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  <div className="px-4 pb-3 ml-12">
                                    <p className="text-sm text-muted-foreground">{t('tenderFlow.criterionEvalDesc')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (typeof criteria === 'object' && criteria.name) {
                          const isOpen = expandedCriteria[`arr-${index}`];
                          return (
                            <div key={index} className="bg-muted rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCriteria(`arr-${index}`)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                  <span className="text-sm font-medium text-foreground">{criteria.name}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {criteria.weight && <Badge variant="outline" className="font-semibold">{criteria.weight}%</Badge>}
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                                </div>
                              </button>
                              <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  {criteria.description && (
                                    <div className="px-4 pb-3 ml-12">
                                      <p className="text-sm text-muted-foreground leading-relaxed">{criteria.description}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4" data-testid="brief-criteria">
                      {draft.evaluationCriteria.weights?.length > 0 && (
                        <div className="space-y-2">
                          {draft.evaluationCriteria.weights.map((w: any) => {
                            const cat = EVAL_CATEGORY_LABELS[w.categoryId] || w.categoryId;
                            const relatedReqs = draft.evaluationCriteria.requirements?.filter(
                              (r: any) => r.categoryId === w.categoryId || r.requirementId?.startsWith(w.categoryId)
                            ) || [];
                            const hasContent = relatedReqs.length > 0;
                            const isOpen = expandedCriteria[w.categoryId];
                            return (
                              <div key={w.categoryId} className="bg-muted rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => hasContent && toggleCriteria(w.categoryId)}
                                  className={`w-full p-3 flex items-center justify-between gap-3 text-left ${hasContent ? 'cursor-pointer hover:bg-muted' : ''} transition-colors`}
                                >
                                  <span className="text-sm font-medium text-foreground">{cat}</span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge variant="outline" className="font-semibold">{w.weight}%</Badge>
                                    {hasContent && (
                                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                                    )}
                                  </div>
                                </button>
                                <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                  <div className="overflow-hidden">
                                    {relatedReqs.length > 0 && (
                                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                                        {relatedReqs.map((req: any, i: number) => (
                                          <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-800 dark:text-amber-300 border border-amber-200">
                                            {EVAL_REQUIREMENT_LABELS[req.requirementId] || req.requirementId}
                                            {req.value && typeof req.value !== 'boolean' ? `: ${req.value}` : ''}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(() => {
                        const weightCategoryIds = (draft.evaluationCriteria.weights || []).map((w: any) => w.categoryId);
                        const ungroupedReqs = (draft.evaluationCriteria.requirements || []).filter(
                          (r: any) => !weightCategoryIds.some((catId: string) =>
                            r.categoryId === catId || r.requirementId?.startsWith(catId)
                          )
                        );
                        if (ungroupedReqs.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('tenderFlow.additionalRequirements')}</p>
                            <div className="flex flex-wrap gap-2">
                              {ungroupedReqs.map((req: any, i: number) => (
                                <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-800 dark:text-amber-300 border border-amber-200">
                                  {EVAL_REQUIREMENT_LABELS[req.requirementId] || req.requirementId}
                                  {req.value && typeof req.value !== 'boolean' ? `: ${req.value}` : ''}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {draft.evaluationCriteria.customCriteria?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('tenderFlow.customCriteriaTitle')}</p>
                          {draft.evaluationCriteria.customCriteria.map((c: any) => (
                            <div key={c.id} className="bg-muted rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCriteria(`custom-${c.id}`)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-muted transition-colors"
                              >
                                <span className="text-sm text-foreground">{c.text}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="font-semibold">{c.weight}%</Badge>
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedCriteria[`custom-${c.id}`] ? 'rotate-90' : ''}`} />
                                </div>
                              </button>
                              <div className={`grid transition-all duration-200 ease-in-out ${expandedCriteria[`custom-${c.id}`] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  <div className="px-4 pb-3">
                                    <p className="text-sm text-muted-foreground">{t('tenderFlow.customCriterionWeightedAt')} {c.weight}% {t('tenderFlow.ofTotalEvaluation')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden" data-testid="brief-vendor-requirements">
              <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-orange-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#FE3C01]" />
                  {t('tenderFlow.vendorRequirementsTitle')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('tenderFlow.vendorRequirementsBriefHint') || 'What vendors must (or should) prove to qualify. Edit anytime before publishing.'}
                </p>
              </CardHeader>
              <CardContent>
                <VendorRequirementsEditor
                  value={vendorRequirements}
                  onChange={handleVendorRequirementsChange}
                  isRtl={isRtl}
                  compact
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-pink-500 to-pink-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-pink-600" />
                  {t('tenderFlow.voiceNoteTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <VoiceRecorder
                  onRecordingComplete={(url) => updateDraft({ voiceNoteUrl: url })}
                  onRecordingDeleted={() => updateDraft({ voiceNoteUrl: "" })}
                  existingUrl={draft.voiceNoteUrl || undefined}
                />
                {draft.voiceNoteUrl && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('tenderFlow.savedVoiceNote') || 'Saved voice note'}
                    </p>
                    <audio controls className="w-full" data-testid="brief-voice-note">
                      <source src={draft.voiceNoteUrl} />
                    </audio>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-pink-600" />
                  {t('tenderFlow.videoUrlLabel') || 'Video URL'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="video-url-input" className="text-sm font-medium text-foreground">
                    {t('tenderFlow.videoUrlLabel') || 'Video URL'}
                  </Label>
                  <Input
                    id="video-url-input"
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={draft.videoUrl || ""}
                    onChange={(e) => updateDraft({ videoUrl: e.target.value })}
                    data-testid="input-video-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('tenderFlow.videoUrlHint') || 'Optional: link to a video introducing the project'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t('tenderFlow.requireVideoLabel') || 'Require video pitch'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('tenderFlow.requireVideoHint') || 'Vendors must include a video URL with their proposal'}
                    </p>
                  </div>
                  <Switch
                    checked={!!draft.videoRequired}
                    onCheckedChange={(checked) => updateDraft({ videoRequired: checked })}
                    data-testid="switch-video-required"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-slate-500 to-slate-400" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-slate-600" />
                  {t('tenderFlow.supportingDocsTitle') || 'Supporting Documents'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3" data-testid="brief-attachments">
                  <p className="text-sm text-muted-foreground">
                    {t('tenderFlow.supportingDocsDesc') || 'Upload any documents that help vendors understand the scope (specs, drawings, references).'}
                  </p>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    data-testid="input-attachment-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="h-9"
                    data-testid="button-upload-attachment"
                  >
                    {uploadingAttachment ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        {t('tenderFlow.uploading') || 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {t('tenderFlow.uploadDocuments') || 'Upload supporting documents'}
                      </>
                    )}
                  </Button>
                  {attachments.length > 0 && (
                    <ul className="space-y-2 mt-3" data-testid="list-attachments">
                      {attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border"
                          data-testid={`attachment-${a.id}`}
                        >
                          <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(a.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(a.id)}
                            className="text-gray-400 hover:text-rose-500 transition-colors"
                            aria-label={t('tenderFlow.removeAttachmentAria') || 'Remove attachment'}
                            data-testid={`button-remove-attachment-${a.id}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden sticky top-20">
              <div className="h-1 bg-gradient-to-r from-[#FE3C01] to-[#FF8A6B]" />
              <CardContent className="p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t('tenderFlow.quickSummary')}</h3>
                  <div className="space-y-4">
                    {draft.projectSize && (
                      <div className="flex items-start gap-3">
                        <BarChart className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.projectSizeLabel')}</p>
                          <p className="text-sm font-medium text-foreground">
                            {PROJECT_SIZE_LABELS[draft.projectSize] || draft.projectSize}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.budgetType && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.budgetTypeLabel')}</p>
                          <p className="text-sm font-medium text-foreground">
                            {draft.budgetType === 'milestone' ? t('tenderFlow.milestoneBased') : t('tenderFlow.fixedPrice')}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.pricingModel && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.pricingModelLabel')}</p>
                          <p className="text-sm font-medium text-foreground">{formatLabel(draft.pricingModel)}</p>
                        </div>
                      </div>
                    )}

                    {draft.showPriceToVendors !== undefined && (
                      <div className="flex items-start gap-3">
                        {draft.showPriceToVendors ? (
                          <Eye className="h-4 w-4 text-emerald-500 mt-0.5" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400 mt-0.5" />
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.priceVisibilityLabel')}</p>
                          <p className="text-sm font-medium text-foreground">
                            {draft.showPriceToVendors ? t('tenderFlow.visibleToVendors') : t('tenderFlow.hiddenSizeOnly')}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.submissionType && (
                      <div className="flex items-start gap-3">
                        <Send className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.submissionFormatLabel')}</p>
                          <p className="text-sm font-medium text-foreground" data-testid="brief-submission-type">
                            {formatLabel(draft.submissionType, SUBMISSION_TYPE_LABELS)}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.videoRequired && (
                      <div className="flex items-start gap-3">
                        <Video className="h-4 w-4 text-pink-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.videoPitchTitle')}</p>
                          <p className="text-sm font-medium text-foreground">{t('tenderFlow.requiredBadge')}</p>
                        </div>
                      </div>
                    )}

                    {draft.inquiryType && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('tenderFlow.vendorQuestionsLabel')}</p>
                          <p className="text-sm font-medium text-foreground" data-testid="brief-inquiry-type">
                            {formatLabel(draft.inquiryType, INQUIRY_TYPE_LABELS)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {hasSkills && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t('tenderFlow.requiredSkillsLabel')}</p>
                    <div className="flex flex-wrap gap-1.5" data-testid="brief-skills">
                      {draft.skills.map((skill: string, index: number) => (
                        <Badge key={index} className="bg-[#FE3C01]/10 text-[#FE3C01] hover:bg-[#FE3C01]/15 text-xs px-2 py-0.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {draft.aiEstimate && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t('tenderFlow.aiBudgetInsight')}</p>
                    <div className="bg-[var(--bid-orange)]/5 rounded-lg p-3 space-y-1.5">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        Est. SAR {Number(draft.aiEstimate.estimatedBudget).toLocaleString()}
                      </p>
                      {draft.aiEstimate.budgetRange && (
                        <p className="text-xs text-[var(--bid-orange)]">
                          Range: SAR {Number(draft.aiEstimate.budgetRange.min).toLocaleString()} – {Number(draft.aiEstimate.budgetRange.max).toLocaleString()}
                        </p>
                      )}
                      {draft.aiEstimate.reasoning && (
                        <p className="text-xs text-[var(--bid-orange)] leading-relaxed mt-1">
                          {draft.aiEstimate.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {hasContactInfo && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t('tenderFlow.contactForInquiries')}</p>
                    <div className="space-y-2">
                      {draft.emailContact && (
                        <div className="flex items-center gap-2 text-sm" data-testid="brief-email">
                          <Mail className="h-3.5 w-3.5 text-[#FE3C01]" />
                          <span className="text-muted-foreground">{draft.emailContact}</span>
                        </div>
                      )}
                      {draft.whatsappContact && (
                        <div className="flex items-center gap-2 text-sm" data-testid="brief-whatsapp">
                          <Phone className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-muted-foreground">{draft.whatsappContact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── RFP Language & Translation Settings ─── */}
                <div className="pt-4 border-t border-border space-y-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Languages className="h-4 w-4 text-[#FE3C01]" />
                      <span className="text-sm font-semibold text-foreground">
                        {t('tenderFlow.rfpLanguageLabel')} <span className="text-red-500">*</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRfpLanguage('en')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                          rfpLanguage === 'en'
                            ? 'border-[#FE3C01] bg-[#FE3C01]/10 text-[#FE3C01]'
                            : 'border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setRfpLanguage('ar')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                          rfpLanguage === 'ar'
                            ? 'border-[#FE3C01] bg-[#FE3C01]/10 text-[#FE3C01]'
                            : 'border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        العربية
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-[var(--bid-orange)]/5">
                        <Languages className="h-3.5 w-3.5 text-[var(--bid-orange)]" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {t('tenderFlow.allowTranslationLabel')}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('tenderFlow.allowTranslationDesc')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={allowTranslation}
                      onCheckedChange={setAllowTranslation}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <MarketplacePublishOption
                    value={marketplaceOptions}
                    onChange={setMarketplaceOptions}
                    deadline={draft.deadline}
                    language={language}
                    isRtl={isRtl}
                    t={t}
                  />

                  <Button
                    onClick={handlePublish}
                    disabled={submitTender.isPending || (marketplaceOptions.enabled && !marketplaceOptions.confirmed)}
                    className="w-full bg-[#FE3C01] hover:bg-[#d54d35] h-12 text-base font-semibold shadow-lg shadow-[#FE3C01]/20"
                    data-testid="button-publish-tender"
                  >
                    {submitTender.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t('tenderFlow.publishingRfp')}
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        {t('tenderFlow.publishRfp')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={submitTender.isPending}
                    className="w-full"
                    data-testid="button-back-edit"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('tenderFlow.goBackEdit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50">
        <div className="max-w-5xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={submitTender.isPending}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={handlePublish}
            disabled={submitTender.isPending}
            className="flex-1 bg-[#FE3C01] hover:bg-[#d54d35] h-11 font-semibold"
          >
            {submitTender.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('tenderFlow.publishingRfp')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t('tenderFlow.publishRfp')}
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="lg:hidden h-20" />
    </div>
  );
}
