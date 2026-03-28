"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Shield,
  ChevronDown,
  BarChart3,
  Users,
  PlusCircle,
  Heart,
  Award,
  Settings,
  FileText,
  GraduationCap,
  Sun,
  Moon,
} from "lucide-react";
import type { SessionPayload } from "@/lib/auth";
import NotificationBell from "./NotificationBell";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface Props {
  session: SessionPayload | null;
}

// Role-based dropdown menu items
const DROPDOWN_LINKS = {
  STUDENT: [
    { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
    { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  ],
  INSTRUCTOR: [
    { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
    { href: "/admin", label: "Manage Courses", icon: Settings },
    { href: "/admin/courses/new", label: "Create Course", icon: PlusCircle },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ],
  ADMIN: [
    { href: "/admin", label: "Admin Dashboard", icon: Shield },
    { href: "/admin/courses", label: "Manage Courses", icon: Settings },
    { href: "/admin/students", label: "Manage Students", icon: Users },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/courses/new", label: "Create Course", icon: PlusCircle },
  ],
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  STUDENT: { label: "Student", color: "bg-blue-500/20 text-blue-300 border-blue-400/30" },
  INSTRUCTOR: { label: "Instructor", color: "bg-amber-500/20 text-amber-300 border-amber-400/30" },
  ADMIN: { label: "Admin", color: "bg-red-500/20 text-red-300 border-red-400/30" },
};

export default function NavbarClient({ session }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const dropdownLinks = session ? DROPDOWN_LINKS[session.role] : [];
  const roleMeta = session ? ROLE_LABELS[session.role] : null;
  const initials = session
    ? session.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3">
      <div
        className={cn(
          "max-w-7xl mx-auto flex items-center justify-between rounded-lg px-4 sm:px-6 py-3 transition-all duration-300 border",
          "bg-card border-border shadow-glass"
        )}
      >
        {/* ── Logo ────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="CoachNest" className="h-5 w-auto object-contain" />
        </Link>

        {/* ── Right side ──────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Search icon */}
          <Link
            href="/search"
            className={cn(
              "hidden lg:flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
              pathname === "/search"
                ? "bg-secondary text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Link>

          {session ? (
            <>
              <div className="hidden lg:block">
                <NotificationBell />
              </div>

              {/* User menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-200",
                    userMenuOpen
                      ? "bg-secondary border border-border"
                      : "hover:bg-secondary border border-transparent"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {initials}
                  </div>
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
                      className="absolute right-0 top-14 w-64 z-50 bg-card border border-border rounded-lg shadow-2xl shadow-black/60 overflow-hidden"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3.5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                            {initials}
                          </div>
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

                      {/* Links */}
                      <div className="py-1.5">
                        {dropdownLinks.map((link) => {
                          const Icon = link.icon;
                          const isActive = pathname === link.href;
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              className={cn(
                                "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                                isActive
                                  ? "text-orange-400 bg-orange-500/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              {link.label}
                            </Link>
                          );
                        })}
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
            </>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground text-sm px-3.5 py-2 rounded-lg hover:bg-secondary transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg shadow-orange-600/20 hover:shadow-orange-600/30"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {!session && (
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all ml-1"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden max-w-7xl mx-auto mt-2 overflow-hidden"
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl shadow-black/50 p-4 space-y-1">
              {session && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="px-4 py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{session.name}</p>
                      <p className="text-muted-foreground text-xs">{session.email}</p>
                    </div>
                    {roleMeta && (
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          roleMeta.color
                        )}
                      >
                        {roleMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="border-t border-border my-2" />
                  {dropdownLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      >
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                  <div className="border-t border-border my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              )}

              {!session && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="flex gap-2 px-2">
                    <Link
                      href="/login"
                      className="flex-1 text-center text-muted-foreground text-sm py-2.5 rounded-lg border border-border hover:bg-secondary transition-all"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="flex-1 text-center bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium py-2.5 rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all"
                    >
                      Get Started
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
