/**
 * Razorpay client — server-only.
 * Import only in API routes and server actions, never in Client Components.
 */
import Razorpay from "razorpay";
import crypto from "crypto";

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

/** Verify the payment signature Razorpay sends after a successful payment. */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId:   string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/** Exposed public key for use in the client-side Razorpay checkout script. */
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
