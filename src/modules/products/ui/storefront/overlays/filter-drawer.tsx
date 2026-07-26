"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { useCatalogueNavigation } from "@/modules/products/client/use-catalogue-navigation";
import { showStorefrontToast, useStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose } from "@/modules/storefront-shell/ui/storefront-icons";
import { FilterControls } from "../filter-controls";

export function FilterDrawer() {
  const overlay = useStorefrontOverlay();
  const navigation = useCatalogueNavigation();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };
  const clearFilters = () => {
    navigation.clear();
    showStorefrontToast("Filters cleared.");
  };

  return (
    <div
      aria-label="Filter products"
      aria-modal="true"
      className={`overlay${overlay.openId === "filterDrawer" ? " open" : ""}`}
      id="filterDrawer"
      onClick={overlayBackdrop}
      role="dialog"
    >
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Filter products</h2>
          <Button
            aria-label="Close filters"
            onClick={overlay.close}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div id="filterContent">
          <FilterControls />
        </div>
        <div className="filter-footer">
          <Button onClick={clearFilters} type="button" variant="outline">
            Clear all
          </Button>
          <Button onClick={overlay.close} type="button">
            Show products
          </Button>
        </div>
      </aside>
    </div>
  );
}
