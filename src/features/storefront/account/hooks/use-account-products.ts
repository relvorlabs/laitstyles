import {
  useStorefrontRecent,
  useStorefrontSavedItems,
} from "@/features/storefront/shared/storefront-runtime";

/** Saved + recently-viewed product lists from focused storefront state. */
export function useAccountProducts() {
  const saved = useStorefrontSavedItems();
  const recent = useStorefrontRecent();
  return { saved: saved.items, recent: recent.items };
}
