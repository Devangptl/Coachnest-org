"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import ClassDetailShell from "./ClassDetailShell";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "forbidden" }
  | { kind: "notfound" }
  | { kind: "ready"; cls: Parameters<typeof ClassDetailShell>[0]["cls"] };

export default function InstructorClassClient({
  id,
  initialTab,
}: {
  id: string;
  initialTab: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/classes/${id}/manage`);
      if (res.status === 401) { router.replace("/login"); return; }
      if (res.status === 403) { setState({ kind: "forbidden" }); return; }
      if (res.status === 404) { setState({ kind: "notfound" }); return; }
      if (!res.ok) { setState({ kind: "error" }); return; }
      const data = await res.json();
      setState({ kind: "ready", cls: data.class });
    } catch {
      setState({ kind: "error" });
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  if (state.kind === "loading") return <InstructorClassSkeleton />;

  if (state.kind === "forbidden" || state.kind === "notfound") {
    return (
      <Notice
        title={state.kind === "forbidden" ? "You can't manage this class" : "Class not found"}
        body={
          state.kind === "forbidden"
            ? "Only the class owner or an admin can open this dashboard."
            : "This class may have been deleted."
        }
      >
        <Link href="/instructor/classes">
          <Button variant="secondary">Back to all classes</Button>
        </Link>
      </Notice>
    );
  }

  if (state.kind === "error") {
    return (
      <Notice title="Couldn't load this class" body="Something went wrong while loading the class dashboard.">
        <Button onClick={load}>Retry</Button>
        <Link href="/instructor/classes">
          <Button variant="secondary">Back to all classes</Button>
        </Link>
      </Notice>
    );
  }

  return <ClassDetailShell cls={state.cls} initialTab={initialTab} onRefresh={load} />;
}

function Notice({
  title, body, children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass p-12 rounded-xl text-center">
      <AlertTriangle className="w-14 h-14 text-amber-400/40 mx-auto mb-3" />
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-4">{body}</p>
      <div className="flex items-center justify-center gap-2">{children}</div>
    </div>
  );
}

function InstructorClassSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="w-full h-40 rounded-xl mb-4" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Skeleton h="h-5" w="w-20" className="rounded-full" />
            <Skeleton h="h-5" w="w-20" className="rounded-full" />
          </div>
          <Skeleton h="h-8" w="w-64" />
          <Skeleton h="h-3" w="w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton h="h-9" w="w-32" className="rounded-lg" />
          <Skeleton h="h-9" w="w-24" className="rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-56 shrink-0 space-y-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} h="h-9" className="w-full rounded-lg" />
          ))}
        </aside>
        <main className="flex-1 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} h="h-24" className="rounded-lg" />
            ))}
          </div>
          <Skeleton h="h-40" className="w-full rounded-xl" />
        </main>
      </div>
    </div>
  );
}
