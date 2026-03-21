"use client";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs       = TabsPrimitive.Root;
const TabsList   = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      "flex gap-1 p-1 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl",
      className
    )}
    {...props}
  />
);
const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "flex-1 px-4 py-2 text-sm font-medium text-white/50 rounded-lg transition-all",
      "hover:text-white/80",
      "data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/30 data-[state=active]:to-purple-600/20",
      "data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-purple-400/30",
      className
    )}
    {...props}
  />
);
const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    className={cn("mt-4 focus-visible:outline-none animate-fade-in", className)}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
