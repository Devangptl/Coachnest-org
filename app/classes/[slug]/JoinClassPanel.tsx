"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Clock, Lock } from "lucide-react";

export default function JoinClassPanel({
  classId,
  slug,
  joinMode,
  isLoggedIn,
  enrollmentStatus,
  inviteCodeHint,
}: {
  classId: string;
  slug: string;
  joinMode: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
  isLoggedIn: boolean;
  enrollmentStatus: string | null;
  inviteCodeHint?: string;
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

  if (!isLoggedIn) {
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-3">Log in to join this class.</p>
        <Link href={`/login?next=/classes/${slug}`}>
          <Button className="w-full">Log in</Button>
        </Link>
      </div>
    );
  }

  if (enrollmentStatus === "APPROVED") {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
        <p className="font-semibold mb-1">You&apos;re enrolled</p>
        <p className="text-xs text-muted-foreground mb-3">Welcome to the class.</p>
        <Link href="/dashboard/classes" className="block">
          <Button variant="secondary" className="w-full">Go to my classes</Button>
        </Link>
      </div>
    );
  }

  if (enrollmentStatus === "PENDING") {
    return (
      <div className="text-center">
        <Clock className="w-10 h-10 text-amber-400 mx-auto mb-2" />
        <p className="font-semibold mb-1">Request submitted</p>
        <p className="text-xs text-muted-foreground">
          The instructor will review your request.
        </p>
      </div>
    );
  }

  if (enrollmentStatus === "BANNED") {
    return (
      <div className="text-center text-red-400">
        <Lock className="w-10 h-10 mx-auto mb-2" />
        <p className="font-semibold">Access restricted</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Join this class</h3>
      <p className="text-xs text-muted-foreground">
        {joinMode === "OPEN" && "Open enrollment — join instantly."}
        {joinMode === "APPROVAL_REQUIRED" && "The instructor reviews each request."}
        {joinMode === "INVITE_ONLY" && "Enter your invite code to join."}
      </p>

      {joinMode === "INVITE_ONLY" && (
        <input
          className="input-glass"
          placeholder="Invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
      )}

      <Button onClick={join} disabled={busy} className="w-full">
        {joinMode === "OPEN" ? "Join class" :
         joinMode === "APPROVAL_REQUIRED" ? "Request to join" : "Join with code"}
      </Button>
    </div>
  );
}
