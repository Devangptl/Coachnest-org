"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowRight, Package, BookOpen, RotateCcw, TrendingDown, FileDown,
  Loader2, Library, FileText, Tag,
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
  hasRefundRequest: boolean;
  refundStatus:    string | null;
  createdAt:       string | Date;
}

const TYPE_LABEL: Record<Order["type"], string> = {
  course:  "Course",
  feature: "Add-on",
  books:   "Books",
};

const TYPE_COLOR: Record<Order["type"], string> = {
  course:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  feature: "bg-orange-500/10 text-[#d97757] border-orange-500/20",
  books:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const REFUND_COLOR: Record<string, string> = {
  PROCESSED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED:  "bg-red-500/10 text-red-400 border-red-500/20",
  FAILED:    "bg-orange-500/10 text-[#d97757] border-orange-500/20",
  PENDING:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function MetaChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
      className,
    )}>
      {children}
    </span>
  );
}

export default function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders,      setOrders]      = useState(initialOrders);
  const [refundModal, setRefundModal] = useState<{ orderId: string; courseTitle: string } | null>(null);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

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
          <GlassCard key={order.id} padding="sm">
            <div className="flex gap-3 sm:gap-4">

              {/* Thumbnail / icon */}
              <div className="flex-shrink-0">
                {order.thumbnail ? (
                  <img
                    src={order.thumbnail}
                    alt=""
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 object-cover",
                      order.type === "books" ? "rounded-sm" : "rounded-md",
                    )}
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-md bg-secondary flex items-center justify-center">
                    {order.type === "feature" ? (
                      <Package className="w-5 h-5 text-[#d97757]/50" />
                    ) : order.type === "books" ? (
                      <Library className="w-5 h-5 text-purple-400/50" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-muted-foreground/30" />
                    )}
                  </div>
                )}
              </div>

              {/* Content — fills remaining width */}
              <div className="flex-1 min-w-0 space-y-2">

                {/* Row 1: title + amount */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-foreground font-semibold text-sm leading-snug line-clamp-2 flex-1 min-w-0">
                    {order.title}
                  </p>
                  <div className="flex-shrink-0 text-right pl-1">
                    <p className="text-foreground font-bold text-sm">
                      ₹{order.amount.toLocaleString("en-IN")}
                    </p>
                    {order.discountAmount > 0 && (
                      <p className="text-emerald-400 text-xs leading-tight">
                        −₹{order.discountAmount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: meta chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground/60 text-xs">
                    {formatDate(order.createdAt)}
                  </span>

                  <MetaChip className={TYPE_COLOR[order.type]}>
                    {TYPE_LABEL[order.type]}
                  </MetaChip>

                  <Badge variant={statusVariant[order.status] || "gray"}>
                    {statusLabel[order.status] || order.status}
                  </Badge>

                  {order.type === "books" && order.bookCount && order.bookCount > 1 && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      {order.bookCount} items
                    </span>
                  )}

                  {order.couponCode && (
                    <span className="flex items-center gap-1 text-[10px] text-[#d97757]">
                      <Tag className="w-3 h-3" />
                      {order.couponCode}
                    </span>
                  )}

                  {order.hasRefundRequest && order.refundStatus && (
                    <MetaChip className={REFUND_COLOR[order.refundStatus] ?? REFUND_COLOR.PENDING}>
                      Refund {order.refundStatus.toLowerCase()}
                    </MetaChip>
                  )}

                  {order.razorpayPaymentId && (
                    <span className="text-muted-foreground/40 text-[10px] font-mono hidden sm:inline">
                      #{order.razorpayPaymentId.slice(-8)}
                    </span>
                  )}
                </div>

                {/* Row 3: action buttons */}
                <div className="flex flex-wrap items-center gap-1.5">

                  {/* Invoice — PAID course/feature */}
                  {order.status === "PAID" && order.type !== "books" && (
                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      disabled={downloading.has(order.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-border/80 bg-secondary/50 hover:bg-secondary px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloading.has(order.id)
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <FileDown className="w-3.5 h-3.5" />
                      }
                      Invoice
                    </button>
                  )}

                  {/* Library — PAID books */}
                  {order.status === "PAID" && order.type === "books" && (
                    <Link
                      href="/dashboard/library"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 border border-purple-400/30 hover:border-purple-400/60 bg-purple-500/5 hover:bg-purple-500/10 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Library className="w-3.5 h-3.5" /> Library
                    </Link>
                  )}

                  {/* Go to course — PAID */}
                  {order.courseId && order.status === "PAID" && (
                    <Link
                      href={`/courses/${order.courseId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d97757] hover:text-orange-300 border border-[#d97757]/30 hover:border-[#d97757]/60 bg-orange-500/5 hover:bg-orange-500/10 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      View Course <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {/* Re-enroll — REFUNDED */}
                  {order.courseId && order.status === "REFUNDED" && (
                    <Link
                      href={`/courses/${order.courseId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d97757] hover:text-orange-300 border border-[#d97757]/30 hover:border-[#d97757]/60 bg-orange-500/5 hover:bg-orange-500/10 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Re-enroll
                    </Link>
                  )}

                  {/* Feature link — PAID */}
                  {order.featureSlug && order.status === "PAID" && (
                    <Link
                      href={`/${order.featureSlug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d97757] hover:text-orange-300 border border-[#d97757]/30 hover:border-[#d97757]/60 bg-orange-500/5 hover:bg-orange-500/10 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      View Add-on <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {/* Request refund — PAID course, no existing request */}
                  {order.type === "course" && order.courseId && order.status === "PAID" && !order.hasRefundRequest && (
                    <button
                      onClick={() => setRefundModal({ orderId: order.id, courseTitle: order.title })}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 bg-red-500/5 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <TrendingDown className="w-3.5 h-3.5" /> Refund
                    </button>
                  )}

                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

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
