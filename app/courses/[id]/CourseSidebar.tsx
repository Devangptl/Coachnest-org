"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Globe,
  Award,
  Smartphone,
  Download,
  Infinity,
  Shield,
  Edit3,
  Share2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import EnrollButton from "./EnrollButton";
import WishlistButton from "@/components/WishlistButton";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  courseId: string;
  price: number | null;
  discountPrice: number | null;
  isFree: boolean;
  isEnrolled: boolean;
  isWishlisted: boolean;
  isLoggedIn: boolean;
  userRole: string | null;
  lessonCount: number;
  totalDuration: number;
  language: string;
  level: string;
}

const FEATURES = [
  { icon: Infinity, text: "Lifetime access" },
  { icon: Smartphone, text: "Access on mobile and desktop" },
  { icon: Award, text: "Certificate of completion" },
  { icon: Download, text: "Downloadable resources" },
];

export default function CourseSidebar({
  courseId,
  price,
  discountPrice,
  isFree,
  isEnrolled,
  isWishlisted,
  isLoggedIn,
  userRole,
  lessonCount,
  totalDuration,
  language,
  level,
}: Props) {
  const [copied, setCopied] = useState(false);
  const discountNum = discountPrice ? Number(discountPrice) : null;
  const hasDiscount = !isFree && discountNum && price && discountNum < price;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="backdrop-blur-xl bg-white/[0.07] border border-white/15 rounded-xl overflow-hidden shadow-xl shadow-black/20"
    >
      {/* Price section */}
      <div className="p-4 border-b border-white/10">
        {isFree ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-400">Free</span>
            <span className="text-xs text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">No cost</span>
          </div>
        ) : price ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-white">
              ₹{hasDiscount ? discountNum!.toLocaleString("en-IN") : price.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-white/30 line-through">
                  ₹{price.toLocaleString("en-IN")}
                </span>
                <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-400/30">
                  {Math.round(((price - discountNum!) / price) * 100)}% off
                </span>
              </>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="mt-3 space-y-2">
          {userRole === "STUDENT" && (
            <div className={!isEnrolled ? "cta-glow rounded-xl" : ""}>
              <EnrollButton
                courseId={courseId}
                isEnrolled={isEnrolled}
                isFree={isFree}
                price={hasDiscount ? discountNum : price}
              />
            </div>
          )}
          {!isLoggedIn && (
            <Link href="/login" className="btn-primary block text-center w-full cta-glow">
              Sign in to Enroll
            </Link>
          )}
          {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Course
            </Link>
          )}
          {isLoggedIn && (
            <div className="flex items-center justify-center gap-2">
              <WishlistButton courseId={courseId} initialState={isWishlisted} />
              <span className="text-white/40 text-xs">
                {isWishlisted ? "In your wishlist" : "Add to wishlist"}
              </span>
            </div>
          )}
        </div>

        {/* Money-back guarantee */}
        {!isEnrolled && !isFree && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]"
          >
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-white/40 text-xs leading-relaxed">
              30-day money-back guarantee. Full refund if you&apos;re not satisfied.
            </p>
          </motion.div>
        )}
      </div>

      {/* Course includes */}
      <div className="p-4 space-y-3">
        <h3 className="text-white font-semibold text-xs">This course includes</h3>
        <div className="space-y-2">
          <IncludeItem icon={BookOpen} text={`${lessonCount} lessons`} />
          {totalDuration > 0 && (
            <IncludeItem
              icon={Clock}
              text={
                totalDuration > 60
                  ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m of content`
                  : `${totalDuration} minutes of content`
              }
            />
          )}
          <IncludeItem icon={Globe} text={`${language} language`} />
          <IncludeItem icon={Shield} text={`${level.charAt(0).toUpperCase() + level.slice(1)} level`} />
          {FEATURES.map((f) => (
            <IncludeItem key={f.text} icon={f.icon} text={f.text} />
          ))}
        </div>
      </div>

      {/* Share section */}
      <div className="px-4 pb-4">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-[11px] py-2.5 rounded-lg border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03] transition-all"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              Share this course
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function IncludeItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-white/60 text-xs group">
      <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center group-hover:bg-purple-500/15 transition-colors">
        <Icon className="w-3 h-3 text-purple-400 flex-shrink-0" />
      </div>
      {text}
    </div>
  );
}
