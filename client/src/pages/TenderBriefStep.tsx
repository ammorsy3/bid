import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Check, Loader2, Calendar, DollarSign, Clock, Users, FileText, Video, MessageSquare, Mail, Phone, Info } from "lucide-react";
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
  video_only: "Video Only",
  document_only: "Document Only",
  both: "Video & Document",
};

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  inside_bid: "Inside Bid Platform",
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
};

const formatLabel = (value: string, labels?: Record<string, string>): string => {
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
        title: "Tender published!",
        description: "Your tender is now live. Suppliers can start submitting proposals.",
      });
      navigate("/dashboard?tab=tenders");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish tender",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    const tenderData = {
      title: draft.title || "Untitled Tender",
      description: draft.description || draft.projectDescription || draft.title || "No description provided",
      category: draft.skills?.[0] || "Other",
      skills: draft.skills || [],
      scope: draft.scope || undefined,
      deadline: draft.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: draft.duration || "1-3 months",
      budget: draft.budget || "",
      projectSize: draft.projectSize || undefined,
      showPriceToVendors: draft.showPriceToVendors !== false,
      projectTimeline: draft.duration || "1-3 months",
      submissionType: draft.submissionType || undefined,
      videoRequired: draft.videoRequired || undefined,
      inquiryType: draft.inquiryType || undefined,
      whatsappContact: draft.whatsappContact || undefined,
      emailContact: draft.emailContact || undefined,
      evaluationCriteria: draft.evaluationCriteria && draft.evaluationCriteria.length > 0 ? draft.evaluationCriteria : undefined,
    };

    submitTender.mutate(tenderData);
  };

  const handleBack = () => {
    navigate("/tenders/new/evaluation-criteria");
  };

  const formatDeadline = (deadline: string) => {
    try {
      return format(new Date(deadline), "PPP");
    } catch {
      return deadline;
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
                <CardTitle className="text-2xl font-bold">Tender Brief</CardTitle>
                <CardDescription>Review your tender details before publishing</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Project Title</h3>
              <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="brief-title">
                {draft.title || "Untitled Tender"}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draft.deadline && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Deadline
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-deadline">
                    {formatDeadline(draft.deadline)}
                  </p>
                </div>
              )}

              {draft.budget && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-budget">
                    {draft.budget}
                  </p>
                </div>
              )}

              {draft.duration && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration
                  </h3>
                  <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-duration">
                    {draft.duration}
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
                    {draft.projectSize}
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

            {draft.scope && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Project Scope</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap" data-testid="brief-scope">
                  {draft.scope}
                </p>
              </div>
            )}

            {(draft.submissionType || draft.inquiryType) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draft.submissionType && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Submission Type
                    </h3>
                    <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-submission-type">
                      {formatLabel(draft.submissionType, SUBMISSION_TYPE_LABELS)}
                    </p>
                  </div>
                )}

                {draft.inquiryType && (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Inquiry Type
                    </h3>
                    <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-inquiry-type">
                      {formatLabel(draft.inquiryType, INQUIRY_TYPE_LABELS)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {draft.videoRequired && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video Required
                </h3>
                <p className="text-gray-900 dark:text-white font-medium" data-testid="brief-video-required">
                  {formatLabel(draft.videoRequired)}
                </p>
              </div>
            )}

            {(draft.emailContact || draft.whatsappContact) && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Contact Information</h3>
                <div className="flex flex-wrap gap-4">
                  {draft.emailContact && (
                    <span className="inline-flex items-center gap-2 text-gray-900 dark:text-white" data-testid="brief-email">
                      <Mail className="h-4 w-4 text-[#E25E45]" />
                      {draft.emailContact}
                    </span>
                  )}
                  {draft.whatsappContact && (
                    <span className="inline-flex items-center gap-2 text-gray-900 dark:text-white" data-testid="brief-whatsapp">
                      <Phone className="h-4 w-4 text-green-600" />
                      {draft.whatsappContact}
                    </span>
                  )}
                </div>
              </div>
            )}

            {draft.evaluationCriteria && draft.evaluationCriteria.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Evaluation Criteria</h3>
                <div className="flex flex-wrap gap-2" data-testid="brief-criteria">
                  {draft.evaluationCriteria.map((criteriaId: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      {CRITERIA_LABELS[criteriaId] || criteriaId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeCompany && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  This tender will be published on behalf of <strong>{activeCompany.name}</strong>
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
                    Publish Tender
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
