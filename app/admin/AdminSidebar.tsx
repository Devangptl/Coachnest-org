"use client";

/**
 * AdminSidebar — Client Component that owns its own nav items.
 * Desktop only: full-height sticky panel with profile header and grouped
 * nav. On mobile, navigation is provided by the global BottomNav's "More"
 * sheet, so this component renders nothing below md.
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
  Mail, ScrollText, ListVideo, Database, ShieldCheck, Library, Users2, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import {
  canAccessAdminPath,
  ADMIN_SUB_ROLE_LABELS,
  type AdminSubRole,
} from "@/lib/admin-permissions";

interface SidebarUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
}

const adminNavSections = [
  {
    title: "Overview",
    items: [
      { label: "Overview",  href: "/admin",           icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "All Courses",    href: "/admin/courses",        icon: BookOpen },
      { label: "Collaborations", href: "/admin/collaborations", icon: Users2 },
      { label: "All Books",      href: "/admin/books",          icon: Library },
      { label: "Course Lists",   href: "/admin/playlists",      icon: ListVideo },
      { label: "Quizzes",        href: "/admin/quizzes",        icon: HelpCircle },
      { label: "Blog Posts",     href: "/admin/blogs",          icon: FileText },
      { label: "Certificates",   href: "/admin/certificates",   icon: Award },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Instructors", href: "/admin/instructors",           icon: UserCog },
      { label: "Approvals",   href: "/admin/instructors/approvals", icon: UserCheck },
      { label: "Students",    href: "/admin/students",              icon: Users },
      { label: "Enrollments", href: "/admin/enrollments",           icon: GraduationCap },
      { label: "Professions", href: "/admin/professions",           icon: Briefcase },
    ],
  },
  {
    title: "Commerce",
    items: [
      { label: "Coupons",         href: "/admin/coupons",         icon: Ticket },
      { label: "Platform Offers", href: "/admin/platform-offers", icon: Megaphone },
      { label: "Add-ons",         href: "/admin/add-ons",         icon: Package },
      { label: "Orders",          href: "/admin/orders",          icon: ShoppingCart },
      { label: "Refunds",         href: "/admin/refunds",         icon: RotateCcw },
      { label: "Payouts",         href: "/admin/payouts",         icon: Wallet },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Messages",        href: "/admin/messages",        icon: MessageSquare },
      { label: "Email Templates", href: "/admin/email-templates", icon: Mail },
      { label: "Email Logs",      href: "/admin/email-logs",      icon: ScrollText },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Admin Roles", href: "/admin/admins",     icon: ShieldCheck },
      { label: "Migrations",  href: "/admin/migrations", icon: Database },
      { label: "My Profile",  href: "/admin/profile",    icon: UserCircle },
    ],
  },
];

export default function AdminSidebar({
  subRole,
  user,
}: {
  subRole: AdminSubRole;
  user: SidebarUser;
}) {
  const pathname = usePathname();
  const visibleSections = useMemo(
    () =>
      adminNavSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            canAccessAdminPath(subRole, item.href)
          ),
        }))
        .filter((section) => section.items.length > 0),
    [subRole]
  );

  return (
    <aside className="hidden md:block md:w-56 lg:w-64 flex-shrink-0">
      <div className="fixed top-[4.5rem] bottom-4 md:w-56 lg:w-64 flex flex-col bg-card border border-border rounded-xl shadow-glass overflow-hidden">
        <Link
          href="/admin/profile"
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-secondary/60 transition-colors"
        >
          <Avatar
            name={user.name}
            avatar={user.avatar}
            seed={user.userId}
            size="w-9 h-9"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-[#d97757] font-medium uppercase tracking-wider truncate">
              {ADMIN_SUB_ROLE_LABELS[subRole]}
            </p>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <nav className="flex flex-col">
            {visibleSections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-orange-500/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-full bg-[#d97757]" />
                        )}
                        <Icon
                          className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive ? "text-[#d97757]" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
