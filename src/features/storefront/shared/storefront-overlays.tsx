"use client";

import dynamic from "next/dynamic";
import { useStorefront } from "./storefront-provider";

const SearchOverlay = dynamic(() =>
  import("./overlays/search-overlay").then((module) => module.SearchOverlay),
);
const QuickViewOverlay = dynamic(() =>
  import("./overlays/quick-view-overlay").then((module) => module.QuickViewOverlay),
);
const ImageViewerOverlay = dynamic(() =>
  import("./overlays/image-viewer-overlay").then((module) => module.ImageViewerOverlay),
);
const SavedItemsDrawer = dynamic(() =>
  import("./overlays/saved-items-drawer").then((module) => module.SavedItemsDrawer),
);
const LegacyCartDrawer = dynamic(() =>
  import("./overlays/legacy-cart-drawer").then((module) => module.LegacyCartDrawer),
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
  const { openId } = useStorefront();

  if (openId === "searchModal") return <SearchOverlay />;
  if (openId === "quickView") return <QuickViewOverlay />;
  if (openId === "imageViewer") return <ImageViewerOverlay />;
  if (openId === "savedDrawer") return <SavedItemsDrawer />;
  if (openId === "legacyCartDrawer") return <LegacyCartDrawer />;
  if (openId === "filterDrawer") return <FilterDrawer />;
  if (openId === "sortSheet") return <SortOverlay />;
  if (openId && informationOverlayIds.has(openId)) return <InformationOverlays />;

  return null;
}
