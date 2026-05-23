"use client";

import { useState, useRef } from "react";
import { Share2, Copy, Check, MessageCircle, Send, Twitter, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";

interface Props {
  title: string;
  thumbnail?: string | null;
  /** Used to build the default share URL: /courses/{courseId} */
  courseId?: string;
  /** Override the share path directly (e.g. /courses/x/lessons/y, /instructors/z) */
  path?: string;
  className?: string;
  triggerClassName?: string;
  /** Render as icon-only button (used in enroll bar action row) */
  iconOnly?: boolean;
  /** Show a hover tooltip with this label on the trigger */
  tooltip?: string;
}

export default function ShareCourseModal({
  title,
  thumbnail,
  courseId,
  path,
  className,
  triggerClassName,
  iconOnly = false,
  tooltip,
}: Props) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef            = useRef<HTMLInputElement>(null);

  // Derive a human-readable content type from the path
  const kind = path?.startsWith("/blog")        ? "blog post"
             : path?.startsWith("/playlists")   ? "playlist"
             : path?.startsWith("/instructors") ? "instructor profile"
             : path?.includes("/lessons/")      ? "lesson"
             : "course";

  function getCourseUrl() {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (path) return `${base}${path}`;
    return `${base}/courses/${courseId}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getCourseUrl());
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function selectInput() {
    inputRef.current?.select();
  }

  const socials = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      color: "text-green-500",
      bg: "hover:bg-green-500/10",
      href: (url: string) =>
        `https://wa.me/?text=${encodeURIComponent(`Check out this ${kind}: ${url}`)}`,
    },
    {
      label: "Telegram",
      icon: Send,
      color: "text-sky-400",
      bg: "hover:bg-sky-500/10",
      href: (url: string) =>
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: "X / Twitter",
      icon: Twitter,
      color: "text-foreground dark:text-white",
      bg: "hover:bg-secondary",
      href: (url: string) =>
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out this ${kind} — "${title}" on CoachNest`)}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      color: "text-blue-500",
      bg: "hover:bg-blue-500/10",
      href: (url: string) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: "Email",
      icon: Mail,
      color: "text-orange-400",
      bg: "hover:bg-orange-500/10",
      href: (url: string) =>
        `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`I found this ${kind} for you: ${url}`)}`,
    },
  ] as const;

  const triggerButton = iconOnly ? (
    <button
      aria-label={tooltip ?? `Share this ${kind}`}
      className={cn(
        "w-9 h-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors",
        triggerClassName,
      )}
    >
      <Share2 className="w-4 h-4" />
    </button>
  ) : (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-[#d97757]/50 transition-all",
        triggerClassName,
      )}
    >
      <Share2 className="w-3.5 h-3.5" />
      <span>Share</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {tooltip ? (
        <TooltipProvider delayDuration={150} skipDelayDuration={100}>
          <TooltipRoot>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>{triggerButton}</DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">{tooltip}</TooltipContent>
          </TooltipRoot>
        </TooltipProvider>
      ) : (
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      )}

      <DialogContent className={cn("max-w-md", className)}>
        <DialogHeader>
          <DialogTitle className="capitalize">Share this {kind}</DialogTitle>
        </DialogHeader>

        {/* Course preview strip */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border mb-4">
          <div className="relative w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-muted">
            {thumbnail ? (
              <Image src={thumbnail} alt={title} fill sizes="64px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-orange-500/20">
                <Share2 className="w-4 h-4 text-orange-400" />
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{title}</p>
        </div>

        {/* Social icons */}
        <div className="flex items-center justify-around mb-5">
          {socials.map(({ label, icon: Icon, color, bg, href }) => (
            <a
              key={label}
              href={href(getCourseUrl())}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className={cn(
                "flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl transition-colors",
                bg,
              )}
              onClick={() => setOpen(false)}
            >
              <Icon className={cn("w-5 h-5", color)} />
              <span className="text-[10px] text-muted-foreground">{label.split(" /")[0]}</span>
            </a>
          ))}
        </div>

        {/* Copy link row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              readOnly
              value={typeof window !== "undefined" ? getCourseUrl() : ""}
              onClick={selectInput}
              className="w-full text-xs bg-secondary border border-border rounded-md px-3 py-2 pr-2 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary select-all cursor-text truncate"
            />
          </div>
          <button
            onClick={copyLink}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all flex-shrink-0",
              copied
                ? "bg-green-500/15 text-green-500 border border-green-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary",
            )}
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5" /> Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
