"use client";

/**
 * AdminSidebar — Client Component that owns its own nav items.
 * Icons live here (not passed from the Server) so they never cross
 * the Server→Client serialization boundary.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, BarChart3, GraduationCap, Ticket, ShoppingCart, HelpCircle, Award, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Overview",      href: "/admin",                 icon: LayoutDashboard },
  { label: "Analytics",     href: "/admin/analytics",       icon: BarChart3 },
  { label: "All Courses",   href: "/admin/courses",         icon: BookOpen },
  { label: "Students",      href: "/admin/students",        icon: Users },
  { label: "Enrollments",   href: "/admin/enrollments",     icon: GraduationCap },
  { label: "Coupons",       href: "/admin/coupons",         icon: Ticket },
  { label: "Orders",        href: "/admin/orders",          icon: ShoppingCart },
  { label: "Quizzes",       href: "/admin/quizzes",         icon: HelpCircle },
  { label: "Blog Posts",     href: "/admin/blogs",            icon: FileText },
  { label: "Certificates",  href: "/admin/certificates",    icon: Award },
  { label: "Messages",      href: "/admin/messages",        icon: MessageSquare },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 bg-card border border-border rounded-lg p-4 shadow-glass">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-3 mb-3">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-500/10 text-foreground border border-orange-400/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-orange-400" : "text-muted-foreground"
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
