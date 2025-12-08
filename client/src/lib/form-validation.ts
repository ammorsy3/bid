import { FieldError, UseFormReturn } from 'react-hook-form';

export type FieldState = 'empty' | 'typing' | 'valid' | 'invalid';

export function getFieldState(
  value: any,
  error: FieldError | undefined,
  isDirty: boolean
): FieldState {
  // Empty state - no value
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'empty';
  }

  // Has error
  if (error) {
    return 'invalid';
  }

  // Valid and has been touched
  if (isDirty) {
    return 'valid';
  }

  // Typing state - has value but not validated yet
  return 'typing';
}

export function getFieldStateClasses(state: FieldState): string {
  switch (state) {
    case 'empty':
      return 'border-neutral-300';
    case 'typing':
      return 'border-primary-400 ring-1 ring-primary-200';
    case 'valid':
      return 'border-success-500 ring-1 ring-success-200';
    case 'invalid':
      return 'border-error-500 ring-1 ring-error-200';
    default:
      return '';
  }
}

export function getFieldIcon(state: FieldState): 'none' | 'check' | 'x' | 'loading' {
  switch (state) {
    case 'valid':
      return 'check';
    case 'invalid':
      return 'x';
    default:
      return 'none';
  }
}

export function calculateFormProgress<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  requiredFields: (keyof T)[]
): number {
  const values = form.getValues();
  const errors = form.formState.errors;

  let completedFields = 0;

  requiredFields.forEach((field) => {
    const value = values[field];
    const hasError = errors[field as string];

    // Count as complete if has value and no error
    const isComplete =
      value &&
      !hasError &&
      (typeof value !== 'string' || value.trim().length > 0);

    if (isComplete) {
      completedFields++;
    }
  });

  return Math.round((completedFields / requiredFields.length) * 100);
}

export function getProgressColor(progress: number): string {
  if (progress < 33) return 'bg-error-500';
  if (progress < 66) return 'bg-warning-500';
  return 'bg-success-500';
}

export interface ValidationConstraint {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: string | number | RegExp;
  message: string;
  met?: boolean;
}

export function getConstraints(
  fieldName: string,
  value: any
): ValidationConstraint[] {
  const constraints: ValidationConstraint[] = [];

  // Add common constraints based on field name
  if (fieldName.includes('email')) {
    constraints.push({
      type: 'pattern',
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Valid email format',
      met: typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    });
  }

  if (fieldName.includes('deadline')) {
    const isFutureDate = value && new Date(value) > new Date();
    constraints.push({
      type: 'custom',
      value: 'future',
      message: 'Must be a future date',
      met: isFutureDate,
    });
  }

  if (fieldName.includes('title') || fieldName.includes('description')) {
    const length = typeof value === 'string' ? value.length : 0;
    constraints.push({
      type: 'min',
      value: 3,
      message: 'At least 3 characters',
      met: length >= 3,
    });
  }

  return constraints;
}
