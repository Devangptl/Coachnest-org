"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Avatar from "@/components/Avatar";
import GlassCard from "@/components/GlassCard";
import { Eye, Pencil, Trash2, BookOpen, Users, Wallet } from "lucide-react";
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

function MetaChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
      className,
    )}>
      {children}
    </span>
  );
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

      <div className="divide-y divide-border/50">
        {instructors.map((i) => (
          <div key={i.id} className="px-4 py-3.5 hover:bg-secondary/30 transition-colors">
            {/* Row 1: avatar + name/email | earned */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={i.name}
                  avatar={i.avatar}
                  seed={i.id}
                  size="w-9 h-9"
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{i.name}</p>
                  <p className="text-muted-foreground/70 text-xs truncate">{i.email}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-foreground">{money(i.totalEarned)}</p>
                <p className="text-[10px] text-muted-foreground">earned</p>
              </div>
            </div>

            {/* Row 2: stats chips | balance */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <MetaChip className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  <BookOpen className="w-2.5 h-2.5" /> {i.coursesCount} courses
                </MetaChip>
                <MetaChip className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <Users className="w-2.5 h-2.5" /> {i.studentsCount} students
                </MetaChip>
                <span className="text-[11px] text-muted-foreground/60">{formatDate(i.createdAt)}</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wallet className="w-3 h-3" />
                  <span>{money(i.balance)}</span>
                </div>
                {i.payoutRequestsCount > 0 && (
                  <p className="text-[10px] text-amber-400">
                    {i.payoutRequestsCount} payout{i.payoutRequestsCount === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: actions */}
            <div className="mt-2 flex items-center gap-1">
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
    </>
  );
}
