import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SmartInput, SmartTextarea } from "@/components/ui/smart-input";
import { FormProgress } from "@/components/ui/form-progress";
import { TimePicker } from "@/components/ui/datetime-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FloatingPathsBackground } from "@/components/ui/floating-paths-bg";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { format, add } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, Copy, Check, Mail, ExternalLink, Sparkles, Info, ChevronDown, ChevronUp, Video, Zap } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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

// Animated Circle Component
function AnimatedCircle() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-8">
      <style>{`
        @keyframes orbitCircle {
          0% {
            transform: rotate(0deg);
            box-shadow:
              0 6px 12px 0 #FF6B4A inset,
              0 12px 18px 0 #E25E45 inset,
              0 0 3px 1.2px rgba(255, 107, 74, 0.4),
              0 0 12px 3px rgba(226, 94, 69, 0.2);
          }
          50% {
            transform: rotate(180deg);
            box-shadow:
              0 6px 12px 0 #FF8A6B inset,
              0 12px 6px 0 #E25E45 inset,
              0 0 3px 1.2px rgba(255, 107, 74, 0.4),
              0 0 12px 3px rgba(226, 94, 69, 0.2);
          }
          100% {
            transform: rotate(360deg);
            box-shadow:
              0 6px 12px 0 #FF6B4A inset,
              0 12px 18px 0 #E25E45 inset,
              0 0 3px 1.2px rgba(255, 107, 74, 0.4),
              0 0 12px 3px rgba(226, 94, 69, 0.2);
          }
        }

        .animate-orbit {
          animation: orbitCircle 4s linear infinite;
        }
      `}</style>
      <div className="absolute inset-0 rounded-full animate-orbit" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#E25E45] to-[#d54d35] flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
    </div>
  );
}

