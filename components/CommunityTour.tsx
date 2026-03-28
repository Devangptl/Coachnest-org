"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Joyride, EventData, STATUS, Step, TooltipRenderProps } from "react-joyride";
import GlassCard from "./GlassCard";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

function CustomTooltip({
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div {...tooltipProps} className="max-w-[360px] w-full isolate animate-in fade-in zoom-in-95 duration-200">
      <GlassCard
        className="relative p-6 flex flex-col gap-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border-emerald-500/20 bg-background/95 backdrop-blur-2xl rounded-2xl"
        glow
      >
        {/* Glow Element */}
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="pr-6">
            <h3 className="text-foreground font-bold text-lg leading-tight mb-2">
              {step.title}
            </h3>
            <div className="text-muted-foreground text-sm font-medium leading-relaxed">
              {step.content}
            </div>
          </div>
          <button
            {...closeProps}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all ring-offset-background hover:ring-2 ring-transparent hover:ring-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Area */}
        <div className="flex flex-col gap-4 mt-2">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 justify-center py-2">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    : "w-1.5 bg-border/80"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              {!step.skipBeacon && index < size - 1 && (
                <button
                  {...skipProps}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline underline-offset-4 px-2 py-2 transition-colors"
                >
                  Skip tour
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button
                  {...backProps}
                  className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-all active:scale-95"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              
              <button
                {...primaryProps}
                className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-5 py-2 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] transition-all active:scale-95"
              >
                {index === size - 1 ? "Finish" : "Next"}
                {index < size - 1 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

interface CommunityTourProps {
  initialRun?: boolean;
}

export default function CommunityTour({ initialRun = false }: CommunityTourProps) {
  const [run, setRun] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/community") {
      if (initialRun) {
        const hasSeenCommunityTour = localStorage.getItem("hasSeenCommunityTour");
        if (!hasSeenCommunityTour) {
          setTimeout(() => {
            setRun(true);
          }, 500);
        }
      }
    } else {
      setRun(false); // disable if no longer on community root
    }
  }, [pathname, initialRun]);

  useEffect(() => {
    const handleRestart = () => {
      setRun(false);
      setTimeout(() => setRun(true), 100);
    };
    window.addEventListener("restart-community-tour", handleRestart);
    return () => window.removeEventListener("restart-community-tour", handleRestart);
  }, []);

  const handleJoyrideEvent = async (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem("hasSeenCommunityTour", "true");
      
      try {
        await fetch("/api/user/tour-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "community", status: true }),
        });
      } catch (error) {
        console.error("Failed to sync tour status", error);
      }
    }
  };

  const steps: Step[] = [
    {
      target: "body",
      title: "Welcome to the Hub! 🤝",
      content: "This is your community space. Connect with learners, ask questions, and celebrate your wins together.",
      placement: "center",
      skipBeacon: true,
    },
    {
      target: "#tour-community-sidebar",
      title: "Community Navigation",
      content: "Jump quickly between Discussion Forums, Study Groups, Peer Reviews, and Activity Feeds right from here.",
      placement: "right",
    },
    {
      target: "#tour-community-quicklinks",
      title: "Quick Actions",
      content: "The easiest way to dive into what you need. Launch into a discussion or submit your work for peer review instantly.",
      placement: "bottom",
    },
    {
      target: "#tour-community-groups",
      title: "Active Study Groups",
      content: "Join forces with others! Group up to track progress, share notes, and earn collective XP.",
      placement: "top",
    },
  ];

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      tooltipComponent={CustomTooltip}
      onEvent={handleJoyrideEvent}
      options={{
        showProgress: false,
        primaryColor: "#10b981", // emerald-500
        zIndex: 10000,
        backgroundColor: "transparent",
        arrowColor: "transparent",
        buttons: ["back", "skip", "primary"]
      }}
    />
  );
}
