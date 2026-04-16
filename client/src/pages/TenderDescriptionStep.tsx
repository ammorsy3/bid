import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Sparkles, Video, Loader2, Copy } from "lucide-react";
import logoPath from "@assets/Screenshot_2025-12-11_at_10.30.18_AM-removebg-preview_1765438254196.png";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import VoiceRecorder from "@/components/voice-recorder";
import { SmartInput } from "@/components/ui/smart-input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

export default function TenderDescriptionStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, isRtl } = useI18n();
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");

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
    onSuccess: (data: any) => {
      localStorage.removeItem("tenderDraft");
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      const inviteLink = `${window.location.origin}/invite/${data.invitationToken}`;
      toast({
        title: t('tenderSteps.tenderCreatedTitle'),
        description: t('tenderSteps.tenderCreatedDesc'),
        action: (
          <ToastAction altText={t('tenderSteps.copyInvitationLink')} onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ title: t('tenderSteps.linkCopiedShort') }); }}>
            <Copy className="h-3 w-3 mr-1" /> {t('tenderSteps.copyLinkShort')}
          </ToastAction>
        ),
        duration: 10000,
      });
      navigate("/dashboard?tab=tenders");
    },
    onError: (error: Error) => {
      toast({
        title: t('tenderSteps.failedToCreateTender'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (description.trim()) {
      const tenderData = {
        title: draft.title || "Untitled Tender",
        description: description.trim(),
        category: draft.skills?.[0] || "Other",
        skills: draft.skills || [],
        scope: draft.scope || undefined,
        deadline: draft.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: draft.duration || "1-3 months",
        budget: draft.budget || "",
        projectSize: draft.projectSize || undefined,
        showPriceToVendors: draft.showPriceToVendors !== false, // Default to true
        voiceNoteUrl: voiceNoteUrl || draft.voiceNoteUrl || undefined,
        videoUrl: videoUrl.trim() || undefined,
        projectTimeline: draft.duration || "1-3 months",
        submissionType: draft.submissionType || undefined,
        videoRequired: draft.videoRequired || undefined,
        inquiryType: draft.inquiryType || undefined,
        whatsappContact: draft.whatsappContact || undefined,
        emailContact: draft.emailContact || undefined,
        evaluationCriteria: draft.evaluationCriteria || undefined,
      };

      submitTender.mutate(tenderData);
    }
  };

  const handleBack = () => {
    navigate("/tenders/new/evaluation-criteria");
  };

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = countWords(description);
  const isFormValid = wordCount >= 50;
  const characterCount = description.length;
  const maxCharacters = 5000;

  return (
    <div className="py-8 px-4">
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
            disabled={submitTender.isPending}
            className="group relative overflow-hidden"
            data-testid="button-back"
          >
            <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
              {t('tenderSteps.back')}
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
          {/* Left Section - Headline and Explanation */}
          <div>
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                6 / 6
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {t('tenderSteps.descStepTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {t('tenderSteps.talentLookingFor')}
              </p>
              <ul className="text-gray-600 dark:text-gray-400 space-y-2 text-sm">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t('tenderSteps.bulletClearExpectations')}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t('tenderSteps.bulletSkillsRequired')}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t('tenderSteps.bulletGoodCommunication')}</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>{t('tenderSteps.bulletWorkDetails')}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Section - Description, Video, and Voice */}
          <div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#E25E45] to-[#FF8A6B]" />

              <div className="p-8 space-y-6">
                {/* Description Text Area */}
                <div className="space-y-3">
                  <label className="block font-medium text-gray-900 dark:text-white">
                    {t('tenderSteps.describeWhatYouNeed')}
                  </label>
                  <textarea
                    placeholder={t('tenderSteps.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={maxCharacters}
                    rows={8}
                    disabled={submitTender.isPending}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent resize-none disabled:opacity-50"
                    data-testid="input-description"
                  />
                  <div className="flex justify-between items-center text-xs">
                    <p className={wordCount < 50 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                      {wordCount < 50 ? t('tenderSteps.moreWordsNeeded', { count: 50 - wordCount }) : t('tenderSteps.minWordCountMet')}
                    </p>
                    <p className="text-gray-400">{t('tenderSteps.wordsAndChars', { words: wordCount, chars: characterCount, max: maxCharacters })}</p>
                  </div>
                </div>

                {/* Voice Note Section */}
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#E25E45]" />
                    {t('tenderSteps.voiceNoteOptional')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('tenderSteps.voiceNoteDesc')}
                  </p>
                  <VoiceRecorder
                    onRecordingComplete={(url) => setVoiceNoteUrl(url)}
                    onRecordingDeleted={() => setVoiceNoteUrl("")}
                    existingUrl={voiceNoteUrl || undefined}
                    maxDurationSeconds={300}
                  />
                </div>

                {/* Video Link Section */}
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <label className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Video className="h-4 w-4 text-[#E25E45]" />
                    {t('tenderSteps.videoLinkOptional')}
                  </label>
                  <SmartInput
                    placeholder={t('tenderSteps.videoUrlPlaceholder')}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={submitTender.isPending}
                    data-testid="input-video-url"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('tenderSteps.videoLinkHelper')}
                  </p>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={submitTender.isPending}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    {t('tenderSteps.back')}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid || submitTender.isPending}
                    className="flex-1 bg-[#E25E45] hover:bg-[#d54d35]"
                    data-testid="button-next"
                  >
                    {submitTender.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('tenderSteps.submitting')}
                      </>
                    ) : (
                      <>
                        {t('tenderSteps.submitTender')}
                        <ArrowRight className={`h-4 w-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
                      </>
                    )}
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
