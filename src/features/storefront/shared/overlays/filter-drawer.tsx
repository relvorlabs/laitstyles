"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { IconClose } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";
import { FilterControls } from "./filter-controls";

export function FilterDrawer() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };

  return (
    <div
      id="filterDrawer"
      className={`overlay${storefront.openId === "filterDrawer" ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Filter products"
      onClick={overlayBackdrop}
    >
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Filter products</h2>
          <Button
            type="button"
            aria-label="Close filters"
            onClick={storefront.closeAll}
            size="icon-lg"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div id="filterContent">
          <FilterControls />
        </div>
        <div className="filter-footer">
          <Button type="button" onClick={storefront.clearFilters} variant="outline">
            Clear all
          </Button>
          <Button type="button" onClick={storefront.closeAll}>
            Show products
          </Button>
        </div>
      </aside>
    </div>
  );
}
