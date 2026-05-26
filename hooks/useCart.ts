"use client";

import { useCallback, useEffect, useState } from "react";

const CART_EVENT = "coachnest:cart-updated";

export interface CartItemLite {
  bookId: string;
  book: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
    author: string;
    price: string | null;
    discountPrice: string | null;
  };
}

export interface CartSnapshot {
  id: string | null;
  items: CartItemLite[];
  subtotal: number;
  count: number;
}

const EMPTY: CartSnapshot = { id: null, items: [], subtotal: 0, count: 0 };

export function useCart(): {
  cart: CartSnapshot;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (bookId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  remove: (bookId: string) => Promise<void>;
} {
  const [cart, setCart] = useState<CartSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (res.status === 401) {
        setCart(EMPTY);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setCart({
        id: data.id ?? null,
        items: data.items ?? [],
        subtotal: Number(data.subtotal ?? 0),
        count: Number(data.count ?? (data.items?.length ?? 0)),
      });
    } catch {
      // network errors are non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => { refresh(); };
    window.addEventListener(CART_EVENT, handler);
    return () => window.removeEventListener(CART_EVENT, handler);
  }, [refresh]);

  const add = useCallback(async (bookId: string) => {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to add to cart" }));
      return { ok: false as const, error: error ?? "Failed to add to cart" };
    }
    window.dispatchEvent(new Event(CART_EVENT));
    return { ok: true as const };
  }, []);

  const remove = useCallback(async (bookId: string) => {
    await fetch(`/api/cart/items/${bookId}`, { method: "DELETE" });
    window.dispatchEvent(new Event(CART_EVENT));
  }, []);

  return { cart, loading, refresh, add, remove };
}
