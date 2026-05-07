import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Loader2 } from 'lucide-react';
import { getFieldState, getFieldStateClasses, getFieldIcon, ValidationConstraint } from '@/lib/form-validation';
import { FieldError } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: FieldError;
  isDirty?: boolean;
  showValidation?: boolean;
  constraints?: ValidationConstraint[];
}

export const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  ({ error, isDirty, showValidation = true, constraints, className, ...props }, ref) => {
    const state = getFieldState(props.value, error, isDirty || false);
    const icon = getFieldIcon(state);

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn(
            showValidation && getFieldStateClasses(state),
            icon !== 'none' && 'pr-10',
            className
          )}
          {...props}
        />
        {showValidation && icon !== 'none' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {icon === 'check' && (
              <Check className="h-5 w-5 text-success-600" data-testid="icon-valid" />
            )}
            {icon === 'x' && (
              <X className="h-5 w-5 text-error-600" data-testid="icon-invalid" />
            )}
            {icon === 'loading' && (
              <Loader2 className="h-5 w-5 text-primary-600 animate-spin" data-testid="icon-validating" />
            )}
          </div>
        )}
        {constraints && constraints.length > 0 && (
          <div className="mt-2 space-y-1">
            {constraints.map((constraint, idx) => (
              <div
                key={idx}
                className={cn(
                  'text-xs flex items-center gap-1.5 transition-colors',
                  constraint.met ? 'text-success-600' : 'text-muted-foreground'
                )}
              >
                {constraint.met ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <div className="h-3 w-3 rounded-full border border-current" />
                )}
                <span>{constraint.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: FieldError;
  isDirty?: boolean;
  showValidation?: boolean;
  maxLength?: number;
  showCounter?: boolean;
}

export const SmartTextarea = forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  ({ error, isDirty, showValidation = true, maxLength, showCounter = true, className, ...props }, ref) => {
    const state = getFieldState(props.value, error, isDirty || false);
    const currentLength = typeof props.value === 'string' ? props.value.length : 0;

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          maxLength={maxLength}
          className={cn(
            showValidation && getFieldStateClasses(state),
            className
          )}
          {...props}
        />
        {showCounter && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-card px-2 py-1 rounded">
            {currentLength}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

SmartTextarea.displayName = 'SmartTextarea';
