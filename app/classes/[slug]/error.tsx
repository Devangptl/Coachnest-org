"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ClassDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 max-w-6xl mx-auto py-6">
      <div className="glass p-12 rounded-xl text-center">
        <AlertTriangle className="w-14 h-14 text-amber-400/40 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">Couldn&apos;t load this class</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Something went wrong. Please try again.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset}>Retry</Button>
          <Link href="/classes">
            <Button variant="secondary">Browse classes</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
