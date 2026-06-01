/**
 * PlatformOfferBanner — Server Component that fetches the active
 * platform-wide offer and renders the promotional offer modal on the
 * landing page. Rendered as null when no offer is active.
 *
 * The visible UI is a modal (PlatformOfferModal) — auto-opens once
 * per session, beautifully themed off the admin-chosen banner colour.
 */
import { getActivePlatformOfferPublic } from "@/services/platform-offer.service";
import PlatformOfferModal from "./PlatformOfferModal";

export default async function PlatformOfferBanner() {
  const offer = await getActivePlatformOfferPublic("ANY");
  if (!offer || !offer.bannerEnabled) return null;

  return <PlatformOfferModal offer={offer} />;
}
