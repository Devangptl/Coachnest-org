"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface InstructorAlertsProps {
  isProfileIncomplete: boolean;
  isApproved: boolean;
  userId: string;
}

export default function InstructorAlerts({
  isProfileIncomplete,
  isApproved,
  userId,
}: InstructorAlertsProps) {
  const profileKey  = `instructor-alert-profile-${userId}`;
  const approvedKey = `instructor-alert-approved-${userId}`;

  const [showProfile,  setShowProfile]  = useState(false);
  const [showApproved, setShowApproved] = useState(false);

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setShowProfile(isProfileIncomplete && !localStorage.getItem(profileKey));
    setShowApproved(isApproved && !localStorage.getItem(approvedKey));
  }, [isProfileIncomplete, isApproved, profileKey, approvedKey]);

  function dismissProfile() {
    localStorage.setItem(profileKey, "1");
    setShowProfile(false);
  }

  function dismissApproved() {
    localStorage.setItem(approvedKey, "1");
    setShowApproved(false);
  }

  if (!showProfile && !showApproved) return null;

  return (
    <div className="space-y-3">
      {showProfile && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-blue-400 font-semibold text-sm">Complete your instructor profile</p>
            <p className="text-blue-400/70 text-xs mt-0.5">
              Add a headline and bio to help students learn about you.{" "}
              <Link href="/instructor/profile" className="underline hover:no-underline">
                Update profile →
              </Link>
            </p>
          </div>
          <button
            onClick={dismissProfile}
            aria-label="Dismiss"
            className="text-blue-400/50 hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showApproved && (
        <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-emerald-400 font-semibold text-sm">Account Active</p>
            <p className="text-emerald-400/70 text-xs mt-0.5">
              Your instructor account is approved. Start creating courses to earn revenue.
            </p>
          </div>
          <button
            onClick={dismissApproved}
            aria-label="Dismiss"
            className="text-emerald-400/50 hover:text-emerald-400 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
