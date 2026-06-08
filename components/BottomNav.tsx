"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Users2,
  UserCircle,
  BookOpen,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STUDENT_TABS = [
  { href: "/dashboard", label: "Courses",   icon: LayoutDashboard, exact: true },
  { href: "/dashboard/progress", label: "Progress", icon: BarChart2 },
  { href: "/community",  label: "Community", icon: Users2 },
  { href: "/dashboard/profile",  label: "Profile",   icon: UserCircle },
];

const INSTRUCTOR_TABS = [
  { href: "/instructor",          label: "Overview",  icon: LayoutDashboard, exact: true },
  { href: "/instructor/courses",  label: "Courses",   icon: BookOpen },
  { href: "/instructor/students", label: "Students",  icon: Users },
  { href: "/instructor/earnings", label: "Earnings",  icon: TrendingUp },
  { href: "/instructor/profile",  label: "Profile",   icon: UserCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isInstructor = pathname.startsWith("/instructor");
  const isStudent =
    pathname.startsWith("/dashboard") || pathname.startsWith("/community");

  if (!isStudent && !isInstructor) return null;

  const tabs = isInstructor ? INSTRUCTOR_TABS : STUDENT_TABS;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0",
              isActive
                ? "text-[#d97757]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              className={cn("w-5 h-5 shrink-0", isActive && "text-[#d97757]")}
            />
            <span className="truncate">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
