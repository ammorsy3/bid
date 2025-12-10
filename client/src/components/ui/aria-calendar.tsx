"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  Heading as AriaHeading,
  RangeCalendar as AriaRangeCalendar,
  CalendarProps,
  CalendarGridProps,
  CalendarGridHeaderProps,
  CalendarGridBodyProps,
  CalendarHeaderCellProps,
  CalendarCellProps,
  RangeCalendarProps,
  DateValue,
  composeRenderProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar<T extends DateValue>({
  className,
  ...props
}: CalendarProps<T>) {
  return (
    <AriaCalendar
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className)
      )}
      {...props}
    />
  )
}

function RangeCalendar<T extends DateValue>({
  className,
  ...props
}: RangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className)
      )}
      {...props}
    />
  )
}

function CalendarHeading({ ...props }) {
  return (
    <header className="flex w-full items-center gap-1 px-1 pb-4" {...props}>
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
  )
}

function CalendarGrid({ className, ...props }: CalendarGridProps) {
  return (
    <AriaCalendarGrid
      className={composeRenderProps(className, (className) =>
        cn("w-full border-collapse space-y-1", className)
      )}
      {...props}
    />
  )
}

function CalendarGridHeader({ ...props }: CalendarGridHeaderProps) {
  return <AriaCalendarGridHeader {...props} />
}

function CalendarHeaderCell({ className, ...props }: CalendarHeaderCellProps) {
  return (
    <AriaCalendarHeaderCell
      className={composeRenderProps(className, (className) =>
        cn(
          "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
          className
        )
      )}
      {...props}
    />
  )
}

function CalendarGridBody({ className, ...props }: CalendarGridBodyProps) {
  return (
    <AriaCalendarGridBody
      className={composeRenderProps(className, (className) =>
        cn("[&>tr>td]:p-0", className)
      )}
      {...props}
    />
  )
}

function CalendarCell({ className, ...props }: CalendarCellProps) {
  return (
    <AriaCalendarCell
      className={composeRenderProps(className, (className) =>
        cn(
          buttonVariants({ variant: "ghost" }),
          "relative flex size-9 items-center justify-center p-0 text-sm font-normal",
          "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:focus:bg-primary",
          "data-[today]:bg-accent data-[today]:text-accent-foreground",
          "data-[outside-month]:text-muted-foreground data-[outside-month]:opacity-50",
          "data-[disabled]:text-muted-foreground data-[disabled]:opacity-50",
          "data-[unavailable]:text-destructive data-[unavailable]:line-through",
          "data-[focus-visible]:ring-ring data-[focus-visible]:ring-2 data-[focus-visible]:ring-offset-2",
          className
        )
      )}
      {...props}
    />
  )
}

export {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  RangeCalendar,
}
