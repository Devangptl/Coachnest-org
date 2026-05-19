"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Avatar from "@/components/Avatar";
import { User, Eye, BookOpen, Award, Star, Mail } from "lucide-react";
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

export default function StudentTable({ students }: { students: Student[] }) {
  const [notifyStudent, setNotifyStudent] = useState<Student | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
      <div className="min-w-[680px]">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
        <div className="col-span-3">Student</div>
        <div className="col-span-1 text-center">Courses</div>
        <div className="col-span-1 text-center">Certs</div>
        <div className="col-span-1 text-center">Reviews</div>
        <div className="col-span-2 text-center">XP / Level</div>
        <div className="col-span-2 text-center">Joined</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      <div className="divide-y divide-border/50">
        {students.map((student) => (
          <div
            key={student.id}
            className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-secondary transition-colors"
          >
            {/* Avatar + name */}
            <div className="col-span-3 flex items-center gap-3 min-w-0">
              <Avatar
                name={student.name}
                avatar={student.avatar}
                seed={student.id}
                size="w-9 h-9"
                className="flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium truncate">
                  {student.name}
                </p>
                <p className="text-muted-foreground/70 text-xs truncate">{student.email}</p>
              </div>
            </div>

            {/* Enrollments */}
            <div className="col-span-1 text-center">
              <Badge variant={student._count.enrollments > 0 ? "blue" : "gray"}>
                {student._count.enrollments}
              </Badge>
            </div>

            {/* Certificates */}
            <div className="col-span-1 text-center">
              <Badge variant={student._count.certificates > 0 ? "green" : "gray"}>
                {student._count.certificates}
              </Badge>
            </div>

            {/* Reviews */}
            <div className="col-span-1 text-center">
              <Badge variant={student._count.reviews > 0 ? "amber" : "gray"}>
                {student._count.reviews}
              </Badge>
            </div>

            {/* XP / Level */}
            <div className="col-span-2 text-center">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-bold text-[#d97757]">
                  {student.xp > 0 ? `${student.xp.toLocaleString()} XP` : "—"}
                </span>
                {student.xp > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Lv.{student.level} · {student.levelLabel}
                    {student.streak > 0 && ` · 🔥${student.streak}`}
                  </span>
                )}
              </div>
            </div>

            {/* Joined date */}
            <div className="col-span-2 text-center">
              <span className="text-muted-foreground/70 text-xs">
                {formatDate(student.createdAt)}
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-1">
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
      </div>
      </div>

      {/* Notification Modal */}
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
