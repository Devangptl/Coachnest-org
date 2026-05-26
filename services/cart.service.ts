/**
 * Cart Service — multi-item shopping cart for the Books module.
 *
 * One Cart per user (1:1 via Cart.userId @unique). Items are Books; each
 * Cart can hold N CartItems (composite PK cartId+bookId for natural dedupe).
 *
 * Books a user already owns are rejected from add-to-cart, since downloads
 * are perpetual (purchasing twice would be meaningless).
 */
import { prisma } from "@/lib/prisma";

export async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });
}

export async function getCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where:   { userId },
    include: {
      items: {
        include: {
          book: {
            select: {
              id: true, title: true, slug: true, coverImage: true,
              author: true, price: true, discountPrice: true, isFree: true,
              status: true,
              createdBy: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  const items = (cart?.items ?? []).filter((i) => i.book.status === "PUBLISHED");
  const subtotal = items.reduce((sum, i) => {
    const price = i.book.discountPrice ?? i.book.price ?? 0;
    return sum + Number(price);
  }, 0);

  return {
    id:       cart?.id ?? null,
    items,
    subtotal,
    count:    items.length,
  };
}

export async function addToCart(userId: string, bookId: string) {
  const book = await prisma.book.findUnique({
    where:  { id: bookId },
    select: { id: true, isFree: true, status: true },
  });
  if (!book) throw new Error("Book not found");
  if (book.status !== "PUBLISHED") throw new Error("This book is not available for purchase");
  if (book.isFree) throw new Error("Free books don't need to be purchased");

  const alreadyOwned = await prisma.bookPurchase.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });
  if (alreadyOwned) throw new Error("You already own this book");

  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.upsert({
    where:  { cartId_bookId: { cartId: cart.id, bookId } },
    create: { cartId: cart.id, bookId },
    update: {},
  });
}

export async function removeFromCart(userId: string, bookId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, bookId } });
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

export async function cartItemCount(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where:   { userId },
    select:  { _count: { select: { items: true } } },
  });
  return cart?._count.items ?? 0;
}
