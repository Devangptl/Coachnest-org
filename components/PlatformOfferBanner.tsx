/**
 * PlatformOfferBanner — dismissible promotional banner shown at the top of
 * the landing page when an admin has an active platform-wide offer.
 *
 * Rendered as a Server Component: the offer is fetched directly via the
 * service so we avoid a client-side round-trip. Dismissal state is kept in
 * the browser's `sessionStorage` so the banner reappears the next session.
 */
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getActivePlatformOfferPublic } from "@/services/platform-offer.service";
import PlatformOfferBannerClient from "./PlatformOfferBannerClient";

export default async function PlatformOfferBanner() {
  const offer = await getActivePlatformOfferPublic("ANY");
  if (!offer || !offer.bannerEnabled) return null;

  const validityLabel = formatValidity(offer.startsAt, offer.endsAt);

  return (
    <PlatformOfferBannerClient offerId={offer.id}>
      <div
        className="relative flex items-center justify-center gap-3 px-4 py-2.5 text-center text-sm font-medium"
        style={{ backgroundColor: offer.bannerBgColor, color: offer.bannerTextColor }}
      >
        <Sparkles className="w-4 h-4 flex-shrink-0 hidden sm:inline-block" aria-hidden />

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="font-semibold tracking-tight">{offer.title}</span>
          {offer.description && (
            <span className="opacity-80 hidden md:inline">{offer.description}</span>
          )}
          {validityLabel && (
            <span className="opacity-75 text-xs">· {validityLabel}</span>
          )}

          <Link
            href={offer.bannerCtaUrl || "/courses"}
            className="ml-1 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {offer.bannerCtaText || "Explore Courses"}
            <ArrowRight className="w-3 h-3" aria-hidden />
          </Link>
        </div>
      </div>
    </PlatformOfferBannerClient>
  );
}

function formatValidity(startsAt: string | null, endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" });
  if (startsAt) {
    const start = new Date(startsAt);
    if (!Number.isNaN(start.getTime())) return `${fmt.format(start)} – ${fmt.format(end)}`;
  }
  return `Ends ${fmt.format(end)}`;
}
