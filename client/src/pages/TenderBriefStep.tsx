import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Loader2, Calendar, DollarSign, Clock, Users, FileText, Video, MessageSquare, Mail, Phone, Eye, EyeOff, Mic, Flag, BarChart, Target, Layers, Package, ClipboardCheck, Send, ChevronRight, ChevronDown, Shield, Copy, Languages } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuthStore } from "@/lib/auth";
import { format } from "date-fns";
import { useI18n, type Language } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { MarketplacePublishOption, type MarketplaceOptions } from "@/components/MarketplacePublishOption";

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

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [expandedDeliverables, setExpandedDeliverables] = useState<Record<number, boolean>>({});
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});

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
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      milestones: draft.milestones && draft.milestones.length > 0 ? draft.milestones : undefined,
      vendorRequirements: draft.vendorRequirements && draft.vendorRequirements.length > 0 ? draft.vendorRequirements : undefined,
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
  const hasVendorRequirements = !!(draft.vendorRequirements && draft.vendorRequirements.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <img
            src={logoPath}
            alt="Bid"
            className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
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

      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className="bg-amber-100 text-amber-800 text-sm px-3 py-1">
                  {t('tenderFlow.reviewDraft')}
                </Badge>
                {draft.skills?.[0] && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {draft.skills[0]}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="brief-title">
                {draft.title || "Untitled RFP"}
              </h1>
              {activeCompany && (
                <p className="text-sm text-gray-500">
                  {t('tenderFlow.publishingAs')} <span className="font-medium text-gray-700">{activeCompany.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{t('tenderFlow.submissionDeadline')}</span>
              </div>
              <p className="font-semibold text-sm text-gray-900" data-testid="brief-deadline">
                {draft.deadline ? formatDate(draft.deadline) : t('tenderFlow.notSet')}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{t('tenderFlow.budgetColumn')}</span>
              </div>
              <p className="font-semibold text-sm text-gray-900" data-testid="brief-budget">
                {getBudgetDisplay()}
              </p>
              {draft.showPriceToVendors === false && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> {t('tenderFlow.hiddenFromVendors')}
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{t('tenderFlow.projectDuration')}</span>
              </div>
              <p className="font-semibold text-sm text-gray-900" data-testid="brief-duration">
                {getDurationDisplay()}
              </p>
              {(draft.startDate || draft.endDate) && (
                <p className="text-xs text-gray-500 mt-0.5">
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
                <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#E25E45]" />
                    {t('tenderFlow.projectDescriptionTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="brief-description">
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
                    <Target className="h-5 w-5 text-blue-600" />
                    {t('tenderFlow.projectObjectiveTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="brief-objective">
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
                    <Package className="h-5 w-5 text-emerald-600" />
                    {t('tenderFlow.keyDeliverablesTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3" data-testid="brief-deliverables">
                    {draft.keyDeliverables.map((deliverable: any, index: number) => {
                      if (typeof deliverable === 'string') {
                        return (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                            <span className="text-gray-800 pt-0.5">{deliverable}</span>
                          </div>
                        );
                      }
                      const isExpanded = expandedDeliverables[index];
                      const hasDetails = deliverable.description || (deliverable.quantity && deliverable.unit);
                      return (
                        <div key={deliverable.id || index} className="bg-gray-50 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => hasDetails && toggleDeliverable(index)}
                            className={`w-full p-4 flex items-center justify-between gap-4 text-left ${hasDetails ? 'cursor-pointer hover:bg-gray-100' : ''} transition-colors`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                              <p className="font-medium text-gray-900">{deliverable.name}</p>
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
                                  <p className="text-sm text-gray-600 leading-relaxed">{deliverable.description}</p>
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
                      <div key={milestone.id || index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{milestone.name}</p>
                          {milestone.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{milestone.description}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right space-y-0.5">
                          {milestone.dueDate && (
                            <p className="text-sm font-medium text-gray-700">{formatDate(milestone.dueDate)}</p>
                          )}
                          {milestone.amount && (
                            <p className="text-sm font-semibold text-emerald-700">SAR {Number(milestone.amount).toLocaleString()}</p>
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
                            <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCriteria(`arr-${index}`)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                  <span className="text-sm font-medium text-gray-900">{CRITERIA_LABELS[criteria] || criteria}</span>
                                </div>
                                <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                              </button>
                              <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  <div className="px-4 pb-3 ml-12">
                                    <p className="text-sm text-gray-500">{t('tenderFlow.criterionEvalDesc')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (typeof criteria === 'object' && criteria.name) {
                          const isOpen = expandedCriteria[`arr-${index}`];
                          return (
                            <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCriteria(`arr-${index}`)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{index + 1}</span>
                                  <span className="text-sm font-medium text-gray-900">{criteria.name}</span>
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
                                      <p className="text-sm text-gray-600 leading-relaxed">{criteria.description}</p>
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
                              <div key={w.categoryId} className="bg-gray-50 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => hasContent && toggleCriteria(w.categoryId)}
                                  className={`w-full p-3 flex items-center justify-between gap-3 text-left ${hasContent ? 'cursor-pointer hover:bg-gray-100' : ''} transition-colors`}
                                >
                                  <span className="text-sm font-medium text-gray-900">{cat}</span>
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
                                          <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
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
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{t('tenderFlow.additionalRequirements')}</p>
                            <div className="flex flex-wrap gap-2">
                              {ungroupedReqs.map((req: any, i: number) => (
                                <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{t('tenderFlow.customCriteriaTitle')}</p>
                          {draft.evaluationCriteria.customCriteria.map((c: any) => (
                            <div key={c.id} className="bg-gray-50 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleCriteria(`custom-${c.id}`)}
                                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-gray-100 transition-colors"
                              >
                                <span className="text-sm text-gray-900">{c.text}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="font-semibold">{c.weight}%</Badge>
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedCriteria[`custom-${c.id}`] ? 'rotate-90' : ''}`} />
                                </div>
                              </button>
                              <div className={`grid transition-all duration-200 ease-in-out ${expandedCriteria[`custom-${c.id}`] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                  <div className="px-4 pb-3">
                                    <p className="text-sm text-gray-500">{t('tenderFlow.customCriterionWeightedAt')} {c.weight}% {t('tenderFlow.ofTotalEvaluation')}</p>
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

            {hasVendorRequirements && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#E25E45] to-orange-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#E25E45]" />
                    {t('tenderFlow.vendorRequirementsTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2" data-testid="brief-vendor-requirements">
                    {draft.vendorRequirements.map((req: any, index: number) => (
                      <div key={req.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-800">{req.text}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${req.type === 'mandatory' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {req.type === 'mandatory' ? t('tenderFlow.mandatoryBadge') : t('tenderFlow.preferredBadge')}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {draft.voiceNoteUrl && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-pink-500 to-pink-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-pink-600" />
                    {t('tenderFlow.voiceNoteTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <audio controls className="w-full" data-testid="brief-voice-note">
                    <source src={draft.voiceNoteUrl} />
                  </audio>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden sticky top-20">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
              <CardContent className="p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t('tenderFlow.quickSummary')}</h3>
                  <div className="space-y-4">
                    {draft.projectSize && (
                      <div className="flex items-start gap-3">
                        <BarChart className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.projectSizeLabel')}</p>
                          <p className="text-sm font-medium text-gray-900">
                            {PROJECT_SIZE_LABELS[draft.projectSize] || draft.projectSize}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.budgetType && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.budgetTypeLabel')}</p>
                          <p className="text-sm font-medium text-gray-900">
                            {draft.budgetType === 'milestone' ? t('tenderFlow.milestoneBased') : t('tenderFlow.fixedPrice')}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.pricingModel && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.pricingModelLabel')}</p>
                          <p className="text-sm font-medium text-gray-900">{formatLabel(draft.pricingModel)}</p>
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.priceVisibilityLabel')}</p>
                          <p className="text-sm font-medium text-gray-900">
                            {draft.showPriceToVendors ? t('tenderFlow.visibleToVendors') : t('tenderFlow.hiddenSizeOnly')}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.submissionType && (
                      <div className="flex items-start gap-3">
                        <Send className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.submissionFormatLabel')}</p>
                          <p className="text-sm font-medium text-gray-900" data-testid="brief-submission-type">
                            {formatLabel(draft.submissionType, SUBMISSION_TYPE_LABELS)}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.videoRequired && (
                      <div className="flex items-start gap-3">
                        <Video className="h-4 w-4 text-pink-500 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.videoPitchTitle')}</p>
                          <p className="text-sm font-medium text-gray-900">{t('tenderFlow.requiredBadge')}</p>
                        </div>
                      </div>
                    )}

                    {draft.inquiryType && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('tenderFlow.vendorQuestionsLabel')}</p>
                          <p className="text-sm font-medium text-gray-900" data-testid="brief-inquiry-type">
                            {formatLabel(draft.inquiryType, INQUIRY_TYPE_LABELS)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {hasSkills && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('tenderFlow.requiredSkillsLabel')}</p>
                    <div className="flex flex-wrap gap-1.5" data-testid="brief-skills">
                      {draft.skills.map((skill: string, index: number) => (
                        <Badge key={index} className="bg-[#E25E45]/10 text-[#E25E45] hover:bg-[#E25E45]/15 text-xs px-2 py-0.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {draft.aiEstimate && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('tenderFlow.aiBudgetInsight')}</p>
                    <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                      <p className="text-sm font-medium text-blue-900">
                        Est. SAR {Number(draft.aiEstimate.estimatedBudget).toLocaleString()}
                      </p>
                      {draft.aiEstimate.budgetRange && (
                        <p className="text-xs text-blue-700">
                          Range: SAR {Number(draft.aiEstimate.budgetRange.min).toLocaleString()} – {Number(draft.aiEstimate.budgetRange.max).toLocaleString()}
                        </p>
                      )}
                      {draft.aiEstimate.reasoning && (
                        <p className="text-xs text-blue-600 leading-relaxed mt-1">
                          {draft.aiEstimate.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {hasContactInfo && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('tenderFlow.contactForInquiries')}</p>
                    <div className="space-y-2">
                      {draft.emailContact && (
                        <div className="flex items-center gap-2 text-sm" data-testid="brief-email">
                          <Mail className="h-3.5 w-3.5 text-[#E25E45]" />
                          <span className="text-gray-700">{draft.emailContact}</span>
                        </div>
                      )}
                      {draft.whatsappContact && (
                        <div className="flex items-center gap-2 text-sm" data-testid="brief-whatsapp">
                          <Phone className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-gray-700">{draft.whatsappContact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── RFP Language & Translation Settings ─── */}
                <div className="pt-4 border-t border-gray-100 space-y-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Languages className="h-4 w-4 text-[#E25E45]" />
                      <span className="text-sm font-semibold text-gray-900">
                        {t('tenderFlow.rfpLanguageLabel')} <span className="text-red-500">*</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRfpLanguage('en')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                          rfpLanguage === 'en'
                            ? 'border-[#E25E45] bg-[#E25E45]/10 text-[#E25E45]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setRfpLanguage('ar')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
                          rfpLanguage === 'ar'
                            ? 'border-[#E25E45] bg-[#E25E45]/10 text-[#E25E45]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        العربية
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-blue-50">
                        <Languages className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {t('tenderFlow.allowTranslationLabel')}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
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

                <div className="pt-4 border-t border-gray-100 space-y-3">
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
                    className="w-full bg-[#E25E45] hover:bg-[#d54d35] h-12 text-base font-semibold shadow-lg shadow-[#E25E45]/20"
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

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
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
            className="flex-1 bg-[#E25E45] hover:bg-[#d54d35] h-11 font-semibold"
          >
            {submitTender.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Publish RFP
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="lg:hidden h-20" />
    </div>
  );
}
