"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PaymentStatus() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const payment = searchParams.get("payment");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    if (payment === "success") {
      handled.current = true;
      const sessionId = searchParams.get("session_id");

      async function verifyAndRefresh() {
        let verified = false;

        if (sessionId) {
          // Retry up to 3 times — webhook may still be processing
          for (let attempt = 0; attempt < 3 && !verified; attempt++) {
            try {
              const res = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
              });
              const data = await res.json();
              if (res.ok && data.success) {
                verified = true;
              } else if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 1500));
              }
            } catch {
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 1500));
              }
            }
          }
        }

        // Tell EnrollButton payment is done — switch to Enrolled
        window.dispatchEvent(new Event("payment:verified"));
        toast.success("Payment successful! You're now enrolled.");
        // Clean URL then refresh server data
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
      }

      verifyAndRefresh();
    } else if (payment === "cancelled") {
      handled.current = true;
      toast.error("Payment was cancelled.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [payment, searchParams, router]);

  return null;
}
