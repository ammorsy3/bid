import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SmartInput, SmartTextarea } from "@/components/ui/smart-input";
import { FormProgress, DraftIndicator } from "@/components/ui/form-progress";
import { TimePicker } from "@/components/ui/datetime-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, add } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, Copy, Check, Mail, ExternalLink, Sparkles, Info, ChevronDown, ChevronUp, Video } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { useState, useEffect } from "react";
import VoiceRecorder from "@/components/voice-recorder";
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

const FORM_ID = 'create-tender';
const REQUIRED_FIELDS: (keyof CreateTenderForm)[] = ['title', 'description', 'deadline', 'projectTimeline'];

export default function CreateTender() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [createdTender, setCreatedTender] = useState<Tender | null>(null);
  const [invitationCopied, setInvitationCopied] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
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
    !createdTender
  );

  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  useEffect(() => {
    const draft = DraftStorage.load<CreateTenderForm>(FORM_ID);
    if (draft && !createdTender) {
      setHasDraft(true);
      setShowDraftPrompt(true);
    } else {
      setHasDraft(false);
      setShowDraftPrompt(false);
    }
  }, [createdTender]);

  useFormKeyboardShortcuts({
    onSubmit: () => {
      if (!createdTender) {
        form.handleSubmit(onSubmit)();
      }
    },
    onCancel: () => navigate('/dashboard'),
    enabled: true,
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
      if (error?.requiresProfile) {
        toast({
          title: "Profile Required",
          description: "Please complete your company profile before creating tenders",
        });
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

  if (createdTender) {
    const invitationLink = `${window.location.origin}/invite/${createdTender.id}`;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
                Tender Created Successfully!
              </CardTitle>
              <CardDescription className="text-base">
                {createdTender.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <p className="text-center text-muted-foreground">
                Your tender is now live and ready for vendor invitations
              </p>
              
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Invitation Link</h4>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Share this link with qualified vendors to invite them to submit offers:
                  </p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 mb-4">
                    <code className="text-sm text-blue-900 dark:text-blue-100 break-all font-mono">{invitationLink}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={copyInvitationLink}
                      size="sm"
                      className="flex-1"
                      data-testid="button-copy-link"
                    >
                      {invitationCopied ? (
                        <><Check className="h-4 w-4 mr-2" />Copied!</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-2" />Copy Link</>
                      )}
                    </Button>
                    <Button 
                      onClick={copyInvitationMessage}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid="button-copy-message"
                    >
                      <Mail className="h-4 w-4 mr-2" />Copy Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Next Steps</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Share the invitation link with qualified vendors via email or messaging</li>
                  <li>• Vendors can register and submit offers using this link</li>
                  <li>• Monitor submissions from your dashboard</li>
                </ul>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                  data-testid="button-back-dashboard"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <Button 
                  onClick={() => navigate(`/tenders/${createdTender.id}`)}
                  className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                  data-testid="button-view-tender"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Tender Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 -ml-4">
          <img src={logoPath} alt="Bid" className="h-16" />
          <Button 
            onClick={() => navigate('/dashboard')}
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

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#E25E45] to-[#d54d35] flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Create New Tender</CardTitle>
                  <CardDescription>Fill in the details to post a new tender</CardDescription>
                </div>
              </div>
              <DraftIndicator 
                lastSaved={lastSaved}
                isSaving={isSaving}
                hasDraft={hasDraft}
                onLoadDraft={handleLoadDraft}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {showDraftPrompt && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-blue-900 dark:text-blue-100">You have an unsaved draft from earlier</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
                      Discard
                    </Button>
                    <Button size="sm" onClick={handleLoadDraft} className="bg-[#E25E45] hover:bg-[#d54d35]">
                      Load Draft
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormProgress 
                  progress={progress}
                  steps={[
                    { label: 'Tender title', completed: !!formValues.title && !form.formState.errors.title },
                    { label: 'Description', completed: !!formValues.description && !form.formState.errors.description },
                    { label: 'Deadline', completed: !!formValues.deadline && !form.formState.errors.deadline },
                    { label: 'Timeline', completed: !!formValues.projectTimeline && !form.formState.errors.projectTimeline },
                  ]}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tender Title *</FormLabel>
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
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <SmartTextarea 
                            rows={5}
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
                          <FormLabel>Submission Deadline *</FormLabel>
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
                                  {dateValue ? format(dateValue, "PPP HH:mm:ss") : <span>Pick a date</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={dateValue}
                                onSelect={handleSelect}
                                disabled={(date) => date < new Date()}
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
                        <FormLabel>Estimated Budget</FormLabel>
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

                <FormField
                  control={form.control}
                  name="projectTimeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Timeline *</FormLabel>
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

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-advanced"
                >
                  <span className="flex items-center gap-2">
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    View Advanced Options
                  </span>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </Button>

                {showAdvanced && (
                  <div className="space-y-6 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Voice Note</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Record a voice message to explain your project in detail (max 5 minutes)
                      </p>
                      <VoiceRecorder
                        onRecordingComplete={(url) => form.setValue('voiceNoteUrl', url)}
                        onRecordingDeleted={() => form.setValue('voiceNoteUrl', '')}
                        existingUrl={form.watch('voiceNoteUrl') || undefined}
                        maxDurationSeconds={300}
                      />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <FormField
                        control={form.control}
                        name="videoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-[#E25E45]" />
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    disabled={createTenderMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createTenderMutation.isPending ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create Tender
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
