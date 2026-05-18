"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { BookOpen, Users, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import InstructorAvatar from "./InstructorAvatar";
import FollowInstructorButton from "./FollowInstructorButton";
import { Skeleton } from "./ui/Skeleton";

interface CardData {
  instructor: {
    id: string;
    name: string;
    avatar: string | null;
    headline: string | null;
    bio: string | null;
    website: string | null;
    stats: {
      coursesCount: number;
      studentsCount: number;
      averageRating: number;
      reviewsCount: number;
      followerCount: number;
    };
  };
  follow: { isFollowing: boolean; followerCount: number };
  isLoggedIn: boolean;
}

// Cache fetched cards across mounts so re-hovering never re-fetches.
const cache = new Map<string, CardData>();
const inflight = new Map<string, Promise<CardData | null>>();

function fetchCard(id: string): Promise<CardData | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  if (inflight.has(id)) return inflight.get(id)!;

  const p = fetch(`/api/instructors/${id}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data: CardData | null) => {
      if (data) cache.set(id, data);
      inflight.delete(id);
      return data;
    })
    .catch(() => {
      inflight.delete(id);
      return null;
    });

  inflight.set(id, p);
  return p;
}

interface Props {
  instructorId: string;
  instructorName: string;
  avatarUrl?: string | null;
  /** The trigger content (name text, avatar, etc.). */
  children: ReactNode;
  className?: string;
}

const CARD_WIDTH = 308;
const OPEN_DELAY = 180;
const CLOSE_DELAY = 140;

export default function InstructorHoverCard({
  instructorId,
  instructorName,
  avatarUrl,
  children,
  className,
}: Props) {
  const router = useRouter();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<CardData | null>(
    cache.get(instructorId) ?? null,
  );
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);

  useEffect(() => setMounted(true), []);

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(
      Math.max(8, r.left),
      Math.max(8, vw - CARD_WIDTH - 8),
    );
    const spaceBelow = vh - r.bottom;
    const placement: "top" | "bottom" = spaceBelow < 340 ? "top" : "bottom";
    setPos({
      top: placement === "bottom" ? r.bottom + 8 : r.top - 8,
      left,
      placement,
    });
  }, []);

  const doOpen = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      computePosition();
      setOpen(true);
      if (!cache.has(instructorId)) {
        fetchCard(instructorId).then((d) => d && setData(d));
      } else {
        setData(cache.get(instructorId)!);
      }
    }, OPEN_DELAY);
  }, [computePosition, instructorId]);

  const doClose = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = () => computePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, computePosition]);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  const goToProfile = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/instructors/${instructorId}`);
    },
    [router, instructorId],
  );

  const stats = data?.instructor.stats;

  return (
    <>
      <span
        ref={triggerRef}
        role="link"
        tabIndex={0}
        aria-label={`View ${instructorName}'s profile`}
        onClick={goToProfile}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") goToProfile(e);
        }}
        onMouseEnter={doOpen}
        onMouseLeave={doClose}
        onFocus={doOpen}
        onBlur={doClose}
        className={cn(
          "cursor-pointer outline-none rounded focus-visible:ring-2 focus-visible:ring-orange-500/50",
          className,
        )}
      >
        {children}
      </span>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            onMouseEnter={() => clearTimeout(closeTimer.current)}
            onMouseLeave={doClose}
            style={{
              position: "fixed",
              top: pos.placement === "bottom" ? pos.top : undefined,
              bottom:
                pos.placement === "top"
                  ? window.innerHeight - pos.top
                  : undefined,
              left: pos.left,
              width: CARD_WIDTH,
              zIndex: 60,
            }}
            className="rounded-xl border border-border bg-card shadow-2xl shadow-black/30 p-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {!data ? (
              <HoverSkeleton />
            ) : (
              <>
                <button
                  type="button"
                  onClick={goToProfile}
                  className="flex items-start gap-3 w-full text-left group"
                >
                  <InstructorAvatar
                    name={data.instructor.name}
                    avatar={data.instructor.avatar}
                    size="w-12 h-12"
                    textSize="text-base"
                    className="flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight truncate group-hover:text-orange-500 transition-colors">
                      {data.instructor.name}
                    </p>
                    {data.instructor.headline && (
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
                        {data.instructor.headline}
                      </p>
                    )}
                  </div>
                </button>

                {data.instructor.bio && (
                  <p className="text-muted-foreground/90 text-xs leading-relaxed mt-3 line-clamp-3">
                    {data.instructor.bio}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-orange-500/70" />
                    {stats!.coursesCount} course
                    {stats!.coursesCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-orange-500/70" />
                    {stats!.studentsCount.toLocaleString()}
                  </span>
                  {stats!.averageRating > 0 && (
                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {stats!.averageRating}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <FollowInstructorButton
                    instructorId={data.instructor.id}
                    initialIsFollowing={data.follow.isFollowing}
                    initialCount={data.follow.followerCount}
                    isLoggedIn={data.isLoggedIn}
                    showCount
                    className="flex-1 justify-center"
                  />
                  <button
                    type="button"
                    onClick={goToProfile}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/50 transition-colors"
                  >
                    Profile
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function HoverSkeleton() {
  return (
    <div>
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton h="h-4" w="w-2/3" />
          <Skeleton h="h-3" w="w-full" />
        </div>
      </div>
      <div className="space-y-2 mt-3">
        <Skeleton h="h-3" w="w-full" />
        <Skeleton h="h-3" w="w-4/5" />
      </div>
      <div className="flex gap-4 mt-3">
        <Skeleton h="h-3" w="w-16" />
        <Skeleton h="h-3" w="w-14" />
        <Skeleton h="h-3" w="w-10" />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton h="h-8" w="w-full" />
        <Skeleton h="h-8" w="w-20" />
      </div>
    </div>
  );
}
