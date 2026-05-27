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
      className={
        "relative flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-border transition-all " +
        (className ?? "")
      }
    >
      <ShoppingCart className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
