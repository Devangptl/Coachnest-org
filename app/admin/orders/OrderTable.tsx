"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Eye, RotateCcw } from "lucide-react";
import OrderDetailsModal from "./OrderDetailsModal";

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

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

export default function OrderTable({ orders }: { orders: any[] }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <>
      <div className="divide-y divide-border/50">
        {orders.map((order) => (
          <div
            key={order.id}
            className="grid grid-cols-12 gap-3 items-center px-4 py-3.5  transition-colors"
          >
            {/* Order ID */}
            <div className="col-span-2 min-w-0">
              <code className="text-orange-400 text-xs font-mono bg-orange-500/5 border border-orange-400/15 rounded px-1.5 py-0.5">
                #{order.id.slice(0, 8)}
              </code>
              <p className="text-[11px] text-muted-foreground/50 mt-1">
                {formatDate(order.createdAt)}
              </p>
            </div>

            {/* Student */}
            <div className="col-span-3 flex items-center gap-2.5 min-w-0">
              <Avatar name={order.studentName} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {order.studentName}
                </p>
                <p className="text-xs text-muted-foreground/60 truncate">
                  {order.studentEmail}
                </p>
              </div>
            </div>

            {/* Course */}
            <div className="col-span-3 min-w-0">
              <p className="text-sm text-foreground/80 truncate">{order.courseTitle}</p>
            </div>

            {/* Amount */}
            <div className="col-span-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                ₹{order.amount.toLocaleString("en-IN")}
              </p>
              {order.couponCode && (
                <p className="text-[11px] text-emerald-400">
                  -{order.discountAmount}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="col-span-1">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  STATUS_STYLES[order.status] ?? STATUS_STYLES.REFUNDED
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] ?? "bg-zinc-400"}`} />
                {order.status}
              </span>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-1">
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
