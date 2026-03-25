"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { Eye, RotateCcw } from "lucide-react";
import OrderDetailsModal from "./OrderDetailsModal";

const statusVariant: Record<string, "green" | "amber" | "red" | "gray"> = {
  PAID: "green",
  PENDING: "amber",
  FAILED: "red",
  REFUNDED: "gray",
};

export default function OrderTable({ orders }: { orders: any[] }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <>
      <div className="divide-y divide-white/5">
        {orders.map((order) => (
          <div
            key={order.id}
            className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/5 transition-colors"
          >
            {/* Order ID */}
            <div className="col-span-2 min-w-0">
              <code className="text-purple-400 text-xs font-mono">
                {order.id.slice(0, 12)}...
              </code>
            </div>

            {/* Student */}
            <div className="col-span-2 min-w-0">
              <p className="text-white text-sm font-medium truncate">{order.studentName}</p>
              <p className="text-white/40 text-xs truncate">{order.studentEmail}</p>
            </div>

            {/* Course */}
            <div className="col-span-2 min-w-0">
              <p className="text-white/80 text-sm truncate">{order.courseTitle}</p>
            </div>

            {/* Amount */}
            <div className="col-span-1">
              <span className="text-white font-semibold text-sm">
                ₹{order.amount.toLocaleString("en-IN")}
              </span>
              {order.couponCode && (
                <p className="text-emerald-400 text-xs">-₹{order.discountAmount}</p>
              )}
            </div>

            {/* Status */}
            <div className="col-span-1">
              <Badge variant={statusVariant[order.status] || "gray"}>
                {order.status}
              </Badge>
            </div>

            {/* Date */}
            <div className="col-span-1 text-xs text-white/50">
              {formatDate(order.createdAt)}
            </div>

            {/* Actions */}
            <div className="col-span-3 flex items-center justify-end gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedOrder(order)}
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </Button>
              {order.status === "PAID" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedOrder({ ...order, showRefund: true })}
                  title="Refund"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
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
