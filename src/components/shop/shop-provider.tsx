"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { canonicalProductId, type Product } from "@/lib/catalogue";

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

const ShopContext = createContext<ShopContextValue | null>(null);

function normalizeHeldItems(items: HeldItem[]) {
  const byProduct = new Map<string, HeldItem>();
  for (const item of items) {
    if (!item?.product?.id) continue;
    const canonicalId = canonicalProductId(item.product.id);
    const secondsLeft = Math.max(0, item.secondsLeft ?? DEFAULT_HOLD_SECONDS);
    const existing = byProduct.get(canonicalId);
    if (!existing || secondsLeft > existing.secondsLeft) {
      byProduct.set(canonicalId, {
        product: { ...item.product, id: canonicalId, state: "resYou" },
        secondsLeft,
      });
    }
  }
  return Array.from(byProduct.values());
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [heldItems, setHeldItems] = useState<HeldItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as HeldItem[];
          if (Array.isArray(parsed)) setHeldItems(normalizeHeldItems(parsed));
        }
      } catch {
        // A blocked or malformed localStorage entry should not break shopping.
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
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
        current.map((item) => ({ ...item, secondsLeft: Math.max(0, item.secondsLeft - 1) })),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const reserve = useCallback((incomingProduct: Product) => {
    if (incomingProduct.state === "sold" || incomingProduct.state === "resOthers") return false;
    const canonicalId = canonicalProductId(incomingProduct.id);
    const product = { ...incomingProduct, id: canonicalId, state: "resYou" as const };

    setHeldItems((current) => {
      if (current.some((item) => canonicalProductId(item.product.id) === canonicalId)) {
        return current.map((item) =>
          canonicalProductId(item.product.id) === canonicalId
            ? { product, secondsLeft: DEFAULT_HOLD_SECONDS }
            : item,
        );
      }
      return [...current, { product, secondsLeft: DEFAULT_HOLD_SECONDS }];
    });
    return true;
  }, []);

  const release = useCallback((productId: string) => {
    const canonicalId = canonicalProductId(productId);
    setHeldItems((current) =>
      current.filter((item) => canonicalProductId(item.product.id) !== canonicalId),
    );
  }, []);

  const rehold = useCallback((productId: string) => {
    const canonicalId = canonicalProductId(productId);
    setHeldItems((current) =>
      current.map((item) =>
        canonicalProductId(item.product.id) === canonicalId
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
      isHeld: (productId) => {
        const canonicalId = canonicalProductId(productId);
        return heldItems.some((item) => canonicalProductId(item.product.id) === canonicalId);
      },
      secondsFor: (productId) => {
        const canonicalId = canonicalProductId(productId);
        return heldItems.find((item) => canonicalProductId(item.product.id) === canonicalId)?.secondsLeft ?? 0;
      },
    }),
    [clearCart, heldItems, rehold, release, reserve],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const value = use(ShopContext);
  if (!value) throw new Error("useShop must be used within ShopProvider");
  return value;
}

export function formatHoldTime(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
