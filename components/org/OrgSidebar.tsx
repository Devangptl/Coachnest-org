"use client";

/**
 * OrgSidebar — shared sidebar for the org admin/instructor/student portals.
 * Nav items are computed from the member's org role; the org name/logo header
 * links to the portal home. Mirrors AdminSidebar's visual language.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, UserCog, BarChart3, CreditCard,
  Settings, GraduationCap, Library, ShieldCheck, ScrollText, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";

export type OrgPortal = "admin" | "instructor" | "student";

interface Props {
  portal: OrgPortal;
  org: { name: string; slug: string; logo: string | null };
  user: { userId: string; name: string; email: string; avatar?: string | null };
  roleLabel: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

function navFor(portal: OrgPortal, slug: string): { title: string; items: NavItem[] }[] {
  const base = `/org/${slug}/${portal}`;
  if (portal === "admin") {
    return [
      {
        title: "Overview",
        items: [
          { label: "Dashboard", href: base, icon: LayoutDashboard },
          { label: "Reports", href: `${base}/reports`, icon: BarChart3 },
          { label: "Activity log", href: `${base}/audit`, icon: ScrollText },
        ],
      },
      {
        title: "People",
        items: [
          { label: "Members", href: `${base}/members`, icon: Users },
          { label: "Roles", href: `${base}/roles`, icon: ShieldCheck },
          { label: "Instructors", href: `${base}/instructors`, icon: UserCog },
          { label: "Students", href: `${base}/students`, icon: GraduationCap },
        ],
      },
      {
        title: "Content",
        items: [{ label: "Courses", href: `${base}/courses`, icon: BookOpen }],
      },
      {
        title: "Organization",
        items: [
          { label: "Billing", href: `${base}/billing`, icon: CreditCard },
          { label: "Settings", href: `${base}/settings`, icon: Settings },
        ],
      },
    ];
  }
  if (portal === "instructor") {
    return [
      {
        title: "Teach",
        items: [
          { label: "Dashboard", href: base, icon: LayoutDashboard },
          { label: "My Courses", href: `${base}/courses`, icon: BookOpen },
          { label: "Students", href: `${base}/students`, icon: GraduationCap },
        ],
      },
    ];
  }
  return [
    {
      title: "Learn",
      items: [
        { label: "My Learning", href: base, icon: LayoutDashboard },
        { label: "Course Catalog", href: `${base}/courses`, icon: Library },
      ],
    },
  ];
}

export default function OrgSidebar({ portal, org, user, roleLabel }: Props) {
  const pathname = usePathname();
  const sections = navFor(portal, org.slug);
  const home = `/org/${org.slug}/${portal}`;
  const allItems = sections.flatMap((s) => s.items);

  return (
    <>
      {/* Mobile — sticky horizontal nav (the global BottomNav doesn't cover /org/*) */}
      <div className="md:hidden sticky top-[4.25rem] z-30 -mx-1 px-1">
        <div className="bg-card border border-border rounded-xl shadow-glass px-3 py-2.5">
          <div className="flex items-center gap-2.5 mb-2">
            {org.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo} alt={org.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                {org.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
            <p className="ml-auto text-[10px] text-[#d97757] font-medium uppercase tracking-wider whitespace-nowrap">
              {roleLabel}
            </p>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto scrollbar-hide -mb-0.5 pb-0.5">
            {allItems.map((item) => {
              const isActive =
                item.href === home
                  ? pathname === home
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                    isActive
                      ? "bg-orange-500/10 text-[#d97757]"
                      : "text-muted-foreground hover:text-foreground bg-secondary/60",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop — full sidebar */}
      <aside className="hidden md:block md:w-56 lg:w-64 flex-shrink-0">
      <div className="fixed top-[4.5rem] bottom-4 md:w-56 lg:w-64 flex flex-col bg-card border border-border rounded-xl shadow-glass overflow-hidden">
        <Link
          href={home}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-secondary/60 transition-colors"
        >
          {org.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo} alt={org.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
            <p className="text-[11px] text-[#d97757] font-medium uppercase tracking-wider truncate">
              {roleLabel}
            </p>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <nav className="flex flex-col">
            {sections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === home
                        ? pathname === home
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
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-full bg-[#d97757]" />
                        )}
                        <Icon
                          className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive ? "text-[#d97757]" : "text-muted-foreground group-hover:text-foreground",
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

        <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
          <Avatar name={user.name} avatar={user.avatar} seed={user.userId} size="w-8 h-8" className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
