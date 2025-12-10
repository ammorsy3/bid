"use client"

import {
  DateField as AriaDateField,
  DateFieldProps as AriaDateFieldProps,
  DateInput as AriaDateInput,
  DateInputProps as AriaDateInputProps,
  DateSegment as AriaDateSegment,
  DateSegmentProps as AriaDateSegmentProps,
  DateValue as AriaDateValue,
  TimeField as AriaTimeField,
  TimeFieldProps as AriaTimeFieldProps,
  TimeValue as AriaTimeValue,
  ValidationResult as AriaValidationResult,
  composeRenderProps,
  Text,
} from "react-aria-components"

import { cn } from "@/lib/utils"
import { FieldError, Label } from "@/components/ui/field"
import { cva, VariantProps } from "class-variance-authority"

const dateInputVariants = cva(
  "relative inline-flex w-full items-center overflow-hidden whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-input",
        ghost: "border-0 bg-transparent px-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface DateInputProps
  extends AriaDateInputProps,
    VariantProps<typeof dateInputVariants> {}

const DateInput = ({ className, variant, ...props }: DateInputProps) => (
  <AriaDateInput
    className={composeRenderProps(className, (className) =>
      cn(dateInputVariants({ variant }), className)
    )}
    {...props}
  >
    {(segment) => <DateSegment segment={segment} />}
  </AriaDateInput>
)

const DateSegment = ({ className, ...props }: AriaDateSegmentProps) => (
  <AriaDateSegment
    className={composeRenderProps(className, (className) =>
      cn(
        "inline rounded p-0.5 caret-transparent outline outline-0 type-literal:px-0",
        "data-[focused]:bg-accent data-[focused]:text-accent-foreground",
        "data-[placeholder]:text-muted-foreground",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )
    )}
    {...props}
  />
)

interface DateFieldProps<T extends AriaDateValue>
  extends AriaDateFieldProps<T> {
  label?: string
  description?: string
  errorMessage?: string | ((validation: AriaValidationResult) => string)
}

function DateField<T extends AriaDateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DateFieldProps<T>) {
  return (
    <AriaDateField
      className={composeRenderProps(className, (className) =>
        cn("group flex flex-col gap-2", className)
      )}
      {...props}
    >
      <Label>{label}</Label>
      <DateInput>{(segment) => <DateSegment segment={segment} />}</DateInput>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </AriaDateField>
  )
}

interface TimeFieldProps<T extends AriaTimeValue>
  extends AriaTimeFieldProps<T> {
  label?: string
  description?: string
  errorMessage?: string | ((validation: AriaValidationResult) => string)
}

function TimeField<T extends AriaTimeValue>({
  label,
  description,
  errorMessage,
  ...props
}: TimeFieldProps<T>) {
  return (
    <AriaTimeField {...props}>
      <Label>{label}</Label>
      <DateInput>{(segment) => <DateSegment segment={segment} />}</DateInput>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </AriaTimeField>
  )
}

export { DateField, DateInput, DateSegment, TimeField }
export type { DateFieldProps, DateInputProps, TimeFieldProps }
