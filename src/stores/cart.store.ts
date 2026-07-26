"use client";

import { create } from "zustand";
import {
  addCartLine,
  type CartLine,
  type CartProduct,
  type CartSelection,
  changeCartLineQuantity,
} from "@/modules/cart/cart-lines";

export type AddCartResult = "added" | "unavailable" | "selection-required" | "quantity-limit";

type CartStore = {
  lines: readonly CartLine[];
  hydrated: boolean;
  hydrate: (lines: readonly CartLine[]) => void;
  add: (product: CartProduct, selection?: CartSelection | null, quantity?: number) => AddCartResult;
  remove: (lineKey: string) => CartLine | null;
  restore: (line: CartLine) => void;
  changeQuantity: (lineKey: string, delta: number) => void;
  clear: () => void;
  reset: () => void;
};

const initialState = {
  lines: [] as readonly CartLine[],
  hydrated: false,
};

export const useCartStore = create<CartStore>()((set, get) => ({
  ...initialState,
  hydrate: (lines) => set({ lines: [...lines], hydrated: true }),
  add: (product, selection = null, quantity = 1) => {
    if (product.status !== "available") return "unavailable";
    if (product.inventory === "variant" && !selection) return "selection-required";

    const current = get().lines;
    const next = addCartLine(current, product, selection, quantity);
    if (next === current) return "quantity-limit";

    set({ lines: next });
    return "added";
  },
  remove: (lineKey) => {
    const current = get().lines;
    const removed = current.find((line) => line.key === lineKey) ?? null;
    if (!removed) return null;
    set({ lines: current.filter((line) => line.key !== lineKey) });
    return removed;
  },
  restore: (line) =>
    set((state) =>
      state.lines.some((candidate) => candidate.key === line.key)
        ? state
        : { lines: [...state.lines, line] },
    ),
  changeQuantity: (lineKey, delta) =>
    set((state) => ({
      lines: changeCartLineQuantity(state.lines, lineKey, delta),
    })),
  clear: () => set({ lines: [] }),
  reset: () => set(initialState),
}));

export const cartStore = useCartStore;

export const selectCartLines = (state: CartStore) => state.lines;
export const selectCartHydrated = (state: CartStore) => state.hydrated;
export const selectCartCount = (state: CartStore) =>
  state.lines.reduce((total, line) => total + line.qty, 0);