export default function CreateTender() {
  const { user, activeCompany } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [createdTender, setCreatedTender] = useState<Tender | null>(null);
  const [invitationCopied, setInvitationCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch tenders to check if user has created any
  const { data: tenders = [] } = useQuery<Tender[]>({
    queryKey: ['/api/tenders'],
    enabled: !!activeCompany,
  });

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
    showForm && !createdTender
  );

  const progress = calculateFormProgress(form, REQUIRED_FIELDS);

  useEffect(() => {
    const draft = DraftStorage.load<CreateTenderForm>(FORM_ID);
    if (draft && !createdTender && showForm) {
      setHasDraft(true);
      setShowDraftPrompt(true);
    }
  }, [showForm, createdTender]);

  useFormKeyboardShortcuts({
    onSubmit: () => {
      if (!createdTender && showForm) {
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

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      form.reset(draft.data);
      setShowDraftPrompt(false);
      toast({
        title: "Draft loaded",
        description: "Your previous work has been restored",
      });
    }
  };

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

  // Success State
  if (createdTender) {
    const invitationLink = `${window.location.origin}/invite/${createdTender.id}`;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <img src={logoPath} alt="Bid" className="h-16 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/dashboard')} />
            <Button 
              onClick={() => navigate('/dashboard')}
              className="group relative overflow-hidden"
              data-testid="button-back"
            >
              <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">Back</span>
              <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
                <ArrowLeft className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              </i>
            </Button>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardContent className="pt-12 pb-8">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tender Created!</h2>
                  <p className="text-xl font-semibold text-[#E25E45] mb-4">{createdTender.title}</p>
                  <p className="text-gray-600 dark:text-gray-400">Your tender is now live and ready for vendor invitations</p>
                </div>

                <Card className="mt-8 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Share Your Invitation Link</h4>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">Share this with vendors to invite them to submit offers:</p>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 mb-4 break-all">
                      <code className="text-xs text-blue-900 dark:text-blue-100 font-mono">{invitationLink}</code>
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
                        onClick={() => navigate(`/tenders/${createdTender.id}`)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        data-testid="button-view-tender"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1"
                    data-testid="button-back-dashboard"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (!showForm) {
    return (
      <div className="relative min-h-screen bg-white dark:bg-neutral-950 overflow-hidden flex items-center justify-center p-4">
        <FlickeringGrid 
          className="absolute inset-0"
          squareSize={4}
          gridGap={6}
          flickerChance={0.3}
          maxOpacity={0.08}
          color={`rgb(${226}, ${94}, ${69})`}
        />
        <div className="relative z-10 max-w-md">
          <div className="text-center space-y-8">
            <img src={logoPath} alt="Bid" className="h-40 mx-auto cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/dashboard')} />
            
            <AnimatedCircle />

            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Welcome, {user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Let's create your {tenders.length > 0 ? 'tender' : 'first tender'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Post a tender in just a few clicks and start receiving bids from qualified vendors.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => setShowForm(true)}
                size="lg"
                className="w-full bg-[#E25E45] hover:bg-[#d54d35] text-white font-semibold text-base py-6"
                data-testid="button-get-started-ai"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Get Started using AI
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => setShowForm(true)}
                className="w-full font-semibold text-base py-6"
                data-testid="button-without-ai"
              >
                I'll do it without AI
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-500">
              Takes about 2 minutes to complete
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form Screen
  return (
    <FloatingPathsBackground>
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <img src={logoPath} alt="Bid" className="h-16 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/dashboard')} />
          <Button 
            onClick={() => setShowForm(false)}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">Back</span>
            <i className="absolute inset-0 z-10 grid w-1/4 place-items-center bg-primary-foreground/15 transition-all duration-500 group-hover:w-full">
              <ArrowLeft className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
            </i>
          </Button>
        </div>

        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />
          
          <CardHeader className="pb-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#E25E45] to-[#d54d35] flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                Create Your Tender
              </CardTitle>
              <CardDescription>Fill in the details below to post your tender</CardDescription>
            </div>
            {lastSaved && <p className="text-xs text-green-600 dark:text-green-400 mt-2">✓ Auto-saved</p>}
          </CardHeader>

          <CardContent className="space-y-8">
            {showDraftPrompt && hasDraft && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-blue-900 dark:text-blue-100">You have an unsaved draft</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowDraftPrompt(false)}>Discard</Button>
                    <Button size="sm" onClick={handleLoadDraft} className="bg-[#E25E45] hover:bg-[#d54d35]">Load Draft</Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <FormProgress 
              progress={progress}
              steps={[
                { label: 'Title', completed: !!formValues.title && !form.formState.errors.title },
                { label: 'Description', completed: !!formValues.description && !form.formState.errors.description },
                { label: 'Deadline', completed: !!formValues.deadline && !form.formState.errors.deadline },
                { label: 'Timeline', completed: !!formValues.projectTimeline && !form.formState.errors.projectTimeline },
              ]}
            />

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Essential Fields */}
                <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E25E45] text-white text-xs font-bold">1</span>
                      The Basics
                    </h3>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel className="text-base font-semibold">What's the project about?</FormLabel>
                          <FormControl>
                            <SmartInput 
                              placeholder="E.g., Website Development for E-commerce Platform" 
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
                          <FormLabel className="text-base font-semibold">Tell us more</FormLabel>
                          <FormControl>
                            <SmartTextarea 
                              rows={5}
                              maxLength={1000}
                              placeholder="Describe your project requirements, specifications, and expectations..." 
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
                </div>

                {/* Key Details */}
                <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E25E45] text-white text-xs font-bold">2</span>
                    Key Details
                  </h3>
                  
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
                            <FormLabel className="text-sm font-semibold">When's the deadline?</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn("justify-start text-left font-normal", !dateValue && "text-muted-foreground")}
                                    data-testid="input-deadline"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateValue ? format(dateValue, "PPP HH:mm:ss") : <span>Pick a date</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={dateValue} onSelect={handleSelect} disabled={(date) => date < new Date()} initialFocus />
                                <div className="p-3 border-t border-border"><TimePicker setDate={setDate} date={dateValue} /></div>
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
                          <FormLabel className="text-sm font-semibold">Budget range</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-budget">
                                <SelectValue placeholder="Select budget" />
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
                        <FormLabel className="text-sm font-semibold">Project timeline</FormLabel>
                        <FormControl>
                          <SmartInput 
                            placeholder="E.g., 3 months, Q1 2025, or 6-8 weeks" 
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
                </div>

                {/* Advanced Options */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full justify-between text-muted-foreground hover:text-foreground px-0"
                  data-testid="button-toggle-advanced"
                >
                  <span className="flex items-center gap-2">
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="text-sm font-semibold">Add Voice Note or Video (Optional)</span>
                  </span>
                </Button>

                {showAdvanced && (
                  <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#E25E45]" />
                        Voice Note
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Record a message to explain your project (max 5 minutes)</p>
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
                            <FormLabel className="font-semibold flex items-center gap-2">
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
    </FloatingPathsBackground>
  );
}
