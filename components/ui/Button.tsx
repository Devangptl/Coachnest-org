"use client";
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:     "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50",
        secondary:   "bg-white/10 border border-white/20 text-white hover:bg-white/20",
        ghost:       "text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20",
        danger:      "bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30",
        outline:     "border border-purple-400/50 text-purple-300 hover:bg-purple-500/10",
        success:     "bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30",
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
