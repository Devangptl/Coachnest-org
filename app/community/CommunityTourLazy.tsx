"use client";

/**
 * Lazy-loaded wrapper for CommunityTour.
 * Uses next/dynamic with ssr:false to avoid bundling
 * react-joyride in the initial JS payload.
 */
import dynamic from "next/dynamic";

const CommunityTour = dynamic(() => import("@/components/CommunityTour"), {
  ssr: false,
  loading: () => null,
});

interface Props {
  initialRun: boolean;
}

export default function CommunityTourLazy({ initialRun }: Props) {
  return <CommunityTour initialRun={initialRun} />;
}
