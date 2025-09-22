import { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react";
import api from "../api.js";
import { AuthContext } from "./AuthContext.jsx";

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);

  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // helper: normalize a product-like object into the shape we store
  const normalizeProduct = (p) => {
    const id = p?.id ?? p?._id ?? p?.product_id;
    return {
      id,
      name: p?.name ?? "",
      slug: p?.slug,
      price_cents: p?.price_cents ?? p?.unit_price_cents ?? 0,
      currency: p?.currency ?? "GBP",
      image: p?.image ?? p?.image_url ?? (Array.isArray(p?.images) ? p.images[0] : null) ?? null,
      category_name: p?.category_name ?? p?.category ?? "",
    };
  };

  // Load cart: from API if logged-in, otherwise localStorage
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) {
        try {
          const raw = localStorage.getItem("cart");
          if (alive) setItems(raw ? JSON.parse(raw) : []);
        } catch {
          if (alive) setItems([]);
        }
        return;
      }
      try {
        const { data } = await api.get("/cart");
        const normalized = Array.isArray(data?.items)
          ? data.items.map((it) => {
              // Accept either server shape:
              // { product: {...}, quantity } OR { product_id, name, unit_price_cents, image, quantity }
              const product = it.product ? normalizeProduct(it.product) : normalizeProduct(it);
              return { product, quantity: it.quantity ?? it.qty ?? 1 };
            })
          : [];
        if (alive) setItems(normalized);
      } catch (err) {
        console.warn("Cart fetch failed", err?.response?.status || err?.message);
        if (alive) setItems([]); // stay consistent
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  // Persist to localStorage when logged-out, sync to server when logged-in
  useEffect(() => {
    if (!user) {
      localStorage.setItem("cart", JSON.stringify(items));
      return;
    }
    const payload = items.map((it) => ({
      product_id: it.product?.id ?? it.product_id,
      quantity: it.quantity,
    }));
    api.post("/cart", { items: payload }).catch((e) => {
      // Show in console, but keep the UI cart intact
      console.warn("Cart sync failed", e?.response?.status || e?.message);
    });
  }, [items, user]);

  const addItem = useCallback((rawProduct, qty = 1) => {
    const prod = normalizeProduct(rawProduct);
    if (!prod.id) {
      console.warn("addItem called without a valid id", rawProduct);
      return;
    }
    setItems((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const i = list.findIndex((x) => x.product?.id === prod.id);
      if (i >= 0) list[i] = { ...list[i], quantity: (list[i].quantity ?? 0) + qty };
      else list.push({ product: prod, quantity: qty });
      return list;
    });
  }, []);

  // alias for compatibility
  const addToCart = addItem;

  const updateQuantity = useCallback((productId, qty) => {
    setItems((prev) =>
      (prev ?? [])
        .map((it) => (it.product?.id === productId ? { ...it, quantity: qty } : it))
        .filter((it) => (it.quantity ?? 0) > 0)
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => (prev ?? []).filter((it) => it.product?.id !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCents = useMemo(
    () => (items ?? []).reduce((sum, it) => sum + Number(it.product?.price_cents || 0) * Number(it.quantity || 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, addToCart, updateQuantity, removeItem, clearCart, totalCents }),
    [items, addItem, updateQuantity, removeItem, clearCart, totalCents]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
