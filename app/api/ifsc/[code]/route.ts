/**
 * GET /api/ifsc/[code]
 * Proxies the free Razorpay IFSC lookup API so the client never calls
 * an external domain directly (avoids CORS, keeps CSP clean).
 *
 * Returns a subset of the IFSC record: BANK, BRANCH, CITY, STATE.
 * Returns 404 when the code is not found.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const ifsc = code.trim().toUpperCase();

  // Basic format check — 4 letters + 0 + 6 alphanumeric
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return NextResponse.json({ error: "Invalid IFSC format." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://ifsc.razorpay.com/${ifsc}`, {
      headers: { Accept: "application/json" },
      // 5-second timeout via AbortController
      signal: AbortSignal.timeout(5000),
    });

    if (upstream.status === 404) {
      return NextResponse.json({ error: "IFSC code not found." }, { status: 404 });
    }
    if (!upstream.ok) {
      return NextResponse.json({ error: "IFSC lookup failed." }, { status: 502 });
    }

    const data = await upstream.json() as {
      BANK?:   string;
      BRANCH?: string;
      CITY?:   string;
      STATE?:  string;
    };

    return NextResponse.json({
      bank:   data.BANK   ?? "",
      branch: data.BRANCH ?? "",
      city:   data.CITY   ?? "",
      state:  data.STATE  ?? "",
    });
  } catch {
    return NextResponse.json({ error: "IFSC lookup failed." }, { status: 502 });
  }
}
