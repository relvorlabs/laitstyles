import {
  useStorefrontRecent,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";

export function useAccountProducts() {
  const saved = useStorefrontSavedItems();
  const recent = useStorefrontRecent();
  return { saved: saved.items, recent: recent.items };
}
