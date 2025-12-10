import * as React from "react"
import { getLocalTimeZone, today } from "@internationalized/date"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  CalendarCellProps as AriaCalendarCellProps,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridBodyProps as AriaCalendarGridBodyProps,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarGridHeaderProps as AriaCalendarGridHeaderProps,
  CalendarGridProps as AriaCalendarGridProps,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  CalendarHeaderCellProps as AriaCalendarHeaderCellProps,
  CalendarProps as AriaCalendarProps,
  DateValue as AriaDateValue,
  Heading as AriaHeading,
  RangeCalendar as AriaRangeCalendar,
  RangeCalendarProps as AriaRangeCalendarProps,
  RangeCalendarStateContext as AriaRangeCalendarStateContext,
  composeRenderProps,
  Text,
  useLocale,
} from "react-aria-components"

import { cn } from "@/lib/utils"

const buttonVariants = (variant: "outline" | "ghost" = "outline") => {
  const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2 focus-visible:outline-none"
  if (variant === "outline") {
    return `${base} border border-input bg-background data-[hovered]:bg-accent data-[hovered]:text-accent-foreground`
  }
  return `${base} data-[hovered]:bg-accent data-[hovered]:text-accent-foreground`
}

const Calendar = AriaCalendar

const RangeCalendar = AriaRangeCalendar

const CalendarHeading = (props: React.HTMLAttributes<HTMLElement>) => {
  let { direction } = useLocale()

  return (
    <header className="flex w-full items-center gap-1 px-1 pb-4" {...props}>
      <AriaButton
        slot="previous"
        className={cn(
          buttonVariants("outline"),
          "size-7 bg-transparent p-0 opacity-50",
          "data-[hovered]:opacity-100"
        )}
      >
        {direction === "rtl" ? (
          <ChevronRight aria-hidden className="size-4" />
        ) : (
          <ChevronLeft aria-hidden className="size-4" />
        )}
      </AriaButton>
      <AriaHeading className="grow text-center text-sm font-medium" />
      <AriaButton
        slot="next"
        className={cn(
          buttonVariants("outline"),
          "size-7 bg-transparent p-0 opacity-50",
          "data-[hovered]:opacity-100"
        )}
      >
        {direction === "rtl" ? (
          <ChevronLeft aria-hidden className="size-4" />
        ) : (
          <ChevronRight aria-hidden className="size-4" />
        )}
      </AriaButton>
    </header>
  )
}

const CalendarGrid = ({ className, ...props }: AriaCalendarGridProps) => (
  <AriaCalendarGrid
    className={cn(
      "border-separate border-spacing-x-0 border-spacing-y-1",
      className
    )}
    {...props}
  />
)

const CalendarGridHeader = ({ ...props }: AriaCalendarGridHeaderProps) => (
  <AriaCalendarGridHeader {...props} />
)

const CalendarHeaderCell = ({
  className,
  ...props
}: AriaCalendarHeaderCellProps) => (
  <AriaCalendarHeaderCell
    className={cn(
      "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
      className
    )}
    {...props}
  />
)

const CalendarGridBody = ({
  className,
  ...props
}: AriaCalendarGridBodyProps) => (
  <AriaCalendarGridBody className={cn("[&>tr>td]:p-0", className)} {...props} />
)

const CalendarCell = ({ className, ...props }: AriaCalendarCellProps) => {
  const isRange = Boolean(React.useContext(AriaRangeCalendarStateContext))
  return (
    <AriaCalendarCell
      className={composeRenderProps(className, (className, renderProps) =>
        cn(
          buttonVariants("ghost"),
          "relative flex size-9 items-center justify-center p-0 text-sm font-normal",
          renderProps.isDisabled && "text-muted-foreground opacity-50",
          renderProps.isSelected &&
            "bg-primary text-primary-foreground data-[focused]:bg-primary data-[focused]:text-primary-foreground",
          renderProps.isHovered &&
            renderProps.isSelected &&
            (renderProps.isSelectionStart ||
              renderProps.isSelectionEnd ||
              !isRange) &&
            "data-[hovered]:bg-primary data-[hovered]:text-primary-foreground",
          renderProps.isSelected &&
            isRange &&
            !renderProps.isSelectionStart &&
            !renderProps.isSelectionEnd &&
            "rounded-none bg-accent text-accent-foreground",
          renderProps.isOutsideMonth &&
            "text-muted-foreground opacity-50 data-[selected]:bg-accent/50 data-[selected]:text-muted-foreground data-[selected]:opacity-30",
          renderProps.date.compare(today(getLocalTimeZone())) === 0 &&
            !renderProps.isSelected &&
            "bg-accent text-accent-foreground",
          renderProps.isUnavailable && "cursor-default text-destructive",
          renderProps.isInvalid &&
            "bg-destructive text-destructive-foreground data-[focused]:bg-destructive data-[hovered]:bg-destructive data-[focused]:text-destructive-foreground data-[hovered]:text-destructive-foreground",
          className
        )
      )}
      {...props}
    />
  )
}

interface JollyCalendarProps<T extends AriaDateValue>
  extends AriaCalendarProps<T> {
  errorMessage?: string
}

function JollyCalendar<T extends AriaDateValue>({
  errorMessage,
  className,
  ...props
}: JollyCalendarProps<T>) {
  return (
    <Calendar
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className)
      )}
      {...props}
    >
      <CalendarHeading />
      <CalendarGrid>
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => <CalendarCell date={date} />}
        </CalendarGridBody>
      </CalendarGrid>
      {errorMessage && (
        <Text className="text-sm text-destructive" slot="errorMessage">
          {errorMessage}
        </Text>
      )}
    </Calendar>
  )
}

interface JollyRangeCalendarProps<T extends AriaDateValue>
  extends AriaRangeCalendarProps<T> {
  errorMessage?: string
}

function JollyRangeCalendar<T extends AriaDateValue>({
  errorMessage,
  className,
  ...props
}: JollyRangeCalendarProps<T>) {
  return (
    <RangeCalendar
      className={composeRenderProps(className, (className) =>
        cn("w-fit", className)
      )}
      {...props}
    >
      <CalendarHeading />
      <CalendarGrid>
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => <CalendarCell date={date} />}
        </CalendarGridBody>
      </CalendarGrid>
      {errorMessage && (
        <Text slot="errorMessage" className="text-sm text-destructive">
          {errorMessage}
        </Text>
      )}
    </RangeCalendar>
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
  JollyCalendar,
  JollyRangeCalendar,
}
export type { JollyCalendarProps, JollyRangeCalendarProps }
