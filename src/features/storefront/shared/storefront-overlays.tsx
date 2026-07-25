"use client";

import dynamic from "next/dynamic";
import { ImageViewerOverlay } from "./overlays/image-viewer-overlay";
import { QuickViewOverlay } from "./overlays/quick-view-overlay";
import { useStorefrontOverlay } from "./storefront-runtime";
import { useOverlayLifecycle } from "./use-overlay-lifecycle";

const SearchOverlay = dynamic(() =>
  import("./overlays/search-overlay").then((module) => module.SearchOverlay),
);
const SavedItemsDrawer = dynamic(() =>
  import("./overlays/saved-items-drawer").then((module) => module.SavedItemsDrawer),
);
const FilterDrawer = dynamic(() =>
  import("./overlays/filter-drawer").then((module) => module.FilterDrawer),
);
const SortOverlay = dynamic(() =>
  import("./overlays/sort-overlay").then((module) => module.SortOverlay),
);
const InformationOverlays = dynamic(() =>
  import("./overlays/information-overlays").then((module) => module.InformationOverlays),
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
