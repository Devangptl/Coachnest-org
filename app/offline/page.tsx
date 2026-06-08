"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import GlassCard from "@/components/GlassCard";

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <GlassCard glow className="max-w-md w-full text-center py-16">
        <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-[#d97757]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">You&apos;re offline</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          No internet connection. Previously visited pages may still be available from cache.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Go home
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
