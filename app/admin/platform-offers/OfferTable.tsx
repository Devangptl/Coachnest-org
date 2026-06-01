"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Pencil, Trash2, Calendar, BadgePercent, Layers, Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/UIDialogProvider";
import { formatDate } from "@/lib/utils";
import type { AdminPlatformOffer } from "@/services/platform-offer.service";

export default function OfferTable({ offers }: { offers: AdminPlatformOffer[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const confirm = useConfirm();

  async function toggleActive(offer: AdminPlatformOffer) {
    setBusyId(offer.id);
    try {
      const res = await fetch(`/api/admin/platform-offers/${offer.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !offer.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update offer");
      }
      toast.success(offer.isActive ? "Offer disabled" : "Offer enabled");
      startTransition(() => window.location.reload());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(offer: AdminPlatformOffer) {
    const ok = await confirm(`Delete the offer "${offer.title}"?`, {
      title:       "Delete Offer",
      confirmText: "Delete",
    });
    if (!ok) return;

    setBusyId(offer.id);
    try {
      const res = await fetch(`/api/admin/platform-offers/${offer.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete");
      }
      toast.success("Offer deleted");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  const now = Date.now();

  return (
    <div className="divide-y divide-border/50">
      {offers.map((offer) => {
        const startMs = offer.startsAt ? new Date(offer.startsAt).getTime() : null;
        const endMs   = offer.endsAt   ? new Date(offer.endsAt).getTime()   : null;
        const isLive  =
          offer.isActive &&
          (startMs === null || startMs <= now) &&
          (endMs   === null || endMs   >= now);
        const status =
          !offer.isActive            ? "DISABLED" :
          endMs && endMs < now       ? "EXPIRED"  :
          startMs && startMs > now   ? "SCHEDULED":
                                       "LIVE";
        const variant: "green" | "amber" | "red" | "blue" | "gray" =
          status === "LIVE"      ? "green" :
          status === "SCHEDULED" ? "blue"  :
          status === "EXPIRED"   ? "red"   : "amber";

        const displayValue =
          offer.discountType === "PERCENTAGE"
            ? `${offer.discountValue}% OFF`
            : `₹${offer.discountValue.toLocaleString("en-IN")} OFF`;

        return (
          <div key={offer.id} className="px-4 py-3.5 hover:bg-secondary/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Megaphone className="w-3.5 h-3.5 text-[#d97757] flex-shrink-0" />
                  <h3 className="font-semibold text-foreground text-sm truncate">{offer.title}</h3>
                </div>
                {offer.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{offer.description}</p>
                )}
              </div>
              <span className="text-base font-bold text-foreground flex-shrink-0">{displayValue}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge variant={variant}>{status}</Badge>

              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="w-3 h-3" /> {offer.scope}
              </span>

              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BadgePercent className="w-3 h-3" /> priority {offer.priority}
              </span>

              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {offer.startsAt ? formatDate(offer.startsAt) : "No start"} →{" "}
                {offer.endsAt   ? formatDate(offer.endsAt)   : "No end"}
              </span>

              {offer.bannerEnabled && isLive && (
                <span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-500">
                  banner on
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                loading={busyId === offer.id}
                onClick={() => toggleActive(offer)}
              >
                {offer.isActive ? "Disable" : "Enable"}
              </Button>
              <Link href={`/admin/platform-offers/${offer.id}/edit`}>
                <Button size="icon" variant="ghost" title="Edit">
                  <Pencil className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                loading={busyId === offer.id}
                onClick={() => handleDelete(offer)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
