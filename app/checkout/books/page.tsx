import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCart } from "@/services/cart.service";
import {
  calculatePlatformDiscount,
  getActivePlatformOffer,
} from "@/services/platform-offer.service";
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
  if (cart.count === 0) redirect("/books");

  const items: CheckoutItem[] = cart.items.map((i) => ({
    bookId:        i.bookId,
    title:         i.book.title,
    slug:          i.book.slug,
    coverImage:    i.book.coverImage,
    author:        i.book.author,
    price:         i.book.price ? Number(i.book.price) : 0,
    discountPrice: i.book.discountPrice ? Number(i.book.discountPrice) : null,
  }));

  // Preview the active platform offer; payment service recomputes the
  // authoritative discount at order creation time.
  const offerRow = await getActivePlatformOffer("BOOKS");
  const platformOffer = offerRow
    ? {
        id:       offerRow.id,
        title:    offerRow.title,
        discount: calculatePlatformDiscount(offerRow, cart.subtotal),
      }
    : null;

  return (
    <div className="pt-4 pb-16 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5 mb-1">
        <ShoppingCart className="w-6 h-6 text-orange-500" />
        Checkout
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review your order and complete payment to unlock your library.
      </p>

      <BooksCheckoutClient
        items={items}
        subtotal={cart.subtotal}
        userEmail={session.email}
        platformOffer={platformOffer && platformOffer.discount > 0 ? platformOffer : null}
      />
    </div>
  );
}
