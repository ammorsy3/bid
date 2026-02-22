import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Check, Loader2, Calendar, DollarSign, Clock, Users, FileText, Video, MessageSquare, Mail, Phone, Info, Eye, EyeOff, Mic, Flag, BarChart } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useMemo } from "react";
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
      evaluationCriteria: draft.evaluationCriteria && draft.evaluationCriteria.length > 0 ? draft.evaluationCriteria : undefined,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <Button
            onClick={handleBack}
            disabled={submitTender.isPending}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              Back
            </span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
              <ArrowLeft
                className="opacity-60"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            </i>
          </Button>
        </div>

        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
          
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#E25E45] to-[#d54d35] flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">RFP Brief</CardTitle>
                <CardDescription>Review your RFP details before publishing</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Project Title</h3>
              <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="brief-title">
                {draft.title || "Untitled RFP"}
              </p>
            </div>

            {(draft.description || draft.projectDescription) && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Description</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap" data-testid="brief-description">
                  {draft.description || draft.projectDescription}
                </p>
              </div>
            )}

            {draft.projectObjective && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Project Objective</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap" data-testid="brief-objective">
                  {draft.projectObjective}
                </p>
              </div>
            )}

            {draft.keyDeliverables && draft.keyDeliverables.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Key Deliverables (Bill of Quantities)</h3>
                <div className="space-y-3" data-testid="brief-deliverables">
                  {draft.keyDeliverables.map((deliverable: any, index: number) => {
                    if (typeof deliverable === 'string') {
                      return (
                        <div key={index} className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-gray-900 dark:text-white">{deliverable}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={deliverable.id || index} className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {deliverable.name}
                              </span>
                            </div>
                            {deliverable.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {deliverable.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-[#E25E45]/10 text-[#E25E45]">
                              {deliverable.quantity} × {deliverable.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(draft.startDate || draft.endDate) && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Project Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4" data-testid="brief-timeline">
                  {draft.startDate && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Start Date</p>
                      <p className="text-gray-900 dark:text-white font-medium">{formatDate(draft.startDate)}</p>
                    </div>
                  )}
                  {draft.endDate && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">End Date</p>
                      <p className="text-gray-900 dark:text-white font-medium">{formatDate(draft.endDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {draft.milestones && draft.milestones.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Milestones
                </h3>
                <div className="space-y-2" data-testid="brief-milestones">
                  {draft.milestones.map((milestone: any, index: number) => (
                    <div key={milestone.id || index} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{milestone.name}</span>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 ml-6">{milestone.description}</p>
                        )}
                      </div>
                      {milestone.dueDate && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
                          {formatDate(milestone.dueDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draft.deadline && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Submission Deadline
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-deadline">
                    {formatDate(draft.deadline)}
                  </p>
                </div>
              )}

              {draft.budget && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {draft.budgetMin && draft.budgetMax ? "Budget Range" : "Budget"}
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-budget">
                    {draft.budgetMin && draft.budgetMax
                      ? `SAR ${draft.budgetMin.toLocaleString()} - ${draft.budgetMax.toLocaleString()}`
                      : typeof draft.budget === 'number' ? `SAR ${draft.budget.toLocaleString()}` : draft.budget
                    }
                  </p>
                  {draft.showPriceToVendors !== undefined && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {draft.showPriceToVendors ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">Visible to vendors</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">Hidden from vendors (only project size shown)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {draft.duration && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-duration">
                    {DURATION_LABELS[draft.duration] || draft.duration}
                  </p>
                </div>
              )}

              {draft.projectSize && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Project Size
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-project-size">
                    {PROJECT_SIZE_LABELS[draft.projectSize] || formatLabel(draft.projectSize)}
                  </p>
                </div>
              )}

              {draft.scope && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Project Scope
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-scope">
                    {SCOPE_LABELS[draft.scope] || formatLabel(draft.scope)}
                  </p>
                </div>
              )}
            </div>

            {draft.skills && draft.skills.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2" data-testid="brief-skills">
                  {draft.skills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#E25E45]/10 text-[#E25E45]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(draft.submissionType || draft.inquiryType) && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Vendor Response</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draft.submissionType && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Submission Format</p>
                        <p className="text-gray-900 dark:text-white font-medium text-sm" data-testid="brief-submission-type">
                          {formatLabel(draft.submissionType, SUBMISSION_TYPE_LABELS)}
                        </p>
                      </div>
                    </div>
                  )}

                  {draft.inquiryType && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Vendor Questions</p>
                        <p className="text-gray-900 dark:text-white font-medium text-sm" data-testid="brief-inquiry-type">
                          {formatLabel(draft.inquiryType, INQUIRY_TYPE_LABELS)}
                        </p>
                        {draft.inquiryType === "inside_bid" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Vendors can ask questions anonymously inside the tender
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {draft.videoRequired && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Video className="h-4 w-4 text-pink-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Video pitch is <strong>required</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {(draft.emailContact || draft.whatsappContact) && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Contact Details for Inquiries</h3>
                <div className="space-y-2">
                  {draft.emailContact && (
                    <div className="flex items-center gap-2" data-testid="brief-email">
                      <Mail className="h-4 w-4 text-[#E25E45]" />
                      <span className="text-gray-900 dark:text-white">{draft.emailContact}</span>
                    </div>
                  )}
                  {draft.whatsappContact && (
                    <div className="flex items-center gap-2" data-testid="brief-whatsapp">
                      <Phone className="h-4 w-4 text-green-600" />
                      <span className="text-gray-900 dark:text-white">{draft.whatsappContact}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {draft.voiceNoteUrl && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Voice Note
                </h3>
                <audio controls className="w-full" data-testid="brief-voice-note">
                  <source src={draft.voiceNoteUrl} />
                </audio>
              </div>
            )}

            {draft.evaluationCriteria && draft.evaluationCriteria.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Evaluation Criteria</h3>
                <div className="flex flex-wrap gap-2" data-testid="brief-criteria">
                  {draft.evaluationCriteria.map((criteria: any, index: number) => {
                    if (typeof criteria === 'string') {
                      return (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {CRITERIA_LABELS[criteria] || criteria}
                        </span>
                      );
                    }
                    if (typeof criteria === 'object' && criteria.name) {
                      return (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {criteria.name}{criteria.weight ? ` (${criteria.weight}%)` : ''}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {activeCompany && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  This RFP will be published on behalf of <strong>{activeCompany.name}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={submitTender.isPending}
                className="flex-1"
                data-testid="button-back-edit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back & Edit
              </Button>
              <Button
                onClick={handlePublish}
                disabled={submitTender.isPending}
                className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                data-testid="button-publish-tender"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
