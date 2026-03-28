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
        className="relative p-6 flex flex-col gap-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border-orange-500/20 bg-background/95 backdrop-blur-2xl rounded-2xl"
        glow
      >
        {/* Glow Element */}
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

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
                    ? "w-6 bg-gradient-to-r from-orange-500 to-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
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
                className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-5 py-2 rounded-xl shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] transition-all active:scale-95"
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

interface OnboardingTourProps {
  initialRun?: boolean;
}

export default function OnboardingTour({ initialRun = false }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/dashboard") {
      // If DB says we have NOT seen it, check localstorage to prevent double-runs before server syncs
      if (initialRun) {
        const localStatus = localStorage.getItem("hasSeenTour");
        if (!localStatus) {
          setTimeout(() => {
            setRun(true);
          }, 500);
        }
      }
    } else {
      setRun(false); // Disable tour if we navigate away
    }
  }, [pathname, initialRun]);

  useEffect(() => {
    const handleRestart = () => {
      setRun(false);
      setTimeout(() => setRun(true), 100);
    };
    window.addEventListener("restart-dashboard-tour", handleRestart);
    return () => window.removeEventListener("restart-dashboard-tour", handleRestart);
  }, []);

  const handleJoyrideEvent = async (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem("hasSeenTour", "true");
      
      try {
        await fetch("/api/user/tour-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "dashboard", status: true }),
        });
      } catch (error) {
        console.error("Failed to sync tour status", error);
      }
    }
  };

  const steps: Step[] = [
    {
      target: "body",
      title: "Welcome Aboard! 🎉",
      content: "Welcome to your personal learning dashboard. Let's take a quick 30-second tour to get you oriented.",
      placement: "center",
      skipBeacon: true,
    },
    {
      target: "#tour-sidebar",
      title: "Your Command Center",
      content: "This sidebar is your main navigation. Quickly jump between your courses, view your certificates, or check out the community.",
      placement: "right",
    },
    {
      target: "#tour-stats",
      title: "Track Your Progress",
      content: "These high-level stats let you see exactly how many courses you are enrolled in, currently learning, and have conquered.",
      placement: "bottom",
    },
    {
      target: "#tour-gamification",
      title: "Level Up & Keep Streaking",
      content: "Earn XP as you complete lessons, climb the ranks, and try not to break your learning streak. Who doesn't love a good level up?",
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
        primaryColor: "#f97316", // orange-500
        zIndex: 10000,
        backgroundColor: "transparent",
        arrowColor: "transparent",
        buttons: ["back", "skip", "primary"]
      }}
    />
  );
}
