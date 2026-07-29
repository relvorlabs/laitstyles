"use client";

import { useCallback, useMemo } from "react";
import { toast as sonnerToast } from "sonner";
import { type CartSelection, cartSubtotal } from "@/modules/cart/cart-lines";
import {
  useRemoveOwnedSavedProduct,
  useSaveOwnedProduct,
} from "@/modules/customers/client/account-hooks";
import { useStorefrontCatalogue } from "@/modules/products/client/storefront-catalogue";
import { type Product, productById } from "@/modules/products/ui/storefront/catalogue-data";
import { useStorefrontHoldNow } from "@/modules/storefront-shell/client/storefront-hold-clock";
import {
  closeStorefrontOverlays,
  openStorefrontOverlay as openCoordinatedStorefrontOverlay,
} from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useSession } from "@/providers/session-provider";
import {
  selectCartCount,
  selectCartHydrated,
  selectCartLines,
  useCartStore,
} from "@/stores/cart.store";
import {
  selectSavedHydrated,
  selectSavedIds,
  useSavedItemsStore,
} from "@/stores/saved-items.store";
import {
  type StorefrontOverlayId,
  selectHolds,
  selectOpenOverlay,
  selectRecentIds,
  useStorefrontUiStore,
} from "@/stores/storefront-ui.store";

export type StorefrontCartLineView = {
  product: Product;
  lineKey: string;
  lineQty: number;
  variantId: string | null;
  variantLabel: string | null;
  colour: string | null;
  size: string | null;
  unitPriceNaira: number;
};

export function showStorefrontToast(text: string, actionLabel = "", action?: () => void) {
  sonnerToast(text, {
    duration: 3400,
    action: actionLabel ? { label: actionLabel, onClick: () => action?.() } : undefined,
  });
}

export function useStorefrontCatalogueData() {
  const query = useStorefrontCatalogue();
  if (!query.data) {
    throw new Error("The storefront catalogue is unavailable.");
  }
  return query.data;
}

export function useStorefrontProduct(productId: string | null | undefined) {
  const { products } = useStorefrontCatalogueData();
  return productId ? productById(products, productId) : undefined;
}

export function useStorefrontCart() {
  const { products } = useStorefrontCatalogueData();
  const lines = useCartStore(selectCartLines);
  const count = useCartStore(selectCartCount);
  const hydrated = useCartStore(selectCartHydrated);
  const add = useCartStore((state) => state.add);
  const remove = useCartStore((state) => state.remove);
  const restore = useCartStore((state) => state.restore);
  const changeQuantity = useCartStore((state) => state.changeQuantity);
  const clear = useCartStore((state) => state.clear);

  const productLookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const views = useMemo<StorefrontCartLineView[]>(
    () =>
      lines.flatMap((line) => {
        const product = productLookup.get(line.productId);
        return product
          ? [
              {
                product,
                lineKey: line.key,
                lineQty: line.qty,
                variantId: line.variantId,
                variantLabel: line.variantLabel,
                colour: line.colour,
                size: line.size,
                unitPriceNaira: line.unitPriceNaira,
              },
            ]
          : [];
      }),
    [lines, productLookup],
  );

  const addProduct = useCallback(
    (productId: string, selection?: CartSelection | null, quantity = 1) => {
      const product = productLookup.get(productId);
      if (!product) return false;
      const result = add(product, selection, quantity);
      if (result === "unavailable") {
        showStorefrontToast(`This piece is currently ${product.status}.`);
        return false;
      }
      if (result === "selection-required") {
        showStorefrontToast("Choose an available option before adding this piece.");
        return false;
      }
      if (result === "quantity-limit") {
        showStorefrontToast(
          product.inventory === "one-of-one"
            ? "This one-of-one piece is already in your bag."
            : "The maximum available quantity is already in your bag.",
        );
        return false;
      }
      showStorefrontToast(`${product.name} added to your bag.`);
      return true;
    },
    [add, productLookup],
  );

  const removeLine = useCallback(
    (lineKey: string) => {
      const removed = remove(lineKey);
      if (!removed) return;
      showStorefrontToast("Item removed.", "Undo", () => restore(removed));
    },
    [remove, restore],
  );

  return {
    lines,
    views,
    count,
    subtotal: cartSubtotal(lines),
    hydrated,
    addProduct,
    removeLine,
    changeQuantity,
    clear,
  };
}

export function useStorefrontSavedItems() {
  const session = useSession();
  const { products } = useStorefrontCatalogueData();
  const ids = useSavedItemsStore(selectSavedIds);
  const hydrated = useSavedItemsStore(selectSavedHydrated);
  const toggle = useSavedItemsStore((state) => state.toggle);
  const saveOwned = useSaveOwnedProduct();
  const removeOwned = useRemoveOwnedSavedProduct();

  const idSet = useMemo(() => new Set(ids), [ids]);
  const items = useMemo(
    () => products.filter((product) => idSet.has(product.id)),
    [idSet, products],
  );
  const productLookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const toggleProduct = useCallback(
    async (productId: string) => {
      const wasSaved = idSet.has(productId);
      let saved: boolean;
      if (session.signedIn) {
        try {
          if (wasSaved) await removeOwned.mutateAsync(productId);
          else await saveOwned.mutateAsync(productId);
          saved = !wasSaved;
        } catch {
          showStorefrontToast("We could not update your saved items. Please try again.");
          return wasSaved;
        }
      } else {
        saved = toggle(productId);
      }
      const product = productLookup.get(productId);
      showStorefrontToast(
        saved
          ? `${product?.name ?? "Item"} saved for later.`
          : `${product?.name ?? "Item"} removed from saved items.`,
      );
      return saved;
    },
    [idSet, productLookup, removeOwned, saveOwned, session.signedIn, toggle],
  );

  return { ids, idSet, items, hydrated, toggleProduct };
}

export function useStorefrontOverlay() {
  const openId = useStorefrontUiStore(selectOpenOverlay);
  return {
    openId,
    open: openStorefrontOverlay,
    close: closeStorefrontOverlays,
  };
}

export function useStorefrontRecent() {
  const { products } = useStorefrontCatalogueData();
  const ids = useStorefrontUiStore(selectRecentIds);
  const add = useStorefrontUiStore((state) => state.addRecent);
  const items = useMemo(
    () =>
      ids.map((id) => productById(products, id)).filter((item): item is Product => Boolean(item)),
    [ids, products],
  );
  return { ids, items, add };
}

export function useStorefrontUtility() {
  const dismissed = useStorefrontUiStore((state) => state.utilityDismissed);
  const dismiss = useStorefrontUiStore((state) => state.dismissUtility);
  return { dismissed, dismiss };
}

export function useStorefrontHolds() {
  const holds = useStorefrontUiStore(selectHolds);
  const hold = useStorefrontUiStore((state) => state.hold);
  const release = useStorefrontUiStore((state) => state.release);
  const now = useStorefrontHoldNow();

  const secondsByProduct = useMemo(() => {
    const values: Record<string, number> = {};
    for (const intent of holds) {
      const seconds = Math.max(0, Math.ceil((intent.expiresAt - now) / 1000));
      if (seconds > 0) values[intent.productId] = seconds;
    }
    return values;
  }, [holds, now]);

  const holdProduct = useCallback(
    (productId: string, seconds = 15 * 60) => {
      hold(productId, Date.now() + seconds * 1000);
    },
    [hold],
  );

  return { holds, secondsByProduct, holdProduct, releaseProduct: release };
}

export function openStorefrontOverlay(id: StorefrontOverlayId) {
  openCoordinatedStorefrontOverlay(id);
}
