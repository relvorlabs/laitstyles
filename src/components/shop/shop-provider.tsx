"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { feedItems, type Product } from "@/lib/catalogue";

const STORAGE_KEY = "laitstyle-held-items-v1";
const DEFAULT_HOLD_SECONDS = 15 * 60;

type HeldItem = {
  product: Product;
  secondsLeft: number;
};

type ShopContextValue = {
  heldItems: HeldItem[];
  reserve: (product: Product) => boolean;
  release: (productId: string) => void;
  rehold: (productId: string) => void;
  clearCart: () => void;
  isHeld: (productId: string) => boolean;
  secondsFor: (productId: string) => number;
};

const initialHeldItems: HeldItem[] = feedItems
  .filter((product) => product.state === "resYou")
  .map((product) => ({
    product,
    secondsLeft: product.secondsLeft ?? DEFAULT_HOLD_SECONDS,
  }));

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [heldItems, setHeldItems] = useState<HeldItem[]>(initialHeldItems);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HeldItem[];
        if (Array.isArray(parsed)) setHeldItems(parsed);
      }
    } catch {
      // A blocked or malformed localStorage entry should not break shopping.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(heldItems));
    } catch {
      // Shopping remains available when storage is unavailable.
    }
  }, [heldItems, hydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeldItems((current) =>
        current.map((item) => ({
          ...item,
          secondsLeft: Math.max(0, item.secondsLeft - 1),
        })),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const reserve = useCallback((product: Product) => {
    if (product.state === "sold" || product.state === "resOthers") return false;

    setHeldItems((current) => {
      if (current.some((item) => item.product.id === product.id)) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, secondsLeft: DEFAULT_HOLD_SECONDS }
            : item,
        );
      }

      return [
        ...current,
        {
          product: { ...product, state: "resYou" },
          secondsLeft: DEFAULT_HOLD_SECONDS,
        },
      ];
    });

    return true;
  }, []);

  const release = useCallback((productId: string) => {
    setHeldItems((current) =>
      current.filter((item) => item.product.id !== productId),
    );
  }, []);

  const rehold = useCallback((productId: string) => {
    setHeldItems((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, secondsLeft: DEFAULT_HOLD_SECONDS }
          : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setHeldItems([]), []);

  const value = useMemo<ShopContextValue>(
    () => ({
      heldItems,
      reserve,
      release,
      rehold,
      clearCart,
      isHeld: (productId) =>
        heldItems.some((item) => item.product.id === productId),
      secondsFor: (productId) =>
        heldItems.find((item) => item.product.id === productId)?.secondsLeft ?? 0,
    }),
    [clearCart, heldItems, rehold, release, reserve],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) {
    throw new Error("useShop must be used within ShopProvider");
  }
  return value;
}

export function formatHoldTime(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
