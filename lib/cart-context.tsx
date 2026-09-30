"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Customers are guests (no login — see the architecture doc's Risk 1), so
// the cart can't live in the database tied to a user account. Instead it
// lives in the browser's localStorage, wrapped in a React Context so any
// page/component can read or update it.

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  businessId: string;
  businessName: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearBusinessItems: (businessId: string) => void;
  totalItemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "startup_spark_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load whatever was saved from a previous visit, once, on first render.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch (error) {
      console.error("Failed to load cart from storage:", error);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  // Save every time the cart changes (but not before the initial load
  // finishes, or we'd overwrite the saved cart with an empty one).
  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hasLoaded]);

  function addItem(newItem: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((previousItems) => {
      const existing = previousItems.find((item) => item.productId === newItem.productId);
      if (existing) {
        return previousItems.map((item) =>
          item.productId === newItem.productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...previousItems, { ...newItem, quantity }];
    });
  }

  function removeItem(productId: string) {
    setItems((previousItems) => previousItems.filter((item) => item.productId !== productId));
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((previousItems) =>
      previousItems.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  // Called after a successful checkout for one business, so only THAT
  // business's items clear — items from other businesses in the cart stay.
  function clearBusinessItems(businessId: string) {
    setItems((previousItems) => previousItems.filter((item) => item.businessId !== businessId));
  }

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearBusinessItems, totalItemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}
