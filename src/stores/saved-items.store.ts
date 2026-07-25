"use client";

import { create } from "zustand";

type SavedItemsStore = {
  ids: readonly string[];
  hydrated: boolean;
  hydrate: (ids: readonly string[]) => void;
  save: (productId: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => boolean;
  clear: () => void;
  reset: () => void;
};

const initialState = {
  ids: [] as readonly string[],
  hydrated: false,
};

export const useSavedItemsStore = create<SavedItemsStore>()((set, get) => ({
  ...initialState,
  hydrate: (ids) => set({ ids: [...new Set(ids)], hydrated: true }),
  save: (productId) =>
    set((state) =>
      state.ids.includes(productId) ? state : { ids: [...state.ids, productId] },
    ),
  remove: (productId) =>
    set((state) => ({ ids: state.ids.filter((id) => id !== productId) })),
  toggle: (productId) => {
    const saved = get().ids.includes(productId);
    set((state) => ({
      ids: saved ? state.ids.filter((id) => id !== productId) : [...state.ids, productId],
    }));
    return !saved;
  },
  clear: () => set({ ids: [] }),
  reset: () => set(initialState),
}));

export const savedItemsStore = useSavedItemsStore;

export const selectSavedIds = (state: SavedItemsStore) => state.ids;
export const selectSavedHydrated = (state: SavedItemsStore) => state.hydrated;
