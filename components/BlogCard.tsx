"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, User, Calendar, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  slug: string;
  title: string;
  excerpt?: string | null;
  thumbnail?: string | null;
  tags?: string | null;
  readTime?: number | null;
  authorName: string;
  createdAt: string | Date;
}

export default function BlogCard({
  slug,
  title,
  excerpt,
  thumbnail,
  tags,
  readTime,
  authorName,
  createdAt,
}: Props) {
  const tagList = tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/blog/${slug}`}
        className="group flex flex-col h-[340px] backdrop-blur-lg bg-white/[0.06] border border-border rounded-md overflow-hidden shadow-lg hover:bg-white/[0.1] hover:border-border transition-all duration-300"
      >
        {/* Thumbnail */}
        {thumbnail ? (
          <div className="relative h-36 shrink-0 overflow-hidden">
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-36 shrink-0 bg-gradient-to-br from-orange-600/20 to-orange-500/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
              <span className="text-2xl font-bold text-[#d97757]">{title.charAt(0)}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-3 flex flex-col flex-1 overflow-hidden">
          {/* Tags + Read time inline */}
          <div className="flex items-center gap-1.5 mb-2">
            {tagList.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium text-orange-300 bg-orange-500/15 px-1.5 py-px rounded-full border border-[#d97757]/20"
              >
                {tag}
              </span>
            ))}
            {readTime && (
              <span className="text-[10px] text-white/30 ml-auto flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {readTime}m
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold text-sm leading-snug mb-1.5 group-hover:text-orange-300 transition-colors line-clamp-2">
            {title}
          </h3>

          {/* Excerpt */}
          <p className="text-muted-foreground/70 text-xs leading-relaxed line-clamp-2">
            {excerpt || "\u00A0"}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-auto">
            <div className="flex items-center gap-2 text-white/30 text-[11px]">
              <span className="flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {authorName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(typeof createdAt === "string" ? new Date(createdAt) : createdAt)}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#d97757] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
