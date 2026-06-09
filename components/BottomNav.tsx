"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart2,
  Users2,
  UserCircle,
  BookOpen,
  Users,
  TrendingUp,
  Shield,
  MoreHorizontal,
  X,
  Heart,
  Award,
  Bell,
  Library,
  ListChecks,
  ShoppingBag,
  PlusCircle,
  BarChart3,
  Settings,
  FileText,
  Wallet,
  RotateCcw,
  Tag,
  Mail,
  Sun,
  Moon,
  Monitor,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionPayload } from "@/lib/auth";
import { useTheme, type Theme } from "./ThemeProvider";

type Item = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

type Section = {
  title: string;
  items: Item[];
};

const STUDENT_TABS: Item[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/dashboard/progress", label: "Progress", icon: BarChart2 },
  { href: "/community", label: "Community", icon: Users2 },
];

const STUDENT_MORE: Section[] = [
  {
    title: "Learning",
    items: [
      { href: "/dashboard/library", label: "My Library", icon: Library },
      { href: "/dashboard/certificates", label: "Certificates", icon: Award },
      { href: "/dashboard/achievements", label: "Achievements", icon: Award },
      { href: "/dashboard/quizzes", label: "Quizzes", icon: ListChecks },
      { href: "/dashboard/classes", label: "Classes", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
      { href: "/dashboard/billing", label: "Billing", icon: Wallet },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
    ],
  },
];

const INSTRUCTOR_TABS: Item[] = [
  { href: "/instructor", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/instructor/courses", label: "Courses", icon: BookOpen },
  { href: "/instructor/students", label: "Students", icon: Users },
  { href: "/instructor/earnings", label: "Earnings", icon: TrendingUp },
];

const INSTRUCTOR_MORE: Section[] = [
  {
    title: "Teaching",
    items: [
      { href: "/instructor/courses/new", label: "Create Course", icon: PlusCircle },
      { href: "/instructor/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/instructor/classes", label: "Classes", icon: Users },
      { href: "/instructor/playlists", label: "Playlists", icon: Library },
      { href: "/instructor/books", label: "Books", icon: BookOpen },
    ],
  },
  {
    title: "Finance & Account",
    items: [
      { href: "/instructor/payouts", label: "Payouts", icon: Wallet },
      { href: "/instructor/refunds", label: "Refunds", icon: RotateCcw },
      { href: "/instructor/invitations", label: "Invitations", icon: Mail },
      { href: "/instructor/notifications", label: "Notifications", icon: Bell },
      { href: "/instructor/profile", label: "Profile", icon: UserCircle },
    ],
  },
];

const ADMIN_TABS: Item[] = [
  { href: "/admin", label: "Dashboard", icon: Shield, exact: true },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

const ADMIN_MORE: Section[] = [
  {
    title: "People",
    items: [
      { href: "/admin/instructors", label: "Instructors", icon: GraduationCap },
      { href: "/admin/admins", label: "Admins", icon: Shield },
      { href: "/admin/enrollments", label: "Enrollments", icon: ListChecks },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/blogs", label: "Blogs", icon: FileText },
      { href: "/admin/books", label: "Books", icon: BookOpen },
      { href: "/admin/playlists", label: "Playlists", icon: Library },
      { href: "/admin/quizzes", label: "Quizzes", icon: ListChecks },
      { href: "/admin/certificates", label: "Certificates", icon: Award },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/coupons", label: "Coupons", icon: Tag },
      { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
      { href: "/admin/payouts", label: "Payouts", icon: Wallet },
      { href: "/admin/platform-offers", label: "Platform Offers", icon: Tag },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/email-templates", label: "Email Templates", icon: Mail },
      { href: "/admin/email-logs", label: "Email Logs", icon: Mail },
      { href: "/admin/messages", label: "Messages", icon: Bell },
      { href: "/admin/profile", label: "Profile", icon: UserCircle },
      { href: "/admin/migrations", label: "Migrations", icon: Settings },
    ],
  },
];

const SHOW_PREFIXES = ["/dashboard", "/instructor", "/admin", "/community"];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

const THEME_OPTIONS: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
];

interface Props {
  session: SessionPayload | null;
}

export default function BottomNav({ session }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (moreOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [moreOpen]);

  if (!session) return null;
  if (!SHOW_PREFIXES.some((p) => matchesPrefix(pathname, p))) return null;

  const { tabs, more } =
    session.role === "ADMIN"
      ? { tabs: ADMIN_TABS, more: ADMIN_MORE }
      : session.role === "INSTRUCTOR"
        ? { tabs: INSTRUCTOR_TABS, more: INSTRUCTOR_MORE }
        : { tabs: STUDENT_TABS, more: STUDENT_MORE };

  const isItemActive = (item: Item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  const anyMoreActive = more.some((s) => s.items.some(isItemActive));

  async function handleLogout() {
    setMoreOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pt-1 pb-1.5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.375rem)" }}
      >
        <nav
          className="mx-auto flex items-stretch rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-glass overflow-hidden"
          aria-label="Primary"
        >
          {tabs.map((tab) => {
            const isActive = isItemActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0",
                  isActive
                    ? "text-[#d97757] bg-orange-500/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-[#d97757]")} />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Open more menu"
            aria-expanded={moreOpen}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0",
              anyMoreActive || moreOpen
                ? "text-[#d97757] bg-orange-500/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal
              className={cn(
                "w-5 h-5 shrink-0",
                (anyMoreActive || moreOpen) && "text-[#d97757]"
              )}
            />
            <span className="truncate">More</span>
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="more-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              role="dialog"
              aria-label="More menu"
            >
              <div className="flex items-center justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              <div className="flex items-center justify-between px-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  {session.role === "ADMIN" && (
                    <Shield className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  {session.role === "INSTRUCTOR" && (
                    <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  {session.role === "STUDENT" && (
                    <UserCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {session.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close menu"
                  className="p-2 -mr-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
                {more.map((section) => (
                  <div key={section.title}>
                    <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isItemActive(item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                              isActive
                                ? "bg-orange-500/10 text-[#d97757]"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="border-t border-border pt-3 px-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Theme
                  </span>
                  <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
                    {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        aria-label={label}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded transition-all",
                          theme === value
                            ? "bg-card text-[#d97757] shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-2 px-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
