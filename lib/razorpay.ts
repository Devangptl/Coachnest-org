/**
 * Razorpay server client — server-only.
 *
 * Products covered:
 *  - Payment Gateway : orders, payments, refunds  (getRazorpay, verifyPaymentSignature)
 *  - Route           : linked accounts + transfers for instructor payouts
 *
 * Route uses the same RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET as the payment
 * gateway — no separate banking/RazorpayX account is needed.
 * Prerequisite: Route must be activated on your Razorpay merchant account.
 * Activate at: Razorpay Dashboard → Route → Get Started (or contact support).
 */
import Razorpay from "razorpay";
import crypto from "crypto";

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

/**
 * Verify a Razorpay payment signature.
 * HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 */
export function verifyPaymentSignature(
  razorpayOrderId:   string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET must be set");

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expected === razorpaySignature;
}

// ── Razorpay Route helpers ────────────────────────────────────────────────────

function rzpAuthHeader(): string {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

async function rzpFetch<T>(
  method:          "GET" | "POST" | "PATCH",
  url:             string,
  body?:           object,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Authorization": rzpAuthHeader(),
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(url, {
    method,
    headers,
    body: body && method !== "GET" ? JSON.stringify(body) : undefined,
  });

  const data = await res.json() as T & { error?: { description?: string } };
  if (!res.ok) {
    const msg = (data as any)?.error?.description ?? `Razorpay API error ${res.status}`;
    throw new Error(`Razorpay Route: ${msg}`);
  }
  return data;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RzpLinkedAccount {
  id:    string;
  email: string;
  type:  string;
}

export interface RzpTransfer {
  id:        string;
  source:    string;
  recipient: string;
  amount:    number;
  currency:  string;
  status:    string; // pending | on_hold | settled
}

// ── Route API calls ───────────────────────────────────────────────────────────

/**
 * Create a Razorpay Route linked account for an instructor.
 * PAN is required for KYC and settlement compliance.
 * Each instructor needs exactly one linked account — reuse across payout requests.
 */
export async function createRouteLinkedAccount(
  email: string,
  name:  string,
  pan:   string,
): Promise<RzpLinkedAccount> {
  return rzpFetch<RzpLinkedAccount>(
    "POST",
    "https://api.razorpay.com/v1/accounts",
    {
      email,
      profile: {
        category:    "education",
        subcategory: "coaching",
        addresses: {
          registered: {
            street1:     "India",
            city:        "Mumbai",
            state:       "MAHARASHTRA",
            postal_code: "400001",
            country:     "IN",
          },
        },
      },
      legal_info: { pan: pan.toUpperCase() },
    },
  );
}

/**
 * Request Route product for a linked account and configure bank settlement.
 * Called once per instructor after createRouteLinkedAccount.
 * Razorpay may review before activating; most verified accounts are same-day.
 */
export async function setupRouteSettlement(
  linkedAccountId: string,
  accountHolder:   string,
  accountNumber:   string,
  ifsc:            string,
): Promise<void> {
  await rzpFetch(
    "POST",
    `https://api.razorpay.com/v2/accounts/${linkedAccountId}/products`,
    {
      product_name:  "route",
      requested_at:  Math.floor(Date.now() / 1000),
      settlements: {
        account_number:   accountNumber,
        ifsc_code:        ifsc.toUpperCase(),
        beneficiary_name: accountHolder,
      },
    },
  );
}

/**
 * Create a UPI collect payment server-to-server (no frontend SDK needed).
 * Razorpay sends the collect request directly to the user's UPI VPA.
 * amountRupees in RUPEES — converted to paise internally.
 */
export async function createUpiCollect(
  razorpayOrderId: string,
  amountRupees:    number,
  vpa:             string,
  contact:         string,
  email:           string,
  description:     string,
  ip:              string,
  userAgent:       string,
  referer:         string,
): Promise<{ paymentId: string }> {
  const data = await rzpFetch<{ razorpay_payment_id: string }>(
    "POST",
    "https://api.razorpay.com/v1/payments/create/upi",
    {
      amount:      Math.round(amountRupees * 100),
      currency:    "INR",
      order_id:    razorpayOrderId,
      method:      "upi",
      vpa,
      contact,
      email,
      description,
      ip,
      user_agent:  userAgent,
      referer,
    },
  );
  return { paymentId: data.razorpay_payment_id };
}

export interface RzpPaymentDetails {
  id:                string;
  order_id:          string;
  status:            string; // created | authorized | captured | failed | refunded
  amount:            number; // paise
  method:            string;
  error_description?: string;
  error_code?:        string;
}

/**
 * Fetch payment details from Razorpay by payment ID.
 * Used to poll status for server-side UPI collect payments.
 */
export async function fetchPaymentDetails(paymentId: string): Promise<RzpPaymentDetails> {
  return rzpFetch<RzpPaymentDetails>("GET", `https://api.razorpay.com/v1/payments/${paymentId}`);
}

/**
 * Create a Razorpay Route transfer to a linked account.
 * amountRupees is in RUPEES — converted to paise internally.
 * Funds settle to the instructor's bank account on the T+2 settlement cycle.
 */
export async function createRouteTransfer(
  linkedAccountId: string,
  amountRupees:    number,
  payoutRequestId: string,
): Promise<RzpTransfer> {
  return rzpFetch<RzpTransfer>(
    "POST",
    "https://api.razorpay.com/v1/transfers",
    {
      account:  linkedAccountId,
      amount:   Math.round(amountRupees * 100), // paise
      currency: "INR",
      notes:    { payoutRequestId },
    },
    `transfer-${payoutRequestId}`, // idempotency key — safe to retry
  );
}
