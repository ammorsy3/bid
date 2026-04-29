import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Users } from "lucide-react";
import { CardType, FIELD_INSIGHTS, getCardDefinition } from "@/lib/form-builder-types";
import { useI18n } from "@/lib/i18n";

interface FieldInsightPanelProps {
  cardType: CardType | null;
  cursorPos?: { x: number; y: number } | null;
  onClose: () => void;
}

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 400; // approximate max height
const OFFSET = 16;

export function FieldInsightPanel({ cardType, cursorPos, onClose }: FieldInsightPanelProps) {
  const { t } = useI18n();

  const translatedInsights: Record<string, { title: string; description: string; vendorTip: string; bestPractice: string }> = {
    'project-title': { title: t('formBuilder.insightProjectTitleTitle'), description: t('formBuilder.insightProjectTitleDesc'), vendorTip: t('formBuilder.insightProjectTitleVendorTip'), bestPractice: t('formBuilder.insightProjectTitleBestPractice') },
    'supplier-response': { title: t('formBuilder.insightVendorResponseTitle'), description: t('formBuilder.insightVendorResponseDesc'), vendorTip: t('formBuilder.insightVendorResponseVendorTip'), bestPractice: t('formBuilder.insightVendorResponseBestPractice') },
    'project-dates': { title: t('formBuilder.insightTimelineTitle'), description: t('formBuilder.insightTimelineDesc'), vendorTip: t('formBuilder.insightTimelineVendorTip'), bestPractice: t('formBuilder.insightTimelineBestPractice') },
    'budget': { title: t('formBuilder.insightBudgetTitle'), description: t('formBuilder.insightBudgetDesc'), vendorTip: t('formBuilder.insightBudgetVendorTip'), bestPractice: t('formBuilder.insightBudgetBestPractice') },
    'key-deliverables': { title: t('formBuilder.insightDeliverablesTitle'), description: t('formBuilder.insightDeliverablesDesc'), vendorTip: t('formBuilder.insightDeliverablesVendorTip'), bestPractice: t('formBuilder.insightDeliverablesBestPractice') },
    'project-description': { title: t('formBuilder.insightDescriptionTitle'), description: t('formBuilder.insightDescriptionDesc'), vendorTip: t('formBuilder.insightDescriptionVendorTip'), bestPractice: t('formBuilder.insightDescriptionBestPractice') },
    'submission-deadline': { title: t('formBuilder.insightDeadlineTitle'), description: t('formBuilder.insightDeadlineDesc'), vendorTip: t('formBuilder.insightDeadlineVendorTip'), bestPractice: t('formBuilder.insightDeadlineBestPractice') },
    'evaluation-criteria': { title: t('formBuilder.insightEvalTitle'), description: t('formBuilder.insightEvalDesc'), vendorTip: t('formBuilder.insightEvalVendorTip'), bestPractice: t('formBuilder.insightEvalBestPractice') },
    'attachments': { title: t('formBuilder.insightAttachmentsTitle'), description: t('formBuilder.insightAttachmentsDesc'), vendorTip: t('formBuilder.insightAttachmentsVendorTip'), bestPractice: t('formBuilder.insightAttachmentsBestPractice') },
    'milestones': { title: t('formBuilder.insightMilestonesTitle'), description: t('formBuilder.insightMilestonesDesc'), vendorTip: t('formBuilder.insightMilestonesVendorTip'), bestPractice: t('formBuilder.insightMilestonesBestPractice') },
    'video-url': {
      title: t('formBuilder.insightVideoUrlTitle') || 'Video URL',
      description: t('formBuilder.insightVideoUrlDesc') || 'An optional link to a short video introducing the project. Helps vendors quickly grasp context, tone, and scope beyond what text can convey.',
      vendorTip: t('formBuilder.insightVideoUrlVendorTip') || 'A 2–5 minute video lets vendors see the people and environment behind the RFP, building trust and improving response quality.',
      bestPractice: t('formBuilder.insightVideoUrlBestPractice') || 'Keep videos under 5 minutes. Make sure the link is publicly accessible (no sign-in required). YouTube unlisted or Vimeo work well.',
    },
    'vendor-requirements': {
      title: t('formBuilder.insightVendorReqsTitle') || 'Vendor Requirements',
      description: t('formBuilder.insightVendorReqsDesc') || 'Qualifications vendors must prove to apply — split into mandatory (hard filter) and preferred (nice-to-have, scored as a plus).',
      vendorTip: t('formBuilder.insightVendorReqsVendorTip') || 'Clear mandatory vs preferred tags let vendors self-qualify and skip RFPs they cannot meet, improving the quality of submitted proposals.',
      bestPractice: t('formBuilder.insightVendorReqsBestPractice') || 'Keep mandatory requirements minimal and provable (CR, Zakat, GOSI). Move soft preferences to preferred so you don\'t shrink the eligible pool.',
    },
    'custom-text': { title: t('formBuilder.insightShortAnswerTitle'), description: t('formBuilder.insightShortAnswerDesc'), vendorTip: t('formBuilder.insightShortAnswerVendorTip'), bestPractice: t('formBuilder.insightShortAnswerBestPractice') },
    'custom-textarea': { title: t('formBuilder.insightLongAnswerTitle'), description: t('formBuilder.insightLongAnswerDesc'), vendorTip: t('formBuilder.insightLongAnswerVendorTip'), bestPractice: t('formBuilder.insightLongAnswerBestPractice') },
    'custom-date': { title: t('formBuilder.insightDateTitle'), description: t('formBuilder.insightDateDesc'), vendorTip: t('formBuilder.insightDateVendorTip'), bestPractice: t('formBuilder.insightDateBestPractice') },
    'custom-select': { title: t('formBuilder.insightMultipleChoiceTitle'), description: t('formBuilder.insightMultipleChoiceDesc'), vendorTip: t('formBuilder.insightMultipleChoiceVendorTip'), bestPractice: t('formBuilder.insightMultipleChoiceBestPractice') },
  };

  const insight = cardType ? (translatedInsights[cardType] || FIELD_INSIGHTS[cardType]) : null;

  // Position near cursor, flipping sides when near viewport edges
  const panelStyle = (() => {
    if (!cursorPos) return { top: 80, left: 16 };
    const { x, y } = cursorPos;
    const left = x + OFFSET + PANEL_WIDTH > window.innerWidth - 8
      ? x - PANEL_WIDTH - OFFSET
      : x + OFFSET;
    const top = y + OFFSET + PANEL_HEIGHT > window.innerHeight - 8
      ? y - PANEL_HEIGHT - OFFSET
      : y + OFFSET;
    return {
      left: Math.max(8, left),
      top: Math.max(8, top),
    };
  })();

  useEffect(() => {
    if (!insight) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [insight, onClose]);
  const definition = cardType ? getCardDefinition(cardType) : null;
  const Icon = definition?.icon;

  return (
    <AnimatePresence>
      {insight && (
        <>
          {/* Panel */}
          <motion.div
            initial={{ y: -8, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.97 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 320,
              mass: 0.7,
            }}
            style={{ top: panelStyle.top, left: panelStyle.left }}
            className="fixed z-50 w-[340px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div className="p-1.5 rounded-lg bg-[#E25E45]/10">
                    <Icon className="h-4 w-4 text-[#E25E45]" />
                  </div>
                )}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {insight.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 space-y-3">
              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.25 }}
                className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                {insight.description}
              </motion.p>

              {/* Vendor Tip */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-300">
                    {t('formBuilder.vendorPerspective')}
                  </span>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-200/80 leading-relaxed">
                  {insight.vendorTip}
                </p>
              </motion.div>

              {/* Best Practice */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.25 }}
                className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/30 p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-900 dark:text-amber-300">
                    {t('formBuilder.bestPractice')}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
                  {insight.bestPractice}
                </p>
              </motion.div>

              {/* Got it button - inline, no separator */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.25 }}
                onClick={onClose}
                className="w-full py-2 rounded-lg bg-[#E25E45] hover:bg-[#d54d35] text-white text-xs font-medium transition-colors"
              >
                {t('formBuilder.gotIt')}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
