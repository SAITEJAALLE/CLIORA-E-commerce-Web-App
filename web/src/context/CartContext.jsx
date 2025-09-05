import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api.js';
import { AuthContext } from './AuthContext.jsx';

// Cart context maintains a list of items and synchronises with the
// backend when the user is logged in. When logged out it stores the
// cart in localStorage.
export const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState(() => {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  });

  // On user change fetch cart from server or local storage
  useEffect(() => {
    async function fetchCart() {
      if (user) {
        try {
          const res = await api.get('/cart');
          const fetched = res.data.items.map((it) => ({
            product: {
              id: it.product_id,
              name: it.name,
              slug: it.slug,
              price_cents: it.unit_price_cents,
              currency: it.currency,
              image: it.image
            },
            quantity: it.quantity
          }));
          setItems(fetched);
        } catch (err) {
          console.error('Error fetching cart', err);
        }
      } else {
        const stored = localStorage.getItem('cart');
        setItems(stored ? JSON.parse(stored) : []);
      }
    }
    fetchCart();
  }, [user]);

  // Synchronise cart changes to server or local storage
  useEffect(() => {
    if (user) {
      const payload = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));
      api.post('/cart', { items: payload }).catch((err) => console.error(err));
    } else {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, user]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.product.id === product.id);
      if (index !== -1) {
        const copy = [...prev];
        copy[index] = { ...copy[index], quantity: copy[index].quantity + quantity };
        return copy;
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateQuantity = (productId, qty) => {
    setItems((prev) => prev
      .map((item) => item.product.id === productId ? { ...item, quantity: qty } : item)
      .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setItems([]);

  const totalCents = items.reduce((sum, item) => sum + item.product.price_cents * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, totalCents }}>
      {children}
    </CartContext.Provider>
  );
}