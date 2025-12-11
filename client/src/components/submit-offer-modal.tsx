import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NeonButton } from "@/components/ui/neon-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SmartTextarea } from "@/components/ui/smart-input";
import { FormProgress, DraftIndicator } from "@/components/ui/form-progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { FileText, DollarSign, AlertTriangle, Clock, Sparkles, Check, X, ShieldAlert } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useAutosave, DraftStorage } from "@/lib/autosave";
import { calculateFormProgress } from "@/lib/form-validation";
import { useFormKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { UploadResult } from "@uppy/core";
import { useLocation } from "wouter";

const submitOfferSchema = z.object({
  technicalFileUrl: z.string().min(1, "Technical proposal is required"),
  financialFileUrl: z.string().min(1, "Financial proposal is required"),
  notes: z.string().optional(),
});

type SubmitOfferForm = z.infer<typeof submitOfferSchema>;

interface SubmitOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender: {
    id: string;
    title: string;
    deadline: string;
    budget?: string;
  };
  requester: {
    name: string;
    company?: string;
  };
}

const FORM_ID_PREFIX = 'submit-offer-';
const REQUIRED_FIELDS: (keyof SubmitOfferForm)[] = ['technicalFileUrl', 'financialFileUrl'];

export default function SubmitOfferModal({ isOpen, onClose, tender, requester }: SubmitOfferModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany, user } = useAuthStore();
  const [, navigate] = useLocation();
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    technical?: string;
    financial?: string;
  }>({});

  const FORM_ID = `${FORM_ID_PREFIX}${tender.id}`;
  
  // Check if user already submitted an offer for this tender
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
  
  // Check verification status - allow both verified and under_review to submit
  const verificationStatus = activeCompany?.verificationStatus || 'not_verified';
  const canSubmitOffer = verificationStatus === 'verified' || verificationStatus === 'under_review';

  const form = useForm<SubmitOfferForm>({
    resolver: zodResolver(submitOfferSchema),
    defaultValues: {
      technicalFileUrl: "",
      financialFileUrl: "",
      notes: "",
    },
  });

  const formValues = form.watch();
  const { lastSaved, isSaving, clearDraft, loadDraft } = useAutosave(
    FORM_ID,
    formValues,
    isOpen
  );

  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  // Calculate time remaining with real-time updates
  const deadlineDate = new Date(tender.deadline);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const remaining = formatDistanceToNow(deadlineDate, { addSuffix: true, locale: enUS });
      const urgent = deadlineDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000; // Less than 24 hours
      
      setTimeRemaining(remaining);
      setIsUrgent(urgent);
    };
    
    if (isOpen) {
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isOpen, deadlineDate]);

  // Check for existing draft on mount
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

  // Keyboard shortcuts
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
        title: "Success!",
        description: "Offer submitted successfully",
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
        title: "Draft loaded",
        description: "Your previous work has been restored",
      });
    }
  }

  function handleDiscardDraft() {
    clearDraft();
    setShowDraftPrompt(false);
    setHasDraft(false);
    toast({
      title: "Draft discarded",
      description: "Starting with a fresh form",
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
      
      // Set ACL metadata
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', {
        fileURL: uploadURL,
      });
      const { objectPath } = await metadataResponse.json();
      
      form.setValue('technicalFileUrl', objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, technical: result.successful![0].name }));
      
      toast({
        title: "Uploaded!",
        description: "Technical proposal uploaded successfully",
      });
    }
  };

  const handleFinancialUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      
      // Set ACL metadata
      const metadataResponse = await apiRequest('PUT', '/api/objects/metadata', {
        fileURL: uploadURL,
      });
      const { objectPath } = await metadataResponse.json();
      
      form.setValue('financialFileUrl', objectPath, { shouldValidate: true, shouldDirty: true });
      setUploadedFiles(prev => ({ ...prev, financial: result.successful![0].name }));
      
      toast({
        title: "Uploaded!",
        description: "Financial proposal uploaded successfully",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-neutral-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary-600" />
              Submit Offer
            </DialogTitle>
            <DraftIndicator 
              lastSaved={lastSaved}
              isSaving={isSaving}
              hasDraft={hasDraft}
              onLoadDraft={handleLoadDraft}
            />
          </div>
          <p className="text-neutral-600 mt-2">{tender.title} - {requester.company || requester.name}</p>
          <p className="text-sm text-neutral-600 mt-1">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-xs">Ctrl+Enter</kbd> to submit • <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-xs">Esc</kbd> to close
          </p>
        </DialogHeader>

        {showDraftPrompt && !hasExistingOffer && (
          <Alert className="bg-primary-50 border-primary-200">
            <Sparkles className="h-4 w-4 text-primary-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-primary-900">You have an unsaved draft from earlier</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleLoadDraft} className="bg-primary-600 hover:bg-primary-700">
                  Load Draft
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
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Already Submitted</h3>
            <p className="text-center text-neutral-600 mb-6">
              Your offer for this tender has already been submitted. You cannot submit multiple offers for the same tender.
            </p>
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress & Deadline */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <FormProgress 
                  progress={progress}
                  steps={[
                    { label: 'Technical proposal', completed: !!formValues.technicalFileUrl && !form.formState.errors.technicalFileUrl },
                    { label: 'Financial proposal', completed: !!formValues.financialFileUrl && !form.formState.errors.financialFileUrl },
                  ]}
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
                  <strong>Tender Budget:</strong> {tender.budget} • Price your offer competitively
                </AlertDescription>
              </Alert>
            )}

            {/* Verification Status Alert */}
            {!canSubmitOffer && (
              <Alert className="bg-error-50 border-error-200">
                <ShieldAlert className="h-4 w-4 text-error-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-error-900">Verification Required</strong>
                      <p className="text-sm text-error-800 mt-1">Complete your pre-qualification to submit offers.</p>
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
                      Complete Profile
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Under Review Notice */}
            {verificationStatus === 'under_review' && (
              <Alert className="bg-success-50 border-success-200">
                <ShieldAlert className="h-4 w-4 text-success-600" />
                <AlertDescription>
                  <div>
                    <strong className="text-success-900">Pre-Qualification Submitted</strong>
                    <p className="text-sm text-success-800 mt-1">Your pre-qualification is under review. You can submit offers now while we verify your information.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* File Uploads */}
            <FormField
              control={form.control}
              name="technicalFileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technical Proposal *</FormLabel>
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
                            <p className="text-sm text-neutral-600">Upload technical proposal</p>
                            <p className="text-xs text-neutral-500">PDF, DOC, DOCX • Max 10MB</p>
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
                  <FormLabel>Financial Proposal *</FormLabel>
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
                            <p className="text-sm text-neutral-600">Upload financial proposal</p>
                            <p className="text-xs text-neutral-500">PDF, DOC, XLS • Max 10MB</p>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <SmartTextarea 
                      rows={4}
                      maxLength={500}
                      placeholder="Any additional information, clarifications, or value propositions..." 
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
              <h4 className="font-medium text-neutral-900 mb-2">Submission Summary</h4>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>Tender:</span>
                  <span className="font-medium">{tender.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-medium">{requester.company || requester.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deadline:</span>
                  <span className={`font-medium ${isUrgent ? 'text-error-600' : 'text-warning-600'}`}>
                    {format(deadlineDate, 'MMM d, yyyy h:mm a', { locale: enUS })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-warning-50 rounded-lg border border-warning-200">
              <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0" />
              <p className="text-sm text-warning-800">
                Once submitted, you cannot modify your offer. Please review all documents carefully.
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
                Cancel
              </Button>
              <NeonButton 
                type="submit"
                size="lg"
                className="flex-1"
                disabled={submitOfferMutation.isPending || progress < 100 || !canSubmitOffer}
                data-testid="button-submit-offer"
              >
                {submitOfferMutation.isPending ? "Submitting..." : !canSubmitOffer ? "Verification Required" : "Submit Offer"}
              </NeonButton>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
