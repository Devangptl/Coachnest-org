"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Avatar from "@/components/Avatar";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/UIDialogProvider";

interface InstructorRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  headline: string | null;
  createdAt: string;
  balance: number;
  totalEarned: number;
  coursesCount: number;
  studentsCount: number;
  payoutRequestsCount: number;
}

function money(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function InstructorTable({
  instructors,
}: {
  instructors: InstructorRow[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const handleDelete = async (row: InstructorRow) => {
    if (
      !await confirm(
        `Delete instructor "${row.name}"? This removes their account permanently.`,
        { title: "Delete Instructor", confirmText: "Delete" }
      )
    ) {
      return;
    }
    setError(null);
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/instructors/${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete instructor.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {error && (
        <div className="mx-4 my-3 text-sm px-3 py-2 rounded-md bg-red-500/10 border border-red-400/30 text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
            <div className="col-span-3">Instructor</div>
            <div className="col-span-1 text-center">Courses</div>
            <div className="col-span-1 text-center">Students</div>
            <div className="col-span-2 text-right">Earned</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-1 text-center">Joined</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-border/50">
            {instructors.map((i) => (
              <div
                key={i.id}
                className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-secondary transition-colors"
              >
                {/* Avatar + name */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <Avatar
                    name={i.name}
                    avatar={i.avatar}
                    seed={i.id}
                    size="w-9 h-9"
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">
                      {i.name}
                    </p>
                    <p className="text-muted-foreground/70 text-xs truncate">
                      {i.email}
                    </p>
                  </div>
                </div>

                {/* Courses */}
                <div className="col-span-1 text-center">
                  <Badge variant={i.coursesCount > 0 ? "blue" : "gray"}>
                    {i.coursesCount}
                  </Badge>
                </div>

                {/* Students */}
                <div className="col-span-1 text-center">
                  <Badge variant={i.studentsCount > 0 ? "green" : "gray"}>
                    {i.studentsCount}
                  </Badge>
                </div>

                {/* Earned */}
                <div className="col-span-2 text-right text-sm font-semibold text-foreground">
                  {money(i.totalEarned)}
                </div>

                {/* Balance */}
                <div className="col-span-2 text-right text-sm text-muted-foreground">
                  {money(i.balance)}
                  {i.payoutRequestsCount > 0 && (
                    <span className="block text-[10px] text-yellow-400">
                      {i.payoutRequestsCount} payout
                      {i.payoutRequestsCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {/* Joined */}
                <div className="col-span-1 text-center">
                  <span className="text-muted-foreground/70 text-xs">
                    {formatDate(i.createdAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <Link href={`/admin/instructors/${i.id}`}>
                    <Button size="icon" variant="ghost" title="View profile">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/admin/instructors/${i.id}/edit`}>
                    <Button size="icon" variant="ghost" title="Edit profile">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Delete instructor"
                    loading={deletingId === i.id}
                    onClick={() => handleDelete(i)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
