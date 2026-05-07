import React from "react";
import { CheckCircle2 } from "lucide-react";

interface StepIndicatorProps {
  steps: Array<{ label: string }>;
  currentStep: number; // 1-indexed
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <>
      <div className="hidden md:flex items-center gap-2 text-xs">
        {steps.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <React.Fragment key={step.label}>
              {i > 0 && (
                <div
                  className={`w-8 h-px ${
                    isCompleted
                      ? "bg-[var(--state-won)]"
                      : isActive
                      ? "bg-[var(--bid-orange)]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-display font-black text-[10px] tabular-nums ${
                    isCompleted
                      ? "bg-[var(--state-won)] text-white"
                      : isActive
                      ? "bg-[var(--bid-orange)] text-white bid-dot-pulse"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    stepNum
                  )}
                </span>
                <span
                  className={
                    isActive
                      ? "font-semibold text-gray-900 dark:text-foreground"
                      : "text-gray-400 font-medium"
                  }
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="md:hidden text-sm font-semibold text-gray-900 dark:text-foreground">
        Step <span className="font-mono">{currentStep}</span> of <span className="font-mono">{steps.length}</span>
      </div>
    </>
  );
}
