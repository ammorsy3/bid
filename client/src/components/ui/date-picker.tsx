"use client"

import { CalendarIcon } from "lucide-react"
import {
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  DateValue as AriaDateValue,
  Dialog as AriaDialog,
  DialogProps as AriaDialogProps,
  PopoverProps as AriaPopoverProps,
  ValidationResult as AriaValidationResult,
  composeRenderProps,
  Text,
  Button as AriaButton,
} from "react-aria-components"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
} from "@/components/ui/aria-calendar"
import { DateInput, DateSegment } from "@/components/ui/datefield"
import { FieldError, FieldGroup, Label } from "./field"
import { Popover } from "@/components/ui/aria-popover"

const DatePicker = AriaDatePicker

const DatePickerContent = ({
  className,
  popoverClassName,
  ...props
}: AriaDialogProps & { popoverClassName?: AriaPopoverProps["className"] }) => (
  <Popover
    className={composeRenderProps(popoverClassName, (className) =>
      cn("w-auto p-3", className)
    )}
  >
    <AriaDialog
      className={cn(
        "flex w-full flex-col space-y-4 outline-none sm:flex-row sm:space-x-4 sm:space-y-0",
        className
      )}
      {...props}
    />
  </Popover>
)

interface JollyDatePickerProps<T extends AriaDateValue>
  extends AriaDatePickerProps<T> {
  label?: string
  description?: string
  errorMessage?: string | ((validation: AriaValidationResult) => string)
}

function JollyDatePicker<T extends AriaDateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: JollyDatePickerProps<T>) {
  return (
    <DatePicker
      className={composeRenderProps(className, (className) =>
        cn("group flex flex-col gap-2", className)
      )}
      {...props}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup>
        <DateInput className="flex-1" variant="ghost">
          {(segment) => <DateSegment segment={segment} />}
        </DateInput>
        <AriaButton
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "mr-1 size-6 data-[focus-visible]:ring-offset-0"
          )}
        >
          <CalendarIcon aria-hidden className="size-4" />
        </AriaButton>
      </FieldGroup>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
      <DatePickerContent>
        <Calendar>
          <CalendarHeading />
          <CalendarGrid>
            <CalendarGridHeader>
              {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
            </CalendarGridHeader>
            <CalendarGridBody>
              {(date) => <CalendarCell date={date} />}
            </CalendarGridBody>
          </CalendarGrid>
        </Calendar>
      </DatePickerContent>
    </DatePicker>
  )
}

export { DatePicker, DatePickerContent, JollyDatePicker }
export type { JollyDatePickerProps }
