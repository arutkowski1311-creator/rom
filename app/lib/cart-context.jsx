"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "rom_cart";

function loadCart() {
  if (typeof window === "undefined") return { items: [], tripName: "", tripPlanId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { items: [], tripName: "", tripPlanId: null };
}

function saveCart(cart) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {}
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [tripName, setTripName] = useState("");
  const [tripPlanId, setTripPlanId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const cart = loadCart();
    setItems(cart.items || []);
    setTripName(cart.tripName || "");
    setTripPlanId(cart.tripPlanId || null);
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveCart({ items, tripName, tripPlanId });
  }, [items, tripName, tripPlanId, hydrated]);

  const addItem = useCallback((item) => {
    setItems(prev => [...prev, { ...item, _cartId: Date.now() + Math.random() }]);
    setSidebarOpen(true);
  }, []);

  const removeItem = useCallback((cartId) => {
    setItems(prev => prev.filter(i => i._cartId !== cartId));
  }, []);

  const updateItem = useCallback((cartId, updates) => {
    setItems(prev => prev.map(i => i._cartId === cartId ? { ...i, ...updates } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setTripName("");
    setTripPlanId(null);
  }, []);

  const itemCount = items.length;

  const cartTotal = items.reduce((sum, item) => {
    if (item.type === "guide") return sum + (item.totalPrice || 0);
    return sum + (item.total || 0);
  }, 0);

  return (
    <CartContext.Provider value={{
      items, tripName, tripPlanId, sidebarOpen, itemCount, cartTotal,
      addItem, removeItem, updateItem, clearCart,
      setTripName, setTripPlanId, setSidebarOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
