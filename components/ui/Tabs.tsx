"use client";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs       = TabsPrimitive.Root;
const TabsList   = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      "flex gap-1 p-1 backdrop-blur-sm bg-secondary border border-border rounded-md",
      className
    )}
    {...props}
  />
);
const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "flex-1 px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg transition-all",
      "hover:text-white/80",
      "data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600/30 data-[state=active]:to-orange-500/20",
      "data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-[#d97757]/25",
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
