"use client";

/**
 * /dashboard/billing — Billing management page.
 * Simplified to show only purchase history and payment methods.
 * Subscription plan management has been removed.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CreditCard, FileText, CheckCircle2, Clock, 
  Receipt, ChevronRight, IndianRupee,
} from "lucide-react";
import { StripeProvider } from "@/components/billing/StripeProvider";
import { PaymentMethodsSection } from "@/components/billing/PaymentMethodsSection";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentOrder {
  id:        string;
  amount:    number;   // stored in rupees
  status:    string;
  type:      "course" | "feature";
  title:     string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [loading,           setLoading]           = useState(true);
  const [studentOrders,     setStudentOrders]     = useState<StudentOrder[]>([]);
  const [orderSummary,      setOrderSummary]      = useState<{ totalOrders: number; totalSpent: number } | null>(null);

  async function loadData() {
    try {
      const billingRes = await fetch("/api/billing");
      const billingData = await billingRes.json();

      // All users now use the "purchase history" view
      const mapped: StudentOrder[] = (billingData.orders ?? []).map((o: any) => ({
        id:        o.id,
        amount:    o.amount, // already in rupees
        status:    o.status,
        type:      o.type,
        title:     o.course?.title ?? o.feature?.name ?? "Purchase",
        createdAt: o.createdAt,
      }));
      setStudentOrders(mapped);
      setOrderSummary(billingData.summary ?? null);
    } catch {
      toast.error("Could not load billing information");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-secondary rounded-lg" />
        <div className="h-32 bg-secondary rounded-md" />
        <div className="h-40 bg-secondary rounded-md" />
        <div className="h-64 bg-secondary rounded-md" />
      </div>
    );
  }

  return (
    <StripeProvider>
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your purchase history — courses and platform add-ons.
            </p>
          </div>
          <Link href="/dashboard/subscription" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            My Purchases <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Summary */}
        {orderSummary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-md border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{orderSummary.totalOrders}</p>
            </div>
            <div className="glass rounded-md border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-foreground">
                ₹{orderSummary.totalSpent.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}

        {/* Payment methods */}
        <div className="glass rounded-md border border-border p-5">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-4 h-4 text-[#d97757]" />
            <h2 className="font-semibold text-foreground">Payment Methods</h2>
          </div>
          <PaymentMethodsSection onUpdate={loadData} />
        </div>

        {/* Order history */}
        <div className="glass rounded-md border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#d97757]" />
            <h2 className="font-semibold text-foreground">Order History</h2>
            {studentOrders.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {studentOrders.length} order{studentOrders.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {studentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No orders yet.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Your purchases will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {studentOrders.map((order) => {
                const isPaid = order.status === "PAID";
                return (
                  <div key={order.id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className={`flex-shrink-0 ${isPaid ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.type === "feature" ? "Add-on" : "Course"} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-foreground font-semibold text-sm">
                        <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                        {order.amount.toLocaleString("en-IN")}
                      </div>
                      <p className={`text-[11px] font-semibold mt-0.5 ${isPaid ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {isPaid ? "Paid" : order.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StripeProvider>
  );
}
