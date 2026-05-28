"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowRight, Package, BookOpen, RotateCcw, TrendingDown, FileDown,
  Loader2, Library, FileText,
} from "lucide-react";
import RefundRequestModal from "./RefundRequestModal";

const statusVariant: Record<string, "green" | "amber" | "red" | "gray"> = {
  PAID:     "green",
  PENDING:  "amber",
  FAILED:   "red",
  REFUNDED: "gray",
};

const statusLabel: Record<string, string> = {
  PAID:     "Paid",
  PENDING:  "Pending",
  FAILED:   "Failed",
  REFUNDED: "Refunded",
};

interface Order {
  id:              string;
  title:           string;
  type:            "course" | "feature" | "books";
  courseId:        string | null;
  featureSlug:     string | null;
  bookCount:       number | null;
  bookFormats:     string[] | null;
  thumbnail:       string | null;
  amount:          number;
  currency:        string;
  status:          string;
  couponCode:      string | null;
  discountAmount:  number;
  razorpayPaymentId: string | null;
  hasRefundRequest: boolean;   // already has a pending/processed refund
  refundStatus:    string | null;
  createdAt:       string | Date;
}

const TYPE_LABEL: Record<Order["type"], string> = {
  course:  "Course",
  feature: "Add-on",
  books:   "Books",
};

const TYPE_BADGE_CLASS: Record<Order["type"], string> = {
  course:  "bg-blue-500/10 text-blue-400",
  feature: "bg-orange-500/10 text-[#d97757]",
  books:   "bg-purple-500/10 text-purple-400",
};

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders,       setOrders]       = useState(initialOrders);
  const [refundModal,  setRefundModal]  = useState<{ orderId: string; courseTitle: string } | null>(null);
  const [downloading,  setDownloading]  = useState<Set<string>>(new Set());

  async function handleDownloadInvoice(orderId: string) {
    setDownloading((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`);
      if (!res.ok) throw new Error("Failed to generate invoice");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `invoice-${orderId.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not generate invoice. Please try again.");
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  function handleRefundSuccess() {
    setRefundModal(null);
    // Mark the order as having a pending refund request
    setOrders((prev) =>
      prev.map((o) =>
        o.id === refundModal?.orderId
          ? { ...o, hasRefundRequest: true, refundStatus: "PENDING" }
          : o
      )
    );
  }

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => (
          <GlassCard key={order.id} className="flex items-center gap-4">
            {/* Thumbnail / icon */}
            {order.thumbnail ? (
              <img
                src={order.thumbnail}
                alt=""
                className={`w-16 h-16 object-cover flex-shrink-0 ${order.type === "books" ? "rounded-sm" : "rounded-md"}`}
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                {order.type === "feature" ? (
                  <Package className="w-6 h-6 text-[#d97757]/50" />
                ) : order.type === "books" ? (
                  <Library className="w-6 h-6 text-purple-400/50" />
                ) : (
                  <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-semibold text-sm truncate">{order.title}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-muted-foreground/70 text-xs">{formatDate(order.createdAt)}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${TYPE_BADGE_CLASS[order.type]}`}>
                  {TYPE_LABEL[order.type]}
                </span>
                {order.type === "books" && order.bookCount && order.bookCount > 1 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <FileText className="w-3 h-3" /> {order.bookCount} items
                  </span>
                )}
                {order.couponCode && (
                  <span className="text-[#d97757] text-xs">Coupon: {order.couponCode}</span>
                )}
                {order.razorpayPaymentId && (
                  <span className="text-muted-foreground/50 text-xs font-mono">
                    #{order.razorpayPaymentId.slice(-8)}
                  </span>
                )}
                {/* Refund request status badge */}
                {order.hasRefundRequest && order.refundStatus && (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    order.refundStatus === "PROCESSED"  ? "bg-emerald-500/10 text-emerald-400"
                    : order.refundStatus === "REJECTED" ? "bg-red-500/10 text-red-400"
                    : order.refundStatus === "FAILED"   ? "bg-orange-500/10 text-[#d97757]"
                    : "bg-amber-500/10 text-amber-400"
                  }`}>
                    Refund {order.refundStatus.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Amount & actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-foreground font-bold">₹{order.amount.toLocaleString("en-IN")}</p>
                {order.discountAmount > 0 && (
                  <p className="text-emerald-400 text-xs">
                    −₹{order.discountAmount.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <Badge variant={statusVariant[order.status] || "gray"}>
                {statusLabel[order.status] || order.status}
              </Badge>

              {/* Download invoice — available for PAID course/feature orders */}
              {order.status === "PAID" && order.type !== "books" && (
                <button
                  onClick={() => handleDownloadInvoice(order.id)}
                  disabled={downloading.has(order.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-border/80 bg-secondary/50 hover:bg-secondary px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download PDF invoice"
                >
                  {downloading.has(order.id)
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <FileDown className="w-3.5 h-3.5" />
                  }
                  Invoice
                </button>
              )}

              {/* Library link — for PAID book orders */}
              {order.status === "PAID" && order.type === "books" && (
                <Link
                  href="/dashboard/library"
                  className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 border border-purple-400/30 hover:border-purple-400/60 bg-purple-500/5 hover:bg-purple-500/10 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                  title="Open in My Library"
                >
                  <Library className="w-3.5 h-3.5" /> Library
                </Link>
              )}

              {/* Course actions */}
              {order.courseId && order.status === "PAID" && (
                <Link href={`/courses/${order.courseId}`} className="text-[#d97757] hover:text-orange-300 transition-colors" title="View course">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {order.courseId && order.status === "REFUNDED" && (
                <Link
                  href={`/courses/${order.courseId}`}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#d97757] hover:text-orange-300 border border-[#d97757]/30 hover:border-[#d97757]/60 bg-orange-500/5 hover:bg-orange-500/10 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                  title="Re-enroll in this course"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-enroll
                </Link>
              )}

              {/* Refund request button — PAID course orders without existing refund */}
              {order.type === "course" && order.courseId && order.status === "PAID" && !order.hasRefundRequest && (
                <button
                  onClick={() => setRefundModal({ orderId: order.id, courseTitle: order.title })}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 bg-red-500/5 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                  title="Request a refund"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Refund
                </button>
              )}

              {order.featureSlug && order.status === "PAID" && (
                <Link href={`/${order.featureSlug}`} className="text-[#d97757] hover:text-orange-300 transition-colors" title="View feature">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Refund modal */}
      {refundModal && (
        <RefundRequestModal
          orderId={refundModal.orderId}
          courseTitle={refundModal.courseTitle}
          onClose={() => setRefundModal(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </>
  );
}
