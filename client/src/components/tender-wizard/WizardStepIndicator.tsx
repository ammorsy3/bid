import { useI18n } from "@/lib/i18n";

type WizardStep = "title" | "scope" | "budget" | "submission" | "evaluation" | "requirements";

const WIZARD_STEPS: { key: WizardStep; optional?: boolean }[] = [
  { key: "title" },
  { key: "scope" },
  { key: "budget" },
  { key: "submission" },
  { key: "evaluation", optional: true },
  { key: "requirements" },
];

// Total includes the final Brief step which renders no counter
const TOTAL = 7;

export function WizardStepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const { t } = useI18n();
  const idx = WIZARD_STEPS.findIndex((s) => s.key === currentStep);
  const step = WIZARD_STEPS[idx];
  const suffix = step?.optional ? ` ${t("tenderFlow.optional")}` : "";
  return (
    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
      {idx + 1} / {TOTAL}{suffix}
    </div>
  );
}
