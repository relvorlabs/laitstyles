"use client";

import { create } from "zustand";
import type { StorefrontHoldIntent } from "@/features/storefront/shared/storefront-client-state";

export type StorefrontOverlayId =
  | "searchModal"
  | "savedDrawer"
  | "legacyCartDrawer"
  | "cartDrawer"
  | "filterDrawer"
  | "sortSheet"
  | "conditionModal"
  | "measureModal"
  | "deliveryModal"
  | "authModal"
  | "supportModal";

type StorefrontUiStore = {
  openId: StorefrontOverlayId | null;
  recentIds: readonly string[];
  utilityDismissed: boolean;
  holds: readonly StorefrontHoldIntent[];
  holdAlertDismissed: boolean;
  hydrated: boolean;
  hydrate: (input: {
    recentIds: readonly string[];
    utilityDismissed: boolean;
    holds: readonly StorefrontHoldIntent[];
  }) => void;
  open: (id: StorefrontOverlayId) => void;
  close: () => void;
  addRecent: (productId: string) => void;
  dismissUtility: () => void;
  hold: (productId: string, expiresAt: number) => void;
  release: (productId: string) => void;
  removeExpired: (now?: number) => void;
  dismissHoldAlert: () => void;
  resetHoldAlert: () => void;
  reset: () => void;
};

const initialState = {
  openId: null,
  recentIds: [] as readonly string[],
  utilityDismissed: false,
  holds: [] as readonly StorefrontHoldIntent[],
  holdAlertDismissed: false,
  hydrated: false,
};

export const useStorefrontUiStore = create<StorefrontUiStore>()((set) => ({
  ...initialState,
  hydrate: ({ recentIds, utilityDismissed, holds }) =>
    set({
      recentIds: [...new Set(recentIds)].slice(0, 8),
      utilityDismissed,
      holds: [...holds],
      hydrated: true,
    }),
  open: (openId) => set({ openId }),
  close: () => set({ openId: null }),
  addRecent: (productId) =>
    set((state) => ({
      recentIds: [productId, ...state.recentIds.filter((id) => id !== productId)].slice(0, 8),
    })),
  dismissUtility: () => set({ utilityDismissed: true }),
  hold: (productId, expiresAt) =>
    set((state) => ({
      holds: [
        ...state.holds.filter((hold) => hold.productId !== productId),
        { productId, expiresAt },
      ],
      holdAlertDismissed: false,
    })),
  release: (productId) =>
    set((state) => ({ holds: state.holds.filter((hold) => hold.productId !== productId) })),
  removeExpired: (now = Date.now()) =>
    set((state) => {
      const holds = state.holds.filter((hold) => hold.expiresAt > now);
      return holds.length === state.holds.length ? state : { holds };
    }),
  dismissHoldAlert: () => set({ holdAlertDismissed: true }),
  resetHoldAlert: () => set({ holdAlertDismissed: false }),
  reset: () => set(initialState),
}));

export const storefrontUiStore = useStorefrontUiStore;

export const selectOpenOverlay = (state: StorefrontUiStore) => state.openId;
export const selectRecentIds = (state: StorefrontUiStore) => state.recentIds;
export const selectHolds = (state: StorefrontUiStore) => state.holds;
export const selectUiHydrated = (state: StorefrontUiStore) => state.hydrated;
