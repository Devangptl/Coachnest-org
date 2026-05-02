"use client";

interface Props {
  isEnrolled: boolean;
  children: React.ReactNode;
  enrollBar: React.ReactNode;
}

export default function CourseLayout({ children, enrollBar }: Props) {
  return (
    <div className="mt-6">
      {/*
        Two-column layout:
        - Mobile/tablet: sidebar card on top, content below (flex-col + DOM order)
        - Desktop (lg+): CSS grid — content left (wider), sidebar right (sticky)
      */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] lg:items-start lg:gap-8">

        {/* ── Right sidebar — first in DOM so it appears above content on mobile ── */}
        <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 mb-6 lg:mb-0">
          {enrollBar}
        </div>

        {/* ── Left main content ── */}
        <div className="lg:col-start-1 lg:row-start-1 min-w-0">
          {children}
        </div>

      </div>
    </div>
  );
}
