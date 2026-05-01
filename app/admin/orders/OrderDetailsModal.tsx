"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { X, RotateCcw, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const statusVariant: Record<string, "green" | "amber" | "red" | "gray"> = {
  PAID: "green",
  PENDING: "amber",
  FAILED: "red",
  REFUNDED: "gray",
};

const statusIcon: Record<string, React.ReactNode> = {
  PAID: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  PENDING: <Clock className="w-4 h-4 text-amber-400" />,
  FAILED: <XCircle className="w-4 h-4 text-red-400" />,
  REFUNDED: <AlertCircle className="w-4 h-4 text-muted-foreground/70" />,
};

export default function OrderDetailsModal({
  order,
  onClose,
}: {
  order: any;
  onClose: () => void;
}) {
  const [showRefund, setShowRefund] = useState(order.showRefund || false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for the refund.");
      return;
    }

    setRefundLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: order.amount,
          reason: refundReason,
        }),
      });

      if (!res.ok) throw new Error("Failed to process refund");
      toast.success("Refund processed successfully!");
      onClose();
      window.location.reload();
    } catch {
      toast.error("Error processing refund.");
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusIcon[order.status]}
            <div>
              <h2 className="text-xl font-bold text-foreground">Order Details</h2>
              <code className="text-muted-foreground/70 text-xs font-mono">{order.id}</code>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Timeline */}
          <GlassCard padding="md">
            <h3 className="text-foreground font-semibold mb-4">Status</h3>
            <div className="flex items-center gap-4">
              <Badge variant={statusVariant[order.status] || "gray"}>
                {order.status}
              </Badge>
              <span className="text-muted-foreground text-sm">
                Last updated: {formatDate(order.updatedAt || order.createdAt)}
              </span>
            </div>
          </GlassCard>

          {/* Customer Info */}
          <GlassCard padding="md">
            <h3 className="text-foreground font-semibold mb-4">Customer</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground">{order.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground">{order.studentEmail}</span>
              </div>
            </div>
          </GlassCard>

          {/* Course & Payment */}
          <GlassCard padding="md">
            <h3 className="text-foreground font-semibold mb-4">Payment</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course:</span>
                <span className="text-foreground">{order.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-foreground font-semibold">
                  ₹{order.amount.toLocaleString("en-IN")}
                </span>
              </div>
              {order.couponCode && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coupon:</span>
                    <code className="text-[#d97757] text-sm">{order.couponCode}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-emerald-400">
                      -₹{order.discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="text-foreground">{formatDate(order.createdAt)}</span>
              </div>
            </div>
          </GlassCard>

          {/* Refund Section */}
          {order.status === "PAID" && (
            <GlassCard padding="md">
              <h3 className="text-foreground font-semibold mb-4">Refund</h3>
              {!showRefund ? (
                <Button
                  variant="danger"
                  onClick={() => setShowRefund(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Process Refund
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <p className="text-red-400 text-sm">
                      This will refund ₹{order.amount.toLocaleString("en-IN")} to the customer.
                    </p>
                  </div>
                  <div>
                    <label className="label">Reason for Refund</label>
                    <textarea
                      className="input-glass w-full h-20"
                      placeholder="Why is this order being refunded?"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      loading={refundLoading}
                      onClick={handleRefund}
                      className="flex-1"
                    >
                      Confirm Refund
                    </Button>
                    <Button variant="ghost" onClick={() => setShowRefund(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
