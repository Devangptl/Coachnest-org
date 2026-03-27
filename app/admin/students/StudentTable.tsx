"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
        <div className="col-span-4">Student</div>
        <div className="col-span-1 text-center">Courses</div>
        <div className="col-span-1 text-center">Certs</div>
        <div className="col-span-1 text-center">Reviews</div>
        <div className="col-span-2 text-center">Joined</div>
        <div className="col-span-3 text-right">Actions</div>
      </div>

      <div className="divide-y divide-white/5">
        {students.map((student) => (
          <div
            key={student.id}
            className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-secondary transition-colors"
          >
            {/* Avatar + name */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600/40 to-orange-500/40 border border-border flex items-center justify-center flex-shrink-0">
                {student.avatar ? (
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-muted-foreground text-xs font-bold">
                    {student.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
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

            {/* Joined date */}
            <div className="col-span-2 text-center">
              <span className="text-muted-foreground/70 text-xs">
                {formatDate(student.createdAt)}
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-3 flex items-center justify-end gap-1">
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
