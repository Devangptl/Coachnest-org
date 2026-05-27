import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCart } from "@/services/cart.service";
import BooksCheckoutClient, { type CheckoutItem } from "./BooksCheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — Coachnest Books",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BooksCheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/login?from=/checkout/books");

  const cart = await getCart(session.userId);
  if (cart.count === 0) redirect("/cart");

  const items: CheckoutItem[] = cart.items.map((i) => ({
    bookId:        i.bookId,
    title:         i.book.title,
    slug:          i.book.slug,
    coverImage:    i.book.coverImage,
    author:        i.book.author,
    price:         i.book.price ? Number(i.book.price) : 0,
    discountPrice: i.book.discountPrice ? Number(i.book.discountPrice) : null,
  }));

  return (
    <div className="pt-4 pb-16 max-w-5xl mx-auto">
      <Link
        href="/cart"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to cart
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5 mb-1">
        <ShoppingCart className="w-6 h-6 text-orange-500" />
        Checkout
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review your order and complete payment to unlock your library.
      </p>

      <BooksCheckoutClient items={items} subtotal={cart.subtotal} />
    </div>
  );
}
