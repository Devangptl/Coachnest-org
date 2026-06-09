"use client";

/**
 * AdminSidebar — Client Component that owns its own nav items.
 * Desktop only: persistent sidebar column. On mobile, navigation is
 * provided by the global BottomNav's "More" sheet, so this component
 * renders nothing below md.
 *
 * Nav items are filtered by the admin's sub-role (passed from the
 * server layout) using lib/admin-permissions.
 */
import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, GraduationCap,
  Ticket, ShoppingCart, HelpCircle, Award, FileText, MessageSquare, Megaphone,
  Briefcase, Wallet, RotateCcw, UserCog, UserCircle, UserCheck,
  Mail, ScrollText, ListVideo, Database, ShieldCheck, Library, Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  canAccessAdminPath,
  ADMIN_SUB_ROLE_LABELS,
  type AdminSubRole,
} from "@/lib/admin-permissions";

const adminNav = [
  { label: "Overview",      href: "/admin",                 icon: LayoutDashboard },
  { label: "Analytics",     href: "/admin/analytics",       icon: BarChart3 },
  { label: "All Courses",   href: "/admin/courses",         icon: BookOpen },
  { label: "Collaborations", href: "/admin/collaborations", icon: Users2 },
  { label: "All Books",     href: "/admin/books",           icon: Library },
  { label: "Course Lists",  href: "/admin/playlists",       icon: ListVideo },
  { label: "Instructors",   href: "/admin/instructors",     icon: UserCog },
  { label: "Approvals",    href: "/admin/instructors/approvals", icon: UserCheck },
  { label: "Students",      href: "/admin/students",        icon: Users },
  { label: "Enrollments",   href: "/admin/enrollments",     icon: GraduationCap },
  { label: "Coupons",       href: "/admin/coupons",         icon: Ticket },
  { label: "Platform Offers", href: "/admin/platform-offers", icon: Megaphone },
  { label: "Orders",        href: "/admin/orders",          icon: ShoppingCart },
  { label: "Refunds",       href: "/admin/refunds",         icon: RotateCcw },
  { label: "Payouts",       href: "/admin/payouts",         icon: Wallet },
  { label: "Quizzes",       href: "/admin/quizzes",         icon: HelpCircle },
  { label: "Blog Posts",    href: "/admin/blogs",           icon: FileText },
  { label: "Certificates",  href: "/admin/certificates",    icon: Award },
  { label: "Messages",      href: "/admin/messages",          icon: MessageSquare },
  { label: "Email Templates", href: "/admin/email-templates", icon: Mail          },
  { label: "Email Logs",    href: "/admin/email-logs",        icon: ScrollText    },
  { label: "Professions",   href: "/admin/professions",       icon: Briefcase     },
  { label: "Admin Roles",   href: "/admin/admins",            icon: ShieldCheck   },
  { label: "Migrations",    href: "/admin/migrations",        icon: Database      },
  { label: "My Profile",   href: "/admin/profile",           icon: UserCircle    },
];

export default function AdminSidebar({ subRole }: { subRole: AdminSubRole }) {
  const pathname = usePathname();
  const visibleNav = useMemo(
    () => adminNav.filter((item) => canAccessAdminPath(subRole, item.href)),
    [subRole]
  );

  return (
    <aside className="hidden md:block md:w-48 lg:w-56 flex-shrink-0 self-start sticky top-16">
      <div className="bg-card border border-border rounded-lg p-3 shadow-glass max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-2 mb-1">
          Admin Panel
        </p>
        <p className="text-[10px] text-[#d97757] font-medium uppercase tracking-wider px-2 mb-3">
          {ADMIN_SUB_ROLE_LABELS[subRole]}
        </p>
        <nav className="flex flex-col gap-1">
          {visibleNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-500/10 text-foreground border border-[#d97757]/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-[#d97757]" : "text-muted-foreground"
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

