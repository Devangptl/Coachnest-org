import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        purple:  "bg-orange-500/15  text-orange-600 dark:text-orange-300  border-orange-400/25",
        green:   "bg-green-500/15   text-green-700 dark:text-green-400    border-green-400/25",
        amber:   "bg-amber-500/15   text-amber-600 dark:text-amber-300    border-amber-400/25",
        red:     "bg-red-500/15     text-red-600 dark:text-red-400        border-red-400/25",
        blue:    "bg-blue-500/15    text-blue-600 dark:text-blue-400      border-blue-400/25",
        gray:    "bg-secondary      text-muted-foreground border-border",
        outline: "bg-transparent    text-muted-foreground border-border",
      },
    },
    defaultVariants: { variant: "purple" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
