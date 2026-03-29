"use client";

/**
 * CommunityProNotice — compact upgrade card shown at the top of
 * community write-gated pages (Forums, Groups, Peer Review) for FREE/BASIC users.
 *
 * Replaces the previous SubscriptionGate + dummy <span /> hack.
 * Only renders when user lacks hasInstructorQA.
 */
import Link from "next/link";
import { Lock, Zap, MessageSquare, Users, Star, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const PERKS = [
  { icon: MessageSquare, text: "Start & reply to discussions" },
  { icon: Users,         text: "Create & join study groups" },
  { icon: Star,          text: "Submit work for peer review" },
];

interface Props {
  /** Highlight the specific action that was blocked */
  action?: "post" | "reply" | "create-group" | "join-group" | "peer-review";
}

const ACTION_COPY: Record<NonNullable<Props["action"]>, string> = {
  "post":         "Posting threads requires a Pro subscription.",
  "reply":        "Replying requires a Pro subscription.",
  "create-group": "Creating study groups requires a Pro subscription.",
  "join-group":   "Joining study groups requires a Pro subscription.",
  "peer-review":  "Peer review requires a Pro subscription.",
};

export default function CommunityProNotice({ action }: Props) {
  const { hasInstructorQA, isLoading } = useSubscription();

  if (isLoading || hasInstructorQA) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4.5 h-4.5 text-emerald-400" style={{ width: "18px", height: "18px" }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Pro Feature
            </span>
          </div>
          <p className="text-foreground font-semibold text-sm mb-0.5">
            {action ? ACTION_COPY[action] : "Community writing features require Pro."}
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed mb-3">
            You can read all public content. Upgrade to Pro to participate — post, reply, create groups, and submit peer reviews.
          </p>

          {/* Perks */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade to Pro
            </Link>
            <Link
              href="/dashboard/subscription"
              className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
            >
              View my plan <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
