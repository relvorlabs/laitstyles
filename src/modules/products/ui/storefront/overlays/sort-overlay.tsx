"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ParsedCatalogueSearch } from "@/modules/products/client/catalogue-search-params";
import { useCatalogueNavigation } from "@/modules/products/client/use-catalogue-navigation";
import { sortOptions } from "@/modules/products/ui/storefront/catalogue-data";
import { useStorefrontOverlay } from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose } from "@/modules/storefront-shell/ui/storefront-icons";

export function SortOverlay() {
  const overlay = useStorefrontOverlay();
  const navigation = useCatalogueNavigation();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };
  const closeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") overlay.close();
  };

  return (
    <div
      aria-label="Sort products"
      aria-modal="true"
      className={`overlay modal-wrap${overlay.openId === "sortSheet" ? " open" : ""}`}
      id="sortSheet"
      onClick={overlayBackdrop}
      onKeyDown={closeOnEscape}
      role="dialog"
    >
      <section className="modal modal-small">
        <div className="modal-head">
          <h2>Sort products</h2>
          <Button
            aria-label="Close sort options"
            onClick={overlay.close}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div className="mt-[18px] grid gap-2.5" id="sortOptions">
          {sortOptions.map(([value, label]) => {
            const selected = navigation.search.sort === value;
            return (
              <Button
                aria-pressed={selected}
                className="h-auto w-full justify-between whitespace-normal text-left"
                key={value}
                onClick={() => {
                  navigation.setSort(value as ParsedCatalogueSearch["sort"]);
                  overlay.close();
                }}
                type="button"
                variant={selected ? "secondary" : "outline"}
              >
                <strong>{label}</strong>
                {selected ? <span>✓</span> : null}
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
