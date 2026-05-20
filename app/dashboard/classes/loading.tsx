import { GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ClassesLoading() {
  return (
    <div className="px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            My Classes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cohort-based classes you&apos;ve joined.
          </p>
        </div>
      </div>

      <Skeleton h="h-10" className="w-full max-w-sm rounded-lg mb-6" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl animate-pulse">
            <Skeleton className="h-32 w-full rounded-lg mb-3" />
            <Skeleton h="h-5" w="w-4/5" />
            <Skeleton h="h-3" w="w-1/2" className="mt-2" />
            <div className="flex gap-3 mt-3">
              <Skeleton h="h-3" w="w-10" />
              <Skeleton h="h-3" w="w-10" />
            </div>
            <Skeleton h="h-1.5" className="w-full mt-3 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
