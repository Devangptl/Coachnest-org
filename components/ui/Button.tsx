"use client";
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:     "btn-primary",
        secondary:   "bg-secondary border border-border text-foreground hover:bg-secondary/70",
        ghost:       "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border",
        danger:      "bg-red-500/15 border border-red-400/25 text-red-400 hover:bg-red-500/25",
        outline:     "border border-[#d97757]/40 text-[#d97757] hover:bg-orange-500/10",
        success:     "bg-emerald-500/15 border border-emerald-400/25 text-emerald-400 hover:bg-emerald-500/25",
      },
      size: {
        sm:   "h-8  px-3 text-xs",
        md:   "h-10 px-5",
        lg:   "h-12 px-8 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
