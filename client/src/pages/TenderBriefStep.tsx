import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Loader2, Calendar, DollarSign, Clock, Users, FileText, Video, MessageSquare, Mail, Phone, Eye, EyeOff, Mic, Flag, BarChart, Target, Layers, Package, ClipboardCheck, Send, ChevronRight, ChevronDown } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { format } from "date-fns";

const CRITERIA_LABELS: Record<string, string> = {
  financial_offer: "Price close to budget",
  previous_work: "Similar previous work",
  clear_timeline: "Clear timeline",
  technical_approach: "Strong technical approach",
  team_expertise: "Team expertise",
};

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  quote_only: "Price Only",
  tech_fin_proposal: "Full Proposal (Technical & Financial)",
  video_only: "Video Pitch",
  tech_fin_with_video: "Full Proposal + Video Pitch",
  document_only: "Document Only",
  both: "Video & Document",
};

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  inside_bid: "Inside Bid Platform (Anonymous Q&A)",
  email_whatsapp: "Email & WhatsApp",
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
};

const SCOPE_LABELS: Record<string, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
};

const DURATION_LABELS: Record<string, string> = {
  "6plus": "More than 6 months",
  "3to6": "3 to 6 months",
  "1to3": "1 to 3 months",
};

const PROJECT_SIZE_LABELS: Record<string, string> = {
  small: "Small Project",
  medium: "Medium Project",
  large: "Large Project",
};

const EVAL_CATEGORY_LABELS: Record<string, string> = {
  experience: "Relevant Experience",
  financial: "Financial Evaluation",
  technical: "Technical Capability",
};

const EVAL_REQUIREMENT_LABELS: Record<string, string> = {
  years_in_market: "Years in Market",
  similar_projects_count: "Similar Projects",
  min_project_value: "Min. Project Value",
  client_references: "Client References",
  financial_statements: "Financial Statements",
  bank_guarantee: "Bank Guarantee",
  methodology: "Detailed Methodology",
  timeline: "Project Timeline",
  team_cvs: "Team CVs",
  industry_certifications: "Industry Certifications",
};

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
    onSuccess: () => {
      localStorage.removeItem("tenderDraft");
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "RFP published!",
        description: "Your RFP is now live. Vendors can start submitting Proposals.",
      });
      navigate("/dashboard?tab=tenders");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish RFP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    const tenderData = {
      title: draft.title || "Untitled RFP",
      description: draft.description || draft.projectDescription || draft.title || "No description provided",
      category: draft.skills?.[0] || "Other",
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
    };

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
      if (months <= 3) return '1 to 3 months';
      if (months <= 6) return '3 to 6 months';
      return 'More than 6 months';
    }
    return 'Not specified';
  };

  const getBudgetDisplay = () => {
    if (draft.budgetMin && draft.budgetMax) {
      return `SAR ${Number(draft.budgetMin).toLocaleString()} – ${Number(draft.budgetMax).toLocaleString()}`;
    }
    if (draft.budget) {
      const num = Number(draft.budget);
      return !isNaN(num) && num > 0 ? `SAR ${num.toLocaleString()}` : draft.budget;
    }
    return 'Not specified';
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
            Back to Edit
          </Button>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className="bg-amber-100 text-amber-800 text-sm px-3 py-1">
                  Review Draft
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
                  Publishing as <span className="font-medium text-gray-700">{activeCompany.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Submission Deadline</span>
              </div>
              <p className="font-semibold text-sm text-gray-900" data-testid="brief-deadline">
                {draft.deadline ? formatDate(draft.deadline) : 'Not set'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Budget</span>
              </div>
              <p className="font-semibold text-sm text-gray-900" data-testid="brief-budget">
                {getBudgetDisplay()}
              </p>
              {draft.showPriceToVendors === false && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Hidden from vendors
                </p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Project Duration</span>
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
                    Project Description
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
                    Project Objective
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
                    Key Deliverables
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
                    Milestones
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
                    Evaluation Criteria
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
                                    <p className="text-sm text-gray-500">This criterion will be used to evaluate vendor proposals.</p>
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
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Additional Requirements</p>
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Custom Criteria</p>
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
                                    <p className="text-sm text-gray-500">Custom criterion weighted at {c.weight}% of the total evaluation.</p>
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

            {draft.voiceNoteUrl && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-pink-500 to-pink-400" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5 text-pink-600" />
                    Voice Note
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
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Summary</h3>
                  <div className="space-y-4">
                    {draft.projectSize && (
                      <div className="flex items-start gap-3">
                        <BarChart className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Project Size</p>
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Budget Type</p>
                          <p className="text-sm font-medium text-gray-900">
                            {draft.budgetType === 'milestone' ? 'Milestone-Based' : 'Fixed Price'}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.pricingModel && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Pricing Model</p>
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Price Visibility</p>
                          <p className="text-sm font-medium text-gray-900">
                            {draft.showPriceToVendors ? 'Visible to vendors' : 'Hidden (size only)'}
                          </p>
                        </div>
                      </div>
                    )}

                    {draft.submissionType && (
                      <div className="flex items-start gap-3">
                        <Send className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Submission Format</p>
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
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Video Pitch</p>
                          <p className="text-sm font-medium text-gray-900">Required</p>
                        </div>
                      </div>
                    )}

                    {draft.inquiryType && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Vendor Questions</p>
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
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Required Skills</p>
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
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">AI Budget Insight</p>
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
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Contact for Inquiries</p>
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

                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <Button
                    onClick={handlePublish}
                    disabled={submitTender.isPending}
                    className="w-full bg-[#E25E45] hover:bg-[#d54d35] h-12 text-base font-semibold shadow-lg shadow-[#E25E45]/20"
                    data-testid="button-publish-tender"
                  >
                    {submitTender.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Publish RFP
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
                    Go Back & Edit
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
