"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot     = TooltipPrimitive.Root;
const TooltipTrigger  = TooltipPrimitive.Trigger;

const TooltipContent = ({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground shadow-md",
        "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
);

interface SimpleTooltipProps {
  label:    React.ReactNode;
  children: React.ReactNode;
  side?:    "top" | "right" | "bottom" | "left";
  delay?:   number;
  asChild?: boolean;
}

/** Convenience wrapper: `<Tooltip label="…"><button>…</button></Tooltip>` */
export function Tooltip({ label, children, side = "top", delay = 150, asChild = true }: SimpleTooltipProps) {
  return (
    <TooltipProvider delayDuration={delay} skipDelayDuration={100}>
      <TooltipRoot>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };
