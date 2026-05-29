"use client";

import { useState } from "react";
import { formatDate, cn } from "@/lib/utils";
import { Eye, RotateCcw, BookOpen, Tag } from "lucide-react";
import OrderDetailsModal from "./OrderDetailsModal";
import Avatar from "@/components/Avatar";

const STATUS_STYLES: Record<string, string> = {
  PAID:     "bg-emerald-500/10 border-emerald-400/25 text-emerald-400",
  PENDING:  "bg-amber-500/10  border-amber-400/25  text-amber-400",
  FAILED:   "bg-red-500/10    border-red-400/25    text-red-400",
  REFUNDED: "bg-zinc-500/10   border-zinc-400/25   text-zinc-400",
};

const STATUS_DOT: Record<string, string> = {
  PAID:     "bg-emerald-400",
  PENDING:  "bg-amber-400",
  FAILED:   "bg-red-400",
  REFUNDED: "bg-zinc-400",
};

export default function OrderTable({ orders }: { orders: any[] }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <>
      <div className="divide-y divide-border/50">
        {orders.map((order) => (
          <div
            key={order.id}
            className="px-4 py-3.5 hover:bg-secondary/30 transition-colors"
          >
            {/* Row 1: student avatar + name/email | amount */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  name={order.studentName}
                  seed={order.studentName}
                  size="w-8 h-8"
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {order.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground/60 truncate">
                    {order.studentEmail}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-foreground">
                  ₹{order.amount.toLocaleString("en-IN")}
                </p>
                {order.couponCode && (
                  <p className="text-[11px] text-emerald-400">
                    −₹{order.discountAmount}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: course + meta */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                <p className="text-sm text-foreground/80 truncate">{order.courseTitle}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                    STATUS_STYLES[order.status] ?? STATUS_STYLES.REFUNDED,
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[order.status] ?? "bg-zinc-400")} />
                  {order.status}
                </span>
              </div>
            </div>

            {/* Row 3: order ID + date + actions */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <code className="text-[#d97757] text-xs font-mono bg-orange-500/5 border border-[#d97757]/15 rounded px-1.5 py-0.5">
                  #{order.id.slice(0, 8)}
                </code>
                <span className="text-[11px] text-muted-foreground/50">
                  {formatDate(order.createdAt)}
                </span>
                {order.couponCode && (
                  <span className="flex items-center gap-1 text-[10px] text-[#d97757]">
                    <Tag className="w-3 h-3" /> {order.couponCode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedOrder(order)}
                  title="View Details"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary border border-transparent hover:border-border"
                >
                  <Eye className="w-3.5 h-3.5" /> Details
                </button>
                {order.status === "PAID" && (
                  <button
                    onClick={() => setSelectedOrder({ ...order, showRefund: true })}
                    title="Refund"
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-400/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Refund
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}
