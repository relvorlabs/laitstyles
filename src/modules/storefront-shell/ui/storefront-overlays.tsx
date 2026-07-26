"use client";

import dynamic from "next/dynamic";
import { useOverlayLifecycle } from "@/hooks/use-overlay-lifecycle";
import { ImageViewerOverlay } from "@/modules/products/ui/storefront/overlays/image-viewer-overlay";
import { QuickViewOverlay } from "@/modules/products/ui/storefront/overlays/quick-view-overlay";
import { useStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";

const SearchOverlay = dynamic(() =>
  import("@/modules/products/ui/storefront/overlays/search-overlay").then(
    (module) => module.SearchOverlay,
  ),
);
const SavedItemsDrawer = dynamic(() =>
  import("@/modules/storefront-shell/ui/saved-items-drawer").then(
    (module) => module.SavedItemsDrawer,
  ),
);
const FilterDrawer = dynamic(() =>
  import("@/modules/products/ui/storefront/overlays/filter-drawer").then(
    (module) => module.FilterDrawer,
  ),
);
const SortOverlay = dynamic(() =>
  import("@/modules/products/ui/storefront/overlays/sort-overlay").then(
    (module) => module.SortOverlay,
  ),
);
const InformationOverlays = dynamic(() =>
  import("@/modules/storefront-shell/ui/information-overlays").then(
    (module) => module.InformationOverlays,
  ),
);

const informationOverlayIds = new Set([
  "conditionModal",
  "measureModal",
  "deliveryModal",
  "authModal",
  "supportModal",
]);

export function StorefrontOverlays() {
  const overlay = useStorefrontOverlay();
  useOverlayLifecycle({
    open: overlay.openId !== null,
    onEscape: overlay.close,
    focusId: overlay.openId ?? undefined,
  });

  let sharedOverlay: React.ReactNode = null;
  if (overlay.openId === "searchModal") sharedOverlay = <SearchOverlay />;
  else if (overlay.openId === "savedDrawer") sharedOverlay = <SavedItemsDrawer />;
  else if (overlay.openId === "filterDrawer") sharedOverlay = <FilterDrawer />;
  else if (overlay.openId === "sortSheet") sharedOverlay = <SortOverlay />;
  else if (overlay.openId && informationOverlayIds.has(overlay.openId)) {
    sharedOverlay = <InformationOverlays />;
  }

  return (
    <>
      {sharedOverlay}
      <QuickViewOverlay />
      <ImageViewerOverlay />
    </>
  );
}
