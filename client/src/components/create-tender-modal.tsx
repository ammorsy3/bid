import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NeonButton } from "@/components/ui/neon-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SmartInput, SmartTextarea } from "@/components/ui/smart-input";
import { FormProgress, DraftIndicator } from "@/components/ui/form-progress";
import { TimePicker } from "@/components/ui/datetime-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, add } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { Copy, Check, Mail, ExternalLink, Sparkles, Info, ChevronDown, ChevronUp, Video } from "lucide-react";
import { useState, useEffect } from "react";
import VoiceRecorder from "./voice-recorder";
import { useLocation } from "wouter";
import type { Tender } from "@shared/schema";
import { useAutosave, DraftStorage } from "@/lib/autosave";
import { calculateFormProgress, getConstraints } from "@/lib/form-validation";
import { useFormKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Alert, AlertDescription } from "@/components/ui/alert";

const createTenderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  deadline: z.string().min(1, "Deadline is required").refine((val) => {
    const deadlineDate = new Date(val);
    const now = new Date();
    return deadlineDate.getTime() > now.getTime();
  }, "Must be a future date"),
  budget: z.string().optional(),
  duration: z.string().optional(),
  projectTimeline: z.string().min(3, "Project timeline is required"),
  voiceNoteUrl: z.string().optional(),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type CreateTenderForm = z.infer<typeof createTenderSchema>;

interface CreateTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FORM_ID = 'create-tender';
const REQUIRED_FIELDS: (keyof CreateTenderForm)[] = ['title', 'description', 'deadline', 'projectTimeline'];

