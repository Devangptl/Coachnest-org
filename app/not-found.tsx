/**
 * Global 404 page — shown when Next.js can't find a route or when
 * notFound() is called from a Server Component.
 */
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import GlassCard from "@/components/GlassCard";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <GlassCard glow className="max-w-md w-full text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-6">
          <SearchX className="w-10 h-10 text-orange-400" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-white/80 mb-3">
          Page not found
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </GlassCard>
    </div>
  );
}
