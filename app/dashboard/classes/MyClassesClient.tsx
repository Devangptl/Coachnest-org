"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import ClassesBrowser from "./ClassesBrowser";

type ClassItem = {
  id: string;
  status: string;
  progressPct: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  instructorName: string;
  courses: number;
  students: number;
};

export default function MyClassesClient() {
  const [items, setItems] = useState<ClassItem[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setItems(null);
    fetch("/api/me/classes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="glass p-12 rounded-xl text-center">
        <AlertTriangle className="w-14 h-14 text-amber-400/40 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">Couldn&apos;t load your classes</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Something went wrong while fetching your classes.
        </p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  if (!items) return <MyClassesSkeleton />;

  return <ClassesBrowser items={items} />;
}

function MyClassesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton h="h-10" className="w-full max-w-sm rounded-lg" />
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
