"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Users,
  Video,
  BookOpen,
  Award,
  MessageCircle,
  Key,
} from "lucide-react";

type Included = {
  courses: number;
  liveSessions: number;
  enableCertificate: boolean;
  enableChat: boolean;
  maxStudents: number | null;
  enrolledCount: number;
};

export default function JoinClassPanel({
  classId,
  slug,
  joinMode,
  isLoggedIn,
  enrollmentStatus,
  inviteCodeHint,
  price,
  isPaid,
  included,
}: {
  classId: string;
  slug: string;
  joinMode: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
  isLoggedIn: boolean;
  enrollmentStatus: string | null;
  inviteCodeHint?: string;
  price?: number | null;
  isPaid?: boolean;
  included?: Included;
}) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(inviteCodeHint ?? "");
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    try {
      const res = await fetch(`/api/classes/${classId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      if (data.enrollment.status === "APPROVED") {
        toast.success("Welcome to the class!");
      } else if (data.enrollment.status === "PENDING") {
        toast.success("Request submitted — waiting for approval");
      } else if (data.enrollment.status === "WAITLISTED") {
        toast.success("Added to the waitlist");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Status states ───────────────────────────────────────────────────────
  if (enrollmentStatus === "APPROVED") {
    return (
      <div className="space-y-3">
        <div className="text-center pb-3 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="font-semibold">You&apos;re enrolled</p>
          <p className="text-xs text-muted-foreground">
            Pick up where you left off.
          </p>
        </div>
        <Link href="/dashboard/classes" className="block">
          <Button className="w-full">Open my classes</Button>
        </Link>
      </div>
    );
  }

  if (enrollmentStatus === "PENDING") {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-2">
          <Clock className="w-6 h-6 text-amber-400" />
        </div>
        <p className="font-semibold mb-1">Awaiting review</p>
        <p className="text-xs text-muted-foreground">
          The instructor will review your request soon.
        </p>
      </div>
    );
  }

  if (enrollmentStatus === "WAITLISTED") {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-full bg-sky-500/15 flex items-center justify-center mx-auto mb-2">
          <Clock className="w-6 h-6 text-sky-400" />
        </div>
        <p className="font-semibold mb-1">On the waitlist</p>
        <p className="text-xs text-muted-foreground">
          We&apos;ll notify you when a seat opens up.
        </p>
      </div>
    );
  }

  if (enrollmentStatus === "BANNED" || enrollmentStatus === "REJECTED") {
    return (
      <div className="text-center text-red-400 py-2">
        <Lock className="w-10 h-10 mx-auto mb-2" />
        <p className="font-semibold">Access restricted</p>
      </div>
    );
  }

  // ── Join CTA ────────────────────────────────────────────────────────────
  const ctaLabel =
    joinMode === "OPEN"
      ? "Enroll for free"
      : joinMode === "APPROVAL_REQUIRED"
      ? "Request to join"
      : "Join with code";

  return (
    <div className="space-y-4">
      {/* Price / free badge */}
      <div className="flex items-baseline justify-between">
        <div>
          {isPaid && price !== null && price !== undefined ? (
            <div className="text-3xl font-bold text-foreground">
              ₹{price.toLocaleString("en-IN")}
              <span className="text-xs text-muted-foreground font-normal ml-1">
                one-time
              </span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5" /> Free
            </div>
          )}
        </div>
        {included && included.maxStudents && (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            {Math.max(0, included.maxStudents - included.enrolledCount)} seats left
          </span>
        )}
      </div>

      {!isLoggedIn ? (
        <Link href={`/login?next=/classes/${slug}`} className="block">
          <Button className="w-full">Log in to enroll</Button>
        </Link>
      ) : (
        <>
          {joinMode === "INVITE_ONLY" && (
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <Key className="w-3 h-3" /> Invite code
              </label>
              <input
                className="input-glass"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          )}

          <Button onClick={join} disabled={busy} loading={busy} className="w-full">
            {ctaLabel}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            {joinMode === "OPEN" && "Instant access — no approval needed."}
            {joinMode === "APPROVAL_REQUIRED" &&
              "The instructor reviews each request."}
            {joinMode === "INVITE_ONLY" &&
              "You'll need an invite code from the instructor."}
          </p>
        </>
      )}

      {/* What's included */}
      {included && (
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
            What you get
          </p>
          <ul className="space-y-1.5 text-sm">
            <IncludedRow
              icon={BookOpen}
              label={`${included.courses} course${included.courses === 1 ? "" : "s"}`}
            />
            {included.liveSessions > 0 && (
              <IncludedRow
                icon={Video}
                label={`${included.liveSessions} live session${included.liveSessions === 1 ? "" : "s"}`}
              />
            )}
            <IncludedRow
              icon={Users}
              label={`${included.enrolledCount} learners enrolled`}
            />
            {included.enableChat && (
              <IncludedRow icon={MessageCircle} label="Class chat" />
            )}
            {included.enableCertificate && (
              <IncludedRow icon={Award} label="Completion certificate" />
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function IncludedRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>{label}</span>
    </li>
  );
}
