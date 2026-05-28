/**
 * Book Payment Service — multi-item cart flow built around Razorpay
 * Standard Checkout, mirroring the same pattern as payment.service.ts
 * for course purchases.
 *
 * Flow:
 *   createBooksRazorpayOrder   → reads cart → builds BookOrder + N items →
 *                                Razorpay order → returns { razorpayOrderId, dbOrderId, amount }
 *   finalizeBookPayment        → called after signature verification →
 *                                mark PAID → create BookPurchase rows →
 *                                credit instructor wallets → empty cart →
 *                                notify + email
 */
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { createNotification } from "@/lib/notifications";
import { sendBookPurchaseEmail } from "@/lib/email";
import { clearCart } from "@/services/cart.service";

interface CreateBooksOrderResult {
  razorpayOrderId: string;
  dbOrderId:       string;
  amount:          number;
  subtotal:        number;
  discount:        number;
  itemCount:       number;
}

// ─── Create Razorpay order for the user's book cart ──────────────────────────

export async function createBooksRazorpayOrder(
  userId:      string,
  couponCode?: string
): Promise<CreateBooksOrderResult> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found");

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          book: {
            select: {
              id: true, title: true, slug: true, coverImage: true,
              price: true, discountPrice: true, isFree: true, status: true,
              instructorRevenuePercent: true, createdById: true,
            },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) throw new Error("Your cart is empty");

  const items = cart.items.filter((i) => i.book.status === "PUBLISHED" && !i.book.isFree);
  if (items.length === 0) throw new Error("No purchasable items in cart");

  // Reject books the user already owns
  const owned = await prisma.bookPurchase.findMany({
    where:  { userId, bookId: { in: items.map((i) => i.book.id) } },
    select: { bookId: true },
  });
  if (owned.length > 0) {
    const titles = items
      .filter((i) => owned.some((o) => o.bookId === i.book.id))
      .map((i) => i.book.title);
    throw new Error(`Already purchased: ${titles.join(", ")}. Remove these from your cart.`);
  }

  // Per-item base price
  const lineItems = items.map((i) => {
    const basePrice = i.book.discountPrice && Number(i.book.discountPrice) < Number(i.book.price ?? 0)
      ? Number(i.book.discountPrice)
      : Number(i.book.price ?? 0);
    return { ...i, basePrice };
  });
  const subtotal = lineItems.reduce((s, i) => s + i.basePrice, 0);
  if (subtotal <= 0) throw new Error("Cart subtotal is zero");

  // Apply coupon
  let discountAmt = 0;
  let couponId: string | undefined;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Coupon has expired");
    if (coupon.maxUses && coupon.uses >= coupon.maxUses)   throw new Error("Coupon usage limit reached");
    if (coupon.courseId) throw new Error("This coupon is for a course, not books");
    if (coupon.bookId && !lineItems.some((i) => i.book.id === coupon.bookId)) {
      throw new Error("Coupon not valid for any item in your cart");
    }

    discountAmt = coupon.discountType === "PERCENTAGE"
      ? (subtotal * Number(coupon.discount)) / 100
      : Math.min(Number(coupon.discount), subtotal);
    couponId = coupon.id;
  }

  const finalAmount = Math.max(0, subtotal - discountAmt);

  // Enforce Razorpay minimum amount (₹1 = 100 paise)
  if (Math.round(finalAmount * 100) < 100) {
    throw new Error("Minimum order amount is ₹1");
  }

  // Per-item allocation (proportional discount distribution)
  const allocations = lineItems.map((i) => {
    const ratio          = subtotal > 0 ? i.basePrice / subtotal : 0;
    const itemDiscount   = parseFloat((discountAmt * ratio).toFixed(2));
    const itemFinal      = parseFloat((i.basePrice - itemDiscount).toFixed(2));
    const pct            = i.book.instructorRevenuePercent ?? 70;
    const instructorRevenue = parseFloat(((itemFinal * pct) / 100).toFixed(2));
    const platformRevenue   = parseFloat((itemFinal - instructorRevenue).toFixed(2));
    return { ...i, itemFinal, instructorRevenue, platformRevenue, pct };
  });

  // Persist BookOrder + items in a single transaction
  const order = await prisma.bookOrder.create({
    data: {
      userId,
      amount:         finalAmount,
      subtotal,
      currency:       "INR",
      status:         "PENDING",
      couponId,
      discountAmount: discountAmt > 0 ? discountAmt : undefined,
      items: {
        create: allocations.map((a) => ({
          bookId:            a.book.id,
          price:             a.itemFinal,
          instructorRevenue: a.instructorRevenue,
          platformRevenue:   a.platformRevenue,
          instructorPercent: a.pct,
        })),
      },
    },
  });

  const titlesShort = allocations
    .slice(0, 3)
    .map((a) => a.book.title)
    .join(", ") + (allocations.length > 3 ? ` +${allocations.length - 3} more` : "");

  // Create Razorpay order
  const razorpay = getRazorpay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rzpOrder = await (razorpay.orders.create as any)({
    amount:   Math.round(finalAmount * 100), // paise
    currency: "INR",
    receipt:  `books_${order.id}`,
    notes: {
      bookOrderId: order.id,
      userId,
      type:        "books",
      itemCount:   String(allocations.length),
    },
  });

  await prisma.bookOrder.update({
    where: { id: order.id },
    data:  { razorpayOrderId: rzpOrder.id },
  });

  return {
    razorpayOrderId: rzpOrder.id as string,
    dbOrderId:       order.id,
    amount:          finalAmount,
    subtotal,
    discount:        discountAmt,
    itemCount:       allocations.length,
  };
}

