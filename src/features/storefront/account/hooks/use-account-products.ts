import {
  useStorefrontRecent,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";

/** Saved + recently-viewed product lists from focused storefront state. */
export function useAccountProducts() {
  const saved = useStorefrontSavedItems();
  const recent = useStorefrontRecent();
  return { saved: saved.items, recent: recent.items };
}
