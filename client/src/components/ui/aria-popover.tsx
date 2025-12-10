"use client"

import {
  Popover as AriaPopover,
  PopoverProps as AriaPopoverProps,
  composeRenderProps,
  OverlayArrow as AriaOverlayArrow,
  OverlayArrowProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"

const Popover = ({ className, offset = 8, ...props }: AriaPopoverProps) => (
  <AriaPopover
    offset={offset}
    className={composeRenderProps(className, (className) =>
      cn(
        "z-50 w-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        "data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0",
        "data-[exiting]:zoom-out-95 data-[entering]:zoom-in-95",
        "data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2",
        "data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
        className
      )
    )}
    {...props}
  />
)

const OverlayArrow = ({ className, ...props }: OverlayArrowProps) => (
  <AriaOverlayArrow
    className={composeRenderProps(className, (className) =>
      cn("group", className)
    )}
    {...props}
  >
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      className="block fill-popover stroke-border group-data-[placement=bottom]:rotate-180 group-data-[placement=left]:-rotate-90 group-data-[placement=right]:rotate-90"
    >
      <path d="M0 0 L6 6 L12 0" />
    </svg>
  </AriaOverlayArrow>
)

export { Popover, OverlayArrow }
