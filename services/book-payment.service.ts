/**
 * Book Payment Service — mirrors services/payment.service.ts but for the
 * multi-item Books cart flow.
 *
 * Flow:
 *   createBookCheckoutSession  → reads cart → builds BookOrder + N items →
 *                                Stripe Checkout (one line_item per book)
 *   handleBookPaymentSuccess   → webhook fires → mark PAID → create
 *                                BookPurchase rows → credit instructor wallets →
 *                                empty cart → notify + email
 *
 * Revenue split: per-item using Book.instructorRevenuePercent. Coupons apply
 * proportionally across all items. Referral links are out of scope for v1
 * (organic split only on books).
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import { sendBookPurchaseEmail } from "@/lib/email";
import { clearCart } from "@/services/cart.service";

interface CreateBookCheckoutResult {
  orderId:   string;
  sessionId: string;
  url:       string | null;
}

export async function createBookCheckoutSession(
  userId:      string,
  couponCode?: string,
): Promise<CreateBookCheckoutResult> {
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

  // Filter out unpublished books defensively
  const items = cart.items.filter((i) => i.book.status === "PUBLISHED" && !i.book.isFree);
  if (items.length === 0) throw new Error("No purchasable items in cart");

  // Reject books the user already owns
  const owned = await prisma.bookPurchase.findMany({
    where:  { userId, bookId: { in: items.map((i) => i.book.id) } },
    select: { bookId: true },
  });
  if (owned.length > 0) {
    const titles = items.filter((i) => owned.some((o) => o.bookId === i.book.id))
                        .map((i) => i.book.title);
    throw new Error(`Already purchased: ${titles.join(", ")}. Remove these from your cart.`);
  }

  // Per-item base price (uses discountPrice when set)
  const lineItems = items.map((i) => {
    const basePrice = i.book.discountPrice && Number(i.book.discountPrice) < Number(i.book.price ?? 0)
      ? Number(i.book.discountPrice)
      : Number(i.book.price ?? 0);
    return { ...i, basePrice };
  });
  const subtotal = lineItems.reduce((s, i) => s + i.basePrice, 0);
  if (subtotal <= 0) throw new Error("Cart subtotal is zero");

  // Apply coupon to subtotal, distribute discount proportionally
  let discountAmt = 0;
  let couponId: string | undefined;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
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

  // Per-item final price (subtotal-proportional allocation of discount)
  const allocations = lineItems.map((i) => {
    const ratio = subtotal > 0 ? i.basePrice / subtotal : 0;
    const itemDiscount = parseFloat((discountAmt * ratio).toFixed(2));
    const itemFinal    = parseFloat((i.basePrice - itemDiscount).toFixed(2));
    const pct          = i.book.instructorRevenuePercent ?? 70;
    const instructorRevenue = parseFloat(((itemFinal * pct) / 100).toFixed(2));
    const platformRevenue   = parseFloat((itemFinal - instructorRevenue).toFixed(2));
    return { ...i, itemFinal, instructorRevenue, platformRevenue, pct };
  });

  // Create BookOrder + BookOrderItem rows in a single transaction
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode:                "payment",
    customer_email:      user.email,
    payment_intent_data: { description: `Coachnest book purchase (${allocations.length} item${allocations.length === 1 ? "" : "s"})` },
    line_items: allocations.map((a) => ({
      price_data: {
        currency:     "inr",
        unit_amount:  Math.round(a.itemFinal * 100),
        product_data: {
          name: a.book.title,
          ...(a.book.coverImage ? { images: [a.book.coverImage] } : {}),
        },
      },
      quantity: 1,
    })),
    metadata: {
      bookOrderId: order.id,
      userId,
      type: "books",
    },
    success_url: `${appUrl}/checkout/success?type=books&orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/checkout/cancel?type=books&orderId=${order.id}`,
  });

  await prisma.bookOrder.update({
    where: { id: order.id },
    data:  { stripeSessionId: session.id },
  });

  return { orderId: order.id, sessionId: session.id, url: session.url };
}

// ─── Credit instructor wallet for a single book item ─────────────────────────

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

// ─── Webhook handler: mark PAID + create purchases + credit wallets ──────────

export async function handleBookPaymentSuccess(
  stripeSessionId: string,
  paymentIntentId: string,
) {
  const order = await prisma.bookOrder.findUnique({
    where: { stripeSessionId },
    include: {
      user:  { select: { id: true, email: true, name: true } },
      items: {
        include: {
          book: {
            select: {
              id: true, title: true, slug: true,
              createdById: true,
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error("BookOrder not found for session");
  if (order.status === "PAID") {
    return { success: true, orderId: order.id, alreadyProcessed: true };
  }

  await prisma.bookOrder.update({
    where: { id: order.id },
    data:  { status: "PAID", stripePaymentId: paymentIntentId },
  });

  // Create BookPurchase rows (one per item)
  await Promise.all(
    order.items.map((item) =>
      prisma.bookPurchase.upsert({
        where:  { userId_bookId: { userId: order.userId, bookId: item.bookId } },
        create: {
          userId:      order.userId,
          bookId:      item.bookId,
          orderItemId: item.id,
        },
        update: {},
      }),
    ),
  );

  // Credit each instructor's wallet
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

  // Apply coupon usage if present
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

  // Empty the user's cart
  await clearCart(order.userId).catch(console.error);

  // Notification + email
  const titles = order.items.map((i) => i.book.title);
  const summary = titles.length === 1
    ? `"${titles[0]}"`
    : `${titles.length} books`;

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
