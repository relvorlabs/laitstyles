"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { CloudImage } from "@/components/ui/cloud-image";
import { useCatalogueNavigation } from "@/modules/products/client/use-catalogue-navigation";
import { money } from "@/modules/products/ui/storefront/catalogue-data";
import { openQuickView } from "@/modules/storefront-shell/client/storefront-overlay-events";
import {
  useStorefrontCart,
  useStorefrontOverlay,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";
import { IconClose, IconHeart } from "@/modules/storefront-shell/ui/storefront-icons";

export function SavedItemsDrawer() {
  const { push: navigateCatalogue } = useCatalogueNavigation();
  const overlay = useStorefrontOverlay();
  const saved = useStorefrontSavedItems();
  const cart = useStorefrontCart();

  const overlayBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) overlay.close();
  };

  return (
    <div
      aria-label="Saved items"
      aria-modal="true"
      className={`overlay${overlay.openId === "savedDrawer" ? " open" : ""}`}
      id="savedDrawer"
      onClick={overlayBackdrop}
      role="dialog"
    >
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Saved items</h2>
          <Button
            aria-label="Close saved items"
            onClick={overlay.close}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <IconClose />
          </Button>
        </div>
        <div className="mt-5 grid gap-3" id="savedList">
          {saved.items.length ? (
            saved.items.map((product) => (
              <article
                className="grid grid-cols-[94px_1fr] gap-[13px] border-b border-[var(--line)] pb-[14px]"
                key={product.id}
              >
                <CloudImage
                  alt={product.name}
                  className="h-[118px] w-[94px] rounded-[4px] object-cover"
                  height={236}
                  sizes="94px"
                  src={product.images[0]}
                  width={188}
                />
                <div>
                  <div className="flex justify-between gap-3">
                    <h3 className="m-0 text-[0.9rem] leading-[1.25]">{product.name}</h3>
                    <Button
                      aria-label={`Remove ${product.name}`}
                      onClick={() => saved.toggleProduct(product.id)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      ×
                    </Button>
                  </div>
                  <p className="mt-[5px] text-[0.72rem] text-[var(--muted)]">
                    Size {product.size} · Grade {product.condition} · {product.status}
                  </p>
                  <p className="price mt-2 text-[0.78rem] text-[var(--ink)]">
                    {money(product.price)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Button
                      onClick={() => openQuickView(product.id)}
                      size="lg"
                      type="button"
                      variant="link"
                    >
                      View details
                    </Button>
                    {product.status === "available" ? (
                      <Button
                        onClick={() =>
                          product.inventory === "variant"
                            ? openQuickView(product.id)
                            : cart.addProduct(product.id)
                        }
                        size="lg"
                        type="button"
                        variant="outline"
                      >
                        {product.inventory === "variant" ? "Choose size" : "Add to bag"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          overlay.close();
                          navigateCatalogue({ collection: "one-of-one", page: 1 });
                        }}
                        size="lg"
                        type="button"
                        variant="link"
                      >
                        Find similar
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="px-2.5 py-[66px] text-center">
              <div className="mx-auto mb-5 grid size-[78px] place-items-center rounded-full border border-[var(--line)]">
                <IconHeart className="[stroke-width:1.25]" style={{ width: 28, height: 28 }} />
              </div>
              <h3 className="m-0 text-[1.5rem]">No saved pieces yet</h3>
              <p className="mx-auto mb-[22px] mt-2.5 max-w-[20rem] text-[var(--muted)]">
                Tap the heart on any product to keep it close.
              </p>
              <Button onClick={overlay.close} type="button">
                Browse products
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
