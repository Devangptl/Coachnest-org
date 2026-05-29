"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, cn } from "@/lib/utils";
import EnrollmentDetailsModal from "./EnrollmentDetailsModal";
import { Eye, Mail, BookOpen } from "lucide-react";

export default function EnrollmentTable({ enrollments }: { enrollments: any[] }) {
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-emerald-500";
    if (progress >= 75)   return "bg-orange-500";
    if (progress >= 50)   return "bg-blue-500";
    if (progress >= 25)   return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <>
      <div className="divide-y divide-border/50">
        {enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="px-4 py-3.5 hover:bg-secondary/30 transition-colors"
          >
            {/* Row 1: student name/email | status */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{enrollment.user.name}</p>
                <p className="text-muted-foreground/70 text-xs truncate">{enrollment.user.email}</p>
              </div>
              <div className="flex-shrink-0">
                {enrollment.completedAt
                  ? <Badge variant="green">Completed</Badge>
                  : <Badge variant="blue">Active</Badge>
                }
              </div>
            </div>

            {/* Row 2: course title */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
              <p className="text-sm text-foreground/80 truncate">{enrollment.course.title}</p>
            </div>

            {/* Row 3: progress bar + date */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", getProgressColor(50))}
                    style={{ width: "50%" }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">50%</span>
              </div>
              <p className="text-[11px] text-muted-foreground/60">{formatDate(enrollment.enrolledAt)}</p>
            </div>

            {/* Row 4: actions */}
            <div className="mt-2 flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedEnrollment(enrollment);
                  setShowDetails(true);
                }}
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" title="Send Notification">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showDetails && selectedEnrollment && (
        <EnrollmentDetailsModal
          enrollment={selectedEnrollment}
          onClose={() => {
            setShowDetails(false);
            setSelectedEnrollment(null);
          }}
        />
      )}
    </>
  );
}
