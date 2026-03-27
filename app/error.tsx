/**
 * Global error boundary — catches unhandled errors in Server Components.
 * Must be a Client Component (needs the reset() callback from React).
 */
"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <GlassCard className="max-w-md w-full text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Something went wrong
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          An unexpected error occurred. Try refreshing, or go back home.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link href="/" className="btn-ghost border border-border text-sm">
            Go home
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
