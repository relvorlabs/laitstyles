import { useStorefront } from "@/features/storefront/shared/storefront-provider";

/** Saved + recently-viewed product lists from the shared storefront state. */
export function useAccountProducts() {
  const s = useStorefront();
  return { saved: s.savedList, recent: s.recentList };
}
