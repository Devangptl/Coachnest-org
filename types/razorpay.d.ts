/**
 * TypeScript declarations for Razorpay browser SDKs.
 *
 * Standard Checkout  (checkout.js) — RazorpayOptions  + .open()
 * Custom  Checkout   (razorpay.js) — RazorpayCustomOptions + .createPayment()
 *
 * Both SDKs expose window.Razorpay as the same constructor name;
 * only the options object and available methods differ.
 */

// ── Shared response types ────────────────────────────────────────────────────

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
}

/** @deprecated Renamed to RazorpayErrorResponse */
export interface RazorpayFailedResponse {
  error: {
    code:        string;
    description: string;
    source:      string;
    step:        string;
    reason:      string;
    metadata: { order_id: string; payment_id: string };
  };
}

export interface RazorpayErrorResponse {
  error: {
    code:         string;
    description:  string;
    source?:      string;
    step?:        string;
    reason?:      string;
    metadata?: { order_id?: string; payment_id?: string };
  };
}

// ── Standard Checkout (checkout.js) ──────────────────────────────────────────

export interface RazorpayOptions {
  key:          string;
  amount:       number;       // in paise (100 paise = ₹1)
  currency:     string;
  name?:        string;
  description?: string;
  image?:       string;
  order_id:     string;
  handler?:     (response: RazorpaySuccessResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?:   Record<string, string>;
  theme?:   { color?: string; backdrop_color?: string };
  modal?:   { ondismiss?: () => void; confirm_close?: boolean; animation?: boolean };
}

export interface RazorpayInstance {
  open():  void;
  close(): void;
  on(event: "payment.failed", callback: (r: RazorpayFailedResponse) => void): void;
}

// ── Custom Checkout (razorpay.js) ─────────────────────────────────────────────

export interface RazorpayCustomOptions {
  key:           string;
  order_id:      string;
  amount?:       number;   // paise — used by Razorpay for display/validation
  currency?:     string;
  name?:         string;
  description?:  string;
  callback_url?: string;  // fallback redirect after UPI intent or redirect-based payment
  prefill?: { name?: string; email?: string; contact?: string };
  notes?:   Record<string, string>;
}

/** Card payment payload for `rzp.createPayment()` */
export interface CardPaymentData {
  method:  "card";
  /** Required by Razorpay — 10-digit mobile number */
  contact: string;
  /** Required by Razorpay — customer email */
  email:   string;
  card: {
    number:       string;
    expiry_month: string;   // "01"–"12"
    expiry_year:  string;   // 2-digit ("25") or 4-digit ("2025")
    cvv:          string;
    name:         string;
  };
}

/** UPI collect-flow payload for `rzp.createPayment()` */
export interface UpiPaymentData {
  method:  "upi";
  vpa:     string;    // Virtual Payment Address e.g. "user@paytm"
  contact: string;
  email:   string;
}

/** UPI intent-flow payload — opens UPI app directly, no Razorpay UI */
export interface UpiIntentPaymentData {
  method:        "upi";
  "_[flow]":     "intent";
  "_[app]"?:     string;  // Android package name e.g. "com.google.android.apps.nbu.paisa.user"
  contact:       string;
  email:         string;
}

/** Net-banking payload for `rzp.createPayment()` */
export interface NetBankingPaymentData {
  method:  "netbanking";
  bank:    string;    // Razorpay bank code e.g. "HDFC", "ICIC", "SBIN"
  /** Required by Razorpay — 10-digit mobile number */
  contact: string;
  /** Required by Razorpay — customer email */
  email:   string;
}

export type RazorpayPaymentData = CardPaymentData | UpiPaymentData | UpiIntentPaymentData | NetBankingPaymentData;

/**
 * Fired by razorpay.js when a card payment needs 3DS / OTP action.
 * Intercept this event and render the `url` in your own iframe to avoid
 * Razorpay's default overlay.
 */
export interface RazorpayActionPayload {
  /** Direct GET URL — open this in an iframe to show the bank's OTP page. */
  url?: string;
  redirect?: {
    url:     string;
    method?: "GET" | "POST";
    params?: Record<string, string>;
  };
}

/** Fired by razorpay.js for UPI intent — contains the deep-link URL to open the UPI app */
export interface RazorpayNextActionPayload {
  action: "redirect";
  url:    string;  // e.g. "upi://pay?..." or "tez://upi/pay?..."
}

export interface RazorpayCustomInstance {
  /** Submit payment details to Razorpay. May trigger 3DS via payment.action. */
  createPayment(data: RazorpayPaymentData): void;
  on(event: "payment.success",     callback: (r: RazorpaySuccessResponse)    => void): void;
  on(event: "payment.error",       callback: (r: RazorpayErrorResponse)      => void): void;
  on(event: "payment.action",      callback: (r: RazorpayActionPayload)      => void): void;
  /** Fired for UPI intent — redirect to r.url to open the UPI app */
  on(event: "payment.next_action", callback: (r: RazorpayNextActionPayload)  => void): void;
}

// ── Window augmentation ───────────────────────────────────────────────────────

declare global {
  interface Window {
    /** Razorpay constructor — accepts both Standard and Custom checkout init options */
    Razorpay: new (options: RazorpayOptions | RazorpayCustomOptions) =>
      RazorpayInstance & RazorpayCustomInstance;
  }
}
