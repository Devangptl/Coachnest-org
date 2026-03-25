"use client";

/**
 * AdminSidebar — Client Component that owns its own nav items.
 * Icons live here (not passed from the Server) so they never cross
 * the Server→Client serialization boundary.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, PlusCircle, BarChart3, GraduationCap, Ticket, ShoppingCart, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Overview",      href: "/admin",                 icon: LayoutDashboard },
  { label: "Analytics",     href: "/admin/analytics",       icon: BarChart3 },
  { label: "All Courses",   href: "/admin/courses",         icon: BookOpen },
  { label: "New Course",    href: "/admin/courses/new",     icon: PlusCircle },
  { label: "Students",      href: "/admin/students",        icon: Users },
  { label: "Enrollments",   href: "/admin/enrollments",     icon: GraduationCap },
  { label: "Coupons",       href: "/admin/coupons",         icon: Ticket },
  { label: "Orders",        href: "/admin/orders",          icon: ShoppingCart },
  { label: "Quizzes",       href: "/admin/quizzes",         icon: HelpCircle },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-4 shadow-xl">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
          Admin Panel
        </p>

        <nav className="flex flex-col gap-1">
          {adminNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/30 to-purple-600/20 text-white border border-purple-400/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-purple-400" : "text-white/50"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
