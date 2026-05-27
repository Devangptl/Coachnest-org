/**
 * TypeScript declarations for the Razorpay Standard Checkout (browser SDK).
 * The Razorpay checkout.js script is loaded from CDN and attaches window.Razorpay.
 */

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
}

export interface RazorpayFailedResponse {
  error: {
    code:        string;
    description: string;
    source:      string;
    step:        string;
    reason:      string;
    metadata: {
      order_id:   string;
      payment_id: string;
    };
  };
}

export interface RazorpayOptions {
  key:          string;
  amount:       number;          // in paise (100 paise = ₹1)
  currency:     string;          // "INR"
  name?:        string;
  description?: string;
  image?:       string;
  order_id:     string;          // Razorpay order ID (from backend)
  handler?:     (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?:    string;
    email?:   string;
    contact?: string;
  };
  notes?:  Record<string, string>;
  theme?: {
    color?:           string;
    backdrop_color?:  string;
  };
  modal?: {
    ondismiss?:      () => void;
    confirm_close?:  boolean;
    animation?:      boolean;
  };
}

export interface RazorpayInstance {
  open():  void;
  close(): void;
  on(event: "payment.failed", callback: (response: RazorpayFailedResponse) => void): void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
