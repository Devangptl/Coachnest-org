"use client";

import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Avatar from "@/components/Avatar";
import { Eye, BookOpen, Award, Star, Mail, Zap } from "lucide-react";
import { useState } from "react";
import SendNotificationModal from "./SendNotificationModal";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  headline: string | null;
  createdAt: string;
  xp: number;
  level: number;
  levelLabel: string;
  streak: number;
  _count: {
    enrollments: number;
    certificates: number;
    orders: number;
    reviews: number;
  };
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

export default function StudentTable({ students }: { students: Student[] }) {
  const [notifyStudent, setNotifyStudent] = useState<Student | null>(null);

  return (
    <>
      <div className="divide-y divide-border/50">
        {students.map((student) => (
          <div key={student.id} className="px-4 py-3.5 hover:bg-secondary/30 transition-colors">
            {/* Row 1: avatar + name/email | XP */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={student.name}
                  avatar={student.avatar}
                  seed={student.id}
                  size="w-9 h-9"
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{student.name}</p>
                  <p className="text-muted-foreground/70 text-xs truncate">{student.email}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {student.xp > 0 ? (
                  <>
                    <p className="text-sm font-bold text-[#d97757]">{student.xp.toLocaleString()} XP</p>
                    <p className="text-[10px] text-muted-foreground">Lv.{student.level} · {student.levelLabel}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground/50">No XP</p>
                )}
              </div>
            </div>

            {/* Row 2: stats chips + joined date */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <MetaChip className={cn(
                "border",
                student._count.enrollments > 0
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : "bg-secondary text-muted-foreground border-border"
              )}>
                <BookOpen className="w-2.5 h-2.5" /> {student._count.enrollments}
              </MetaChip>
              <MetaChip className={cn(
                "border",
                student._count.certificates > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-secondary text-muted-foreground border-border"
              )}>
                <Award className="w-2.5 h-2.5" /> {student._count.certificates}
              </MetaChip>
              <MetaChip className={cn(
                "border",
                student._count.reviews > 0
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-secondary text-muted-foreground border-border"
              )}>
                <Star className="w-2.5 h-2.5" /> {student._count.reviews}
              </MetaChip>
              {student.streak > 0 && (
                <MetaChip className="bg-orange-500/10 text-[#d97757] border-orange-500/20">
                  🔥 {student.streak}
                </MetaChip>
              )}
              <span className="text-[11px] text-muted-foreground/60 ml-1">{formatDate(student.createdAt)}</span>
            </div>

            {/* Row 3: actions */}
            <div className="mt-2 flex items-center gap-1">
              <Link href={`/admin/students/${student.id}`}>
                <Button size="icon" variant="ghost" title="View Profile">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                title="Send Notification"
                onClick={() => setNotifyStudent(student)}
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {notifyStudent && (
        <SendNotificationModal
          studentId={notifyStudent.id}
          studentName={notifyStudent.name}
          onClose={() => setNotifyStudent(null)}
        />
      )}
    </>
  );
}
