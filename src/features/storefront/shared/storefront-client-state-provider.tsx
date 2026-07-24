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
import type { ProductVariantOption } from "@/lib/storefront/types";
import type { CartLine } from "./cart-lines";
import { restoreCartLines } from "./cart-restoration";
import type { Product } from "./catalogue-data";
import { productById } from "./catalogue-data";
import {
  loadStorefrontClientState,
  persistStorefrontClientState,
  STOREFRONT_CLIENT_STATE_VERSION,
  type StorefrontClientStateSnapshot,
  type StorefrontHoldIntent,
} from "./storefront-client-state";
import { StorefrontHoldAlert } from "./storefront-feedback";

const DEFAULT_HOLD_SECONDS = 15 * 60;

type StorefrontClientStateContextValue = {
  ready: boolean;
  cart: readonly CartLine[];
  saved: Set<string>;
  holds: readonly StorefrontHoldIntent[];
  holdSecondsByProduct: Readonly<Record<string, number>>;
  setCart: (next: readonly CartLine[]) => void;
  updateCart: (updater: (current: readonly CartLine[]) => readonly CartLine[]) => void;
  setSaved: (next: Set<string>) => void;
  holdProduct: (productId: string) => boolean;
  releaseProduct: (productId: string) => void;
  reholdProduct: (productId: string) => boolean;
  clearCart: () => void;
};

const StorefrontClientStateContext = createContext<StorefrontClientStateContextValue | null>(null);

type VariantOptionsByProductId = Readonly<
  Record<string, readonly ProductVariantOption[]>
>;

function snapshotFromState(
  cart: readonly CartLine[],
  saved: ReadonlySet<string>,
  holds: readonly StorefrontHoldIntent[],
): StorefrontClientStateSnapshot {
  return {
    version: STOREFRONT_CLIENT_STATE_VERSION,
    cart: cart.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.qty,
    })),
    saved: [...saved],
    holds: [...holds],
  };
}

export function StorefrontClientStateProvider({
  children,
  products,
  variantOptionsByProductId,
}: {
  children: ReactNode;
  products: readonly Product[];
  variantOptionsByProductId: VariantOptionsByProductId;
}) {
  const [ready, setReady] = useState(false);
  const [cart, setCartState] = useState<readonly CartLine[]>([]);
  const [saved, setSavedState] = useState<Set<string>>(new Set());
  const [holds, setHolds] = useState<StorefrontHoldIntent[]>([]);
  const [now, setNow] = useState(0);
  const [holdAlertDismissed, setHoldAlertDismissed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const loaded = loadStorefrontClientState(window.sessionStorage, window.localStorage);
      setCartState(
        restoreCartLines(loaded.snapshot.cart, products, variantOptionsByProductId),
      );
      setSavedState(new Set(loaded.snapshot.saved));
      setHolds(loaded.snapshot.holds);
      setNow(Date.now());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [products, variantOptionsByProductId]);

  useEffect(() => {
    if (!ready) return;
    persistStorefrontClientState(
      window.sessionStorage,
      window.localStorage,
      snapshotFromState(cart, saved, holds),
    );
  }, [cart, holds, ready, saved]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setHolds((existing) => {
        const active = existing.filter((hold) => hold.expiresAt > current);
        return active.length === existing.length ? existing : active;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const findProduct = useCallback(
    (productId: string) => productById(products, productId),
    [products],
  );

  const holdProduct = useCallback(
    (productId: string) => {
      const product = findProduct(productId);
      if (!product || product.status !== "available") return false;
      const expiresAt = Date.now() + DEFAULT_HOLD_SECONDS * 1000;
      setHolds((existing) => [
        ...existing.filter((hold) => hold.productId !== product.id),
        { productId: product.id, expiresAt },
      ]);
      setHoldAlertDismissed(false);
      return true;
    },
    [findProduct],
  );

  const releaseProduct = useCallback((productId: string) => {
    setHolds((existing) => existing.filter((hold) => hold.productId !== productId));
  }, []);

  const reholdProduct = useCallback(
    (productId: string) => holdProduct(productId),
    [holdProduct],
  );

  const setCart = useCallback((next: readonly CartLine[]) => setCartState(next), []);
  const updateCart = useCallback(
    (updater: (current: readonly CartLine[]) => readonly CartLine[]) =>
      setCartState((current) => updater(current)),
    [],
  );
  const setSaved = useCallback((next: Set<string>) => setSavedState(new Set(next)), []);
  const clearCart = useCallback(() => setCartState([]), []);

  const holdSecondsByProduct = useMemo(() => {
    const seconds: Record<string, number> = {};
    for (const hold of holds) {
      const remaining = Math.max(0, Math.ceil((hold.expiresAt - now) / 1000));
      if (remaining > 0) seconds[hold.productId] = remaining;
    }
    return seconds;
  }, [holds, now]);
  const activeHoldSeconds = Object.values(holdSecondsByProduct);
  const soonestHoldSeconds = activeHoldSeconds.length ? Math.min(...activeHoldSeconds) : 0;

  const value = useMemo<StorefrontClientStateContextValue>(
    () => ({
      ready,
      cart,
      saved,
      holds,
      holdSecondsByProduct,
      setCart,
      updateCart,
      setSaved,
      holdProduct,
      releaseProduct,
      reholdProduct,
      clearCart,
    }),
    [
      cart,
      clearCart,
      holdProduct,
      holdSecondsByProduct,
      holds,
      ready,
      reholdProduct,
      releaseProduct,
      saved,
      setCart,
      setSaved,
      updateCart,
    ],
  );

  return (
    <StorefrontClientStateContext.Provider value={value}>
      {children}
      {activeHoldSeconds.length > 0 && !holdAlertDismissed ? (
        <StorefrontHoldAlert
          count={activeHoldSeconds.length}
          onDismiss={() => setHoldAlertDismissed(true)}
          secondsLeft={soonestHoldSeconds}
        />
      ) : null}
    </StorefrontClientStateContext.Provider>
  );
}

export function useStorefrontClientState() {
  const context = use(StorefrontClientStateContext);
  if (!context) {
    throw new Error(
      "useStorefrontClientState must be used within StorefrontClientStateProvider",
    );
  }
  return context;
}

export function formatHoldTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}
