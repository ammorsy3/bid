import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, ArrowRight, FileText, Video, FileCheck, FileVideo, MessageSquare, Mail, MessageCircle, CalendarIcon, AlertCircle } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useAuthStore } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type SubmissionType = "quote_only" | "tech_fin_proposal" | "video_only" | "tech_fin_with_video";
type InquiryType = "inside_bid" | "email_whatsapp";

export default function TenderSubmissionProcessStep() {
  const [, navigate] = useLocation();
  const { t, language } = useI18n();
  const rfpLanguage = localStorage.getItem("rfp_creation_language") || "en";
  const isRfpRtl = rfpLanguage === "ar";
  const dateLocale = language === 'ar' ? arLocale : undefined;
  const { user, checkAuth } = useAuthStore();
  const { toast } = useToast();
  const [submissionDeadline, setSubmissionDeadline] = useState<Date | undefined>(undefined);
  const [submissionType, setSubmissionType] = useState<SubmissionType | null>(null);
  const [videoRequired, setVideoRequired] = useState(false);
  const [inquiryType, setInquiryType] = useState<InquiryType | null>(null);
  const [whatsappContact, setWhatsappContact] = useState("");
  const [useAccountEmail, setUseAccountEmail] = useState(true);
  const [customEmail, setCustomEmail] = useState("");
  const [saveCustomEmail, setSaveCustomEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const draft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("tenderDraft") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (draft.submissionDeadline) {
      setSubmissionDeadline(new Date(draft.submissionDeadline));
    }
    if (draft.submissionType) {
      setSubmissionType(draft.submissionType);
    }
    if (draft.videoRequired !== undefined) {
      setVideoRequired(draft.videoRequired);
    }
    if (draft.inquiryType) {
      setInquiryType(draft.inquiryType);
    }
    if (draft.whatsappContact) {
      setWhatsappContact(draft.whatsappContact);
    }
    if (draft.useAccountEmail !== undefined) {
      setUseAccountEmail(draft.useAccountEmail);
    }
    if (draft.customEmail) {
      setCustomEmail(draft.customEmail);
    }

    if (user?.tenderInquiryEmail && !draft.customEmail) {
      setCustomEmail(user.tenderInquiryEmail);
      setSaveCustomEmail(true);
    }
  }, [draft.submissionDeadline, draft.submissionType, draft.videoRequired, draft.inquiryType, draft.whatsappContact, draft.useAccountEmail, draft.customEmail, user?.tenderInquiryEmail]);

  const handleSaveEmail = async (email: string) => {
    setIsSavingEmail(true);
    try {
      const response = await apiRequest("PATCH", "/api/user/tender-inquiry-email", {
        tenderInquiryEmail: email,
      });

      if (!response.ok) {
        throw new Error("Failed to save email");
      }

      await checkAuth();

      toast({
        title: t('tenderFlow.emailSaved'),
        description: t('tenderFlow.emailSavedDesc'),
      });
    } catch (error) {
      toast({
        title: t('tenderFlow.failedSaveEmail'),
        description: t('tenderFlow.failedSaveEmailDesc'),
        variant: "destructive",
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSaveEmailCheckbox = async (checked: boolean) => {
    setSaveCustomEmail(checked);

    if (checked && customEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(customEmail.trim())) {
        await handleSaveEmail(customEmail.trim());
      }
    }
  };

  const handleNext = () => {
    if (submissionDeadline && submissionType && inquiryType) {
      const emailToUse = useAccountEmail ? user?.email : customEmail;
      const deadlineISO = submissionDeadline.toISOString().split('T')[0];

      const updated = {
        ...draft,
        submissionDeadline: deadlineISO,
        deadline: deadlineISO,
        submissionType,
        videoRequired: submissionType === "tech_fin_with_video" ? videoRequired : undefined,
        inquiryType,
        whatsappContact: inquiryType === "email_whatsapp" ? whatsappContact : undefined,
        emailContact: inquiryType === "email_whatsapp" ? emailToUse : undefined,
        useAccountEmail,
        customEmail: !useAccountEmail ? customEmail : undefined,
      };
      localStorage.setItem("tenderDraft", JSON.stringify(updated));
      navigate("/tenders/new/evaluation-criteria");
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/ai-budget");
  };

  const submissionOptions = [
    {
      type: "quote_only" as SubmissionType,
      icon: FileText,
      title: t('tenderFlow.priceOnly'),
      description: t('tenderFlow.priceOnlyDesc'),
      color: "from-blue-500 to-blue-600",
    },
    {
      type: "tech_fin_proposal" as SubmissionType,
      icon: FileCheck,
      title: t('tenderFlow.fullProposal'),
      description: t('tenderFlow.fullProposalDesc'),
      color: "from-purple-500 to-purple-600",
    },
    {
      type: "video_only" as SubmissionType,
      icon: Video,
      title: t('tenderFlow.videoPitch'),
      description: t('tenderFlow.videoPitchDesc'),
      color: "from-pink-500 to-pink-600",
    },
    {
      type: "tech_fin_with_video" as SubmissionType,
      icon: FileVideo,
      title: t('tenderFlow.proposalVideo'),
      description: t('tenderFlow.proposalVideoDesc'),
      color: "from-orange-500 to-orange-600",
    },
  ];

  const inquiryOptions = [
    {
      type: "inside_bid" as InquiryType,
      icon: MessageSquare,
      title: t('tenderFlow.insideBid'),
      description: t('tenderFlow.insideBidDesc'),
      color: "from-green-500 to-green-600",
    },
    {
      type: "email_whatsapp" as InquiryType,
      icon: Mail,
      title: t('tenderFlow.emailWhatsapp'),
      description: t('tenderFlow.emailWhatsappDesc'),
      color: "from-blue-500 to-blue-600",
    },
  ];

  const emailToUse = useAccountEmail ? user?.email : customEmail;

  const isFormValid =
    submissionDeadline &&
    submissionType &&
    inquiryType &&
    (inquiryType === "inside_bid" ||
     (inquiryType === "email_whatsapp" &&
      whatsappContact.trim() &&
      emailToUse?.trim()));

  return (
    <div className="py-8 px-4" dir={isRfpRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <img
            src={logoPath}
            alt="Bid"
            className="h-16 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          />
          <Button
            onClick={handleBack}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              {t('tenderFlow.back')}
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

        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                4 / 5
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {t('tenderFlow.step4Title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('tenderFlow.step4Desc')}
              </p>
            </div>
          </div>

          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-[#E25E45]" />
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        {t('tenderFlow.submissionDeadline')}
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('tenderFlow.submissionDeadlineDesc')}
                      </p>
                    </div>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 border-2",
                          !submissionDeadline && "text-muted-foreground"
                        )}
                        data-testid="input-submission-deadline"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {submissionDeadline ? format(submissionDeadline, "PPP", { locale: dateLocale }) : t('tenderFlow.selectSubmissionDeadline')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={submissionDeadline}
                        onSelect={setSubmissionDeadline}
                        disabled={(date) => date < new Date()}
                        locale={dateLocale}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {submissionDeadline && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {format(submissionDeadline, "EEEE, MMMM d, yyyy", { locale: dateLocale })}, {t('tenderFlow.deadlineWarning')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    {t('tenderFlow.whatShouldSubmit')}
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {submissionOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = submissionType === option.type;

                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => {
                          setSubmissionType(option.type);
                          if (option.type !== "tech_fin_with_video") {
                            setVideoRequired(false);
                          }
                        }}
                        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all text-left ${
                          isSelected
                            ? "border-[#E25E45] bg-[#E25E45]/5"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        data-testid={`button-${option.type}`}
                      >
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            {option.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {option.description}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "border-[#E25E45] bg-[#E25E45]"
                            : "border-gray-300 dark:border-gray-600"
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {submissionType === "tech_fin_with_video" && (
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('tenderFlow.videoRequired')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {videoRequired
                              ? t('tenderFlow.vendorsMustVideo')
                              : t('tenderFlow.videoOptional')
                            }
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVideoRequired(!videoRequired)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          videoRequired ? "bg-[#E25E45]" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                        data-testid="toggle-video-required"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            videoRequired ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {submissionType && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {t('tenderFlow.howAskQuestions')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('tenderFlow.chooseInquiryMethod')}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {inquiryOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = inquiryType === option.type;

                        return (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => {
                              setInquiryType(option.type);
                            }}
                            className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all text-left ${
                              isSelected
                                ? "border-[#E25E45] bg-[#E25E45]/5"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                            data-testid={`button-inquiry-${option.type}`}
                          >
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">
                                {option.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {option.description}
                              </p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? "border-[#E25E45] bg-[#E25E45]"
                                : "border-gray-300 dark:border-gray-600"
                            }`}>
                              {isSelected && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {inquiryType === "email_whatsapp" && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-3">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t('tenderFlow.emailAddress')}
                          </label>

                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={useAccountEmail}
                                onChange={() => setUseAccountEmail(true)}
                                className="h-4 w-4 text-[#E25E45] cursor-pointer"
                                data-testid="radio-account-email"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t('tenderFlow.useAccountEmail')} <span className="font-medium">{user?.email}</span>
                              </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={!useAccountEmail}
                                onChange={() => setUseAccountEmail(false)}
                                className="h-4 w-4 text-[#E25E45] cursor-pointer"
                                data-testid="radio-custom-email"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {t('tenderFlow.useDifferentEmail')}
                              </span>
                            </label>
                          </div>

                          {!useAccountEmail && (
                            <div className="space-y-2 ml-6 animate-in fade-in slide-in-from-top-2 duration-300">
                              <input
                                type="email"
                                placeholder="custom@email.com"
                                value={customEmail}
                                onChange={(e) => setCustomEmail(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                                data-testid="input-custom-email"
                              />

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={saveCustomEmail}
                                  onChange={(e) => handleSaveEmailCheckbox(e.target.checked)}
                                  disabled={isSavingEmail}
                                  className="h-4 w-4 text-[#E25E45] rounded cursor-pointer disabled:opacity-50"
                                  data-testid="checkbox-save-email"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {isSavingEmail ? t('tenderFlow.savingEmail') : t('tenderFlow.saveEmailForFuture')}
                                </span>
                              </label>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t('tenderFlow.whatsappNumber')}
                          </label>
                          <input
                            type="text"
                            placeholder="+966 50 123 4567 or wa.me/966501234567"
                            value={whatsappContact}
                            onChange={(e) => setWhatsappContact(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent"
                            data-testid="input-whatsapp-contact"
                          />
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('tenderFlow.contactInfoDisplayed')}
                        </p>
                      </div>
                    )}

                    {inquiryType === "inside_bid" && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {t('tenderFlow.insideBidInfo')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    {t('tenderFlow.back')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!isFormValid}
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    {t('tenderFlow.next')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}