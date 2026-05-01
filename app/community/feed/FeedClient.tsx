"use client";

import { useCallback, useState } from "react";
import { Activity, Clock, MessageSquare, Users, Award, BookOpen, Star } from "lucide-react";
import { useRealtimeChannel, usePostgresChanges } from "@/hooks/useRealtimeChannel";
import { channels, events } from "@/lib/realtime/channels";

interface FeedEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

const TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  THREAD_CREATED:   { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  GROUP_CREATED:    { icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  GROUP_JOINED:     { icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  REVIEW_SUBMITTED: { icon: Star, color: "text-purple-400", bg: "bg-purple-500/10" },
  BADGE_EARNED:     { icon: Award, color: "text-amber-400", bg: "bg-amber-500/10" },
  COURSE_COMPLETED: { icon: BookOpen, color: "text-[#d97757]", bg: "bg-orange-500/10" },
};

interface FeedClientProps {
  initialEvents: FeedEvent[];
  initialTotalPages: number;
}

export default function FeedClient({
  initialEvents,
  initialTotalPages,
}: FeedClientProps) {
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [hasNewActivity, setHasNewActivity] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setHasNewActivity(false);
    try {
      const res = await fetch(`/api/community/feed?page=${p}`);
      const data = await res.json();
      setFeedEvents(data.events || []);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const onNewActivity = useCallback(() => {
    if (page === 1) load(1);
    else setHasNewActivity(true);
  }, [page, load]);

  // Broadcast (server-emitted)
  useRealtimeChannel(channels.activityFeed(), events.activityCreated, onNewActivity);
  // Postgres Changes (direct DB — catches any write path)
  usePostgresChanges("activity_feed_events", onNewActivity, { event: "INSERT" });

  function getRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
        <p className="text-muted-foreground text-sm mt-1">See what&apos;s happening across the community.</p>
      </div>

      {hasNewActivity && (
        <button
          onClick={() => load(1)}
          className="w-full text-center text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md py-2 hover:bg-emerald-500/20 transition-colors"
        >
          New activity — click to refresh
        </button>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : feedEvents.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">No activity yet. Start learning and contributing to see updates here!</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {feedEvents.map((e) => {
              const config = TYPE_CONFIG[e.type] || { icon: Activity, color: "text-muted-foreground", bg: "bg-secondary" };
              const Icon = config.icon;

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-4 p-4 rounded-md border border-border bg-card hover:bg-secondary/30 transition-all"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                    {e.user.avatar ? (
                      <img src={e.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : e.user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm">
                      <span className="font-medium">{e.user.name}</span>
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{e.title}</p>
                  </div>

                  {/* Type Badge */}
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Time */}
                  <span className="text-muted-foreground/50 text-xs flex items-center gap-1 flex-shrink-0 min-w-[60px] justify-end">
                    <Clock className="w-3 h-3" />
                    {getRelativeTime(e.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => load(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === page
                      ? "bg-emerald-600 text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
