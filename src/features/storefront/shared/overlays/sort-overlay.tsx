"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { useCatalogueNavigation } from "@/features/storefront/catalogue/use-catalogue-navigation";
import { sortOptions } from "../catalogue-data";
import { IconClose } from "../storefront-icons";
import { useStorefrontOverlay } from "../storefront-runtime";

export function SortOverlay() {
  const overlay = useStorefrontOverlay();
  const navigation = useCatalogueNavigation();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };

  return (
    <div
      aria-label="Sort products"
      aria-modal="true"
      className={`overlay modal-wrap${overlay.openId === "sortSheet" ? " open" : ""}`}
      id="sortSheet"
      onClick={overlayBackdrop}
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
                  navigation.setSort(value);
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
