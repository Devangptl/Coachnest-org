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
} from "lucide-react";
import EnrollButton from "./EnrollButton";
import WishlistButton from "@/components/WishlistButton";
import Link from "next/link";

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
  const discountNum = discountPrice ? Number(discountPrice) : null;
  const hasDiscount = !isFree && discountNum && price && discountNum < price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="backdrop-blur-xl bg-white/[0.07] border border-white/15 rounded-2xl overflow-hidden shadow-2xl shadow-black/20"
    >
      {/* Price section */}
      <div className="p-6 border-b border-white/10">
        {isFree ? (
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-emerald-400">Free</span>
          </div>
        ) : price ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-bold text-white">
              ₹{hasDiscount ? discountNum!.toLocaleString("en-IN") : price.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-white/30 line-through">
                  ₹{price.toLocaleString("en-IN")}
                </span>
                <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-400/30">
                  {Math.round(((price - discountNum!) / price) * 100)}% off
                </span>
              </>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="mt-4 space-y-2.5">
          {userRole === "STUDENT" && (
            <EnrollButton
              courseId={courseId}
              isEnrolled={isEnrolled}
              isFree={isFree}
              price={hasDiscount ? discountNum : price}
            />
          )}
          {!isLoggedIn && (
            <Link href="/login" className="btn-primary block text-center w-full">
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
      </div>

      {/* Course includes */}
      <div className="p-6 space-y-4">
        <h3 className="text-white font-semibold text-sm">This course includes</h3>
        <div className="space-y-3">
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
    </motion.div>
  );
}

function IncludeItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3 text-white/60 text-sm">
      <Icon className="w-4 h-4 text-purple-400 flex-shrink-0" />
      {text}
    </div>
  );
}
