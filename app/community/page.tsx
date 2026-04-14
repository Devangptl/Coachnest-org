"use client";

/**
 * Community Hub — landing page showing recent activity, popular threads, and active groups.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare, Users, ClipboardCheck, Activity,
  ArrowRight, TrendingUp, Clock, Flame, Lock
} from "lucide-react";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";
import { ShoppingCart } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  createdAt: string;
  author: { name: string; avatar: string | null };
  _count: { replies: number };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
}

interface FeedEvent {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  user: { name: string; avatar: string | null };
}

const QUICK_LINKS = [
  { icon: MessageSquare, title: "Discussion Forums", desc: "Ask questions, get answers, share knowledge.", href: "/community/forums", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", proWrite: true },
  { icon: Users, title: "Study Groups", desc: "Form groups, track progress together, earn group XP.", href: "/community/groups", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", proWrite: true },
  { icon: ClipboardCheck, title: "Peer Review", desc: "Submit work, give & receive structured feedback.", href: "/community/peer-review", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", proWrite: true },
  { icon: Activity, title: "Activity Feed", desc: "See badges earned, milestones, and community wins.", href: "/community/feed", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", proWrite: false },
];

export default function CommunityHubPage() {
  const { hasCommunityAccess, isLoading: subLoading } = usePurchasedFeatures();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [t, g, e] = await Promise.all([
          fetch("/api/community/forums?sort=popular&page=1").then(r => r.json()),
          fetch("/api/community/groups?page=1").then(r => r.json()),
          fetch("/api/community/feed?page=1").then(r => r.json()),
        ]);
        setThreads(t.threads?.slice(0, 5) || []);
        setGroups(g.groups?.slice(0, 4) || []);
        setEvents(e.events?.slice(0, 6) || []);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Only show lock badges once access state is known
  const showLocks = !subLoading && !hasCommunityAccess;

  return (
    <div className="py-5 space-y-10">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Community Hub</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Connect with fellow learners — ask questions, join study groups, review peers&apos; work, and celebrate wins together.
          </p>
        </div>
        {/* Community member badge */}
        {!subLoading && hasCommunityAccess && (
          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 mt-1">
            ✓ Community Member
          </span>
        )}
      </div>

      {/* Quick Links Grid */}
      <div id="tour-community-quicklinks" className="grid sm:grid-cols-2 gap-4">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          const isLocked = item.proWrite && showLocks;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group rounded-md border p-5 transition-all relative overflow-hidden ${
                isLocked
                  ? "border-border bg-card hover:border-primary/30 cursor-not-allowed"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-md ${item.bg} border flex items-center justify-center flex-shrink-0 ${isLocked ? "opacity-50" : ""}`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm mb-1 flex items-center gap-2 transition-colors ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                    {item.title}
                    {isLocked ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500/70 border border-orange-500/20">
                        <Lock className="w-2.5 h-2.5" /> Add-on Required
                      </span>
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all" />
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                  {isLocked && (
                    <p className="text-orange-500/60 text-[11px] mt-1.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Requires Community Access
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Buy Community Access CTA */}
      {showLocks && (
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/8 to-amber-600/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">Unlock the full community experience</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Post threads, create study groups, and submit peer reviews. One-time purchase, lifetime access.
              </p>
            </div>
          </div>
          <Link
            href="/features/community"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-5 py-2.5 rounded-md transition-colors flex-shrink-0"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Buy Access — ₹499
          </Link>
        </div>
      )}

      {/* Popular Threads */}
      <section id="tour-community-threads">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Popular Discussions
          </h2>
          <Link href="/community/forums" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No discussions yet. Be the first to start one!</p>
            <Link href="/community/forums" className="inline-flex items-center gap-1.5 mt-3 text-emerald-400 text-xs font-medium hover:underline">
              Start a discussion <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/community/forums/${t.id}`}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-card transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium truncate transition-colors">{t.title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    by {t.author.name} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs ml-4 flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t._count.replies}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Active Study Groups */}
      <section id="tour-community-groups">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Active Study Groups
          </h2>
          <Link href="/community/groups" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1,2].map(i => (
              <div key={i} className="h-24 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No study groups yet. Create one!</p>
            <Link href="/community/groups" className="inline-flex items-center gap-1.5 mt-3 text-emerald-400 text-xs font-medium hover:underline">
              Create a group <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/community/groups/${g.id}`}
                className="p-4 rounded-lg border border-border bg-card transition-all group"
              >
                <p className="text-foreground text-sm font-semibold transition-colors">{g.name}</p>
                {g.description && (
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{g.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-2">
                  <Users className="w-3 h-3" />
                  {g._count.members} member{g._count.members !== 1 ? "s" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Recent Activity
          </h2>
          <Link href="/community/feed" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-8 text-center">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No activity yet. Start learning and contributing!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs font-bold flex-shrink-0">
                  {e.user.avatar ? (
                    <img src={e.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    e.user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs">
                    <span className="font-medium">{e.user.name}</span>{" "}
                    <span className="text-muted-foreground">{e.title}</span>
                  </p>
                  <p className="text-muted-foreground text-[10px] flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(e.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
