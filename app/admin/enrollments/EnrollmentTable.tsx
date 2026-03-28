"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import EnrollmentDetailsModal from "./EnrollmentDetailsModal";
import { Eye, Mail } from "lucide-react";

export default function EnrollmentTable({ enrollments }: { enrollments: any[] }) {
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getProgressColor = (progress: number) => {
    if (progress === 100) return "bg-emerald-500";
    if (progress >= 75) return "bg-orange-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-red-500";
  };

  const getStatusBadge = (enrollment: any) => {
    if (enrollment.completedAt) {
      return <Badge variant="green">Completed</Badge>;
    }
    return <Badge variant="blue">Active</Badge>;
  };

  return (
    <>
      <div className="divide-y divide-border/50">
        {enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-secondary transition-colors"
          >
            {/* Student Info */}
            <div className="col-span-3 min-w-0">
              <p className="text-foreground text-sm font-medium truncate">
                {enrollment.user.name}
              </p>
              <p className="text-muted-foreground/70 text-xs truncate mt-0.5">
                {enrollment.user.email}
              </p>
            </div>

            {/* Course */}
            <div className="col-span-2 min-w-0">
              <p className="text-foreground text-sm truncate">
                {enrollment.course.title}
              </p>
            </div>

            {/* Enrollment Date */}
            <div className="col-span-1 text-xs text-muted-foreground">
              {formatDate(enrollment.enrolledAt)}
            </div>

            {/* Progress Bar */}
            <div className="col-span-1">
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(50)}`}
                  style={{ width: "50%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">50%</p>
            </div>

            {/* Status */}
            <div className="col-span-1">
              {getStatusBadge(enrollment)}
            </div>

            {/* Actions */}
            <div className="col-span-3 flex items-center justify-end gap-2">
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
              <Button
                size="icon"
                variant="ghost"
                title="Send Notification"
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
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
