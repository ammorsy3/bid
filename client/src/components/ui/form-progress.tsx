import { Progress } from '@/components/ui/progress';
import { getProgressColor } from '@/lib/form-validation';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const progressStrings: Record<string, Record<string, string>> = {
  en: {
    progress: 'Progress',
    unsavedChanges: 'Unsaved changes',
    autoSaved: 'Auto-saved',
    resumeFromDraft: 'Resume from draft',
  },
  ar: {
    progress: 'التقدم',
    unsavedChanges: 'تغييرات غير محفوظة',
    autoSaved: 'تم الحفظ تلقائياً',
    resumeFromDraft: 'استئناف من المسودة',
  },
};

interface FormProgressProps {
  progress: number;
  showPercentage?: boolean;
  steps?: { label: string; completed: boolean }[];
  language?: string;
}

export function FormProgress({ progress, showPercentage = true, steps, language = 'en' }: FormProgressProps) {
  const ps = (key: string) => progressStrings[language]?.[key] || progressStrings.en[key] || key;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{ps('progress')}</span>
        {showPercentage && (
          <span className="text-sm font-semibold text-foreground">
            {progress}%
          </span>
        )}
      </div>
      <Progress value={progress} className="h-2" />
      {steps && steps.length > 0 && (
        <div className="space-y-2 mt-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                step.completed ? 'text-success-600' : 'text-muted-foreground'
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DraftIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  onLoadDraft?: () => void;
  hasDraft: boolean;
  language?: string;
}

export function DraftIndicator({ lastSaved, isSaving, onLoadDraft, hasDraft, language = 'en' }: DraftIndicatorProps) {
  const ps = (key: string) => progressStrings[language]?.[key] || progressStrings.en[key] || key;
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
        <span>{ps('unsavedChanges')}</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-success-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {ps('autoSaved')} {lastSaved.toLocaleTimeString(locale, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </div>
    );
  }

  if (hasDraft && onLoadDraft) {
    return (
      <button
        type="button"
        onClick={onLoadDraft}
        className="text-sm text-primary-600 hover:text-primary-700 underline"
      >
        {ps('resumeFromDraft')}
      </button>
    );
  }

  return null;
}
