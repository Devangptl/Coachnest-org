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
        // Wait for verify to complete — ensures enrollment is created
        if (sessionId) {
          try {
            await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
          } catch {
            // Webhook may have already handled it — proceed anyway
          }
        }

        toast.success("Payment successful! You're now enrolled.");
        // Clean URL then refresh server data so EnrollButton sees isEnrolled=true
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
