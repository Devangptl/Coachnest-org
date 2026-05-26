"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";

export default function CartIcon({ className }: { className?: string }) {
  const { cart } = useCart();
  const count = cart.count;

  return (
    <Link
      href="/cart"
      aria-label={`Shopping cart (${count} item${count === 1 ? "" : "s"})`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${className ?? ""}`}
    >
      <ShoppingCart className="h-4.5 w-4.5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