export default function CreateTenderModal({ isOpen, onClose }: CreateTenderModalProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { language, t } = useI18n();
  const dateLocale = language === 'ar' ? arLocale : undefined;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [createdTender, setCreatedTender] = useState<Tender | null>(null);
  const [invitationCopied, setInvitationCopied] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showVerificationGate, setShowVerificationGate] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<CreateTenderForm>({
    resolver: zodResolver(createTenderSchema),
    mode: 'onChange',
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      budget: "",
      duration: "",
      projectTimeline: "",
      voiceNoteUrl: "",
      videoUrl: "",
    },
  });

  const formValues = form.watch();
  const { lastSaved, isSaving, clearDraft, loadDraft } = useAutosave(
    FORM_ID,
    formValues,
    isOpen && !createdTender
  );

  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  // Check for existing draft whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const draft = DraftStorage.load<CreateTenderForm>(FORM_ID);
      if (draft && !createdTender) {
        setHasDraft(true);
        setShowDraftPrompt(true);
      } else {
        setHasDraft(false);
        setShowDraftPrompt(false);
      }
    }
  }, [isOpen, createdTender]);

  // Keyboard shortcuts
  useFormKeyboardShortcuts({
    onSubmit: () => {
      if (!createdTender) {
        form.handleSubmit(onSubmit)();
      }
    },
    onCancel: handleClose,
    enabled: isOpen,
  });

  const createTenderMutation = useMutation({
    mutationFn: async (data: CreateTenderForm) => {
      const response = await apiRequest('POST', '/api/tenders', data);
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onSuccess: (tender: Tender) => {
      setCreatedTender(tender);
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      toast({
        title: "Success!",
        description: "Tender created successfully",
      });
    },
    onError: (error: any) => {
      if (error?.requiresVerification) {
        setShowVerificationGate(true);
      } else if (error?.requiresProfile) {
        toast({
          title: "Profile Required",
          description: "Please complete your company profile before creating tenders",
        });
        handleClose();
        navigate('/company-onboarding');
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to create tender",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: CreateTenderForm) => {
    createTenderMutation.mutate(data);
  };

  function handleClose() {
    onClose();
    form.reset();
    setCreatedTender(null);
    setInvitationCopied(false);
    setShowDraftPrompt(false);
    setHasDraft(false);
    setShowVerificationGate(false);
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

  const copyInvitationLink = async () => {
    if (!createdTender) return;
    
    const invitationLink = `${window.location.origin}/invite/${createdTender.id}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setInvitationCopied(true);
      setTimeout(() => setInvitationCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const copyInvitationMessage = async () => {
    if (!createdTender) return;
    
    const invitationLink = `${window.location.origin}/invite/${createdTender.id}`;
    const message = `You're invited to submit an offer for "${createdTender.title}"\n\nTender Details:\n- Budget: ${createdTender.budget || 'Not specified'}\n- Deadline: ${createdTender.deadline}\n- Duration: ${createdTender.duration || 'Not specified'}\n\nClick here to view details and submit your offer:\n${invitationLink}`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Invitation message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const goToTenderDetails = () => {
    if (!createdTender) return;
    handleClose();
    window.location.href = `/tenders/${createdTender.id}`;
  };

  // Show verification gate if company hasn't uploaded documents yet
  if (showVerificationGate) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{t('createTender.verificationRequired')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">{t('createTender.notVerifiedYet')}</p>
                <p className="text-sm text-amber-700">
                  Creating tenders, submitting proposals, and other key actions require a verified company. Upload your Commercial Registration (CR) certificate to get verified — it only takes a moment.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">{t('createTender.toUnlockFeatures')}</p>
              <ul className="text-sm text-neutral-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E25E45] flex-shrink-0" />
                  Commercial Registration (CR) certificate — required
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
                  VAT certificate, GOSI certificate — optional
                </li>
              </ul>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Maybe later
              </Button>
              <Button
                onClick={() => { handleClose(); navigate('/settings?tab=company'); }}
                className="flex-1 bg-[#E25E45] hover:bg-[#d04a32]"
              >
                Upload Documents
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show success state with invitation link after creation
  if (createdTender) {
    const invitationLink = `${window.location.origin}/invite/${createdTender.id}`;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-success-600 flex items-center gap-2">
              <Check className="h-6 w-6" />
              Tender Created Successfully!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-neutral-900 mb-2">{createdTender.title}</h3>
              <p className="text-neutral-600">{t('createTender.tenderLiveDesc')}</p>
            </div>
            
            <Card className="bg-primary-50 border-primary-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-5 w-5 text-primary-600" />
                  <h4 className="font-semibold text-primary-900">{t('tenderFlow.invitationLink')}</h4>
                </div>
                <p className="text-sm text-primary-800 mb-4">
                  Share this link with qualified vendors to invite them to submit offers:
                </p>
                <div className="bg-white rounded-lg p-3 mb-4">
                  <code className="text-sm text-primary-900 break-all font-mono">{invitationLink}</code>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={copyInvitationLink}
                    size="sm"
                    className="flex-1"
                    data-testid="button-copy-link"
                  >
                    {invitationCopied ? (
                      <><Check className="h-4 w-4 mr-2" />{t('tenderFlow.copied')}</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" />{t('tenderFlow.copyLink')}</>
                    )}
                  </Button>
                  <Button
                    onClick={copyInvitationMessage}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid="button-copy-message"
                  >
                    <Mail className="h-4 w-4 mr-2" />{t('tenderFlow.copyMessage')}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">{t('createTender.nextSteps')}</h4>
              <ul className="text-sm text-neutral-600 space-y-1">
                <li>• Share the invitation link with qualified vendors via email or messaging</li>
                <li>• Vendors can register and submit offers using this link</li>
                <li>• Monitor submissions from your dashboard</li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
                data-testid="button-close-modal"
              >
                Close
              </Button>
              <Button 
                onClick={goToTenderDetails}
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                data-testid="button-view-tender"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Tender Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-neutral-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary-600" />
              Create New Tender
            </DialogTitle>
            <DraftIndicator 
              lastSaved={lastSaved}
              isSaving={isSaving}
              hasDraft={hasDraft}
              onLoadDraft={handleLoadDraft}
            />
          </div>
        </DialogHeader>

        {showDraftPrompt && (
          <Alert className="bg-primary-50 border-primary-200">
            <Info className="h-4 w-4 text-primary-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-primary-900">{t('createTender.unsavedDraftFromEarlier')}</span>
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
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress Indicator */}
            <FormProgress 
              progress={progress}
              steps={[
                { label: 'Tender title', completed: !!formValues.title && !form.formState.errors.title },
                { label: 'Description', completed: !!formValues.description && !form.formState.errors.description },
                { label: 'Deadline', completed: !!formValues.deadline && !form.formState.errors.deadline },
                { label: 'Timeline', completed: !!formValues.projectTimeline && !form.formState.errors.projectTimeline },
              ]}
            />

            {/* Essential Fields */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createTender.tenderTitleLabel')}</FormLabel>
                    <FormControl>
                      <SmartInput 
                        placeholder="e.g., Website Development for E-commerce Platform" 
                        error={form.formState.errors.title}
                        isDirty={form.formState.dirtyFields.title}
                        constraints={getConstraints('title', field.value)}
                        data-testid="input-title"
                        {...field} 
                      />
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
                    <FormLabel>{t('createTender.descriptionRequired')}</FormLabel>
                    <FormControl>
                      <SmartTextarea 
                        rows={4}
                        maxLength={1000}
                        placeholder="Provide detailed requirements, specifications, and expectations..." 
                        error={form.formState.errors.description}
                        isDirty={form.formState.dirtyFields.description}
                        data-testid="input-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => {
                  const dateValue = field.value ? new Date(field.value) : undefined;
                  
                  const handleSelect = (newDay: Date | undefined) => {
                    if (!newDay) return;
                    if (!dateValue) {
                      field.onChange(newDay.toISOString());
                      form.trigger('deadline');
                      return;
                    }
                    const diff = newDay.getTime() - dateValue.getTime();
                    const diffInDays = diff / (1000 * 60 * 60 * 24);
                    const newDateFull = add(dateValue, { days: Math.ceil(diffInDays) });
                    field.onChange(newDateFull.toISOString());
                    form.trigger('deadline');
                  };

                  const setDate = (date: Date | undefined) => {
                    if (date) {
                      field.onChange(date.toISOString());
                      form.trigger('deadline');
                    } else {
                      field.onChange('');
                    }
                  };

                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('createTender.submissionDeadline')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateValue && "text-muted-foreground"
                              )}
                              data-testid="input-deadline"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateValue ? format(dateValue, "PPP HH:mm:ss", { locale: dateLocale }) : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateValue}
                            onSelect={handleSelect}
                            disabled={(date) => date < new Date()}
                            locale={dateLocale}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <TimePicker setDate={setDate} date={dateValue} />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createTender.estimatedBudget')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-budget">
                          <SelectValue placeholder="Select budget range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="$10,000 - $25,000">$10,000 - $25,000</SelectItem>
                        <SelectItem value="$25,000 - $50,000">$25,000 - $50,000</SelectItem>
                        <SelectItem value="$50,000 - $100,000">$50,000 - $100,000</SelectItem>
                        <SelectItem value="$100,000+">$100,000+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project Timeline */}
            <FormField
              control={form.control}
              name="projectTimeline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createTender.projectTimelineRequired')}</FormLabel>
                  <FormControl>
                    <SmartInput 
                      placeholder="e.g., 3 months, Q1 2025, or 6-8 weeks" 
                      error={form.formState.errors.projectTimeline}
                      isDirty={form.formState.dirtyFields.projectTimeline}
                      data-testid="input-project-timeline"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advanced Options Toggle */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between text-neutral-600 hover:text-neutral-900"
              data-testid="button-toggle-advanced"
            >
              <span className="flex items-center gap-2">
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                View Advanced Options
              </span>
              <span className="text-xs text-neutral-400">{t('createTender.optional')}</span>
            </Button>

            {/* Advanced Options Section */}
            {showAdvanced && (
              <div className="space-y-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-3">{t('createTender.voiceNoteTitle')}</h4>
                  <p className="text-sm text-neutral-600 mb-3">
                    Record a voice message to explain your project in detail (max 5 minutes)
                  </p>
                  <VoiceRecorder
                    onRecordingComplete={(url) => form.setValue('voiceNoteUrl', url)}
                    onRecordingDeleted={() => form.setValue('voiceNoteUrl', '')}
                    existingUrl={form.watch('voiceNoteUrl') || undefined}
                    maxDurationSeconds={300}
                  />
                </div>

                <div className="border-t pt-4">
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-primary-600" />
                          Video Link
                        </FormLabel>
                        <FormControl>
                          <SmartInput 
                            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." 
                            error={form.formState.errors.videoUrl}
                            isDirty={form.formState.dirtyFields.videoUrl}
                            data-testid="input-video-url"
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-xs text-neutral-500">{t('createTender.addVideoLink')}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">{t('createTender.invitationSystem')}</h4>
              <p className="text-sm text-neutral-600 mb-3">
                After creating this tender, you'll receive a unique invitation link to share with qualified vendors.
              </p>
              <div className="flex items-center space-x-2 text-xs text-neutral-500">
                <span>•</span>
                <span>{t('createTender.shareViaChannel')}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-500 mt-1">
                <span>•</span>
                <span>{t('createTender.vendorsSubmitViaLink')}</span>
              </div>
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
                disabled={createTenderMutation.isPending || progress < 100}
                data-testid="button-publish-tender"
              >
                {createTenderMutation.isPending ? "Creating..." : "Publish Tender"}
              </NeonButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
