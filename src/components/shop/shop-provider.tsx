"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product as StorefrontProduct } from "@/features/storefront/shared/catalogue-data";
import {
  canonicalizeProduct,
  canonicalProductId,
  type Product,
  projectLegacyCatalogue,
} from "@/lib/catalogue";

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

function normalizeHeldItems(items: HeldItem[], catalogue: readonly Product[]) {
  const byProduct = new Map<string, HeldItem>();

  for (const item of items) {
    if (!item?.product?.id) continue;
    const product = canonicalizeProduct(catalogue, item.product);
    const canonicalId = canonicalProductId(product.id);
    const existing = byProduct.get(canonicalId);

    if (!existing || item.secondsLeft > existing.secondsLeft) {
      byProduct.set(canonicalId, {
        product: { ...product, id: canonicalId, state: "resYou" },
        secondsLeft: Math.max(0, item.secondsLeft ?? DEFAULT_HOLD_SECONDS),
      });
    }
  }

  return Array.from(byProduct.values());
}

export function ShopProvider({
  children,
  products,
}: {
  children: ReactNode;
  products: readonly StorefrontProduct[];
}) {
  const catalogue = useMemo(() => projectLegacyCatalogue(products), [products]);
  const [heldItems, setHeldItems] = useState<HeldItem[]>(() =>
    catalogue
      .filter((product) => product.state === "resYou")
      .map((product) => ({
        product: canonicalizeProduct(catalogue, product),
        secondsLeft: product.secondsLeft ?? DEFAULT_HOLD_SECONDS,
      })),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as HeldItem[];
          if (Array.isArray(parsed)) {
            setHeldItems(normalizeHeldItems(parsed, catalogue));
          }
        }
      } catch {
        // A blocked or malformed localStorage entry should not break shopping.
      } finally {
        setHydrated(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [catalogue]);

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

  const reserve = useCallback(
    (incomingProduct: Product) => {
      if (incomingProduct.state === "sold" || incomingProduct.state === "resOthers") {
        return false;
      }

      const product = canonicalizeProduct(catalogue, incomingProduct);
      const canonicalId = canonicalProductId(product.id);

      setHeldItems((current) => {
        if (current.some((item) => canonicalProductId(item.product.id) === canonicalId)) {
          return current.map((item) =>
            canonicalProductId(item.product.id) === canonicalId
              ? {
                  product: { ...product, id: canonicalId, state: "resYou" },
                  secondsLeft: DEFAULT_HOLD_SECONDS,
                }
              : item,
          );
        }

        return [
          ...current,
          {
            product: { ...product, id: canonicalId, state: "resYou" },
            secondsLeft: DEFAULT_HOLD_SECONDS,
          },
        ];
      });

      return true;
    },
    [catalogue],
  );

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
        return (
          heldItems.find((item) => canonicalProductId(item.product.id) === canonicalId)
            ?.secondsLeft ?? 0
        );
      },
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
