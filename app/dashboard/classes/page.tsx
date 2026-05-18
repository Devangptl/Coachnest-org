/**
 * Student: My Classes (enrolled + pending requests).
 *
 * The static header renders instantly; the class list is fetched client-side
 * from /api/me/classes behind a skeleton so the page never blocks on the DB.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth";
import MyClassesClient from "./MyClassesClient";

export default async function StudentClassesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

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
        <Link href="/classes" className="text-sm text-amber-400 hover:underline">
          Browse classes →
        </Link>
      </div>

      <MyClassesClient />
    </div>
  );
}
