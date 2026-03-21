/**
 * EnrollButton — Client Component for enrolling in a course.
 * Supports free enrollment and paid courses (redirects to payment flow).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  courseId: string;
  isEnrolled: boolean;
  isFree: boolean;
  price: number | null;
}

export default function EnrollButton({ courseId, isEnrolled: initialEnrolled, isFree, price }: Props) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    if (enrolled || loading) return;
    setLoading(true);

    try {
      if (!isFree && price) {
        // Paid course — create Razorpay order
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });

        if (!orderRes.ok) {
          const data = await orderRes.json();
          toast.error(data.error ?? "Failed to create order.");
          return;
        }

        const { order } = await orderRes.json();

        // Open Razorpay checkout
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "Learning Platform",
          description: "Course Purchase",
          order_id: order.id,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            // Verify payment
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                courseId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (verifyRes.ok) {
              setEnrolled(true);
              toast.success("Payment successful! You're now enrolled.");
              router.refresh();
            } else {
              toast.error("Payment verification failed.");
            }
          },
          theme: { color: "#7c3aed" },
        };

        // @ts-expect-error Razorpay is loaded via script
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Free course — direct enrollment
        const res = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });

        if (res.ok) {
          setEnrolled(true);
          toast.success("Enrolled successfully!");
          router.refresh();
        } else {
          const data = await res.json();
          toast.error(data.error ?? "Enrollment failed.");
        }
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (enrolled) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium justify-center">
        <CheckCircle2 className="w-4 h-4" />
        Enrolled
      </div>
    );
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="btn-primary w-full flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Processing…
        </>
      ) : isFree ? (
        "Enroll Now — Free"
      ) : price ? (
        `Enroll Now — ₹${price.toLocaleString("en-IN")}`
      ) : (
        "Enroll Now"
      )}
    </button>
  );
}
