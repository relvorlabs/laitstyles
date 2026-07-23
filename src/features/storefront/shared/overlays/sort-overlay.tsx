"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { sortOptions } from "../catalogue-data";
import { IconClose } from "../storefront-icons";
import { useStorefront } from "../storefront-provider";

export function SortOverlay() {
  const storefront = useStorefront();
  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) storefront.closeAll();
  };

  return (
    <div
      id="sortSheet"
      className={`overlay modal-wrap${storefront.openId === "sortSheet" ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Sort products"
      onClick={overlayBackdrop}
    >
      <section className="modal modal-small">
        <div className="modal-head">
          <h2>Sort products</h2>
          <Button
            type="button"
            aria-label="Close sort options"
            onClick={storefront.closeAll}
            size="icon-lg"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div id="sortOptions" className="mt-[18px] grid gap-2.5">
          {sortOptions.map(([value, label]) => {
            const selected = storefront.sort === value;
            return (
              <Button
                key={value}
                className="h-auto w-full justify-between whitespace-normal text-left"
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  storefront.setSort(value);
                  storefront.closeAll();
                }}
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
