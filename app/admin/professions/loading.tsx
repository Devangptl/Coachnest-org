import GlassCard from "@/components/GlassCard";

export default function Loading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-80 bg-secondary/60 rounded animate-pulse" />
      </div>
      <GlassCard>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
