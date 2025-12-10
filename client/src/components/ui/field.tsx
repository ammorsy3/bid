"use client"

import {
  FieldError as AriaFieldError,
  FieldErrorProps as AriaFieldErrorProps,
  Group as AriaGroup,
  GroupProps as AriaGroupProps,
  Label as AriaLabel,
  LabelProps as AriaLabelProps,
  composeRenderProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"

const Label = ({ className, ...props }: AriaLabelProps) => (
  <AriaLabel
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
)

const FieldGroup = ({ className, ...props }: AriaGroupProps) => (
  <AriaGroup
    className={composeRenderProps(className, (className) =>
      cn(
        "flex h-10 items-center overflow-hidden rounded-md border border-input bg-background px-3 ring-offset-background",
        "data-[focus-within]:outline-none data-[focus-within]:ring-2 data-[focus-within]:ring-ring data-[focus-within]:ring-offset-2",
        "data-[disabled]:opacity-50",
        className
      )
    )}
    {...props}
  />
)

const FieldError = ({ className, ...props }: AriaFieldErrorProps) => (
  <AriaFieldError
    className={composeRenderProps(className, (className) =>
      cn("text-sm font-medium text-destructive", className)
    )}
    {...props}
  />
)

export { FieldError, FieldGroup, Label }
