"use client";

import { cn } from "@/lib/utils";

interface Props {
  isEnrolled: boolean;
  children: React.ReactNode;
  enrollBar: React.ReactNode;
}

export default function CourseLayout({ children, enrollBar }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
      {/* ── Enrollment CTA bar + Course Includes ── */}
      <div className="mb-6">
        {enrollBar}
      </div>

      {/* ── Main content tabs — full-width ── */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
