"use client"

import { CalendarIcon } from "lucide-react"
import {
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  DateValue as AriaDateValue,
  Dialog as AriaDialog,
  Button as AriaButton,
  Group as AriaGroup,
  Popover as AriaPopover,
  Calendar as AriaCalendar,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  CalendarCell as AriaCalendarCell,
  Heading as AriaHeading,
  DateInput as AriaDateInput,
  DateSegment as AriaDateSegment,
  Label as AriaLabel,
  ValidationResult as AriaValidationResult,
  Text,
} from "react-aria-components"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

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
    <AriaDatePicker
      className={cn("group flex flex-col gap-2", className)}
      {...props}
    >
      {label && (
        <AriaLabel className="text-sm font-medium leading-none">
          {label}
        </AriaLabel>
      )}
      <AriaGroup className="flex h-10 items-center overflow-hidden rounded-md border border-input bg-background px-3 ring-offset-background data-[focus-within]:outline-none data-[focus-within]:ring-2 data-[focus-within]:ring-ring data-[focus-within]:ring-offset-2">
        <AriaDateInput className="flex flex-1">
          {(segment) => (
            <AriaDateSegment
              segment={segment}
              className={cn(
                "inline rounded p-0.5 caret-transparent outline-none",
                "data-[focused]:bg-accent data-[focused]:text-accent-foreground",
                "data-[placeholder]:text-muted-foreground",
                "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
              )}
            />
          )}
        </AriaDateInput>
        <AriaButton
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "ml-2 size-6"
          )}
        >
          <CalendarIcon className="size-4" />
        </AriaButton>
      </AriaGroup>
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <AriaPopover className="z-50 rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[entering]:zoom-in-95">
        <AriaDialog className="outline-none">
          <AriaCalendar className="w-fit">
            <header className="flex w-full items-center gap-1 px-1 pb-4">
              <AriaButton
                slot="previous"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                )}
              >
                <ChevronLeftIcon className="size-4" />
              </AriaButton>
              <AriaHeading className="grow text-center text-sm font-medium" />
              <AriaButton
                slot="next"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                )}
              >
                <ChevronRightIcon className="size-4" />
              </AriaButton>
            </header>
            <AriaCalendarGrid className="w-full border-collapse space-y-1">
              <AriaCalendarGridHeader>
                {(day) => (
                  <AriaCalendarHeaderCell className="w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground">
                    {day}
                  </AriaCalendarHeaderCell>
                )}
              </AriaCalendarGridHeader>
              <AriaCalendarGridBody className="[&>tr>td]:p-0">
                {(date) => (
                  <AriaCalendarCell
                    date={date}
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "relative flex size-9 items-center justify-center p-0 text-sm font-normal cursor-pointer",
                      "data-[selected]:bg-primary data-[selected]:text-primary-foreground",
                      "data-[today]:bg-accent data-[today]:text-accent-foreground",
                      "data-[outside-month]:text-muted-foreground data-[outside-month]:opacity-50",
                      "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
                      "data-[unavailable]:text-destructive data-[unavailable]:line-through",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                  />
                )}
              </AriaCalendarGridBody>
            </AriaCalendarGrid>
          </AriaCalendar>
        </AriaDialog>
      </AriaPopover>
    </AriaDatePicker>
  )
}

export { JollyDatePicker }
export type { JollyDatePickerProps }
