"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface CartUiContextValue {
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  toggleCart: () => void;
  syncCartSummary: (count: number, total: number) => void;
}

const CartUiContext = createContext<CartUiContextValue | null>(null);

export function CartUiProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  const toggleCart = useCallback(() => {
    setCartOpen((prev) => !prev);
  }, []);

  const syncCartSummary = useCallback((count: number, total: number) => {
    setCartCount(count);
    setCartTotal(total);
  }, []);

  const value = useMemo(
    () => ({
      cartCount,
      cartTotal,
      cartOpen,
      setCartOpen,
      toggleCart,
      syncCartSummary,
    }),
    [cartCount, cartTotal, cartOpen, toggleCart, syncCartSummary]
  );

  return (
    <CartUiContext.Provider value={value}>{children}</CartUiContext.Provider>
  );
}

export function useCartUi(): CartUiContextValue {
  const ctx = useContext(CartUiContext);
  if (!ctx) {
    throw new Error("useCartUi harus dipakai di dalam CartUiProvider");
  }
  return ctx;
}
