/**
 * Razorpay server client — server-only.
 * Import only in API routes and server actions, never in Client Components.
 *
 * Covers two Razorpay products:
 *  - Payment Gateway  : orders, payments, refunds  (getRazorpay)
 *  - RazorpayX Payouts: contacts, fund accounts, payouts  (rzpPayoutRequest)
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
 * Algorithm: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 * Returns true if the signature is valid, false otherwise.
 */
export function verifyPaymentSignature(
  razorpayOrderId:   string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET must be set");

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpaySignature;
}

// ── RazorpayX Payout helpers ─────────────────────────────────────────────────
// These use the same API key/secret but call the RazorpayX REST API directly.
// Requires RAZORPAY_ACCOUNT_NUMBER (your RazorpayX current account number).

function rzpAuthHeader(): string {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

async function rzpPost<T>(path: string, body: object, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Authorization": rzpAuthHeader(),
  };
  if (idempotencyKey) headers["X-Payout-Idempotency"] = idempotencyKey;

  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(body),
  });
  const data = await res.json() as T & { error?: { description?: string; code?: string } };
  if (!res.ok) {
    const msg = (data as any)?.error?.description ?? `Razorpay API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export interface RzpContact {
  id:   string;
  name: string;
  email: string;
  type: string;
}

export interface RzpFundAccount {
  id:           string;
  contact_id:   string;
  account_type: string;
  bank_account: { name: string; ifsc: string; account_number: string };
}

export interface RzpPayout {
  id:             string;
  fund_account_id: string;
  amount:         number;
  currency:       string;
  status:         string; // queued | processing | processed | reversed | failed
  utr?:           string; // UTR number when processed
  mode:           string;
}

/** Create a RazorpayX Contact for the instructor. */
export async function createRazorpayContact(
  name:  string,
  email: string,
): Promise<RzpContact> {
  return rzpPost<RzpContact>("/contacts", {
    name,
    email,
    type:         "vendor",
    reference_id: email,
  });
}

/** Create a RazorpayX Fund Account (bank account) linked to a contact. */
export async function createRazorpayFundAccount(
  contactId:     string,
  accountHolder: string,
  accountNumber: string,
  ifsc:          string,
): Promise<RzpFundAccount> {
  return rzpPost<RzpFundAccount>("/fund_accounts", {
    contact_id:   contactId,
    account_type: "bank_account",
    bank_account: {
      name:           accountHolder,
      ifsc:           ifsc.toUpperCase(),
      account_number: accountNumber,
    },
  });
}

/**
 * Initiate a RazorpayX Payout (actual bank transfer).
 * amount is in RUPEES — we convert to paise internally.
 * RAZORPAY_ACCOUNT_NUMBER must be set (your RazorpayX current account number).
 */
export async function createRazorpayPayout(
  fundAccountId:    string,
  amountRupees:     number,
  payoutRequestId:  string,
  instructorName:   string,
): Promise<RzpPayout> {
  const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
  if (!accountNumber) throw new Error("RAZORPAY_ACCOUNT_NUMBER must be set");

  return rzpPost<RzpPayout>(
    "/payouts",
    {
      account_number:       accountNumber,
      fund_account_id:      fundAccountId,
      amount:               Math.round(amountRupees * 100), // paise
      currency:             "INR",
      mode:                 "IMPS",   // instant 24x7; falls back to NEFT automatically
      purpose:              "payout",
      queue_if_low_balance: true,
      narration:            `Instructor payout — ${instructorName}`,
      notes: {
        payoutRequestId,
        instructor: instructorName,
      },
    },
    `payout-${payoutRequestId}`,   // idempotency key
  );
}
