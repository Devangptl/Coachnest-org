import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        purple:  "bg-purple-500/20  text-purple-300  border-purple-400/30",
        green:   "bg-green-500/20   text-green-300   border-green-400/30",
        amber:   "bg-amber-500/20   text-amber-300   border-amber-400/30",
        red:     "bg-red-500/20     text-red-300     border-red-400/30",
        blue:    "bg-blue-500/20    text-blue-300    border-blue-400/30",
        gray:    "bg-white/10       text-white/60    border-white/20",
        outline: "bg-transparent    text-white/70    border-white/20",
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
