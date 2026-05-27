import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCart } from "@/services/cart.service";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Cart — Coachnest",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const session = await getSession();
  if (!session) redirect("/login?from=/cart");

  const cart = await getCart(session.userId);

  return (
    <div className="pt-6 pb-16 max-w-5xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
          <ShoppingCart className="w-6 h-6 text-orange-500" />
          Your Cart
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cart.count === 0
            ? "Your cart is empty."
            : `Reviewing ${cart.count} item${cart.count === 1 ? "" : "s"} before checkout.`}
        </p>
      </div>

      <CartClient
        initialItems={cart.items.map((i) => ({
          bookId:        i.bookId,
          title:         i.book.title,
          slug:          i.book.slug,
          coverImage:    i.book.coverImage,
          author:        i.book.author,
          price:         i.book.price ? Number(i.book.price) : 0,
          discountPrice: i.book.discountPrice ? Number(i.book.discountPrice) : null,
        }))}
        initialSubtotal={cart.subtotal}
      />
    </div>
  );
}
