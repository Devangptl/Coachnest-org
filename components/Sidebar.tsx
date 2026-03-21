/**
 * Sidebar — used in the dashboard and admin layouts.
 * Accepts a list of nav items and highlights the active one.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: SidebarItem[];
  title?: string;
}

export default function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-4 shadow-xl">
        {title && (
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
            {title}
          </p>
        )}

        <nav className="flex flex-col gap-1">
          {items.map((item) => {
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