// ─── Wallet credit helper (per book item) ────────────────────────────────────

async function creditInstructorWalletForBook(args: {
  bookOrderId:       string;
  bookId:            string;
  bookTitle:         string;
  instructorUserId:  string;
  instructorRevenue: number;
  instructorPercent: number;
}) {
  if (args.instructorRevenue <= 0) return;

  const wallet = await prisma.instructorWallet.upsert({
    where:  { userId: args.instructorUserId },
    create: {
      userId:         args.instructorUserId,
      balance:        args.instructorRevenue,
      totalEarned:    args.instructorRevenue,
      totalWithdrawn: 0,
    },
    update: {
      balance:     { increment: args.instructorRevenue },
      totalEarned: { increment: args.instructorRevenue },
    },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId:    wallet.id,
      amount:      args.instructorRevenue,
      type:        "CREDIT",
      description: `Book sale: "${args.bookTitle}"`,
      meta: {
        bookOrderId:       args.bookOrderId,
        bookId:            args.bookId,
        bookTitle:         args.bookTitle,
        saleSource:        "ORGANIC",
        instructorPercent: args.instructorPercent,
      },
    },
  });
}

// ─── Finalize book order after Razorpay signature verification ───────────────

export async function finalizeBookPayment(
  bookOrderId:       string,
  razorpayPaymentId: string
) {
  const order = await prisma.bookOrder.findUnique({
    where:   { id: bookOrderId },
    include: {
      user:  { select: { id: true, email: true, name: true } },
      items: {
        include: {
          book: {
            select: { id: true, title: true, slug: true, createdById: true },
          },
        },
      },
    },
  });
  if (!order) throw new Error("BookOrder not found");
  if (order.status === "PAID") {
    return { success: true, orderId: order.id, alreadyProcessed: true };
  }

  await prisma.bookOrder.update({
    where: { id: order.id },
    data:  { status: "PAID", razorpayPaymentId },
  });

  // Create BookPurchase rows (one per item, idempotent)
  await Promise.all(
    order.items.map((item) =>
      prisma.bookPurchase.upsert({
        where:  { userId_bookId: { userId: order.userId, bookId: item.bookId } },
        create: { userId: order.userId, bookId: item.bookId, orderItemId: item.id },
        update: {},
      }),
    ),
  );

  for (const item of order.items) {
    await creditInstructorWalletForBook({
      bookOrderId:       order.id,
      bookId:            item.bookId,
      bookTitle:         item.book.title,
      instructorUserId:  item.book.createdById,
      instructorRevenue: Number(item.instructorRevenue),
      instructorPercent: Number(item.instructorPercent),
    }).catch(console.error);
  }

  if (order.couponId) {
    await prisma.coupon.update({
      where: { id: order.couponId },
      data:  { uses: { increment: 1 } },
    }).catch(console.error);
    await prisma.couponUse.upsert({
      where:  { userId_couponId: { userId: order.userId, couponId: order.couponId } },
      create: { userId: order.userId, couponId: order.couponId },
      update: {},
    }).catch(console.error);
  }

  await clearCart(order.userId).catch(console.error);

  const titles  = order.items.map((i) => i.book.title);
  const summary = titles.length === 1 ? `"${titles[0]}"` : `${titles.length} books`;

  await createNotification({
    data: {
      userId: order.userId,
      title:  `Purchase confirmed — ${summary}`,
      body:   "Your books are available in your library. Download anytime.",
      type:   "PURCHASE",
      link:   "/dashboard/library",
    },
  }).catch(console.error);

  if (order.user) {
    sendBookPurchaseEmail(
      order.user.email,
      order.user.name,
      titles,
      Number(order.amount).toFixed(2),
    ).catch(console.error);
  }

  return { success: true, orderId: order.id, alreadyProcessed: false };
}

// ─── Legacy: find BookOrder by Razorpay payment ID (webhook fallback) ─────────

export async function handleBookPaymentIntentSuccess(razorpayPaymentId: string) {
  const order = await prisma.bookOrder.findFirst({
    where:  { razorpayPaymentId },
    select: { id: true },
  });
  if (!order) throw new Error("BookOrder not found for payment ID");
  return finalizeBookPayment(order.id, razorpayPaymentId);
}
