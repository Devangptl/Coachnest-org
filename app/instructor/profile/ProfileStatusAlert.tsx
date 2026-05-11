"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, X } from "lucide-react";

interface Props {
  status: string | null;
  rejectReason: string | null;
  userId: string;
}

export default function ProfileStatusAlert({ status, rejectReason, userId }: Props) {
  const key = `instructor-profile-alert-${status}-${userId}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // PENDING and REJECTED alerts are always visible (not dismissible — user needs to see them).
    // APPROVED alert is shown once then remembers dismissal.
    if (status === "APPROVED") {
      setVisible(!localStorage.getItem(key));
    } else {
      setVisible(true);
    }
  }, [status, key]);

  function dismiss() {
    localStorage.setItem(key, "1");
    setVisible(false);
  }

  if (!visible) return null;

  if (status === "APPROVED") {
    return (
      <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-5 py-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-emerald-400 font-semibold text-sm">Account Active</p>
          <p className="text-emerald-400/70 text-xs mt-0.5">
            Your instructor account is approved and active. You can create and publish courses.
          </p>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-emerald-400/50 hover:text-emerald-400 transition-colors flex-shrink-0 mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-4">
        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div>
          <p className="text-amber-400 font-semibold text-sm">Pending Approval</p>
          <p className="text-amber-400/70 text-xs mt-0.5">
            Your application is under review. You&apos;ll receive an email notification once a decision is made.
          </p>
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-5 py-4">
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-semibold text-sm">Application Not Approved</p>
          {rejectReason && (
            <p className="text-red-400/70 text-xs mt-0.5">Reason: {rejectReason}</p>
          )}
          <p className="text-red-400/60 text-xs mt-1">
            Contact <a href="/contact" className="underline">support</a> if you have questions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-secondary border border-border rounded-xl px-5 py-4">
      <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <p className="text-muted-foreground text-sm">Account status unknown. Contact support.</p>
    </div>
  );
}
