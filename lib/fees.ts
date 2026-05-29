/**
 * Checkout fees — shared between client (display) and server (charge).
 *
 * A processing fee is added on top of the goods total (after any discounts /
 * coupons) and is included in the final payable amount sent to Razorpay.
 * Keep the rate and rounding identical on both sides so the amount the user
 * sees in the order summary always matches what Razorpay charges.
 */

/** Processing fee rate applied to the post-discount goods total (2%). */
export const PROCESSING_FEE_RATE = 0.02;

/** Human-readable label for the fee line, e.g. "Processing Fee (2%)". */
export const PROCESSING_FEE_LABEL = `Processing Fee (${Math.round(PROCESSING_FEE_RATE * 100)}%)`;

/**
 * Processing fee for a given goods total, rounded to 2 decimal places (paise).
 * Returns 0 for non-positive totals (e.g. free / fully-discounted orders).
 */
export function calcProcessingFee(goodsTotal: number): number {
  if (!Number.isFinite(goodsTotal) || goodsTotal <= 0) return 0;
  return Math.round(goodsTotal * PROCESSING_FEE_RATE * 100) / 100;
}

/** Final payable amount = goods total + processing fee. */
export function calcPayable(goodsTotal: number): number {
  return Math.round((goodsTotal + calcProcessingFee(goodsTotal)) * 100) / 100;
}
