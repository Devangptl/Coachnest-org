"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  GraduationCap,
  Sun,
  Moon,
  Monitor,
  Building2,
  Plus,
} from "lucide-react";
import type { SessionPayload, OrgRoleClaim } from "@/lib/auth";
import { ORG_ADMIN_AREA_ROLES, ORG_AUTHOR_ROLES } from "@/lib/org-permissions";
import ThemeToggle from "./ThemeToggle";
import InstructorAvatar from "./InstructorAvatar";
import { useTheme, type Theme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light",  icon: Sun,     label: "Light"  },
  { value: "dark",   icon: Moon,    label: "Dark"   },
];

interface Props {
  session: SessionPayload | null;
}

/**
 * Navbar avatar — shows the user's photo, or a stable DiceBear cartoon
 * dummy avatar when no real photo exists or the image fails to load.
 */
function NavAvatar({
  name,
  avatar,
  seed,
  className,
}: {
  name: string;
  avatar?: string | null;
  seed: string;
  className?: string;
}) {
  return (
    <InstructorAvatar
      name={name}
      avatar={avatar}
      seed={seed}
      size="w-7 h-7"
      className={cn("ring-0 dark:ring-0", className)}
    />
  );
}

/** Portal home segment for each org role claim (slug → role in session.orgs). */
function orgPortalSegment(role: OrgRoleClaim): "admin" | "instructor" | "student" {
  if (ORG_ADMIN_AREA_ROLES.includes(role)) return "admin";
  if (ORG_AUTHOR_ROLES.includes(role)) return "instructor";
  return "student";
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  STUDENT: { label: "Student", color: "bg-blue-500/20 text-blue-300 border-blue-400/30" },
  INSTRUCTOR: { label: "Instructor", color: "bg-amber-500/20 text-amber-300 border-amber-400/30" },
  ADMIN: { label: "Admin", color: "bg-red-500/20 text-red-300 border-red-400/30" },
};

export default function NavbarClient({ session }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme: currentTheme, setTheme } = useTheme();
  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Scroll listener for navbar background
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const roleMeta = session ? ROLE_LABELS[session.role] : null;
  const isAdmin = session?.role === "ADMIN";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 md:px-6 lg:px-7 py-1.5">
      <div
        className={cn(
          "mx-auto flex items-center justify-between rounded-lg px-3 sm:px-5 py-1.5 transition-all duration-300 border",
          "bg-card border-border shadow-glass",
          scrolled && "shadow-lg"
        )}
      >
        {/* ── Logo ────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="Coachnest" className="hidden sm:block h-5 w-auto object-contain" />
          <img src="/icon.png" alt="Coachnest" className="block sm:hidden h-7 w-7 object-contain" />
        </Link>

        {/* ── Right side ──────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Theme toggle — desktop, only when NOT logged in */}
          {!session && (
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          )}

          {session ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-200",
                  userMenuOpen
                    ? "bg-secondary border border-border"
                    : "hover:bg-secondary border border-transparent"
                )}
              >
                <NavAvatar name={session.name} avatar={session.avatar} seed={session.userId} />
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-foreground text-xs font-medium leading-tight">
                    {session.name.split(" ")[0]}
                  </span>
                  {roleMeta && (
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {roleMeta.label}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block",
                    userMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 w-60 z-50 bg-card border border-border rounded-lg shadow-2xl shadow-black/60 overflow-hidden"
                  >
                    {/* User info header */}
                    <div className="px-3 py-2.5 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <NavAvatar name={session.name} avatar={session.avatar} seed={session.userId} />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-semibold truncate">{session.name}</p>
                          <p className="text-muted-foreground text-xs truncate">{session.email}</p>
                        </div>
                      </div>
                      {roleMeta && (
                        <div className="mt-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                              roleMeta.color
                            )}
                          >
                            {session.role === "ADMIN" && <Shield className="w-3 h-3" />}
                            {session.role === "INSTRUCTOR" && <GraduationCap className="w-3 h-3" />}
                            {session.role === "STUDENT" && <User className="w-3 h-3" />}
                            {roleMeta.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Platform admin link — org management */}
                    {isAdmin && (
                      <div className="py-1">
                        <Link
                          href="/admin/organizations"
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span className="truncate">Admin · Organizations</span>
                        </Link>
                      </div>
                    )}

                    {/* Organizations — the user's workspaces + create */}
                    <div className="border-t border-border py-1">
                      <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        Organizations
                      </p>
                      {Object.entries(session.orgs ?? {}).map(([slug, orgRole]) => (
                        <Link
                          key={slug}
                          href={`/org/${slug}/${orgPortalSegment(orgRole)}`}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Building2 className="w-4 h-4" />
                          <span className="truncate">{slug}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/60 uppercase">
                            {orgPortalSegment(orgRole)}
                          </span>
                        </Link>
                      ))}
                      <Link
                        href="/org/register"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-orange-500 hover:text-[#d97757] hover:bg-orange-500/10 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create Organization
                      </Link>
                    </div>

                    {/* Theme switcher */}
                    <div className="border-t border-border px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        Theme
                      </span>
                      <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
                        {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            onClick={() => setTheme(value)}
                            aria-label={label}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center rounded transition-all",
                              currentTheme === value
                                ? "bg-card text-[#d97757] shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border py-1.5">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/org/register"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm px-3.5 py-2 rounded-lg hover:bg-secondary transition-all"
              >
                <Building2 className="w-4 h-4" />
                For Organizations
              </Link>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground text-sm px-3.5 py-2 rounded-lg hover:bg-secondary transition-all"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {!session && (
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all ml-1"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile menu (logged-out only) ───────────────────── */}
      <AnimatePresence>
        {mobileOpen && !session && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden mx-auto mt-2 overflow-hidden"
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl shadow-black/50 p-4 space-y-1">
              <Link
                href="/org/register"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <Building2 className="w-4 h-4" />
                For Organizations
              </Link>
              <div className="border-t border-border my-2" />
              <div className="px-2 py-1">
                <ThemeToggle />
              </div>
              <div className="flex gap-2 px-2">
                <Link
                  href="/login"
                  className="flex-1 text-center text-muted-foreground text-sm py-2.5 rounded-lg border border-border hover:bg-secondary transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
