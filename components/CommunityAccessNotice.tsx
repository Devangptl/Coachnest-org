"use client";

/**
 * CommunityProNotice — buy-community-access banner shown at the top of
 * community write-gated pages (Forums, Groups, Peer Review) for users
 * who haven't purchased the Community add-on.
 */
import Link from "next/link";
import { Lock, ShoppingCart, MessageSquare, Users, Star } from "lucide-react";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";

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
  "post":         "Posting threads requires Community Access.",
  "reply":        "Replying requires Community Access.",
  "create-group": "Creating study groups requires Community Access.",
  "join-group":   "Joining study groups requires Community Access.",
  "peer-review":  "Peer review requires Community Access.",
};

export default function CommunityAccessNotice({ action }: Props) {
  const { hasCommunityAccess, isLoading } = usePurchasedFeatures();

  if (isLoading || hasCommunityAccess) return null;

  return (
    <div className="rounded-md border border-orange-500/20 bg-gradient-to-br from-orange-500/8 to-amber-600/5 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-md bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
          <Lock style={{ width: "18px", height: "18px" }} className="text-orange-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Add-on Required
            </span>
          </div>
          <p className="text-foreground font-semibold text-sm mb-0.5">
            {action ? ACTION_COPY[action] : "Community writing features require the Community add-on."}
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed mb-3">
            You can read all public content. Purchase Community Access once to post, reply, create groups, and submit peer reviews — lifetime access, no subscription.
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3 h-3 text-orange-400 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/features/community"
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Buy Access — ₹499
            </Link>
            <Link
              href="/features"
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              View all add-ons
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
